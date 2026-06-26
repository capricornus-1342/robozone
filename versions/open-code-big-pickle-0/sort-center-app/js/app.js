(function () {
  let simulation = null;
  let renderer = null;
  let animFrameId = null;

  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnStop = document.getElementById('btnStop');
  const btnReset = document.getElementById('btnReset');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const kpiProcessed = document.getElementById('kpiProcessed');
  const kpiInSystem = document.getElementById('kpiInSystem');
  const kpiThroughput = document.getElementById('kpiThroughput');
  const kpiTime = document.getElementById('kpiTime');

  function init() {
    simulation = new SimulationEngine();
    renderer = new Renderer('simCanvas');
    simulation.init();
    renderer.render(simulation);
    updateUI('stopped');
    eventBus.on('sim:tick', onTick);
  }

  function onTick() {
    renderer.render(simulation);
    updateKPIs();
  }

  function updateUI(state) {
    statusDot.className = 'dot';
    switch (state) {
      case 'active':
        statusDot.classList.add('dot-active');
        statusText.textContent = 'Работает';
        break;
      case 'paused':
        statusDot.classList.add('dot-paused');
        statusText.textContent = 'Пауза';
        break;
      default:
        statusDot.classList.add('dot-stopped');
        statusText.textContent = 'Остановлено';
    }
  }

  function updateKPIs() {
    const stats = simulation.stats;
    kpiProcessed.textContent = simulation.outboundZone.totalProcessed || 0;
    kpiInSystem.textContent = stats.parcelsInSystem || 0;
    const rate = simulation.dashboard.metrics.throughputPerMinute || 0;
    kpiThroughput.textContent = rate;
    const avg = stats.avgThroughputTime;
    kpiTime.textContent = avg ? Math.round(avg) + 'ms' : '—';
  }

  btnStart.addEventListener('click', () => {
    if (!simulation) return;
    simulation.start();
    updateUI('active');
  });

  btnPause.addEventListener('click', () => {
    if (!simulation) return;
    simulation.pause();
    updateUI(simulation.isPaused ? 'paused' : 'active');
  });

  btnStop.addEventListener('click', () => {
    if (!simulation) return;
    simulation.stop();
    updateUI('stopped');
  });

  btnReset.addEventListener('click', () => {
    if (!simulation) return;
    simulation.reset();
    renderer.render(simulation);
    updateUI('stopped');
  });

  document.addEventListener('DOMContentLoaded', init);
})();
