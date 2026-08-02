class Conveyor {
  constructor(id, length, speed) {
    this.id = id;
    this.length = length;
    this.speed = speed;
    this.parcels = [];
    this.isRunning = true;
    this.hasBackupMotor = CONFIG.faultTolerance.backupMotor;
    this.motorActive = true;
    this.backupMotorActive = false;
  }

  addParcel(parcel, position = 0) {
    parcel.position = position;
    parcel.conveyorIndex = this.id;
    this.parcels.push(parcel);
  }

  removeParcel(parcelId) {
    const idx = this.parcels.findIndex(p => p.id === parcelId);
    if (idx !== -1) {
      return this.parcels.splice(idx, 1)[0];
    }
    return null;
  }

  advance() {
    if (!this.isRunning) return;
    const toRemove = [];
    for (const parcel of this.parcels) {
      parcel.position += this.speed * CONFIG.simulation.speedMultiplier;
      if (parcel.position >= this.length) {
        toRemove.push(parcel);
      }
    }
    for (const parcel of toRemove) {
      this.removeParcel(parcel.id);
    }
    return toRemove;
  }

  failMotor() {
    if (this.hasBackupMotor && !this.backupMotorActive) {
      this.backupMotorActive = true;
      this.speed *= 0.6;
      return true;
    }
    this.isRunning = false;
    return false;
  }

  repairMotor() {
    this.motorActive = true;
    this.backupMotorActive = false;
    this.isRunning = true;
    this.speed = CONFIG.loopConveyor.speed;
  }

  get load() {
    return this.parcels.length;
  }

  get isCongested() {
    return this.parcels.length > this.length / CONFIG.loopConveyor.spacing;
  }
}
