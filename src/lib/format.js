export const pct = (v, digits = 0) => `${(v * 100).toFixed(digits)}%`;

export function days(v) {
  const n = Math.round(v);
  return `${n} working day${n === 1 ? '' : 's'}`;
}

export function shortDays(v, cap) {
  const n = Math.round(v);
  if (cap && n >= cap) return `${cap}+`;
  return `${n}`;
}

/** Wealth multiples: ×131, ×1.6, ×0.42, ×0.005. */
export function multiple(v) {
  if (!Number.isFinite(v)) return '—';
  if (v >= 100) return `×${Math.round(v).toLocaleString('en-US')}`;
  if (v >= 10) return `×${v.toFixed(0)}`;
  if (v >= 1) return `×${v.toFixed(1)}`;
  if (v >= 0.1) return `×${v.toFixed(2)}`;
  if (v >= 0.001) return `×${v.toFixed(3)}`;
  return `×${v.toExponential(0)}`;
}

/** Axis ticks on a log scale of multiples: ×0.001 … ×1 … ×10,000. */
export function multipleTick(v) {
  return `×${v >= 1 ? Math.round(v).toLocaleString('en-US') : String(+v.toPrecision(1))}`;
}

export function signedPct(factor, digits = 1) {
  const v = (factor - 1) * 100;
  const s = v.toFixed(digits);
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${s.replace('-', '')}%`;
}

export const int = (v) => Math.round(v).toLocaleString('en-US');

export function hours(v) {
  if (v < 1) return `${Math.round(v * 60)} min`;
  const n = v < 10 ? v.toFixed(1) : Math.round(v).toString();
  return `${n} hours`.replace(/^1\.0 hours$/, '1 hour');
}
