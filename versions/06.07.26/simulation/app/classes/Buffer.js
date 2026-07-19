class Buffer {
  constructor(id, maxCapacity) {
    this.id = id;
    this.maxCapacity = maxCapacity;
    this.items = [];
  }

  get count() {
    return this.items.length;
  }

  get fillRate() {
    return this.maxCapacity > 0 ? this.count / this.maxCapacity : 0;
  }

  get isFull() {
    return this.count >= this.maxCapacity;
  }

  add(item) {
    if (this.isFull) return false;
    this.items.push(item);
    return true;
  }

  remove() {
    return this.items.shift() || null;
  }

  clear() {
    this.items = [];
  }
}
