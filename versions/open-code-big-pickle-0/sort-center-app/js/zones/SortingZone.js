class SortingZone {
  constructor() {
    this.loopConveyor = new LoopConveyor(CONFIG.loopConveyor);
    this.exits = [];
    this.buffers = [];
    this.bypassExits = [];
    this.spareExits = [];
  }

  init() {
    const angleStep = (Math.PI * 2) / CONFIG.exits.count;
    const rx = CONFIG.loopConveyor.radiusX + 60;
    const ry = CONFIG.loopConveyor.radiusY + 60;
    const cx = CONFIG.loopConveyor.centerX;
    const cy = CONFIG.loopConveyor.centerY;

    for (let i = 0; i < CONFIG.exits.count; i++) {
      const angle = i * angleStep;
      const x = cx + rx * Math.cos(angle);
      const y = cy + ry * Math.sin(angle);
      const region = CONFIG.regions.find(r => r.exits.includes(i));
      const exit = new Exit(i, region ? region.id : 'spare', x, y);
      this.exits.push(exit);
      this.buffers.push(new Buffer(i, CONFIG.exits.bufferSize));
    }

    for (let i = 0; i < CONFIG.faultTolerance.bypassExits; i++) {
      const angle = (CONFIG.exits.count + i) * angleStep;
      const x = cx + rx * Math.cos(angle);
      const y = cy + ry * Math.sin(angle);
      const exit = new Exit(CONFIG.exits.count + i, 'bypass', x, y);
      exit.isBypass = true;
      this.bypassExits.push(exit);
    }
  }

  addParcel(parcel) {
    const region = CONFIG.regions.find(r => r.id === parcel.regionId);
    if (!region) {
      this.loopConveyor.addParcel(parcel);
      return;
    }
    const availableExits = region.exits
      .filter(idx => !this.buffers[idx].isFull)
      .map(idx => this.exits[idx])
      .filter(e => e.canAccept());
    const exit = availableExits.length > 0
      ? availableExits[Math.floor(Math.random() * availableExits.length)]
      : null;
    if (exit) {
      parcel.assignExit(exit.index);
    } else {
      const bypass = this.bypassExits.find(e => e.canAccept());
      if (bypass) {
        parcel.assignExit(bypass.index);
      } else {
        parcel.assignExit(region.exits[0]);
      }
    }
    this.loopConveyor.addParcel(parcel);
  }

  update(dt) {
    const delivered = this.loopConveyor.advance();
    const dropped = [];

    for (const parcel of delivered) {
      if (parcel.exitAssigned !== null && parcel.exitAssigned < CONFIG.exits.count) {
        const buffer = this.buffers[parcel.exitAssigned];
        if (buffer && !buffer.isFull) {
          buffer.push(parcel);
          dropped.push(parcel);
          continue;
        }
      }
      this.loopConveyor.addParcel(parcel);
    }

    for (const seg of this.loopConveyor.segments) {
      if (seg.isCongested) {
        eventBus.emit('segment:congested', { segmentId: seg.id });
      }
    }

    for (const parcel of this.loopConveyor.segments.flatMap(s => s.parcels)) {
      if (parcel.exitAssigned !== null) {
        const exit = parcel.exitAssigned < CONFIG.exits.count
          ? this.exits[parcel.exitAssigned]
          : null;
        if (!exit) continue;
        const pos = this.loopConveyor.getParcelPosition(parcel);
        const dx = exit.x - pos.x;
        const dy = exit.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40 && !parcel._nearExit) {
          parcel._nearExit = true;
        }
        if (dist < 30) {
          const buffer = parcel.exitAssigned < CONFIG.exits.count
            ? this.buffers[parcel.exitAssigned]
            : null;
          if (buffer && !buffer.isFull) {
            const seg = this.loopConveyor.segments[parcel.conveyorIndex];
            seg.removeParcel(parcel.id);
            buffer.push(parcel);
            dropped.push(parcel);
            eventBus.emit('parcel:dropped', { parcel, exit });
          }
        }
      }
    }

    for (const buffer of this.buffers) {
      if (buffer.load > 0) {
        const exit = this.exits[buffer.exitIndex];
        if (exit && exit.canAccept()) {
          const parcel = buffer.pop();
          if (parcel && exit.dropParcel(parcel)) {
            eventBus.emit('parcel:exited', { parcel, exit });
          }
        }
      }
    }

    return dropped;
  }

  get totalParcels() {
    return this.loopConveyor.totalLoad + this.exits.reduce((s, e) => s + e.load, 0);
  }
}
