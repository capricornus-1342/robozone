class Buffer {
  constructor(exitIndex, maxSize) {
    this.exitIndex = exitIndex;
    this.maxSize = maxSize;
    this.parcels = [];
  }

  push(parcel) {
    if (this.parcels.length >= this.maxSize) return false;
    this.parcels.push(parcel);
    parcel.bufferEnterTime = Date.now();
    return true;
  }

  pop() {
    return this.parcels.shift();
  }

  peek() {
    return this.parcels[0] || null;
  }

  get load() {
    return this.parcels.length;
  }

  get isFull() {
    return this.parcels.length >= this.maxSize;
  }

  get utilization() {
    return this.parcels.length / this.maxSize;
  }
}
