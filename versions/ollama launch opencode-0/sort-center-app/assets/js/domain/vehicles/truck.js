import { Observable } from '../../core/observable.js';

let _truckSeq = 0;
export class Truck extends Observable {
  /**
   * Inbound truck delivers parcels; outbound truck collects for a route.
   */
  constructor({ kind, dock, cargo = 0, capacity, direction }) {
    super();
    this.id = ++_truckSeq;
    this.kind = kind; // 'inbound' | 'outbound'
    this.dock = dock;
    this.cargo = cargo;
    this.capacity = capacity;
    this.direction = direction; // Destination for outbound
    this.arrivedAt = 0;
    this.departedAt = null;
    this.unloadProgress = 0;
    this.loadingProgress = 0;
    this.state = 'arriving'; // arriving, docked, unloading, loading, departed
  }

  get fillRatio() { return this.capacity ? this.cargo / this.capacity : 0; }
  get isFull() { return this.cargo >= this.capacity; }
  get isEmpty() { return this.cargo === 0; }
}
