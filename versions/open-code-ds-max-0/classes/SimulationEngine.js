import { CONFIG } from '../config.js';
import { Truck, resetTruckId } from './Truck.js';
import { Box, resetBoxId } from './Box.js';
import { Pallet, resetPalletId } from './Pallet.js';
import { Item, resetItemId } from './Item.js';
import { Worker, resetWorkerId } from './Worker.js';
import { ConveyorBelt, resetConveyorBeltId } from './ConveyorBelt.js';
import { Dock, resetDockId } from './Dock.js';
import { Pocket, resetPocketId } from './Pocket.js';
import { Buffer, resetBufferId } from './Buffer.js';
import { formatTime, poissonInterval, generateRegions } from '../utils.js';

export class SimulationEngine {
    constructor(config = CONFIG) {
        this.time = 0;
        this.speed = 1;
        this.isRunning = false;
        this.eventQueue = [];
        this.config = config;
        this.totalBoxesProcessed = 0;
        this.totalBoxesSorted = 0;
        this.totalBoxesShipped = 0;
        this.totalTrucksArrived = 0;
        this.totalTrucksShipped = 0;
        this.docks = [];
        this.conveyors = [];
        this.pockets = [];
        this.buffers = {};
        this.workers = [];
        this.callbacks = {};
        this.regions = generateRegions(config.pockets);
        this.init();
    }

    init() {
        for (let i = 0; i < this.config.unloadDocks; i++) {
            this.docks.push(new Dock('unload'));
        }
        for (let i = 0; i < this.config.loadDocks; i++) {
            this.docks.push(new Dock('load'));
        }

        this.conveyors.push(new ConveyorBelt(this.config.conveyorSpeed, 500));

        for (let i = 0; i < this.config.pockets; i++) {
            const region = this.regions[i % this.regions.length];
            this.pockets.push(new Pocket(region, this.config.pocketCapacity, this.config.pocketThreshold));
        }

        this.buffers.main = new Buffer(this.config.bufferCapacity);
        this.buffers.reserve = new Buffer(this.config.reserveBufferCapacity);
        this.buffers.preSort = new Buffer(1000);

        for (let i = 0; i < this.config.autoUnloadWorkers; i++) {
            this.workers.push(new Worker('unloader_auto', this.config.autoUnloadSpeed));
        }
        for (let i = 0; i < this.config.manualUnloadWorkers; i++) {
            this.workers.push(new Worker('unloader_manual', this.config.manualUnloadSpeed));
        }
        for (let i = 0; i < this.config.depalletizerCount; i++) {
            this.workers.push(new Worker('depalletizer', 600));
        }
        for (let i = 0; i < this.config.loaderCount; i++) {
            this.workers.push(new Worker('loader', 360));
        }
        for (let i = 0; i < this.config.sorterCount; i++) {
            this.workers.push(new Worker('sorter_manual', 500));
        }
        this.workers.push(new Worker('dispatcher', 0));
    }

    resetAllIds() {
        resetTruckId();
        resetBoxId();
        resetPalletId();
        resetItemId();
        resetWorkerId();
        resetConveyorBeltId();
        resetDockId();
        resetPocketId();
        resetBufferId();
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            try { this.callbacks[event](data); } catch (e) { console.warn('Callback error:', e); }
        }
    }

    scheduleEvent(event, delay) {
        const eventTime = this.time + Math.max(0, delay);
        const idx = this.eventQueue.findIndex(e => e.time > eventTime);
        if (idx === -1) {
            this.eventQueue.push({ ...event, time: eventTime });
        } else {
            this.eventQueue.splice(idx, 0, { ...event, time: eventTime });
        }
    }

    step() {
        if (this.eventQueue.length === 0) return false;
        const event = this.eventQueue.shift();
        this.time = event.time;
        this.processEvent(event);
        return true;
    }

    processEvent(event) {
        this.logEvent(event);

        switch (event.type) {
            case 'ARRIVAL_TRUCK':
                this.handleArrival(event);
                break;
            case 'UNLOAD_COMPLETE':
                this.handleUnloadComplete(event);
                break;
            case 'PALLET_UNPACK_COMPLETE':
                this.handlePalletUnpackComplete(event);
                break;
            case 'SORTING_STEP':
                this.handleSortingStep(event);
                break;
            case 'POCKET_THRESHOLD_REACHED':
                this.handlePocketThreshold(event);
                break;
            case 'SHIPMENT_LOAD_COMPLETE':
                this.handleShipmentLoadComplete(event);
                break;
            case 'BALANCE_CHECK':
                this.balanceSystem();
                this.scheduleEvent({ type: 'BALANCE_CHECK' }, this.config.balanceCheckInterval);
                break;
            case 'GENERATE_INBOUND':
                this.generateInboundTruck();
                break;
            case 'SORTING_CYCLE':
                this.sortingCycle();
                break;
            case 'LOAD_DOCK_CHECK':
                this.checkLoadDockQueue(event);
                break;
        }

        this.emit('statsUpdate', this.getStats());
    }

    logEvent(event) {
        if (!this._stats) return;
        this._stats.logEvent({
            timestamp: this.time,
            stage: event.stage || event.type || '',
            entityId: event.entityId || '',
            action: event.type || '',
            details: event.details || ''
        });
    }

    setStatsCollector(collector) {
        this._stats = collector;
    }

    generateInboundTruck() {
        const truck = new Truck('incoming', 500 + Math.random() * 500, null);

        const loadType = Math.random();
        const numItems = randomInt(50, 250);

        if (loadType < 0.35) {
            for (let i = 0; i < numItems; i++) {
                const region = this.regions[Math.floor(Math.random() * this.regions.length)];
                truck.load.push(new Box(randomInt(1, 25), region));
            }
        } else if (loadType < 0.65) {
            const numPallets = Math.floor(3 + Math.random() * 8);
            const palletRegions = this.regions.slice(0, 6);
            for (let i = 0; i < numPallets; i++) {
                truck.load.push(new Pallet(randomInt(10, 50), palletRegions));
            }
        } else {
            const numBoxes = Math.floor(numItems * 0.6);
            for (let i = 0; i < numBoxes; i++) {
                const region = this.regions[Math.floor(Math.random() * this.regions.length)];
                truck.load.push(new Box(randomInt(1, 25), region));
            }
            const numPallets = Math.floor(2 + Math.random() * 4);
            const palletRegions = this.regions.slice(0, 6);
            for (let i = 0; i < numPallets; i++) {
                truck.load.push(new Pallet(randomInt(10, 30), palletRegions));
            }
            const numItems2 = Math.floor(numItems * 0.1);
            for (let i = 0; i < numItems2; i++) {
                const region = this.regions[Math.floor(Math.random() * this.regions.length)];
                truck.load.push(new Item(randomInt(1, 10), region, Math.random() < 0.3));
            }
        }

        truck.arrivalTime = this.time;
        this.totalTrucksArrived++;

        this.scheduleEvent({
            type: 'ARRIVAL_TRUCK',
            truck,
            entityId: truck.id,
            stage: 'arrival',
            details: `Truck ${truck.id} arrived with ${truck.load.length} items`
        }, 0);

        const loadCount = truck.load.length;
        const meanInterval = 3600000 / this.config.inboundIntensity * (loadCount / 150);
        const nextInterval = poissonInterval(meanInterval);
        this.scheduleEvent({ type: 'GENERATE_INBOUND' }, Math.max(1000, nextInterval));

        this.emit('truckArrived', { truck, time: this.time });
    }

    handleArrival(event) {
        const { truck } = event;
        const unloadDocks = this.docks.filter(d => d.type === 'unload');
        const freeDock = unloadDocks.find(d => !d.busy);

        if (freeDock) {
            freeDock.assignTruck(truck);
            this.startUnloading(truck, freeDock);
        } else {
            const dock = unloadDocks.reduce((a, b) => a.queue.length <= b.queue.length ? a : b);
            dock.queue.push(truck);
            this.emit('truckQueued', { truck, dock, time: this.time });
        }
    }

    startUnloading(truck, dock) {
        let totalTime = 0;
        let boxCount = 0;
        let palletCount = 0;
        let itemCount = 0;

        for (const item of truck.load) {
            if (item instanceof Pallet) {
                totalTime += this.config.palletUnloadTime;
                palletCount++;
            } else if (item instanceof Box) {
                totalTime += this.config.autoUnloadTime;
                boxCount++;
            } else if (item instanceof Item) {
                totalTime += this.config.itemUnloadTime;
                itemCount++;
            }
        }

        const autoUnloaders = this.workers.filter(w => w.role === 'unloader_auto' && !w.busy);
        const manualUnloaders = this.workers.filter(w => w.role === 'unloader_manual' && !w.busy);
        const available = [...autoUnloaders, ...manualUnloaders];
        const workersToAssign = Math.min(available.length, 4);

        for (let i = 0; i < workersToAssign; i++) {
            available[i].assignTask({ type: 'unload', truck, dock, startTime: this.time });
        }

        const timeReduction = 1 + workersToAssign * 0.4;

        this.scheduleEvent({
            type: 'UNLOAD_COMPLETE',
            truck,
            dock,
            workers: available.slice(0, workersToAssign),
            entityId: truck.id,
            stage: 'unloading',
            details: `${boxCount} boxes, ${palletCount} pallets, ${itemCount} items, ${workersToAssign} workers`
        }, totalTime / timeReduction);
    }

    handleUnloadComplete(event) {
        const { truck, dock, workers } = event;
        const items = truck.unload();

        for (const item of items) {
            if (item instanceof Pallet) {
                this.scheduleEvent({
                    type: 'PALLET_UNPACK_COMPLETE',
                    pallet: item,
                    entityId: item.id,
                    stage: 'depalletizing',
                    details: `Pallet ${item.id} with ${item.numBoxes} boxes`
                }, this.config.depalletizeTime);
            } else {
                const added = this.buffers.main.add(item);
                if (!added) {
                    this.buffers.reserve.add(item);
                }
                this.totalBoxesProcessed++;
            }
        }

        for (const w of (workers || [])) {
            if (w) w.completeTask();
        }
        const totalInWorkers = this.workers.filter(w =>
            w.role === 'unloader_auto' || w.role === 'unloader_manual'
        );
        for (const w of totalInWorkers) {
            if (w.currentTask && w.currentTask.truck === truck) {
                w.completeTask();
            }
        }

        dock.totalProcessed += items.length;

        const nextTruck = dock.free();
        if (nextTruck) {
            this.startUnloading(nextTruck, dock);
        }

        this.emit('unloadComplete', { truck, dock, time: this.time });
    }

    handlePalletUnpackComplete(event) {
        const { pallet } = event;
        const boxes = pallet.unpack();

        const depalletizers = this.workers.filter(w => w.role === 'depalletizer' && !w.busy);
        if (depalletizers.length > 0) {
            depalletizers[0].assignTask({ type: 'depalletize', pallet });
            for (const box of boxes) {
                const added = this.buffers.main.add(box);
                if (!added) this.buffers.reserve.add(box);
                this.totalBoxesProcessed++;
            }
            depalletizers[0].completeTask();
        } else {
            for (const box of boxes) {
                const added = this.buffers.main.add(box);
                if (!added) this.buffers.reserve.add(box);
                this.totalBoxesProcessed++;
            }
        }

        this.emit('palletUnpacked', { pallet, boxes: boxes.length, time: this.time });
    }

    sortingCycle() {
        const conveyor = this.conveyors[0];
        const ratePerSecond = this.config.conveyorSpeed / 3600;
        const boxesToSort = Math.min(Math.ceil(ratePerSecond * 1), this.buffers.main.items.length);

        for (let i = 0; i < boxesToSort; i++) {
            const item = this.buffers.main.remove();
            if (!item) break;
            conveyor.addBox(item);
            this.scheduleEvent({
                type: 'SORTING_STEP',
                box: item,
                entityId: (item.id || ''),
                stage: 'sorting',
                details: `Item ${item.id} -> ${item.destRegion}`
            }, i * 5);
        }

        this.scheduleEvent({ type: 'SORTING_CYCLE' }, 1000);
    }

    handleSortingStep(event) {
        const { box } = event;

        if (!box || (!(box instanceof Box) && !(box instanceof Item))) return;

        let pocket = this.pockets.find(p => p.region === box.destRegion);
        if (!pocket) {
            pocket = this.pockets[Math.floor(Math.random() * this.pockets.length)];
        }

        const sorter = this.workers.find(w => w.role === 'sorter_manual' && !w.busy);
        if (sorter) {
            sorter.assignTask({ type: 'sort', box });
            sorter.totalProcessed++;
            sorter.completeTask();
        }

        const added = pocket.addBox(box);
        if (!added) {
            this.buffers.reserve.add(box);
            this.emit('pocketFull', { pocket, box, time: this.time });
        } else {
            this.totalBoxesSorted++;
        }

        if (pocket.isReadyToShip()) {
            this.scheduleEvent({
                type: 'POCKET_THRESHOLD_REACHED',
                pocket,
                entityId: pocket.id,
                stage: 'accumulation',
                details: `Pocket ${pocket.id} (${pocket.region}) ready with ${pocket.boxes.length} boxes`
            }, 100);
        }

        this.emit('boxSorted', { box, pocket, time: this.time });
    }

    handlePocketThreshold(event) {
        const { pocket } = event;

        if (pocket.boxes.length < pocket.threshold) return;

        const loadDocks = this.docks.filter(d => d.type === 'load');
        let loadDock = loadDocks.find(d => !d.busy);

        if (loadDock) {
            const truck = new Truck('outgoing', this.config.pocketCapacity, pocket.region);
            loadDock.assignTruck(truck);
            this.startLoading(truck, loadDock, pocket);
        } else {
            loadDock = loadDocks.reduce((a, b) => a.queue.length <= b.queue.length ? a : b);
            const deferredTruck = { pocket, region: pocket.region };
            loadDock.queue.push(deferredTruck);
            this.scheduleEvent({
                type: 'LOAD_DOCK_CHECK',
                dock: loadDock,
                entityId: loadDock.id,
                stage: 'loading'
            }, 5000);
        }
    }

    checkLoadDockQueue(event) {
        const { dock } = event;
        if (dock.busy) return;

        const loadDocks = this.docks.filter(d => d.type === 'load');
        for (const ld of loadDocks) {
            while (ld.queue.length > 0 && !ld.busy) {
                const entry = ld.queue.shift();
                if (entry.pocket) {
                    if (entry.pocket.boxes.length >= entry.pocket.threshold) {
                        const truck = new Truck('outgoing', this.config.pocketCapacity, entry.region);
                        ld.assignTruck(truck);
                        this.startLoading(truck, ld, entry.pocket);
                    } else if (entry.pocket.boxes.length > 0) {
                        ld.queue.unshift(entry);
                        break;
                    }
                }
            }
        }
    }

    startLoading(truck, dock, pocket) {
        const boxes = pocket.clear();
        if (boxes.length === 0) {
            dock.free();
            return;
        }

        const loaders = this.workers.filter(w => w.role === 'loader' && !w.busy);
        const workersToAssign = Math.min(loaders.length, 3);

        for (let i = 0; i < workersToAssign; i++) {
            loaders[i].assignTask({ type: 'load', truck, dock, pocket, startTime: this.time });
        }

        const totalLoadTime = boxes.length * this.config.loadTime;
        const timeReduction = 1 + workersToAssign * 0.5;

        this.scheduleEvent({
            type: 'SHIPMENT_LOAD_COMPLETE',
            truck,
            dock,
            pocket,
            boxes,
            workers: loaders.slice(0, workersToAssign),
            entityId: truck.id,
            stage: 'loading',
            details: `${boxes.length} boxes to region ${pocket.region}, ${workersToAssign} workers`
        }, totalLoadTime / timeReduction);

        truck.load(boxes);

        this.emit('loadingStarted', { truck, dock, pocket, boxes: boxes.length, time: this.time });
    }

    handleShipmentLoadComplete(event) {
        const { truck, dock, boxes, workers } = event;

        const processed = truck.depart();
        this.totalBoxesShipped += processed.length;
        this.totalTrucksShipped++;

        for (const w of (workers || [])) {
            if (w) w.completeTask();
        }
        const allLoaders = this.workers.filter(w => w.role === 'loader');
        for (const w of allLoaders) {
            if (w.currentTask && w.currentTask.truck === truck) {
                w.completeTask();
            }
        }
        dock.totalProcessed += processed.length;

        const nextEntry = dock.free();
        if (nextEntry && nextEntry.pocket) {
            if (nextEntry.pocket.boxes.length >= nextEntry.pocket.threshold) {
                const nextTruck = new Truck('outgoing', this.config.pocketCapacity, nextEntry.region);
                dock.assignTruck(nextTruck);
                this.startLoading(nextTruck, dock, nextEntry.pocket);
            } else if (nextEntry.pocket.boxes.length > 0) {
                dock.queue.unshift(nextEntry);
            }
        } else if (nextEntry && nextEntry.id) {
            dock.currentTruck = nextEntry;
        }

        this.emit('truckDeparted', { truck, boxesCount: processed.length, time: this.time });
    }

    balanceSystem() {
        const mainFill = this.buffers.main.fillLevel;
        const reserveFill = this.buffers.reserve.fillLevel;
        const totalPocketBoxes = this.pockets.reduce((s, p) => s + p.boxes.length, 0);
        const pocketFill = totalPocketBoxes / (this.pockets.length * this.config.pocketCapacity);

        const decisions = [];

        if (mainFill > 0.8) {
            this.conveyors[0].speed = Math.min(this.config.conveyorSpeed * 1.3, 60000);
            decisions.push('Increased conveyor speed (main buffer > 80%)');
        } else if (mainFill < 0.3) {
            this.conveyors[0].speed = this.config.conveyorSpeed;
            decisions.push('Normalized conveyor speed');
        }

        if (reserveFill > 0.7) {
            this.conveyors[0].speed = Math.min(this.conveyors[0].speed * 1.2, 70000);
            decisions.push('Boosted conveyor speed (reserve buffer > 70%)');
        }

        if (pocketFill > 0.8) {
            const newThreshold = Math.max(100, this.config.pocketThreshold - 50);
            if (newThreshold !== this.config.pocketThreshold) {
                this.config.pocketThreshold = newThreshold;
                decisions.push(`Lowered pocket threshold to ${newThreshold}`);
            }
        } else if (pocketFill < 0.3) {
            const newThreshold = Math.min(this.config.pocketCapacity, this.config.pocketThreshold + 50);
            if (newThreshold !== this.config.pocketThreshold) {
                this.config.pocketThreshold = newThreshold;
                decisions.push(`Raised pocket threshold to ${newThreshold}`);
            }
        }

        for (const pocket of this.pockets) {
            pocket.threshold = this.config.pocketThreshold;
        }

        this.emit('balanceUpdate', {
            mainFill,
            reserveFill,
            pocketFill,
            conveyorSpeed: this.conveyors[0].speed,
            decisions,
            time: this.time
        });
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        this.scheduleEvent({ type: 'GENERATE_INBOUND' }, 500);
        this.scheduleEvent({ type: 'SORTING_CYCLE' }, 1000);
        this.scheduleEvent({ type: 'BALANCE_CHECK' }, this.config.balanceCheckInterval);

        this.emit('statusChange', 'running');
    }

    pause() {
        this.isRunning = false;
        this.emit('statusChange', 'paused');
    }

    reset() {
        this.isRunning = false;
        this.time = 0;
        this.eventQueue = [];
        this.totalBoxesProcessed = 0;
        this.totalBoxesSorted = 0;
        this.totalBoxesShipped = 0;
        this.totalTrucksArrived = 0;
        this.totalTrucksShipped = 0;
        this.docks = [];
        this.conveyors = [];
        this.pockets = [];
        this.buffers = {};
        this.workers = [];
        this._stats = null;
        this.resetAllIds();
        this.init();
        this.emit('statusChange', 'reset');
    }

    getStats() {
        const unloadDocks = this.docks.filter(d => d.type === 'unload');
        const loadDocks = this.docks.filter(d => d.type === 'load');

        return {
            time: this.time,
            timeFormatted: formatTime(this.time),
            totalBoxesProcessed: this.totalBoxesProcessed,
            totalBoxesSorted: this.totalBoxesSorted,
            totalBoxesShipped: this.totalBoxesShipped,
            totalTrucksArrived: this.totalTrucksArrived,
            totalTrucksShipped: this.totalTrucksShipped,
            mainBufferFill: this.buffers.main ? this.buffers.main.fillLevel : 0,
            mainBufferCount: this.buffers.main ? this.buffers.main.items.length : 0,
            reserveBufferFill: this.buffers.reserve ? this.buffers.reserve.fillLevel : 0,
            reserveBufferCount: this.buffers.reserve ? this.buffers.reserve.items.length : 0,
            pocketStats: this.pockets.map(p => ({
                id: p.id,
                region: p.region,
                count: p.boxes.length,
                capacity: p.capacity,
                fillPercent: (p.boxes.length / p.capacity * 100).toFixed(1),
                ready: p.isReadyToShip()
            })),
            dockUtilization: {
                unload: {
                    busy: unloadDocks.filter(d => d.busy).length,
                    total: unloadDocks.length,
                    queueTotal: unloadDocks.reduce((s, d) => s + d.queue.length, 0)
                },
                load: {
                    busy: loadDocks.filter(d => d.busy).length,
                    total: loadDocks.length,
                    queueTotal: loadDocks.reduce((s, d) => s + d.queue.length, 0)
                }
            },
            workersAvailable: this.workers.filter(w => !w.busy).length,
            workersTotal: this.workers.length,
            conveyorBuffer: this.conveyors.reduce((s, c) => s + c.buffer.length, 0),
            pocketReadyCount: this.pockets.filter(p => p.isReadyToShip()).length,
            eventsQueued: this.eventQueue.length
        };
    }

    run() {
        if (!this.isRunning) return;

        const stepsPerFrame = Math.max(1, Math.floor(this.speed));
        let stepsTaken = 0;
        for (let i = 0; i < stepsPerFrame; i++) {
            if (!this.step()) break;
            stepsTaken++;
        }

        if (stepsTaken > 0) {
            this.emit('frameUpdate', this.getStats());
        }

        requestAnimationFrame(() => this.run());
    }
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
