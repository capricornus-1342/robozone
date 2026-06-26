/**
 * Generic Observable base class for entities that emit change events.
 * Used by everything that needs reactive UI updates.
 */
export class Observable {
  constructor() {
    this._listeners = new Set();
  }
  subscribe(fn) {
    this._listeners.add(fn);
    fn(this);
    return () => this._listeners.delete(fn);
  }
  notify(event = 'change', payload) {
    for (const fn of this._listeners) {
      try { fn(this, event, payload); } catch (e) { console.error(e); }
    }
  }
}
