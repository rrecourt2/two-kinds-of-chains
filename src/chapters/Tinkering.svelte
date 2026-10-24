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
  import { scenes, meets, WORLDS, TARGET, BUDGET, PILOT, READ, FUTURES, MAX_PILOTS, PUZZLE_WORLD } from '../lib/sim/tinkering.js';
  import { log10, line } from '../lib/scales.js';
  import { int } from '../lib/format.js';

  // "Results are" opens once the puzzle is solved or its answer shown.
  const game = getContext('tkc-game');
  const revealed = $derived(!game.isOpen('tinkering'));

  const ANSWER = 12;
  let pilots = $state(1); // one big programme, no pilots
  let kind = $state(PUZZLE_WORLD);
  let width = $state(560);

  // Every setting of every world, from the same 1,000 futures, worked out once.
  const S = scenes();
  const world = $derived(revealed ? kind : PUZZLE_WORLD);
  const sc = $derived(S[world]);
  const run = $derived(sc.runs[pilots]);
  const base = $derived(sc.runs[1]);

  // ---- Words and numbers, all from the model ----
  const pct = (v) => (v === 0 ? '0%' : v < 0.01 ? `${(v * 100).toFixed(1)}%` : `${Math.round(v * 100)}%`);
  const ONES = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const words = (n) => (n < 20 ? ONES[n] : `${n < 30 ? 'twenty' : 'thirty'}${n % 10 ? `-${ONES[n % 10]}` : ''}`);
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const U = S[PUZZLE_WORLD];
  const fits = U.runs.filter((r) => r && meets(r)).map((r) => r.n);
  const T = {
    from: fits[0],
    to: fits[fits.length - 1],
    t1: int(U.runs[1].typical),
    w1: int(U.runs[1].worst),
    below1: pct(U.runs[1].below),
    t12: int(U.runs[ANSWER].typical),
    w12: int(U.runs[ANSWER].worst),
    below12: pct(U.runs[ANSWER].below),
    pred12: int(S.predictable.runs[ANSWER].typical),
    wildN: S.wild.bestN,
    wildT: int(S.wild.runs[S.wild.bestN].typical),
  };

  const rules = [
    'A budget of 100; a typical approach returns what it costs, but results vary widely.',
    `Each pilot costs ${PILOT} and shows roughly how well its approach works.`,
    'The rest scales up the approach whose pilot did best.',
  ];

  const progress = $derived(
    pilots > T.to
      ? `Each pilot costs ${PILOT}: with ${pilots} of them, ${BUDGET - PILOT * pilots} is left to put behind the best.`
      : pilots > 1 && pilots < T.from
        ? `The best of ${words(pilots)} pilots is often only an ordinary approach.`
        : '',
  );
  const puzzle = $derived({
    goal: 'Results are unpredictable. Split the budget so the typical result at least doubles one big programme’s, and the worst one in ten still returns 100.',
    met: world === PUZZLE_WORLD && meets(run),
    checks: [
      { label: `Typical result at least ${TARGET.typical} (now ${int(run.typical)})`, ok: run.typical >= TARGET.typical },
      { label: `Worst one in ten at least ${TARGET.worst} (now ${int(run.worst)})`, ok: run.worst >= TARGET.worst },
    ],
    progress,
    hints: [
      `One big programme bets all 100 on a single approach. A pilot costs ${PILOT}, and shows which approaches to drop.`,
      'Too few pilots, and the best of them is often ordinary; too many, and little is left to put behind it.',
    ],
    found: `${cap(words(T.from))} to ${words(T.to)} pilots: with twelve, the typical result is ${T.t12} and the worst one in ten ${T.w12}, against ${T.t1} and ${T.w1}.`,
  });
  function showAnswer() {
    pilots = ANSWER;
    kind = PUZZLE_WORLD;
  }

  // ---- The chart: one dot per future, stacked in columns on a log scale of what the 100 returns ----
  const H = 264;
  const m = { top: 42, right: 14, bottom: 44, left: 14 };
  const LO = 0.8;
  const HI = 12500;
  const BASE = H - m.bottom;
  const span = $derived(Math.max(width, 240));
  const x = $derived(log10(LO, HI, m.left, span - m.right));
  const narrow = $derived(span < 420);
  const cw = $derived(narrow ? 3 : 4); // column width
  const r = $derived(cw / 2 - 0.25);
  const x100 = $derived(x(BUDGET));
  // Columns start at 100, so a column holds only futures below it or only futures at or above it.
  const column = (v) => Math.floor((x(Math.min(HI, Math.max(LO, v))) - x100) / cw);
  function counts(values) {
    const c = new Map();
    for (const v of values) {
      const k = column(v);
      c.set(k, (c.get(k) ?? 0) + 1);
    }
    return c;
  }
  // One vertical scale for every setting of a world, so the stacks change only when the futures do.
  const pitch = $derived.by(() => {
    let most = 1;
    for (let n = 1; n <= MAX_PILOTS; n++) for (const c of counts(sc.runs[n].values).values()) most = Math.max(most, c);
    return Math.min(cw, (BASE - m.top - 8 - 2 * r) / Math.max(1, most - 1));
  });
  const top = (c) => BASE - c * pitch - Math.min(1, c) * Math.max(0, 2 * r - pitch);

  const dots = $derived.by(() => {
    const filled = new Map();
    return Array.from(run.values, (v) => {
      const k = column(v);
      const i = filled.get(k) ?? 0;
      filled.set(k, i + 1);
      return { cx: x100 + (k + 0.5) * cw, cy: BASE - r - i * pitch, low: v < BUDGET };
    });
  });

  // One big programme's spread, as a softened outline of its stacks.
  const outline = $derived.by(() => {
    const c = counts(base.values);
    const keys = [...c.keys()];
    const k0 = Math.min(...keys) - 2;
    const k1 = Math.max(...keys) + 2;
    const raw = Array.from({ length: k1 - k0 + 1 }, (_, i) => c.get(k0 + i) ?? 0);
    const kernel = [1, 2, 3, 2, 1];
    const soft = raw.map((_, i) => kernel.reduce((s, w, j) => s + w * (raw[i + j - 2] ?? 0), 0) / 9);
    const pts = soft.map((v, i) => [x100 + (k0 + i + 0.5) * cw, top(v)]);
    return line([[pts[0][0], BASE], ...pts, [pts[pts.length - 1][0], BASE]]);
  });

  // The typical result and the worst one in ten, each labelled in a row of its own above the stacks.
  const CHAR = 6.7;
  function tag(text, at, y, prefer) {
    const w = text.length * CHAR;
    const L = m.left;
    const R = span - m.right;
    const right = at + 5 + w <= R + 4;
    const left = at - 5 - w >= L - 4;
    if (prefer === 'end' ? left : !right && left) return { text, x: at - 5, y, anchor: 'end' };
    if (right) return { text, x: at + 5, y, anchor: 'start' };
    return { text, x: Math.max(L, Math.min(at + 5, R - w)), y, anchor: 'start' };
  }
  // A line runs up to its own label's row, so the label in the lower row must not sit across the line of the upper one.
  const ROWS = [14, 31];
  const across = (l, at) => {
    const w = l.text.length * CHAR;
    const x0 = l.anchor === 'end' ? l.x - w : l.x;
    return at > x0 - 3 && at < x0 + w + 3;
  };
  const marks = $derived.by(() => {
    const xt = x(run.typical);
    const xw = x(run.worst);
    const t = `Typical ${int(run.typical)}`;
    const w = `Worst one in ten ${int(run.worst)}`;
    const typicalFirst = { typical: { x: xt, tag: tag(t, xt, ROWS[0], 'start') }, worst: { x: xw, tag: tag(w, xw, ROWS[1], 'end') } };
    if (!across(typicalFirst.worst.tag, xt)) return typicalFirst;
    const worstFirst = { typical: { x: xt, tag: tag(t, xt, ROWS[1], 'start') }, worst: { x: xw, tag: tag(w, xw, ROWS[0], 'end') } };
    return across(worstFirst.typical.tag, xw) ? typicalFirst : worstFirst;
  });

  const TICKS = [1, 10, 100, 1000, 10000];
  const tickAnchor = (t) => (x(t) + 18 > span ? 'end' : x(t) - 18 < 0 ? 'start' : 'middle');

  const plan = $derived(pilots === 1 ? 'one big programme' : `${pilots} pilots first`);
  const describe = $derived(
    `${int(FUTURES)} futures, ${plan}, results ${WORLDS.find((w) => w.id === world).label.toLowerCase()}. ` +
      `Typical result ${int(run.typical)}, worst one in ten ${int(run.worst)}; ${pct(run.below)} of futures return less than 100. ` +
      `An outline shows one big programme’s spread: typical ${int(base.typical)}, worst one in ten ${int(base.worst)}.`,
  );
</script>

<Chapter
  n={21}
  kicker="Convex tinkering"
  title="Many short chains"
  lede="One big programme is one long chain. A set of pilots is many short ones, and a short chain that fails can be dropped."
  puzzle="tinkering"
>
  {#snippet setup()}
    <p>
      Nassim Taleb calls a thing antifragile when it gains from disorder. The person in the loop was one: it kept an
      erratic AI’s brilliant drafts, dropped the wrong ones, and so turned the AI’s swings into time saved. There the
      variety came from the AI. It can also be made on purpose.
    </p>
    <p>
      A development lender has 100 to spend on a new kind of programme: finance for smallholders through mobile money,
      say, or off-grid power for clinics. There are many ways to do it, and nobody can tell in advance which will work
      where. The lender can put all of it behind one design in one big programme, or run small pilots first and put the
      rest behind the one that does best.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="One budget, a thousand futures" sub="Each dot is one possible future: what the budget of 100 returns. Gridlines step tenfold." {rules}>
      <Puzzle id="tinkering" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <Slider
          id="tk-pilots"
          label="Pilots first"
          bind:value={pilots}
          min={1}
          max={MAX_PILOTS}
          format={(v) => (v === 1 ? 'None' : `${v} pilots`)}
          ends={['One big programme', `${MAX_PILOTS} pilots`]}
        />
        {#if revealed}
          <Segmented name="tk-world" label="Results are" bind:value={kind} options={WORLDS.map((w) => ({ value: w.id, label: w.label }))} />
        {/if}
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={span} height={H} role="img" aria-label={describe}>
          {#each TICKS as t (t)}
            <line class="tkc-grid" x1={x(t)} x2={x(t)} y1={m.top} y2={BASE} />
          {/each}
          <line class="tkc-base" x1={m.left} x2={span - m.right} y1={BASE + 0.5} y2={BASE + 0.5} />

          {#each dots as d, f (f)}
            <circle class="fut" class:low={d.low} cx={d.cx} cy={d.cy} r={r} />
          {/each}
          <path class="outline" d={outline} />

          <line class="budget" x1={x100} x2={x100} y1={m.top - 4} y2={BASE} />
          <line class="typical" x1={marks.typical.x} x2={marks.typical.x} y1={marks.typical.tag.y + 5} y2={BASE} />
          <line class="worst" x1={marks.worst.x} x2={marks.worst.x} y1={marks.worst.tag.y + 5} y2={BASE} />
          {#each [marks.typical.tag, marks.worst.tag] as l (l.y)}
            <text class="tkc-label tkc-halo" x={l.x} y={l.y} text-anchor={l.anchor}>{l.text}</text>
          {/each}

          {#each TICKS as t (t)}
            <text class="tkc-axis-label" class:at-budget={t === BUDGET} x={x(t)} y={BASE + 17} text-anchor={tickAnchor(t)}>{int(t)}</text>
          {/each}
          <text class="tkc-axis-title" x={m.left + (span - m.left - m.right) / 2} y={H - 5} text-anchor="middle">What the budget of 100 returns</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-fut"></span>Returns 100 or more</span>
          <span><span class="tkc-swatch sw-low"></span>Returns less than 100</span>
          <span><span class="tkc-swatch sw-outline"></span>One big programme’s spread</span>
        </div>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat label="Typical result" value={int(run.typical)} sub={pilots === 1 ? 'half the futures do better, half worse' : `one big programme: ${int(base.typical)}`} />
        <Stat
          label="Worst one in ten"
          value={int(run.worst)}
          sub={`${pct(run.below)} of futures below 100${pilots === 1 ? '' : `; one big programme: ${pct(base.below)}`}`}
          swatch={run.worst < BUDGET ? 'var(--tkc-conditions)' : ''}
        />
      </div>

      {#snippet model()}
        <p>
          Each approach is worth a random amount per unit of money: lognormal, with a median of 1 and a spread (σ) of
          {WORLDS.map((w) => `${w.sigma} when results are ${w.label.toLowerCase()}`).join(', ')}. One big programme puts all
          100 into one approach. With n pilots, each costs {PILOT} and returns nothing itself; it reads its approach’s worth
          with an error (σ {READ}), and the remaining 100 − {PILOT}n goes into the approach whose pilot read best.
        </p>
        <p>
          Every setting meets the same {int(FUTURES)} futures, each holding {MAX_PILOTS} approaches; n pilots try the first
          n. The draws are spread evenly over the distribution, so one big programme’s typical result is 100. Stopping a
          pilot early, and learning between pilots, are left out.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Each pilot is a short chain: a few links, tested quickly, and dropped if one breaks. A pilot that fails costs
      {PILOT} and no more; one that works gets the rest of the budget behind it. Losses are capped and gains are open, a
      shape called convex, and the futures move to the right: with twelve pilots, {T.below12} of them end below 100,
      against {T.below1} for one big programme.
    </p>
    <p>
      The pilots make no approach better. They turn the spread of results into a choice, and a choice is worth more the
      wider the spread. When results are predictable, every approach does about as well as the next, the pilots find
      nothing worth their cost, and twelve of them leave a typical {T.pred12}. When results are wild, {words(T.wildN)}
      pilots do best, with a typical result of {T.wildT}. Unpredictability is what pilots are paid in.
    </p>
    <p>
      One big programme takes the swings whole: whatever its one approach turns out to be worth, the whole budget gets
      it. Real programmes often have a worse shape than this model gives them, because their surprises are mostly
      overruns. Bent Flyvbjerg and Alexander Budzier studied 1,471 IT projects: the average overran its budget by 27%,
      and one in six by about 200%.
    </p>
    <p>
      One big programme is a long chain of <span class="tkc-and">ANDs</span>: its one
      design has to be right for every client, partner and country at once. A set of pilots is an
      <span class="tkc-or">OR</span>: the programme needs only one approach to work. The OR holds only while a pilot can
      be stopped. A pilot with its own team, targets and reputation is a link that cannot be dropped.
    </p>
    <p>Evolution works this way too: it makes many small variations, most of which fail, and keeps the few that work.</p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Where is the whole design fixed before anything has been tried?">
      <p>
        Large programmes are usually appraised as a whole: the approach, the partners, the targets and the budget are
        fixed for years before the first client is reached. Some lenders build in a pilot phase instead, with reviews
        that can stop what is not working and move the money to what is.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .fut {
    fill: var(--tkc-ink-2);
    opacity: 0.5;
  }
  .fut.low {
    fill: var(--tkc-conditions);
    opacity: 0.85;
  }
  .outline {
    fill: none;
    stroke: var(--tkc-muted);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  .budget {
    stroke: var(--tkc-conditions);
    stroke-width: 1.5;
  }
  .typical,
  .worst {
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
  }
  .worst {
    stroke-dasharray: 5 3;
  }
  .at-budget {
    fill: var(--tkc-conditions-ink);
    font-weight: 700;
  }
  .sw-fut,
  .sw-low {
    border-radius: 50%;
  }
  .sw-fut {
    background: var(--tkc-ink-2);
    opacity: 0.6;
  }
  .sw-low {
    background: var(--tkc-conditions);
  }
  .sw-outline {
    width: 14px;
    height: 9px;
    border: 1.5px solid var(--tkc-muted);
    border-bottom: 0;
    border-radius: 7px 7px 0 0;
    background: none;
  }
</style>
