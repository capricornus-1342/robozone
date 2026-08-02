class SimulationEngine {
  constructor() {
    this.eventQueue = [];
    this.simTime = 0;
    this.isRunning = false;
    this.speed = 1;
    this.lastFrameTime = 0;
    this.animFrameId = null;
    this.onLog = null;
    this.onTick = null;
  }

  scheduleEvent(delay, handler) {
    const event = { time: this.simTime + delay, handler };
    let i = 0;
    while (i < this.eventQueue.length && this.eventQueue[i].time < event.time) i++;
    this.eventQueue.splice(i, 0, event);
  }

  step() {
    if (this.eventQueue.length === 0) return null;
    const event = this.eventQueue.shift();
    this.simTime = event.time;
    event.handler(this.simTime);
    return event;
  }

  run() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    const loop = (now) => {
      if (!this.isRunning) return;

      const realDelta = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;

      const simDelta = realDelta * this.speed * 60;
      this.simTime += simDelta;

      while (this.eventQueue.length > 0 && this.eventQueue[0].time <= this.simTime) {
        const event = this.eventQueue.shift();
        event.handler(this.simTime);
      }

      if (this.onTick) this.onTick(this.simTime);
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  pause() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  reset() {
    this.pause();
    this.eventQueue = [];
    this.simTime = 0;
  }
}
