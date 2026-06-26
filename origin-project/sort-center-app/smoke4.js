global.window = global;
require('./src/simulation.js');
const SortingCenter = global.SortingCenter;

const sim = new SortingCenter();
sim.reset();
sim.setScenario("failure");
console.log("After setScenario: broken=", [...sim.failures.brokenOutputs]);
sim.start();
for (let i = 0; i < 3600; i++) sim.tick(0.5);
console.log("Samples first 10:", sim.metrics.cycleSamples.slice(0, 10));
console.log("Min:", Math.min(...sim.metrics.cycleSamples));
console.log("Max:", Math.max(...sim.metrics.cycleSamples));
console.log("Avg:", sim.metrics.cycleSamples.reduce((a,b)=>a+b,0)/sim.metrics.cycleSamples.length);
console.log("processed:", sim.metrics.processed);
console.log("ByRegion:", sim.metrics.byRegion);
console.log("Events:", sim.events.slice(0,5));