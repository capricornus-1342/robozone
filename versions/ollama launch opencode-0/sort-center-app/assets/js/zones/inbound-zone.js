import { rand } from '../../core/random.js';
import { Parcel, PARCEL_SPECS, ParcelType } from '../domain/parcels/parcel.js';

/**
 * InboundZone: receives trucks, unloads parcels, generates them on a schedule.
 * Models both real (truck-derived) and synthetic (test) demand.
 */
export class InboundZone {
  constructor({ engine, metrics, destinations, arrivalRate = 1.2, truckArrivalInterval = 25, capacity = 200 }) {
    this.engine = engine;
    this.metrics = metrics;
    this.destinations = destinations;
    this.arrivalRate = arrivalRate; // parcels / sec baseline
    this.truckArrivalInterval = truckArrivalInterval;
    this.parcelQueue = []; // parcels waiting to be inducted
    this.capacity = capacity;
    this.unscheduledTrucks = 0; // virtual queue
    this.engine.on('engine:start', () => this._scheduleNext());
    this.engine.on('engine:tick', () => this._maybeGenerate());
  }

  _scheduleNext() {
    this.engine.schedule({
      delay: 1, type: 'inbound:tick', handler: () => this._tick()
    });
  }

  _maybeGenerate() {
    if (this.parcelQueue.length >= this.capacity) return;
    const expected = this.arrivalRate * (1 / 60); // per tick approximation
    if (rand.chance(expected)) this._generateParcel();
  }

  _generateParcel() {
    const typeWeights = {
      [ParcelType.STANDARD]: 70,
      [ParcelType.FRAGILE]: 15,
      [ParcelType.OVERSIZED]: 10,
      [ParcelType.HAZARDOUS]: 5
    };
    const type = rand.weighted(
      [ParcelType.STANDARD, ParcelType.FRAGILE, ParcelType.OVERSIZED, ParcelType.HAZARDOUS],
      t => typeWeights[t] || 1
    );
    const spec = PARCEL_SPECS[type];
    const dest = rand.weighted(this.destinations, d => d.weight);
    const parcel = new Parcel({
      type,
      destination: dest.id,
      weight: spec.weight * rand.uniform(0.6, 1.4),
      size: spec.size[0] + Math.random() * (spec.size[1] - spec.size[0]),
      fragile: type === ParcelType.FRAGILE
    });
    parcel.createdAt = this.engine.time;
    parcel.enteredSystemAt = this.engine.time;
    parcel.status = 'received';
    this.parcelQueue.push(parcel);
    if (this.metrics) this.metrics.onParcelReceived(parcel);
  }

  /** Called by InductionZone to pull a parcel into the system. */
  pull() {
    return this.parcelQueue.shift();
  }

  size() { return this.parcelQueue.length; }

  setRate(r) { this.arrivalRate = r; }

  _tick() {
    if (!this.engine.running || this.engine.paused) {
      this.engine.schedule({ delay: 0.5, type: 'inbound:tick', handler: () => this._tick() });
      return;
    }
    this.engine.schedule({ delay: 1, type: 'inbound:tick', handler: () => this._tick() });
  }
}
