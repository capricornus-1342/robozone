import { Config } from '../config/parameters.js';
import { Parcel } from '../entities/parcel.js';

export class WCS {
    constructor(building, engine) {
        this.building = building;
        this.engine = engine;
        this.parcels = [];
        this._parcelsPool = [];
        this._arrivalAccum = 0;
        this._arrivalRate = Config.arrival.defaultRate;
        this._scanQueue = [];
        this._scanTimer = 0;
        this.stats = {
            processed: 0,
            inSystem: 0,
            rerouted: 0,
            typeCounts: { standard: 0, large: 0, fragile: 0 },
        };
        this._throughputWindow = [];
    }

    setArrivalRate(rate) {
        this._arrivalRate = Math.max(1, Math.min(20, rate));
    }

    update(dt, time) {
        this._arrivalAccum += this._arrivalRate * dt;

        while (this._arrivalAccum >= 1) {
            this._arrivalAccum -= 1;
            this._spawnParcel(time);
        }

        this._processScanQueue(dt);
        this._updateParcels(dt, time);
        this._cleanupThroughput(time);
    }

    _spawnParcel(time) {
        const regions = Config.regions;
        const region = regions[Math.floor(Math.random() * regions.length)];
        const r = Math.random();
        const type = r < 0.75 ? 'standard' : r < 0.9 ? 'large' : 'fragile';

        let parcel;
        if (this._parcelsPool.length > 0) {
            parcel = this._parcelsPool.pop();
            parcel.reset(region, type);
        } else {
            parcel = new Parcel(region, type);
        }

        const b = this.building.bounds;
        const s = this.building.scale;
        parcel.x = b.x + 50 * s;
        parcel.y = b.y + b.height / 2;
        parcel.progress = 0;
        parcel.visible = true;
        parcel.state = 'scanning';
        parcel.timeInSystem = 0;
        parcel.timeOnConveyor = 0;

        this._scanQueue.push(parcel);
        this.parcels.push(parcel);
        this.stats.typeCounts[parcel.type]++;

        this.engine.bus.emit('parcel:arrive', { parcel, time });
    }

    _processScanQueue(dt) {
        if (this._scanQueue.length === 0) return;

        this._scanTimer -= dt;
        if (this._scanTimer <= 0) {
            const parcel = this._scanQueue.shift();
            if (parcel && parcel.state === 'scanning') {
                parcel.scanned = true;
                parcel.state = 'on_conveyor';
                const exit = this.building.getExitForRegion(parcel.region);
                if (exit) {
                    parcel.assignedExit = exit;
                }
            }
            this._scanTimer = 0.15;
        }
    }

    _updateParcels(dt, time) {
        const conveyor = this.building.conveyor;

        for (let i = this.parcels.length - 1; i >= 0; i--) {
            const p = this.parcels[i];
            p.timeInSystem += dt;

            if (p.state === 'on_conveyor') {
                p.timeOnConveyor += dt;
                p.progress += conveyor.getProgressForTime(dt);

                const pt = conveyor.getPointAtProgress(p.progress % 1);
                p.x = pt.x;
                p.y = pt.y;
                p.angle = pt.angle;

                if (p.assignedExit && this._shouldDivert(p, p.assignedExit)) {
                    if (p.assignedExit.isAvailable) {
                        p.state = 'diverting';
                        p.divertProgress = 0;
                        p._divertTarget = { x: p.assignedExit.x, y: p.assignedExit.y };
                        p._divertStart = { x: p.x, y: p.y };
                        this.engine.bus.emit('parcel:divert', { parcel: p, exit: p.assignedExit, time });
                    } else {
                        const newExit = this.building.getExitForRegion(p.region);
                        if (newExit && newExit !== p.assignedExit) {
                            p.assignedExit = newExit;
                            this.stats.rerouted++;
                            this.engine.bus.emit('parcel:reroute', { parcel: p, time });
                        }
                    }
                }

                if (p.progress >= 1) {
                    p.progress -= 1;
                }
            } else if (p.state === 'diverting') {
                p.divertProgress += dt * 3;
                const t = Math.min(p.divertProgress, 1);
                const ease = t * t * (3 - 2 * t);

                p.x = p._divertStart.x + (p._divertTarget.x - p._divertStart.x) * ease;
                p.y = p._divertStart.y + (p._divertTarget.y - p._divertStart.y) * ease;

                if (p.divertProgress >= 1) {
                    const exit = p.assignedExit;
                    if (exit) {
                        exit.buffer.push(p);
                        exit.processed++;
                    }
                    this.stats.processed++;
                    this._throughputWindow.push(time);
                    this.engine.bus.emit('parcel:sorted', { parcel: p, exit, time });
                    this._removeParcel(i);
                }
            }
        }

        this.stats.inSystem = this.parcels.length;
    }

    _shouldDivert(parcel, exit) {
        const b = this.building.bounds;
        const padY = Config.conveyor.loopPaddingY;
        const padX = Config.conveyor.loopPaddingX;
        const s = this.building.scale;

        const left = b.x + padX;
        const right = b.x + b.width - padX;
        const top = b.y + padY;
        const bottom = b.y + b.height - padY;

        const isTopExit = exit.y < b.y + b.height / 2;

        const dx = Math.abs(parcel.x - exit.x);
        const dy = Math.abs(parcel.y - exit.y);

        if (isTopExit) {
            return dy < 20 * s && dx < 40 * s && parcel.y < top + 15 * s;
        } else {
            return dy < 20 * s && dx < 40 * s && parcel.y > bottom - 15 * s;
        }
    }

    _removeParcel(index) {
        const parcel = this.parcels[index];
        this.parcels.splice(index, 1);
        this._parcelsPool.push(parcel);
    }

    _cleanupThroughput(time) {
        const window = 10;
        while (this._throughputWindow.length > 0 && this._throughputWindow[0] < time - window) {
            this._throughputWindow.shift();
        }
    }

    getThroughputPerMinute() {
        return Math.round((this._throughputWindow.length / 10) * 60);
    }

    triggerRandomFault() {
        const activeExits = this.building.exits.filter(e => !e.faulted);
        if (activeExits.length <= 2) return;

        const idx = Math.floor(Math.random() * activeExits.length);
        const exit = activeExits[idx];
        const duration = Config.fault.duration.min +
            Math.random() * (Config.fault.duration.max - Config.fault.duration.min);
        exit.addFault(duration);
        this.engine.bus.emit('fault:start', { exit, duration });
    }
}
