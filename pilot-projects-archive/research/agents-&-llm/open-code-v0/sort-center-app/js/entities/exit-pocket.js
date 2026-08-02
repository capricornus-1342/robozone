import { Config } from '../config/parameters.js';

export class ExitPocket {
    constructor(index, region, x, y, angle) {
        this.index = index;
        this.region = region;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.width = Config.exitPocket.width;
        this.height = Config.exitPocket.height;
        this.faulted = false;
        this.faultTimer = 0;
        this.buffer = [];
        this.bufferCapacity = Config.buffer.capacity;
        this.processed = 0;
        this.active = true;
        this.diverting = false;
        this.divertTimer = 0;
    }

    get bufferFull() {
        return this.buffer.length >= this.bufferCapacity;
    }

    get isAvailable() {
        return this.active && !this.faulted && !this.bufferFull;
    }

    addFault(duration) {
        this.faulted = true;
        this.faultTimer = duration;
    }

    update(dt) {
        if (this.faulted) {
            this.faultTimer -= dt;
            if (this.faultTimer <= 0) {
                this.faulted = false;
            }
        }
        if (this.diverting) {
            this.divertTimer -= dt;
            if (this.divertTimer <= 0) {
                this.diverting = false;
            }
        }
    }
}
