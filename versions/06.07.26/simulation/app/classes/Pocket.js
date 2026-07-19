class Pocket {
  constructor(id, capacity, threshold) {
    this.id = id;
    this.capacity = capacity;
    this.threshold = threshold;
    this.items = [];
  }

  get count() {
    return this.items.length;
  }

  get fillRate() {
    return this.capacity > 0 ? this.count / this.capacity : 0;
  }

  get isFull() {
    return this.count >= this.capacity;
  }

  get isReadyToShip() {
    return this.count >= this.threshold;
  }

  addItem(item) {
    if (this.isFull) return false;
    this.items.push(item);
    return true;
  }

  clear() {
    var items = this.items;
    this.items = [];
    return items;
  }
}
