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
  ctx.fillStyle = 'rgba(88, 166, 255, 0.12)';
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(88, 166, 255, 0.4)';
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
  const ringRY = Math.min((h - titleAreaH - 10) * 0.38, 200);

  this.drawConveyorLines(ctx, ringCX, ringCY, ringRX, ringRY, w, h, cfg);
  this.drawUnloadingDocks(ctx, cfg, ringCY, h, self);
  this.drawBuffer(ctx, ringCX, ringCY, ringRX, cfg, self);
  this.drawRingConveyor(ctx, ringCX, ringCY, ringRX, ringRY, self);
  this.drawPocketBlocks(ctx, ringCX, ringCY, ringRX, ringRY, cfg);
  this.drawConveyorItems(ctx, ringCX, ringCY, ringRX, ringRY);
  this.drawLoadingDocks(ctx, w, cfg, ringCY, self);
  this.drawSupportZones(ctx, ringCX, ringCY, ringRX, ringRY, w, h, self);
  this.drawLegend(ctx, w, h);

  ctx.restore();
};

Visualization.drawBackground = function (ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
  grad.addColorStop(0, '#161b22');
  grad.addColorStop(1, '#0d1117');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const gridSize = 40;
  ctx.strokeStyle = 'rgba(48, 54, 61, 0.3)';
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
  ctx.fillStyle = '#f0f6fc';
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Схема сортировочного центра', w / 2, 34);

  ctx.fillStyle = '#8b949e';
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('10 доков разгрузки · 400 направлений · 10 сортировщиков · 100 000 тов/ч · 24 ворот отгрузки', w / 2, 52);
};

Visualization.drawConveyorLines = function (ctx, ringCX, ringCY, ringRX, ringRY, w, h, cfg) {
  ctx.strokeStyle = '#58a6ff';
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

  ctx.fillStyle = '#8b949e';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ЗОНА РАЗГРУЗКИ', startX + dockW / 2, startY - 14);
  ctx.fillText(count + ' доков', startX + dockW / 2, startY - 4);

  var docksState = Simulation.reception ? Simulation.reception.docks : null;

  for (let i = 0; i < count; i++) {
    const y = startY + i * (dockH + 8);
    const zoneId = 'unload-' + i;

    var isBusy = docksState && docksState[i] ? docksState[i].isBusy : false;
    var hasQueue = docksState && docksState[i] ? docksState[i].queue.length > 0 : false;

    ctx.fillStyle = isBusy ? '#2d1f1f' : '#1c2333';
    ctx.fillRect(startX, y, dockW, dockH);

    ctx.strokeStyle = isBusy ? '#f85149' : '#30363d';
    ctx.lineWidth = isBusy ? 1.5 : 1;
    ctx.strokeRect(startX, y, dockW, dockH);

    if (self.highlightedZoneId === zoneId) {
      this.drawHighlight(ctx, startX, y, dockW, dockH);
    }

    if (isBusy) {
      ctx.fillStyle = hasQueue ? '#f85149' : '#d29922';
    } else {
      ctx.fillStyle = '#3fb950';
    }
    ctx.beginPath();
    ctx.arc(startX + 8, y + dockH / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#484f58';
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Док ' + (i + 1), startX + 16, y + dockH / 2 + 3);

    if (isBusy) {
      ctx.fillStyle = '#f85149';
      ctx.font = '7px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('занят', startX + dockW - 4, y + dockH / 2 + 3);
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
  grad.addColorStop(0, '#1f2937');
  grad.addColorStop(1, '#111827');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 2;
  this.roundRect(ctx, x, y, bw, bh, 6);
  ctx.fill();
  ctx.stroke();

  if (self.highlightedZoneId === 'buffer') {
    this.drawHighlight(ctx, x, y, bw, bh);
  }

  ctx.fillStyle = '#8b949e';
  ctx.font = '9px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('БУФЕР', x + bw / 2, y + 16);
  ctx.fillText('ПРИЁМКИ', x + bw / 2, y + 26);
  var bufState = Simulation.reception ? Simulation.reception.buffer : null;
  var bufCount = bufState ? bufState.count : 0;
  var bufFill = bufState ? bufState.fillRate : 0;

  ctx.fillStyle = '#8b949e';
  ctx.font = '9px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(bufCount + ' / ' + cfg.reception.bufferCapacity + ' палет', x + bw / 2, y + bh - 10);

  var fillH = Math.max(bh * Math.min(bufFill, 1), 4);
  if (fillH > bh) fillH = bh;

  var backColor = bufFill > 0.8 ? 'rgba(248, 81, 73, 0.15)' : bufFill > 0.5 ? 'rgba(210, 153, 34, 0.15)' : 'rgba(63, 185, 80, 0.15)';
  var fillColor = bufFill > 0.8 ? 'rgba(248, 81, 73, 0.5)' : bufFill > 0.5 ? 'rgba(210, 153, 34, 0.5)' : 'rgba(63, 185, 80, 0.5)';

  ctx.fillStyle = backColor;
  this.roundRect(ctx, x + 4, y + bh - fillH - 4, bw - 8, fillH, 3);
  ctx.fill();

  ctx.fillStyle = fillColor;
  ctx.fillRect(x + 6, y + bh - fillH - 2, (bw - 12) * bufFill, fillH - 4);

  self.registerZone('buffer', 'buffer', 'Буфер приемки', x, y, bw, bh);
};

Visualization.drawRingConveyor = function (ctx, cx, cy, rx, ry, self) {
  ctx.save();

  ctx.shadowColor = 'rgba(88, 166, 255, 0.1)';
  ctx.shadowBlur = 20;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  grad.addColorStop(0, '#1a2332');
  grad.addColorStop(0.7, '#0f1923');
  grad.addColorStop(1, '#0a1018');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 3;
  if (self.highlightedZoneId === 'conveyor') {
    ctx.save();
    ctx.lineWidth = 5;
    ctx.shadowColor = 'rgba(88, 166, 255, 0.5)';
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.restore();
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(88, 166, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.7, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(88, 166, 255, 0.6)';
  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('КОЛЬЦЕВОЙ СОРТИРОВОЧНЫЙ', cx, cy - 10);
  ctx.fillText('КОНВЕЙЕР', cx, cy + 8);
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.fillText('10 сортировщиков × 10 000 тов/ч', cx, cy + 28);

  ctx.restore();

  self.registerZone('conveyor', 'conveyor', 'Кольцевой конвейер', cx - rx, cy - ry, rx * 2, ry * 2);
};

Visualization.drawPocketBlocks = function (ctx, cx, cy, rx, ry, cfg) {
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

    ctx.strokeStyle = 'rgba(88, 166, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(cx + rx * 0.92 * Math.cos(angle), cy + ry * 0.92 * Math.sin(angle));
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#1a2744';
    ctx.strokeStyle = '#30363d';
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

    var fillColor = avgFill > 0.8 ? '#f85149' : avgFill > 0.5 ? '#d29922' : '#3fb950';
    ctx.fillStyle = fillColor;
    ctx.fillRect(bx - bw / 2 + 2, by - bh / 2 + 2, (bw - 4) * avgFill, bh - 4);

    ctx.fillStyle = '#8b949e';
    ctx.font = '7px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = isTop ? 'bottom' : 'top';
    const labelY = isTop ? by - bh / 2 - 2 : by + bh / 2 + 2;
    const startNum = index * perBlock + 1;
    const endNum = Math.min((index + 1) * perBlock, cfg.sorting.pockets);
    ctx.fillText(startNum + '—' + endNum, bx, labelY);
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
  ctx.shadowColor = 'rgba(88, 166, 255, 0.4)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#58a6ff';

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

  ctx.fillStyle = '#8b949e';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ЗОНА ЗАГРУЗКИ', startX + loadingAreaW / 2, startY - 14);
  ctx.fillText(count + ' ворот', startX + loadingAreaW / 2, startY - 4);

  for (let i = 0; i < count; i++) {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const x = startX + col * gapX;
    const y = startY + row * gapY;
    const zoneId = 'load-' + i;

    ctx.fillStyle = '#1c2333';
    ctx.fillRect(x, y, dockW, dockH);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, dockW, dockH);

    if (self.highlightedZoneId === zoneId) {
      this.drawHighlight(ctx, x, y, dockW, dockH);
    }

    ctx.fillStyle = '#58a6ff';
    ctx.beginPath();
    ctx.arc(x + dockW - 7, y + dockH / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#484f58';
    ctx.font = '7px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('B' + (i + 1), x + 4, y + dockH / 2 + 2.5);

    self.registerZone(zoneId, 'load', 'Ворота ' + (i + 1), x, y, dockW, dockH);
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

  var packInfo = pack ? 'заклеено: ' + pack.sealedCount : 'заклейка КТЯ';
  var palletInfo = pack ? 'палет: ' + pack.palletCount : 'паллетирование';

  var ringXright = ringCX + ringRX;

  var zones = [
    {
      id: 'depalletizing', label: 'РАСПАЛЛЕТИРОВАНИЕ', sub: depInfo,
      x: ringCX - ringRX - 75, y: ringCY - ringRY - 50, w: 60, h: 36
    },
    {
      id: 'nonsort', label: 'NonSort', sub: 'ручная сортировка',
      x: ringCX + ringRX - 30, y: ringCY - ringRY - 50, w: 60, h: 36
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
      x: ringCX - ringRX - 80, y: ringCY + ringRY + 20, w: 55, h: 36
    },
    {
      id: 'newContainer', label: 'НОВЫЕ КТЯ',
      sub: dep ? 'создано: ' + dep.newContainerCount : 'производство',
      x: ringCX - ringRX - 80, y: ringCY + ringRY + 60, w: 55, h: 36
    },
  ];

  zones.forEach(function (z) {
    var isActive = z.id === 'depalletizing' && busyCount > 0;
    ctx.fillStyle = isActive ? '#1f2d1a' : '#1a2332';
    ctx.strokeStyle = z.id === 'depalletizing' && busyCount === dep.stations.length ? '#f85149' : isActive ? '#3fb950' : '#30363d';
    ctx.lineWidth = 1;
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeRect(z.x, z.y, z.w, z.h);

    if (self.highlightedZoneId === z.id) {
      self.drawHighlight(ctx, z.x, z.y, z.w, z.h);
    }

    ctx.fillStyle = '#8b949e';
    ctx.font = 'bold 8px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(z.label, z.x + z.w / 2, z.y + 12);

    ctx.fillStyle = '#484f58';
    ctx.font = '7px "Segoe UI", sans-serif';
    ctx.fillText(z.sub, z.x + z.w / 2, z.y + z.h - 6);

    self.registerZone(z.id, 'support', z.label, z.x, z.y, z.w, z.h);
  });

  if (dep) {
    this.drawContainerFlowArrow(ctx, ringCX, ringCY, ringRX, ringRY, dep, pack);
  }

  if (dep && pack) {
    var circX = ringCX - ringRX - 80;
    var circY = ringCY + ringRY + 100;
    ctx.fillStyle = '#1a2332';
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.fillRect(circX, circY, 55, 24);
    ctx.strokeRect(circX, circY, 55, 24);
    ctx.fillStyle = '#8b949e';
    ctx.font = 'bold 8px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('КТЯ В ОБОРОТЕ', circX + 27, circY + 10);
    ctx.fillStyle = '#58a6ff';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillText('' + (dep.emptyContainerBuffer + pack.sealedCount), circX + 27, circY + 21);
  }
};

Visualization.drawContainerFlowArrow = function (ctx, ringCX, ringCY, ringRX, ringRY, dep, pack) {
  var dpX = ringCX - ringRX - 45;
  var dpBot = ringCY - ringRY - 14;
  var pressX = ringCX - ringRX - 53;
  var pressTop = ringCY + ringRY + 25;
  var newConTop = ringCY + ringRY + 65;
  var ringLeft = ringCX - ringRX - 5;
  var ringTop = ringCY - ringRY + 5;

  ctx.font = '7px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';

  ctx.strokeStyle = 'rgba(210, 153, 34, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ringCX - ringRX, ringCY);
  ctx.lineTo(ringCX - ringRX - 30, ringCY);
  ctx.stroke();
  ctx.fillStyle = '#d29922';
  ctx.fillText('КТЯ повторно (80%): ' + dep.containerReuseCount, ringCX - ringRX - 15, ringCY - 6);

  ctx.strokeStyle = 'rgba(248, 81, 73, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(dpX, dpBot + 5);
  ctx.lineTo(pressX, pressTop - 5);
  ctx.stroke();
  ctx.fillStyle = '#f85149';
  ctx.fillText('брак (20%): ' + dep.containerScrapCount, (dpX + pressX) / 2, (dpBot + pressTop) / 2);

  ctx.strokeStyle = 'rgba(88, 166, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.setLineDash([3, 3]);
  ctx.moveTo(pressX, pressTop + 18);
  ctx.lineTo(pressX, newConTop - 5);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#58a6ff';
  ctx.fillText('новых: ' + dep.newContainerCount, pressX + 30, (pressTop + newConTop) / 2);
};

Visualization.drawLegend = function (ctx, w, h) {
  const x = w - 150;
  const y = 65;
  const items = [
    { color: '#3fb950', label: 'Карман <50%' },
    { color: '#d29922', label: 'Карман 50–80%' },
    { color: '#f85149', label: 'Карман >80%' },
  ];

  ctx.fillStyle = 'rgba(22, 27, 34, 0.85)';
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.fillRect(x - 8, y - 6, 138, items.length * 16 + 10);
  ctx.strokeRect(x - 8, y - 6, 138, items.length * 16 + 10);

  items.forEach(function (item, i) {
    ctx.fillStyle = item.color;
    ctx.fillRect(x + 2, y + i * 16 + 4, 10, 10);
    ctx.fillStyle = '#8b949e';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, x + 16, y + i * 16 + 13);
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
