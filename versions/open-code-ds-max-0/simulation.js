import { SimulationEngine } from './classes/SimulationEngine.js';
import { Visualization } from './visualization.js';
import { StatisticsCollector } from './statistics.js';

export class SimulationApp {
    constructor(canvasId, config) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error(`Canvas #${canvasId} not found`);

        this.engine = new SimulationEngine(config);
        this.visualization = new Visualization(this.canvas, this.engine);
        this.stats = new StatisticsCollector();
        this.engine.setStatsCollector(this.stats);

        this.statsPanel = document.getElementById('stats-panel');
        this.pocketTable = document.getElementById('pocket-table');
        this.logPanel = document.getElementById('log-panel');

        this.setupEngineEvents();
        this.setupUI();
        this.renderLoop();
    }

    setupEngineEvents() {
        this.engine.on('frameUpdate', (stats) => {
            this.updateStatsPanel(stats);
            this.updatePocketTable(stats);
        });

        this.engine.on('statsUpdate', () => {
            this.visualization.render();
        });

        this.engine.on('statusChange', (status) => {
            const btn = document.getElementById('btn-start');
            if (btn) {
                btn.textContent = status === 'running' ? 'Pause' : 'Start';
                btn.className = status === 'running' ? 'btn btn-pause' : 'btn btn-start';
            }
            this.addLog(`System ${status}`);
        });

        this.engine.on('truckArrived', (data) => {
            this.addLog(`Truck #${data.truck.id} arrived`);
            this.updateDockInfo();
        });

        this.engine.on('truckQueued', (data) => {
            this.addLog(`Truck #${data.truck.id} queued at Dock #${data.dock.id}`);
        });

        this.engine.on('unloadComplete', (data) => {
            this.addLog(`Truck #${data.truck.id} unloaded at Dock #${data.dock.id}`);
        });

        this.engine.on('palletUnpacked', (data) => {
            this.addLog(`Pallet unpacked -> ${data.boxes} boxes`);
        });

        this.engine.on('boxSorted', (data) => {
            if (Math.random() < 0.05) {
                this.addLog(`Box sorted to pocket ${data.pocket.region}`);
            }
        });

        this.engine.on('pocketFull', (data) => {
            this.addLog(`Pocket ${data.pocket.id} FULL -> reserve buffer`);
        });

        this.engine.on('loadingStarted', (data) => {
            this.addLog(`Loading ${data.boxes} boxes for region ${data.pocket.region}`);
        });

        this.engine.on('truckDeparted', (data) => {
            this.addLog(`Truck departed with ${data.boxesCount} boxes`);
            this.updateDockInfo();
        });

        this.engine.on('balanceUpdate', (data) => {
            for (const decision of (data.decisions || [])) {
                this.addLog(`BALANCE: ${decision}`);
            }
        });
    }

    setupUI() {
        const btnStart = document.getElementById('btn-start');
        const btnReset = document.getElementById('btn-reset');
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        const btnExportJson = document.getElementById('btn-export-json');
        const btnExportCsv = document.getElementById('btn-export-csv');

        if (btnStart) {
            btnStart.addEventListener('click', () => {
                if (this.engine.isRunning) {
                    this.engine.pause();
                } else {
                    this.engine.start();
                    this.engine.run();
                }
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                this.engine.reset();
                this.stats = new StatisticsCollector();
                this.engine.setStatsCollector(this.stats);
                this.addLog('System reset');
            });
        }

        if (speedSlider && speedValue) {
            speedSlider.addEventListener('input', () => {
                const val = parseFloat(speedSlider.value);
                this.engine.speed = val;
                speedValue.textContent = `${val.toFixed(1)}x`;
            });
            speedValue.textContent = `${this.engine.speed.toFixed(1)}x`;
        }

        if (btnExportJson) {
            btnExportJson.addEventListener('click', () => this.stats.saveToJSON());
        }

        if (btnExportCsv) {
            btnExportCsv.addEventListener('click', () => this.stats.saveToCSV());
        }
    }

    updateStatsPanel(stats) {
        if (!this.statsPanel) return;

        const unload = stats.dockUtilization.unload;
        const load = stats.dockUtilization.load;

        this.statsPanel.innerHTML = `
            <div class="stat-row"><span class="stat-label">Time</span><span class="stat-value">${stats.timeFormatted}</span></div>
            <div class="stat-row"><span class="stat-label">Processed</span><span class="stat-value">${stats.totalBoxesProcessed}</span></div>
            <div class="stat-row"><span class="stat-label">Sorted</span><span class="stat-value">${stats.totalBoxesSorted}</span></div>
            <div class="stat-row"><span class="stat-label">Shipped</span><span class="stat-value">${stats.totalBoxesShipped}</span></div>
            <div class="stat-row"><span class="stat-label">Trucks In</span><span class="stat-value">${stats.totalTrucksArrived}</span></div>
            <div class="stat-row"><span class="stat-label">Trucks Out</span><span class="stat-value">${stats.totalTrucksShipped}</span></div>
            <div class="stat-row"><span class="stat-label">Main Buffer</span><span class="stat-value">${(stats.mainBufferFill * 100).toFixed(1)}% (${stats.mainBufferCount})</span></div>
            <div class="stat-row"><span class="stat-label">Reserve</span><span class="stat-value">${(stats.reserveBufferFill * 100).toFixed(1)}% (${stats.reserveBufferCount})</span></div>
            <div class="stat-row"><span class="stat-label">Unload Docks</span><span class="stat-value">${unload.busy}/${unload.total} (Q:${unload.queueTotal})</span></div>
            <div class="stat-row"><span class="stat-label">Load Docks</span><span class="stat-value">${load.busy}/${load.total} (Q:${load.queueTotal})</span></div>
            <div class="stat-row"><span class="stat-label">Workers Free</span><span class="stat-value">${stats.workersAvailable}/${stats.workersTotal}</span></div>
            <div class="stat-row"><span class="stat-label">Ready Pockets</span><span class="stat-value">${stats.pocketReadyCount}</span></div>
            <div class="stat-row"><span class="stat-label">Events Queued</span><span class="stat-value">${stats.eventsQueued}</span></div>
        `;
    }

    updatePocketTable(stats) {
        if (!this.pocketTable) return;

        let html = '<table><tr><th>P#</th><th>Reg</th><th>Count</th><th>%</th><th>Status</th></tr>';
        for (const p of stats.pocketStats) {
            const status = p.ready ? 'READY' : p.fillPercent > 85 ? 'FULL' : p.fillPercent > 50 ? 'MID' : 'OK';
            const statusClass = p.ready ? 'status-ready' : p.fillPercent > 85 ? 'status-full' : p.fillPercent > 50 ? 'status-mid' : 'status-ok';
            html += `<tr>
                <td>${p.id}</td>
                <td>${p.region}</td>
                <td>${p.count}</td>
                <td>${p.fillPercent}%</td>
                <td class="${statusClass}">${status}</td>
            </tr>`;
        }
        html += '</table>';
        this.pocketTable.innerHTML = html;
    }

    updateDockInfo() {
        const stats = this.engine.getStats();
        this.updateStatsPanel(stats);
    }

    addLog(message) {
        if (!this.logPanel) return;
        const time = this.engine.time;
        const hours = Math.floor(time / 3600000);
        const mins = Math.floor((time % 3600000) / 60000);
        const secs = Math.floor((time % 60000) / 1000);
        const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<span class="log-time">[${timeStr}]</span> ${this.escapeHtml(message)}`;
        this.logPanel.appendChild(div);

        while (this.logPanel.children.length > 100) {
            this.logPanel.removeChild(this.logPanel.firstChild);
        }

        this.logPanel.scrollTop = this.logPanel.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderLoop() {
        this.visualization.render();
        requestAnimationFrame(() => this.renderLoop());
    }
}
