(function () {
  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');
  const logContainer = document.getElementById('logContainer');

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
    const entry = document.createElement('div');
    entry.className = 'log-entry' + (type ? ' ' + type : '');
    const now = new Date();
    const ts = now.toTimeString().slice(0, 8);
    entry.innerHTML = '<span class="time">[' + ts + ']</span><span class="event">' + msg + '</span>';
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  function draw() {
    ctx.clearRect(0, 0, CONFIG.visualization.canvasWidth, CONFIG.visualization.canvasHeight);
    Visualization.draw(ctx, CONFIG);
  }

  window.addEventListener('resize', resize);

  resize();
  log('Схема сортировочного центра загружена', 'system');
  log('Ожидание запуска симуляции...');
})();
