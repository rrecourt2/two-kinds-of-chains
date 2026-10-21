// Puzzle scores for one reader. Solving without a hint or a wrong try earns 2 points,
// solving with help earns 1, and asking to see the answer earns none. Scores stay in
// this browser, so a reader can come back to them later; nothing is sent anywhere.

const KEY = 'two-chains-puzzles-v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function createGame(ids) {
  const state = $state({ puzzles: load() });
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state.puzzles));
    } catch {
      /* storage can be blocked; the score then lasts for this visit */
    }
  };
  const entry = (id) => state.puzzles[id] ?? { status: 'open', help: 0 };
  const update = (id, patch) => {
    state.puzzles[id] = { ...entry(id), ...patch };
    save();
  };

  return {
    ids,
    entry,
    isOpen: (id) => entry(id).status === 'open',
    /** A hint or a wrong answer: the puzzle can still be solved, for one point. */
    help(id) {
      if (entry(id).status === 'open') update(id, { help: entry(id).help + 1 });
    },
    solve(id) {
      const e = entry(id);
      if (e.status === 'open') update(id, { status: 'solved', points: e.help ? 1 : 2 });
    },
    show(id) {
      if (entry(id).status === 'open') update(id, { status: 'shown', points: 0 });
    },
    reset() {
      state.puzzles = {};
      save();
    },
    get score() {
      return ids.reduce((sum, id) => sum + (state.puzzles[id]?.points ?? 0), 0);
    },
    get solved() {
      return ids.filter((id) => state.puzzles[id]?.status === 'solved').length;
    },
    get max() {
      return ids.length * 2;
    },
  };
}
