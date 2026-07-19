const Visualization = {
  zones: [],
  highlightedZoneId: null,
};

Visualization.registerZone = function (id, type, label, x, y, w, h) {
  this.zones.push({ id: id, type: type, label: label, x: x, y: y, w: w, h: h });
};

Visualization.hitTest = function (px, py) {
  for (let i = this.zones.length - 1; i >= 0; i--) {
    const z = this.zones[i];
    if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) return z;
  }
  return null;
};

Visualization.drawHighlight = function (ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(9, 105, 218, 0.08)';
  ctx.strokeStyle = '#0969da';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(9, 105, 218, 0.3)';
  ctx.shadowBlur = 12;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
};

Visualization.draw = function (ctx, cfg) {
  const v = cfg.visualization;
  const w = v.canvasWidth;
  const h = v.canvasHeight;
  const self = this;

  self.zones = [];

  ctx.save();

  this.drawBackground(ctx, w, h);
  this.drawTitle(ctx, w);

  const leftMargin = 20;
  const dockUnloadW = v.dockUnloadWidth;
  const gapDockBuffer = 12;
  const bufferW = v.bufferWidth;
  const gapBufferRing = 12;

  const loadingAreaW = v.dockLoadWidth * 2 + 8;
  const rightMargin = 10;
  const gapRingLoading = 12;

  const leftZoneRight = leftMargin + dockUnloadW + gapDockBuffer + bufferW + gapBufferRing;
  const rightZoneLeft = w - rightMargin - loadingAreaW - gapRingLoading;
  const ringAvailable = rightZoneLeft - leftZoneRight;

  let ringRX = Math.min(ringAvailable / 2 * 0.88, Math.min(w * 0.28, 400));
  if (ringRX < 100) ringRX = 100;
  const ringCX = leftZoneRight + ringRX;

  const titleAreaH = 65;
  const ringCY = titleAreaH + (h - titleAreaH - 10) * 0.5;
  const ringRY = Math.min((h - titleAreaH - 10) * 0.34, 200);

  this.drawConveyorLines(ctx, ringCX, ringCY, ringRX, ringRY, w, h, cfg);
  this.drawUnloadingDocks(ctx, cfg, ringCY, h, self);
  this.drawBuffer(ctx, ringCX, ringCY, ringRX, cfg, self);
  this.drawRingConveyor(ctx, ringCX, ringCY, ringRX, ringRY, self);
  this.drawPocketBlocks(ctx, ringCX, ringCY, ringRX, ringRY, cfg, self);
  this.drawConveyorItems(ctx, ringCX, ringCY, ringRX, ringRY);
  this.drawShippingBuffer(ctx, ringCX, ringCY, ringRX, w, cfg, self);
  this.drawLoadingDocks(ctx, w, cfg, ringCY, self);
  this.drawSupportZones(ctx, ringCX, ringCY, ringRX, ringRY, w, h, self);
  this.drawLegend(ctx, w, h);

  ctx.restore();
};

Visualization.drawBackground = function (ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
  grad.addColorStop(0, '#f0f3f6');
  grad.addColorStop(1, '#ffffff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const gridSize = 40;
  ctx.strokeStyle = 'rgba(208, 215, 222, 0.4)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
};

Visualization.drawTitle = function (ctx, w) {
  ctx.fillStyle = '#1f2328';
  ctx.font = '22px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Схема сортировочного центра', w / 2, 34);

  ctx.fillStyle = '#656d76';
  ctx.font = '10px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('10 доков разгрузки · 400 направлений · 10 сортировщиков · 100 000 тов/ч · 24 ворот отгрузки', w / 2, 52);
};

Visualization.drawConveyorLines = function (ctx, ringCX, ringCY, ringRX, ringRY, w, h, cfg) {
  ctx.strokeStyle = '#0969da';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);

  const dockRightX = 75 + cfg.visualization.dockUnloadWidth + 10;
  const bufferLeftX = ringCX - ringRX - 55;

  for (let i = 0; i < cfg.reception.docksUnload; i++) {
    const dockY = ringCY - (cfg.reception.docksUnload / 2) * 40 + i * 40 + 16;
    ctx.beginPath();
    ctx.moveTo(dockRightX, dockY);
    ctx.lineTo(bufferLeftX, ringCY);
    ctx.stroke();
  }

  ctx.fillStyle = '#656d76';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('поток товаров', dockRightX + 20, ringCY - 4);

  const bufferRightX = ringCX - ringRX - 20;
  const ringLeftX = ringCX - ringRX + 10;
  ctx.beginPath();
  ctx.moveTo(bufferRightX, ringCY);
  ctx.lineTo(ringLeftX, ringCY);
  ctx.stroke();

  const loadingLeftX = w - 10 - cfg.visualization.dockLoadWidth * 2 - 8 - 12;
  const ringRightX = ringCX + ringRX - 10;
  ctx.beginPath();
  ctx.moveTo(ringRightX, ringCY);
  ctx.lineTo(loadingLeftX, ringCY);
  ctx.stroke();

  ctx.setLineDash([]);
};

Visualization.drawUnloadingDocks = function (ctx, cfg, ringCY, h, self) {
  const v = cfg.visualization;
  const dockW = v.dockUnloadWidth;
  const dockH = v.dockUnloadHeight;
  const startX = 20;
  const count = cfg.reception.docksUnload;
  const totalH = count * (dockH + 8);
  const startY = ringCY - totalH / 2;

  self.registerZone('unload-zone', 'zone-label', 'Зона разгрузки', startX, startY - 20, dockW, totalH + 20);

  ctx.fillStyle = '#1f2328';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ЗОНА РАЗГРУЗКИ', startX + dockW / 2, startY - 16);
  ctx.fillText(count + ' доков', startX + dockW / 2, startY - 4);

  var docksState = Simulation.reception ? Simulation.reception.docks : null;

  for (let i = 0; i < count; i++) {
    const y = startY + i * (dockH + 8);
    const zoneId = 'unload-' + i;

    var isBusy = docksState && docksState[i] ? docksState[i].isBusy : false;
    var hasQueue = docksState && docksState[i] ? docksState[i].queue.length > 0 : false;

    ctx.fillStyle = isBusy ? '#fde8e8' : '#f6f8fa';
    ctx.fillRect(startX, y, dockW, dockH);

    ctx.strokeStyle = isBusy ? '#cf222e' : '#d0d7de';
    ctx.lineWidth = isBusy ? 1.5 : 1;
    ctx.strokeRect(startX, y, dockW, dockH);

    if (self.highlightedZoneId === zoneId) {
      this.drawHighlight(ctx, startX, y, dockW, dockH);
    }

    if (isBusy) {
      ctx.fillStyle = hasQueue ? '#cf222e' : '#bf8700';
    } else {
      ctx.fillStyle = '#2da44e';
    }
    ctx.beginPath();
    ctx.arc(startX + 8, y + dockH / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1f2328';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Док ' + (i + 1), startX + 16, y + dockH / 2 + 3);

    if (isBusy) {
      ctx.fillStyle = '#cf222e';
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('занят', startX + dockW - 4, y + dockH / 2 + 3);
    }
    if (hasQueue) {
      var qLen = docksState[i].queue.length;
      ctx.fillStyle = '#cf222e';
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('+' + qLen, startX + dockW - 4, y + dockH - 3);
    }

    self.registerZone(zoneId, 'unload', 'Док ' + (i + 1) + (isBusy ? ' (занят)' : ''), startX, y, dockW, dockH);
  }
};

Visualization.drawBuffer = function (ctx, ringCX, ringCY, ringRX, cfg, self) {
  const v = cfg.visualization;
  const bw = v.bufferWidth;
  const bh = v.bufferHeight;
  const x = ringCX - ringRX - bw - 35;
  const y = ringCY - bh / 2;

  const grad = ctx.createLinearGradient(x, y, x, y + bh);
  grad.addColorStop(0, '#e8eaed');
  grad.addColorStop(1, '#d0d7de');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#d0d7de';
  ctx.lineWidth = 2;
  this.roundRect(ctx, x, y, bw, bh, 6);
  ctx.fill();
  ctx.stroke();

  if (self.highlightedZoneId === 'buffer') {
    this.drawHighlight(ctx, x, y, bw, bh);
  }

  ctx.fillStyle = '#1f2328';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('БУФЕР', x + bw / 2, y + 16);
  ctx.fillText('ПРИЁМКИ', x + bw / 2, y + 26);
  var bufState = Simulation.reception ? Simulation.reception.buffer : null;
  var bufCount = bufState ? bufState.count : 0;
  var bufFill = bufState ? bufState.fillRate : 0;

  ctx.fillStyle = '#656d76';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(bufCount + ' / ' + cfg.reception.bufferCapacity + ' палет', x + bw / 2, y + bh - 10);

  var fillH = Math.max(bh * Math.min(bufFill, 1), 4);
  if (fillH > bh) fillH = bh;

  var backColor = bufFill > 0.8 ? 'rgba(207, 34, 46, 0.1)' : bufFill > 0.5 ? 'rgba(191, 135, 0, 0.1)' : 'rgba(45, 164, 78, 0.1)';
  var fillColor = bufFill > 0.8 ? 'rgba(207, 34, 46, 0.4)' : bufFill > 0.5 ? 'rgba(191, 135, 0, 0.4)' : 'rgba(45, 164, 78, 0.4)';

  ctx.fillStyle = backColor;
  this.roundRect(ctx, x + 4, y + bh - fillH - 4, bw - 8, fillH, 3);
  ctx.fill();

  ctx.fillStyle = fillColor;
  ctx.fillRect(x + 6, y + bh - fillH - 2, (bw - 12) * bufFill, fillH - 4);

  self.registerZone('buffer', 'buffer', 'Буфер приемки', x, y, bw, bh);
};

Visualization.drawRingConveyor = function (ctx, cx, cy, rx, ry, self) {
  ctx.save();

  ctx.shadowColor = 'rgba(9, 105, 218, 0.08)';
  ctx.shadowBlur = 20;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  grad.addColorStop(0, '#f0f3f6');
  grad.addColorStop(0.7, '#e8eaed');
  grad.addColorStop(1, '#e0e2e5');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#0969da';
  ctx.lineWidth = 3;
  if (self.highlightedZoneId === 'conveyor') {
    ctx.save();
    ctx.lineWidth = 5;
    ctx.shadowColor = 'rgba(9, 105, 218, 0.4)';
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.restore();
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(9, 105, 218, 0.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.7, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(9, 105, 218, 0.7)';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('КОЛЬЦЕВОЙ СОРТИРОВОЧНЫЙ', cx, cy - 10);
  ctx.fillText('КОНВЕЙЕР', cx, cy + 8);
  ctx.fillStyle = '#1f2328';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.fillText('10 сортировщиков × 10 000 тов/ч', cx, cy + 28);

  ctx.fillStyle = '#1f2328';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  var arrowAngle = -15 * Math.PI / 180;
  var arrowX = cx + rx * 0.75 * Math.cos(arrowAngle);
  var arrowY = cy + ry * 0.75 * Math.sin(arrowAngle);
  ctx.fillText('→ направление движения', arrowX, arrowY - 14);
  ctx.fillStyle = '#656d76';
  ctx.font = '20px "Segoe UI", sans-serif';
  var arrowAngles = [0.3, 1.0, 2.7, 4.8];
  for (var ai = 0; ai < arrowAngles.length; ai++) {
    var a = arrowAngles[ai];
    var ax = cx + rx * 0.88 * Math.cos(a);
    var ay = cy + ry * 0.88 * Math.sin(a);
    ctx.fillText('▸', ax, ay + 5);
  }

  ctx.restore();

  self.registerZone('conveyor', 'conveyor', 'Кольцевой конвейер', cx - rx, cy - ry, rx * 2, ry * 2);
};

Visualization.drawPocketBlocks = function (ctx, cx, cy, rx, ry, cfg, self) {
  const v = cfg.visualization;
  const blocks = cfg.sorting.pocketBlocks;
  const perBlock = cfg.sorting.pocketsPerBlock;
  const bw = v.pocketBlockWidth;
  const bh = v.pocketBlockHeight;
  const offset = v.pocketOffset;

  const topStart = 25 * Math.PI / 180;
  const topEnd = 155 * Math.PI / 180;
  const bottomStart = 205 * Math.PI / 180;
  const bottomEnd = 335 * Math.PI / 180;

  var pocketData = Simulation.sorting ? Simulation.sorting.pockets : null;

  function drawBlock(index, angle, isTop) {
    const bx = cx + (rx + offset) * Math.cos(angle);
    const by = cy + (ry + offset) * Math.sin(angle);

    ctx.strokeStyle = 'rgba(9, 105, 218, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(cx + rx * 0.92 * Math.cos(angle), cy + ry * 0.92 * Math.sin(angle));
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f6f8fa';
    ctx.strokeStyle = '#d0d7de';
    ctx.lineWidth = 1;
    ctx.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
    ctx.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);

    var avgFill = 0;
    if (pocketData) {
      var startIdx = index * perBlock;
      var endIdx = Math.min(startIdx + perBlock, cfg.sorting.pockets);
      var cnt = endIdx - startIdx;
      var total = 0;
      for (var p = startIdx; p < endIdx; p++) {
        total += pocketData[p].fillRate;
      }
      avgFill = cnt > 0 ? total / cnt : 0;
    }

    var fillColor = avgFill > 0.8 ? '#cf222e' : avgFill > 0.5 ? '#bf8700' : '#2da44e';
    ctx.fillStyle = fillColor;
    ctx.fillRect(bx - bw / 2 + 2, by - bh / 2 + 2, (bw - 4) * avgFill, bh - 4);

    const startNum = index * perBlock + 1;
    const endNum = Math.min((index + 1) * perBlock, cfg.sorting.pockets);
    ctx.fillStyle = '#1f2328';
    ctx.textAlign = 'center';
    ctx.textBaseline = isTop ? 'bottom' : 'top';
    const labelY = isTop ? by - bh / 2 - 2 : by + bh / 2 + 2;
    if (isTop) {
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillText(endNum, bx, labelY);
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillText('—', bx, labelY - 9);
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillText(startNum, bx, labelY - 18);
    } else {
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillText(startNum, bx, labelY);
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillText('—', bx, labelY + 9);
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillText(endNum, bx, labelY + 18);
    }

    var fillPct = Math.round(avgFill * 100);
    var tip = 'Карманы ' + startNum + '–' + endNum + ': ' + fillPct + '% заполнены';
    self.registerZone('pocket-block-' + index, 'pocket-block', tip, bx - bw / 2, by - bh / 2, bw, bh);
  }

  const topBlocks = Math.floor(blocks / 2);
  const bottomBlocks = blocks - topBlocks;

  for (let i = 0; i < topBlocks; i++) {
    const t = topBlocks > 1 ? i / (topBlocks - 1) : 0.5;
    const angle = topStart + t * (topEnd - topStart);
    drawBlock(i, angle, true);
  }

  for (let i = 0; i < bottomBlocks; i++) {
    const t = bottomBlocks > 1 ? i / (bottomBlocks - 1) : 0.5;
    const angle = bottomStart + t * (bottomEnd - bottomStart);
    drawBlock(topBlocks + i, angle, false);
  }
};

Visualization.drawConveyorItems = function (ctx, cx, cy, rx, ry) {
  var sort = Simulation.sorting;
  if (!sort || !sort.conveyorItems || sort.conveyorItems.length === 0) return;

  ctx.save();
  ctx.shadowColor = 'rgba(9, 105, 218, 0.3)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#0969da';

  var items = sort.conveyorItems;
  for (var i = 0; i < items.length; i++) {
    var ci = items[i];
    if (ci.progress < 0 || ci.progress >= 1) continue;
    var angle = sort.getConveyorItemAngle(ci.destPocketIndex, ci.progress);
    var dotX = cx + rx * Math.cos(angle);
    var dotY = cy + ry * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

Visualization.drawShippingBuffer = function (ctx, ringCX, ringCY, ringRX, w, cfg, self) {
  const v = cfg.visualization;
  const dockW = v.dockLoadWidth;
  const loadingAreaW = dockW * 2 + 8;
  const ringRight = ringCX + ringRX;
  const loadLeft = w - 10 - loadingAreaW;
  const gap = loadLeft - ringRight;
  if (gap < 30) return;

  const bx = ringRight + gap * 0.15;
  const bw = 36;
  const bh = 40;
  const by = ringCY - bh / 2;

  ctx.fillStyle = '#f6f8fa';
  ctx.strokeStyle = '#d0d7de';
  ctx.lineWidth = 1;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeRect(bx, by, bw, bh);

  ctx.fillStyle = '#1f2328';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('БУФЕР', bx + bw / 2, by + 12);
  ctx.fillText('ОТГРУЗКИ', bx + bw / 2, by + 20);

  var ship = Simulation.shipping;
  var bufCount = ship ? ship.buffer.length : 0;
  ctx.fillStyle = bufCount >= 16 ? '#bf8700' : '#656d76';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.fillText(bufCount + ' пал', bx + bw / 2, by + bh - 6);

  self.registerZone('ship-buffer', 'buffer', 'Буфер отгрузки (' + bufCount + ' палет)', bx, by, bw, bh);
};

Visualization.drawLoadingDocks = function (ctx, w, cfg, ringCY, self) {
  const v = cfg.visualization;
  const dockW = v.dockLoadWidth;
  const dockH = v.dockLoadHeight;
  const count = cfg.shipping.docksLoad;
  const cols = 2;
  const perCol = Math.ceil(count / cols);
  const gapX = dockW + 4;
  const gapY = dockH + 3;
  const loadingAreaW = cols * gapX - 4;
  const totalColH = perCol * gapY;
  const startX = w - 10 - loadingAreaW;
  const startY = ringCY - totalColH / 2;

  self.registerZone('load-zone', 'zone-label', 'Зона загрузки', startX, startY - 20, loadingAreaW, totalColH + 20);

  ctx.fillStyle = '#1f2328';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ЗОНА ЗАГРУЗКИ', startX + loadingAreaW / 2, startY - 16);
  ctx.fillText(count + ' ворот', startX + loadingAreaW / 2, startY - 4);

  var docksState = Simulation.shipping ? Simulation.shipping.docks : null;

  for (let i = 0; i < count; i++) {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const x = startX + col * gapX;
    const y = startY + row * gapY;
    const zoneId = 'load-' + i;

    var status = docksState && docksState[i] ? docksState[i].status : 'free';
    var isHighlight = self.highlightedZoneId === zoneId;

    if (status === 'free') {
      ctx.fillStyle = '#f6f8fa';
    } else if (status === 'loading') {
      ctx.fillStyle = '#fef2e0';
    } else {
      ctx.fillStyle = '#e6f4ea';
    }
    ctx.fillRect(x, y, dockW, dockH);

    ctx.strokeStyle = isHighlight ? '#0969da' : status === 'free' ? '#d0d7de' : status === 'loading' ? '#bf8700' : '#2da44e';
    ctx.lineWidth = isHighlight ? 2 : status === 'free' ? 1 : 1.5;
    ctx.strokeRect(x, y, dockW, dockH);

    if (isHighlight) {
      this.drawHighlight(ctx, x, y, dockW, dockH);
    }

    var dotColor = status === 'free' ? '#2da44e' : status === 'loading' ? '#bf8700' : '#0969da';
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(x + dockW - 7, y + dockH / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1f2328';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('B' + (i + 1), x + 4, y + dockH / 2 + 3);

    var label = status === 'free' ? '' : status === 'loading' ? '...' : '';
    if (label) {
      ctx.fillStyle = status === 'loading' ? '#bf8700' : '#2da44e';
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(label, x + dockW - 10, y + dockH / 2 + 2);
    }

    self.registerZone(zoneId, 'load', 'Ворота ' + (i + 1) + ' (' + status + ')', x, y, dockW, dockH);
  }

  var ship = Simulation.shipping;
  if (ship) {
    ctx.fillStyle = '#1f2328';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Отгружено: ' + ship.dispatchedCount, startX + loadingAreaW / 2, startY + totalColH + 14);
  }
};

Visualization.drawSupportZones = function (ctx, ringCX, ringCY, ringRX, ringRY, w, h, self) {
  var dep = Simulation.depalletizing;
  var pack = Simulation.packing;

  var depInfo = '';
  var busyCount = 0;
  if (dep) {
    for (var si = 0; si < dep.stations.length; si++) {
      if (dep.stations[si].busy) busyCount++;
    }
    depInfo = dep.stations.length + ' постов, занято: ' + busyCount;
  } else {
    depInfo = CONFIG.depalletizing.stations + ' поста';
  }

  var sort = Simulation.sorting;
  var backupVal = sort ? sort.backupBuffer.length : 0;
  var packInfo = pack ? 'заклеено: ' + pack.sealedCount : 'заклейка КТЯ';
  var palletInfo = pack ? 'палет: ' + pack.palletCount : 'паллетирование';

  var ringXright = ringCX + ringRX;

  var zones = [
    {
      id: 'depalletizing', label: 'РАСПАЛЛЕТИРОВАНИЕ', sub: depInfo,
      x: ringCX - ringRX - 75, y: ringCY - ringRY - 35, w: 60, h: 36
    },
    {
      id: 'nonsort', label: 'NonSort', sub: 'ручная сортировка',
      x: ringCX + ringRX - 30, y: ringCY - ringRY - 35, w: 60, h: 36
    },
    {
      id: 'backup', label: 'РЕЗЕРВ', sub: backupVal + ' тов',
      x: ringCX + ringRX - 30, y: ringCY - ringRY + 5, w: 60, h: 26
    },
    {
      id: 'sealing', label: 'ЗАКЛЕЙКА', sub: packInfo,
      x: ringXright + 20, y: ringCY - 20, w: 55, h: 30
    },
    {
      id: 'palletizing', label: 'ПАЛЛЕТЫ', sub: palletInfo,
      x: ringXright + 20, y: ringCY + 15, w: 55, h: 30
    },
    {
      id: 'press', label: 'ПРЕСС',
      sub: dep ? 'утилизировано: ' + dep.containerScrapCount : 'утилизация КТЯ',
      x: ringCX - ringRX - 80, y: ringCY + ringRY - 8, w: 55, h: 26
    },
    {
      id: 'newContainer', label: 'НОВЫЕ КТЯ',
      sub: dep ? 'создано: ' + dep.newContainerCount : 'производство',
      x: ringCX - ringRX - 80, y: ringCY + ringRY + 20, w: 55, h: 26
    },
  ];

  zones.forEach(function (z) {
    var isActive = z.id === 'depalletizing' && busyCount > 0;
    ctx.fillStyle = isActive ? '#e6f4ea' : '#f0f3f6';
    ctx.strokeStyle = z.id === 'depalletizing' && busyCount === dep.stations.length ? '#cf222e' : isActive ? '#2da44e' : '#d0d7de';
    ctx.lineWidth = 1;
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeRect(z.x, z.y, z.w, z.h);

    if (self.highlightedZoneId === z.id) {
      self.drawHighlight(ctx, z.x, z.y, z.w, z.h);
    }

    ctx.fillStyle = '#1f2328';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(z.label, z.x + z.w / 2, z.y + 12);

    ctx.fillStyle = '#656d76';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillText(z.sub, z.x + z.w / 2, z.y + z.h - 6);

    self.registerZone(z.id, 'support', z.label, z.x, z.y, z.w, z.h);
  });

  if (dep) {
    this.drawContainerFlowArrow(ctx, ringCX, ringCY, ringRX, ringRY, dep, pack);
  }

  if (dep && pack) {
    var circX = ringCX - ringRX - 80;
    var circY = ringCY + ringRY + 48;
    ctx.fillStyle = '#f0f3f6';
    ctx.strokeStyle = '#d0d7de';
    ctx.lineWidth = 1;
    ctx.fillRect(circX, circY, 55, 22);
    ctx.strokeRect(circX, circY, 55, 22);
    ctx.fillStyle = '#1f2328';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('КТЯ В ОБОРОТЕ', circX + 27, circY + 9);
    ctx.fillStyle = '#0969da';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillText('' + (dep.emptyContainerBuffer + pack.sealedCount), circX + 27, circY + 19);
  }

  var adj = Simulation.adjustments;
  if (adj) {
    var speedX = ringCX + ringRX + 100;
    var speedY = ringCY + ringRY + 10;

    ctx.fillStyle = '#f0f3f6';
    ctx.strokeStyle = '#d0d7de';
    ctx.lineWidth = 1;
    ctx.fillRect(speedX, speedY - 18, 62, 52);
    ctx.strokeRect(speedX, speedY - 18, 62, 52);
    ctx.fillStyle = '#1f2328';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('СКОРОСТИ', speedX + 31, speedY - 8);

    var drawSpeedBar = function(x, y, label, factor, color) {
      var barW = 50;
      var barH = 6;
      ctx.fillStyle = '#e0e2e5';
      ctx.fillRect(x, y, barW, barH);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW * Math.max(0.05, factor), barH);
      ctx.strokeStyle = '#d0d7de';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, barW, barH);
      ctx.fillStyle = '#656d76';
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, x, y + barH + 8);
      ctx.fillStyle = color;
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(factor * 100) + '%', x + barW, y + barH + 8);
    };

    drawSpeedBar(speedX + 6, speedY + 2, 'Разгр', adj.unloadSpeedFactor, '#2da44e');
    drawSpeedBar(speedX + 6, speedY + 16, 'Сорт', adj.sortSpeedFactor, '#0969da');
    drawSpeedBar(speedX + 6, speedY + 30, 'Конв', adj.conveyorSpeedFactor, '#bf8700');
  }

  var warns = Simulation.warnings;
  if (warns && warns.length > 0) {
    var warnX = ringCX + 100;
    var warnY = ringCY - ringRY - 60;
    ctx.fillStyle = 'rgba(207, 34, 46, 0.06)';
    ctx.strokeStyle = '#cf222e';
    ctx.lineWidth = 1;
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    for (var wi = 0; wi < Math.min(warns.length, 3); wi++) {
      ctx.fillStyle = 'rgba(207, 34, 46, 0.05)';
      ctx.fillRect(warnX - 4, warnY + wi * 12 - 2, 190, 10);
      ctx.strokeStyle = 'rgba(207, 34, 46, 0.2)';
      ctx.strokeRect(warnX - 4, warnY + wi * 12 - 2, 190, 10);
      ctx.fillStyle = '#cf222e';
      ctx.fillText('⚠ ' + warns[wi], warnX, warnY + wi * 12 + 6);
    }
  }
};

Visualization.drawContainerFlowArrow = function (ctx, ringCX, ringCY, ringRX, ringRY, dep, pack) {
  var dpX = ringCX - ringRX - 45;
  var dpBot = ringCY - ringRY + 2;
  var pressX = ringCX - ringRX - 53;
  var pressTop = ringCY + ringRY - 3;
  var newConTop = ringCY + ringRY + 26;
  var ringLeft = ringCX - ringRX - 5;
  var ringTop = ringCY - ringRY + 5;

  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';

  ctx.strokeStyle = 'rgba(191, 135, 0, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ringCX - ringRX, ringCY);
  ctx.lineTo(ringCX - ringRX - 30, ringCY);
  ctx.stroke();
  ctx.fillStyle = '#bf8700';
  ctx.fillText('КТЯ повторно (80%): ' + dep.containerReuseCount, ringCX - ringRX - 15, ringCY - 6);

  ctx.strokeStyle = 'rgba(207, 34, 46, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(dpX, dpBot + 5);
  ctx.lineTo(pressX, pressTop - 5);
  ctx.stroke();
  ctx.fillStyle = '#cf222e';
  ctx.fillText('брак (20%): ' + dep.containerScrapCount, (dpX + pressX) / 2, (dpBot + pressTop) / 2);

  ctx.strokeStyle = 'rgba(9, 105, 218, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.setLineDash([3, 3]);
  ctx.moveTo(pressX, pressTop + 18);
  ctx.lineTo(pressX, newConTop - 5);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#0969da';
  ctx.fillText('новых: ' + dep.newContainerCount, pressX + 30, (pressTop + newConTop) / 2);
};

Visualization.drawLegend = function (ctx, w, h) {
  const x = w - 150;
  const y = 65;
  const pocketItems = [
    { color: '#2da44e', label: 'Карман <50%' },
    { color: '#bf8700', label: 'Карман 50–80%' },
    { color: '#cf222e', label: 'Карман >80%' },
  ];

  ctx.fillStyle = 'rgba(246, 248, 250, 0.9)';
  ctx.strokeStyle = '#d0d7de';
  ctx.lineWidth = 1;
  ctx.fillRect(x - 8, y - 6, 138, pocketItems.length * 16 + 10);
  ctx.strokeRect(x - 8, y - 6, 138, pocketItems.length * 16 + 10);

  pocketItems.forEach(function (item, i) {
    ctx.fillStyle = item.color;
    ctx.fillRect(x + 2, y + i * 16 + 4, 10, 10);
    ctx.fillStyle = '#1f2328';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, x + 16, y + i * 16 + 13);
  });

  const dockY = y + pocketItems.length * 16 + 14;
  const dockItems = [
    { color: '#2da44e', label: 'Док свободен' },
    { color: '#bf8700', label: 'Док занят' },
    { color: '#cf222e', label: 'Док занят + очередь' },
  ];

  ctx.fillStyle = 'rgba(246, 248, 250, 0.9)';
  ctx.strokeStyle = '#d0d7de';
  ctx.lineWidth = 1;
  ctx.fillRect(x - 8, dockY - 6, 138, dockItems.length * 16 + 10);
  ctx.strokeRect(x - 8, dockY - 6, 138, dockItems.length * 16 + 10);

  dockItems.forEach(function (item, i) {
    ctx.fillStyle = item.color;
    ctx.fillRect(x + 2, dockY + i * 16 + 4, 10, 10);
    ctx.fillStyle = '#1f2328';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, x + 16, dockY + i * 16 + 13);
  });
};

Visualization.roundRect = function (ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};
