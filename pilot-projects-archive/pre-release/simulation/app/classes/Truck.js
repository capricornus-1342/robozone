class Truck {
  constructor(id, type, load, arrivalTime) {
    this.id = id;
    this.type = type;
    this.load = load || [];
    this.arrivalTime = arrivalTime || 0;
  }

  get palletCount() {
    return this.load.length;
  }

  get totalItems() {
    return this.load.reduce(function (sum, pallet) {
      return sum + pallet.totalItems;
    }, 0);
  }
}
