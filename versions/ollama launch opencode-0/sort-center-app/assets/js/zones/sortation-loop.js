import { rand } from '../../core/random.js';
import { ParcelType } from '../domain/parcels/parcel.js';

/**
 * SortationLoop: models the ring conveyor with sorters & chutes.
 * Parcels arrive via acceptParcel() (from InductionZone) and are
 * placed in an "in transit" array. Each tick the loop:
 *   1. takes new incoming parcels (capped by loop capacity)
 *   2. scans any unscanned parcels
 *   3. tries to eject parcels whose assigned chute is reachable
 *
 * The "position" of a parcel on the loop is implicit: it is "ready
 * for sorter i" once it has been on the loop for at least i * stepTime.
 * Parcels that have visited all sorters without ejecting "wrap around"
 * — to keep things simple, we treat ejection per sorter per tick.
 */
export class SortationLoop {
  constructor({ engine, loopConveyor, scanner, chutes, sorters, wcs, metrics }) {
    this.engine = engine;
    this.conveyor = loopConveyor;
    this.scanner = scanner;
    this.chutes = chutes;
    this.sorters = sorters;
    this.wcs = wcs;
    this.metrics = metrics;
    this.tickInterval = 0.2;
    this._incoming = []; // parcels waiting to enter the loop
    this._inTransit = []; // parcels currently on the loop
    this._scheduleNext();
  }

  _scheduleNext() {
    this.engine.schedule({
      delay: this.tickInterval,
      type: 'loop:tick',
      handler: () => this._tick()
    });
  }

  acceptParcel(parcel) {
    if (this._incoming.length + this._inTransit.length < this.conveyor.capacity) {
      this._incoming.push(parcel);
    } else {
      // Loop is full: drop back to inbound queue
      if (this.metrics) this.metrics.onLoopFull();
    }
  }

  _tick() {
    if (!this.engine.running) return;
    if (!this.engine.paused) this._process();
    this.engine.schedule({
      delay: this.tickInterval,
      type: 'loop:tick',
      handler: () => this._tick()
    });
  }

  _process() {
    const t = this.engine.time;

    // 1. Admit new parcels up to capacity
    while (this._incoming.length && this._inTransit.length < this.conveyor.capacity) {
      this._inTransit.push(this._incoming.shift());
    }

    // 2. Scan & assign
    for (const parcel of this._inTransit) {
      if (!parcel.scannedAt) {
        const ok = this.scanner.scan(parcel);
        if (ok) {
          parcel.scannedAt = t;
          parcel.status = 'scanned';
          this.wcs.assign(parcel, this);
        }
      }
    }

    // 3. Try to eject — sorted by time on loop (oldest first)
    const survivors = [];
    const sorterCount = this.sorters.length;
    for (const parcel of this._inTransit) {
      if (!parcel.assignedChute) {
        survivors.push(parcel);
        continue;
      }
      const chute = this.chutes.find(c => c.id === parcel.assignedChute);
      if (!chute) {
        // Lost chute: re-assign
        this.wcs.assign(parcel, this);
        survivors.push(parcel);
        continue;
      }
      const sorter = this.sorters.find(s => s.chuteId === chute.id);
      if (!sorter) {
        survivors.push(parcel);
        continue;
      }
      const sorterIdx = this.sorters.indexOf(sorter);
      const timeOnLoop = t - (parcel.scannedAt || t);
      // Only attempt ejection once the parcel has progressed far enough on the loop
      // Each sorter corresponds to (1 / sorterCount) of the loop's circumference.
      const slot = (sorterIdx + 1) / sorterCount;
      if (timeOnLoop < this.conveyor.length / this.conveyor.effectiveSpeed * slot) {
        survivors.push(parcel);
        continue;
      }
      if (chute.isJammed) {
        this.wcs.reroute(parcel, this);
        if (parcel.assignedChute === chute.id) {
          // Still bad — let it stay on loop, will try again later
          survivors.push(parcel);
          continue;
        }
      }
      if (chute.isFull) {
        this.wcs.reroute(parcel, this);
        if (parcel.assignedChute === chute.id) {
          survivors.push(parcel);
          continue;
        }
      }
      // Eject
      const ok = sorter.eject(parcel);
      if (ok && chute.enqueue(parcel)) {
        parcel.status = 'sorted';
        parcel.sortedAt = t;
        if (this.metrics) this.metrics.onParcelSorted(parcel);
        if (parcel.type === ParcelType.FRAGILE && rand.chance(0.005)) {
          if (this.metrics) this.metrics.onFragileDamage();
        }
      } else if (!chute.enqueue(parcel)) {
        // jam
        if (this.metrics) this.metrics.onChuteJam();
        survivors.push(parcel);
      } else {
        survivors.push(parcel);
      }
    }
    this._inTransit = survivors;
    this.conveyor.parcels = this._inTransit; // for visualization compatibility
  }
}
