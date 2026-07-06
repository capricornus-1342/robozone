// Основной файл симуляции
import { config } from './config.js';
import { SimulationEngine } from './classes/SimulationEngine.js';
import { Visualizer } from './visualization.js';
import { StatisticsCollector } from './statistics.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');

    const stats = new StatisticsCollector();
    const engine = new SimulationEngine(config, stats);
    const visualizer = new Visualizer(ctx, config, engine);

    let isRunning = false;
    let lastTimestamp = 0;
    let simSpeed = 10;

    function gameLoop(timestamp) {
        if (!isRunning) return;

        const deltaTime = (timestamp - lastTimestamp) * simSpeed; // Учитываем скорость симуляции
        lastTimestamp = timestamp;

        engine.update(deltaTime / 1000); // engine.update ожидает секунды
        visualizer.draw();
        updateUI();

        requestAnimationFrame(gameLoop);
    }
    
    function start() {
        if (isRunning) return;
        isRunning = true;
        lastTimestamp = performance.now();
        requestAnimationFrame(gameLoop);
    }

    function pause() {
        isRunning = false;
    }

    function reset() {
        isRunning = false;
        engine.reset();
        visualizer.draw();
        updateUI();
    }
    
    function updateUI() {
        const simTime = engine.time;
        const days = Math.floor(simTime / 86400);
        const hours = Math.floor((simTime % 86400) / 3600);
        const minutes = Math.floor((simTime % 3600) / 60);
        document.getElementById('timeValue').textContent = `${days}д ${hours}ч ${minutes}м`;
        
        document.getElementById('boxesProcessedValue').textContent = stats.getSummary().totalBoxesSent;
        document.getElementById('unloadQueueValue').textContent = engine.docks.filter(d => d.type === 'unload').reduce((acc, d) => acc + d.queue.length, 0);
        document.getElementById('loadQueueValue').textContent = engine.docks.filter(d => d.type === 'load').reduce((acc, d) => acc + d.queue.length, 0);

        const intermediateBuffer = engine.buffers.find(b => b.id === 'intermediate');
        if (intermediateBuffer) {
            document.getElementById('bufferFillValue').textContent = `${intermediateBuffer.items.length} / ${intermediateBuffer.maxCapacity}`;
        }
        
        // Обновление таблицы карманов
        const pocketsTableBody = document.querySelector('#pocketsTable tbody');
        pocketsTableBody.innerHTML = '';
        engine.pockets.forEach(p => {
            const row = document.createElement('tr');
            const fillRate = p.boxes.length / p.capacity;
            let statusClass = 'status-filling';
            if (p.isReadyToShip()) {
                statusClass = 'status-ready';
            } else if (fillRate > 0.95) {
                statusClass = 'status-full';
            }
            row.classList.add(statusClass);

            row.innerHTML = `
                <td>${p.region}</td>
                <td>${p.boxes.length}</td>
                <td>${(fillRate * 100).toFixed(1)}%</td>
            `;
            pocketsTableBody.appendChild(row);
        });
    }

    // Привязка кнопок
    document.getElementById('startButton').addEventListener('click', start);
    document.getElementById('pauseButton').addEventListener('click', pause);
    document.getElementById('resetButton').addEventListener('click', reset);
    document.getElementById('saveStatsButton').addEventListener('click', () => stats.saveToJSON('simulation_stats'));

    // Слайдер скорости
    const speedSlider = document.getElementById('speedSlider');
    const speedValueSpan = document.getElementById('speedValue');
    speedSlider.addEventListener('input', (e) => {
        simSpeed = parseInt(e.target.value, 10);
        speedValueSpan.textContent = `${simSpeed}x`;
    });

    // Первичная отрисовка и UI
    reset();
});
