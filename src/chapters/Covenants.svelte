<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { COVENANTS, MAX, YEARS, PORTFOLIO, year, catchesEnough, meansEnough, SOLVING } from '../lib/sim/covenants.js';
  import { MONTHS } from '../lib/sim/tollroad.js';

  // "The year" is context, not a lever: it appears once the puzzle is closed.
  const game = getContext('tkc-game');
  const revealed = $derived(!game.isOpen('covenants'));

  const START = MAX; // a loan agreement with the full dozen
  const ANSWER = SOLVING[Math.floor(SOLVING.length / 2)]; // three, the middle of two to four
  let n = $state(START);
  let when = $state('normal');
  let width = $state(560);

  const y = $derived(year(n, revealed ? when : 'normal'));
  const pct = (v) => `${Math.round(v * 100)}%`;
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const lower = (s) => s[0].toLowerCase() + s.slice(1);

  // The numbers the text quotes, from the model.
  const one = year(1);
  const shown = year(ANSWER);
  const all = year(MAX);
  // The after-text's words for the year (one in five, two in five, about three in four) are checked in
  // test/covenants.test.js.

  // ---- Puzzle ----
  const caughtOk = $derived(catchesEnough(y));
  const meansOk = $derived(meansEnough(y));
  const goalMet = $derived(caughtOk && meansOk);
  // The setting the reader solved with, so that the found text describes it.
  let solvedWith = $state(null);
  $effect(() => {
    if (game.isOpen('covenants')) solvedWith = goalMet ? n : null;
  });
  const foundText = $derived.by(() => {
    const w = year(solvedWith ?? ANSWER);
    return `Two to four strong covenants: with ${WORDS[w.n]}, ${w.caught} of the ${w.breaches} breaches mean real trouble; more covenants add mostly false alarms.`;
  });
  const puzzle = $derived({
    goal: 'Set the covenants so that at least 3 in 4 borrowers in real trouble breach, and at least 1 breach in 3 means real trouble.',
    met: goalMet,
    checks: [
      { label: `At least 3 in 4 in real trouble breach (now ${y.caught} of ${y.trouble})`, ok: caughtOk },
      { label: `At least 1 breach in 3 means real trouble (now ${y.caught} of ${y.breaches})`, ok: meansOk },
    ],
    progress: !caughtOk
      ? `Most breaches mean real trouble, but ${y.missed} of the ${y.trouble} borrowers in trouble trip nothing.`
      : !meansOk
        ? `${y.alarms} healthy borrowers breach too: a breach means real trouble ${pct(y.means)} of the time, against ${pct(y.base)} before any covenant was read.`
        : '',
    hints: [
      'Each orange square is a healthy borrower in breach: a false alarm, and a waiver to decide.',
      'The first few covenants catch most of the trouble; the later ones trip mostly on healthy borrowers.',
    ],
    found: foundText,
  });
  const showAnswer = () => ((n = ANSWER), (when = 'normal'), (solvedWith = ANSWER));

  const rules = [
    `${PORTFOLIO} borrowers; in a normal year, ${one.trouble} are in real trouble.`,
    'Each covenant trips for some borrowers in trouble, and for some healthy ones.',
    'Covenants are added strongest first; a borrower that trips any one is in breach.',
  ];
  const addedLast = $derived(n === 1 ? `Only ${lower(COVENANTS[0].name)}.` : `Strongest first; added last: ${lower(COVENANTS[n - 1].name)}.`);

  // ---- The portfolio: one square per borrower, those in real trouble above the healthy ones ----
  const cols = $derived(width >= 500 ? 25 : 20);
  const cell = $derived(Math.min(24, width / cols));
  const gap = $derived(Math.max(1.5, cell * 0.17));
  const side = $derived(cell - gap);
  const LBL = 22; // the label band above each group
  const SEP = 12; // space between the groups
  // The same height in every year: the most rows any year needs.
  const rowsOf = (count) => Math.ceil(count / cols);
  const maxRows = $derived(
    Math.max(
      ...Object.values(YEARS).map(({ base }) => {
        const t = Math.round(PORTFOLIO * base);
        return rowsOf(t) + rowsOf(PORTFOLIO - t);
      }),
    ),
  );
  const H = $derived(Math.round(2 * LBL + SEP + maxRows * cell));
  const right = $derived(cols * cell - gap);
  const top1 = LBL;
  const label2 = $derived(top1 + rowsOf(y.trouble) * cell + SEP + LBL - 8);
  const top2 = $derived(top1 + rowsOf(y.trouble) * cell + SEP + LBL);
  const at = (i, top) => ({ x: (i % cols) * cell, y: top + Math.floor(i / cols) * cell });
  // In each group, the borrowers in breach come first.
  const troubleSquares = $derived(Array.from({ length: y.trouble }, (_, i) => ({ ...at(i, top1), kind: i < y.caught ? 'caught' : 'missed' })));
  const healthySquares = $derived(Array.from({ length: y.healthy }, (_, i) => ({ ...at(i, top2), kind: i < y.alarms ? 'alarm' : 'quiet' })));

  const plural = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  const summary = $derived(
    `${PORTFOLIO} borrowers in a ${YEARS[y.key].label.toLowerCase()} year, ${plural(n, 'covenant', 'covenants')} on each loan. ` +
      `${y.trouble} are in real trouble: ${y.missed ? `${y.caught} breach a covenant and ${y.missed} do not` : `all ${y.trouble} breach a covenant`}. ` +
      `${y.healthy} are healthy: ${y.alarms} breach a covenant anyway. ${y.caught} of the ${y.breaches} breaches mean real trouble.`,
  );
</script>

<Chapter
  n={17}
  kicker="Covenants"
  title="A warning light, not a tripwire"
  lede="Covenants watch a loan for as long as it runs. What a breach is worth depends on what else could have tripped it."
  puzzle="covenants"
>
  {#snippet setup()}
    <p>
      The conditions in the disbursement chapter stand before the money moves. Covenants stay for the life of the loan:
      the borrower keeps its debt service cover above a floor, its leverage below a ceiling, its audited accounts on
      time. A breach is usually an event of default, which the lender then waives or acts on.
    </p>
    <p>
      Each covenant is another link in the loan’s chain, and a test. It trips for many borrowers heading into real
      trouble, and now and then for a healthy one having a bad quarter. A loan agreement can carry a dozen, each added
      for a good reason.
    </p>
    <p>
      A development lender has {PORTFOLIO} borrowers. In a normal year, about {one.trouble} of them are in real trouble.
      A covenant trips. What has the lender learnt?
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Two hundred borrowers, one year" sub="Each square is a borrower. A borrower in breach has tripped at least one covenant this year." {rules}>
      <Puzzle id="covenants" {...puzzle} onshow={showAnswer} />

      <div class="tkc-controls">
        <div class="ctl">
          <Slider id="cv-n" label="Covenants per loan" bind:value={n} min={1} max={MAX} />
          <p class="tkc-caption">{addedLast}</p>
        </div>
        {#if revealed}
          <div class="ctl">
            <Segmented
              name="cv-year"
              label="The year"
              bind:value={when}
              options={Object.entries(YEARS).map(([value, v]) => ({ value, label: v.label }))}
            />
            <p class="tkc-caption">
              Borrowers in real trouble: {Object.values(YEARS)
                .map((v) => Math.round(PORTFOLIO * v.base))
                .join(', ')
                .replace(/, (\d+)$/, ' or $1')} of {PORTFOLIO}.
            </p>
          </div>
        {/if}
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label={summary}>
          <text class="tkc-axis-title" x="0" y={LBL - 8}>In real trouble · {y.trouble}</text>
          <text class="count caught" x={right} y={LBL - 8} text-anchor="end">{y.caught} caught</text>
          {#each troubleSquares as s, i (i)}
            <rect class="sq {s.kind}" x={s.x} y={s.y} width={side} height={side} rx="2" />
          {/each}

          <text class="tkc-axis-title" x="0" y={label2}>Healthy · {y.healthy}</text>
          <text class="count alarm" x={right} y={label2} text-anchor="end">{plural(y.alarms, 'false alarm', 'false alarms')}</text>
          {#each healthySquares as s, i (i)}
            <rect class="sq {s.kind}" x={s.x} y={s.y} width={side} height={side} rx="2" />
          {/each}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch" style:background="var(--tkc-options)" aria-hidden="true"></span>Caught by a breach</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-ink)" aria-hidden="true"></span>Missed</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)" aria-hidden="true"></span>False alarm</span>
          <span><span class="tkc-swatch quiet-key" aria-hidden="true"></span>No breach</span>
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat
          label="Trouble caught"
          value="{y.caught} of {y.trouble}"
          sub={y.missed ? `${y.missed} in real trouble trip nothing` : 'every one in real trouble breaches'}
          swatch="var(--tkc-options)"
        />
        <Stat label="A breach means trouble" value="{y.caught} of {y.breaches}" sub="{pct(y.means)}, against {pct(y.base)} before the breach" />
      </div>

      {#snippet model()}
        <p>
          Each covenant has two rates, professional estimates rather than data: the share of borrowers in real trouble it
          trips for in a year, and the share of healthy ones. Strongest first:
          {COVENANTS.map((c) => `${lower(c.name)} ${+(c.hit * 100).toFixed(1)}% and ${+(c.noise * 100).toFixed(1)}%`).join('; ')}.
        </p>
        <p>
          Covenants trip independently of each other; in practice the financial ones move together, so the later ones
          would catch even less. The squares show the expected numbers, rounded to whole borrowers. The year changes only
          how many borrowers are in real trouble: {Object.values(YEARS)
            .map((v) => pct(v.base))
            .join(', ')
            .replace(/, ([^,]+)$/, ' or $1')}.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Of {PORTFOLIO} borrowers in a normal year, {one.trouble} are in real trouble. {COVENANTS[0].name} alone trips for
      {one.caught} of them and for {one.alarms} of the {one.healthy} healthy ones: {one.caught} of its {one.breaches}
      breaches mean trouble, but {one.missed} in trouble pass unseen. With all {WORDS[MAX]}, every borrower in trouble
      breaches, and so do {all.alarms} healthy ones: a breach means real trouble {all.caught} times in {all.breaches},
      little more than the {pct(all.base)} chance before it. Like the toll road’s {MONTHS} good months, it is evidence
      that would have come either way.
    </p>
    <p>
      If every breach is a default acted on as written, each covenant is a link in a chain of
      <span class="tkc-and">ANDs</span>, and with {WORDS[MAX]}, noise alone breaks the loan for three healthy borrowers in
      five a year; each breach becomes a waiver. If a breach means a closer look, it is an <span class="tkc-or">OR</span>: the loan goes on
      if the covenants hold or the look finds the borrower sound. The chain bends on noise.
    </p>
    <h3>Fewer, stronger links</h3>
    <p>
      {WORDS[ANSWER][0].toUpperCase() + WORDS[ANSWER].slice(1)} covenants catch {shown.caught} of the {shown.trouble} in
      trouble; the other {WORDS[MAX - ANSWER]} add {all.caught - shown.caught}, and {all.alarms - shown.alarms} false alarms.
      William of Ockham wrote that plurality should never be posited without necessity; the razor’s familiar wording,
      that entities must not be multiplied beyond necessity, came three centuries later.
    </p>
    <p>
      The same breach means more when trouble is common. With {WORDS[ANSWER]} covenants, it means real trouble one
      time in five in a calm year, two in five in a normal one and about three in four in a crisis.
    </p>
    <p>
      Thomas Bayes worked out this arithmetic in an essay published in 1763, two years after his death: a belief before
      the evidence, the evidence, the belief after. A breach read as a reason to look closer is how a lender learns about
      a borrower, and how the chain learns.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our covenants have ever told us something we did not already know?">
      <p>
        Covenant lists tend to grow: a new template keeps the old covenants and adds the lesson of the last problem loan.
        Studies of private loans find covenants set tightly, as tripwires, and breaches common and often unrelated to
        distress. Waivers are usually decided one breach at a time; a record of what past breaches turned out to mean is
        rarer.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @container fig (max-width: 340px) {
    .two :global(.tkc-stat-value) {
      font-size: 1.375rem;
    }
  }
  .ctl {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .tkc-chart svg {
    display: block;
  }
  .sq {
    transition: fill 200ms ease;
  }
  .sq.caught {
    fill: var(--tkc-options);
  }
  .sq.missed {
    fill: var(--tkc-ink);
  }
  .sq.alarm {
    fill: var(--tkc-conditions);
  }
  .sq.quiet {
    fill: color-mix(in srgb, var(--tkc-muted) 24%, var(--tkc-surface));
  }
  .quiet-key {
    background: color-mix(in srgb, var(--tkc-muted) 24%, var(--tkc-surface));
  }
  .count {
    font-size: 12px;
    font-weight: 600;
  }
  .count.caught {
    fill: var(--tkc-options-ink);
  }
  .count.alarm {
    fill: var(--tkc-conditions-ink);
  }
  @media (prefers-reduced-motion: reduce) {
    .sq {
      transition: none;
    }
  }
</style>
