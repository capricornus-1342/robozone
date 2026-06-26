import { Observable } from '../../core/observable.js';

let _id = 0;
/**
 * Cross-belt / tilt-tray sorter = the "push" mechanism that ejects a parcel
 * from the main loop into a chute. Each sorter serves one chute.
 */
export class Sorter extends Observable {
  constructor({ chuteId, loop, angle = 90, force = 1.0 }) {
    super();
    this.id = ++_id;
    this.chuteId = chuteId;
    this.loop = loop;
    this.angle = angle;
    this.force = force; // 0..1; reduced for fragile
    this.cycles = 0;
    this.operational = true;
  }

  eject(parcel) {
    if (!this.operational) return false;
    this.cycles++;
    this.notify('eject', { parcel });
    return true;
  }

  setForce(f) { this.force = Math.max(0.1, Math.min(1, f)); }
  setOperational(v) { this.operational = v; this.notify('state'); }
}
