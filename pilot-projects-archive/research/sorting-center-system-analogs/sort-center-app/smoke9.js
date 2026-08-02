global.window = global;
require('./src/simulation.js');
const SortingCenter = global.SortingCenter;

const sim = new SortingCenter();
sim.start();
for (let i = 0; i < 100; i++) {
  sim.tick(0.5);
  if (i < 10 || i % 10 === 0) {
    const tr = sim.trucks[0];
    const state = sim.pkgs.reduce((acc, p) => { acc[p.state]=(acc[p.state]||0)+1; return acc; }, {});
    if (tr) {
      console.log(`tick ${i} t=${sim.t.toFixed(1)} _emitted=${(tr._emitted || 0).toFixed(3)} unloadDur=${tr.unloadDuration.toFixed(2)} remaining=${tr.remaining.toFixed(2)} state=${tr.state} pkgs=${sim.pkgs.length} states=${JSON.stringify(state)}`);
    } else {
      console.log(`tick ${i} t=${sim.t.toFixed(1)} no truck`);
    }
  }
}