/**
 * Discrete-event simulation engine.
 * Manages virtual time, event queue, and tick-based progression.
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.listeners.get(event).delete(handler);
  }

  emit(event, payload) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] handler error for "${event}":`, err);
      }
    }
  }
}

export class SimulationEngine {
  constructor({ timeScale = 1 } = {}) {
    this.time = 0; // virtual seconds
    this.timeScale = timeScale;
    this.running = false;
    this.paused = false;
    this.eventQueue = []; // min-heap-like sorted array
    this.bus = new EventBus();
    this.tickCount = 0;
    this.lastRealTime = 0;
    this.realStartTime = 0;
    this._rafId = null;
  }

  on(evt, fn) { return this.bus.on(evt, fn); }

  schedule({ delay, handler, payload, type = 'generic' }) {
    if (delay < 0) delay = 0;
    const evt = { at: this.time + delay, handler, payload, type, id: ++this._lastId };
    this._insertSorted(evt);
    return evt.id;
  }

  _insertSorted(evt) {
    const arr = this.eventQueue;
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].at <= evt.at) lo = mid + 1; else hi = mid;
    }
    arr.splice(lo, 0, evt);
  }

  _lastId = 0;

  cancel(eventId) {
    const idx = this.eventQueue.findIndex(e => e.id === eventId);
    if (idx >= 0) this.eventQueue.splice(idx, 1);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.realStartTime = performance.now();
    this.lastRealTime = this.realStartTime;
    this.bus.emit('engine:start', { time: this.time });
    this._loop();
  }

  pause() {
    if (!this.running) return;
    this.paused = true;
    this.bus.emit('engine:pause', { time: this.time });
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.lastRealTime = performance.now();
    this.bus.emit('engine:resume', { time: this.time });
  }

  stop() {
    this.running = false;
    this.paused = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this.bus.emit('engine:stop', { time: this.time });
  }

  reset() {
    this.stop();
    this.time = 0;
    this.tickCount = 0;
    this.eventQueue = [];
    this.bus.emit('engine:reset', { time: 0 });
  }

  setTimeScale(scale) {
    this.timeScale = Math.max(0.1, Math.min(50, scale));
    this.bus.emit('engine:timeScale', { timeScale: this.timeScale });
  }

  _loop() {
    if (!this.running) return;
    const now = performance.now();
    const dtReal = (now - this.lastRealTime) / 1000;
    this.lastRealTime = now;
    if (!this.paused) {
      this.time += dtReal * this.timeScale;
      this._processEvents();
      this.bus.emit('engine:tick', {
        time: this.time,
        dt: dtReal * this.timeScale,
        realDt: dtReal,
        tick: ++this.tickCount
      });
    }
    this._rafId = requestAnimationFrame(() => this._loop());
  }

  _processEvents() {
    const cutoff = this.time;
    const q = this.eventQueue;
    while (q.length && q[0].at <= cutoff) {
      const evt = q.shift();
      try {
        evt.handler(evt.payload, evt);
      } catch (err) {
        console.error(`[Engine] event handler error (${evt.type}):`, err);
      }
    }
  }
}
