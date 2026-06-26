class Dashboard {
  constructor() {
    this.metrics = {
      totalArrived: 0,
      totalProcessed: 0,
      totalDropped: 0,
      avgThroughputTime: 0,
      currentInSystem: 0,
      exitUtilization: [],
      congestionAlerts: 0,
      serverStatus: 'active',
      throughputPerMinute: 0,
    };
    this._throughputTimes = [];
    this._processedTimestamps = [];
  }

  init() {
    eventBus.on('parcel:arrived', () => { this.metrics.totalArrived++; });
    eventBus.on('parcel:dropped', () => { this.metrics.totalDropped++; });
    eventBus.on('parcel:loaded', (data) => {
      this.metrics.totalProcessed++;
      this._processedTimestamps.push(Date.now());
      if (data.parcel.throughputTime) {
        this._throughputTimes.push(data.parcel.throughputTime);
      }
    });
    eventBus.on('wcs:alert', () => { this.metrics.congestionAlerts++; });
  }

  update() {
    if (this._throughputTimes.length > 0) {
      const recent = this._throughputTimes.slice(-50);
      this.metrics.avgThroughputTime = recent.reduce((s, t) => s + t, 0) / recent.length;
    }

    const now = Date.now();
    const cutoff = now - 60000;
    while (this._processedTimestamps.length > 0 && this._processedTimestamps[0] < cutoff) {
      this._processedTimestamps.shift();
    }
    this.metrics.throughputPerMinute = this._processedTimestamps.length;

    this.metrics.currentInSystem = this.metrics.totalArrived - this.metrics.totalProcessed;
  }

  get avgThroughputTime() {
    return this.metrics.avgThroughputTime;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
