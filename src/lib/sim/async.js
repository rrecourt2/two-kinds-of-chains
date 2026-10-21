// Asynchronous work (chapter 5), after Andrew Grove's breakfast factory. The same
// pieces of work are done one after another, each waiting for a handoff, or in
// parallel, starting together and meeting once at the end. A mistake in the first
// piece can be caught at the start or found only when the pieces come together.

export const EXAMPLES = {
  breakfast: {
    unit: 'minutes',
    short: 'min',
    handoff: 0,
    mistake: 'A bad egg',
    // Nothing depends on anything else: all three start at once.
    pieces: [
      { id: 'egg', label: 'Egg', time: 3 },
      { id: 'toast', label: 'Toast', time: 1 },
      { id: 'coffee', label: 'Coffee', time: 1 },
    ],
  },
  request: {
    unit: 'days',
    short: 'days',
    handoff: 1,
    mistake: 'A mistake in the client data',
    // The client data is the shared record every other piece is built on.
    pieces: [
      { id: 'data', label: 'Client data', time: 1, base: true },
      { id: 'credit', label: 'Credit analysis', time: 4 },
      { id: 'es', label: 'E&S review', time: 3 },
      { id: 'legal', label: 'Legal documents', time: 2 },
      { id: 'pricing', label: 'Pricing', time: 1 },
    ],
  },
};

export const CHECK_TIME = 0.5; // catching a bad input at the start: a quick check and a fix

/**
 * Bars for a Gantt chart of one way of working.
 * mode: 'sequence' | 'parallel'; handoff: wait before each piece is picked up;
 * faster: ids of pieces done twice as fast; mistake: 'none' | 'end' | 'start'.
 * Returns { bars: [{ row, start, end, kind }], total, waiting, rework, slowest }.
 * kind: 'work' | 'wait' | 'redo' | 'check'.
 */
export function schedule(example, { mode, handoff = example.handoff, faster = [], mistake = 'none' }) {
  const pieces = example.pieces.map((p, row) => ({ ...p, row, time: faster.includes(p.id) ? p.time / 2 : p.time }));
  const base = pieces.find((p) => p.base);
  const rest = pieces.filter((p) => !p.base);
  const first = pieces[0];
  const bars = [];
  let waiting = 0;
  let rework = 0;
  // A handoff wait, drawn on every row that waits for it and counted once.
  const wait = (rows, at) => {
    if (handoff > 0) {
      for (const row of [].concat(rows)) bars.push({ row, start: at, end: at + handoff, kind: 'wait' });
      waiting += handoff;
    }
    return at + handoff;
  };

  // One pass of the work from time t. Returns when the pieces are ready to deliver.
  const pass = (t, kind, skipBase = false) => {
    if (mode === 'sequence') {
      pieces.forEach((p, i) => {
        if (skipBase && p.base) return;
        if (i > 0 || skipBase) t = wait(p.row, t);
        bars.push({ row: p.row, start: t, end: t + p.time, kind });
        t += p.time;
      });
      return wait(pieces[pieces.length - 1].row, t);
    }
    if (base && !skipBase) {
      bars.push({ row: base.row, start: t, end: t + base.time, kind });
      t += base.time;
    }
    const group = base ? rest : pieces;
    if (base) t = wait(group.map((p) => p.row), t);
    const start = t;
    let end = t;
    for (const p of group) {
      bars.push({ row: p.row, start, end: start + p.time, kind });
      end = Math.max(end, start + p.time);
    }
    return base ? wait(group.map((p) => p.row), end) : end;
  };

  let t = 0;
  if (mistake === 'start') {
    // The first piece is checked before any work is built on it.
    bars.push({ row: first.row, start: 0, end: CHECK_TIME, kind: 'check' });
    t = CHECK_TIME;
  }
  let total = pass(t, 'work');
  if (mistake === 'end') {
    // Found when the pieces meet: fix the first piece, then redo everything built on it.
    const before = total;
    if (base) {
      bars.push({ row: base.row, start: total, end: total + base.time, kind: 'redo' });
      total = pass(total + base.time, 'redo', true);
    } else {
      bars.push({ row: first.row, start: total, end: total + first.time, kind: 'redo' });
      total += first.time;
    }
    rework = total - before;
  }
  const group = base ? rest : pieces;
  const slowest = group.reduce((a, b) => (b.time > a.time ? b : a)).id;
  return { bars, total, waiting, rework, slowest };
}
