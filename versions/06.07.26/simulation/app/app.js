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

  function scheduleTruckArrival() {
    var delay = 0.5 + Math.random() * 1.0;
    engine.scheduleEvent(delay, function (time) {
      var truck = Simulation.generateTruck(time);
      var dockIndex = Math.floor(Math.random() * CONFIG.reception.docksUnload);
      Visualization.highlightedZoneId = 'unload-' + dockIndex;
      log('Прибыл грузовик #' + truck.id + ' (' + truck.palletCount + ' палет, ' + truck.totalItems + ' тов., док ' + (dockIndex + 1) + ', t=' + formatTime(time) + ')');
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
    scheduleTruckArrival();
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
    Visualization.highlightedZoneId = null;
    log('Симуляция сброшена', 'system');
    statusLabel.textContent = 'Готов';
    draw();
    updateButtons();
  }

  engine.onTick = function () {
    draw();
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

  Simulation.init();
  resize();
  updateButtons();
  log('Схема сортировочного центра загружена', 'system');
  log('Нажмите «Старт» для запуска симуляции');
})();
