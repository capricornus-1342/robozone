/**
 * Parcel categories with physical properties.
 * Affects induction rate, chute assignment, and handling behavior.
 */
export const ParcelType = Object.freeze({
  STANDARD: 'standard',
  FRAGILE: 'fragile',
  OVERSIZED: 'oversized',
  HAZARDOUS: 'hazardous'
});

export const PARCEL_SPECS = {
  standard:   { size: [0.3, 0.4], weight: 1.5, label: 'Стандартная',   color: '#4f9cf9' },
  fragile:    { size: [0.25, 0.35], weight: 1.0, label: 'Хрупкая',      color: '#f9c74f' },
  oversized:  { size: [0.9, 1.2],  weight: 8.0, label: 'Крупногабаритная', color: '#f9844a' },
  hazardous:  { size: [0.3, 0.4],  weight: 2.0, label: 'Опасная',       color: '#e63946' }
};

let _parcelSeq = 0;
export class Parcel {
  constructor({ type, destination, weight, size, fragile = false }) {
    this.id = ++_parcelSeq;
    this.type = type;
    this.destination = destination;
    this.weight = weight;
    this.size = size;
    this.fragile = fragile;
    this.createdAt = 0; // sim time
    this.enteredSystemAt = null; // received at inbound
    this.inductedAt = null;
    this.scannedAt = null;
    this.sortedAt = null;
    this.loadedAt = null;
    this.route = []; // visited node ids
    this.assignedChute = null;
    this.status = 'created';
    this.color = PARCEL_SPECS[type].color;
  }

  age(now) { return now - (this.enteredSystemAt || this.createdAt); }
}
