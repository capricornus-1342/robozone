// Сбор и экспорт статистики
import { generateId } from './utils.js';

export class StatisticsCollector {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.events = [];
        this.summary = {
            startTime: Date.now(),
            endTime: null,
            totalBoxesSent: 0,
            totalPalletsUnpacked: 0,
            avgTimeInSystem: 0,
            bottlenecks: {}
        };
        this.boxTimestamps = new Map();
    }

    logEvent(stage, entityId, action, details = {}) {
        this.events.push({
            timestamp: new Date(),
            simTime: details.simTime,
            stage,
            entityId,
            action,
            details
        });
    }

    trackBoxArrival(boxId, simTime) {
        this.boxTimestamps.set(boxId, { arrival: simTime });
    }

    trackBoxDeparture(boxId, simTime) {
        if (this.boxTimestamps.has(boxId)) {
            const times = this.boxTimestamps.get(boxId);
            times.departure = simTime;
            const timeInSystem = times.departure - times.arrival;

            const N = this.summary.totalBoxesSent;
            this.summary.avgTimeInSystem = (this.summary.avgTimeInSystem * N + timeInSystem) / (N + 1);
            this.summary.totalBoxesSent++;

            this.boxTimestamps.delete(boxId); // Удаляем для экономии памяти
        }
    }

    incrementPallets() {
        this.summary.totalPalletsUnpacked++;
    }

    getSummary() {
        this.summary.endTime = Date.now();
        return this.summary;
    }

    saveToJSON(filename = 'statistics') {
        const data = {
            summary: this.getSummary(),
            events: this.events
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${generateId()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
