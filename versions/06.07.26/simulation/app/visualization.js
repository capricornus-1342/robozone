const Visualization = {};

Visualization.draw = function (ctx, cfg) {
  const v = cfg.visualization;
  const w = v.canvasWidth;
  const h = v.canvasHeight;

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
  this.drawUnloadingDocks(ctx, cfg, ringCY, h);
  this.drawBuffer(ctx, ringCX, ringCY, ringRX, cfg);
  this.drawRingConveyor(ctx, ringCX, ringCY, ringRX, ringRY);
  this.drawPocketBlocks(ctx, ringCX, ringCY, ringRX, ringRY, cfg);
  this.drawLoadingDocks(ctx, w, cfg, ringCY);
  this.drawSupportZones(ctx, ringCX, ringCY, ringRX, ringRY, w, h);
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

Visualization.drawUnloadingDocks = function (ctx, cfg, ringCY, h) {
  const v = cfg.visualization;
  const dockW = v.dockUnloadWidth;
  const dockH = v.dockUnloadHeight;
  const startX = 20;
  const count = cfg.reception.docksUnload;
  const totalH = count * (dockH + 8);
  const startY = ringCY - totalH / 2;

  ctx.fillStyle = '#1c2333';
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;

  ctx.fillStyle = '#8b949e';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ЗОНА РАЗГРУЗКИ', startX + dockW / 2, startY - 14);
  ctx.fillText(count + ' доков', startX + dockW / 2, startY - 4);

  for (let i = 0; i < count; i++) {
    const y = startY + i * (dockH + 8);
    ctx.fillStyle = '#1c2333';
    ctx.fillRect(startX, y, dockW, dockH);
    ctx.strokeStyle = '#30363d';
    ctx.strokeRect(startX, y, dockW, dockH);

    ctx.fillStyle = '#3fb950';
    ctx.beginPath();
    ctx.arc(startX + 8, y + dockH / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#484f58';
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Док ' + (i + 1), startX + 16, y + dockH / 2 + 3);
  }
};

Visualization.drawBuffer = function (ctx, ringCX, ringCY, ringRX, cfg) {
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

  ctx.fillStyle = '#8b949e';
  ctx.font = '9px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('БУФЕР', x + bw / 2, y + 16);
  ctx.fillText('ПРИЁМКИ', x + bw / 2, y + 26);
  ctx.fillStyle = '#484f58';
  ctx.fillText(cfg.reception.bufferCapacity + ' палет', x + bw / 2, y + bh - 10);

  const fillH = bh * 0.35;
  ctx.fillStyle = 'rgba(63, 185, 80, 0.15)';
  this.roundRect(ctx, x + 4, y + bh - fillH - 4, bw - 8, fillH, 3);
  ctx.fill();

  ctx.fillStyle = 'rgba(63, 185, 80, 0.4)';
  ctx.fillRect(x + 6, y + bh - fillH - 2, (bw - 12) * 0.35, fillH - 4);
};

Visualization.drawRingConveyor = function (ctx, cx, cy, rx, ry) {
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
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.shadowBlur = 0;

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

    const fillLevel = 0.25 + ((index * 7 + index * index * 3) % 100) / 100 * 0.5;
    ctx.fillStyle = fillLevel > 0.6 ? '#d29922' : '#3fb950';
    ctx.fillRect(bx - bw / 2 + 2, by - bh / 2 + 2, (bw - 4) * fillLevel, bh - 4);

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

Visualization.drawLoadingDocks = function (ctx, w, cfg, ringCY) {
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

    ctx.fillStyle = '#1c2333';
    ctx.fillRect(x, y, dockW, dockH);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, dockW, dockH);

    ctx.fillStyle = '#58a6ff';
    ctx.beginPath();
    ctx.arc(x + dockW - 7, y + dockH / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#484f58';
    ctx.font = '7px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('B' + (i + 1), x + 4, y + dockH / 2 + 2.5);
  }
};

Visualization.drawSupportZones = function (ctx, ringCX, ringCY, ringRX, ringRY, w, h) {
  const zones = [
    { label: 'РАСПАЛЛЕТИРОВАНИЕ', sub: '2 поста', x: ringCX - ringRX - 75, y: ringCY - ringRY - 50, w: 60, h: 36 },
    { label: 'NonSort', sub: 'ручная сортировка', x: ringCX + ringRX - 30, y: ringCY - ringRY - 50, w: 60, h: 36 },
    { label: 'ПРЕСС', sub: 'утилизация КТЯ', x: ringCX + ringRX + 10, y: ringCY + ringRY + 20, w: 50, h: 30 },
    { label: 'НОВЫЕ КТЯ', sub: 'производство', x: ringCX - ringRX - 70, y: ringCY + ringRY + 20, w: 50, h: 30 },
  ];

  zones.forEach(function (z) {
    ctx.fillStyle = '#1a2332';
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeRect(z.x, z.y, z.w, z.h);

    ctx.fillStyle = '#8b949e';
    ctx.font = 'bold 8px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(z.label, z.x + z.w / 2, z.y + 14);

    ctx.fillStyle = '#484f58';
    ctx.font = '7px "Segoe UI", sans-serif';
    ctx.fillText(z.sub, z.x + z.w / 2, z.y + z.h - 6);
  });

  ctx.fillStyle = '#484f58';
  ctx.font = '8px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Машина вмещает 32 палеты (16 КТЯ + 16 ролл-кейджей)', ringCX + ringRX + 150, ringCY + ringRY + 60);
  ctx.fillText('Время загрузки: 2 часа · 24 ворот', ringCX + ringRX + 150, ringCY + ringRY + 72);
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
