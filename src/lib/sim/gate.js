// The gate worth keeping (chapter 12). Three payment instructions ask to change the
// bank account a disbursement goes to, a classic fraud route; one of them is fraudulent.
// The scenario stipulates that money paid to a fraudster cannot be recovered within the
// exercise. A check takes one day and always gets the answer right; it is done by the
// first qualified reviewer who is in. Three designs differ only in the order (check,
// then pay; or pay, then check) and in who may do the check (the named reviewer only,
// or any qualified reviewer: same check, same evidence, same authority).
//
// Everything is deterministic: a design and the instructions fix every date. Delay and
// loss are kept as separate outcomes; the model never trades one against the other.

export const REVIEW_DAYS = 1;
export const LAST_DAY = 6; // the timeline shows days 0 to 6

/** `named` and `deputy`: the first day each reviewer is in; null when never in. */
export const INSTRUCTIONS = Object.freeze([
  Object.freeze({ id: 'A', fraud: false, named: 0, deputy: 0 }),
  Object.freeze({ id: 'B', fraud: false, named: 4, deputy: 0 }),
  Object.freeze({ id: 'C', fraud: true, named: 4, deputy: 0 }),
]);

export const DESIGNS = Object.freeze([
  Object.freeze({ id: 'named', label: 'Check first, named reviewer only', checkFirst: true, anyQualified: false }),
  Object.freeze({ id: 'any', label: 'Check first, any qualified reviewer', checkFirst: true, anyQualified: true }),
  Object.freeze({ id: 'pay-first', label: 'Pay first, check after', checkFirst: false, anyQualified: true }),
]);

/**
 * The legal moves between states. Check first: waiting → reviewing → passed → paid, or
 * reviewing → flagged → held. Pay first: waiting → paid → reviewing → passed or flagged,
 * with the money already gone.
 */
export const NEXT = Object.freeze({
  waiting: Object.freeze(['reviewing', 'paid']),
  reviewing: Object.freeze(['passed', 'flagged']),
  passed: Object.freeze(['paid']),
  flagged: Object.freeze(['held']),
  paid: Object.freeze(['reviewing']),
  held: Object.freeze([]),
});

const design = (d) => (typeof d === 'string' ? DESIGNS.find((x) => x.id === d) : d);
const inOn = (day) => (day === null || day === undefined || !Number.isFinite(day) ? null : day);

/** Who checks the instruction, and from which day: the first qualified reviewer who is in. */
export function reviewerFor(instruction, d) {
  const candidates = [{ who: 'named', from: inOn(instruction.named) }];
  if (design(d).anyQualified) candidates.push({ who: 'deputy', from: inOn(instruction.deputy) });
  // On a tie the named reviewer takes it: the deputy only steps in when that saves time.
  return candidates.filter((c) => c.from !== null).reduce((best, c) => (best && best.from <= c.from ? best : c), null);
}

/** One instruction under one design: its history of states and the dates that matter. */
export function follow(instruction, d, { reviewDays = REVIEW_DAYS } = {}) {
  const des = design(d);
  if (!des) throw new Error(`Unknown design: ${d}`);
  const history = [{ state: 'waiting', day: 0 }];
  const go = (state, day) => {
    const last = history[history.length - 1];
    if (!NEXT[last.state].includes(state)) throw new Error(`${instruction.id}: ${last.state} → ${state} is not a legal move`);
    if (day < last.day) throw new Error(`${instruction.id}: ${state} on day ${day}, before ${last.state} on day ${last.day}`);
    history.push({ state, day });
  };

  const payDay = des.checkFirst ? null : 0;
  if (!des.checkFirst) go('paid', payDay);
  const reviewer = reviewerFor(instruction, des);
  let start = null;
  let end = null;
  if (reviewer) {
    start = Math.max(reviewer.from, payDay ?? 0);
    end = start + reviewDays;
    go('reviewing', start);
    go(instruction.fraud ? 'flagged' : 'passed', end);
    if (des.checkFirst) go(instruction.fraud ? 'held' : 'paid', end);
  }

  const at = (state) => history.find((h) => h.state === state)?.day ?? null;
  const paidAt = at('paid');
  const final = history[history.length - 1].state;
  const outcome = paidAt !== null ? (instruction.fraud ? 'paid-fraud' : 'paid') : final === 'held' ? 'held' : 'waiting';
  return {
    id: instruction.id,
    fraud: instruction.fraud,
    history,
    checkedBy: reviewer?.who ?? null,
    reviewStart: start,
    reviewEnd: end,
    paidAt,
    foundAt: at('flagged'),
    outcome,
    // Whether the check came while it could still stop the money.
    prevented: instruction.fraud && final === 'held',
  };
}

/** The state an instruction is in on a given day (a later move on the same day wins). */
export function stateOn(row, day) {
  let state = row.history[0].state;
  for (const h of row.history) if (h.day <= day) state = h.state;
  return state;
}

/**
 * One design across all the instructions. Delay and loss stay separate:
 * avgValidDays: mean day on which a valid instruction is paid (Infinity if one never is;
 * null with no valid instructions); fraudPaid: fraudulent instructions paid out.
 */
export function runDesign(d, { instructions = INSTRUCTIONS, reviewDays = REVIEW_DAYS } = {}) {
  const des = design(d);
  const rows = instructions.map((ins) => follow(ins, des, { reviewDays }));
  const valid = rows.filter((r) => !r.fraud);
  const fraud = rows.filter((r) => r.fraud);
  const validDays = valid.map((r) => (r.paidAt === null ? Infinity : r.paidAt));
  return {
    design: des.id,
    rows,
    validDays,
    avgValidDays: valid.length ? validDays.reduce((a, b) => a + b, 0) / valid.length : null,
    validUnpaid: valid.filter((r) => r.paidAt === null).length,
    fraudTotal: fraud.length,
    fraudPaid: fraud.filter((r) => r.paidAt !== null).length,
    fraudHeld: fraud.filter((r) => r.outcome === 'held').length,
    // Found by a check that came after the money had gone: detection, not prevention.
    fraudFoundAfterPayment: fraud.filter((r) => r.foundAt !== null && r.paidAt !== null && r.paidAt <= r.foundAt).length,
  };
}
