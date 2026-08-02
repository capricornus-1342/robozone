/**
 * Random utilities — uniform and weighted sampling, gaussian for arrival bursts.
 */
export const rand = {
  uniform(min, max) { return min + Math.random() * (max - min); },
  int(min, max) { return Math.floor(this.uniform(min, max + 1)); },
  gauss(mean = 0, std = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  weighted(items, weightFn) {
    let total = 0;
    for (const it of items) total += weightFn(it);
    let r = Math.random() * total;
    for (const it of items) {
      r -= weightFn(it);
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  },
  chance(p) { return Math.random() < p; }
};
