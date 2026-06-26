import { Config } from '../config/parameters.js';
import { RingConveyor } from './ring-conveyor.js';
import { Scanner } from './scanner.js';
import { ExitPocket } from './exit-pocket.js';
import { Dock } from './dock.js';

export class Building {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        const refW = 1000;
        const refH = 600;
        const scaleX = canvasWidth / refW;
        const scaleY = canvasHeight / refH;
        const scale = Math.min(scaleX, scaleY);

        const bw = Config.building.width;
        const bh = Config.building.height;

        this.bounds = {
            x: (canvasWidth - bw * scale) / 2,
            y: (canvasHeight - bh * scale) / 2,
            width: bw * scale,
            height: bh * scale,
        };
        this.scale = scale;

        this.conveyor = new RingConveyor(this.bounds);
        this.scanner = this._createScanner();
        this.exits = this._createExits();
        this.inboundDocks = this._createDocks('inbound');
        this.outboundDocks = this._createDocks('outbound');
    }

    _createScanner() {
        const b = this.bounds;
        const sx = b.x + 50 * this.scale;
        const sy = b.y + b.height / 2;
        return new Scanner(sx, sy);
    }

    _createExits() {
        const exits = [];
        const regions = Config.regions;
        const b = this.bounds;
        const s = this.scale;

        const pad = Config.conveyor.loopPaddingX;
        const padY = Config.conveyor.loopPaddingY;
        const left = b.x + pad;
        const right = b.x + b.width - pad;
        const top = b.y + padY;
        const bottom = b.y + b.height - padY;
        const midY = (top + bottom) / 2;

        const topExits = Math.ceil(regions.length / 2);
        const botExits = regions.length - topExits;

        for (let i = 0; i < topExits; i++) {
            const region = regions[i];
            const spacing = (right - left - 80 * s) / (topExits + 1);
            const x = left + 40 * s + spacing * (i + 1);
            const y = top - 24 * s;
            const angle = -Math.PI / 2;
            exits.push(new ExitPocket(i, region, x, y, angle));
        }

        for (let i = 0; i < botExits; i++) {
            const region = regions[topExits + i];
            const spacing = (right - left - 80 * s) / (botExits + 1);
            const x = left + 40 * s + spacing * (i + 1);
            const y = bottom + 24 * s;
            const angle = Math.PI / 2;
            exits.push(new ExitPocket(topExits + i, region, x, y, angle));
        }

        return exits;
    }

    _createDocks(type) {
        const docks = [];
        const b = this.bounds;
        const s = this.scale;
        const count = 5;
        const isLeft = type === 'inbound';

        for (let i = 0; i < count; i++) {
            const spacing = b.height / (count + 1);
            const x = isLeft ? b.x - 56 * s : b.x + b.width + 6 * s;
            const y = b.y + spacing * (i + 1);
            docks.push(new Dock(x, y, type, i));
        }

        return docks;
    }

    getExitForRegion(region) {
        const available = this.exits.filter(e => e.region.id === region.id && e.isAvailable);
        if (available.length > 0) {
            return available.reduce((best, e) =>
                e.buffer.length < best.buffer.length ? e : best
            );
        }
        const reserves = this.exits.filter(e => !e.region && e.isAvailable);
        if (reserves.length > 0) {
            return reserves[0];
        }
        return null;
    }

    getFaultedCount() {
        return this.exits.filter(e => e.faulted).length;
    }

    getBuffersFullCount() {
        return this.exits.filter(e => e.bufferFull).length;
    }
}
