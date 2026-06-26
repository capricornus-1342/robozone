/**
 * Main App — wires the engine, facility, scenarios, renderer, and dashboard.
 */
import { SimulationEngine } from './core/engine.js';
import { buildFacility } from './facility/facility-builder.js';
import { SCENARIOS } from './scenarios/scenarios.js';
import { ScenarioRunner } from './scenarios/scenario-runner.js';
import { Renderer } from './ui/renderer.js';
import { Dashboard } from './ui/dashboard.js';

class App {
  constructor() {
    this.engine = new SimulationEngine({ timeScale: 1 });
    this.scenarioKey = 'normal';
    this.scenarioRunner = null;
    this._bindUI();
    this._setup();
  }

  _setup() {
    this._loadScenario(this.scenarioKey);
    this.renderer = new Renderer(document.getElementById('canvas'), this.facility);
    this.dashboard = new Dashboard(this.facility.metrics, this.facility);
    this.dashboard.bind();
    this.engine.on('engine:tick', (p) => this._onTick(p));
    this.engine.on('engine:start', () => this.dashboard.log('Симуляция запущена', 'ok'));
    this.engine.on('engine:pause',  () => this.dashboard.log('Пауза', 'warn'));
    this.engine.on('engine:resume', () => this.dashboard.log('Возобновлено', 'ok'));
    this.engine.on('engine:stop',   () => this.dashboard.log('Остановлено', 'info'));
    this.engine.on('engine:reset',  () => this.dashboard.log('Сброс', 'info'));
    this.engine.on('engine:timeScale', (p) => this.dashboard.log(`Скорость: x${p.timeScale.toFixed(1)}`, 'info'));
    this.engine.bus.on('scenario:notify', (p) => this.dashboard.log(p.text, p.level));
    // sample throughput
    this.engine.on('engine:tick', () => {
      this.facility.metrics.sampleThroughput(this.engine.time, this.facility.metrics.sorted);
    });
    this._drawLoop = this._drawLoop.bind(this);
    requestAnimationFrame(this._drawLoop);
  }

  _loadScenario(key) {
    this.engine.stop();
    this.engine.time = 0;
    this.engine.tickCount = 0;
    this.engine.eventQueue = [];
    const cfg = SCENARIOS[key];
    this.facility = buildFacility({ engine: this.engine, config: cfg });
    this.scenarioRunner = new ScenarioRunner({
      engine: this.engine,
      facility: this.facility,
      events: cfg.events
    });
    if (this.renderer) this.renderer.facility = this.facility;
    if (this.dashboard) {
      this.dashboard.metrics = this.facility.metrics;
      this.dashboard.facility = this.facility;
    }
    if (this.dashboard) this.dashboard.log(`Загружен сценарий: ${cfg.name}`, 'info');
  }

  _onTick(p) {
    this.dashboard.update(p.time);
  }

  _drawLoop() {
    if (this.renderer) this.renderer.draw(this.engine.time);
    requestAnimationFrame(this._drawLoop);
  }

  _bindUI() {
    document.getElementById('btn-start').onclick = () => {
      if (!this.engine.running) this.engine.start();
      else this.engine.resume();
    };
    document.getElementById('btn-pause').onclick = () => this.engine.pause();
    document.getElementById('btn-reset').onclick = () => {
      this._loadScenario(this.scenarioKey);
    };
    document.getElementById('btn-stop').onclick = () => this.engine.stop();
    document.getElementById('speed-slider').oninput = (e) => {
      const v = parseFloat(e.target.value);
      this.engine.setTimeScale(v);
      document.getElementById('speed-label').textContent = `x${v.toFixed(1)}`;
    };
    document.getElementById('scenario-select').onchange = (e) => {
      this.scenarioKey = e.target.value;
      this._loadScenario(this.scenarioKey);
      const cfg = SCENARIOS[this.scenarioKey];
      const hint = document.getElementById('scenario-hint');
      if (hint) hint.textContent = cfg.description;
    };
    // initial hint
    document.getElementById('scenario-hint').textContent = SCENARIOS[this.scenarioKey].description;
    document.getElementById('arrival-slider').oninput = (e) => {
      const v = parseFloat(e.target.value);
      this.facility.inboundZone.setRate(v);
      document.getElementById('arrival-label').textContent = `${v.toFixed(1)} пос/с`;
    };
    document.getElementById('btn-induce-burst').onclick = () => {
      // induce a burst: temporarily increase arrival rate for 30 sim sec
      const old = this.facility.inboundZone.arrivalRate;
      this.facility.inboundZone.setRate(old * 3);
      this.dashboard.log(`Всплеск нагрузки x3 на 30с`, 'warn');
      this.engine.schedule({
        delay: 30, type: 'burstEnd', handler: () => {
          this.facility.inboundZone.setRate(old);
          this.dashboard.log('Всплеск завершён', 'info');
        }
      });
    };
    document.getElementById('btn-break-scanner').onclick = () => {
      this.facility.scanner.failOneDevice();
      this.dashboard.log('Сбой устройства сканера (ручной)', 'error');
    };
    document.getElementById('btn-break-conveyor').onclick = () => {
      this.facility.loopConveyor.breakDown();
      this.dashboard.log('Сбой привода конвейера (ручной)', 'error');
      this.engine.schedule({ delay: 25, type: 'recover', handler: () => {
        this.facility.loopConveyor.repair();
        this.dashboard.log('Конвейер восстановлен', 'ok');
      }});
    };
    document.getElementById('btn-jam-chute').onclick = () => {
      const c = this.facility.chutes[Math.floor(Math.random() * this.facility.chutes.length)];
      c.setOperational(false);
      this.dashboard.log(`Затор в жёлобе ${c.name}`, 'error');
      this.engine.schedule({ delay: 20, type: 'chute-recover', payload: { id: c.id }, handler: (p) => {
        const cc = this.facility.chutes.find(c => c.id === p.id);
        if (cc) { cc.setOperational(true); this.dashboard.log(`Жёлоб ${cc.name} разблокирован`, 'ok'); }
      }});
    };
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
