/* =========================================================
   dashboard.js
   KPI-панель и графики
   ========================================================= */

(function (global) {
  "use strict";

  class Dashboard {
    constructor(els) {
      this.els = els;
    }

    update(snap) {
      // KPI
      const m = snap.metrics;
      this._set("k-processed", m.processed);
      this._set("k-throughput", Math.round(m.throughput || 0));
      this._set("k-cycle", m.avgCycle);
      this._set("k-belt-load", `${m.beltLoad ? m.beltLoad.toFixed(0) : 0}%`);
      this._set("k-out-load", `${m.outLoad ? m.outLoad.toFixed(0) : 0}%`);
      this._set("k-inflight", m.inflight || 0);
      this._set("k-misorts", m.misorts);
      this._set("k-blocked", m.blocked);

      // графики
      this._drawRegions(snap);
      this._drawHistory(snap);
      this._drawEvents(snap);

      // статус
      this._updateStatus(snap);
    }

    _set(id, v) {
      const el = this.els[id] || document.getElementById(id);
      if (el) el.textContent = v;
    }

    _updateStatus(snap) {
      const f = snap.failures;
      const el = this.els["system-status"];
      if (!el) return;
      el.classList.remove("warn", "fail", "bypass");
      if (!f.motorOk || !f.sorterOk) {
        el.classList.add("fail");
        el.textContent = "🔴 Критический сбой!";
      } else if (f.blockedOutputs.size > 0 || f.brokenOutputs.size > 0) {
        el.classList.add("warn");
        el.textContent = `🟡 Засоры/поломки: ${f.blockedOutputs.size + f.brokenOutputs.size}`;
      } else if (f.bypassActive) {
        el.classList.add("bypass");
        el.textContent = "🔵 Обходной режим";
      } else {
        el.textContent = "🟢 Все системы в норме";
      }
    }

    _drawRegions(snap) {
      const c = this.els["chart-regions"] || document.getElementById("chart-regions");
      if (!c) return;
      const ctx = c.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== W * dpr) {
        c.width = W * dpr; c.height = H * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const data = snap.metrics.byRegion;
      const n = data.length;
      const max = Math.max(...data, 1);
      const barW = (W - 20) / n - 4;
      const palette = [
        "#ff8c1a", "#4dc6ff", "#8effb8", "#ff6ec7",
        "#ffd97a", "#a08eff", "#ff4d4d", "#00e0c8"
      ];
      for (let i = 0; i < n; i++) {
        const v = data[i];
        const h = (v / max) * (H - 30);
        const x = 10 + i * (barW + 4);
        const y = H - 20 - h;
        ctx.fillStyle = palette[i % palette.length];
        ctx.fillRect(x, y, barW, h);
        // число
        ctx.fillStyle = "#e6ecf5";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(v, x + barW / 2, y - 2);
        // подпись
        ctx.fillStyle = "#7e92b8";
        ctx.fillText(`R${i + 1}`, x + barW / 2, H - 6);
      }
    }

    _drawHistory(snap) {
      const c = this.els["chart-history"] || document.getElementById("chart-history");
      if (!c) return;
      const ctx = c.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== W * dpr) {
        c.width = W * dpr; c.height = H * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const h = snap.history;
      if (h.length < 2) return;
      const max = Math.max(...h.map(p => p.throughput), 1);
      const stepX = (W - 20) / (h.length - 1);
      // линия throughput
      ctx.strokeStyle = "#00c8ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < h.length; i++) {
        const x = 10 + i * stepX;
        const y = H - 20 - (h[i].throughput / max) * (H - 30);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // подписи
      ctx.fillStyle = "#7e92b8";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Пропускная способность (шт/ч)`, 10, 12);
      ctx.textAlign = "right";
      ctx.fillText(`макс: ${Math.round(max)}`, W - 10, 12);
    }

    _drawEvents(snap) {
      const el = this.els["event-log"] || document.getElementById("event-log");
      if (!el) return;
      const evs = snap.events;
      if (el._lastCount === evs.length) return;
      el._lastCount = evs.length;
      el.innerHTML = evs.map(e => {
        const t = e.t.toFixed(0).padStart(5, " ");
        const cls = e.level === "fail" ? "ev-fail"
                  : e.level === "warn" ? "ev-warn"
                  : e.level === "bypass" ? "ev-bypass"
                  : e.level === "ok" ? "ev-info" : "ev-info";
        return `<div class="ev"><span class="ev-time">${t}с</span><span class="${cls}">${e.msg}</span></div>`;
      }).join("");
    }
  }

  global.Dashboard = Dashboard;
})(window);
