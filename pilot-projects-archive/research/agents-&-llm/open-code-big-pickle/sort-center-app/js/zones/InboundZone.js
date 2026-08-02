class InboundZone {
  constructor() {
    this.docks = [];
    this.scanners = [];
    this.buffer = [];
    this.arrivalInterval = 60000 / CONFIG.inbound.parcelsPerMinute;
    this.timeSinceLastArrival = 0;
    this.totalArrived = 0;
  }

  init() {
    const dockSpacing = 150;
    const startX = 50;
    const y = 150;
    for (let i = 0; i < CONFIG.inbound.dockCount; i++) {
      this.docks.push(new Dock(i, 'inbound', startX + i * dockSpacing, y));
    }
    this.scanners.push(new Scanner(0, 100, 250));
    this.scanners.push(new Scanner(1, 200, 250));
  }

  update(dt) {
    const produced = [];
    this.timeSinceLastArrival += dt * CONFIG.simulation.speedMultiplier;

    for (const scanner of this.scanners) {
      const scanned = scanner.update(dt);
      if (scanned) {
        produced.push(scanned);
      }
    }

    while (this.timeSinceLastArrival >= this.arrivalInterval && this.totalArrived < CONFIG.simulation.maxParcels) {
      this.timeSinceLastArrival -= this.arrivalInterval;
      const regionIdx = Math.floor(Math.random() * CONFIG.regions.length);
      const region = CONFIG.regions[regionIdx];
      const isFragile = Math.random() < 0.1;
      const parcel = new Parcel(region.id, isFragile);

      const availableScanner = this.scanners.find(s => s.isWorking && s.currentParcel === null);
      if (availableScanner) {
        availableScanner.startScan(parcel);
      } else {
        this.buffer.push(parcel);
      }
      this.totalArrived++;
      eventBus.emit('parcel:arrived', { parcel });
    }

    for (let i = this.buffer.length - 1; i >= 0; i--) {
      const availableScanner = this.scanners.find(s => s.isWorking && s.currentParcel === null);
      if (availableScanner) {
        availableScanner.startScan(this.buffer[i]);
        this.buffer.splice(i, 1);
      }
    }

    return produced;
  }

  get totalInBuffer() {
    return this.buffer.length;
  }
}
