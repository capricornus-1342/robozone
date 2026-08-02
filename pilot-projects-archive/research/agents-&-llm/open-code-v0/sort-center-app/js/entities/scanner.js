import { Config } from '../config/parameters.js';

export class Scanner {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Config.scanner.size;
        this.color = Config.scanner.color;
        this.scanning = false;
        this.scanTimer = 0;
        this.scanParcel = null;
    }

    startScan(parcel) {
        this.scanning = true;
        this.scanTimer = Config.scanner.scanDuration;
        this.scanParcel = parcel;
    }

    update(dt) {
        if (!this.scanning) return false;

        this.scanTimer -= dt;
        if (this.scanTimer <= 0) {
            this.scanning = false;
            const parcel = this.scanParcel;
            this.scanParcel = null;
            if (parcel) {
                parcel.scanned = true;
            }
            return true;
        }
        return false;
    }
}
