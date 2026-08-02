/* =========================================================
   simulation.js
   Дискретно-событийная модель сортировочного центра.

   Архитектура:
   - Одноэтажный ангар с входными доками (inbound) слева,
     выходными (outbound) — справа.
   - Кольцевой конвейер с выходами (карманами) по периметру.
   - WCS (Warehouse Control System) — единый мозг.
   - Принципы отказоустойчивости: replication + graceful
     degradation, буферы, обходные маршруты.

   Использование:
     const sim = new SortingCenter(params);
     sim.start();
     sim.tick(dt);
   ========================================================= */

(function (global) {
  "use strict";

  // ---------- helpers ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const uid = (() => { let i = 0; return () => `PKG-${(++i).toString().padStart(6, "0")}`; })();

  // ---------- Параметры по умолчанию ----------
  const DEFAULT_PARAMS = {
    beltSpeed: 1.6,        // м/с
    outputs: 24,           // кол-во карманов
    regions: 6,            // кол-во региональных направлений
    bufferSize: 8,         // ёмкость буфера у выхода
    scanTime: 0.6,         // с
    unloadTime: 75,        // с на фуру
    truckInterval: 35,     // с между фурами
    truckCount: 220,       // посылок на фуру
    ringLength: 320,       // длина кольца, м
    bulkyPct: 10,          // % крупногабаритных
  };

  // Сценарии (множители / модификаторы)
  const SCENARIOS = {
    baseline:   { label: "Базовый",              mult: { truckInt: 1, truckCnt: 1, fragile: 0.05 } },
    blackfriday:{ label: "Чёрная пятница (×3)",   mult: { truckInt: 0.33, truckCnt: 1.3, fragile: 0.08 } },
    newyear:    { label: "Новый год (×5)",        mult: { truckInt: 0.2, truckCnt: 1.5, fragile: 0.18 } },
    failure:    { label: "Авария выхода",         breakOutputs: 1 },
    bulky:      { label: "Крупногабарит",         mult: { bulky: 1.0, fragile: 0.0 } },
    speedup:    { label: "Ускоренный конвейер",   mult: { belt: 1.5 } },
  };

  // Регионы (с весами — вероятность появления)
  const REGION_NAMES = [
    "Москва и МО", "Санкт-Петербург", "Поволжье", "Урал",
    "Сибирь", "Юг", "Дальний Восток", "Казахстан"
  ];

  // =========================================================
  // Класс пакета
  // =========================================================
  class Package {
    constructor(region, type) {
      this.id = uid();
      this.region = region;       // индекс направления
      this.type = type;           // "std" | "bulky" | "fragile"
      this.assignedOutput = null; // индекс кармана
      this.path = [];             // этапы пути
      this.bornAt = 0;            // время появления
      this.sortedAt = 0;          // время сброса в карман
      this.shippedAt = 0;         // время отгрузки
      this.state = "created";     // created, queued, scanning, on-belt, sorted, shipped
    }
  }

  // =========================================================
  // Класс симуляции
  // =========================================================
  class SortingCenter {
    constructor(params = {}) {
      this.params = { ...DEFAULT_PARAMS, ...params };
      this.events = [];           // [{t, level, msg}]
      this.running = false;
      this.t = 0;                 // модельное время (секунды)
      this.history = [];          // [{t, processed, beltLoad, outLoad, throughput}]
      this.metrics = {
        processed: 0,
        misorts: 0,
        blocked: 0,
        cycleSamples: [],
        sortTimestamps: [],
        inflight: 0,
        byRegion: new Array(this.params.regions).fill(0),
      };
      this.failures = {
        motorOk: true,
        sorterOk: true,
        scannerOk: true,
        brokenOutputs: new Set(),     // индексы сломанных выходов
        blockedOutputs: new Set(),   // засоренные
        bypassActive: false,
      };
      this.scenario = "baseline";
      this.scenarioMods = {};
      this.trucks = [];     // активные фуры на разгрузке
      this.pkgs = [];       // все посылки
      this.nextTruckAt = 0; // время следующей фуры
      this._buildOutputs();
      this._scheduleNextTruck();
    }

    // ---------- Инициализация выходов ----------
    _buildOutputs() {
      const n = this.params.outputs;
      this.outputs = [];
      // Равномерно распределяем выходы по регионам
      for (let i = 0; i < n; i++) {
        const region = i % this.params.regions;
        this.outputs.push({
          index: i,
          region,
          buffer: [],         // очередь посылок
          served: 0,          // сколько всего обслужено
          loadPct: 0,
          pos: 0,             // визуальная позиция (доля кольца 0..1)
        });
      }
      // Расставляем позиции вдоль кольца
      for (let i = 0; i < n; i++) {
        this.outputs[i].pos = (i + 0.5) / n;
      }
    }

    // ---------- Планирование ----------
    _scheduleNextTruck() {
      const interval = this._applyScenario("truckInt", this.params.truckInterval);
      this.nextTruckAt = this.t + interval;
    }

    _applyScenario(key, base) {
      const m = this.scenarioMods;
      if (!m) return base;
      if (key === "truckInt" && m.truckInt) return base * m.truckInt;
      if (key === "truckCnt" && m.truckCnt) return base * m.truckCnt;
      if (key === "belt"     && m.belt)     return base * m.belt;
      return base;
    }

    // ---------- API сценариев ----------
    setScenario(key) {
      const sc = SCENARIOS[key];
      if (!sc) return;
      this.scenario = key;
      this.scenarioMods = sc.mult || {};
      if (sc.breakOutputs) {
        // помечаем 1 случайный выход как сломанный
        const idx = randi(0, this.params.outputs);
        this.failures.brokenOutputs.add(idx);
      }
      this.log("info", `Сценарий: ${sc.label}`);
    }

    // ---------- Сбои ----------
    failMotor() {
      this.failures.motorOk = false;
      this.log("fail", "🔧 Сбой основного мотора конвейера. Включён резервный (50% мощности)");
    }
    failSorter() {
      this.failures.sorterOk = false;
      this.log("fail", "🤖 Сбой сорт-машины. Посылки идут на обходную линию");
      this.failures.bypassActive = true;
    }
    failScanner() {
      this.failures.scannerOk = false;
      this.log("fail", "📷 Сбой сканера. Включён резервный сканер");
    }
    blockRandomOutput() {
      // ищем незасорённый выход
      const candidates = this.outputs.filter(
        o => !this.failures.blockedOutputs.has(o.index)
      );
      if (!candidates.length) return;
      const o = candidates[randi(0, candidates.length)];
      this.failures.blockedOutputs.add(o.index);
      this.log("warn", `⛔ Засор выхода #${o.index + 1} (${REGION_NAMES[o.region]})`);
    }
    triggerBypass() {
      this.failures.bypassActive = true;
      this.log("bypass", "↪️ Активирована ручная обходная линия (резервный маршрут)");
    }
    recover() {
      this.failures.motorOk = true;
      this.failures.sorterOk = true;
      this.failures.scannerOk = true;
      this.failures.brokenOutputs.clear();
      this.failures.blockedOutputs.clear();
      this.failures.bypassActive = false;
      this.log("ok", "✅ Все системы восстановлены, резервы отключены");
    }

    // ---------- Лог ----------
    log(level, msg) {
      this.events.unshift({ t: this.t, level, msg });
      if (this.events.length > 200) this.events.length = 200;
    }

    // ---------- Главный тик ----------
    start() { this.running = true; this.log("info", "▶ Симуляция запущена"); }
    pause() { this.running = false; this.log("info", "⏸ Симуляция приостановлена"); }
    reset() {
      this.running = false;
      this.t = 0;
      this.events = [];
      this.history = [];
      this.metrics = {
        processed: 0,
        misorts: 0,
        blocked: 0,
        cycleSamples: [],
        sortTimestamps: [],
        inflight: 0,
        byRegion: new Array(this.params.regions).fill(0),
      };
      this.failures = {
        motorOk: true, sorterOk: true, scannerOk: true,
        brokenOutputs: new Set(), blockedOutputs: new Set(), bypassActive: false,
      };
      this.scenario = "baseline";
      this.scenarioMods = {};
      this._buildOutputs();
      this._scheduleNextTruck();
      this.log("info", "⟲ Сброс симуляции");
    }

    /**
     * Продвигает симуляцию на dt секунд модельного времени
     * @param {number} dt шаг
     */
    tick(dt) {
      if (!this.running) return;
      // ограничим шаг, чтобы не было рывков
      dt = Math.min(dt, 0.5);
      this.t += dt;

      this._spawnTrucks();
      this._processTrucks(dt);
      this._processBelt(dt);
      this._processOutputs(dt);
      this._sampleMetrics(dt);
    }

    // ---------- Спавн фур ----------
    _spawnTrucks() {
      while (this.t >= this.nextTruckAt) {
        const cnt = Math.round(this._applyScenario("truckCnt", this.params.truckCount));
        const unloadDuration = this.params.unloadTime * (0.85 + Math.random() * 0.3);
        const truck = {
          id: `T-${Math.floor(this.t)}-${randi(0, 999)}`,
          arrivalAt: this.t,
          unloadDuration,
          remaining: unloadDuration,
          packages: cnt,
          progress: 0,
          state: "unloading",
        };
        this.trucks.push(truck);
        this._scheduleNextTruck();
        this.log("info", `🚚 Прибыла фура ${truck.id} (${cnt} посылок)`);
      }
    }

    _processTrucks(dt) {
      for (const tr of this.trucks) {
        if (tr.state !== "unloading") continue;
        tr.remaining -= dt;
        tr.progress = clamp(1 - tr.remaining / tr.unloadDuration, 0, 1);
        if (tr.remaining <= 0) {
          tr.state = "done";
          this.log("info", `✅ Фура ${tr.id} разгружена`);
        }
      }
      // удаляем завершённые фуры
      this.trucks = this.trucks.filter(tr => tr.state !== "done" || this.t - tr.arrivalAt < 600);
    }

    // ---------- Конвейер: генерируем посылки и продвигаем ----------
    _processBelt(dt) {
      // эффективная скорость конвейера
      let speed = this.params.beltSpeed;
      if (this.scenarioMods.belt) speed *= this.scenarioMods.belt;
      if (!this.failures.motorOk) speed *= 0.5;
      // отказ сорт-машины снижает пропускную способность,
      // но обходная линия компенсирует часть потока
      if (!this.failures.sorterOk && !this.failures.bypassActive) speed *= 0.3;

      // Сколько посылок фуры реально выпустить в систему за dt
      // из каждой фуры: 1 посылка каждые (1 сек / (packages/unloadDuration))
      for (const tr of this.trucks) {
        if (tr.state !== "unloading") continue;
        const ratePerSec = tr.packages / tr.unloadDuration; // посылок/с
        tr._emitted = (tr._emitted || 0) + ratePerSec * dt;
        while (tr._emitted >= 1) {
          tr._emitted -= 1;
          this._spawnPackage();
        }
      }

      // Сколько посылок в "on-belt" сейчас (визуальная подсказка)
      // продвигаем состояние: queued -> scanning -> on-belt -> sorted
      for (const p of this.pkgs) {
        if (p.state === "queued") {
          // ждём сканер
          if (this.failures.scannerOk) {
            p._scanTimer = (p._scanTimer || 0) + dt;
            if (p._scanTimer >= this.params.scanTime) {
              p.state = "on-belt";
              this._assignOutput(p);
              p.path.push("scanned");
            }
          } else {
            // резервный сканер — дольше
            p._scanTimer = (p._scanTimer || 0) + dt;
            if (p._scanTimer >= this.params.scanTime * 1.8) {
              p.state = "on-belt";
              this._assignOutput(p);
              p.path.push("scanned-reserve");
            }
          }
        } else if (p.state === "on-belt") {
          // двигаемся к выходу
          // _beltPos в долях кольца (0..1)
          const incPerSec = speed / Math.max(1, this.params.ringLength);
          p._beltPos = (p._beltPos || 0) + incPerSec * dt;
          if (p._beltPos >= p.assignedOutput) {
            p.state = "sorted";
            p.sortedAt = this.t;
            // добавляем в буфер кармана для последующей отгрузки
            const out = this.outputs[p.assignedOutputIdx];
            if (out) out.buffer.push(p);
            this.outputs[p.assignedOutputIdx].served += 1;
            this.metrics.processed += 1;
            this.metrics.byRegion[p.region] += 1;
            this.metrics.cycleSamples.push(this.t - p.bornAt);
            this.metrics.sortTimestamps.push(this.t);
            this.log("info", `📦 ${p.id} отсортирована в карман #${p.assignedOutputIdx + 1}`);
          }
        }
      }

      // очищаем отгруженные
      this.metrics.inflight = this.pkgs.filter(p => p.state !== "shipped").length;
    }

    _assignOutput(p) {
      // выбираем карман с нужным регионом, отдавая предпочтение
      // наименее загруженному и не сломанному/засорённому
      const candidates = this.outputs
        .map((o, idx) => ({ o, idx }))
        .filter(x => x.o.region === p.region)
        .filter(x => !this.failures.brokenOutputs.has(x.idx))
        .filter(x => !this.failures.blockedOutputs.has(x.idx));
      // Если сломан основной — уходим в обходной (bypass)
      let pool = candidates;
      if (candidates.length === 0) {
        // пробуем общую резервную зону
        pool = this.outputs
          .map((o, idx) => ({ o, idx }))
          .filter(x => !this.failures.brokenOutputs.has(x.idx))
          .filter(x => !this.failures.blockedOutputs.has(x.idx));
        this.metrics.misorts += 1;
      }
      // выбираем по наименьшей загрузке
      pool.sort((a, b) => a.o.buffer.length - b.o.buffer.length);
      const chosen = pool[0] || this.outputs[0];
      p.assignedOutput = chosen.o.pos;     // доля кольца
      p.assignedOutputIdx = chosen.idx;
      // NB: не пушим в буфер здесь — буфер пополняется при сортировке (state -> sorted)
    }

    _processOutputs(dt) {
      // каждый карман отгружает посылку из буфера, если есть фура и место
      for (const o of this.outputs) {
        if (o.served <= 0) continue;
        // скорость отгрузки: примерно 0.5 пос/с (≈ 30 в мин) при свободной фуре
        o._shipTimer = (o._shipTimer || 0) + dt;
        const shipRate = 0.6 + (o.buffer.length > 0 ? 0.4 : 0);
        if (o._shipTimer >= 1 / shipRate && o.buffer.length > 0) {
          o._shipTimer = 0;
          const p = o.buffer.shift();
          p.state = "shipped";
          p.shippedAt = this.t;
        }
        // обновляем загрузку буфера в %
        o.loadPct = clamp((o.buffer.length / this.params.bufferSize) * 100, 0, 100);
      }
      // gc: удаляем старые отгруженные
      this.pkgs = this.pkgs.filter(p =>
        p.state !== "shipped" || this.t - p.shippedAt < 60
      );
    }

    _spawnPackage() {
      const region = this._pickRegion();
      const bulkyChance = (this.scenarioMods.bulky !== undefined) ? this.scenarioMods.bulky : (this.params.bulkyPct / 100);
      const fragileChance = (this.scenarioMods.fragile !== undefined) ? this.scenarioMods.fragile : 0.05;
      const r = Math.random();
      let type = "std";
      if (r < fragileChance) type = "fragile";
      else if (r < fragileChance + bulkyChance) type = "bulky";
      const p = new Package(region, type);
      p.bornAt = this.t;
      p.state = "queued";
      this.pkgs.push(p);
    }

    _pickRegion() {
      // слегка неравномерное распределение (Москва чаще)
      const w = [0.28, 0.16, 0.12, 0.12, 0.10, 0.10, 0.06, 0.06];
      const r = Math.random();
      let s = 0;
      for (let i = 0; i < w.length; i++) {
        s += w[i];
        if (r < s) return Math.min(i, this.params.regions - 1);
      }
      return 0;
    }

    // ---------- История для графиков ----------
    _sampleMetrics(dt) {
      if (Math.floor(this.t) % 2 !== 0) return; // каждые ~2 сек
      const beltLoad = this._beltLoad();
      const outLoad = this._outLoad();
      const windowSec = 60;
      const recent = this.metrics.sortTimestamps.filter(t => this.t - t < windowSec).length;
      const throughput = (recent / windowSec) * 3600;
      this.history.push({ t: this.t, beltLoad, outLoad, throughput });
      if (this.history.length > 200) this.history.shift();
    }

    _beltLoad() {
      const onBelt = this.pkgs.filter(p => p.state === "on-belt").length;
      // кольцо при полной загрузке ~1 посылка на 2 метра
      const max = this.params.ringLength / 2;
      return clamp((onBelt / max) * 100, 0, 100);
    }

    _outLoad() {
      if (!this.outputs.length) return 0;
      const sum = this.outputs.reduce((a, o) => a + o.loadPct, 0);
      return sum / this.outputs.length;
    }

    // ---------- Снимок для визуализации ----------
    snapshot() {
      return {
        t: this.t,
        running: this.running,
        params: this.params,
        outputs: this.outputs.map(o => ({
          index: o.index, region: o.region, bufferLen: o.buffer.length,
          loadPct: o.loadPct, pos: o.pos, served: o.served,
          broken: this.failures.brokenOutputs.has(o.index),
          blocked: this.failures.blockedOutputs.has(o.index),
        })),
        packages: this.pkgs.map(p => ({
          id: p.id, region: p.region, type: p.type,
          state: p.state, assigned: p.assignedOutput, pos: p._beltPos || 0,
          outputIdx: p.assignedOutputIdx,
        })),
        trucks: this.trucks.map(tr => ({
          id: tr.id, progress: tr.progress, packages: tr.packages,
          state: tr.state,
        })),
        metrics: {
          ...this.metrics,
          avgCycle: this.metrics.cycleSamples.length
            ? (this.metrics.cycleSamples.reduce((a, b) => a + b, 0) / this.metrics.cycleSamples.length).toFixed(1)
            : 0,
          inflight: this.pkgs.filter(p => p.state !== "shipped").length,
          beltLoad: this._beltLoad(),
          outLoad: this._outLoad(),
          throughput: this.history.length
            ? this.history[this.history.length - 1].throughput
            : 0,
        },
        failures: { ...this.failures,
          brokenOutputs: [...this.failures.brokenOutputs],
          blockedOutputs: [...this.failures.blockedOutputs],
        },
        history: this.history,
        events: this.events.slice(0, 30),
        regionNames: REGION_NAMES,
        scenario: this.scenario,
      };
    }
  }

  global.SortingCenter = SortingCenter;
  global.SCENARIOS = SCENARIOS;
  global.REGION_NAMES = REGION_NAMES;
})(window);
