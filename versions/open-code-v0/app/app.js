const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

canvas.width = CONFIG.canvasWidth;
canvas.height = CONFIG.canvasHeight;

const POCKET_REGIONS = [
    'Москва', 'СПб', 'Казань', 'ННовгород', 'Ростов', 'Самара',
    'Екатеринбург', 'Новосибирск', 'Красноярск', 'Владивосток', 'Хабаровск', 'Иркутск',
    'Краснодар', 'Воронеж', 'Волгоград', 'Саратов', 'Тольятти', 'Ульяновск',
    'Тюмень', 'Челябинск', 'Омск', 'Томск', 'Кемерово', 'Барнаул',
    'Ярославль', 'Тверь', 'Рязань', 'Тула', 'Липецк', 'Белгород',
];

const simState = {
    dockOccupied: new Array(CONFIG.numUnloadDocks).fill(false),
    truckIds: new Array(CONFIG.numUnloadDocks).fill(null),
    currentTrucks: new Array(CONFIG.numUnloadDocks).fill(null),
    truckCounter: 0,
    totalArrived: 0,
    totalBoxesArrived: 0,
    bufferCount: 0,
    totalUnloaded: 0,
    conveyorDots: [],
    pockets: POCKET_REGIONS.map((region, i) => new Pocket(i, region, CONFIG.pocketCapacity)),
};

function logMessage(text) {
    const now = new Date();
    const time = now.toLocaleTimeString();
    console.log(`[${time}] ${text}`);
}

function render(simDt) {
    const dots = simState.conveyorDots;
    const dt = simDt || 0;

    for (let i = dots.length - 1; i >= 0; i--) {
        const dot = dots[i];
        dot.progress += dot.speed * dt;
        if (dot.progress >= 1) {
            const pocket = simState.pockets[dot.destPocket];
            if (pocket && !pocket.isFull) {
                pocket.addBox(new Box());
            }
            dots.splice(i, 1);
        }
    }

    drawLayout(ctx, CONFIG, simState);
}

function resetState() {
    simState.dockOccupied.fill(false);
    simState.truckIds.fill(null);
    simState.currentTrucks.fill(null);
    simState.truckCounter = 0;
    simState.totalArrived = 0;
    simState.totalBoxesArrived = 0;
    simState.bufferCount = 0;
    simState.totalUnloaded = 0;
    simState.conveyorDots = [];
    simState.pockets.forEach(p => { p.boxes = []; });
}

const engine = new SimulationEngine(CONFIG, simState, {
    onLog: logMessage,
    onUpdate: render,
});

render(0);
logMessage('Схема сортировочного центра загружена.');

// --- Manual event button (Stage 1) ---
document.getElementById('btn-event').addEventListener('click', () => {
    if (engine.isRunning) {
        logMessage('⚠ Сначала поставьте симуляцию на паузу для ручного события');
        return;
    }
    engine.scheduleEvent({ type: 'ARRIVAL_TRUCK' }, 0);
    engine.step();
    render(0);
});

// --- Start / Pause ---
document.getElementById('btn-start').addEventListener('click', () => {
    engine.speed = parseFloat(document.getElementById('speed-slider').value);
    engine.start();
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-pause').disabled = false;
    document.getElementById('btn-event').disabled = true;
});

document.getElementById('btn-pause').addEventListener('click', () => {
    engine.pause();
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-event').disabled = false;
});

// --- Reset ---
document.getElementById('btn-reset').addEventListener('click', () => {
    engine.reset();
    resetState();
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-event').disabled = false;
    render(0);
    logMessage('↺ Сброс. Все доки свободны.');
});

// --- Speed slider ---
document.getElementById('speed-slider').addEventListener('input', (e) => {
    const val = e.target.value;
    document.getElementById('speed-value').textContent = val + 'x';
    engine.speed = parseFloat(val);
});
