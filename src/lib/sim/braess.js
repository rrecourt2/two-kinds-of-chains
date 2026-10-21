// Braess's paradox (chapter 6), after Dietrich Braess (1968). Cars go from Start to
// End by one of two routes. Each route has a main road that gets slower with
// traffic (one minute per 100 cars) and a bypass that always takes 45 minutes.
// A new link can join the end of one main road to the start of the other; it
// takes no time at all. Every driver picks the route that is fastest for them,
// so the traffic settles where no driver can gain by switching alone.

export const BYPASS = 45;
export const PER_CAR = 1 / 100;

/**
 * Where the traffic settles. Returns the cars on each route (top: main road then
 * bypass; bottom: bypass then main road; link: main road, new link, main road),
 * the minutes on each road, and everyone's journey time.
 */
export function equilibrium(cars, linkOpen) {
  const half = cars / 2;
  if (!linkOpen) {
    const main = half * PER_CAR;
    return { top: half, bottom: half, link: 0, mainMinutes: main, time: main + BYPASS };
  }
  // With the link open: everyone takes it while two packed main roads still beat a bypass.
  if (cars * PER_CAR <= BYPASS) {
    const main = cars * PER_CAR;
    return { top: 0, bottom: 0, link: cars, mainMinutes: main, time: 2 * main };
  }
  // Heavier traffic: the main roads fill until they take as long as the bypass.
  const onMain = BYPASS / PER_CAR;
  const side = Math.min(half, cars - onMain);
  const link = Math.max(0, cars - 2 * side);
  const main = (side + link) * PER_CAR;
  return { top: side, bottom: side, link, mainMinutes: main, time: main + BYPASS };
}

/**
 * The best the whole network can do with the link open: the shortest average
 * journey if routes were assigned for everyone rather than chosen by each driver.
 */
export function bestForAll(cars) {
  const full = BYPASS / PER_CAR; // cars at which a main road takes as long as a bypass
  const link = Math.min(cars, Math.max(0, full - cars));
  const side = (cars - link) / 2;
  const main = (side + link) * PER_CAR;
  const total = 2 * side * (main + BYPASS) + link * 2 * main;
  return cars > 0 ? total / cars : 0;
}
