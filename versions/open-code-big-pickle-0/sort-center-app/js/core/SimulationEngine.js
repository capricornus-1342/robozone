class SimulationEngine {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.tickInterval = CONFIG.simulation.tickInterval;
    this.tickCount = 0;
    this.startTime = null;
    this.elapsedTime = 0;
    this._timer = null;
    this._lastTick = 0;

    this.inboundZone = new InboundZone();
    this.sortingZone = new SortingZone();
    this.outboundZone = new OutboundZone();
    this.wcs = new WCS();
    this.dashboard = new Dashboard();
  }

  init() {
    this.inboundZone.init();
    this.sortingZone.init();
    this.outboundZone.init();
    this.wcs.connect(this.sortingZone);
    this.wcs.init();
    this.dashboard.init();
    eventBus.emit('sim:initialized', { engine: this });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this._lastTick = performance.now();
    this._tick();
    eventBus.emit('sim:started', { engine: this });
  }

  pause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      eventBus.emit('sim:paused', { engine: this });
    } else {
      this._lastTick = performance.now();
      eventBus.emit('sim:resumed', { engine: this });
    }
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this._timer) {
      cancelAnimationFrame(this._timer);
      this._timer = null;
    }
    eventBus.emit('sim:stopped', { engine: this });
  }

  reset() {
    this.stop();
    Parcel.nextId = 0;
    this.tickCount = 0;
    this.elapsedTime = 0;
    this.startTime = null;
    this.inboundZone = new InboundZone();
    this.sortingZone = new SortingZone();
    this.outboundZone = new OutboundZone();
    this.wcs = new WCS();
    this.dashboard = new Dashboard();
    this.init();
    eventBus.emit('sim:reset', { engine: this });
  }

  _tick() {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = this.isPaused ? 0 : (now - this._lastTick);
    this._lastTick = now;

    if (!this.isPaused) {
      this.tickCount++;
      this.elapsedTime += dt;
      this._update(dt);
    }

    this._timer = requestAnimationFrame(() => this._tick());
  }

  _update(dt) {
    const parcelsIn = this.inboundZone.update(dt);
    for (const parcel of parcelsIn) {
      this.sortingZone.addParcel(parcel);
      eventBus.emit('parcel:entered', { parcel });
    }

    const delivered = this.sortingZone.update(dt);
    for (const parcel of delivered) {
      this.outboundZone.addParcel(parcel);
      eventBus.emit('parcel:delivered', { parcel });
    }

    this.outboundZone.update(dt);
    this.wcs.update(dt);
    this.dashboard.update();
    eventBus.emit('sim:tick', { engine: this, dt, tick: this.tickCount });
  }

  get stats() {
    return {
      tickCount: this.tickCount,
      elapsedTime: this.elapsedTime,
      parcelsProcessed: this.outboundZone.totalProcessed,
      parcelsInSystem: this.sortingZone.totalParcels,
      avgThroughputTime: this.dashboard.avgThroughputTime,
      congestion: this.sortingZone.loopConveyor.isCongested,
    };
  }
}
