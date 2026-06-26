import { Config } from '../config/parameters.js';

export class Dashboard {
    constructor(wcs, building) {
        this.wcs = wcs;
        this.building = building;

        this._elProcessed = document.getElementById('m-processed');
        this._elInSystem = document.getElementById('m-in-system');
        this._elThroughput = document.getElementById('m-throughput');
        this._elAvgTime = document.getElementById('m-avg-time');
        this._elConveyorLoad = document.getElementById('m-conveyor-load');
        this._elExitStats = document.getElementById('exit-stats');
        this._elEventLog = document.getElementById('event-log');
        this._elStandard = document.getElementById('m-standard');
        this._elLarge = document.getElementById('m-large');
        this._elFragile = document.getElementById('m-fragile');
        this._elFaults = document.getElementById('m-faults');
        this._elRerouted = document.getElementById('m-rerouted');
        this._elBuffersFull = document.getElementById('m-buffers-full');

        this._eventEntries = [];
        this._maxEvents = 30;

        this._setupListeners();
    }

    _setupListeners() {
        const engine = this.wcs.engine;

        engine.bus.on('parcel:arrive', ({ parcel, time }) => {
            this._addEvent(`Посылка #${parcel.id} (${parcel.region.name}) на входе`, 'arrival');
        });

        engine.bus.on('parcel:sorted', ({ parcel, exit, time }) => {
            this._addEvent(`Посылка #${parcel.id} → ${exit.region.name}`, 'departure');
        });

        engine.bus.on('parcel:reroute', ({ parcel, time }) => {
            this._addEvent(`Посылка #${parcel.id} перенаправлена`, 'reroute');
        });

        engine.bus.on('fault:start', ({ exit, duration }) => {
            this._addEvent(`СБОЙ: Выход "${exit.region.name}" (${duration.toFixed(1)}с)`, 'fault');
        });
    }

    _addEvent(text, type) {
        this._eventEntries.unshift({ text, type, time: this.wcs.engine.time });
        if (this._eventEntries.length > this._maxEvents) {
            this._eventEntries.pop();
        }
    }

    update() {
        this._elProcessed.textContent = this.wcs.stats.processed;
        this._elInSystem.textContent = this.wcs.stats.inSystem;
        this._elThroughput.textContent = this.wcs.getThroughputPerMinute() + ' шт/мин';

        const avgTime = this.wcs.stats.processed > 0
            ? (this.wcs.parcels.reduce((s, p) => s + p.timeInSystem, 0) / Math.max(1, this.wcs.parcels.length)).toFixed(1)
            : '0.0';
        this._elAvgTime.textContent = avgTime + ' с';

        const load = Math.min(100, Math.round((this.wcs.stats.inSystem / 50) * 100));
        this._elConveyorLoad.textContent = load + '%';

        this._elStandard.textContent = this.wcs.stats.typeCounts.standard;
        this._elLarge.textContent = this.wcs.stats.typeCounts.large;
        this._elFragile.textContent = this.wcs.stats.typeCounts.fragile;

        this._elFaults.textContent = this.building.getFaultedCount();
        this._elRerouted.textContent = this.wcs.stats.rerouted;
        this._elBuffersFull.textContent = this.building.getBuffersFullCount();

        this._renderExitStats();
        this._renderEventLog();
    }

    _renderExitStats() {
        const exits = this.building.exits;
        let html = '';

        for (const exit of exits) {
            const ratio = exit.buffer.length / exit.bufferCapacity;
            const color = exit.faulted ? '#ef5350' : exit.bufferFull ? '#e65100' : exit.region.color;
            html += `
                <div class="exit-bar">
                    <span class="exit-bar-label" style="color:${exit.region.color}">${exit.region.name}</span>
                    <div class="exit-bar-track">
                        <div class="exit-bar-fill" style="width:${ratio * 100}%;background:${color}"></div>
                    </div>
                    <span class="exit-bar-count">${exit.buffer.length}</span>
                </div>
            `;
        }

        this._elExitStats.innerHTML = html;
    }

    _renderEventLog() {
        let html = '';
        for (const e of this._eventEntries) {
            html += `<div class="event-entry ${e.type}">${e.text}</div>`;
        }
        this._elEventLog.innerHTML = html;
    }
}
