// The fast track (chapter 6): a banking version of Braess's paradox (Braess, 1968).
// Every deal needs two independent opinions, a committee's and one other, in one of two orders:
//   Route 1: regional committee, then an outside adviser's second opinion;
//   Route 2: the adviser's opinion, then the head-office committee.
// When the fast track is open, a second committee counts as the second opinion: a deal
// cleared by the regional committee may go straight to the head-office committee.
// A committee takes a working day for every two deals on its agenda; the outside opinion
// always takes 20 working days (each deal has its own adviser). Each deal team takes the route that is quickest for its own deal, so
// the deals settle where no team can gain by switching alone (a Nash, or Wardrop,
// equilibrium).

export const REVIEW_DAYS = 20;
export const DAYS_PER_DEAL = 0.5;

export const ROUTES = [
  { id: 'route1', name: 'Route 1', stages: ['regional', 'review'] },
  { id: 'route2', name: 'Route 2', stages: ['review', 'head'] },
  { id: 'fast', name: 'Fast track', stages: ['regional', 'head'] },
];

/** The agenda at which a committee takes as long as the outside opinion (40 deals). */
export const FULL = REVIEW_DAYS / DAYS_PER_DEAL;

/** Days a committee takes with this many deals a quarter on its agenda. */
export const committeeDays = (agenda) => agenda * DAYS_PER_DEAL;

/**
 * Agendas and times for a given split of deals over the routes. A route's time is
 * the time a deal on it takes, or would take if it switched to it.
 */
export function routeTimes({ route1 = 0, route2 = 0, fast = 0 }) {
  const regional = route1 + fast;
  const head = route2 + fast;
  const stage = { regional: committeeDays(regional), head: committeeDays(head), review: REVIEW_DAYS };
  const times = {
    route1: stage.regional + REVIEW_DAYS,
    route2: REVIEW_DAYS + stage.head,
    fast: stage.regional + stage.head,
  };
  const deals = route1 + route2 + fast;
  const average = deals > 0 ? (route1 * times.route1 + route2 * times.route2 + fast * times.fast) / deals : 0;
  return { agenda: { regional, head }, stage, times, average };
}

/**
 * Where the deals settle when each team takes the quickest route for its own deal.
 * Returns the split per route, the committees' agendas, each stage's days, each
 * route's time (also for routes nobody uses), and the time every deal takes.
 */
export function equilibrium({ deals, fastTrack }) {
  const n = Math.max(0, deals);
  let split;
  if (!fastTrack) {
    split = { route1: n / 2, route2: n / 2, fast: 0 };
  } else if (n <= FULL) {
    // Few deals: two committees still beat a committee and an adviser, so everyone takes the fast track.
    split = { route1: 0, route2: 0, fast: n };
  } else if (n <= 2 * FULL) {
    // More deals: the fast track fills until each committee takes as long as the adviser.
    split = { route1: n - FULL, route2: n - FULL, fast: 2 * FULL - n };
  } else {
    // So many deals that two committees are slower than a committee and an adviser.
    split = { route1: n / 2, route2: n / 2, fast: 0 };
  }
  const r = routeTimes(split);
  const used = ROUTES.filter((route) => split[route.id] > 0).map((route) => r.times[route.id]);
  const time = used.length ? Math.max(...used) : r.times.route1;
  return { deals: n, fastTrack: !!fastTrack, split, ...r, time };
}

/** The number of deals a quarter at which opening the fast track neither helps nor hurts. */
export function breakEven() {
  // With everyone on the fast track a deal takes 2 x n/2 = n days; with it closed, n/4 + 20.
  return REVIEW_DAYS / (2 * DAYS_PER_DEAL - DAYS_PER_DEAL / 2);
}

/**
 * The best split for all deals together (lowest average time), for reference and tests.
 * The chapter does not show it. Total time is convex in the split, so the symmetric
 * optimum is the global one.
 */
export function plannerOptimum({ deals, fastTrack = true }) {
  const n = Math.max(0, deals);
  if (!fastTrack) return { split: { route1: n / 2, route2: n / 2, fast: 0 }, ...routeTimes({ route1: n / 2, route2: n / 2 }) };
  // With route1 = route2 = a and fast = n - 2a, each committee has n - a deals and the
  // total is 2d(n - a)^2 + 2aR (d days per deal, R days for the adviser), smallest at
  // a = n - R / 2d, kept within [0, n/2].
  const a = Math.min(n / 2, Math.max(0, n - REVIEW_DAYS / (2 * DAYS_PER_DEAL)));
  const split = { route1: a, route2: a, fast: n - 2 * a };
  return { split, ...routeTimes(split) };
}
