global.window = global;
require('./src/simulation.js');
const SortingCenter = global.SortingCenter;
const SCENARIOS = global.SCENARIOS;

const sim = new SortingCenter();
sim.start();
for (let i = 0; i < 3600; i++) sim.tick(0.5); // 1800s = 30min
const snap = sim.snapshot();
console.log("=== 30 минут работы ===");
console.log("Обработано:", snap.metrics.processed);
console.log("В системе:", snap.metrics.inflight);
console.log("Пропускная способность:", snap.metrics.throughput ? snap.metrics.throughput.toFixed(0) : "n/a");
console.log("Средний цикл:", snap.metrics.avgCycle, "с");
console.log("По регионам:", snap.metrics.byRegion);
console.log("Трюков отгружено:", sim.trucks.length);
console.log("Событий:", snap.events.length);

// failure scenario: ломаем 1 выход
sim.reset();
sim.setScenario("failure");
sim.start();
for (let i = 0; i < 3600; i++) sim.tick(0.5);
console.log("\n=== Сценарий 'авария выхода' (30 мин) ===");
console.log("Обработано:", sim.metrics.processed);
console.log("Misorts (уходы в резерв):", sim.metrics.misorts);
console.log("Средний цикл:", sim.metrics.cycleSamples.length ?
  (sim.metrics.cycleSamples.reduce((a,b)=>a+b,0)/sim.metrics.cycleSamples.length).toFixed(1) : 0, "с");

// baseline vs newyear comparison
const baseline = new SortingCenter();
baseline.start();
for (let i = 0; i < 3600; i++) baseline.tick(0.5);
console.log("\nБазовый snapshot metrics:", Object.keys(baseline.snapshot().metrics));
console.log("Базовый throughput:", baseline.snapshot().metrics.throughput);
console.log("Базовый history len:", baseline.snapshot().history.length);
const newyear = new SortingCenter();
newyear.setScenario("newyear");
newyear.start();
for (let i = 0; i < 3600; i++) newyear.tick(0.5);

console.log("\n=== Сравнение сценариев (30 мин) ===");
console.log("Базовый:    processed =", baseline.metrics.processed,
            ", avg cycle =", baseline.metrics.cycleSamples.length ?
            (baseline.metrics.cycleSamples.reduce((a,b)=>a+b,0)/baseline.metrics.cycleSamples.length).toFixed(1) : 0);
console.log("Новый год:  processed =", newyear.metrics.processed,
            ", avg cycle =", newyear.metrics.cycleSamples.length ?
            (newyear.metrics.cycleSamples.reduce((a,b)=>a+b,0)/newyear.metrics.cycleSamples.length).toFixed(1) : 0);

console.log("\nALL OK");
