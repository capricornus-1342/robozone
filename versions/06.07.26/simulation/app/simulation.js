const Simulation = {
  _nextId: { item: 1, container: 1, pallet: 1, truck: 1 },
  _destWeights: null,
  stats: { items: 0, containers: 0, pallets: 0, trucks: 0, nonsort: 0 },
  reception: null,

  init: function () {
    this._buildWeights(CONFIG.sorting.pockets);
    this._nextId = { item: 1, container: 1, pallet: 1, truck: 1 };
    this.stats = { items: 0, containers: 0, pallets: 0, trucks: 0, nonsort: 0 };
    this.initReception();
  },

  reset: function () {
    this.init();
  },

  initReception: function () {
    var docks = [];
    for (var i = 0; i < CONFIG.reception.docksUnload; i++) {
      docks.push(new Dock(i, 'unload'));
    }
    this.reception = {
      docks: docks,
      buffer: new Buffer('reception-buffer', CONFIG.reception.bufferCapacity),
      findFreeDock: function () {
        for (var j = 0; j < this.docks.length; j++) {
          if (!this.docks[j].isBusy) return this.docks[j];
        }
        return null;
      }
    };
  },

  _buildWeights: function (count) {
    const s = 1.1;
    const raw = [];
    let sum = 0;
    for (let i = 1; i <= count; i++) {
      const w = 1 / Math.pow(i, s);
      raw.push(w);
      sum += w;
    }
    let cum = 0;
    this._destWeights = raw.map(function (w) {
      cum += w / sum;
      return cum;
    });
  },

  _pickDestination: function () {
    const r = Math.random();
    for (let i = 0; i < this._destWeights.length; i++) {
      if (r <= this._destWeights[i]) return i + 1;
    }
    return this._destWeights.length;
  },

  generateItem: function () {
    const id = this._nextId.item++;
    const destId = this._pickDestination();
    const isNonsort = Math.random() < CONFIG.items.nonsortRate;
    const type = isNonsort ? 'nonsort' : 'normal';
    const weight = 0.1 + Math.random() * 9.9;
    const size = isNonsort ? 320 + Math.random() * 200 : 50 + Math.random() * 270;

    this.stats.items++;
    if (isNonsort) this.stats.nonsort++;

    return new Item(id, destId, type, Math.round(weight * 10) / 10, Math.round(size));
  },

  generateContainer: function () {
    const id = this._nextId.container++;
    const count = 25 + Math.floor(Math.random() * 5);
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(this.generateItem());
    }
    this.stats.containers++;
    return new Container(id, items);
  },

  generatePallet: function () {
    const id = this._nextId.pallet++;
    const count = CONFIG.containers.palletInSlots;
    const containers = [];
    for (let i = 0; i < count; i++) {
      containers.push(this.generateContainer());
    }
    this.stats.pallets++;
    return new Pallet(id, containers, false);
  },

  generateTruck: function (arrivalTime) {
    const id = this._nextId.truck++;
    const count = 3 + Math.floor(Math.random() * 3);
    const pallets = [];
    for (let i = 0; i < count; i++) {
      pallets.push(this.generatePallet());
    }
    this.stats.trucks++;
    return new Truck(id, 'incoming', pallets, arrivalTime);
  },
};
