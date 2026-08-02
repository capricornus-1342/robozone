import { Observable } from '../../core/observable.js';

let _id = 0;
/**
 * Chute = output buffer attached to a sorter.
 * Holds a small queue (5-10 parcels) to smooth pulsations.
 * When full, downstream is considered congested; upstream will reroute.
 */
export class Chute extends Observable {
  constructor({ name, destination, capacity = 8, x = 0, y = 0 }) {
    super();
    this.id = ++_id;
    this.name = name;
    this.destination = destination; // Destination id
    this.capacity = capacity;
    this.buffer = [];
    this.position = { x, y };
    this.operational = true;
    this.jamCount = 0;
  }

  get load() { return this.buffer.length; }
  get fillRatio() { return this.buffer.length / this.capacity; }
  get isFull() { return this.buffer.length >= this.capacity; }
  get isJammed() { return !this.operational; }

  enqueue(parcel) {
    if (this.isFull) {
      this.jamCount++;
      this.notify('jam');
      return false;
    }
    this.buffer.push(parcel);
    this.notify('enqueue', { parcel });
    return true;
  }

  dequeue() {
    if (!this.buffer.length) return null;
    return this.buffer.shift();
  }

  setOperational(v) { this.operational = v; this.notify('state'); }
}
