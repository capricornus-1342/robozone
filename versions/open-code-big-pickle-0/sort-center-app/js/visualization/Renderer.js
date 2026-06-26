class Renderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.width = CONFIG.building.width;
    this.height = CONFIG.building.height;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.scale(this.dpr, this.dpr);
    this.animationTime = 0;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  render(simulation) {
    this.clear();
    this.animationTime += 0.016;
    this._drawBackground(simulation);
    this._drawLoopConveyor(simulation);
    this._drawParcels(simulation);
    this._drawExits(simulation);
    this._drawLabels(simulation);
    this._drawDashboard(simulation);
  }

  _drawBackground(simulation) {
    const ctx = this.ctx;
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = '#d0d8e0';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(20, 20, this.width - 40, this.height - 40);
    ctx.setLineDash([]);

    ctx.fillStyle = '#2c3e50';
    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Здание сортировочного центра (одноэтажное, свободный пролет)', this.width / 2, 16);
  }

  _drawLoopConveyor(simulation) {
    const ctx = this.ctx;
    const cx = CONFIG.loopConveyor.centerX;
    const cy = CONFIG.loopConveyor.centerY;
    const rx = CONFIG.loopConveyor.radiusX;
    const ry = CONFIG.loopConveyor.radiusY;

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#5a7d9a';
    ctx.lineWidth = 18;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#7aa3c4';
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 4, ry - 4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#a0c4e0';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < CONFIG.loopConveyor.segments; i++) {
      const angle = (i / CONFIG.loopConveyor.segments) * Math.PI * 2;
      const x = cx + (rx - 5) * Math.cos(angle);
      const y = cy + (ry - 5) * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#3a5a7a';
      ctx.fill();
    }
  }

  _drawParcels(simulation) {
    const ctx = this.ctx;
    const loop = simulation.sortingZone.loopConveyor;

    for (const seg of loop.segments) {
      for (const parcel of seg.parcels) {
        const pos = loop.getParcelPosition(parcel);
        const region = CONFIG.regions.find(r => r.id === parcel.regionId);
        const color = region ? region.color : '#888';

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  _drawExits(simulation) {
    const ctx = this.ctx;

    for (const exit of simulation.sortingZone.exits) {
      const region = CONFIG.regions.find(r => r.id === exit.regionId);
      const color = region ? region.color : '#999';

      ctx.beginPath();
      ctx.arc(exit.x, exit.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = exit.isBlocked ? '#e74c3c' : color;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      const fillPct = exit.utilization;
      if (fillPct > 0) {
        ctx.beginPath();
        ctx.arc(exit.x, exit.y, 12, -Math.PI / 2, -Math.PI / 2 + fillPct * Math.PI * 2);
        ctx.lineTo(exit.x, exit.y);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = '#2c3e50';
      ctx.font = '10px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Выход ${exit.index + 1}`, exit.x, exit.y + 28);
      ctx.fillText(`${exit.load}/${exit.capacity}`, exit.x, exit.y - 20);
    }

    for (const exit of simulation.sortingZone.bypassExits) {
      ctx.beginPath();
      ctx.arc(exit.x, exit.y, 14, 0, Math.PI * 2);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#e67e22';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#e67e22';
      ctx.font = '10px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Обход ${exit.index + 1}`, exit.x, exit.y + 28);
    }
  }

  _drawLabels(simulation) {
    const ctx = this.ctx;

    ctx.fillStyle = '#27ae60';
    ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Зона приема (Inbound)', 120, 100);

    ctx.fillStyle = '#2980b9';
    ctx.fillText('Основная сортировочная магистраль (кольцевой конвейер)', CONFIG.loopConveyor.centerX, 130);

    ctx.fillStyle = '#8e44ad';
    ctx.fillText('Зона отгрузки (Outbound)', 950, 520);

    const legendY = this.height - 30;
    ctx.textAlign = 'left';
    ctx.font = '11px "Segoe UI", Arial, sans-serif';
    for (let i = 0; i < CONFIG.regions.length; i++) {
      const reg = CONFIG.regions[i];
      ctx.fillStyle = reg.color;
      ctx.fillRect(this.width - 400 + i * 120, legendY, 12, 12);
      ctx.fillStyle = '#2c3e50';
      ctx.fillText(reg.name, this.width - 385 + i * 120, legendY + 10);
    }
  }

  _drawDashboard(simulation) {
    const ctx = this.ctx;
    const stats = simulation.stats;
    const dashY = 80;

    ctx.fillStyle = 'rgba(44, 62, 80, 0.85)';
    ctx.fillRect(30, dashY, 260, 160);
    ctx.strokeStyle = '#5a7d9a';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, dashY, 260, 160);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('МОНИТОРИНГ WCS', 40, dashY + 18);

    ctx.font = '11px "Segoe UI", Arial, sans-serif';
    const items = [
      `Принято: ${simulation.inboundZone.totalArrived}`,
      `В системе: ${stats.parcelsInSystem}`,
      `Обработано: ${simulation.outboundZone.totalProcessed}`,
      `Загрузка конвейера: ${Math.round(simulation.sortingZone.loopConveyor.totalLoad / simulation.sortingZone.loopConveyor.segments.length)} пос/сегм`,
      `Пропускная сп-ть: ${Math.round(stats.avgThroughputTime || 0)} мс/пос`,
      `Тиков: ${stats.tickCount}`,
    ];
    for (let i = 0; i < items.length; i++) {
      ctx.fillStyle = i < 2 ? '#ecf0f1' : '#bdc3c7';
      ctx.fillText(items[i], 40, dashY + 38 + i * 18);
    }

    if (stats.congestion) {
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
      ctx.fillText('⚠ ЗАТОР НА КОНВЕЙЕРЕ', 40, dashY + 150);
    }
  }
}
