(function () {
  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');
  const statusTime = document.getElementById('status-time');
  const statusLabel = document.getElementById('status-label');
  const statItems = document.getElementById('stat-items');
  const statCti = document.getElementById('stat-cti');
  const statPallets = document.getElementById('stat-pallets');
  const statNonsort = document.getElementById('stat-nonsort');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnReset = document.getElementById('btnReset');

  const engine = new SimulationEngine();
  engine.speed = 1;
  var dashVisible = false;

  function resize() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CONFIG.visualization.canvasWidth = rect.width;
    CONFIG.visualization.canvasHeight = rect.height;
    draw();
  }

  function log(msg, type) {
    const prefix = '%c[Robozone SC]';
    const style = type === 'system' ? 'color: #3fb950' : type === 'error' ? 'color: #f85149' : 'color: #58a6ff';
    console.log(prefix + '%c ' + msg, 'color: #8b949e; font-weight: bold', style);
  }

  function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return h + ':' + (m < 10 ? '0' : '') + m;
  }

  function updateStats() {
    var s = Simulation.stats;
    statItems.textContent = s.items;
    statCti.textContent = s.containers;
    statPallets.textContent = s.pallets;
    var nsPct = s.items > 0 ? Math.round(s.nonsort / s.items * 100) : 0;
    statNonsort.textContent = nsPct + '%';
    if (Simulation.reception) {
      document.getElementById('stat-buffer').textContent = Simulation.reception.buffer.count;
      document.getElementById('stat-buffer-max').textContent = CONFIG.reception.bufferCapacity;
      document.getElementById('stat-queue').textContent = getTotalQueueLength();
    }
    if (Simulation.depalletizing) {
      document.getElementById('stat-infeed').textContent = Simulation.depalletizing.infeedQueue.length;
      document.getElementById('stat-reuse').textContent = Simulation.depalletizing.containerReuseCount;
      document.getElementById('stat-scrap').textContent = Simulation.depalletizing.containerScrapCount;
    }
    if (Simulation.sorting) {
      document.getElementById('stat-sorted').textContent = Simulation.sorting.processedCount;
      document.getElementById('stat-onsorter').textContent = Simulation.sorting.conveyorItems.length;
    }
    if (Simulation.packing) {
      document.getElementById('stat-sealed').textContent = Simulation.packing.sealedCount;
      document.getElementById('stat-pallets-out').textContent = Simulation.packing.palletCount;
    }
    if (Simulation.depalletizing) {
      document.getElementById('stat-empty-ct').textContent = Simulation.depalletizing.emptyContainerBuffer;
    }
    if (Simulation.shipping) {
      document.getElementById('stat-ship-buffer').textContent = Simulation.shipping.buffer.length;
      document.getElementById('stat-dispatched').textContent = Simulation.shipping.dispatchedCount;
      var loadingCount = 0;
      for (var di = 0; di < Simulation.shipping.docks.length; di++) {
        if (Simulation.shipping.docks[di].status === 'loading') loadingCount++;
      }
      document.getElementById('stat-loading-docks').textContent = loadingCount + '/' + CONFIG.shipping.docksLoad;
    }
    if (Simulation.adjustments) {
      document.getElementById('stat-unload-speed').textContent = Math.round(Simulation.adjustments.unloadSpeedFactor * 100) + '%';
      document.getElementById('stat-sort-speed').textContent = Math.round(Simulation.adjustments.sortSpeedFactor * 100) + '%';
      document.getElementById('stat-conv-speed').textContent = Math.round(Simulation.adjustments.conveyorSpeedFactor * 100) + '%';
    }
    var circulation = 0;
    if (Simulation.depalletizing) circulation += Simulation.depalletizing.emptyContainerBuffer;
    if (Simulation.packing) circulation += Simulation.packing.sealedCount;
    document.getElementById('stat-circulation').textContent = circulation;
  }

  function draw() {
    ctx.clearRect(0, 0, CONFIG.visualization.canvasWidth, CONFIG.visualization.canvasHeight);
    Visualization.draw(ctx, CONFIG);
    statusTime.textContent = formatTime(engine.simTime);
    updateStats();
  }

  function updateButtons() {
    if (engine.isRunning) {
      btnStart.disabled = true;
      btnPause.disabled = false;
      btnReset.disabled = false;
      statusLabel.textContent = 'Работает';
    } else {
      btnStart.disabled = false;
      btnPause.disabled = true;
      btnReset.disabled = engine.simTime === 0;
    }
  }

  function checkDepalletizing() {
    var buf = Simulation.reception ? Simulation.reception.buffer : null;
    var dep = Simulation.depalletizing;
    if (!buf || !dep) return;

    while (buf.count > 0) {
      let station = dep.findFreeStation();
      if (!station) break;
      let pallet = buf.remove();
      if (!pallet) break;

      station.busy = true;
      station.currentPallet = pallet;

      var duration = CONFIG.depalletizing.timePerPalletSec / 60;
      if (duration < 0.01) duration = 0.01;
      log('Палета #' + pallet.id + ' → станция распаллетизации ' + (station.id + 1) + ' (' + Math.round(duration * 60) + ' сек)', 'system');

      engine.scheduleEvent(duration, function (t) {
        processDepalletizingStation(station, pallet);
      });
    }
  }

  function processDepalletizingStation(station, pallet) {
    var containers = pallet.containers;
    var itemsCount = 0;

    for (var c = 0; c < containers.length; c++) {
      var container = containers[c];
      var isReusable = Math.random() < CONFIG.depalletizing.containerReuse;

      for (var it = 0; it < container.items.length; it++) {
        Simulation.depalletizing.infeedQueue.push(container.items[it]);
        itemsCount++;
      }

      if (isReusable) {
        Simulation.depalletizing.containerReuseCount++;
      } else {
        Simulation.depalletizing.containerScrapCount++;
        Simulation.depalletizing.newContainerCount++;
      }
      Simulation.depalletizing.emptyContainerBuffer++;
    }

    log('Распаллетизация палеты #' + pallet.id + ' завершена: ' + itemsCount + ' тов. в инфид, КТЯ повторно: ' + Simulation.depalletizing.containerReuseCount + ', брак: ' + Simulation.depalletizing.containerScrapCount + ', пустых КТЯ: ' + Simulation.depalletizing.emptyContainerBuffer, 'system');

    station.busy = false;
    station.currentPallet = null;

    checkDepalletizing();
    draw();
  }

  var _lastSortTime = 0;

  function scheduleSortingStep() {
    var interval = 0.1;
    engine.scheduleEvent(interval, function (time) {
      processSortingBatch();
      scheduleSortingStep();
    });
  }

  function processSortingBatch() {
    var sort = Simulation.sorting;
    var infeed = Simulation.depalletizing ? Simulation.depalletizing.infeedQueue : null;
    if (!sort || !infeed || infeed.length === 0) return;

    var effFactor = CONFIG.sorting.efficiencyFactor * (Simulation.adjustments ? Simulation.adjustments.sortSpeedFactor : 1.0);
    var throughput = sort.conveyor.throughput * effFactor;
    var batchSize = Math.ceil(throughput * 0.1 / 60);
    if (batchSize > infeed.length) batchSize = infeed.length;

    var visualItems = [];
    var visualInterval = Math.max(1, Math.floor(batchSize / 20));

    for (var i = 0; i < batchSize; i++) {
      var item = infeed.shift();
      if (!item) break;

      var isNonsort = item.type === 'nonsort' || Math.random() >= CONFIG.sorting.scannerSuccessRate;

      if (isNonsort) {
        sort.nonsortCount++;
        sort.scannedFailCount++;
        continue;
      }

      sort.scannedOkCount++;
      var pocketIndex = item.destId - 1;
      if (pocketIndex >= 0 && pocketIndex < sort.pockets.length) {
        var pocket = sort.pockets[pocketIndex];
        if (!pocket.isFull) {
          pocket.addItem(item);
        } else {
          sort.nonsortCount++;
        }
      }
      sort.processedCount++;

      if (i % visualInterval === 0) {
        visualItems.push({
          destPocketIndex: pocketIndex,
          progress: 0
        });
      }
    }

    sort.conveyorItems.push.apply(sort.conveyorItems, visualItems);
    while (sort.conveyorItems.length > 600) {
      sort.conveyorItems.splice(0, sort.conveyorItems.length - 600);
    }
  }

  function updateConveyor(deltaMin) {
    var items = Simulation.sorting ? Simulation.sorting.conveyorItems : null;
    if (!items || items.length === 0) return;
    var speed = 0.4 * (Simulation.adjustments ? Simulation.adjustments.conveyorSpeedFactor : 1.0);
    for (var i = items.length - 1; i >= 0; i--) {
      items[i].progress += speed * deltaMin;
      if (items[i].progress >= 1) {
        items.splice(i, 1);
      }
    }
  }

  var _packingBatchCount = 0;

  function schedulePackingStep() {
    var interval = 0.2;
    _packingBatchCount = 0;
    engine.scheduleEvent(interval, function (time) {
      processPackingBatch();
      schedulePackingStep();
    });
  }

  function processPackingBatch() {
    var sort = Simulation.sorting;
    var pack = Simulation.packing;
    var depal = Simulation.depalletizing;
    if (!sort || !pack || !depal) return;

    var pockets = sort.pockets;
    var maxPockets = 15;

    for (var c = 0; c < maxPockets; c++) {
      var idx = pack.lastProcessedPocket;
      pack.lastProcessedPocket = (pack.lastProcessedPocket + 1) % pockets.length;

      var pocket = pockets[idx];
      if (pocket.count < 27) continue;
      if (depal.emptyContainerBuffer <= 0) break;

      var taken = 0;
      while (taken < 27 && pocket.count > 0) {
        pocket.items.shift();
        taken++;
      }

      depal.emptyContainerBuffer--;
      pack.sealedCount++;

      if (pack.sealedCount % 16 === 0) {
        pack.palletCount++;
        Simulation.shipping.buffer.push({ id: pack.palletCount, containers: 16, createdAt: engine.simTime });
      }

      _packingBatchCount++;
    }
  }

  function scheduleShippingStep() {
    var interval = 1.0;
    engine.scheduleEvent(interval, function (time) {
      processShipping();
      scheduleShippingStep();
    });
  }

  function processShipping() {
    var ship = Simulation.shipping;
    if (!ship) return;

    var dock = ship.findFreeDock();
    if (!dock) return;
    if (ship.buffer.length < 16) return;

    var pallets = ship.buffer.splice(0, 16);
    var truckId = Simulation._nextId.truck++;
    dock.status = 'loading';
    dock.currentTruck = { id: truckId, pallets: pallets, rollCages: 16, startTime: engine.simTime };

    var loadTime = CONFIG.shipping.loadTimeHours * 60;
    log('Машина #' + truckId + ' → ворота ' + (dock.id + 1) + ' (16 палет КТЯ + 16 ролл-кейджей, загрузка ' + loadTime + ' мин)', 'system');

    engine.scheduleEvent(loadTime, function (t) {
      ship.dispatchedCount++;
      log('Машина #' + dock.currentTruck.id + ' отправлена от ворот ' + (dock.id + 1) + ' (' + (pallets.length * 16) + ' КТЯ, 16 ролл-кейджей)', 'system');
      dock.status = 'free';
      dock.currentTruck = null;
      draw();
    });
  }

  function scheduleBalancing() {
    var interval = 3.0;
    engine.scheduleEvent(interval, function (time) {
      Simulation.balanceSystem(log);
      scheduleBalancing();
    });
  }

  function scheduleStatistics() {
    var interval = StatisticsCollector._snapshotInterval;
    engine.scheduleEvent(interval, function (time) {
      StatisticsCollector.takeSnapshot(time);
      updateDashboard();
      scheduleStatistics();
    });
  }

  function updateDashboard() {
    if (!dashVisible) return;
    var snap = StatisticsCollector.getLatest();
    if (!snap) return;
    var s = Simulation.stats;
    document.getElementById('dash-throughput').textContent = snap.itemsPerHour;
    document.getElementById('dash-cti-rate').textContent = snap.containersPerHour;
    document.getElementById('dash-pallet-rate').textContent = snap.palletsPerHour;
    document.getElementById('dash-nonsort-pct').textContent = Math.round(s.nonsort / Math.max(1, s.items) * 100) + '%';
    document.getElementById('dash-buf-fill').textContent = Math.round(snap.bufferFill * 100) + '%';
    document.getElementById('dash-infeed').textContent = snap.infeedLength;
    document.getElementById('dash-pocket-avg').textContent = Math.round(snap.avgPocketFill * 100) + '%';
    document.getElementById('dash-dispatched').textContent = Simulation.shipping ? Simulation.shipping.dispatchedCount : 0;
    document.getElementById('dash-unload-busy').textContent = snap.unloadDocksBusy + '/' + CONFIG.reception.docksUnload;
    document.getElementById('dash-load-busy').textContent = snap.loadingDocksBusy + '/' + CONFIG.shipping.docksLoad;
    drawChart();
  }

  function drawChart() {
    var cvs = document.getElementById('chartCanvas');
    if (!cvs) return;
    var rect = cvs.parentElement.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    cvs.width = rect.width * dpr;
    cvs.height = rect.height * dpr;
    var ctx = cvs.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    var hist = StatisticsCollector.history;
    if (hist.length < 2) {
      ctx.fillStyle = '#484f58';
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Накопление данных...', w / 2, h / 2);
      return;
    }

    var pad = { t: 8, r: 8, b: 16, l: 8 };
    var cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;

    var maxVal = 0;
    for (var i = 0; i < hist.length; i++) {
      if (hist[i].itemsPerHour > maxVal) maxVal = hist[i].itemsPerHour;
    }
    if (maxVal < 100) maxVal = 100;

    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + ch * 0.5);
    ctx.lineTo(pad.l + cw, pad.t + ch * 0.5);
    ctx.stroke();

    ctx.fillStyle = '#484f58';
    ctx.font = '6px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(maxVal / 1000) + 'k', pad.l, pad.t + 8);
    ctx.fillText('0', pad.l, pad.t + ch + 12);
    ctx.textAlign = 'right';
    ctx.fillText('т/ч', pad.l + cw, pad.t + 8);

    var step = Math.max(1, Math.floor(hist.length / (cw / 2)));
    var color = '#58a6ff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var i = 0; i < hist.length; i += step) {
      var x = pad.l + (i / (hist.length - 1)) * cw;
      var y = pad.t + ch - (hist[i].itemsPerHour / maxVal) * ch;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function getTotalQueueLength() {
    var total = 0;
    if (!Simulation.reception) return 0;
    for (var di = 0; di < Simulation.reception.docks.length; di++) {
      total += Simulation.reception.docks[di].queue.length;
    }
    return total;
  }

  function startUnload(dock, truck) {
    var speedFactor = Simulation.adjustments ? Simulation.adjustments.unloadSpeedFactor : 1.0;
    var unloadDuration = truck.totalItems / (CONFIG.reception.throughputPerDock * speedFactor) * 60;
    if (unloadDuration < 0.1) unloadDuration = 0.1;
    log('Грузовик #' + truck.id + ' → док ' + (dock.id + 1) + ' (разгрузка ' + Math.round(unloadDuration) + ' мин, ' + truck.totalItems + ' тов.)', 'system');
    Visualization.highlightedZoneId = 'unload-' + dock.id;

    engine.scheduleEvent(unloadDuration, function (t) {
      var added = 0;
      for (var p = 0; p < truck.load.length; p++) {
        if (Simulation.reception.buffer.add(truck.load[p])) {
          added++;
        } else {
          log('Буфер приемки переполнен! Палета #' + truck.load[p].id + ' не поместилась', 'error');
        }
      }
      log('Разгрузка грузовика #' + truck.id + ' завершена (' + added + ' палет в буфер, всего: ' + Simulation.reception.buffer.count + '/' + CONFIG.reception.bufferCapacity + ')');
      checkDepalletizing();
      dock.free();

      if (dock.queue.length > 0) {
        var nextTruck = dock.queue.shift();
        dock.assignTruck(nextTruck);
        startUnload(dock, nextTruck);
      }

      draw();
    });
  }

  function scheduleTruckArrival() {
    var paused = Simulation.adjustments && Simulation.adjustments.unloadPaused;
    var delay = (paused ? 3.0 : 0.5) + Math.random() * 1.0;
    engine.scheduleEvent(delay, function (time) {
      var truck = Simulation.generateTruck(time);
      log('Прибыл грузовик #' + truck.id + ' (' + truck.palletCount + ' палет, ' + truck.totalItems + ' тов.)', 'system');

      var dock = Simulation.reception.findFreeDock();
      if (dock) {
        dock.assignTruck(truck);
        startUnload(dock, truck);
      } else {
        var bestDock = Simulation.reception.docks[0];
        for (var di = 1; di < Simulation.reception.docks.length; di++) {
          if (Simulation.reception.docks[di].queue.length < bestDock.queue.length) {
            bestDock = Simulation.reception.docks[di];
          }
        }
        bestDock.queue.push(truck);
        log('Все доки заняты — грузовик #' + truck.id + ' в очередь к доку ' + (bestDock.id + 1) + ' (всего ' + getTotalQueueLength() + ' в очереди)', 'error');
      }

      draw();
      scheduleTruckArrival();
    });
  }

  function getSlowdownCoeff() {
    var val = parseFloat(document.getElementById('slowdown').value);
    return val > 0 ? val : 1;
  }

  function onStart() {
    if (engine.isRunning) return;
    var coeff = getSlowdownCoeff();
    engine.speed = 1 / coeff;
    _lastSortTime = 0;
    scheduleTruckArrival();
    scheduleSortingStep();
    schedulePackingStep();
    scheduleShippingStep();
    scheduleBalancing();
    scheduleStatistics();
    engine.run();
    log('Симуляция запущена (замедлитель ' + coeff + '×)', 'system');
    updateButtons();
  }

  function onPause() {
    engine.pause();
    log('Симуляция приостановлена', 'system');
    statusLabel.textContent = 'Пауза';
    updateButtons();
  }

  function onReset() {
    engine.reset();
    Simulation.reset();
    Simulation.initAdjustments();
    StatisticsCollector.init();
    Visualization.highlightedZoneId = null;
    log('Симуляция сброшена', 'system');
    statusLabel.textContent = 'Готов';
    draw();
    updateButtons();
  }

  engine.onTick = function (simTime) {
    try {
      var delta = simTime - _lastSortTime;
      _lastSortTime = simTime;
      updateConveyor(delta);
      draw();
    } catch (e) {
      log('Ошибка отрисовки: ' + e.message, 'error');
    }
  };

  canvas.addEventListener('click', function (e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var zone = Visualization.hitTest(x, y);
    if (zone) {
      Visualization.highlightedZoneId = zone.id;
      log('Выбрана зона: ' + zone.label, 'system');
    } else {
      Visualization.highlightedZoneId = null;
    }
    draw();
  });

  document.getElementById('btnGenEvent').addEventListener('click', function () {
    var dockIndex = Math.floor(Math.random() * CONFIG.reception.docksUnload);
    Visualization.highlightedZoneId = 'unload-' + dockIndex;
    log('Прибыл грузовик (док ' + (dockIndex + 1) + ')');
    draw();
  });

  btnStart.addEventListener('click', onStart);
  btnPause.addEventListener('click', onPause);
  btnReset.addEventListener('click', onReset);
  window.addEventListener('resize', resize);

  document.getElementById('btnExport').addEventListener('click', function () {
    if (StatisticsCollector.history.length === 0) {
      log('Нет данных для экспорта — запустите симуляцию', 'error');
      return;
    }
    StatisticsCollector.exportFile();
    log('Экспорт статистики завершён', 'system');
  });

  document.getElementById('btnToggleDash').addEventListener('click', function () {
    dashVisible = !dashVisible;
    var dash = document.getElementById('dashboard');
    dash.style.display = dashVisible ? 'flex' : 'none';
    if (dashVisible) updateDashboard();
    draw();
  });

  Simulation.init();
  StatisticsCollector.init();
  StatisticsCollector.takeSnapshot(0);
  resize();
  updateButtons();
  log('Схема сортировочного центра загружена', 'system');
  log('Нажмите «Старт» для запуска симуляции');
})();
