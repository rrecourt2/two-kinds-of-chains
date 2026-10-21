// Survivorship bias (chapter 11), after Abraham Wald's work on bomber damage
// (1943). Planes are hit at random places. A hit on a vital part (an engine or
// the cockpit) brings a plane down with chance `vital`; hits elsewhere rarely do.
// Only the planes that come back can be inspected.

import { makeRng, poisson } from './rng.js';

// A top-down bomber in a 400 × 320 box, nose up.
export const VIEW = { w: 400, h: 320 };
export const ENGINES = [70, 132, 268, 330].map((cx) => ({ cx, cy: 132, rx: 13, ry: 24 }));
export const SHAPES = {
  fuselage: { x: 186, y: 20, w: 28, h: 280 },
  wings: { x: 24, y: 122, w: 352, h: 34 },
  tail: { x: 140, y: 268, w: 120, h: 22 },
};
export const ZONES = [
  { id: 'engines', label: 'Engines' },
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'body', label: 'Body' },
  { id: 'wings', label: 'Wings' },
  { id: 'tail', label: 'Tail' },
];
const OTHER_RISK = { body: 0.05, wings: 0.05, tail: 0.12 };

const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const inEngine = (x, y) => ENGINES.some((e) => ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 <= 1);

/** Which part of the plane a point is in, or null if it misses. */
export function zoneAt(x, y) {
  if (inEngine(x, y)) return 'engines';
  if (inRect(SHAPES.fuselage, x, y)) return y < 64 ? 'cockpit' : y > 262 ? 'tail' : 'body';
  if (inRect(SHAPES.tail, x, y)) return 'tail';
  if (inRect(SHAPES.wings, x, y)) return 'wings';
  return null;
}

// The area of each part, measured once on a fine grid, so hits can be counted per unit of area.
export const AREA = (() => {
  const area = Object.fromEntries(ZONES.map((z) => [z.id, 0]));
  for (let x = 0; x < VIEW.w; x += 1) for (let y = 0; y < VIEW.h; y += 1) {
    const z = zoneAt(x + 0.5, y + 0.5);
    if (z) area[z] += 1;
  }
  return area;
})();

/**
 * Send out `planes` planes. Each takes 1 + Poisson(1.5) hits spread evenly over the plane.
 * Returns every hit with whether its plane came back, and counts per part.
 */
export function simulateRaid({ planes = 200, vital = 0.6, seed = 7 } = {}) {
  const rng = makeRng(seed);
  const hits = [];
  let returned = 0;
  const vitalHit = { planes: 0, returned: 0 }; // planes hit at least once in an engine or the cockpit
  const otherOnly = { planes: 0, returned: 0 }; // planes hit only elsewhere
  const byZone = Object.fromEntries(ZONES.map((z) => [z.id, { returned: 0, lost: 0 }]));
  for (let p = 0; p < planes; p++) {
    const k = 1 + poisson(rng, 1.5);
    const mine = [];
    let survives = true;
    while (mine.length < k) {
      const x = rng() * VIEW.w;
      const y = rng() * VIEW.h;
      const zone = zoneAt(x, y);
      if (!zone) continue;
      mine.push({ x, y, zone });
      const risk = zone === 'engines' || zone === 'cockpit' ? vital : OTHER_RISK[zone];
      if (rng() < risk) survives = false;
    }
    if (survives) returned++;
    const group = mine.some((h) => h.zone === 'engines' || h.zone === 'cockpit') ? vitalHit : otherOnly;
    group.planes++;
    if (survives) group.returned++;
    for (const h of mine) {
      hits.push({ ...h, returned: survives });
      byZone[h.zone][survives ? 'returned' : 'lost']++;
    }
  }
  // Holes per 1,000 units of area, so big and small parts can be compared.
  const density = Object.fromEntries(
    ZONES.map((z) => [z.id, { returned: (1000 * byZone[z.id].returned) / AREA[z.id], lost: (1000 * byZone[z.id].lost) / AREA[z.id] }]),
  );
  return { hits, returned, planes, byZone, density, vitalHit, otherOnly };
}
