<script>
  import { onMount } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { PARAMS, LIMIT, YEARS, SHARES, START, ANSWER, shareLabel, cuts, checked, settingIndex, shownYear, meetsLimit, onTime, chapterReady, chapterStep } from '../lib/sim/gate.js';
  import { log10 } from '../lib/scales.js';

  // Today the bank checks the most suspicious half at every amount.
  let large = $state(START.large);
  let small = $state(START.small);
  let width = $state(560);

  // A thousand simulated years at every setting, worked out in short steps the first time the
  // chapter opens, so the page never stalls; a later visit or a reset finds them ready.
  let sims = $state.raw(chapterReady());
  onMount(() => {
    if (sims) return;
    let timer = 0;
    const step = () => {
      const done = chapterStep();
      if (done) sims = done;
      else timer = setTimeout(step, 0);
    };
    timer = setTimeout(step, 0);
    return () => clearTimeout(timer);
  });
  const runAt = (l, s) => sims.runs[settingIndex(l, s)];
  const run = $derived(sims ? runAt(large, small) : null);

  // ---- Words and numbers, all from the model ----
  const money = (v) =>
    v === 0 ? '$0' : v < 0.0005 ? 'under $1,000' : v < 0.095 ? `$${Math.round(v * 1000)},000` : Number.isInteger(v) ? `$${v}m` : `$${v.toFixed(1)}m`;
  const share = (v) => (v === 0 ? '0%' : v < 0.001 ? 'under 0.1%' : v < 0.1 ? `${(v * 100).toFixed(1)}%` : `${Math.round(v * 100)}%`);
  const whole = (v) => `${Math.round(v * 100)}%`;
  const int = (v) => Math.round(v).toLocaleString('en-US');
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const tenths = (v) => {
    const k = Math.round(v * 10);
    return k === 5 ? 'half' : k === 10 ? 'all' : `${WORDS[k]}-tenth${k === 1 ? '' : 's'}`;
  };
  const frauds = (k) => (k === 1 ? 'fraud' : 'frauds');
  const T = $derived.by(() => {
    if (!sims) return null;
    const answer = runAt(ANSWER.large, ANSWER.small);
    const start = runAt(START.large, START.small);
    const ninety = runAt(SHARES.indexOf(0.9), ANSWER.small); // nine in ten large ones checked
    const quarter = runAt(ANSWER.large, SHARES.indexOf(0.25)); // a quarter of the small ones
    const extra = quarter.smallStopped - answer.smallStopped; // small frauds a year stopped by the extra checks
    return {
      smallGenuine: int(answer.smallGenuineCalls),
      smallCaught: `${WORDS[Math.round(answer.smallCaught * 4)]} small frauds in four`,
      ninetyMean: money(ninety.mean),
      ninetyOver: int(ninety.over),
      ninetyWorst: money(ninety.worst),
      half: tenths(answer.largeOfRequests),
      money: tenths(answer.largeOfMoney),
      worst: money(answer.worst),
      late: share(answer.late),
      genuine: int(Math.round(answer.genuineCalls / 10) * 10),
      more: tenths(answer.genuineCalls / start.genuineCalls - 1).replace(/^one-tenth$/, 'a tenth'),
      everyYears: WORDS[Math.round(1 / extra)] ?? int(1 / extra),
      waitMore: int(quarter.genuineCalls - answer.genuineCalls),
      quarterBusy: whole(quarter.busy),
      quarterLate: share(quarter.late),
      named: share(sims.named.late),
    };
  });

  const rules = [
    'About 650 requests a year, $50,000 to $80m; one in 200 is fraud.',
    'A screen ranks requests by signs of fraud; one fraud in four shows none.',
    'A check stops any fraud; it takes one of three reviewers a day.',
  ];

  // ---- Puzzle ----
  const progress = $derived.by(() => {
    if (!run || (meetsLimit(run) && onTime(run))) return '';
    if (!meetsLimit(run) && !onTime(run)) {
      return `${int(run.genuineCalls)} genuine clients a year wait for a check: the reviewers fall behind, and the worst year still loses ${money(run.worst)}.`;
    }
    if (!meetsLimit(run)) return `The average year loses ${money(run.mean)}, under the limit; the worst year loses ${money(run.worst)}.`;
    return `No year goes over the limit, but ${int(run.genuineCalls)} genuine clients a year wait for a check, and ${share(run.late)} of payments are late.`;
  });
  const puzzle = $derived({
    goal: 'Set the two shares so that no year in 1,000 loses more than $5m, and fewer than 1 payment in 100 is late.',
    met: !!run && meetsLimit(run) && onTime(run),
    checks: [
      { label: `No year loses more than $5m${run ? ` (worst now ${money(run.worst)})` : ''}`, ok: !!run && meetsLimit(run) },
      { label: `Fewer than 1 payment in 100 late${run ? ` (now ${share(run.late)})` : ''}`, ok: !!run && onTime(run) },
    ],
    progress,
    hints: [
      'One fraud in four shows no sign, so the screen may rank it anywhere: only checking all is sure to stop it.',
      'A check costs a reviewer a day whatever the amount. Where would one missed fraud break the board’s limit?',
    ],
    found: T
      ? `Every disbursement above $1m and the most suspicious tenth below: the worst year loses ${T.worst}, and that tenth catches ${T.smallCaught}.`
      : 'Every disbursement above $1m and the most suspicious tenth below.',
  });
  const showAnswer = () => ((large = ANSWER.large), (small = ANSWER.small));

  // ---- The chart: one year's requests as dots by amount, those checked above the axis ----
  const YEAR = shownYear();
  const LO = PARAMS.floor;
  const HI = PARAMS.cap;
  const PAD = 6;
  const span = $derived(Math.max(width, 240));
  const narrow = $derived(span < 440);
  const x = $derived(log10(LO, HI, PAD, span - PAD));
  const BAND = $derived(narrow ? 84 : 96); // room for the tallest column, whichever side it falls
  const TOP = 20; // a row for the two shares' labels
  const GAP = 24; // the amount axis, between the two sides
  const FLOOR = $derived(TOP + BAND); // checked: stacks grow up from here
  const CEIL = $derived(TOP + BAND + GAP); // paid at once: stacks grow down from here
  const H = $derived(CEIL + BAND + 6);

  // Columns one dot wide, laid so that the axis's $100,000, $1m and $10m each fall on a boundary between two: a
  // whole number of columns to a decade, counted from $1m.
  const columns = (p) => {
    const x0 = x(1) - p * Math.ceil((x(1) - PAD) / p);
    const cols = Math.ceil((span - PAD - x0) / p) + 1;
    return { p, cols, centre: (c) => x0 + (c + 0.5) * p, colOf: (v) => Math.min(cols - 1, Math.max(0, Math.floor((x(v) - x0) / p))) };
  };
  // Stack genuine requests in their columns, in the order they arrive; a dot whose column is taller than a neighbour by a dot or
  // more goes on the neighbour instead (never across the $1m line), so chance spikes even out.
  // Returns each one's column and height from its axis, and every column's final height.
  function stack(g, side, line) {
    const heights = [new Float64Array(g.cols), new Float64Array(g.cols)];
    const placed = new Array(YEAR.n);
    for (let i = 0; i < YEAR.n; i++) {
      if (YEAR.fraud[i]) continue;
      const h = heights[side(i)];
      const own = g.colOf(YEAR.size[i]);
      const below = g.centre(own) < line;
      let best = own;
      for (const c of [own - 1, own + 1]) {
        if (c < 0 || c >= g.cols || g.centre(c) < line !== below) continue;
        if (h[c] <= h[best] - g.p) best = c;
      }
      placed[i] = { col: best, off: h[best] + g.p / 2 };
      h[best] += g.p;
    }
    return { placed, heights };
  }
  // The widest pitch at which the tallest column fits its band, even with every request on one side.
  const grid = $derived.by(() => {
    const decade = x(10) - x(1);
    for (let k = Math.ceil(decade / 7); ; k++) {
      const g = columns(decade / k);
      const { heights } = stack(g, () => 0, Infinity);
      if (Math.max(...heights[0]) <= BAND - 8 || g.p <= 2.5) return g;
    }
  });
  const r = $derived(Math.max(1, grid.p / 2 - 0.3));
  const rf = $derived(Math.max(5, r + 2.6)); // a fraud's dot, larger and at the tip of its column

  const bars = $derived(cuts(large, small));
  const lineX = $derived(x(PARAMS.line));
  const dots = $derived.by(() => {
    const g = grid;
    const up = (i) => checked(YEAR, i, bars);
    const { placed, heights } = stack(g, (i) => (up(i) ? 0 : 1), lineX);
    const out = new Array(YEAR.n);
    for (let i = 0; i < YEAR.n; i++) {
      const called = up(i);
      const fraud = !!YEAR.fraud[i];
      let col = 0;
      let off = 0;
      if (fraud) {
        // A fraud sits on its own column, at the tip of the stack.
        col = g.colOf(YEAR.size[i]);
        const h = heights[called ? 0 : 1];
        off = h[col] + rf + 1;
        h[col] += 2 * rf + 2;
      } else ({ col, off } = placed[i]);
      out[i] = { key: i, cx: g.centre(col), cy: called ? FLOOR - off : CEIL + off, called, fraud, size: YEAR.size[i] };
    }
    return out;
  });
  const fraudDots = $derived(dots.filter((d) => d.fraud));
  const year = $derived.by(() => {
    const called = dots.filter((d) => d.called);
    const stopped = fraudDots.filter((d) => d.called);
    const missed = fraudDots.filter((d) => !d.called);
    return { called: called.length, genuine: called.length - stopped.length, stopped: stopped.length, paid: YEAR.n - called.length, missed: missed.length, lost: missed.reduce((s, d) => s + d.size, 0) };
  });

  const ticks = [0.1, 1, 10];
  const tickLabel = (t) => (t < 1 ? '$100,000' : `$${t}m`);

  // Direct labels: the two shares', either side of the $1m line, then each fraud's, each where it collides with
  // nothing placed before it.
  const CHAR = 7; // a little wider than a 12px bold character
  const box = (text, tx, ty, anchor, cls, key) => {
    const w = text.length * CHAR;
    const x0 = anchor === 'end' ? tx - w : anchor === 'middle' ? tx - w / 2 : tx;
    return { key, text, x: tx, y: ty, anchor, cls, x0, x1: x0 + w, y0: ty - 11, y1: ty + 3 };
  };
  const clash = (a, b) => a.x0 < b.x1 + 4 && b.x0 < a.x1 + 4 && a.y0 < b.y1 + 2 && b.y0 < a.y1 + 2;
  const orders = (a) => (a.length <= 1 ? [a] : a.flatMap((v, i) => orders([...a.slice(0, i), ...a.slice(i + 1)]).map((o) => [v, ...o])));
  const checkedWords = (k) => (SHARES[k] >= 1 ? 'all checked' : `${shareLabel(k)} checked`);
  const capital = (t) => t[0].toUpperCase() + t.slice(1);
  const labels = $derived.by(() => {
    // Each fraud is named with its amount and fate, or where that will not fit, its amount alone. The frauds
    // are labelled in whichever order leaves the fewest labels clashing, then the fewest shortened.
    let best = null;
    for (const order of orders(fraudDots)) {
      const placed = [];
      let cost = 0;
      const fits = (q) => q.x0 >= 0 && q.x1 <= span && q.y0 >= 0 && q.y1 <= H && placed.every((o) => !clash(o, q));
      const place = (options, short = Infinity) => {
        const k = options.findIndex(fits);
        cost += k < 0 ? 100 : k >= short ? 1 : 0;
        placed.push(options[Math.max(k, 0)]);
      };
      const left = checkedWords(small);
      const right = checkedWords(large);
      const below = (t) => box(t, lineX - 6, 13, 'end', 'line', 'small');
      const above = (t) => box(t, lineX + 6, 13, 'start', 'line', 'large');
      place([below(`Below $1m: ${left}`), below(capital(left)), below(shareLabel(small))]);
      place([above(`Above $1m: ${right}`), above(capital(right)), above(shareLabel(large))]);
      for (const d of order) {
        const cls = d.called ? 'stop' : 'miss';
        const side = d.called ? -1 : 1; // away from the axis
        const around = (t) => [
          box(t, d.cx + rf + 4, d.cy + 4, 'start', cls, d.key),
          box(t, d.cx - rf - 4, d.cy + 4, 'end', cls, d.key),
          box(t, d.cx, d.cy + side * (rf + (side > 0 ? 13 : 5)), 'middle', cls, d.key),
          box(t, d.cx + rf + 4, d.cy + 4 + side * 14, 'start', cls, d.key),
          box(t, d.cx - rf - 4, d.cy + 4 + side * 14, 'end', cls, d.key),
          box(t, d.cx, d.cy + side * (rf + (side > 0 ? 27 : 19)), 'middle', cls, d.key),
        ];
        const long = around(`${money(d.size)} ${d.called ? 'stopped' : 'paid out'}`);
        place([...long, ...around(money(d.size))], long.length);
      }
      if (!best || cost < best.cost) best = { placed, cost };
      if (!cost) break;
    }
    return best.placed;
  });

  const describe = $derived(
    `One year of ${YEAR.n} requests to pay a new account, by amount. ${year.called} are checked by a call-back: ${year.stopped} ${frauds(year.stopped)} stopped and ${year.genuine} genuine clients. ` +
      `${year.paid} are paid at once${year.missed ? `, including ${year.missed} ${frauds(year.missed)}: ${money(year.lost)} lost` : ', none of them a fraud'}.`,
  );
</script>

<Chapter
  n={11}
  kicker="Gates"
  title="The gate worth keeping"
  lede="A chain that bends still keeps a few links rigid: the checks before a payment that cannot be undone. The question is which payments."
  puzzle="gate"
>
  {#snippet setup()}
    <p>
      A development lender disburses every working day. About 650 times a year, a disbursement comes with a request to
      pay it into a new bank account. Almost all are genuine; one in 200 is a fraudster’s, and money paid to a
      fraudster rarely comes back.
    </p>
    <p>
      A call-back to the client, on a number already on file, stops any fraud: no fraudster can answer it. But each call
      takes one of three qualified reviewers a day, and payment is promised within three working days, so the bank
      checks only a share: today, half, at every amount. An automatic screen picks which, the most suspicious first, by
      signs such as a new country, a request by email or a letterhead that does not match.
    </p>
    <p>
      The board has set one limit: no year may lose more than $5m to fraud, however good the years around it.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Checks on new bank accounts" sub="One year’s requests by amount: above the axis, checked by a call-back; below it, paid at once." {rules}>
      <Puzzle id="gate" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <Slider id="g-small" label="Below $1m, check" bind:value={small} min={0} max={SHARES.length - 1} format={shareLabel} ends={['A tenth', 'All']} />
        <Slider id="g-large" label="Above $1m, check" bind:value={large} min={0} max={SHARES.length - 1} format={shareLabel} ends={['A tenth', 'All']} />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <p class="side">
          <strong class="tkc-num">Checked: {year.called}</strong>
          <span>
            · <span class="stop-ink">{year.stopped} {frauds(year.stopped)} stopped</span>, {year.genuine} genuine clients: false positives
          </span>
        </p>
        <svg width={span} height={H} role="img" aria-label={describe}>
          {#each ticks as t (t)}
            <line class="tkc-grid" x1={x(t)} x2={x(t)} y1={TOP} y2={H - 4} />
            <text class="tkc-axis-label" x={x(t)} y={FLOOR + GAP / 2 + 4} text-anchor="middle">{tickLabel(t)}</text>
          {/each}
          <line class="tkc-base" x1={PAD} x2={span - PAD} y1={FLOOR + 0.5} y2={FLOOR + 0.5} />
          <line class="tkc-base" x1={PAD} x2={span - PAD} y1={CEIL - 0.5} y2={CEIL - 0.5} />
          <!-- The $1m line between the two shares crosses both sides but leaves the amount axis clear. -->
          <line class="cut" x1={lineX} x2={lineX} y1={TOP} y2={FLOOR} />
          <line class="cut" x1={lineX} x2={lineX} y1={CEIL} y2={H - 2} />
          {#each dots as d, i (i)}
            {#if !d.fraud}<circle class="dot" class:wait={d.called} {r} style:transform="translate({d.cx}px, {d.cy}px)" />{/if}
          {/each}
          {#each dots as d, i (i)}
            {#if d.fraud}<circle class="fraud" class:stopped={d.called} r={rf} style:transform="translate({d.cx}px, {d.cy}px)" />{/if}
          {/each}
          {#each labels as l (l.key)}
            <text class="tkc-label tkc-halo lab-{l.cls}" x={l.x} y={l.y} text-anchor={l.anchor}>{l.text}</text>
          {/each}
        </svg>
        <p class="side">
          <strong class="tkc-num">Paid at once: {year.paid}</strong>
          <span>
            ·
            {#if year.missed}<span class="miss-ink">{year.missed} {frauds(year.missed)} paid out, {money(year.lost)} lost</span>{:else}no fraud among them{/if}
          </span>
        </p>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw sw-genuine"></span>Genuine client</span>
          <span><span class="tkc-swatch sw sw-stop"></span>Fraud stopped</span>
          <span><span class="tkc-swatch sw sw-miss"></span>Fraud paid out</span>
        </div>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat
          label="Worst year in 1,000"
          value={run ? money(run.worst) : '…'}
          sub={run ? `board limit ${money(LIMIT)}; average year ${money(run.mean)}` : 'simulating 1,000 years'}
          swatch={run && !meetsLimit(run) ? 'var(--tkc-conditions)' : ''}
        />
        <Stat
          label="Payments late"
          value={run ? share(run.late) : '…'}
          sub={run ? `after three working days; reviewers busy ${whole(run.busy)} of their days` : 'simulating 1,000 years'}
          swatch={run && !onTime(run) ? 'var(--tkc-conditions)' : ''}
        />
      </div>

      {#snippet model()}
        <p>
          Each simulated year has {PARAMS.days} working days, with requests arriving at random, {PARAMS.perDay} a day on
          average. Amounts follow a lognormal distribution with a median of $1m and a spread (σ) of {PARAMS.sigma}, redrawn
          if outside $50,000–$80m. Each request is a fraud with a chance of one in {PARAMS.fraudEvery}.
        </p>
        <p>
          The screen scores every request. Genuine scores follow a bell curve; three frauds in four score {WORDS[PARAMS.signal]}
          standard deviations higher on average, and one in four exactly like a genuine request. To check a share of one
          side of $1m, the screen sets its bar so that this share of genuine requests scores above it.
        </p>
        <p>
          Checks wait in one line, first come first served, for any reviewer who is in (each nine days in ten, away in
          spells of about {WORDS[PARAMS.spell]} days); a call made one day pays the next. Every setting meets the same
          {YEARS.toLocaleString('en-US')} years.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    {#if T}
      <p>
        Fraud is rare, so most checks fall on genuine clients, each a <span class="tkc-idea">false positive</span>: an
        alarm with nothing behind it. Yet the screen’s ranking is worth a great deal. A clumsy fraud shows its signs and
        rises to the top of the order, so below $1m the most suspicious tenth holds {T.smallCaught}, at the cost of
        {T.smallGenuine} genuine clients a year.
      </p>
      <p>
        What no ranking can see is a fraud with no sign, such as a request from a client’s own mailbox, taken over. It may
        sit anywhere in the order, so checking nine in ten large disbursements lets one in ten of these through. That is
        rare: the average year then loses only {T.ninetyMean}. But the bank lives its years one after another, like the
        player in the coin game, and the limit applies to each one: {T.ninetyOver} years in 1,000 lose more than $5m, the worst
        {T.ninetyWorst}.
      </p>
      <p>
        So the check is sized to the loss. A call costs a reviewer a day whatever the amount, and what it saves grows with
        the amount. Above $1m the gate becomes an <span class="tkc-and">AND</span> behind an
        <span class="tkc-if">IF</span>: no disbursement goes out unchecked, {T.half} the payments and {T.money} of the
        money. Below $1m a tenth is checked, the most suspicious, and what slips through the bank can survive. The worst
        year now loses {T.worst}. False positives remain, about {T.genuine} genuine clients a year, only {T.more} more
        than with half of every amount checked, but now where a wait buys the most.
      </p>
      <p>
        Checking more of the small ones buys little. A quarter instead of a tenth stops one more small fraud every
        {T.everyYears} years, but {T.waitMore} more clients a year wait; the reviewers are busy {T.quarterBusy} of their days
        and, past a <span class="tkc-idea">tipping point</span> like the queues chapter’s, {T.quarterLate} of payments are
        late. Inside the gate sits an <span class="tkc-or">OR</span>: any one of three qualified reviewers may call, a
        <span class="tkc-idea">quorum</span> of one; with a named reviewer for each payment, {T.named} would be late.
      </p>
      <p>
        A lizard caught by the tail sheds it and grows another, but guards its head. A chain that bends does the same: it
        lets small losses through and holds firm where a single loss would be one too many.
      </p>
    {:else}
      <p class="tkc-small">Simulating a thousand years…</p>
    {/if}
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our checks are sized to what we cannot afford to lose, and which make every amount wait alike?">
      <p>
        Operational-risk capital rules long asked banks to hold enough for the worst year in a thousand, not the average
        one. Auditors test every item above a set amount and sample the rest. And dual control, the four-eyes rule, is a
        <span class="tkc-idea">quorum</span> as well: any two qualified people, not two named ones.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .side {
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--tkc-ink-2);
    margin: 0;
  }
  .side strong {
    color: var(--tkc-ink);
    font-weight: 650;
  }
  .side:first-child {
    margin-bottom: 2px;
  }
  .stop-ink {
    color: var(--tkc-options-ink);
    font-weight: 600;
  }
  .miss-ink {
    color: var(--tkc-conditions-ink);
    font-weight: 600;
  }
  .tkc-legend {
    margin-top: 10px;
  }
  .dot,
  .fraud {
    transition: transform 420ms cubic-bezier(0.3, 0.7, 0.2, 1);
  }
  .dot {
    fill: var(--tkc-ink-2);
    opacity: 0.28;
  }
  .dot.wait {
    fill: var(--tkc-ink);
    opacity: 0.62;
  }
  .fraud {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
  }
  .fraud.stopped {
    fill: var(--tkc-options);
  }
  .cut {
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
    stroke-dasharray: 5 4;
  }
  .lab-line {
    fill: var(--tkc-ink);
  }
  .lab-stop {
    fill: var(--tkc-options-ink);
  }
  .lab-miss {
    fill: var(--tkc-conditions-ink);
  }
  .sw {
    border-radius: 50%;
  }
  .sw-genuine {
    background: var(--tkc-ink-2);
    opacity: 0.6;
  }
  .sw-stop {
    background: var(--tkc-options);
  }
  .sw-miss {
    background: var(--tkc-conditions);
  }
</style>
