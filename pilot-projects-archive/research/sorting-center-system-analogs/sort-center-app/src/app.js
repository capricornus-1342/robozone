/* =========================================================
   app.js
   Главный модуль — связывает симуляцию, визуализацию и UI
   ========================================================= */

(function () {
  "use strict";

  // ---------- параметры с UI ----------
  const PARAM_INPUTS = [
    { id: "p-belt-speed", key: "beltSpeed", fmt: v => parseFloat(v) },
    { id: "p-outputs",    key: "outputs",   fmt: v => parseInt(v, 10) },
    { id: "p-regions",    key: "regions",   fmt: v => parseInt(v, 10) },
    { id: "p-buffer",     key: "bufferSize",fmt: v => parseInt(v, 10) },
    { id: "p-scan-time",  key: "scanTime",  fmt: v => parseFloat(v) },
    { id: "p-unload",     key: "unloadTime",fmt: v => parseFloat(v) },
    { id: "p-truck-int",  key: "truckInterval", fmt: v => parseFloat(v) },
    { id: "p-truck-cnt",  key: "truckCount",fmt: v => parseInt(v, 10) },
    { id: "p-ring-len",   key: "ringLength",fmt: v => parseFloat(v) },
    { id: "p-bulky",      key: "bulkyPct",  fmt: v => parseFloat(v) },
  ];

  function readParams() {
    const p = {};
    for (const item of PARAM_INPUTS) {
      const el = document.getElementById(item.id);
      if (el) p[item.key] = item.fmt(el.value);
    }
    return p;
  }

  function syncParamUI(params) {
    for (const item of PARAM_INPUTS) {
      const v = params[item.key];
      const valEl = document.getElementById("v-" + item.id.replace("p-", ""));
      if (valEl) valEl.textContent = v;
    }
  }

  // ---------- Сценарии (готовые настройки) ----------
  const SCEN_PRESETS = {
    baseline: { beltSpeed: 1.6, truckInterval: 35, truckCount: 220, bulkyPct: 10 },
    blackfriday: { beltSpeed: 1.8, truckInterval: 12, truckCount: 280, bulkyPct: 14 },
    newyear: { beltSpeed: 2.0, truckInterval: 8, truckCount: 320, bulkyPct: 18 },
    failure: { beltSpeed: 1.6, truckInterval: 25, truckCount: 200, bulkyPct: 10 },
    bulky: { beltSpeed: 1.2, truckInterval: 30, truckCount: 200, bulkyPct: 70 },
    speedup: { beltSpeed: 2.5, truckInterval: 35, truckCount: 220, bulkyPct: 10 },
  };

  // ---------- Инициализация ----------
  const canvas = document.getElementById("viz");
  const viz = new Visualization(canvas);
  const dash = new Dashboard({});
  let sim = new SortingCenter(readParams());
  let simSpeed = 1.0;
  let lastT = performance.now();

  function applyScenario(key) {
    const preset = SCEN_PRESETS[key];
    if (preset) {
      for (const [k, v] of Object.entries(preset)) {
        const input = PARAM_INPUTS.find(p => p.key === k);
        if (input) {
          const el = document.getElementById(input.id);
          if (el) {
            el.value = v;
            document.getElementById("v-" + input.id.replace("p-", "")).textContent = v;
          }
        }
      }
    }
    // пересоздаём симуляцию с новыми параметрами
    sim = new SortingCenter(readParams());
    sim.setScenario(key);
    if (key === "failure") {
      // сразу симулируем сломанный выход
      sim.failures.brokenOutputs.add(randi(0, sim.params.outputs));
      sim.log("fail", "⚠️ Предустановленный сценарий: 1 выход сломан");
    }
    // подсветка активной кнопки
    document.querySelectorAll(".scen").forEach(b => {
      b.classList.toggle("active", b.dataset.scen === key);
    });
  }

  function randi(a, b) { return Math.floor(a + Math.random() * (b - a)); }

  // ---------- Привязка UI ----------
  function bindUI() {
    // параметры
    for (const item of PARAM_INPUTS) {
      const el = document.getElementById(item.id);
      if (!el) continue;
      el.addEventListener("input", () => {
        // мягкое обновление: меняем параметр на лету, не сбрасывая симуляцию
        // (меняются только некоторые поля, пересоздаём outputs при смене их числа)
        const v = item.fmt(el.value);
        const valEl = document.getElementById("v-" + item.id.replace("p-", ""));
        if (valEl) valEl.textContent = v;
        sim.params[item.key] = v;
        if (item.key === "outputs" || item.key === "regions") {
          sim._buildOutputs();
        }
      });
    }

    // кнопки play/pause/reset/step
    document.getElementById("btn-play").addEventListener("click", () => sim.start());
    document.getElementById("btn-pause").addEventListener("click", () => sim.pause());
    document.getElementById("btn-reset").addEventListener("click", () => {
      sim.reset();
    });
    document.getElementById("btn-step").addEventListener("click", () => {
      // один тик = 5 секунд модельного времени
      sim.tick(5);
    });
    document.getElementById("btn-export").addEventListener("click", exportCSV);

    // сценарии
    document.querySelectorAll(".scen").forEach(b => {
      b.addEventListener("click", () => applyScenario(b.dataset.scen));
    });

    // скорость симуляции
    const speedEl = document.getElementById("sim-speed");
    const speedVal = document.getElementById("v-sim-speed");
    speedEl.addEventListener("input", () => {
      simSpeed = parseFloat(speedEl.value);
      speedVal.textContent = simSpeed + "×";
    });

    // сбои
    document.getElementById("btn-fail-motor").addEventListener("click", () => sim.failMotor());
    document.getElementById("btn-fail-sorter").addEventListener("click", () => sim.failSorter());
    document.getElementById("btn-fail-scanner").addEventListener("click", () => sim.failScanner());
    document.getElementById("btn-block-output").addEventListener("click", () => sim.blockRandomOutput());
    document.getElementById("btn-trigger-bypass").addEventListener("click", () => sim.triggerBypass());
    document.getElementById("btn-recover").addEventListener("click", () => sim.recover());
  }

  // ---------- Экспорт CSV ----------
  function exportCSV() {
    const snap = sim.snapshot();
    const rows = [
      ["t", "region", "processed", "beltLoad", "outLoad", "throughput"]
    ];
    for (const h of snap.history) {
      rows.push([h.t.toFixed(1), "", "", h.beltLoad.toFixed(1), h.outLoad.toFixed(1), h.throughput.toFixed(0)]);
    }
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sortcenter_metrics_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Главный цикл ----------
  function loop(now) {
    const dt = (now - lastT) / 1000;
    lastT = now;
    if (sim.running) {
      const modelDt = dt * simSpeed;
      // нарезаем на маленькие шаги для стабильности
      const steps = Math.max(1, Math.ceil(modelDt / 0.2));
      const step = modelDt / steps;
      for (let i = 0; i < steps; i++) sim.tick(step);
    }
    const snap = sim.snapshot();
    viz.render(snap);
    dash.update(snap);
    requestAnimationFrame(loop);
  }

  // ---------- Запуск ----------
  document.addEventListener("DOMContentLoaded", () => {
    bindUI();
    syncParamUI(sim.params);
    requestAnimationFrame((t) => { lastT = t; loop(t); });
  });
})();
