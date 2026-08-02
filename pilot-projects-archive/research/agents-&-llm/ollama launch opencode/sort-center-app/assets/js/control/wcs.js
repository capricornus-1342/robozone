import { ParcelType } from '../domain/parcels/parcel.js';

/**
 * WCS = Warehouse Control System. The "brain" of the facility.
 * - assigns parcels to chutes
 * - reroutes when chutes are jammed / full
 * - can dynamically reassign chute → destination (e.g. surge handling)
 */
export class WCSController {
  constructor({ destinations, chutes, sorters, metrics, onAssignment }) {
    this.destinations = destinations;
    this.chutes = chutes;
    this.sorters = sorters;
    this.metrics = metrics;
    this.onAssignment = onAssignment;
    this.reservedChuteIds = new Set();
  }

  /**
   * Find a chute for a destination. If none in the destination's pool,
   * try to find a free "reserved" chute and reassign it.
   */
  _pickChute(dest) {
    for (const id of dest.chuteIds) {
      const c = this.chutes.find(c => c.id === id);
      if (c && c.operational && !c.isFull) return c;
    }
    // fallback: any free chute (with capacity)
    const free = this.chutes.find(c => c.operational && !c.isFull && c.load < c.capacity);
    if (free) {
      // Reassign temporarily
      free.destination = dest.id;
      return free;
    }
    return null;
  }

  assign(parcel, loop) {
    const dest = this.destinations.find(d => d.id === parcel.destination);
    if (!dest) return;
    const chute = this._pickChute(dest);
    if (!chute) {
      if (this.metrics) this.metrics.onNoChuteAvailable();
      return;
    }
    parcel.assignedChute = chute.id;
    if (this.onAssignment) this.onAssignment(parcel, chute);
  }

  reroute(parcel, loop) {
    const dest = this.destinations.find(d => d.id === parcel.destination);
    if (!dest) return;
    // Filter current chute out
    const alternatives = this.chutes.filter(c => c.operational && !c.isFull && c.id !== parcel.assignedChute);
    if (!alternatives.length) {
      if (this.metrics) this.metrics.onRerouteFailed();
      return;
    }
    // Prefer same destination
    const same = alternatives.filter(c => c.destination === dest.id);
    const choice = same.length ? same[Math.floor(Math.random() * same.length)] : alternatives[0];
    if (choice.destination !== dest.id) choice.destination = dest.id; // borrow
    parcel.assignedChute = choice.id;
    if (this.metrics) this.metrics.onReroute();
  }

  /**
   * Dynamically reassign a free chute from reserve pool to a destination
   * (used by "surge" scenarios).
   */
  reserveChute() {
    const c = this.chutes.find(c => c.operational && !this.reservedChuteIds.has(c.id));
    if (!c) return null;
    this.reservedChuteIds.add(c.id);
    return c;
  }
}
