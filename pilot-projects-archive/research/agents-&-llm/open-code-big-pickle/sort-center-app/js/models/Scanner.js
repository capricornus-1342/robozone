class Scanner {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.isWorking = true;
    this.hasBackup = CONFIG.faultTolerance.backupScanners > 0;
    this.backupActive = false;
    this.scanTime = CONFIG.inbound.scannerTime;
    this.currentParcel = null;
    this.timeLeft = 0;
    this.totalScanned = 0;
    this.failCount = 0;
  }

  startScan(parcel) {
    if (!this.isWorking) return false;
    this.currentParcel = parcel;
    this.timeLeft = this.scanTime;
    return true;
  }

  update(dt) {
    if (!this.currentParcel || !this.isWorking) return null;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      const scanned = this.currentParcel;
      scanned.markScanned();
      this.totalScanned++;
      this.currentParcel = null;
      return scanned;
    }
    return null;
  }

  fail() {
    this.failCount++;
    if (this.hasBackup && !this.backupActive) {
      this.backupActive = true;
      this.isWorking = true;
      return true;
    }
    this.isWorking = false;
    return false;
  }

  repair() {
    this.isWorking = true;
    this.backupActive = false;
  }

  get utilization() {
    return this.currentParcel !== null ? 1 : 0;
  }
}
