export class StatisticsCollector {
    constructor() {
        this.events = [];
        this.startTime = Date.now();
    }

    logEvent(event) {
        this.events.push({
            timestamp: event.timestamp || 0,
            stage: event.stage || '',
            entityId: event.entityId || '',
            action: event.action || '',
            details: event.details || '',
            realTime: new Date().toISOString()
        });
    }

    generateSummary() {
        const stages = {};
        for (const e of this.events) {
            if (!stages[e.stage]) stages[e.stage] = 0;
            stages[e.stage]++;
        }

        const byAction = {};
        for (const e of this.events) {
            if (!byAction[e.action]) byAction[e.action] = 0;
            byAction[e.action]++;
        }

        return {
            totalEvents: this.events.length,
            stages,
            byAction,
            runDurationMs: Date.now() - this.startTime,
            generatedAt: new Date().toISOString()
        };
    }

    saveToJSON() {
        const summary = this.generateSummary();
        const data = JSON.stringify({ events: this.events, summary }, null, 2);
        this._download(data, 'simulation_stats.json', 'application/json');
    }

    saveToCSV() {
        const headers = ['timestamp', 'stage', 'entityId', 'action', 'details', 'realTime'];
        const rows = this.events.map(e => [
            e.timestamp,
            e.stage,
            e.entityId,
            e.action,
            `"${(e.details || '').replace(/"/g, '""')}"`,
            e.realTime
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        this._download(csv, 'simulation_stats.csv', 'text/csv');
    }

    _download(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        if (window.showSaveFilePicker) {
            window.showSaveFilePicker({ suggestedName: filename })
                .then(handle => handle.createWritable())
                .then(writable => writable.write(blob))
                .then(writable => writable.close())
                .catch(() => this._fallbackDownload(blob, filename));
        } else {
            this._fallbackDownload(blob, filename);
        }
    }

    _fallbackDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
