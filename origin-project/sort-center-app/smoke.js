// Smoke test of the simulation engine
const { JSDOM } = (() => { try { return require('jsdom'); } catch (e) { return null; } })() || {};
if (!JSDOM) {
  console.log("jsdom not available — running minimal stub");
  global.window = {};
  require('./src/simulation.js');
} else {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  global.window = dom.window;
  require('./src/simulation.js');
}

const { SortingCenter, SCENARIOS, REGION_NAMES } = window;

console.log("Regions:", REGION_NAMES);

// basic
const sim = new SortingCenter();
console.log("Outputs:", sim.outputs.length, "Regions:", sim.params.regions);
console.log("First truck at:", sim.nextTruckAt);

// run 60s of model time
sim.start();
for (let i = 0; i < 120; i++) sim.tick(0.5);
const snap = sim.snapshot();
console.log("After 60s:");
console.log("  processed =", snap.metrics.processed);
console.log("  inflight  =", snap.metrics.inflight);
console.log("  trucks    =", snap.trucks.length);
console.log("  byRegion  =", snap.metrics.byRegion);
console.log("  beltLoad% =", snap._beltLoad ? "n/a" : "");
console.log("  events    =", snap.events.length);

// try failure scenario
sim.reset();
sim.setScenario("failure");
sim.start();
for (let i = 0; i < 60; i++) sim.tick(0.5);
console.log("After 30s of failure scenario:");
console.log("  broken outputs =", [...sim.failures.brokenOutputs]);
console.log("  processed      =", sim.metrics.processed);
console.log("  misorts        =", sim.metrics.misorts);

// test recover
sim.recover();
console.log("After recover, broken:", [...sim.failures.brokenOutputs]);

// test motor failure
sim.failMotor();
console.log("After motor fail, motorOk:", sim.failures.motorOk);

console.log("ALL OK");
