// Визуализация
export class Visualizer {
    constructor(ctx, config, engine) {
        this.ctx = ctx;
        this.config = config;
        this.engine = engine;
        this.width = config.canvasWidth;
        this.height = config.canvasHeight;
        
        // Определяем макет для более структурированного вида
        this.layout = {
            unloadDocks: { x: 20, y: 50, w: 60, h: 50, spacing: 70 },
            loadDocks: { x: this.width - 80, y: 50, w: 60, h: 50, spacing: 70 },
            intermediateBuffer: { x: 150, y: 50, w: 400, h: 100 },
            reserveBuffer: { x: 150, y: 200, w: 400, h: 100 },
            sorterConveyor: { x: 150, y: 350, w: this.width - 300, h: 20 },
            pockets: { x: 150, y: 400, w: 70, h: 50, cols: 10, spacingX: 80, spacingY: 60 },
            workers: { x: 600, y: 50, spacing: 30 }
        };
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.font = '12px Arial';
        
        this.drawDocks();
        this.drawBuffers();
        this.drawConveyors();
        this.drawPockets();
        this.drawWorkers();
    }

    drawDocks() {
        const { unloadDocks, loadDocks } = this.layout;
        this.engine.docks.forEach(dock => {
            const layout = dock.type === 'unload' ? unloadDocks : loadDocks;
            const idParts = dock.id.split('_');
            if (idParts.length < 2) return; // Пропускаем доки с некорректным ID
            
            const i = parseInt(idParts[1], 10);
            if (isNaN(i)) return; // Пропускаем, если индекс не число

            const x = layout.x;
            const y = layout.y + i * layout.spacing;

            this.ctx.fillStyle = dock.currentTruck ? this.config.colors.dockBusy : this.config.colors.dock;
            this.ctx.fillRect(x, y, layout.w, layout.h);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(dock.id.replace('_', ' '), x + 5, y + 20);
            if (dock.currentTruck) {
                this.ctx.fillText(`Truck: ${dock.currentTruck.id.slice(0, 5)}`, x + 5, y + 35);
            }
            if (dock.queue.length > 0) {
                 this.ctx.fillStyle = '#000';
                 this.ctx.fillText(`Q: ${dock.queue.length}`, x + layout.w + 5, y + 25);
            }
        });
    }

    drawBuffers() {
        ['intermediate', 'reserve'].forEach(id => {
            const buffer = this.engine.buffers.find(b => b.id === id);
            const layout = this.layout[`${id}Buffer`];
            if (buffer && layout) {
                const fillRate = buffer.items.length / buffer.maxCapacity;
                this.ctx.fillStyle = this.config.colors.buffer;
                this.ctx.fillRect(layout.x, layout.y, layout.w, layout.h);
                // Заполнение
                this.ctx.fillStyle = `rgba(0, 0, 255, 0.3)`;
                this.ctx.fillRect(layout.x, layout.y, layout.w * fillRate, layout.h);

                this.ctx.fillStyle = '#000';
                this.ctx.fillText(`${id.charAt(0).toUpperCase() + id.slice(1)} Buffer`, layout.x + 10, layout.y + 20);
                this.ctx.fillText(`Items: ${buffer.items.length} / ${buffer.maxCapacity}`, layout.x + 10, layout.y + 40);
            }
        });
    }

    drawConveyors() {
        const layout = this.layout.sorterConveyor;
        this.ctx.fillStyle = this.config.colors.conveyor;
        this.ctx.fillRect(layout.x, layout.y, layout.w, layout.h);

        // Отрисовка коробок на конвейере
        const sorter = this.engine.conveyors.find(c => c.id === 'main_sorter');
        if (sorter) { // <-- ЗАЩИТА
            this.ctx.fillStyle = this.config.colors.box;
            sorter.buffer.forEach((box, i) => {
                // Позиция зависит от индекса, упрощенная визуализация
                const boxX = layout.x + (layout.w / (sorter.maxBuffer || 1)) * i;
                const boxY = layout.y + 5;
                this.ctx.fillRect(boxX, boxY, 10, 10);
            });
        }
    }

    drawPockets() {
        const layout = this.layout.pockets;
        this.engine.pockets.forEach((pocket, i) => {
            const row = Math.floor(i / layout.cols);
            const col = i % layout.cols;
            const x = layout.x + col * layout.spacingX;
            const y = layout.y + row * layout.spacingY;
            
            const fillRate = pocket.boxes.length / pocket.capacity;
            
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillStyle = this.config.colors.pocket;
            this.ctx.fillRect(x, y, layout.w, layout.h);
            this.ctx.globalAlpha = 1.0;
            
            this.ctx.fillStyle = `rgba(0, 255, 0, 0.5)`;
            this.ctx.fillRect(x, y + layout.h - (layout.h * fillRate), layout.w, layout.h * fillRate);

            if (pocket.isReadyToShip()) {
                 this.ctx.strokeStyle = 'blue';
                 this.ctx.lineWidth = 2;
                 this.ctx.strokeRect(x, y, layout.w, layout.h);
            }

            this.ctx.fillStyle = '#000';
            this.ctx.fillText(pocket.region, x + 5, y + 20);
            this.ctx.fillText(`${pocket.boxes.length}`, x + 5, y + 40);
        });
    }
    
    drawWorkers() {
        const layout = this.layout.workers;
        this.ctx.font = '10px Arial';
        this.engine.workers.forEach((worker, i) => {
            const x = layout.x + i * layout.spacing;
            const y = layout.y;
            this.ctx.fillStyle = worker.isBusy ? '#ff4500' : '#228b22';
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 10, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(worker.role.charAt(0).toUpperCase(), x - 4, y + 4);
        });
        this.ctx.font = '12px Arial'; // Возвращаем стандартный шрифт
    }
}
