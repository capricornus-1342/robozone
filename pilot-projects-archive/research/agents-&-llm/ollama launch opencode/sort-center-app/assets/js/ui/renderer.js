/**
 * Canvas renderer — draws the whole facility in 2D.
 */
export class Renderer {
  constructor(canvas, facility) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.facility = facility;
    this.width = canvas.width;
    this.height = canvas.height;
    this._highlightChute = null;
  }

  setHighlight(chute) { this._highlightChute = chute; }

  draw(simTime) {
    const { ctx, width, height, facility } = this;
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = 'rgba(80, 100, 140, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Building outline
    ctx.strokeStyle = 'rgba(140, 170, 200, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 80, 920, 460);

    // Title bar
    ctx.fillStyle = '#9fb3d1';
    ctx.font = '12px system-ui';
    ctx.fillText('ЗДАНИЕ СЦ (одноэтажное, свободный пролёт)', 50, 70);
    ctx.fillText(`Время симуляции: ${this._fmtTime(simTime)}`, 700, 70);

    this._drawInbound(facility);
    this._drawConveyor(facility.inductionConveyor, '#7da3c8');
    this._drawScanner(facility.scanner);
    this._drawConveyor(facility.loopConveyor, '#4f9cf9', true);
    this._drawSortersAndChutes(facility);
    this._drawOutbound(facility);
    this._drawParcelsInMotion(facility);
  }

  _fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  _drawInbound(f) {
    const ctx = this.ctx;
    ctx.fillStyle = '#1b2940';
    ctx.fillRect(60, 80, 880, 50);
    ctx.fillStyle = '#9fb3d1';
    ctx.font = '11px system-ui';
    ctx.fillText('ЗОНА ПРИЁМА (Inbound)', 70, 95);
    ctx.fillText(`Очередь: ${f.inboundZone.size()}`, 70, 115);

    for (const d of f.inboundDocks) {
      const x = d.position.x - 20;
      const y = d.position.y - 10;
      ctx.fillStyle = d.operational ? '#3b4f6a' : '#5a1f1f';
      ctx.fillRect(x, y, 40, 20);
      ctx.strokeStyle = d.operational ? '#4f9cf9' : '#e63946';
      ctx.strokeRect(x, y, 40, 20);
      ctx.fillStyle = '#cdd9eb';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + 20, y + 14);
      // truck preview
      if (d.truck) {
        ctx.fillStyle = '#f9c74f';
        ctx.fillRect(x + 4, y + 22, 32, 8);
      }
    }
    ctx.textAlign = 'left';
  }

  _drawConveyor(conv, color, loop = false) {
    const ctx = this.ctx;
    if (!conv.operational) {
      ctx.strokeStyle = '#5a1f1f';
      ctx.lineWidth = 6;
    } else if (conv.dualDrive) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
    }
    ctx.beginPath();
    const pts = conv.points;
    if (!pts || !pts.length) return;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (loop) ctx.closePath();
    ctx.stroke();
    // dashed centerline
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (loop) ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawScanner(s) {
    const ctx = this.ctx;
    const x = s.position.x, y = s.position.y;
    ctx.fillStyle = s.ok ? '#2d4d7a' : '#5a1f1f';
    ctx.fillRect(x - 18, y - 10, 36, 20);
    ctx.strokeStyle = s.ok ? '#4f9cf9' : '#e63946';
    ctx.strokeRect(x - 18, y - 10, 36, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN', x, y + 4);
    ctx.textAlign = 'left';
  }

  _drawSortersAndChutes(f) {
    const ctx = this.ctx;
    for (let i = 0; i < f.chutes.length; i++) {
      const c = f.chutes[i];
      const x = c.position.x, y = c.position.y;
      // Sorter
      ctx.fillStyle = c.operational ? '#2a3a52' : '#5a1f1f';
      ctx.fillRect(x - 8, y - 24, 16, 8);
      // Chute bin
      const fillH = (c.load / c.capacity) * 30;
      ctx.fillStyle = '#1b2940';
      ctx.fillRect(x - 14, y, 28, 30);
      const grad = ctx.createLinearGradient(0, y + 30, 0, y + 30 - fillH);
      const dest = f.destinations.find(d => d.id === c.destination);
      const col = dest ? this._destColor(dest.code) : '#4f9cf9';
      grad.addColorStop(0, col);
      grad.addColorStop(1, col + 'aa');
      ctx.fillStyle = grad;
      ctx.fillRect(x - 14, y + 30 - fillH, 28, fillH);
      ctx.strokeStyle = c === this._highlightChute ? '#f9c74f' : (c.operational ? '#4f9cf9' : '#e63946');
      ctx.lineWidth = c === this._highlightChute ? 2 : 1;
      ctx.strokeRect(x - 14, y, 28, 30);
      // Label
      ctx.fillStyle = '#cdd9eb';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(c.name, x, y + 44);
      ctx.fillText(`${c.load}/${c.capacity}`, x, y + 54);
      ctx.textAlign = 'left';
    }
  }

  _destColor(code) {
    const map = {
      MSK: '#4f9cf9', SPB: '#90e0ef', KZN: '#f9c74f', EKB: '#f9844a',
      NSK: '#a78bfa', KRD: '#06d6a0', VVO: '#ff70a6'
    };
    return map[code] || '#9fb3d1';
  }

  _drawOutbound(f) {
    const ctx = this.ctx;
    ctx.fillStyle = '#1b2940';
    ctx.fillRect(60, 450, 880, 80);
    ctx.fillStyle = '#9fb3d1';
    ctx.font = '11px system-ui';
    ctx.fillText('ЗОНА ОТГРУЗКИ (Outbound)', 70, 465);

    for (const d of f.outboundDocks) {
      const x = d.position.x - 25;
      const y = d.position.y - 10;
      ctx.fillStyle = d.operational ? '#2a3a52' : '#5a1f1f';
      ctx.fillRect(x, y, 50, 20);
      ctx.strokeStyle = d.operational ? '#06d6a0' : '#e63946';
      ctx.strokeRect(x, y, 50, 20);
      ctx.fillStyle = '#cdd9eb';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + 25, y + 14);
      if (d.truck) {
        const t = d.truck;
        // truck body
        ctx.fillStyle = '#06d6a0';
        ctx.fillRect(x + 4, y + 24, 42, 14);
        // fill ratio bar
        ctx.fillStyle = '#0b1220';
        ctx.fillRect(x + 4, y + 40, 42, 4);
        ctx.fillStyle = '#f9c74f';
        ctx.fillRect(x + 4, y + 40, 42 * t.fillRatio, 4);
        const dest = f.destinations.find(d => d.id === t.direction);
        ctx.fillStyle = '#cdd9eb';
        ctx.font = '8px system-ui';
        ctx.fillText(dest ? dest.code : '?', x + 25, y + 50);
      }
      ctx.textAlign = 'left';
    }
  }

  _drawParcelsInMotion(f) {
    // For now visualize parcels on the induction conveyor + buffer on loop
    // (parcel positions along loop too complex; show a small indicator)
    const ctx = this.ctx;
    const ic = f.inductionConveyor;
    if (ic.parcels.length) {
      const p = ic.parcels[0];
      const x = ic.points[0].x + Math.random() * 30;
      const y = ic.points[0].y - 4;
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, 6, 6);
    }
    // show count on loop
    const lc = f.loopConveyor;
    ctx.fillStyle = '#cdd9eb';
    ctx.font = '11px system-ui';
    ctx.fillText(`На петле: ${lc.parcels.length}/${lc.capacity}`, 850, 95);
    if (lc.parcels.length > lc.capacity * 0.8) {
      ctx.fillStyle = '#e63946';
      ctx.fillText('⚠ ВЫСОКАЯ ЗАГРУЗКА', 700, 95);
    }
  }
}
