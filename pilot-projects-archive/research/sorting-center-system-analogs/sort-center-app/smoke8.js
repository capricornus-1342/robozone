global.window = global;
require('./src/simulation.js');
const SortingCenter = global.SortingCenter;

const sim = new SortingCenter();
sim.start();
for (let i = 0; i < 100; i++) sim.tick(0.5); // 50s
console.log("At t=50:");
console.log("  processed =", sim.metrics.processed);
console.log("  pkgs total =", sim.pkgs.length);
const states = {};
for (const p of sim.pkgs) states[p.state] = (states[p.state] || 0) + 1;
console.log("  states =", states);
console.log("  trucks =", sim.trucks.length, "active");
console.log("  emitted per truck:", sim.trucks.map(tr => (tr._emitted || 0).toFixed(1)));

// Find first 3 packages that are on-belt or sorted
const samples = sim.pkgs.filter(p => p.state === "on-belt" || p.state === "sorted").slice(0, 3);
for (const p of samples) {
  console.log(`  pkg ${p.id} region=${p.region} state=${p.state} pos=${(p._beltPos || 0).toFixed(3)} assigned=${p.assignedOutput?.toFixed(3)} outIdx=${p.assignedOutputIdx}`);
}