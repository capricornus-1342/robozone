class WCS {
  constructor() {
    this.serverActive = true;
    this.backupServerActive = false;
    this.failoverActive = CONFIG.faultTolerance.backupServer;
    this.lastFailoverTime = null;
    this.congestionAlerts = [];
    this.predictiveModel = {};
    this.exits = [];
    this.buffers = [];
  }

  connect(sortingZone) {
    this.exits = sortingZone.exits;
    this.buffers = sortingZone.buffers;
  }

  init() {
    eventBus.on('segment:congested', (data) => this._handleCongestion(data));
    eventBus.on('parcel:arrived', (data) => this._logArrival(data));
    eventBus.on('parcel:dropped', (data) => this._logDrop(data));
    this._buildPredictiveModel();
  }

  update(dt) {
    if (!this.serverActive && this.failoverActive && !this.backupServerActive) {
      this.backupServerActive = true;
      this.serverActive = true;
      this.lastFailoverTime = Date.now();
      eventBus.emit('wcs:failover', { timestamp: this.lastFailoverTime });
    }
    this._predictCongestion();
  }

  _handleCongestion(data) {
    this.congestionAlerts.push({
      time: Date.now(),
      segmentId: data.segmentId,
      resolved: false,
    });
    eventBus.emit('wcs:alert', { type: 'congestion', ...data });
  }

  _logArrival(data) {
    const region = CONFIG.regions.find(r => r.id === data.parcel.regionId);
    if (region && this._predictExitDemand(region.id)) {
      eventBus.emit('wcs:reroute', { regionId: region.id, reason: 'predicted_overload' });
    }
  }

  _logDrop(data) {
    if (data.exit && data.exit.utilization > 0.8) {
      this._suggestReroute(data.exit);
    }
  }

  _buildPredictiveModel() {
    for (const region of CONFIG.regions) {
      this.predictiveModel[region.id] = {
        baselineDemand: 1 / CONFIG.regions.length,
        currentLoad: 0,
        trend: 0,
      };
    }
  }

  _predictCongestion() {
    for (const region of CONFIG.regions) {
      const model = this.predictiveModel[region.id];
      const totalExits = region.exits.length;
      const avgLoad = region.exits.reduce((s, ei) => s + this._getExit(ei).load, 0) / totalExits;
      model.currentLoad = avgLoad;
      model.trend = avgLoad - model.baselineDemand;
      if (model.trend > 0.3) {
        eventBus.emit('wcs:predictive_alert', {
          regionId: region.id,
          load: avgLoad,
          trend: model.trend,
          message: `Регион ${region.name}: прогнозируется перегрузка`,
        });
      }
    }
  }

  _predictExitDemand(regionId) {
    const model = this.predictiveModel[regionId];
    return model && model.currentLoad > 0.7;
  }

  _suggestReroute(exit) {
    const region = CONFIG.regions.find(r => r.exits.includes(exit.index));
    if (!region) return;
    const availableSpares = region.exits
      .map(idx => this._getExit(idx))
      .filter(e => e && e.index !== exit.index && !e.isFull);
    if (availableSpares.length > 0) {
      eventBus.emit('wcs:reroute_suggestion', {
        fromExit: exit.index,
        toExit: availableSpares[0].index,
      });
    }
  }

  _getExit(index) {
    return this.exits[index] || null;
  }

  _getBuffer(index) {
    return this.buffers[index] || null;
  }

  failServer() {
    if (this.failoverActive && !this.backupServerActive) {
      this.serverActive = false;
      return true;
    }
    this.serverActive = false;
    return false;
  }

  restoreServer() {
    this.serverActive = true;
    this.backupServerActive = false;
  }
}
