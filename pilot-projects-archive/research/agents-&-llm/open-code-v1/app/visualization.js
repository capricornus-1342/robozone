function drawLayout(ctx, config, state, simDt) {
    const W = config.canvasWidth;
    const H = config.canvasHeight;
    ctx.clearRect(0, 0, W, H);

    // --- Background ---
    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(0, 0, W, H);

    // --- Status line ---
    const trucks = state ? state.totalArrived || 0 : 0;
    const boxesIn = state ? state.totalBoxesArrived || 0 : 0;
    const unloaded = state ? state.totalUnloaded || 0 : 0;
    const inBuffer = state ? state.bufferCount || 0 : 0;
    ctx.font = '12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const onConveyor = state ? (state.conveyorDots || []).length : 0;
    ctx.fillText(`Прибыло: ${trucks} грузовиков (${boxesIn} кор.)  |  Разгружено: ${unloaded}  |  Буфер: ${inBuffer}  |  На конвейере: ${onConveyor}`, 20, 8);

    // --- Section labels ---
    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#2c3e50';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('ДОКИ РАЗГРУЗКИ', config.docksStartX + config.dockWidth / 2, 25);
    ctx.fillText('БУФЕР', config.bufferX + config.bufferW / 2, config.bufferY - 10);
    ctx.fillText('СОРТИРОВОЧНЫЙ КОНВЕЙЕР', config.conveyorCx, config.conveyorCy - config.conveyorRy - 25);
    ctx.fillText('КАРМАНЫ', config.pocketsStartX + (config.pocketCols * (config.pocketWidth + config.pocketGap) - config.pocketGap) / 2, config.pocketsStartY - 10);

    // --- 1. Draw unloading docks ---
    const dockX = config.docksStartX;
    for (let i = 0; i < config.numUnloadDocks; i++) {
        const y = config.docksStartY + i * (config.dockHeight + config.dockGap);
        const occupied = state && state.dockOccupied && state.dockOccupied[i];
        ctx.fillStyle = occupied ? '#27ae60' : '#3498db';
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 4;
        roundRect(ctx, dockX, y, config.dockWidth, config.dockHeight, 6);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (occupied) {
            const truck = state.currentTrucks && state.currentTrucks[i];
            const boxes = truck ? truck.numBoxes : '?';
            ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`🚛 #${state.truckIds[i]}`, dockX + config.dockWidth / 2, y + config.dockHeight / 2 - 2);
            ctx.font = '8px "Segoe UI", Arial, sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText(`${boxes} кор.`, dockX + config.dockWidth / 2, y + config.dockHeight / 2 + 2);
        } else {
            ctx.font = '10px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`Док ${i + 1}`, dockX + config.dockWidth / 2, y + config.dockHeight / 2);
        }
    }

    // --- 2. Draw buffer ---
    const bx = config.bufferX;
    const by = config.bufferY;
    const bw = config.bufferW;
    const bh = config.bufferH;

    const bufCount = state ? state.bufferCount || 0 : 0;
    const bufFill = Math.min(bufCount / config.bufferCapacity, 1);

    // Background
    ctx.fillStyle = '#ecf0f1';
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 6;
    roundRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Fill indicator on top of background
    if (bufFill > 0.01) {
        const fillH = Math.max(bh * bufFill, 4);
        const r = Math.round(180 + 75 * bufFill);
        const g = Math.round(190 - 160 * bufFill);
        ctx.fillStyle = `rgb(${r}, ${g}, 60)`;
        ctx.beginPath();
        roundRect(ctx, bx + 2, by + bh - fillH + 2, bw - 4, fillH - 2, 4);
        ctx.fill();
    }

    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#2c3e50';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bufCount + ' / ' + config.bufferCapacity, bx + bw / 2, by + bh / 2);

    // --- 3. Draw conveyor ring (elliptical loop) ---
    const cxc = config.conveyorCx;
    const cyc = config.conveyorCy;
    const rx = config.conveyorRx;
    const ry = config.conveyorRy;

    // Outer ellipse
    ctx.beginPath();
    ctx.ellipse(cxc, cyc, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 28;
    ctx.stroke();

    // Inner highlight
    ctx.beginPath();
    ctx.ellipse(cxc, cyc, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 22;
    ctx.stroke();

    // Belt surface
    ctx.beginPath();
    ctx.ellipse(cxc, cyc, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#b0b8c0';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Center line (dashed, direction indicator)
    ctx.beginPath();
    ctx.ellipse(cxc, cyc, rx - 4, ry - 4, 0, 0, Math.PI * 2);
    ctx.setLineDash([8, 12]);
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Direction arrows on conveyor (small triangles)
    const arrowAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    for (const a of arrowAngles) {
        const ax = cxc + (rx - 4) * Math.cos(a);
        const ay = cyc + (ry - 4) * Math.sin(a);
        drawArrowhead(ctx, ax, ay, a + Math.PI / 2, 8, '#7f8c8d');
    }

    // --- Conveyor dots (boxes moving along the belt) ---
    const dots = state ? state.conveyorDots || [] : [];
    for (const dot of dots) {
        const angle = dot.progress * Math.PI * 2;
        const dx = cxc + (rx - 6) * Math.cos(angle);
        const dy = cyc + (ry - 6) * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(dx, dy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#e67e22';
        ctx.fill();
    }

    // Conveyor dot counter
    ctx.font = '10px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#7f8c8d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`На конвейере: ${dots.length}`, cxc, cyc + ry + 30);

    // --- 4. Draw pockets ---
    const pocketGridW = config.pocketCols * (config.pocketWidth + config.pocketGap) - config.pocketGap;
    const pocketGridH = config.pocketRows * (config.pocketHeight + config.pocketGap) - config.pocketGap;
    const pocketStartX = config.pocketsStartX;
    const pocketStartY = config.pocketsStartY;

    const pockets = state ? state.pockets || [] : [];
    const pocketConnectionPoints = [];

    for (let i = 0; i < config.numPockets; i++) {
        const row = Math.floor(i / config.pocketCols);
        const col = i % config.pocketCols;

        const px = pocketStartX + col * (config.pocketWidth + config.pocketGap);
        const py = pocketStartY + row * (config.pocketHeight + config.pocketGap);

        const pocket = pockets[i];
        const region = pocket ? pocket.region : `Карман ${i + 1}`;
        const count = pocket ? pocket.count : 0;
        const fillRate = pocket ? pocket.fillRate : 0;

        // Fill color based on fill rate (green → yellow → red)
        const r = Math.round(80 + 175 * fillRate);
        const g = Math.round(200 - 180 * fillRate);
        ctx.fillStyle = `rgb(${r}, ${g}, 60)`;
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 3;
        roundRect(ctx, px, py, config.pocketWidth, config.pocketHeight, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Region label
        ctx.font = '7px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(region, px + config.pocketWidth / 2, py + 2);

        // Box count
        ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'bottom';
        ctx.fillText(count.toString(), px + config.pocketWidth / 2, py + config.pocketHeight - 3);

        // Store pocket center for connection lines
        pocketConnectionPoints.push({
            x: px + config.pocketWidth / 2,
            y: py + config.pocketHeight / 2,
        });
    }

    // --- 5. Draw connection lines (chutes / arrows) from conveyor to pockets ---
    // Each pocket gets a UNIQUE connection point on the right side of the conveyor
    // loop, distributed evenly along the right half of the ellipse from top to bottom.
    // This reflects a real system where each pocket has an individual diverter at a
    // specific position on the conveyor loop.

    for (let i = 0; i < pocketConnectionPoints.length; i++) {
        const pp = pocketConnectionPoints[i];

        // Distribute points uniformly along the right half of the ellipse
        const t = pocketConnectionPoints.length > 1
            ? i / (pocketConnectionPoints.length - 1)
            : 0;
        const angle = -Math.PI / 2 + t * Math.PI;
        const cx = cxc + (rx - 2) * Math.cos(angle);
        const cy = cyc + ry * Math.sin(angle);

        // Draw chute line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(pp.x, pp.y);
        ctx.strokeStyle = 'rgba(149, 165, 166, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead at pocket end
        const dx = pp.x - cx;
        const dy = pp.y - cy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 5) {
            const angle2 = Math.atan2(dy, dx);
            drawArrowhead(ctx, pp.x, pp.y, angle2, 6, 'rgba(149, 165, 166, 0.6)');
        }
    }

    // --- 6. Extra labels ---
    ctx.font = '10px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#7f8c8d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('← Прибытие грузовиков', config.docksStartX + config.dockWidth / 2, config.docksStartY + config.numUnloadDocks * (config.dockHeight + config.dockGap) - config.dockGap + 5);

    ctx.textBaseline = 'bottom';
    ctx.fillText('Отправка →', config.pocketsStartX + pocketGridW / 2, pocketStartY + pocketGridH + 15);

    // Reserve buffer placeholder
    ctx.fillStyle = '#ecf0f1';
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 25, 660, 150, 40, 6);
    ctx.fill();
    ctx.stroke();
    ctx.font = '10px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#7f8c8d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Резервный буфер', 100, 680);
}


// --- Helper: rounded rectangle ---
function roundRect(ctx, x, y, w, h, r) {
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
}


// --- Helper: arrowhead ---
function drawArrowhead(ctx, x, y, angle, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 2.5);
    ctx.lineTo(-size, size / 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
