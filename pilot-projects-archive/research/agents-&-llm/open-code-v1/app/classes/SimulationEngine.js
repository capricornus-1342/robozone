class SimulationEngine {
    constructor(config, state, callbacks) {
        this.time = 0;
        this.speed = 1;
        this.isRunning = false;
        this.eventQueue = [];
        this.config = config;
        this.state = state;
        this.onLog = callbacks.onLog || (() => {});
        this.onUpdate = callbacks.onUpdate || (() => {});
        this.nextDockIndex = 0;
        this.lastFrameTime = 0;
        this.accumulator = 0;
    }

    scheduleEvent(event, delay) {
        const eventTime = this.time + delay;
        this.eventQueue.push({ ...event, time: eventTime });
        this.eventQueue.sort((a, b) => a.time - b.time);
    }

    step() {
        if (this.eventQueue.length === 0) return false;
        const event = this.eventQueue.shift();
        this.time = event.time;
        this.processEvent(event);
        return true;
    }

    processEvent(event) {
        switch (event.type) {
            case 'ARRIVAL_TRUCK':
                this.handleArrival(event);
                break;
            case 'UNLOAD_COMPLETE':
                this.handleUnloadComplete(event);
                break;
            case 'CONVEYOR_FEED':
                this.handleConveyorFeed(event);
                break;
        }
    }

    handleArrival(event) {
        this.state.truckCounter++;
        const truckId = this.state.truckCounter;
        const numBoxes = 20 + Math.floor(Math.random() * 81);
        const truck = new Truck(numBoxes);
        truck.arrivalTime = this.time;

        const startIdx = this.nextDockIndex;
        let assigned = false;
        for (let attempt = 0; attempt < this.config.numUnloadDocks; attempt++) {
            const idx = (startIdx + attempt) % this.config.numUnloadDocks;
            if (!this.state.dockOccupied[idx]) {
                this.state.dockOccupied[idx] = true;
                this.state.truckIds[idx] = truckId;
                this.state.currentTrucks[idx] = truck;
                this.nextDockIndex = (idx + 1) % this.config.numUnloadDocks;
                assigned = true;
                this.state.totalArrived++;
                this.state.totalBoxesArrived += numBoxes;

                const unloadDelay = 1.5 + Math.random() * 2.5;
                this.scheduleEvent({
                    type: 'UNLOAD_COMPLETE',
                    dockIndex: idx,
                    truckId,
                    boxesCount: numBoxes,
                }, unloadDelay);

                this.onLog(`🚛 Грузовик #${truckId} (${numBoxes} коробок) → док ${idx + 1} [t=${this.time.toFixed(1)}с] (разгрузка ${unloadDelay.toFixed(1)}с). Прибыло грузовиков: ${this.state.totalArrived}, коробок: ${this.state.totalBoxesArrived}`);
                break;
            }
        }

        if (!assigned) {
            this.state.totalArrived++;
            this.state.totalBoxesArrived += numBoxes;
            this.onLog(`🚛 Грузовик #${truckId} (${numBoxes} коробок) → все доки заняты, в очередь [t=${this.time.toFixed(1)}с]. Прибыло грузовиков: ${this.state.totalArrived}, коробок: ${this.state.totalBoxesArrived}`);
        }

        const nextDelay = 0.8 + Math.random() * 2.2;
        this.scheduleEvent({ type: 'ARRIVAL_TRUCK' }, nextDelay);
    }

    handleUnloadComplete(event) {
        const { dockIndex, truckId, boxesCount } = event;
        const freeSpace = this.config.bufferCapacity - this.state.bufferCount;

        if (freeSpace <= 0) {
            this.onLog(`⏳ Разгрузка #${truckId} ожидает — буфер переполнен [t=${this.time.toFixed(1)}с]`);
            this.scheduleEvent({ type: 'UNLOAD_COMPLETE', dockIndex, truckId, boxesCount }, 1.0 + Math.random());
            return;
        }

        const added = Math.min(boxesCount, freeSpace);
        this.state.bufferCount += added;
        this.state.totalUnloaded += added;
        this.state.dockOccupied[dockIndex] = false;
        this.state.truckIds[dockIndex] = null;
        this.state.currentTrucks[dockIndex] = null;

        const partial = added < boxesCount ? ` (из ${boxesCount})` : '';
        this.onLog(`📦 Разгрузка #${truckId} завершена в доке ${dockIndex + 1} [t=${this.time.toFixed(1)}с]. +${added} коробок${partial} в буфер (всего в буфере: ${this.state.bufferCount}, всего разгружено: ${this.state.totalUnloaded})`);
    }

    handleConveyorFeed() {
        const toMove = Math.min(this.state.bufferCount, 10 + Math.floor(Math.random() * 16));

        if (toMove > 0) {
            this.state.bufferCount -= toMove;
            const numPockets = this.state.pockets ? this.state.pockets.length : 1;
            for (let i = 0; i < toMove; i++) {
                this.state.conveyorDots.push({
                    progress: 0,
                    speed: 0.12 + Math.random() * 0.08,
                    destPocket: Math.floor(Math.random() * numPockets),
                });
            }
        }

        this.scheduleEvent({ type: 'CONVEYOR_FEED' }, 0.3 + Math.random() * 0.3);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        if (this.eventQueue.length === 0) {
            this.scheduleEvent({ type: 'ARRIVAL_TRUCK' }, 1.0);
            this.scheduleEvent({ type: 'CONVEYOR_FEED' }, 0.5);
        }

        this.lastFrameTime = performance.now();
        this.accumulator = 0;
        this.onLog(`▶ Симуляция запущена [t=${this.time.toFixed(1)}с]`);
        this.loop();
    }

    pause() {
        this.isRunning = false;
        this.onLog(`⏸ Симуляция приостановлена [t=${this.time.toFixed(1)}с]`);
    }

    loop() {
        if (!this.isRunning) return;

        const now = performance.now();
        const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
        this.lastFrameTime = now;

        this.accumulator += dt * this.speed;

        while (this.accumulator >= 0.01 && this.eventQueue.length > 0) {
            const nextEvent = this.eventQueue[0];
            const simDt = nextEvent.time - this.time;
            if (simDt <= this.accumulator) {
                this.accumulator -= simDt;
                this.step();
            } else {
                break;
            }
        }

        this.onUpdate(dt * this.speed);
        requestAnimationFrame(() => this.loop());
    }

    reset() {
        this.isRunning = false;
        this.time = 0;
        this.eventQueue = [];
        this.accumulator = 0;
        this.nextDockIndex = 0;
    }
}
