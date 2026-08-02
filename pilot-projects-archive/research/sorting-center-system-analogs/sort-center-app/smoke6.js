global.window = global;
require('./src/simulation.js');
const SortingCenter = global.SortingCenter;

const sim = new SortingCenter();
sim.start();
for (let i = 0; i < 3600; i++) sim.tick(0.5);
const stateCounts = {};
for (const p of sim.pkgs) {
  stateCounts[p.state] = (stateCounts[p.state] || 0) + 1;
}
console.log("Package states at t=1800:", stateCounts);
console.log("Total pkgs in array:", sim.pkgs.length);
console.log("metrics.processed:", sim.metrics.processed);
console.log("By region processed:", sim.metrics.byRegion);
console.log("Outputs served:", sim.outputs.map(o => o.served).slice(0, 12));
console.log("Output buffers len:", sim.outputs.map(o => o.buffer.length).slice(0, 12));
console.log("Trucks active:", sim.trucks.length);