import { Config } from '../config/parameters.js';

function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        const dpr = window.devicePixelRatio || 1;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    render(building, wcs, time) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        ctx.clearRect(0, 0, w, h);

        this._drawBuilding(ctx, building);
        this._drawConveyor(ctx, building.conveyor, time);
        this._drawDocks(ctx, building.inboundDocks);
        this._drawDocks(ctx, building.outboundDocks);
        this._drawScanner(ctx, building.scanner, time);
        this._drawExits(ctx, building.exits);
        this._drawParcels(ctx, wcs.parcels, time);
        this._drawLabels(ctx, building);
    }

    _drawBuilding(ctx, building) {
        const b = building.bounds;
        const s = building.scale;

        ctx.fillStyle = '#0a0e18';
        rrect(ctx, b.x - 12 * s, b.y - 12 * s, b.width + 24 * s, b.height + 24 * s, 10);
        ctx.fill();

        ctx.fillStyle = '#060a12';
        rrect(ctx, b.x - 6 * s, b.y - 6 * s, b.width + 12 * s, b.height + 12 * s, 6);
        ctx.fill();

        ctx.fillStyle = Config.building.floorColor;
        rrect(ctx, b.x, b.y, b.width, b.height, 4);
        ctx.fill();

        ctx.strokeStyle = '#1a2a3a';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        rrect(ctx, b.x, b.y, b.width, b.height, 4);
        ctx.stroke();
        ctx.setLineDash([]);

        for (let gx = 0; gx < b.width; gx += 40 * s) {
            ctx.strokeStyle = 'rgba(30, 50, 70, 0.3)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(b.x + gx, b.y);
            ctx.lineTo(b.x + gx, b.y + b.height);
            ctx.stroke();
        }
        for (let gy = 0; gy < b.height; gy += 40 * s) {
            ctx.beginPath();
            ctx.moveTo(b.x, b.y + gy);
            ctx.lineTo(b.x + b.width, b.y + gy);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(79, 195, 247, 0.12)';
        ctx.font = `bold ${Math.max(10, 12 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('СОРТИРОВОЧНЫЙ ЦЕНТР', b.x + b.width / 2, b.y + b.height + 14 * s);
    }

    _drawConveyor(ctx, conveyor, time) {
        const path = conveyor._path;
        if (path.length < 2) return;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.strokeStyle = '#1a2533';
        ctx.lineWidth = conveyor.beltWidth + 6;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = '#2a3f55';
        ctx.lineWidth = conveyor.beltWidth + 2;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = '#3a5570';
        ctx.lineWidth = conveyor.beltWidth;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.closePath();
        ctx.stroke();

        const dashLen = 8;
        const gapLen = 14;
        const totalLen = dashLen + gapLen;
        const offset = (time * conveyor.speed * 40) % totalLen;

        ctx.strokeStyle = 'rgba(140, 180, 200, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([dashLen, gapLen]);
        ctx.lineDashOffset = -offset;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        const arrowCount = 6;
        for (let a = 0; a < arrowCount; a++) {
            const t = (a / arrowCount + (time * conveyor.speed * 0.04)) % 1;
            const idx = Math.floor(t * (path.length - 1));
            const nextIdx = Math.min(idx + 1, path.length - 1);
            const pt = path[idx];
            const pt2 = path[nextIdx];
            const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x);

            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(angle);
            ctx.fillStyle = 'rgba(79, 195, 247, 0.35)';
            ctx.beginPath();
            ctx.moveTo(7, 0);
            ctx.lineTo(-3, -4);
            ctx.lineTo(-3, 4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    _drawDocks(ctx, docks) {
        for (const dock of docks) {
            const col = dock.type === 'inbound' ? '#1b5e20' : '#b71c1c';

            ctx.fillStyle = col;
            ctx.globalAlpha = 0.5;
            rrect(ctx, dock.x, dock.y - dock.height / 2, dock.width, dock.height, 3);
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.strokeStyle = col;
            ctx.lineWidth = 1;
            rrect(ctx, dock.x, dock.y - dock.height / 2, dock.width, dock.height, 3);
            ctx.stroke();

            ctx.fillStyle = '#263238';
            rrect(ctx, dock.x + 5, dock.y - dock.height / 4, dock.width - 10, dock.height / 2, 2);
            ctx.fill();

            ctx.fillStyle = '#78909c';
            ctx.font = '8px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(
                dock.type === 'inbound' ? 'ВХОД' : 'ВЫХОД',
                dock.x + dock.width / 2,
                dock.y + dock.height / 2 + 4
            );
        }
    }

    _drawScanner(ctx, scanner, time) {
        ctx.fillStyle = 'rgba(38, 166, 154, 0.1)';
        ctx.beginPath();
        ctx.arc(scanner.x, scanner.y, Config.scanner.scanRadius + 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(38, 166, 154, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(scanner.x, scanner.y, Config.scanner.scanRadius, 0, Math.PI * 2);
        ctx.stroke();

        if (scanner.scanning) {
            const pulse = Math.sin(time * 14) * 0.3 + 0.5;
            ctx.strokeStyle = 'rgba(38, 166, 154, 0.7)';
            ctx.lineWidth = 2;
            ctx.globalAlpha = pulse;
            ctx.beginPath();
            ctx.arc(scanner.x, scanner.y, Config.scanner.scanRadius + 8, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = Config.scanner.color;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(scanner.x, scanner.y, 7, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#26a69a';
        ctx.beginPath();
        ctx.arc(scanner.x, scanner.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#80cbc4';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('СКАНЕР', scanner.x, scanner.y + 12);
    }

    _drawExits(ctx, exits) {
        for (const exit of exits) {
            let bgColor = '#0d200d';
            if (exit.faulted) bgColor = '#2d0d0d';
            else if (exit.bufferFull) bgColor = '#2d1f0d';

            ctx.fillStyle = bgColor;
            rrect(ctx, exit.x - exit.width / 2, exit.y - exit.height / 2, exit.width, exit.height, 3);
            ctx.fill();

            ctx.strokeStyle = exit.faulted ? '#ef5350' : '#4caf50';
            ctx.lineWidth = 1.5;
            rrect(ctx, exit.x - exit.width / 2, exit.y - exit.height / 2, exit.width, exit.height, 3);
            ctx.stroke();

            const bufW = Config.buffer.width;
            const bufH = Config.buffer.height;
            const bufX = exit.x - bufW / 2;
            const isTop = exit.angle < 0;
            const bufY = isTop
                ? exit.y + exit.height / 2 + 5
                : exit.y - exit.height / 2 - bufH - 5;

            ctx.fillStyle = '#0a0f1a';
            ctx.fillRect(bufX, bufY, bufW, bufH);
            ctx.strokeStyle = '#1a2a3a';
            ctx.lineWidth = 1;
            ctx.strokeRect(bufX, bufY, bufW, bufH);

            const fillRatio = Math.min(1, exit.buffer.length / exit.bufferCapacity);
            if (fillRatio > 0) {
                ctx.fillStyle = fillRatio >= 1 ? '#e65100' : exit.region.color;
                ctx.globalAlpha = 0.45;
                ctx.fillRect(bufX + 1, bufY + 1, (bufW - 2) * fillRatio, bufH - 2);
                ctx.globalAlpha = 1;
            }

            ctx.fillStyle = exit.region.color;
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = isTop ? 'bottom' : 'top';
            const labelY = isTop
                ? exit.y - exit.height / 2 - 8
                : exit.y + exit.height / 2 + bufH + 12;
            ctx.fillText(exit.region.name, exit.x, labelY);

            if (exit.faulted) {
                ctx.fillStyle = '#ef5350';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('!', exit.x, exit.y);
            }
        }
    }

    _drawParcels(ctx, parcels, time) {
        for (const p of parcels) {
            if (!p.visible) continue;
            if (p.x === 0 && p.y === 0) continue;

            ctx.save();
            ctx.translate(p.x, p.y);

            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;

            ctx.fillStyle = p.color;
            const hs = p.size / 2;
            ctx.fillRect(-hs, -hs, p.size, p.size);

            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(-hs, -hs, p.size, p.size);

            ctx.restore();
        }
    }

    _drawLabels(ctx, building) {
        const b = building.bounds;
        const s = building.scale;

        ctx.fillStyle = 'rgba(79, 195, 247, 0.12)';
        ctx.font = `${Math.max(9, 10 * s)}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('← ВХОДНАЯ ЗОНА', b.x + 8, b.y + 8);
        ctx.textAlign = 'right';
        ctx.fillText('ВЫХОДНАЯ ЗОНА →', b.x + b.width - 8, b.y + 8);
    }
}
