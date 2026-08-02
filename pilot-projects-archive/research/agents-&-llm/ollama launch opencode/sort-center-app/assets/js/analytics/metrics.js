/**
 * Metrics collector — tracks KPIs in real time, stores timeseries samples
 * for charts.
 */
export class MetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.counters = {
      received: 0,
      inducted: 0,
      sorted: 0,
      loaded: 0,
      departed: 0,
      reroutes: 0,
      rerouteFailed: 0,
      chuteJams: 0,
      noChute: 0,
      fragileDamages: 0,
      truckDepartures: 0,
      loopFull: 0
    };
    this.cycleSamples = []; // {t, value} for cycle time
    this.throughputSeries = []; // {t, value} per minute
    this.chuteUtilSeries = []; // {t, value} avg
    this.lastThroughputTickTime = 0;
    this.lastThroughputCount = 0;
    this.cycleTimeSum = 0;
    this.cycleTimeCount = 0;
    this.bufferFullness = [];
  }

  onParcelReceived(p) { this.counters.received++; }
  onParcelInducted(p) { this.counters.inducted++; }
  onParcelSorted(p) {
    this.counters.sorted++;
    if (p.enteredSystemAt != null) {
      const t = p.sortedAt - p.enteredSystemAt;
      this.cycleTimeSum += t;
      this.cycleTimeCount++;
      this.cycleSamples.push({ t: p.sortedAt, value: t });
      if (this.cycleSamples.length > 600) this.cycleSamples.shift();
    }
  }
  onParcelLoaded(p) { this.counters.loaded++; }
  onTruckDeparted(t) {
    this.counters.departed++;
    this.counters.truckDepartures++;
  }
  onReroute() { this.counters.reroutes++; }
  onRerouteFailed() { this.counters.rerouteFailed++; }
  onChuteJam() { this.counters.chuteJams++; }
  onNoChuteAvailable() { this.counters.noChute++; }
  onFragileDamage() { this.counters.fragileDamages++; }
  onLoopFull() { this.counters.loopFull++; }

  /** Compute throughput over the last 60s of sim time. */
  sampleThroughput(simTime, sortedCount) {
    // bucket every 5 sim-seconds
    const last = this.throughputSeries[this.throughputSeries.length - 1];
    if (last && simTime - last.t < 5) {
      last.value = sortedCount - this.lastThroughputCount;
    } else {
      this.throughputSeries.push({ t: simTime, value: sortedCount - this.lastThroughputCount });
      this.lastThroughputCount = sortedCount;
      if (this.throughputSeries.length > 240) this.throughputSeries.shift();
    }
  }

  avgCycleTime() { return this.cycleTimeCount ? this.cycleTimeSum / this.cycleTimeCount : 0; }
  get sorted() { return this.counters.sorted; }
}
