global.window = global;
require('./src/simulation.js');
const SortingCenter = global.SortingCenter;

const sim = new SortingCenter();
sim.start();
for (let i = 0; i < 3600; i++) sim.tick(0.5);
console.log("Samples:", sim.metrics.cycleSamples.slice(0, 5));
console.log("Min:", Math.min(...sim.metrics.cycleSamples));
console.log("Max:", Math.max(...sim.metrics.cycleSamples));
console.log("Avg:", sim.metrics.cycleSamples.reduce((a,b)=>a+b,0)/sim.metrics.cycleSamples.length);
console.log("processed:", sim.metrics.processed);
console.log("ByRegion:", sim.metrics.byRegion);