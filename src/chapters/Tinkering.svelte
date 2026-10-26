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
  import { scenes, meets, openFuture, WORLDS, TARGET, BUDGET, PILOT, READ, FUTURES, MAX_PILOTS, PUZZLE_WORLD, OPENED } from '../lib/sim/tinkering.js';
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
  // One of the thousand futures, opened: what each pilot read, what each approach was worth, and the pick.
  const opened = $derived(openFuture(pilots, sc.sigma));

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
  const mult = (v) => `×${v < 0.1 ? v.toFixed(2) : v.toFixed(1)}`;
  const O12 = openFuture(ANSWER, U.sigma);
  const O1 = openFuture(1, U.sigma);
  const SHARE = ['', 'all', 'half', 'a third', 'a quarter', 'a fifth'][Math.round(O12.best.worth / O12.pick.worth)] ?? 'a fraction';

  const rules = [
    'A budget of 100; a typical approach returns what it costs, but results vary widely.',
    `Each pilot costs ${PILOT}, earns nothing itself, and gives a rough reading of its approach.`,
    'What is left goes behind the approach whose pilot read best.',
  ];

  const progress = $derived(
    pilots > T.to
      ? `Each pilot costs ${PILOT} and earns nothing: with ${pilots} of them, only ${BUDGET - PILOT * pilots} is left to put behind the best.`
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
      `One big programme bets all 100 on a single approach, untried. A pilot costs ${PILOT}, and shows roughly which approaches to drop.`,
      'Too few pilots, and the best of them is often ordinary; too many, and little is left to put behind it.',
    ],
    found: `${cap(words(T.from))} to ${words(T.to)} pilots: with twelve, the typical result is ${T.t12} and the worst one in ten ${T.w12}, against ${T.t1} and ${T.w1}.`,
  });
  function showAnswer() {
    pilots = ANSWER;
    kind = PUZZLE_WORLD;
  }

  // ---- The budget: coins of 2, one per pilot, and the rest behind the best ----
  const COINS = BUDGET / PILOT;
  const strip = $derived(
    pilots === 1
      ? { spent: '', rest: `All ${BUDGET} behind one approach, untried` }
      : { spent: `${PILOT * pilots} spent on ${pilots} pilots`, rest: `${BUDGET - PILOT * pilots} behind the best` },
  );

  // ---- One future, opened: each approach's worth per unit of money (a bar from ×1) and its pilot's reading (a ring) ----
  const BH = 132;
  const bm = { top: 26, bottom: 22, left: 28, right: 10 };
  const W_LO = 0.1;
  const W_HI = 10;
  const wy = (v) => {
    const t = (Math.log(Math.min(W_HI, Math.max(W_LO, v))) - Math.log(W_LO)) / (Math.log(W_HI) - Math.log(W_LO));
    return BH - bm.bottom - t * (BH - bm.top - bm.bottom);
  };
  const slot = $derived(Math.min(28, (span - bm.left - bm.right) / opened.pilots.length));
  const px = (i) => bm.left + (i + 0.5) * slot;
  const colW = $derived(Math.max(2, Math.min(12, slot - 4)));
  const WT = [
    { v: 0.25, t: '×¼' },
    { v: 1, t: '×1' },
    { v: 4, t: '×4' },
  ];
  // "Read best" by the pick's ring and "worth most" by the best bar: above their marks, or below where they would touch.
  const CW = 6.6;
  const callouts = $derived.by(() => {
    const o = opened;
    const lo = bm.left;
    const hi = span - 2;
    const floor = BH - bm.bottom + 4;
    const at = (text, i, yb, pick) => {
      const w = text.length * CW;
      const cx = Math.max(lo + w / 2, Math.min(hi - w / 2, px(i)));
      return { text, x: cx, y: yb, anchor: 'middle', pick, box: [cx - w / 2, cx + w / 2, yb - 10, yb + 3] };
    };
    const marks = (q) => {
      const ys = [wy(1), wy(q.worth)];
      if (q.read !== null) ys.push(wy(q.read) - 4, wy(q.read) + 4);
      return [Math.min(...ys), Math.max(...ys)];
    };
    const spots = (text, q, pick) => {
      const [t, b] = marks(q);
      const out = [at(text, q.n - 1, t - 6, pick)];
      if (b + 14 <= floor) out.push(at(text, q.n - 1, b + 13, pick));
      return out;
    };
    if (o.n === 1) return [at(`untried, worth ${mult(o.pick.worth)}`, 0, marks(o.pick)[0] - 6, true)];
    if (o.pick.n === o.best.n) return [spots('read best, worth most', o.pick, true)[0]];
    const hit = (u, v) => u.box[0] < v.box[1] + 4 && u.box[1] > v.box[0] - 4 && u.box[2] < v.box[3] + 1 && u.box[3] > v.box[2] - 1;
    const A = spots('read best', o.pick, true);
    const B = spots('worth most', o.best, false);
    for (const b of B) for (const a of A) if (!hit(a, b)) return [a, b];
    return [A[0], B[0]];
  });
  const numbered = (i) => slot >= 16 || i === opened.pick.n - 1 || i === opened.best.n - 1;
  const story = $derived.by(() => {
    const o = opened;
    if (o.n === 1)
      return `One big programme puts all ${BUDGET} behind approach 1, untried. In this future it is worth ${mult(o.pick.worth)}: ${int(o.result)} comes back.`;
    const head = `Pilot ${o.pick.n} read best (${mult(o.pick.read)}), so the ${o.rest} left went behind its approach`;
    if (o.pick.n === o.best.n) return `${head}, the one worth most (${mult(o.pick.worth)}): ${int(o.result)} comes back.`;
    return `${head}, worth ${mult(o.pick.worth)}: ${int(o.result)} comes back. Pilot ${o.best.n} read ${mult(o.best.read)} but was worth ${mult(o.best.worth)}.`;
  });

  // ---- The chart: one dot per future, stacked in columns on a log scale of what the 100 returns ----
  const H = 236;
  const m = { top: 52, right: 14, bottom: 44, left: 14 };
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

  // Three labelled lines, each in a row of its own above the stacks: one big programme's typical 100 on top, then the
  // worst one in ten, then the typical result. A line runs up to its own label's row, so a label is placed on the side
  // away from the lines that reach higher than it.
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
  const ROWS = [13, 28, 43];
  const marks = $derived.by(() => {
    const xt = x(run.typical);
    const xw = x(run.worst);
    const big = pilots > 1 && Math.abs(xt - x100) > 3;
    return {
      typical: { x: xt, tag: tag(`Typical ${int(run.typical)}`, xt, ROWS[2], run.typical >= BUDGET ? 'start' : 'end') },
      worst: { x: xw, tag: tag(`Worst one in ten ${int(run.worst)}`, xw, ROWS[1], run.worst < BUDGET ? 'end' : 'start') },
      big: big ? { x: x100, tag: tag(narrow ? 'Big programme: 100' : 'One big programme’s typical: 100', x100, ROWS[0], 'end') } : null,
    };
  });

  const TICKS = [1, 10, 100, 1000, 10000];
  const tickAnchor = (t) => (x(t) + 18 > span ? 'end' : x(t) - 18 < 0 ? 'start' : 'middle');

  const plan = $derived(pilots === 1 ? 'one big programme' : `${pilots} pilots first`);
  const describe = $derived(
    `${int(FUTURES)} futures, ${plan}, results ${WORLDS.find((w) => w.id === world).label.toLowerCase()}. ` +
      `Typical result ${int(run.typical)}, worst one in ten ${int(run.worst)}; ${pct(run.below)} of futures return less than 100. ` +
      `An outline shows one big programme’s spread: typical ${int(base.typical)}, worst one in ten ${int(base.worst)}. ` +
      `In the future opened above it: ${story}`,
  );
  const bandAria = $derived(
    opened.n === 1
      ? `One future, opened: one approach, untried, worth ${mult(opened.pick.worth)}.`
      : `One future, opened: ${opened.n} pilots. ` + opened.pilots.map((q) => `Pilot ${q.n} read ${mult(q.read)}, worth ${mult(q.worth)}.`).join(' '),
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
    <Instrument title="One budget, a thousand futures" sub="A new kind of programme, such as off-grid power for clinics. Above: one future, opened; below, 1,000 futures." {rules}>
      <Puzzle id="tinkering" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <div class="ctl">
          <Slider
            id="tk-pilots"
            label="Pilots first"
            bind:value={pilots}
            min={1}
            max={MAX_PILOTS}
            format={(v) => (v === 1 ? 'None' : `${v} pilots`)}
            ends={['One big programme', `${MAX_PILOTS} pilots`]}
          />
          <div class="budget" aria-label="The budget of {BUDGET}: {strip.spent ? `${strip.spent}; ` : ''}{strip.rest}." role="img">
            <div class="coins" aria-hidden="true">
              {#each Array(COINS) as _, k (k)}<span class="coin" class:spent={pilots > 1 && k < pilots}></span>{/each}
            </div>
            <div class="budget-text tkc-caption" aria-hidden="true">
              {#if strip.spent}<span>{strip.spent}</span>{/if}<span class="rest">{strip.rest}</span>
            </div>
          </div>
        </div>
        {#if revealed}
          <Segmented name="tk-world" label="Results are" bind:value={kind} options={WORLDS.map((w) => ({ value: w.id, label: w.label }))} />
        {/if}
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={span} height={BH} role="img" aria-label={bandAria}>
          <text class="tkc-axis-title" x="0" y="12">One future, opened</text>
          <g class="key" aria-hidden="true">
            <circle class="read" cx={span - 98} cy="8" r="3.5" />
            <text class="tkc-label-2" x={span - 90} y="12">read</text>
            <rect class="worth key-bar" x={span - 48} y="3" width="7" height="10" />
            <text class="tkc-label-2" x={span - 36} y="12">worth</text>
          </g>
          {#each WT as t (t.v)}
            <line class="tkc-grid" class:par={t.v === 1} x1={bm.left} x2={span - bm.right} y1={wy(t.v)} y2={wy(t.v)} />
            <text class="tkc-axis-label" x={bm.left - 5} y={wy(t.v) + 4} text-anchor="end">{t.t}</text>
          {/each}
          {#each opened.pilots as q, i (q.n)}
            {@const isPick = q.n === opened.pick.n}
            {@const isBest = q.n === opened.best.n}
            <rect
              class="worth"
              class:pick={isPick}
              class:best={isBest && !isPick}
              x={px(i) - colW / 2}
              y={Math.min(wy(1), wy(q.worth))}
              width={colW}
              height={Math.max(1.5, Math.abs(wy(q.worth) - wy(1)))}
            />
            {#if q.read !== null}
              <circle class="read-halo" cx={px(i)} cy={wy(q.read)} r={Math.max(2.5, Math.min(4, slot / 2 - 0.5))} />
              <circle class="read" class:pick={isPick} cx={px(i)} cy={wy(q.read)} r={Math.max(2.5, Math.min(4, slot / 2 - 0.5))} />
            {/if}
            {#if opened.n > 1 && numbered(i)}
              <text class="num" class:pick={isPick} class:best={isBest && !isPick} x={px(i)} y={BH - 4} text-anchor="middle">{q.n}</text>
            {/if}
          {/each}
          {#each callouts as c (c.text)}
            <text class="callout tkc-halo" class:pick={c.pick} x={c.x} y={c.y} text-anchor={c.anchor}>{c.text}</text>
          {/each}
          {#if opened.n === 1}
            <text class="num" x={px(0) - 6} y={BH - 4}>approach 1</text>
          {/if}
        </svg>
        <p class="tkc-small story">
          {story}{#if opened.n === 1}{' '}With pilots, each shows here: its reading
            <svg class="mark" width="9" height="9" aria-hidden="true"><circle class="read" cx="4.5" cy="4.5" r="3.5" /></svg>
            against its worth
            <svg class="mark" width="8" height="11" aria-hidden="true"><rect class="worth key-bar" x="0.5" y="0.5" width="7" height="10" /></svg>.{/if}
        </p>

        <svg width={span} height={H} role="img" aria-label={describe}>
          {#each TICKS as t (t)}
            <line class="tkc-grid" x1={x(t)} x2={x(t)} y1={m.top} y2={BASE} />
          {/each}
          <line class="tkc-base" x1={m.left} x2={span - m.right} y1={BASE + 0.5} y2={BASE + 0.5} />

          {#each dots as d, f (f)}
            <circle class="fut" class:low={d.low} cx={d.cx} cy={d.cy} r={r} />
          {/each}
          <path class="outline" d={outline} />
          <circle class="ring" cx={dots[OPENED].cx} cy={dots[OPENED].cy} r={r + 2.5} />

          <line class="budget-line" x1={x100} x2={x100} y1={marks.big ? marks.big.tag.y + 5 : marks.typical.tag.y + 5} y2={BASE} />
          <line class="typical" x1={marks.typical.x} x2={marks.typical.x} y1={marks.typical.tag.y + 5} y2={BASE} />
          <line class="worst" x1={marks.worst.x} x2={marks.worst.x} y1={marks.worst.tag.y + 5} y2={BASE} />
          {#each [marks.big?.tag, marks.worst.tag, marks.typical.tag].filter(Boolean) as l (l.y)}
            <text class="tkc-label tkc-halo" class:soft={l === marks.big?.tag} x={l.x} y={l.y} text-anchor={l.anchor}>{l.text}</text>
          {/each}

          {#each TICKS as t (t)}
            <text class="tkc-axis-label" class:at-budget={t === BUDGET} x={x(t)} y={BASE + 17} text-anchor={tickAnchor(t)}>{int(t)}</text>
          {/each}
          <text class="tkc-axis-title" x={m.left + (span - m.left - m.right) / 2} y={H - 5} text-anchor="middle">What the budget of 100 returns</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-fut"></span>Returns 100 or more</span>
          <span><span class="tkc-swatch sw-low"></span>Less than 100</span>
          <span><span class="tkc-swatch sw-ring"></span>Opened above</span>
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
          n, and the future opened above the dots is always the same one. The draws are spread evenly over the
          distribution, so one big programme’s typical result is 100. Stopping a pilot early, and learning between pilots,
          are left out.
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
      wider the spread, even when the readings mislead: in the opened future, pilot {O12.pick.n} read best but was worth
      {SHARE} of pilot {O12.best.n}, and its {O12.rest} still returned {int(O12.result)} against one big programme’s
      {int(O1.result)}. When results are predictable, the approaches barely differ, and twelve pilots leave a typical
      {T.pred12}. When results are wild, {words(T.wildN)} pilots do best, at a typical {T.wildT}. Unpredictability is
      what pilots are paid in.
    </p>
    <p>
      One big programme takes the swings whole: whatever its one approach proves worth, the whole budget gets it. Real
      programmes often fare worse, because their surprises are mostly overruns. Bent Flyvbjerg and
      Alexander Budzier studied 1,471 IT projects: the average overran its budget by 27%, and one in six by about 200%.
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
  .ctl {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .budget {
    display: grid;
    gap: 4px;
    margin-top: 4px;
  }
  .coins {
    display: flex;
    gap: 2px;
  }
  .coin {
    flex: 1 1 0;
    height: 10px;
    border-radius: 2px;
    background: var(--tkc-options);
  }
  .coin.spent {
    background: var(--tkc-muted);
  }
  .budget-text {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0 12px;
  }
  .budget-text .rest {
    color: var(--tkc-options-ink);
    font-weight: 600;
    margin-left: auto;
  }
  .read {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
  }
  .read-halo {
    fill: none;
    stroke: var(--tkc-surface);
    stroke-width: 4;
  }
  .read.pick {
    stroke: var(--tkc-options);
    stroke-width: 2;
  }
  .worth {
    fill: var(--tkc-rule);
  }
  .worth.best,
  .key-bar {
    fill: var(--tkc-ink-2);
  }
  .worth.pick {
    fill: var(--tkc-options);
  }
  .par {
    stroke: var(--tkc-rule);
    stroke-dasharray: 3 2;
  }
  .num {
    font-size: 11px;
    fill: var(--tkc-muted);
  }
  .num.pick {
    fill: var(--tkc-options-ink);
    font-weight: 700;
  }
  .num.best {
    fill: var(--tkc-ink);
    font-weight: 700;
  }
  .callout {
    font-size: 12px;
    font-weight: 600;
    fill: var(--tkc-ink);
  }
  .callout.pick {
    fill: var(--tkc-options-ink);
  }
  .story {
    margin: 2px 0 10px;
  }
  .story .mark {
    display: inline-block;
    vertical-align: -1px;
    overflow: visible;
  }
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
  .ring {
    fill: none;
    stroke: var(--tkc-options);
    stroke-width: 2;
  }
  .budget-line {
    stroke: var(--tkc-ink-2);
    stroke-width: 1.25;
    stroke-dasharray: 1.5 3;
  }
  .typical,
  .worst {
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
  }
  .worst {
    stroke-dasharray: 5 3;
  }
  .soft {
    fill: var(--tkc-ink-2);
    font-weight: 500;
  }
  .at-budget {
    fill: var(--tkc-ink);
    font-weight: 700;
  }
  .sw-fut,
  .sw-low,
  .sw-ring {
    border-radius: 50%;
  }
  .sw-fut {
    background: var(--tkc-ink-2);
    opacity: 0.6;
  }
  .sw-low {
    background: var(--tkc-conditions);
  }
  .sw-ring {
    background: none;
    border: 2px solid var(--tkc-options);
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
