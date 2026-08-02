import { rand } from '../../core/random.js';
import { ParcelType } from '../domain/parcels/parcel.js';

/**
 * OutboundZone: consolidates parcels from chutes into outbound trucks.
 * Periodically a truck for a destination is requested; parcels in matching chutes
 * are loaded into it. When full or after deadline, truck departs.
 */
export class OutboundZone {
  constructor({ engine, chutes, destinations, outboundDocks, metrics, loadInterval = 2.0 }) {
    this.engine = engine;
    this.chutes = chutes;
    this.destinations = destinations;
    this.outboundDocks = outboundDocks;
    this.metrics = metrics;
    this.loadInterval = loadInterval;
    this.pendingDeparts = []; // {destId, departAt}
    this._scheduleLoad();
    this._scheduleTruckArrival();
  }

  _scheduleLoad() {
    this.engine.schedule({
      delay: this.loadInterval,
      type: 'outbound:load',
      handler: () => this._loadTick()
    });
  }

  _scheduleTruckArrival() {
    const next = rand.uniform(15, 35);
    this.engine.schedule({
      delay: next,
      type: 'outbound:truckArrival',
      handler: () => this._truckArrivalTick()
    });
  }

  _truckArrivalTick() {
    if (!this.engine.running) return;
    if (!this.engine.paused) {
      // Decide a random destination
      const dest = rand.weighted(this.destinations, d => d.weight);
      const freeDock = this.outboundDocks.find(d => d.isFree && d.operational);
      if (freeDock) {
        const capacity = rand.int(40, 80);
        const truck = {
          id: 'T' + (++this._truckSeq),
          kind: 'outbound',
          dock: freeDock,
          cargo: 0,
          capacity,
          direction: dest.id,
          arrivedAt: this.engine.time,
          departedAt: null,
          state: 'loading'
        };
        freeDock.dockTruck(truck);
        // Schedule loading loop pulls
        this.engine.schedule({
          delay: 0.5,
          type: 'outbound:loadTruck',
          payload: { truck },
          handler: (p) => this._loadTruck(p.truck)
        });
        // Schedule departure deadline
        this.engine.schedule({
          delay: rand.uniform(40, 80),
          type: 'outbound:depart',
          payload: { truckId: truck.id },
          handler: (p) => this._departTruck(p.truckId)
        });
      }
    }
    this._scheduleTruckArrival();
  }

  _truckSeq = 0;

  _loadTruck(truck) {
    if (!this.engine.running) return;
    if (!this.engine.paused && truck.dock && truck.dock.truck === truck) {
      const dest = this.destinations.find(d => d.id === truck.direction);
      if (dest) {
        // pull from chutes assigned to this destination
        for (const chuteId of dest.chuteIds) {
          const chute = this.chutes.find(c => c.id === chuteId);
          if (!chute) continue;
          while (truck.cargo < truck.capacity && chute.load > 0) {
            const parcel = chute.dequeue();
            if (!parcel) break;
            parcel.status = 'loaded';
            parcel.loadedAt = this.engine.time;
            truck.cargo++;
            if (this.metrics) this.metrics.onParcelLoaded(parcel);
          }
          if (truck.cargo >= truck.capacity) break;
        }
      }
    }
    if (truck.cargo < truck.capacity && truck.dock && truck.dock.truck === truck) {
      this.engine.schedule({
        delay: 0.5,
        type: 'outbound:loadTruck',
        payload: { truck },
        handler: (p) => this._loadTruck(p.truck)
      });
    }
  }

  _departTruck(truckId) {
    if (!this.engine.running) return;
    for (const dock of this.outboundDocks) {
      if (dock.truck && dock.truck.id === truckId) {
        const truck = dock.releaseTruck();
        if (truck) {
          truck.departedAt = this.engine.time;
          truck.state = 'departed';
          if (this.metrics) this.metrics.onTruckDeparted(truck);
        }
        break;
      }
    }
  }

  _loadTick() {
    if (!this.engine.running) return;
    // We don't need extra work here; loading is event-driven per truck.
    this._scheduleLoad();
  }
}
