// The story’s named ideas, and the small note that opens on each underlined one (src/lib/ui/IdeaNotes.svelte).
//
// A note gives the idea’s name, one short definition in the story’s voice and the chapter where the idea is first
// met (`first`, a chapter id from src/chapters/index.js). `mark` is the underline the name is shown with: the
// hues of AND and OR, the ink of IF, the dotted grey of the other ideas. Every number comes from a chapter’s
// model; test/ideas.test.js checks them.
//
// A span finds its idea from its own text (`ideaOf`), so no chapter needs to say which note it wants: case,
// plurals, “a”/“the” and the other names below all lead to the same note. Text that names no idea (“Good
// complexity” on the opening page, say) gets no note.

export const IDEAS = {
  and: {
    name: 'AND',
    mark: 'and',
    first: 'riddle',
    text: 'Every link must hold, so the chances multiply: six links that each hold 95% of the time all hold 74% of the time.',
  },
  or: {
    name: 'OR',
    mark: 'or',
    first: 'riddle',
    text: 'Any one of several will do, so only the failures multiply: a check that clears a loan 95% of the time, given a backup just as good, holds it up once in 400.',
  },
  if: {
    name: 'IF',
    mark: 'if',
    first: 'contagion',
    text: 'A line that switches the outcome: short of it nothing changes, past it everything does. A bank with capital of 5% of its assets survives a loss of 4.9% and fails at 5.1%.',
  },
  quorum: {
    name: 'Quorum',
    mark: 'idea',
    first: 'riddle',
    text: 'Any four of six, say: between an AND, which needs all six, and an OR, which needs any one. Six people each in on nine days in ten are all in on 53% of days; any four, on 98%.',
  },
  tipping: {
    name: 'Tipping point',
    mark: 'idea',
    first: 'queues',
    text: 'Where a little more starts to change a lot: below it effects grow gently, past it they run away. A one-hour review waits four hours with its reviewer 80% busy, nine at 90%, nineteen at 95%.',
  },
  loop: {
    name: 'Loop',
    mark: 'idea',
    first: 'emergence',
    text: 'Cause and effect in a circle. One that feeds itself runs on: a fast-track mark saves under a day while one deal in ten has one, 78 days once nine in ten do. One that steadies itself holds a level, like a thermostat.',
  },
  sequence: {
    name: 'One after another',
    mark: 'idea',
    first: 'async',
    text: 'Each link waits for the one before, so the times add up, waits included: the five pieces of one client request take sixteen days this way, five of them spent waiting for handoffs. Side by side, seven.',
  },
  parallel: {
    name: 'Side by side',
    mark: 'idea',
    first: 'async',
    text: 'Links that run at the same time: the last to finish sets the date, so speeding up any other changes nothing. The five pieces of one client request take seven days side by side, sixteen one after another.',
  },
  falsePositive: {
    name: 'False positive',
    mark: 'idea',
    first: 'gate',
    text: 'An alarm with nothing behind it. When the real thing is rare, most alarms are false: with twelve covenants on each of 200 loans, 113 of a normal year’s 123 breaches fall on healthy borrowers.',
  },
};

// Every way the text may name an idea, after lower-casing, dropping a leading article and a plural “s”.
const ALIASES = {
  and: 'and',
  or: 'or',
  if: 'if',
  quorum: 'quorum',
  quora: 'quorum',
  'tipping point': 'tipping',
  'tipping-point': 'tipping',
  loop: 'loop',
  'feedback loop': 'loop',
  'reinforcing loop': 'loop',
  'balancing loop': 'loop',
  'one after another': 'sequence',
  'one after the other': 'sequence',
  then: 'sequence',
  'in sequence': 'sequence',
  'side by side': 'parallel',
  alongside: 'parallel',
  'in parallel': 'parallel',
  'false positive': 'falsePositive',
  'false alarm': 'falsePositive',
};

/** The idea a span’s text names (a key of IDEAS), or null. */
export function ideaOf(text) {
  const t = String(text ?? '')
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[\s ]+/g, ' ')
    .trim()
    .replace(/^(an?|the) /, '');
  return ALIASES[t] ?? ALIASES[t.replace(/e?s$/, '')] ?? ALIASES[t.replace(/s$/, '')] ?? null;
}
