import { poisson, generateId, randomElement } from '../utils.js';
import { Truck, Worker, Dock, Pocket, Buffer, ConveyorBelt, Box, Pallet, Item } from './index.js';

export class SimulationEngine {
    constructor(config, stats) {
        this.baseConfig = { ...config };
        this.dynamicConfig = { ...config };
        this.stats = stats;
        this.reset();
    }

    reset() {
        this.time = 0;
        this.eventQueue = [];
        this.isRunning = false;
        this.dynamicConfig = { ...this.baseConfig };

        this.stats.reset();

        this.docks = [];
        for (let i = 0; i < this.dynamicConfig.numUnloadDocks; i++) this.docks.push(new Dock({ id: `unload_${i}`, type: 'unload' }));
        for (let i = 0; i < this.dynamicConfig.numLoadDocks; i++) this.docks.push(new Dock({ id: `load_${i}`, type: 'load' }));

        this.pockets = [];
        for (let i = 0; i < this.dynamicConfig.numPockets; i++) {
            this.pockets.push(new Pocket({
                id: `pocket_${i}`,
                region: `R${i}`,
                capacity: this.dynamicConfig.pocketCapacity,
                threshold: this.dynamicConfig.pocketShipmentThreshold
            }));
        }

        this.buffers = [
            new Buffer({ id: 'intermediate', maxCapacity: this.dynamicConfig.intermediateBufferCapacity }),
            new Buffer({ id: 'reserve', maxCapacity: this.dynamicConfig.reserveBufferCapacity })
        ];

        this.conveyors = [
            new ConveyorBelt({ id: 'main_sorter', speed: this.dynamicConfig.sortingConveyorSpeed })
        ];
        
        this.workers = [];
        for (let i = 0; i < this.dynamicConfig.numAutoUnloadWorkers + this.dynamicConfig.numManualUnloadWorkers; i++) this.workers.push(new Worker({ role: 'unloader' }));
        for (let i = 0; i < this.dynamicConfig.numDepalletizerOperators; i++) this.workers.push(new Worker({ role: 'depalletizer' }));
        for (let i = 0; i < this.dynamicConfig.numLoadWorkers; i++) this.workers.push(new Worker({ role: 'loader' }));

        this.scheduleEvent('TRUCK_ARRIVAL', {}, this.getNextArrivalTime());
        this.scheduleEvent('PROCESS_INTERMEDIATE_BUFFER', {}, 2);
        this.scheduleEvent('BALANCE_CHECK', {}, this.dynamicConfig.balanceCheckInterval);
    }

    scheduleEvent(type, details, delay) {
        const event = { type, details, time: this.time + delay };
        this.eventQueue.push(event);
        this.eventQueue.sort((a, b) => a.time - b.time);
    }
    
    getNextArrivalTime() {
        const avgBoxesPerTruck = 50;
        const trucksPerHour = this.dynamicConfig.incomingFlowIntensity / avgBoxesPerTruck;
        const meanInterval = 3600 / trucksPerHour;
        return Math.max(1, poisson(meanInterval));
    }

    update(deltaTime) {
        if (!this.isRunning && deltaTime > 0) this.isRunning = true;
        if(!this.isRunning) return;
        
        const endTime = this.time + deltaTime;
        
        while (this.eventQueue.length > 0 && this.eventQueue[0].time <= endTime) {
            const event = this.eventQueue.shift();
            this.time = event.time;
            this.processEvent(event);
        }

        this.time = endTime;
        this.processConveyors(deltaTime);
    }
    
    processConveyors(deltaTime) {
        const sorter = this.conveyors.find(c => c.id === 'main_sorter');
        sorter.speed = this.dynamicConfig.sortingConveyorSpeed;
        const processed = sorter.process(deltaTime);
        
        processed.forEach(box => {
            const pocket = this.pockets.find(p => p.region === box.destRegion);
            if (pocket && pocket.addBox(box)) {
                 this.stats.trackBoxDeparture(box.id, this.time);
                 if (pocket.isReadyToShip()) {
                     this.scheduleEvent('POCKET_READY', { pocketId: pocket.id }, 1);
                 }
            } else {
                this.buffers.find(b => b.id === 'reserve').add(box);
                if(pocket) this.stats.logEvent('Buffer', 'reserve', 'overflow_add', {boxId: box.id, simTime: this.time});
            }
        });
    }

    processEvent(event) {
        const handlers = {
            'TRUCK_ARRIVAL': this.handleTruckArrival.bind(this),
            'UNLOAD_START': this.handleUnloadStart.bind(this),
            'UNLOAD_COMPLETE': this.handleUnloadComplete.bind(this),
            'PALLET_UNPACK_COMPLETE': this.handlePalletUnpackComplete.bind(this),
            'PROCESS_INTERMEDIATE_BUFFER': this.handleProcessIntermediateBuffer.bind(this),
            'POCKET_READY': this.handlePocketReady.bind(this),
            'LOAD_COMPLETE': this.handleLoadComplete.bind(this),
            'BALANCE_CHECK': this.handleBalanceCheck.bind(this),
        };
        if(handlers[event.type]) {
            handlers[event.type](event.details);
        }
    }
    
    handleBalanceCheck() {
        const intermediateBuffer = this.buffers.find(b => b.id === 'intermediate');
        const bufferFillRate = intermediateBuffer.items.length / intermediateBuffer.maxCapacity;

        if (bufferFillRate > 0.8) {
            if(this.dynamicConfig.incomingFlowIntensity === this.baseConfig.incomingFlowIntensity) {
                this.dynamicConfig.incomingFlowIntensity *= 0.5;
                this.stats.logEvent('WMS', 'Balance', 'slow_down_unload', { simTime: this.time, reason: `Buffer high: ${(bufferFillRate * 100).toFixed(1)}%` });
            }
        } else if (bufferFillRate < 0.3) {
            if(this.dynamicConfig.incomingFlowIntensity !== this.baseConfig.incomingFlowIntensity) {
                this.dynamicConfig.incomingFlowIntensity = this.baseConfig.incomingFlowIntensity;
                this.stats.logEvent('WMS', 'Balance', 'restore_unload_speed', { simTime: this.time, reason: `Buffer low: ${(bufferFillRate * 100).toFixed(1)}%` });
            }
        }
        
        const pocketFillRates = this.pockets.map(p => p.boxes.length / p.capacity);
        const maxPocketFillRate = Math.max(0, ...pocketFillRates);
        
        if (maxPocketFillRate > 0.9 && this.pockets[0].threshold === this.baseConfig.pocketShipmentThreshold) {
            this.pockets.forEach(p => p.threshold = this.baseConfig.pocketShipmentThreshold * 0.75);
            this.stats.logEvent('WMS', 'Balance', 'lower_shipment_threshold', { simTime: this.time, reason: `Max pocket high: ${(maxPocketFillRate * 100).toFixed(1)}%` });
        } else if (maxPocketFillRate < 0.5 && this.pockets[0].threshold !== this.baseConfig.pocketShipmentThreshold) {
            this.pockets.forEach(p => p.threshold = this.baseConfig.pocketShipmentThreshold);
        }

        this.scheduleEvent('BALANCE_CHECK', {}, this.dynamicConfig.balanceCheckInterval);
    }
    
    handleTruckArrival() {
        const truck = new Truck({ type: 'incoming', config: this.dynamicConfig });
        truck.arrivalTime = this.time;
        this.stats.logEvent('Truck', truck.id, 'arrival', {simTime: this.time});

        const freeDock = this.docks.find(d => d.type === 'unload' && !d.isBusy);
        if (freeDock) {
            freeDock.assignTruck(truck);
            this.stats.logEvent('Dock', freeDock.id, 'assign_truck', {truckId: truck.id, simTime: this.time});
            this.scheduleEvent('UNLOAD_START', { dockId: freeDock.id }, 10);
        } else {
            const unloadDocks = this.docks.filter(d => d.type === 'unload');
            const bestDock = unloadDocks.reduce((best, current) => current.queue.length < best.queue.length ? current : best);
            bestDock.assignTruck(truck);
            this.stats.logEvent('Dock', bestDock.id, 'queue_truck', {truckId: truck.id, simTime: this.time});
        }
        
        this.scheduleEvent('TRUCK_ARRIVAL', {}, this.getNextArrivalTime());
    }

    handleUnloadStart({ dockId }) {
        const dock = this.docks.find(d => d.id === dockId);
        if (!dock || !dock.currentTruck) return;

        const unloader = this.workers.find(w => w.role === 'unloader' && !w.isBusy);
        if (!unloader) {
            this.scheduleEvent('UNLOAD_START', { dockId }, 30); // Нет рабочих, ждем
            return;
        }

        const truck = dock.currentTruck;
        const intermediateBuffer = this.buffers.find(b => b.id === 'intermediate');
        if (intermediateBuffer.isFull()) {
             this.scheduleEvent('UNLOAD_START', { dockId }, 60); // Буфер полон, ждем
             return;
        }

        unloader.assignTask({ type: 'unload', truckId: truck.id, dockId });
        const isAuto = Math.random() < this.dynamicConfig.autoUnloadShare;
        const itemsToUnload = truck.load.splice(0); // Забираем весь груз

        let unloadTime = 0;
        const itemCount = itemsToUnload.length;
        if (isAuto) {
            unloadTime = itemCount * (3600 / this.dynamicConfig.autoUnloadSpeed);
        } else {
            unloadTime = itemCount * (3600 / this.dynamicConfig.manualUnloadSpeedPerWorker);
        }

        itemsToUnload.forEach(item => intermediateBuffer.add(item));
        
        this.scheduleEvent('UNLOAD_COMPLETE', { dockId, truckId: truck.id, workerId: unloader.id }, unloadTime);
    }
    
    handleUnloadComplete({ dockId, workerId }) {
        const worker = this.workers.find(w => w.id === workerId);
        if (worker) worker.completeTask();

        const dock = this.docks.find(d => d.id === dockId);
        if (dock) {
            const { freedTruck, nextTruck } = dock.free();
            this.stats.logEvent('Dock', dock.id, 'free', {truckId: freedTruck.id, simTime: this.time});
            if(nextTruck) {
                this.stats.logEvent('Dock', dock.id, 'assign_truck_from_queue', {truckId: nextTruck.id, simTime: this.time});
                this.scheduleEvent('UNLOAD_START', { dockId: dock.id }, 10);
            }
        }
    }

    handleProcessIntermediateBuffer() {
        const intermediateBuffer = this.buffers.find(b => b.id === 'intermediate');
        const sorter = this.conveyors.find(c => c.id === 'main_sorter');
        
        if (intermediateBuffer.items.length > 0 && !sorter.isFull()) {
            const item = intermediateBuffer.remove();

            if (item instanceof Box) {
                this.stats.trackBoxArrival(item.id, this.time);
                sorter.add(item);
            } else if (item instanceof Pallet) {
                const depalletizer = this.workers.find(w => w.role === 'depalletizer' && !w.isBusy);
                if (depalletizer) {
                    depalletizer.assignTask({ type: 'unpack', pallet: item });
                    const processingTime = this.dynamicConfig.palletProcessingTime;
                    this.scheduleEvent('PALLET_UNPACK_COMPLETE', { workerId: depalletizer.id }, processingTime);
                } else {
                    intermediateBuffer.items.unshift(item);
                }
            } else if (item instanceof Item) {
                const box = new Box({ destRegion: item.destRegion, weight: item.weight });
                this.stats.trackBoxArrival(box.id, this.time);
                sorter.add(box);
            }
        }

        this.scheduleEvent('PROCESS_INTERMEDIATE_BUFFER', {}, 1); // Проверяем каждую секунду
    }

    handlePalletUnpackComplete({ workerId }) {
        const worker = this.workers.find(w => w.id === workerId);
        if (!worker || !worker.currentTask) return;

        const { pallet } = worker.currentTask;
        const boxes = pallet.unpack();
        const sorter = this.conveyors.find(c => c.id === 'main_sorter');

        boxes.forEach(box => {
            if (!sorter.isFull()) {
                this.stats.trackBoxArrival(box.id, this.time);
                sorter.add(box);
            } else {
                this.buffers.find(b => b.id === 'intermediate').add(box);
            }
        });
        
        worker.completeTask();
        this.stats.incrementPallets();
    }
    
    handlePocketReady({ pocketId }) {
         const pocket = this.pockets.find(p => p.id === pocketId);
         if (!pocket || !pocket.isReadyToShip()) return;
         
         const freeLoadDock = this.docks.find(d => d.type === 'load' && !d.isBusy);
         if (freeLoadDock) {
             const loader = this.workers.find(w => w.role === 'loader' && !w.isBusy);
             if (!loader) {
                 this.scheduleEvent('POCKET_READY', { pocketId }, 30);
                 return;
             }

             const shipment = pocket.getShipment();
             const outgoingTruck = new Truck({type: 'outgoing'});
             outgoingTruck.destRegion = pocket.region;
             outgoingTruck.loadBoxes(shipment);
             freeLoadDock.assignTruck(outgoingTruck);
             loader.assignTask({ type: 'load', truckId: outgoingTruck.id, dockId: freeLoadDock.id });

             this.stats.logEvent('Pocket', pocket.id, 'shipment_created', {truckId: outgoingTruck.id, numBoxes: shipment.length, simTime: this.time});
             
             const loadTime = shipment.length * this.dynamicConfig.truckLoadTimePerBox;
             this.scheduleEvent('LOAD_COMPLETE', { dockId: freeLoadDock.id, workerId: loader.id }, loadTime);
         } else {
             this.scheduleEvent('POCKET_READY', { pocketId }, 60);
         }
    }

    handleLoadComplete({ dockId, workerId }) {
        const dock = this.docks.find(d => d.id === dockId);
        const worker = this.workers.find(w => w.id === workerId);
        
        if (worker) worker.completeTask();

        if (dock && dock.currentTruck) {
            const { freedTruck } = dock.free();
            this.stats.logEvent('Truck', freedTruck.id, 'departure', {simTime: this.time, region: freedTruck.destRegion});
        }
    }
}
