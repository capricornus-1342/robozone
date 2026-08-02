global.window = global;
require('./src/simulation.js');
const SortingCenter = global.SortingCenter;

const sim = new SortingCenter();
sim.start();
let sortedCount = 0;
let shippedCount = 0;
let assignCount = 0;

// Hook state changes
const origAssign = sim._assignOutput.bind(sim);
sim._assignOutput = function(p) {
  assignCount++;
  origAssign(p);
};

const origProcBelt = sim._processBelt.bind(sim);
sim._processBelt = function(dt) {
  const before = sim.metrics.processed;
  const beforePkgs = sim.pkgs.map(p => p.state).join("");
  origProcBelt(dt);
  const after = sim.metrics.processed;
  if (after > before) sortedCount += (after - before);
};

// hook _processOutputs
const origProcOut = sim._processOutputs.bind(sim);
sim._processOutputs = function(dt) {
  const beforeShip = sim.pkgs.filter(p => p.state === "shipped").length;
  origProcOut(dt);
  const afterShip = sim.pkgs.filter(p => p.state === "shipped").length;
  shippedCount += (afterShip - beforeShip);
};

for (let i = 0; i < 600; i++) sim.tick(0.5); // 300s
console.log("At t=300:");
console.log("  sortedCount =", sortedCount);
console.log("  shippedCount =", shippedCount);
console.log("  metrics.processed =", sim.metrics.processed);
console.log("  pkgs states:", sim.pkgs.reduce((acc, p) => { acc[p.state]=(acc[p.state]||0)+1; return acc; }, {}));
console.log("  output buffers sum =", sim.outputs.reduce((s,o)=>s+o.buffer.length, 0));