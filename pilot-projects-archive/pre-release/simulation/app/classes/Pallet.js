class Pallet {
  constructor(id, containers, isOutbound) {
    this.id = id;
    this.containers = containers || [];
    this.maxSlots = isOutbound ? 16 : 20;
    this.isOutbound = isOutbound || false;
  }

  get containerCount() {
    return this.containers.length;
  }

  get totalItems() {
    return this.containers.reduce(function (sum, c) {
      return sum + c.itemCount;
    }, 0);
  }
}
