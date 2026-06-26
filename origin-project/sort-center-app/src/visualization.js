/* =========================================================
   visualization.js
   2D-визуализация сортировочного центра (вид сверху)
   - ангар
   - кольцевой конвейер
   - входные/выходные доки
   - посылки
   ========================================================= */

(function (global) {
  "use strict";

  const COLOR = {
    bg: "#0a1426",
    hangar: "#0d1a30",
    hangarEdge: "#1f2d4d",
    belt: "#2a3d6a",
    beltActive: "#3a5d9a",
    beltBroken: "#6a2a3a",
    output: "#1d3b2c",
    outputEdge: "#2a6a4f",
    outputBroken: "#5a2230",
    outputBlocked: "#5a4a22",
    truck: "#0066ff",
    truckDone: "#1d3b2c",
    pkgStd: "#ff8c1a",
    pkgBulky: "#ff4d4d",
    pkgFrag: "#4dc6ff",
    text: "#e6ecf5",
    textDim: "#7e92b8",
    arrow: "#00c8ff",
    scanner: "#00c8ff",
  };

  class Visualization {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.dpr = window.devicePixelRatio || 1;
      this._resize();
      window.addEventListener("resize", () => this._resize());
    }

    _resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.w = rect.width;
      this.h = rect.height;
      this.canvas.width = this.w * this.dpr;
      this.canvas.height = this.h * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    // Карта регионов в палитру
    _regionColor(i) {
      const palette = [
        "#ff8c1a", "#4dc6ff", "#8effb8", "#ff6ec7",
        "#ffd97a", "#a08eff", "#ff4d4d", "#00e0c8"
      ];
      return palette[i % palette.length];
    }

    render(snap) {
      const ctx = this.ctx;
      const W = this.w, H = this.h;
      ctx.clearRect(0, 0, W, H);

      // фон ангара
      this._drawHangar(W, H, snap);

      // сетка
      this._drawGrid(W, H);

      // сканирующая зона (слева сверху)
      this._drawScanner(W, H, snap);

      // сорт-машина (вход в кольцо)
      this._drawSorter(W, H, snap);

      // входные доки (inbound)
      this._drawInbound(W, H, snap);

      // выходные доки (outbound)
      this._drawOutbound(W, H, snap);

      // кольцевой конвейер
      this._drawRing(W, H, snap);

      // выходы (карманы)
      this._drawOutputs(W, H, snap);

      // посылки
      this._drawPackages(W, H, snap);

      // подписи
      this._drawLabels(W, H, snap);
    }

    // ---------- компоненты ----------
    _drawHangar(W, H) {
      const ctx = this.ctx;
      ctx.fillStyle = COLOR.hangar;
      ctx.fillRect(0, 0, W, H);
      // рамка
      ctx.strokeStyle = COLOR.hangarEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, W - 16, H - 16);
    }

    _drawGrid(W, H) {
      const ctx = this.ctx;
      ctx.strokeStyle = "rgba(31, 45, 77, 0.35)";
      ctx.lineWidth = 1;
      const step = 30;
      ctx.beginPath();
      for (let x = 0; x < W; x += step) {
        ctx.moveTo(x, 0); ctx.lineTo(x, H);
      }
      for (let y = 0; y < H; y += step) {
        ctx.moveTo(0, y); ctx.lineTo(W, y);
      }
      ctx.stroke();
    }

    _drawScanner(W, H, snap) {
      const ctx = this.ctx;
      const x = 60, y = H - 80, w = 100, h = 50;
      ctx.fillStyle = snap.failures.scannerOk ? "#0d2840" : "#3b1d28";
      ctx.strokeStyle = snap.failures.scannerOk ? COLOR.scanner : "#ff8ea1";
      ctx.lineWidth = 2;
      this._roundRect(x, y, w, h, 6);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = COLOR.text;
      ctx.font = "11px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Сканер (3D)", x + w / 2, y + 18);
      ctx.fillText(snap.failures.scannerOk ? "OK" : "СБОЙ", x + w / 2, y + 36);
      // резервный индикатор
      if (!snap.failures.scannerOk) {
        ctx.fillStyle = "#ffd97a";
        ctx.fillText("(резерв активен)", x + w / 2, y + 50);
      }
    }

    _drawSorter(W, H, snap) {
      const ctx = this.ctx;
      const x = 60, y = H / 2 - 30, w = 90, h = 60;
      ctx.fillStyle = snap.failures.sorterOk ? "#0d2840" : "#3b1d28";
      ctx.strokeStyle = snap.failures.sorterOk ? "#00a3ff" : "#ff8ea1";
      ctx.lineWidth = 2;
      this._roundRect(x, y, w, h, 6);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = COLOR.text;
      ctx.font = "11px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Сорт-машина", x + w / 2, y + 22);
      ctx.fillText(snap.failures.sorterOk ? "OK" : "СБОЙ", x + w / 2, y + 40);
      if (snap.failures.bypassActive) {
        ctx.fillStyle = "#8ec5ff";
        ctx.fillText("обходной путь", x + w / 2, y + 56);
      }
    }

    _drawInbound(W, H, snap) {
      const ctx = this.ctx;
      // Доки слева
      const dockCount = 4;
      const dockW = 36, dockH = 50;
      const startY = 90;
      ctx.font = "10px -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = COLOR.textDim;
      ctx.fillText("ВХОДНЫЕ ДОКИ (Inbound)", 12, 18);

      for (let i = 0; i < dockCount; i++) {
        const y = startY + i * 70;
        const dock = { x: 14, y, w: dockW, h: dockH };
        // платформа дока
        ctx.fillStyle = "#1a2a4a";
        ctx.fillRect(dock.x, dock.y, dock.w, dock.h);
        ctx.strokeStyle = "#3a5d9a"; ctx.lineWidth = 1.5;
        ctx.strokeRect(dock.x + 0.5, dock.y + 0.5, dock.w - 1, dock.h - 1);
        // показываем фуру, если прибыла
        const truckIdx = i % snap.trucks.length;
        const tr = snap.trucks[truckIdx];
        if (tr) {
          this._drawTruck(dock.x + 4, dock.y + 8, dock.w - 8, dock.h - 16, tr);
        } else {
          ctx.fillStyle = COLOR.textDim;
          ctx.font = "9px -apple-system, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("свободен", dock.x + dock.w / 2, dock.y + dock.h / 2);
        }
      }
    }

    _drawTruck(x, y, w, h, tr) {
      const ctx = this.ctx;
      // кузов
      ctx.fillStyle = tr.state === "done" ? "#1d3b2c" : COLOR.truck;
      this._roundRect(x, y, w, h * 0.6, 3);
      ctx.fill();
      // кабина
      ctx.fillStyle = "#003a99";
      ctx.fillRect(x + w - 8, y + h * 0.55, 8, h * 0.35);
      // прогресс разгрузки
      if (tr.state === "unloading") {
        ctx.fillStyle = "rgba(0, 200, 255, 0.4)";
        ctx.fillRect(x + 2, y + h - 6, (w - 4) * tr.progress, 4);
      }
      // посылки внутри (визуально)
      ctx.fillStyle = "#ff8c1a";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x + 3 + i * 5, y + 5, 3, 3);
      }
    }

    _drawOutbound(W, H, snap) {
      const ctx = this.ctx;
      const dockCount = 4;
      const dockW = 36, dockH = 50;
      const startY = 90;
      ctx.fillStyle = COLOR.textDim;
      ctx.font = "10px -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("ВЫХОДНЫЕ ДОКИ (Outbound)", W - 12, 18);

      for (let i = 0; i < dockCount; i++) {
        const y = startY + i * 70;
        const x = W - 14 - dockW;
        // платформа
        ctx.fillStyle = "#1a2a4a";
        ctx.fillRect(x, y, dockW, dockH);
        ctx.strokeStyle = "#3a5d9a"; ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, y + 0.5, dockW - 1, dockH - 1);
        // фура на отгрузке
        ctx.fillStyle = "#0a8a3a";
        ctx.fillRect(x + 4, y + 10, dockW - 8, 30);
        ctx.fillStyle = "#003a99";
        ctx.fillRect(x + 4, y + 35, 6, 8);
        // иконка стрелки
        ctx.fillStyle = "#8effb8";
        ctx.fillText("→", x + dockW / 2 - 4, y + 28);
      }
    }

    _drawRing(W, H, snap) {
      const ctx = this.ctx;
      // Центр и радиусы
      const cx = W / 2 + 30;
      const cy = H / 2;
      const rx = (W / 2) - 130;
      const ry = (H / 2) - 70;
      const beltWidth = 14;

      const motorFail = !snap.failures.motorOk;
      const beltColor = motorFail ? COLOR.beltBroken : COLOR.belt;
      const beltColor2 = motorFail ? "#a83a4a" : COLOR.beltActive;

      // Рисуем эллипс двумя линиями
      ctx.lineWidth = beltWidth;
      ctx.strokeStyle = beltColor;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Анимация движения ленты (полоски)
      const offset = (snap.t * 12) % 24;
      ctx.lineWidth = 2;
      ctx.strokeStyle = beltColor2;
      ctx.setLineDash([8, 16]);
      ctx.lineDashOffset = -offset;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Стрелка направления
      ctx.fillStyle = COLOR.arrow;
      const ang = (snap.t * 0.5) % (Math.PI * 2);
      const ax = cx + Math.cos(ang) * rx;
      const ay = cy + Math.sin(ang) * ry;
      ctx.beginPath();
      ctx.arc(ax, ay, 4, 0, Math.PI * 2);
      ctx.fill();

      // подпись кольца
      ctx.fillStyle = COLOR.textDim;
      ctx.font = "11px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Кольцевой конвейер (${snap.params.ringLength} м, ${snap.params.beltSpeed} м/с)`, cx, cy + 4);

      // сохраняем для расчётов
      this._ring = { cx, cy, rx, ry };
    }

    _drawOutputs(W, H, snap) {
      const ctx = this.ctx;
      if (!this._ring) return;
      const { cx, cy, rx, ry } = this._ring;
      for (const o of snap.outputs) {
        const a = o.pos * Math.PI * 2;
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry;
        const broken = o.broken;
        const blocked = o.blocked;
        const fill = broken ? COLOR.outputBroken
                    : blocked ? COLOR.outputBlocked
                    : COLOR.output;
        const edge = broken ? "#ff8ea1"
                    : blocked ? "#ffd97a"
                    : COLOR.outputEdge;

        // ромб-карман
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = fill;
        ctx.strokeStyle = edge;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 10);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // индикатор загрузки
        if (!broken && !blocked) {
          const h = (o.loadPct / 100) * 8;
          ctx.fillStyle = o.loadPct > 80 ? "#ff8ea1"
                         : o.loadPct > 50 ? "#ffd97a"
                         : "#8effb8";
          ctx.fillRect(-3, -h, 6, h);
        } else {
          // знак ✖
          ctx.fillStyle = "#fff";
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(broken ? "✖" : "‼", 0, 3);
        }
        ctx.restore();
      }
    }

    _drawPackages(W, H, snap) {
      const ctx = this.ctx;
      if (!this._ring) return;
      const { cx, cy, rx, ry } = this._ring;
      // визуальное "созревание" посылок: все на разных стадиях
      for (const p of snap.packages) {
        if (p.state === "shipped") continue;

        // если в очереди или на сканировании — рисуем у сканера
        if (p.state === "queued") {
          // случайная точка у сканера
          const sx = 80 + Math.random() * 60;
          const sy = H - 70 + (Math.random() - 0.5) * 30;
          this._drawPackageBox(sx, sy, p);
          continue;
        }
        // на конвейере
        if (p.state === "on-belt" || p.state === "sorted") {
          // поза вычисляется как интерполяция от 0 до assigned
          const t = p.state === "sorted" ? 1 : clamp(p.pos, 0, 1);
          // Параметр t: 0 — у входа (слева от сортера), 1 — у кармана
          const startAng = Math.PI; // вход слева
          // Выходы индексируются 0..N-1 в порядке обхода (CCW).
          // Чтобы всегда двигаться вперёд (CCW) — приводим endAng в диапазон [startAng, startAng + 2π)
          let endAng = (p.outputIdx / snap.outputs.length) * Math.PI * 2;
          while (endAng <= startAng) endAng += Math.PI * 2;
          const ang = startAng + (endAng - startAng) * t;

          const x = cx + Math.cos(ang) * rx;
          const y = cy + Math.sin(ang) * ry;
          this._drawPackageBox(x, y, p, true);
        }
      }
    }

    _drawPackageBox(x, y, p, onBelt = false) {
      const ctx = this.ctx;
      const color = p.type === "bulky" ? COLOR.pkgBulky
                  : p.type === "fragile" ? COLOR.pkgFrag
                  : COLOR.pkgStd;
      const size = p.type === "bulky" ? 7 : 5;
      ctx.fillStyle = color;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 0.6;
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
      ctx.strokeRect(x - size + 0.5, y - size + 0.5, size * 2 - 1, size * 2 - 1);
      if (p.type === "fragile") {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 6px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", x, y + 2);
      }
    }

    _drawLabels(W, H, snap) {
      const ctx = this.ctx;
      ctx.fillStyle = COLOR.textDim;
      ctx.font = "11px -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Модельное время: ${snap.t.toFixed(0)} с`, 14, H - 14);
      ctx.textAlign = "right";
      ctx.fillText(`Регионов: ${snap.params.regions} · Карманов: ${snap.params.outputs}`, W - 14, H - 14);
    }

    _roundRect(x, y, w, h, r) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

  global.Visualization = Visualization;
})(window);
