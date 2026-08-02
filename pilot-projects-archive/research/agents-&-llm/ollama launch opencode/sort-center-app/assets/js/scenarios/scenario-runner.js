/**
 * ScenarioRunner: injects scenario events into the engine timeline.
 */
export class ScenarioRunner {
  constructor({ engine, facility, events }) {
    this.engine = engine;
    this.facility = facility;
    this.events = events || [];
    for (const e of this.events) {
      this.engine.schedule({
        delay: e.at,
        type: 'scenario:event',
        payload: e,
        handler: (p) => this._fire(p)
      });
    }
  }

  _fire(evt) {
    const bus = this.engine.bus;
    switch (evt.type) {
      case 'scannerFail':
        this.facility.scanner.failOneDevice();
        bus.emit('scenario:notify', { text: 'Сбой устройства сканера', level: 'warn' });
        break;
      case 'scannerRecover':
        // restore all devices
        for (const d of this.facility.scanner.devices) d.ok = true;
        this.facility.scanner.notify('recovered');
        bus.emit('scenario:notify', { text: 'Сканер восстановлен', level: 'ok' });
        break;
      case 'chuteJam': {
        const alive = this.facility.chutes.filter(c => c.operational);
        const target = alive[Math.floor(Math.random() * alive.length)];
        if (target) {
          target.setOperational(false);
          bus.emit('scenario:notify', { text: `Затор в жёлобе ${target.name}`, level: 'error' });
          // Auto-recover after 30s
          this.engine.schedule({
            delay: 30, type: 'scenario:chuteRecover',
            payload: { id: target.id }, handler: (p) => {
              const c = this.facility.chutes.find(c => c.id === p.id);
              if (c) {
                c.setOperational(true);
                bus.emit('scenario:notify', { text: `Жёлоб ${c.name} разблокирован`, level: 'ok' });
              }
            }
          });
        }
        break;
      }
      case 'surgeMoscow': {
        const msk = this.facility.destinations.find(d => d.code === 'MSK');
        if (msk) msk.weight *= 2;
        bus.emit('scenario:notify', { text: 'Скачок спроса на Москву (+100%)', level: 'warn' });
        break;
      }
    }
  }
}
