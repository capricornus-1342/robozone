/**
 * Dashboard = live KPIs and small charts.
 * Uses Canvas2D for charts (no external libs).
 */
export class Dashboard {
  constructor(metrics, facility) {
    this.metrics = metrics;
    this.facility = facility;
    this.elements = {};
  }

  bind() {
    this.elements = {
      kpiReceived:   document.getElementById('kpi-received'),
      kpiSorted:     document.getElementById('kpi-sorted'),
      kpiLoaded:     document.getElementById('kpi-loaded'),
      kpiCycleTime:  document.getElementById('kpi-cycle'),
      kpiReroutes:   document.getElementById('kpi-reroutes'),
      kpiTruckCount: document.getElementById('kpi-trucks'),
      kpiQueue:      document.getElementById('kpi-queue'),
      kpiLoop:       document.getElementById('kpi-loop'),
      kpiAvgFill:    document.getElementById('kpi-fill'),
      kpiDamages:    document.getElementById('kpi-damages'),
      chartThroughput: document.getElementById('chart-throughput'),
      chartCycle:      document.getElementById('chart-cycle'),
      logList:         document.getElementById('log-list')
    };
  }

  update(simTime) {
    const m = this.metrics.counters;
    if (this.elements.kpiReceived)   this.elements.kpiReceived.textContent = m.received;
    if (this.elements.kpiSorted)     this.elements.kpiSorted.textContent = m.sorted;
    if (this.elements.kpiLoaded)     this.elements.kpiLoaded.textContent = m.loaded;
    if (this.elements.kpiCycleTime)  this.elements.kpiCycleTime.textContent = this.metrics.avgCycleTime().toFixed(1) + 's';
    if (this.elements.kpiReroutes)   this.elements.kpiReroutes.textContent = m.reroutes;
    if (this.elements.kpiTruckCount) {
      const docks = this.facility.outboundDocks;
      this.elements.kpiTruckCount.textContent = docks.filter(d => d.truck).length + '/' + docks.length;
    }
    if (this.elements.kpiQueue)      this.elements.kpiQueue.textContent = this.facility.inboundZone.size();
    if (this.elements.kpiLoop) {
      this.elements.kpiLoop.textContent = this.facility.loopConveyor.parcels.length + '/' + this.facility.loopConveyor.capacity;
    }
    if (this.elements.kpiAvgFill) {
      const avg = this.facility.chutes.reduce((s, c) => s + c.fillRatio, 0) / this.facility.chutes.length;
      this.elements.kpiAvgFill.textContent = (avg * 100).toFixed(0) + '%';
    }
    if (this.elements.kpiDamages)    this.elements.kpiDamages.textContent = m.fragileDamages;
    this._drawChart(this.elements.chartThroughput, this.metrics.throughputSeries, '#4f9cf9', 'поток (шт/5с)');
    this._drawChart(this.elements.chartCycle, this.metrics.cycleSamples, '#f9c74f', 'время цикла (с)');
  }

  _drawChart(canvas, data, color, label) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(140,170,200,0.2)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h - 20) * i / 4;
      ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(w, y); ctx.stroke();
    }
    if (!data || !data.length) {
      ctx.fillStyle = '#5a6a82';
      ctx.font = '11px system-ui';
      ctx.fillText(label, 25, 18);
      return;
    }
    const max = Math.max(...data.map(d => d.value), 1);
    ctx.fillStyle = '#5a6a82';
    ctx.font = '10px system-ui';
    ctx.fillText(`${label} макс: ${max.toFixed(0)}`, 25, 14);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const N = data.length;
    for (let i = 0; i < N; i++) {
      const d = data[i];
      const x = 20 + (w - 30) * (i / Math.max(1, N - 1));
      const y = h - 10 - (h - 30) * (d.value / max);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  log(text, level = 'info') {
    if (!this.elements.logList) return;
    const li = document.createElement('li');
    const time = new Date().toLocaleTimeString();
    li.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-${level}">${text}</span>`;
    this.elements.logList.prepend(li);
    while (this.elements.logList.children.length > 50) {
      this.elements.logList.removeChild(this.elements.logList.lastChild);
    }
  }
}
