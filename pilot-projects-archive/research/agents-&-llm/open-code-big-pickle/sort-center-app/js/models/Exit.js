class Exit {
  constructor(index, regionId, x, y) {
    this.index = index;
    this.regionId = regionId;
    this.x = x;
    this.y = y;
    this.parcels = [];
    this.capacity = CONFIG.exits.capacity;
    this.isBlocked = false;
    this.isBypass = false;
    this.pushSpeed = CONFIG.exits.pushSpeed;
    this.fragilePushSpeed = CONFIG.exits.fragilePushSpeed;
  }

  canAccept() {
    return this.parcels.length < this.capacity && !this.isBlocked;
  }

  dropParcel(parcel) {
    if (!this.canAccept()) return false;
    this.parcels.push(parcel);
    parcel.markDropped();
    return true;
  }

  removeParcel(parcelId) {
    const idx = this.parcels.findIndex(p => p.id === parcelId);
    if (idx !== -1) return this.parcels.splice(idx, 1)[0];
    return null;
  }

  block() {
    this.isBlocked = true;
  }

  unblock() {
    this.isBlocked = false;
  }

  get load() {
    return this.parcels.length;
  }

  get isFull() {
    return this.parcels.length >= this.capacity;
  }

  get utilization() {
    return this.parcels.length / this.capacity;
  }
}
