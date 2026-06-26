import { SimulationEngine } from './js/core/simulation-engine.js';
import { Building } from './js/entities/building.js';
import { WCS } from './js/systems/wcs.js';
import { Renderer } from './js/ui/renderer.js';
import { Dashboard } from './js/ui/dashboard.js';
import { Config } from './js/config/parameters.js';

class SortingCenterApp {
    constructor() {
        this.engine = new SimulationEngine();
        this.canvas = document.getElementById('simulation-canvas');
        this._faultInterval = null;

        this._setupControls();
        this._setupEvents();

        this._startApp();
    }

    _startApp() {
        const container = this.canvas.parentElement;
        let w = container.clientWidth;
        let h = container.clientHeight;

        if (w < 100 || h < 100) {
            w = window.innerWidth - 300;
            h = window.innerHeight - 60;
        }

        w = Math.max(600, w);
        h = Math.max(400, h);

        this.canvas.width = w;
        this.canvas.height = h;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';

        this.building = new Building(w, h);
        this.wcs = new WCS(this.building, this.engine);
        this.renderer = new Renderer(this.canvas);
        this.dashboard = new Dashboard(this.wcs, this.building);

        this.engine.register(this.wcs);

        this.engine.bus.on('tick', () => this.dashboard.update());
        this.engine.bus.on('render', ({ time }) => {
            this.renderer.render(this.building, this.wcs, time);
        });

        this.engine.start();
    }

    _setupControls() {
        const btnStart = document.getElementById('btn-start');
        const btnPause = document.getElementById('btn-pause');
        const btnReset = document.getElementById('btn-reset');
        const btnFault = document.getElementById('btn-fault');
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        const arrivalSlider = document.getElementById('arrival-slider');
        const arrivalValue = document.getElementById('arrival-value');

        btnStart.addEventListener('click', () => {
            if (!this.engine.running) {
                this.engine.start();
            }
            btnStart.classList.add('active');
        });

        btnPause.addEventListener('click', () => {
            this.engine.pause();
            btnPause.textContent = this.engine.paused ? '▶ Продолжить' : '⏸ Пауза';
        });

        btnReset.addEventListener('click', () => {
            this.engine.reset();
            if (this._faultInterval) {
                clearInterval(this._faultInterval);
                this._faultInterval = null;
            }
            btnPause.textContent = '⏸ Пауза';
            btnStart.classList.remove('active');

            setTimeout(() => this._startApp(), 50);
        });

        speedSlider.addEventListener('input', () => {
            const val = parseInt(speedSlider.value);
            this.engine.setSpeed(val);
            speedValue.textContent = `x${val}`;
        });

        arrivalSlider.addEventListener('input', () => {
            const val = parseInt(arrivalSlider.value);
            if (this.wcs) this.wcs.setArrivalRate(val);
            arrivalValue.textContent = `${val} шт/с`;
        });

        btnFault.addEventListener('click', () => {
            if (this.wcs) this.wcs.triggerRandomFault();
        });
    }

    _setupEvents() {
        this.engine.bus.on('start', () => {
            if (!this._faultInterval) {
                this._faultInterval = setInterval(() => {
                    if (Math.random() < Config.fault.probability && this.wcs) {
                        this.wcs.triggerRandomFault();
                    }
                }, 1000);
            }
        });

        this.engine.bus.on('reset', () => {
            if (this._faultInterval) {
                clearInterval(this._faultInterval);
                this._faultInterval = null;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SortingCenterApp();
});
