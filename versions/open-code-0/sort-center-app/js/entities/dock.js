import { Config } from '../config/parameters.js';

export class Dock {
    constructor(x, y, type, index) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.index = index;
        this.width = Config.dock.width;
        this.height = Config.dock.height;
        this.occupied = false;
        this.parcels = [];
        this.maxParcels = 50;
    }

    get color() {
        return this.type === 'inbound' ? Config.dock.inboundColor : Config.dock.outboundColor;
    }
}
