export function linear(d0, d1, r0, r1) {
  const f = (v) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
  f.invert = (p) => d0 + ((p - r0) / (r1 - r0 || 1)) * (d1 - d0);
  return f;
}

export function log10(d0, d1, r0, r1) {
  const l0 = Math.log10(d0);
  const l1 = Math.log10(d1);
  const f = (v) => r0 + ((Math.log10(Math.max(v, d0 / 1e6)) - l0) / (l1 - l0)) * (r1 - r0);
  f.invert = (p) => Math.pow(10, l0 + ((p - r0) / (r1 - r0)) * (l1 - l0));
  return f;
}

/** Round tick values covering [min, max]. */
export function ticks(min, max, count = 5) {
  const span = max - min;
  if (span <= 0) return [min];
  const raw = span / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

export function line(points) {
  let d = '';
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return d;
}

/** A bar path with a 4px rounded data end and a square baseline. */
export function barUp(x, y, w, h, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x} ${y + h}V${y + rr}Q${x} ${y} ${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${y + h}Z`;
}

export function barRight(x, y, w, h, r = 4) {
  if (w <= 0) return '';
  const rr = Math.min(r, h / 2, w);
  return `M${x} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${y + h - rr}Q${x + w} ${y + h} ${x + w - rr} ${y + h}H${x}Z`;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
