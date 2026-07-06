export class Visualization {
    constructor(canvas, engine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.engine = engine;
        this.width = canvas.width;
        this.height = canvas.height;
        this.tooltip = null;
        this.animOffset = 0;
        this.lastTime = 0;
        this.conveyorItems = [];

        this.setupInteraction();
    }

    setupInteraction() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.width / rect.width);
            const y = (e.clientY - rect.top) * (this.height / rect.height);
            this.tooltip = this.getTooltip(x, y);
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.tooltip = null;
        });
    }

    getTooltip(x, y) {
        const pocketW = 58;
        const pocketH = 28;
        const startX = 120;
        const startY = 330;
        const cols = 10;
        const gapX = 5;
        const gapY = 5;

        for (let i = 0; i < this.engine.pockets.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const px = startX + col * (pocketW + gapX);
            const py = startY + row * (pocketH + gapY);

            if (x >= px && x <= px + pocketW && y >= py && y <= py + pocketH) {
                const p = this.engine.pockets[i];
                return `P#${p.id} [${p.region}]  ${p.boxes.length}/${p.capacity}  ${p.isReadyToShip() ? 'READY!' : 'filling...'}`;
            }
        }

        const dockY = 95;
        const dockW = 28;
        const dockH = 55;

        for (let i = 0; i < this.engine.docks.length; i++) {
            const dx = 55 + i * 38;
            if (x >= dx && x <= dx + dockW && y >= dockY && y <= dockY + dockH) {
                const d = this.engine.docks[i];
                const label = d.type === 'unload' ? 'UNLOAD' : 'LOAD';
                return `Dock#${d.id} [${label}]  ${d.busy ? `Truck#${d.currentTruck.id}` : 'FREE'}  Queue:${d.queue.length}`;
            }
        }

        const bufY = 245;
        if (x >= 120 && x <= 320 && y >= bufY - 8 && y <= bufY + 12) {
            const mf = (this.engine.buffers.main ? this.engine.buffers.main.fillLevel * 100 : 0).toFixed(1);
            const mc = this.engine.buffers.main ? this.engine.buffers.main.items.length : 0;
            return `Main Buffer: ${mc}/${this.engine.config.bufferCapacity} (${mf}%)`;
        }
        if (x >= 340 && x <= 540 && y >= bufY - 8 && y <= bufY + 12) {
            const rf = (this.engine.buffers.reserve ? this.engine.buffers.reserve.fillLevel * 100 : 0).toFixed(1);
            const rc = this.engine.buffers.reserve ? this.engine.buffers.reserve.items.length : 0;
            return `Reserve Buffer: ${rc}/${this.engine.config.reserveBufferCapacity} (${rf}%)`;
        }

        return null;
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        this.drawBackground();
        this.drawDocks();
        this.drawConveyor();
        this.drawBuffers();
        this.drawPockets();
        this.drawWorkerBar();
        this.drawTooltip();
    }

    drawBackground() {
        const ctx = this.ctx;

        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#0f0f23');
        grad.addColorStop(1, '#1a1a3e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
    }

    drawDocks() {
        const ctx = this.ctx;
        const dockY = 95;
        const dockW = 28;
        const dockH = 55;

        ctx.fillStyle = '#8899aa';
        ctx.font = '10px monospace';
        ctx.fillText('DOCKS', 10, dockY + dockH + 18);

        for (let i = 0; i < this.engine.docks.length; i++) {
            const dock = this.engine.docks[i];
            const x = 55 + i * 38;

            if (dock.busy) {
                const gradient = ctx.createLinearGradient(x, dockY, x, dockY + dockH);
                if (dock.type === 'unload') {
                    gradient.addColorStop(0, '#c0392b');
                    gradient.addColorStop(1, '#e74c3c');
                } else {
                    gradient.addColorStop(0, '#27ae60');
                    gradient.addColorStop(1, '#2ecc71');
                }
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = '#2c3e50';
            }
            ctx.fillRect(x, dockY, dockW, dockH);

            ctx.strokeStyle = dock.busy ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
            ctx.lineWidth = dock.busy ? 2 : 1;
            ctx.strokeRect(x, dockY, dockW, dockH);

            if (dock.busy && dock.currentTruck) {
                ctx.fillStyle = '#ffeb3b';
                ctx.beginPath();
                ctx.arc(x + dockW / 2, dockY + dockH + 8, 3, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#aaa';
                ctx.font = '6px monospace';
                ctx.fillText(`#${dock.currentTruck.id}`, x + 2, dockY + dockH + 16);
            }

            ctx.fillStyle = dock.type === 'unload' ? '#ff6b6b' : '#69db7c';
            ctx.font = '7px monospace';
            const shortId = dock.type === 'unload' ? 'U' : 'L';
            ctx.fillText(`${shortId}${dock.id}`, x + 4, dockY + dockH / 2 + 3);

            if (dock.queue.length > 0) {
                ctx.fillStyle = '#ff9800';
                ctx.font = '7px monospace';
                ctx.fillText(`Q:${dock.queue.length}`, x + 4, dockY - 4);
            }
        }

        const lineY = dockY + dockH + 22;
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(10, lineY);
        ctx.lineTo(this.width - 10, lineY);
        ctx.stroke();
    }

    drawConveyor() {
        const ctx = this.ctx;
        const y = 180;

        ctx.fillStyle = '#8899aa';
        ctx.font = '10px monospace';
        ctx.fillText('CONVEYOR', 10, y - 14);

        const beltX = 50;
        const beltW = this.width - 100;

        const gradient = ctx.createLinearGradient(beltX, y, beltX + beltW, y);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(0.3, '#34495e');
        gradient.addColorStop(0.7, '#34495e');
        gradient.addColorStop(1, '#2c3e50');
        ctx.fillStyle = gradient;
        ctx.fillRect(beltX, y - 6, beltW, 12);

        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(beltX, y - 6, beltW, 12);

        for (let x = beltX; x < beltX + beltW; x += 30) {
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y - 6);
            ctx.lineTo(x, y + 6);
            ctx.stroke();
        }

        this.animOffset = (this.animOffset + 2 * (this.engine.speed || 1)) % (beltW - 10);

        const items = this.engine.buffers.main ? this.engine.buffers.main.items.slice(-15) : [];
        const speed = this.engine.conveyors[0] ? this.engine.conveyors[0].speed : 35000;
        const speedNorm = speed / 35000;

        for (let i = 0; i < Math.min(items.length, 15); i++) {
            const progress = (this.animOffset + i * 25) % (beltW - 20);
            const cx = beltX + 10 + progress;
            const cy = y;

            const hue = (i * 25) % 360;
            ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
            ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(cx, cy, 4 * speedNorm, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = '#8899aa';
        ctx.font = '8px monospace';
        ctx.fillText(`${Math.round(speedNorm * 100)}% speed`, beltX + beltW - 60, y - 12);

        const lineY = y + 18;
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(10, lineY);
        ctx.lineTo(this.width - 10, lineY);
        ctx.stroke();
    }

    drawBuffers() {
        const ctx = this.ctx;
        const y = 215;
        const barW = 200;
        const barH = 18;

        ctx.fillStyle = '#8899aa';
        ctx.font = '10px monospace';
        ctx.fillText('BUFFERS', 10, y + 14);

        const mainFill = this.engine.buffers.main ? this.engine.buffers.main.fillLevel : 0;
        const reserveFill = this.engine.buffers.reserve ? this.engine.buffers.reserve.fillLevel : 0;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(120, y - 6, barW, barH);
        let color = mainFill > 0.8 ? '#e74c3c' : mainFill > 0.5 ? '#f39c12' : '#2ecc71';
        ctx.fillStyle = color;
        ctx.fillRect(120, y - 6, barW * Math.min(1, mainFill), barH);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeRect(120, y - 6, barW, barH);
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.fillText(`Main ${(mainFill * 100).toFixed(0)}%`, 125, y + 7);

        const bx2 = 340;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(bx2, y - 6, barW, barH);
        color = reserveFill > 0.7 ? '#e74c3c' : reserveFill > 0.4 ? '#f39c12' : '#3498db';
        ctx.fillStyle = color;
        ctx.fillRect(bx2, y - 6, barW * Math.min(1, reserveFill), barH);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeRect(bx2, y - 6, barW, barH);
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.fillText(`Reserve ${(reserveFill * 100).toFixed(0)}%`, bx2 + 5, y + 7);

        const lineY = y + 24;
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(10, lineY);
        ctx.lineTo(this.width - 10, lineY);
        ctx.stroke();
    }

    drawPockets() {
        const ctx = this.ctx;
        const pocketW = 58;
        const pocketH = 28;
        const startX = 30;
        const startY = 275;
        const cols = 8;
        const gapX = 5;
        const gapY = 5;

        ctx.fillStyle = '#8899aa';
        ctx.font = '10px monospace';
        ctx.fillText('SORTING POCKETS', 10, startY - 8);

        const pocketStats = this.engine.pockets || [];

        for (let i = 0; i < pocketStats.length; i++) {
            const pocket = pocketStats[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (pocketW + gapX);
            const y = startY + row * (pocketH + gapY);

            const fillRatio = pocket.boxes.length / pocket.capacity;

            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(x, y, pocketW, pocketH);

            let color;
            if (pocket.isReadyToShip()) color = '#2ecc71';
            else if (fillRatio > 0.85) color = '#e74c3c';
            else if (fillRatio > 0.6) color = '#f39c12';
            else if (fillRatio > 0.3) color = '#3498db';
            else color = '#555577';

            ctx.fillStyle = color;
            ctx.fillRect(x + 1, y + 1, (pocketW - 2) * Math.min(1, fillRatio), pocketH - 2);

            ctx.strokeStyle = pocket.isReadyToShip() ? '#2ecc71' : 'rgba(255,255,255,0.15)';
            ctx.lineWidth = pocket.isReadyToShip() ? 2 : 1;
            ctx.strokeRect(x, y, pocketW, pocketH);

            if (pocket.isReadyToShip()) {
                ctx.fillStyle = '#2ecc71';
                ctx.font = '7px monospace';
                ctx.fillText('!', x + pocketW - 12, y + 10);
            }

            ctx.fillStyle = '#fff';
            ctx.font = '8px monospace';
            ctx.fillText(pocket.region, x + 4, y + 11);
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '7px monospace';
            ctx.fillText(`${pocket.boxes.length}`, x + 4, y + 23);
        }
    }

    drawWorkerBar() {
        const ctx = this.ctx;
        const y = this.height - 30;
        const startX = 30;

        ctx.fillStyle = '#8899aa';
        ctx.font = '10px monospace';
        ctx.fillText('WORKERS', 10, y + 5);

        let x = startX;
        for (const worker of this.engine.workers) {
            ctx.fillStyle = worker.busy ? '#e74c3c' : '#2ecc71';
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ccc';
            ctx.font = '5px monospace';
            const short = worker.role.substring(0, 2) === 'un' ? worker.role.substring(8, 13) || 'unl' : worker.role.substring(0, 3);
            ctx.fillText(short, x - 5, y + 16);

            if (worker.busy) {
                ctx.fillStyle = '#ff6b6b';
                ctx.beginPath();
                ctx.arc(x + 4, y - 4, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            x += 24;
        }

        const avail = this.engine.workers.filter(w => !w.busy).length;
        const total = this.engine.workers.length;
        ctx.fillStyle = '#8899aa';
        ctx.font = '8px monospace';
        ctx.fillText(`${avail}/${total} free`, x + 5, y + 5);
    }

    drawTooltip() {
        if (this.tooltip) {
            const ctx = this.ctx;
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(10, this.height - 18, ctx.measureText(this.tooltip).width + 16, 22);
            ctx.fillStyle = '#fff';
            ctx.font = '11px monospace';
            ctx.fillText(this.tooltip, 18, this.height - 3);
        }
    }
}
