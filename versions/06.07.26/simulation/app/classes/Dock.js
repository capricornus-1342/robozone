class Dock {
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this.currentTruck = null;
    this.queue = [];
  }

  get isBusy() {
    return this.currentTruck !== null;
  }

  assignTruck(truck) {
    if (this.isBusy) {
      this.queue.push(truck);
      return false;
    }
    this.currentTruck = truck;
    return true;
  }

  free() {
    const truck = this.currentTruck;
    this.currentTruck = null;
    return truck;
  }
}
