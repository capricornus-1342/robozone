global.window = global;
require('./src/simulation.js');
const SortingCenter = global.SortingCenter;

const sim = new SortingCenter();
sim.start();

// Manually call tick with a known dt
sim.tick(0.5);
console.log("After 1 tick:", sim.t, "trucks:", sim.trucks.length);
sim.tick(0.5);
console.log("After 2 ticks:", sim.t, "trucks:", sim.trucks.length);

// Add a hook
const origTick = sim.tick.bind(sim);
let tickCount = 0;
sim.tick = function(dt) {
  tickCount++;
  const beforeT = sim.t;
  origTick(dt);
  console.log(`  tick #${tickCount} dt=${dt} t:${beforeT.toFixed(2)}->${sim.t.toFixed(2)} trucks=${sim.trucks.length}`);
};

console.log("--- with hook ---");
for (let i = 0; i < 75; i++) sim.tick(0.5);
console.log("After 75 ticks: t=", sim.t, "trucks:", sim.trucks.length);
if (sim.trucks[0]) {
  const tr = sim.trucks[0];
  console.log("truck 0: remaining=", tr.remaining, "unloadDur=", tr.unloadDuration, "arrivalAt=", tr.arrivalAt);
}