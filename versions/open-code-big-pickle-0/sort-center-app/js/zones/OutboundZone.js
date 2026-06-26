class OutboundZone {
  constructor() {
    this.docks = [];
    this.parcelQueue = [];
    this.totalProcessed = 0;
    this.regionGroups = {};
  }

  init() {
    const dockSpacing = 150;
    const startX = 850;
    const y = 550;
    for (let i = 0; i < CONFIG.outbound.dockCount; i++) {
      this.docks.push(new Dock(i, 'outbound', startX + i * dockSpacing, y));
    }
    for (const region of CONFIG.regions) {
      this.regionGroups[region.id] = [];
    }
  }

  addParcel(parcel) {
    this.parcelQueue.push(parcel);
    if (this.regionGroups[parcel.regionId]) {
      this.regionGroups[parcel.regionId].push(parcel);
    }
  }

  update(dt) {
    for (const dock of this.docks) {
      if (!dock.isOccupied && this.parcelQueue.length > 0) {
        const parcel = this.parcelQueue.shift();
        dock.startLoad(parcel);
      }
      const loaded = dock.update(dt);
      if (loaded) {
        this.totalProcessed++;
        eventBus.emit('parcel:loaded', { parcel: loaded, dock });
      }
    }
  }

  get queueLength() {
    return this.parcelQueue.length;
  }
}
