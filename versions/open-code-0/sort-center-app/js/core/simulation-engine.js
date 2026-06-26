import { EventBus } from './event-bus.js';

export class SimulationEngine {
    constructor() {
        this.bus = new EventBus();
        this.running = false;
        this.paused = false;
        this.speed = 3;
        this.time = 0;
        this.lastTimestamp = 0;
        this._accumulator = 0;
        this._tickRate = 60;
        this._fixedDt = 1 / this._tickRate;
        this._entities = [];
        this._updatables = [];
    }

    get fixedDt() {
        return this._fixedDt * this.speed;
    }

    register(entity) {
        this._entities.push(entity);
        if (typeof entity.update === 'function') {
            this._updatables.push(entity);
        }
    }

    unregister(entity) {
        const idx = this._entities.indexOf(entity);
        if (idx !== -1) this._entities.splice(idx, 1);
        const uidx = this._updatables.indexOf(entity);
        if (uidx !== -1) this._updatables.splice(uidx, 1);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.paused = false;
        this.lastTimestamp = performance.now();
        this._accumulator = 0;
        this.bus.emit('start');
        this._loop(performance.now());
    }

    pause() {
        this.paused = !this.paused;
        if (!this.paused) {
            this.lastTimestamp = performance.now();
            this._accumulator = 0;
        }
        this.bus.emit(this.paused ? 'pause' : 'resume');
    }

    reset() {
        this.running = false;
        this.paused = false;
        this.time = 0;
        this._entities.length = 0;
        this._updatables.length = 0;
        this.bus.emit('reset');
    }

    setSpeed(s) {
        this.speed = Math.max(1, Math.min(10, s));
    }

    _loop(timestamp) {
        if (!this.running) return;

        if (!this.paused) {
            const frameDt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
            this.lastTimestamp = timestamp;
            this._accumulator += frameDt * this.speed;

            while (this._accumulator >= this._fixedDt) {
                this.time += this._fixedDt;
                this._tick(this._fixedDt);
                this._accumulator -= this._fixedDt;
            }
        } else {
            this.lastTimestamp = timestamp;
        }

        this.bus.emit('render', { time: this.time });
        requestAnimationFrame((t) => this._loop(t));
    }

    _tick(dt) {
        for (const entity of this._updatables) {
            entity.update(dt, this.time);
        }
        this.bus.emit('tick', { dt, time: this.time });
    }
}
