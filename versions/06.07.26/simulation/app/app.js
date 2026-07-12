(function () {
  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');
  const statusTime = document.getElementById('status-time');
  const statusLabel = document.getElementById('status-label');
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

  function draw() {
    ctx.clearRect(0, 0, CONFIG.visualization.canvasWidth, CONFIG.visualization.canvasHeight);
    Visualization.draw(ctx, CONFIG);

    if (statusTime) statusTime.textContent = formatTime(engine.simTime);
  }

  function updateButtons() {
    if (engine.isRunning) {
      btnStart.disabled = true;
      btnPause.disabled = false;
      btnReset.disabled = false;
      if (statusLabel) statusLabel.textContent = 'Работает';
    } else {
      btnStart.disabled = false;
      btnPause.disabled = true;
      btnReset.disabled = engine.simTime === 0;
    }
  }

  function scheduleTruckArrival() {
    const delay = 0.5 + Math.random() * 1.0;
    engine.scheduleEvent(delay, function (time) {
      const dockIndex = Math.floor(Math.random() * CONFIG.reception.docksUnload);
      Visualization.highlightedZoneId = 'unload-' + dockIndex;
      log('Прибыл грузовик (док ' + (dockIndex + 1) + ', t=' + formatTime(time) + ')');
      draw();
      scheduleTruckArrival();
    });
  }

  function onStart() {
    if (engine.isRunning) return;
    scheduleTruckArrival();
    engine.run();
    log('Симуляция запущена', 'system');
    updateButtons();
  }

  function onPause() {
    engine.pause();
    log('Симуляция приостановлена', 'system');
    if (statusLabel) statusLabel.textContent = 'Пауза';
    updateButtons();
  }

  function onReset() {
    engine.reset();
    Visualization.highlightedZoneId = null;
    log('Симуляция сброшена', 'system');
    if (statusLabel) statusLabel.textContent = 'Готов';
    draw();
    updateButtons();
  }

  engine.onTick = function () {
    draw();
  };

  canvas.addEventListener('click', function (e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const zone = Visualization.hitTest(x, y);

    if (zone) {
      Visualization.highlightedZoneId = zone.id;
      log('Выбрана зона: ' + zone.label, 'system');
    } else {
      Visualization.highlightedZoneId = null;
    }
    draw();
  });

  document.getElementById('btnGenEvent').addEventListener('click', function () {
    const dockIndex = Math.floor(Math.random() * CONFIG.reception.docksUnload);
    Visualization.highlightedZoneId = 'unload-' + dockIndex;
    log('Прибыл грузовик (док ' + (dockIndex + 1) + ')');
    draw();
  });

  btnStart.addEventListener('click', onStart);
  btnPause.addEventListener('click', onPause);
  btnReset.addEventListener('click', onReset);

  window.addEventListener('resize', resize);

  resize();
  updateButtons();
  log('Схема сортировочного центра загружена', 'system');
  log('Нажмите «Старт» для запуска симуляции');
})();
