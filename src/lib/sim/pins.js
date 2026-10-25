// Adam Smith's pin workshop (chapter 2), as a small cost model.
// A trained pin-maker working alone makes 10 pins a day. Split the job into
// n specialist roles and each specialist does 1/n of the operations, n times
// faster than a generalist would. Every role needs at least one whole person,
// so specialists only pay off when the market keeps them busy.

export const ROLE_OPTIONS = [1, 2, 3, 4, 6, 12];
export const SOLO_PINS_PER_DAY = 10;
export const MINUTES_PER_DAY = 480;

export function workshop(demand, roles) {
  const perWorker = SOLO_PINS_PER_DAY * roles * roles; // pins a day through one role's station
  const perRole = Math.max(1, Math.ceil(demand / perWorker));
  const workers = perRole * roles;
  return {
    roles,
    perRole,
    workers,
    minutesPerPin: (workers * MINUTES_PER_DAY) / demand,
    utilization: demand / (perRole * perWorker),
  };
}

/** Minutes of real work in one pin, split among n roles: a generalist's 48 minutes, each share done n times faster. */
export function workingMinutes(roles) {
  return MINUTES_PER_DAY / SOLO_PINS_PER_DAY / roles;
}

export function bestDesign(demand) {
  return ROLE_OPTIONS.map((r) => workshop(demand, r)).reduce((best, w) =>
    w.minutesPerPin < best.minutesPerPin - 1e-9 ? w : best,
  );
}

export const MARKETS = [
  { label: 'Village', demand: 10 },
  { label: 'Town', demand: 100 },
  { label: 'City', demand: 1000 },
  { label: 'Nation', demand: 10000 },
];
