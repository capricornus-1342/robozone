/**
 * Destination = geographic direction (region/city/PVZ route).
 * Chutes are mapped to destinations; each destination is served by one or more chutes.
 */
let _destSeq = 0;
export class Destination {
  constructor({ name, region, code, weight = 1 }) {
    this.id = ++_destSeq;
    this.name = name;
    this.region = region;
    this.code = code;
    this.weight = weight; // demand share
    this.chuteIds = [];
  }

  attachChute(chuteId) {
    if (!this.chuteIds.includes(chuteId)) this.chuteIds.push(chuteId);
  }

  detachChute(chuteId) {
    this.chuteIds = this.chuteIds.filter(id => id !== chuteId);
  }
}
