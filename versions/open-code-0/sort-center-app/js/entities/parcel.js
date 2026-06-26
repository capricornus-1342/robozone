import { Config } from '../config/parameters.js';

let _parcelId = 0;

export class Parcel {
    constructor(region, type = 'standard') {
        this.id = ++_parcelId;
        this.region = region;
        this.type = type;
        this.color = Config.parcel.colors[type];
        this.size = type === 'large' ? 14 : Config.parcel.size;

        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.progress = 0;
        this.visible = false;

        this.state = 'waiting';
        this.scanned = false;
        this.assignedExit = null;
        this.divertProgress = 0;
        this.bufferIndex = -1;
        this.timeInSystem = 0;
        this.timeOnConveyor = 0;

        this._divertTarget = null;
    }

    reset(region, type) {
        this.region = region;
        this.type = type;
        this.color = Config.parcel.colors[type];
        this.size = type === 'large' ? 14 : Config.parcel.size;
        this.progress = 0;
        this.visible = false;
        this.state = 'waiting';
        this.scanned = false;
        this.assignedExit = null;
        this.divertProgress = 0;
        this.bufferIndex = -1;
        this.timeInSystem = 0;
        this.timeOnConveyor = 0;
        this._divertTarget = null;
    }
}

export function createParcel() {
    const regions = Config.regions;
    const region = regions[Math.floor(Math.random() * regions.length)];
    const r = Math.random();
    const type = r < 0.75 ? 'standard' : r < 0.9 ? 'large' : 'fragile';
    return new Parcel(region, type);
}
