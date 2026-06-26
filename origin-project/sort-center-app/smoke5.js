global.window = global;
require('./src/simulation.js');
const SortingCenter = global.SortingCenter;

const sim = new SortingCenter();
sim.start();
for (let i = 0; i < 3600; i++) sim.tick(0.5);
console.log("sortTimestamps count:", sim.metrics.sortTimestamps.length);
console.log("first 5:", sim.metrics.sortTimestamps.slice(0, 5));
console.log("history last 3:", sim.history.slice(-3));
console.log("processed:", sim.metrics.processed);