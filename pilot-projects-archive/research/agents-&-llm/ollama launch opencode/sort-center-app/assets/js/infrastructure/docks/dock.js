import { Observable } from '../../core/observable.js';

let _id = 0;
/**
 * Dock = physical bay where trucks berth. Has a side (inbound|outbound)
 * and a position on the building perimeter.
 */
export class Dock extends Observable {
  constructor({ side, position, label = '' }) {
    super();
    this.id = ++_id;
    this.side = side; // 'inbound' | 'outbound'
    this.position = position; // {x,y}
    this.label = label;
    this.truck = null;
    this.operational = true;
  }

  get isFree() { return !this.truck; }

  dockTruck(truck) {
    if (!this.isFree) return false;
    this.truck = truck;
    this.notify('dock', { truck });
    return true;
  }

  releaseTruck() {
    const t = this.truck;
    this.truck = null;
    this.notify('release', { truck: t });
    return t;
  }
}
