const StatisticsCollector = {
  _snapshotInterval: 5,
  _prev: null,
  history: [],

  init: function () {
    this._prev = {
      simTime: 0,
      items: 0,
      containers: 0,
      pallets: 0,
      sealed: 0,
      palletOut: 0,
      sorted: 0,
      dispatched: 0,
    };
    this.history = [];
  },

  takeSnapshot: function (simTime) {
    var s = Simulation.stats;
    var pack = Simulation.packing;
    var sort = Simulation.sorting;
    var ship = Simulation.shipping;
    var buf = Simulation.reception ? Simulation.reception.buffer : null;
    var dep = Simulation.depalletizing;

    var dt = (simTime - this._prev.simTime) / 60;
    if (dt < 0.01) dt = 0.01;

    var di = s.items - this._prev.items;
    var dc = s.containers - this._prev.containers;
    var dp = s.pallets - this._prev.pallets;
    var dse = pack ? pack.sealedCount - this._prev.sealed : 0;
    var dpo = pack ? pack.palletCount - this._prev.palletOut : 0;
    var dso = sort ? sort.processedCount - this._prev.sorted : 0;
    var ddi = ship ? ship.dispatchedCount - this._prev.dispatched : 0;

    var snap = {
      time: simTime,
      itemsPerHour: Math.round(di / dt),
      containersPerHour: Math.round(dc / dt),
      palletsPerHour: Math.round(dp / dt),
      sealedPerHour: Math.round(dse / dt),
      sortedPerHour: Math.round(dso / dt),
      dispatched: ddi,
      bufferFill: buf ? buf.fillRate : 0,
      infeedLength: dep ? dep.infeedQueue.length : 0,
      shipBufferLength: ship ? ship.buffer.length : 0,
      avgPocketFill: 0,
      maxPocketFill: 0,
      loadingDocksBusy: 0,
      unloadDocksBusy: 0,
      depStationBusy: 0,
    };

    if (sort && sort.pockets) {
      var total = 0, max = 0;
      for (var i = 0; i < sort.pockets.length; i++) {
        var f = sort.pockets[i].fillRate;
        total += f;
        if (f > max) max = f;
      }
      snap.avgPocketFill = total / sort.pockets.length;
      snap.maxPocketFill = max;
    }

    if (ship && ship.docks) {
      var busy = 0;
      for (var i = 0; i < ship.docks.length; i++) {
        if (ship.docks[i].status === 'loading') busy++;
      }
      snap.loadingDocksBusy = busy;
    }

    if (Simulation.reception && Simulation.reception.docks) {
      var busy = 0;
      for (var i = 0; i < Simulation.reception.docks.length; i++) {
        if (Simulation.reception.docks[i].isBusy) busy++;
      }
      snap.unloadDocksBusy = busy;
    }

    if (dep && dep.stations) {
      var busy = 0;
      for (var i = 0; i < dep.stations.length; i++) {
        if (dep.stations[i].busy) busy++;
      }
      snap.depStationBusy = busy;
    }

    this.history.push(snap);
    if (this.history.length > 120) {
      this.history.splice(0, this.history.length - 120);
    }

    this._prev.simTime = simTime;
    this._prev.items = s.items;
    this._prev.containers = s.containers;
    this._prev.pallets = s.pallets;
    if (pack) { this._prev.sealed = pack.sealedCount; this._prev.palletOut = pack.palletCount; }
    if (sort) { this._prev.sorted = sort.processedCount; }
    if (ship) { this._prev.dispatched = ship.dispatchedCount; }
  },

  getLatest: function () {
    if (this.history.length === 0) return null;
    return this.history[this.history.length - 1];
  },

  exportJSON: function () {
    return JSON.stringify({ config: CONFIG, history: this.history }, null, 2);
  },

  exportCSV: function () {
    var keys = ['time','itemsPerHour','containersPerHour','palletsPerHour','sealedPerHour','sortedPerHour','bufferFill','infeedLength','shipBufferLength','avgPocketFill','maxPocketFill','loadingDocksBusy','unloadDocksBusy','depStationBusy'];
    var lines = [keys.join(',')];
    for (var i = 0; i < this.history.length; i++) {
      var h = this.history[i];
      lines.push(keys.map(function (k) { return h[k]; }).join(','));
    }
    return lines.join('\n');
  },

  exportFile: function () {
    var json = this.exportJSON();
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'simulation-export.json';
    a.click();
    URL.revokeObjectURL(url);
  },
};
