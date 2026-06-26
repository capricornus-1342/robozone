import { Observable } from '../../core/observable.js';

let _id = 0;
/**
 * Scanner = KPP for parcels. Reads barcode, captures weight/dimensions.
 * Has redundancy: primary + 1-2 backups.
 */
export class Scanner extends Observable {
  constructor({ name, position = { x: 0, y: 0 } }) {
    super();
    this.id = ++_id;
    this.name = name;
    this.position = position;
    this.devices = [{ ok: true }, { ok: true }, { ok: true }];
    this.scanCount = 0;
    this.missCount = 0;
  }

  get ok() { return this.devices.some(d => d.ok); }

  failOneDevice() {
    const live = this.devices.findIndex(d => d.ok);
    if (live < 0) return false;
    this.devices[live].ok = false;
    this.notify('deviceFailed');
    return true;
  }

  scan(parcel) {
    if (!this.ok) {
      this.missCount++;
      this.notify('miss');
      return false;
    }
    this.scanCount++;
    this.notify('scan', { parcel });
    return true;
  }
}
