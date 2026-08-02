class Container {
  constructor(id, items) {
    this.id = id;
    this.items = items || [];
    this.maxCapacity = 27;
    this.maxWeight = 30;
    this.status = 'sealed';
    this.isReusable = true;
  }

  get itemCount() {
    return this.items.length;
  }

  get totalWeight() {
    return this.items.reduce(function (sum, item) {
      return sum + item.weight;
    }, 0);
  }
}
