import { Observable } from '../../core/observable.js';

/**
 * Base conveyor: a directed edge that transports parcels at a given speed.
 * Has capacity (parcels it can hold on the belt at once), current load,
 * and a queue of parcels scheduled to enter the conveyor.
 */
let _id = 0;
export class Conveyor extends Observable {
  constructor({ name, length, speed, capacity, dualDrive = false, layout = 'straight', points = null }) {
    super();
    this.id = ++_id;
    this.name = name;
    this.length = length; // meters
    this.speed = speed; // m/s
    this.capacity = capacity; // max simultaneous parcels
    this.dualDrive = dualDrive; // has redundant motor
    this.layout = layout; // 'straight' | 'curve' | 'loop' | 'merge' | 'diverge'
    this.points = points; // polyline of {x,y} for visualization & path traversal
    this.parcels = []; // parcels currently on belt
    this.pending = []; // parcels waiting to enter
    this.broken = false;
    this.operational = true;
    this.failures = 0;
    this.recoveries = 0;
  }

  get loadRatio() { return this.capacity ? this.parcels.length / this.capacity : 0; }
  get hasRoom() { return this.parcels.length < this.capacity; }
  get effectiveSpeed() {
    if (!this.operational) return 0;
    if (this.dualDrive && this.failures > 0 && this.recoveries < this.failures) return this.speed * 0.6;
    return this.speed;
  }

  breakDown() {
    if (this.dualDrive && this.failures > this.recoveries) {
      this.recoveries++;
      this.notify('recovered');
    } else {
      this.broken = true;
      this.operational = false;
      this.failures++;
      this.notify('failure');
    }
  }

  repair() {
    this.broken = false;
    this.operational = true;
    this.recoveries++;
    this.notify('repaired');
  }

  accept(parcel) {
    this.pending.push(parcel);
  }

  admitOne() {
    if (!this.hasRoom || !this.operational) return null;
    const p = this.pending.shift();
    if (!p) return null;
    this.parcels.push(p);
    return p;
  }

  releaseOne() {
    return this.parcels.shift();
  }
}
