class Dock {
  constructor(id, type, x, y) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.isOccupied = false;
    this.parcels = [];
    this.loadTime = type === 'inbound' ? CONFIG.inbound.scannerTime : CONFIG.outbound.loadTime;
    this.currentLoad = null;
    this.timeLeft = 0;
  }

  startLoad(parcel) {
    if (this.isOccupied) return false;
    this.isOccupied = true;
    this.currentLoad = parcel;
    this.timeLeft = this.loadTime;
    return true;
  }

  update(dt) {
    if (!this.isOccupied || !this.currentLoad) return null;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      const loaded = this.currentLoad;
      this.parcels.push(loaded);
      loaded.markLoaded();
      this.currentLoad = null;
      this.isOccupied = false;
      return loaded;
    }
    return null;
  }

  get utilization() {
    return this.isOccupied ? 1 : 0;
  }
}
