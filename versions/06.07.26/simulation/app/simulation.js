const Simulation = {
  _nextId: { item: 1, container: 1, pallet: 1, truck: 1 },
  _destWeights: null,
  stats: { items: 0, containers: 0, pallets: 0, trucks: 0, nonsort: 0 },
  reception: null,
  depalletizing: null,
  sorting: null,
  packing: null,
  shipping: null,
  adjustments: null,
  warnings: [],

  init: function () {
    this._buildWeights(CONFIG.sorting.pockets);
    this._nextId = { item: 1, container: 1, pallet: 1, truck: 1 };
    this.stats = { items: 0, containers: 0, pallets: 0, trucks: 0, nonsort: 0 };
    this.initReception();
    this.initDepalletizing();
    this.initSorting();
    this.initPacking();
    this.initShipping();
    this.initAdjustments();
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

  initDepalletizing: function () {
    var stations = [];
    for (var i = 0; i < CONFIG.depalletizing.stations; i++) {
      stations.push({ id: i, busy: false, currentPallet: null });
    }
    this.depalletizing = {
      stations: stations,
      infeedQueue: [],
      emptyContainerBuffer: 0,
      containerReuseCount: 0,
      containerScrapCount: 0,
      newContainerCount: 0,
      findFreeStation: function () {
        for (var j = 0; j < this.stations.length; j++) {
          if (!this.stations[j].busy) return this.stations[j];
        }
        return null;
      }
    };
  },

  initSorting: function () {
    var pockets = [];
    for (var i = 0; i < CONFIG.sorting.pockets; i++) {
      pockets.push(new Pocket(i, CONFIG.sorting.pocketCapacity, CONFIG.sorting.pocketThreshold));
    }
    this.sorting = {
      pockets: pockets,
      conveyorItems: [],
      conveyor: new ConveyorBelt(0, CONFIG.sorting.sorterCount * CONFIG.sorting.sorterThroughput),
      processedCount: 0,
      nonsortCount: 0,
      scannedOkCount: 0,
      scannedFailCount: 0,
      getPocketAngle: function (pocketIndex) {
        var perBlock = CONFIG.sorting.pocketsPerBlock;
        var blockIndex = Math.floor(pocketIndex / perBlock);
        var topStart = 25 * Math.PI / 180;
        var topEnd = 155 * Math.PI / 180;
        var bottomStart = 205 * Math.PI / 180;
        var bottomEnd = 335 * Math.PI / 180;
        if (blockIndex < 20) {
          var t = blockIndex / 19;
          return topStart + t * (topEnd - topStart);
        } else {
          var t = (blockIndex - 20) / 19;
          return bottomStart + t * (bottomEnd - bottomStart);
        }
      },
      getInfeedAngle: function () {
        return Math.PI;
      },
      getClockwiseDistance: function (fromAngle, toAngle) {
        if (toAngle >= fromAngle) return toAngle - fromAngle;
        return (2 * Math.PI - fromAngle) + toAngle;
      },
      getConveyorItemAngle: function (destPocketIndex, progress) {
        var startAngle = this.getInfeedAngle();
        var destAngle = this.getPocketAngle(destPocketIndex);
        var dist = this.getClockwiseDistance(startAngle, destAngle);
        var angle = startAngle + dist * progress;
        if (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
        return angle;
      }
    };
  },

  initPacking: function () {
    this.packing = {
      sealedCount: 0,
      palletCount: 0,
      lastProcessedPocket: 0
    };
  },

  initShipping: function () {
    var docks = [];
    for (var i = 0; i < CONFIG.shipping.docksLoad; i++) {
      docks.push({ id: i, status: 'free', currentTruck: null });
    }
    this.shipping = {
      buffer: [],
      docks: docks,
      dispatchedCount: 0,
      findFreeDock: function () {
        for (var j = 0; j < this.docks.length; j++) {
          if (this.docks[j].status === 'free') return this.docks[j];
        }
        return null;
      }
    };
  },

  initAdjustments: function () {
    this.adjustments = {
      unloadSpeedFactor: 1.0,
      sortSpeedFactor: 1.0,
      conveyorSpeedFactor: 1.0,
      pocketThresholdFactor: 1.0,
      unloadPaused: false
    };
    this.warnings = [];
  },

  balanceSystem: function (logFn) {
    var adj = this.adjustments;
    if (!adj) return;
    var warns = [];
    var buf = this.reception ? this.reception.buffer : null;
    var dep = this.depalletizing;
    var sort = this.sorting;
    var ship = this.shipping;

    if (buf) {
      var bufFill = buf.fillRate;
      if (bufFill > 0.9) {
        if (!adj.unloadPaused) warns.push('Буфер приемки >90% — разгрузка приостановлена');
        adj.unloadPaused = true;
        adj.unloadSpeedFactor = Math.max(0.3, adj.unloadSpeedFactor * 0.9);
      } else if (bufFill > 0.8) {
        if (adj.unloadPaused) warns.push('Буфер приемки <90% — разгрузка возобновлена');
        adj.unloadPaused = false;
        adj.unloadSpeedFactor = Math.max(0.3, adj.unloadSpeedFactor * 0.9);
        if (bufFill > 0.8) warns.push('Буфер >80% — скорость разгрузки снижена');
      } else if (bufFill < 0.3) {
        adj.unloadSpeedFactor = Math.min(1.0, adj.unloadSpeedFactor * 1.1);
        warns.push('Буфер <30% — скорость разгрузки увеличена');
        adj.unloadPaused = false;
      } else {
        adj.unloadSpeedFactor = Math.min(1.0, adj.unloadSpeedFactor * 1.02);
        adj.unloadPaused = false;
      }
    }

    if (sort && sort.pockets) {
      var totalFill = 0;
      var maxFill = 0;
      var over95 = 0;
      for (var pi = 0; pi < sort.pockets.length; pi++) {
        var fr = sort.pockets[pi].fillRate;
        totalFill += fr;
        if (fr > maxFill) maxFill = fr;
        if (fr > 0.95) over95++;
      }
      var avgFill = totalFill / sort.pockets.length;

      if (maxFill > 0.95) {
        adj.sortSpeedFactor = Math.max(0.3, adj.sortSpeedFactor * 0.85);
        adj.conveyorSpeedFactor = Math.max(0.2, adj.conveyorSpeedFactor * 0.8);
        warns.push('Карманы >95% (' + over95 + ' шт) — скорость сортировки и конвейера снижена');
      } else if (avgFill > 0.8) {
        adj.sortSpeedFactor = Math.max(0.3, adj.sortSpeedFactor * 0.9);
        adj.pocketThresholdFactor = Math.max(0.5, adj.pocketThresholdFactor * 0.9);
        warns.push('Средняя заполненность карманов >80% — скорость сортировки снижена');
      } else if (avgFill < 0.4 && adj.sortSpeedFactor < 1.0) {
        adj.sortSpeedFactor = Math.min(1.0, adj.sortSpeedFactor * 1.1);
        adj.conveyorSpeedFactor = Math.min(1.0, adj.conveyorSpeedFactor * 1.05);
        warns.push('Карманы освобождаются — скорость восстанавливается');
      }
    }

    if (dep && dep.infeedQueue.length > 200 && adj.sortSpeedFactor < 0.7) {
      adj.unloadSpeedFactor = Math.max(0.3, adj.unloadSpeedFactor * 0.9);
      warns.push('Каскад: очередь инфида >200 + сортировка замедлена → разгрузка снижена');
    }

    if (buf && buf.fillRate > 0.85 && dep && dep.infeedQueue.length > 150) {
      warns.push('Критично: буфер >85% и инфид >150 — цепочка заблокирована');
    }

    this.warnings = warns;
    if (logFn && warns.length > 0) {
      for (var wi = 0; wi < warns.length; wi++) {
        logFn(warns[wi]);
      }
    }
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
