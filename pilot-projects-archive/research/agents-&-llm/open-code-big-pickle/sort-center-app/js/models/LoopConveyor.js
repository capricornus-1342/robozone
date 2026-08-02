class LoopConveyor {
  constructor(config) {
    this.segments = [];
    this.config = config;
    this._initSegments();
    this.isRunning = true;
    this.totalLength = this._calculateLength();
  }

  _initSegments() {
    const segCount = CONFIG.loopConveyor.segments;
    for (let i = 0; i < segCount; i++) {
      const angle = (i / segCount) * Math.PI * 2;
      const x = CONFIG.loopConveyor.centerX + CONFIG.loopConveyor.radiusX * Math.cos(angle);
      const y = CONFIG.loopConveyor.centerY + CONFIG.loopConveyor.radiusY * Math.sin(angle);
      this.segments.push(new Conveyor(i, 50, CONFIG.loopConveyor.speed));
    }
  }

  _calculateLength() {
    return this.segments.reduce((sum, seg) => sum + seg.length, 0);
  }

  addParcel(parcel) {
    this.segments[0].addParcel(parcel);
    parcel.conveyorIndex = 0;
    parcel.position = 0;
  }

  advance() {
    if (!this.isRunning) return [];
    const delivered = [];
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      const leaving = seg.advance();
      for (const parcel of leaving) {
        if (i < this.segments.length - 1) {
          this.segments[i + 1].addParcel(parcel, 0);
          parcel.conveyorIndex = i + 1;
        } else {
          delivered.push(parcel);
        }
      }
    }
    const angleStep = (Math.PI * 2) / CONFIG.loopConveyor.segments;
    for (const seg of this.segments) {
      for (const parcel of seg.parcels) {
        const idx = this.segments.indexOf(seg);
        const baseAngle = idx * angleStep;
        const fraction = parcel.position / seg.length;
        parcel.angle = baseAngle + fraction * angleStep;
      }
    }
    return delivered;
  }

  getParcelPosition(parcel) {
    const seg = this.segments[parcel.conveyorIndex];
    if (!seg) return { x: 0, y: 0 };
    const idx = this.segments.indexOf(seg);
    const totalSegs = this.segments.length;
    const angleStep = (Math.PI * 2) / totalSegs;
    const baseAngle = idx * angleStep;
    const fraction = seg.parcels.includes(parcel)
      ? parcel.position / seg.length
      : 0;
    const angle = baseAngle + fraction * angleStep;
    const cx = CONFIG.loopConveyor.centerX;
    const cy = CONFIG.loopConveyor.centerY;
    const rx = CONFIG.loopConveyor.radiusX + 20;
    const ry = CONFIG.loopConveyor.radiusY + 20;
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
      angle,
    };
  }

  failSegment(index) {
    if (index >= 0 && index < this.segments.length) {
      return this.segments[index].failMotor();
    }
    return false;
  }

  get totalLoad() {
    return this.segments.reduce((sum, seg) => sum + seg.load, 0);
  }

  get isCongested() {
    return this.segments.some(seg => seg.isCongested);
  }
}
