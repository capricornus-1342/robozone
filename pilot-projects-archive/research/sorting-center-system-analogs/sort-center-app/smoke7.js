global.window = global;
require('./src/simulation.js');
const SortingCenter = global.SortingCenter;

const sim = new SortingCenter();
sim.start();
for (let i = 0; i < 600; i++) sim.tick(0.5); // 300s = 5 min
console.log("At t=300:");
console.log("  metrics.processed =", sim.metrics.processed);
console.log("  state shipped =", sim.pkgs.filter(p => p.state === "shipped").length);
console.log("  state sorted =", sim.pkgs.filter(p => p.state === "sorted").length);
console.log("  state on-belt =", sim.pkgs.filter(p => p.state === "on-belt").length);
console.log("  state queued =", sim.pkgs.filter(p => p.state === "queued").length);
console.log("  total pkgs =", sim.pkgs.length);
console.log("  sum should be processed =", sim.pkgs.filter(p => ["sorted","shipped"].includes(p.state)).length);
console.log("  byRegion sum =", sim.metrics.byRegion.reduce((a,b)=>a+b,0));
console.log("  sortTimestamps len =", sim.metrics.sortTimestamps.length);

// continue
for (let i = 0; i < 3000; i++) sim.tick(0.5);
console.log("At t=1800:");
console.log("  metrics.processed =", sim.metrics.processed);
console.log("  state shipped =", sim.pkgs.filter(p => p.state === "shipped").length);
console.log("  sum sorted+shipped =", sim.pkgs.filter(p => ["sorted","shipped"].includes(p.state)).length);
console.log("  byRegion sum =", sim.metrics.byRegion.reduce((a,b)=>a+b,0));
console.log("  sortTimestamps len =", sim.metrics.sortTimestamps.length);