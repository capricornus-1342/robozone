class Parcel {
  static nextId = 0;

  constructor(regionId, isFragile = false) {
    this.id = Parcel.nextId++;
    this.regionId = regionId;
    this.isFragile = isFragile;
    this.weight = 0.5 + Math.random() * 5;
    this.sizeCategory = this._determineSizeCategory();
    this.state = 'created';
    this.position = 0;
    this.angle = 0;
    this.conveyorIndex = 0;
    this.enterTime = Date.now();
    this.exitTime = null;
    this.scanned = false;
    this.exitAssigned = null;
    this.bufferEnterTime = null;
  }

  _determineSizeCategory() {
    const r = Math.random();
    if (r < 0.7) return 'standard';
    if (r < 0.9) return 'large';
    return 'fragile';
  }

  get throughputTime() {
    if (!this.exitTime) return null;
    return this.exitTime - this.enterTime;
  }

  markScanned() {
    this.scanned = true;
    this.state = 'scanning';
  }

  assignExit(exitIndex) {
    this.exitAssigned = exitIndex;
    this.state = 'routing';
  }

  markDropped() {
    this.state = 'dropped';
    this.exitTime = Date.now();
  }

  markLoaded() {
    this.state = 'loaded';
  }
}
