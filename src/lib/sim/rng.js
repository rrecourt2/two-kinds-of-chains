// Seeded random numbers, so every viewer sees the same simulated month,
// network or century until they ask for a new one.

export function makeRng(seed = 1) {
  let a = seed >>> 0 || 1;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normal(rng) {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export function poisson(rng, mean) {
  if (mean <= 0) return 0;
  if (mean < 40) {
    const limit = Math.exp(-mean);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rng();
    } while (p > limit);
    return k - 1;
  }
  return Math.max(0, Math.round(mean + Math.sqrt(mean) * normal(rng)));
}

export function exponential(rng, mean) {
  return -Math.log(1 - rng()) * mean;
}

export function median(values) {
  return quantile(values, 0.5);
}

export function quantile(values, q) {
  if (!values.length) return NaN;
  const sorted = Float64Array.from(values).sort();
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
