(function () {
  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');

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

  function draw() {
    ctx.clearRect(0, 0, CONFIG.visualization.canvasWidth, CONFIG.visualization.canvasHeight);
    Visualization.draw(ctx, CONFIG);
  }

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
      log('Ничего не выбрано', 'system');
    }
    draw();
  });

  document.getElementById('btnGenEvent').addEventListener('click', function () {
    log('Прибыл грузовик');
  });

  window.addEventListener('resize', resize);

  resize();
  log('Схема сортировочного центра загружена', 'system');
  log('Ожидание запуска симуляции...');
})();
