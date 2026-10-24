// Covenants as warning lights (chapter “A warning light, not a tripwire”).
//
// A development lender has 200 borrowers. In a year, some are in real trouble (2% in a calm year, 5% in a normal
// one, 20% in a crisis). Each covenant on a loan is a test with two rates: the share of borrowers in real trouble
// it trips for during the year (its hit rate), and the share of healthy borrowers it trips for anyway (its noise:
// a bad quarter, late accounts). A borrower is in breach when any of its covenants trips. Covenants are added
// strongest first and trip independently of each other.
//
// The figure and the text use natural frequencies: the expected numbers of borrowers, rounded to whole borrowers.
// “What a breach means” is the share of borrowers in breach who are in real trouble (Bayes’ rule, counted).

export const PORTFOLIO = 200;

/** Strongest first. hit: share of borrowers in real trouble it trips for in a year; noise: share of healthy ones.
 *  Professional estimates for the model, not data. */
export const COVENANTS = [
  { id: 'dscr', name: 'Debt service cover', hit: 0.6, noise: 0.02 },
  { id: 'leverage', name: 'Leverage', hit: 0.45, noise: 0.025 },
  { id: 'current', name: 'Current ratio', hit: 0.3, noise: 0.02 },
  { id: 'equity', name: 'Minimum equity', hit: 0.25, noise: 0.02 },
  { id: 'borrowing', name: 'Additional borrowing', hit: 0.15, noise: 0.05 },
  { id: 'capex', name: 'Capital spending', hit: 0.12, noise: 0.05 },
  { id: 'dividends', name: 'Dividends', hit: 0.1, noise: 0.05 },
  { id: 'audited', name: 'Audited accounts on time', hit: 0.3, noise: 0.2 },
  { id: 'quarterly', name: 'Quarterly reports on time', hit: 0.2, noise: 0.15 },
  { id: 'esap', name: 'Environmental and social action plan', hit: 0.15, noise: 0.12 },
  { id: 'insurance', name: 'Insurance renewed', hit: 0.12, noise: 0.1 },
  { id: 'ownership', name: 'Change of ownership', hit: 0.05, noise: 0.045 },
];
export const MAX = COVENANTS.length;

/** The year sets how many borrowers are in real trouble: the base rate, before any covenant is read. */
export const YEARS = {
  calm: { label: 'Calm', base: 0.02 },
  normal: { label: 'Normal', base: 0.05 },
  crisis: { label: 'Crisis', base: 0.2 },
};

/** The puzzle: at least 3 in 4 borrowers in real trouble breach, and at least 1 breach in 3 means real trouble. */
export const TARGET = { caught: 3 / 4, means: 1 / 3 };

/** With the n strongest covenants: the chance that a borrower in real trouble breaches, and that a healthy one does. */
export function rates(n) {
  let miss = 1;
  let quiet = 1;
  for (let k = 0; k < n; k++) {
    miss *= 1 - COVENANTS[k].hit;
    quiet *= 1 - COVENANTS[k].noise;
  }
  return { caught: 1 - miss, alarm: 1 - quiet };
}

/** Bayes’ rule, exactly: the chance that a borrower in breach is in real trouble. */
export function posterior(n, base) {
  const r = rates(n);
  const t = base * r.caught;
  return t / (t + (1 - base) * r.alarm);
}

/**
 * One year of the portfolio in whole borrowers, with the n strongest covenants on each loan.
 * trouble: borrowers in real trouble; healthy: the rest; caught: in trouble and in breach; missed: in trouble, no
 * breach; alarms: healthy and in breach (false alarms); breaches: all borrowers in breach; means: caught / breaches.
 */
export function year(n, key = 'normal') {
  const base = YEARS[key].base;
  const trouble = Math.round(PORTFOLIO * base);
  const healthy = PORTFOLIO - trouble;
  const r = rates(n);
  const caught = Math.round(trouble * r.caught);
  const alarms = Math.round(healthy * r.alarm);
  const breaches = caught + alarms;
  return {
    n,
    key,
    base,
    trouble,
    healthy,
    caught,
    missed: trouble - caught,
    alarms,
    quiet: healthy - alarms,
    breaches,
    means: breaches ? caught / breaches : 0,
    exact: posterior(n, base),
  };
}

export const catchesEnough = (y) => y.caught >= TARGET.caught * y.trouble;
export const meansEnough = (y) => y.breaches > 0 && y.means >= TARGET.means;
export const solves = (y) => catchesEnough(y) && meansEnough(y);

/** Every number of covenants that meets both checks in a normal year: two, three and four. */
export const SOLVING = Array.from({ length: MAX }, (_, i) => i + 1).filter((n) => solves(year(n)));
