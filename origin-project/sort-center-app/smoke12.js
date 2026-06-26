global.window = global;
require('./src/simulation.js');
const SortingCenter = global.SortingCenter;

const sim = new SortingCenter();
sim.reset();
sim.setScenario("failure");
sim.start();
for (let i = 0; i < 3600; i++) sim.tick(0.5);
console.log("After failure scenario:");
console.log("  cycleSamples first 10:", sim.metrics.cycleSamples.slice(0, 10));
console.log("  min:", Math.min(...sim.metrics.cycleSamples));
console.log("  max:", Math.max(...sim.metrics.cycleSamples));
console.log("  count:", sim.metrics.cycleSamples.length);