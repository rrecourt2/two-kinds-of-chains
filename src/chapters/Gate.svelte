<script>
  import { onMount } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { PARAMS, LIMIT, YEARS, SENSITIVITY, CALLBACK, START, ANSWER, cutoff, calledBack, settingIndex, shownYear, meetsLimit, onTime, chapterReady, chapterStep } from '../lib/sim/gate.js';
  import { log10 } from '../lib/scales.js';

  let sens = $state(START.sens); // the screen alone, on Medium, as the bank runs it today
  let callback = $state(START.callback);
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
  const runAt = (s, c) => sims.runs[settingIndex(s, c)];
  const run = $derived(sims ? runAt(sens, callback) : null);

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
  const inTen = (v) => `${WORDS[Math.round(v * 10)]} in ten`;
  const frauds = (k) => (k === 1 ? 'fraud' : 'frauds');
  const T = $derived.by(() => {
    if (!sims) return null;
    const low = runAt(0, 0);
    const medium = runAt(START.sens, START.callback);
    const vh = runAt(SENSITIVITY.length - 1, 0);
    const answer = runAt(ANSWER.sens, ANSWER.callback);
    return {
      lowGenuine: int(low.genuineCalls),
      lowFrauds: WORDS[Math.round(low.flagsFraud)],
      lowOne: int(1 / low.precision),
      vhOne: int(1 / vh.precision),
      vhCaught: inTen(vh.caught),
      vhGenuine: int(vh.genuineCalls),
      vhBusy: whole(vh.busy),
      vhLate: share(vh.late),
      vhWorst: money(vh.worst),
      half: tenths(answer.bySize),
      money: tenths(answer.bySizeMoney),
      worst: money(answer.worst),
      late: share(answer.late),
      genuine: int(Math.round(answer.genuineCalls / 10) * 10),
      more: answer.genuineCalls > medium.genuineCalls,
      named: share(sims.named.late),
    };
  });

  const rules = [
    'About 600 requests a year, $50,000 to $80m; one in 200 is fraud.',
    'The screen flags signs of fraud; one fraud in four shows none.',
    'A call-back stops any fraud; it takes one of three reviewers a day.',
  ];

  // ---- Puzzle ----
  const progress = $derived.by(() => {
    if (!run || (meetsLimit(run) && onTime(run))) return '';
    const at = CALLBACK[callback].at;
    if (at === Infinity) {
      return onTime(run)
        ? `The screen stops ${inTen(run.caught)} frauds, but the worst year still loses ${money(run.worst)}.`
        : `${int(run.genuineCalls)} genuine clients a year wait for a call: the reviewers fall behind, and the worst year still loses ${money(run.worst)}.`;
    }
    if (!meetsLimit(run)) return `The average year loses ${money(run.mean)}, under the limit; the worst year loses ${money(run.worst)}.`;
    return `No year goes over the limit, but ${int(run.genuineCalls)} genuine clients a year wait for a call, and ${share(run.late)} of payments are late.`;
  });
  const puzzle = $derived({
    goal: 'Set the screen and the call-backs so that no year in 1,000 loses more than $5m, and fewer than 1 payment in 100 is late.',
    met: !!run && meetsLimit(run) && onTime(run),
    checks: [
      { label: `No year loses more than $5m${run ? ` (worst now ${money(run.worst)})` : ''}`, ok: !!run && meetsLimit(run) },
      { label: `Fewer than 1 payment in 100 late${run ? ` (now ${share(run.late)})` : ''}`, ok: !!run && onTime(run) },
    ],
    progress,
    hints: [
      'The screen cannot tell a $5m fraud from a $50,000 one, and one fraud in four shows no sign at all.',
      'A call-back costs a reviewer a day whatever the amount. Where would a single fraud break the board’s limit?',
    ],
    found: T
      ? `Call back every payment above $1m and screen the rest lightly: the worst year in 1,000 loses ${T.worst}, with ${T.late} of payments late.`
      : 'Call back every payment above $1m and screen the rest lightly.',
  });
  const showAnswer = () => ((sens = ANSWER.sens), (callback = ANSWER.callback));

  // ---- The chart: one year's requests as dots by amount, those called back above the axis ----
  const YEAR = shownYear();
  const LO = PARAMS.floor;
  const HI = PARAMS.cap;
  const PAD = 6;
  const span = $derived(Math.max(width, 240));
  const narrow = $derived(span < 440);
  const x = $derived(log10(LO, HI, PAD, span - PAD));
  const BAND = $derived(narrow ? 84 : 96); // room for the tallest column, whichever side it falls
  const TOP = 20; // a row for the call-back line's label
  const GAP = 24; // the amount axis, between the two sides
  const FLOOR = $derived(TOP + BAND); // called back: stacks grow up from here
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
  // more goes on the neighbour instead (never across the call-back line), so chance spikes even out.
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

  const threshold = $derived(CALLBACK[callback].at);
  const cut = $derived(cutoff(SENSITIVITY[sens].flags));
  const lineX = $derived(threshold === Infinity ? Infinity : x(threshold));
  const dots = $derived.by(() => {
    const g = grid;
    const called = (i) => calledBack(YEAR, i, threshold, cut);
    const { placed, heights } = stack(g, (i) => (called(i) ? 0 : 1), lineX);
    const out = new Array(YEAR.n);
    for (let i = 0; i < YEAR.n; i++) {
      const up = called(i);
      const fraud = !!YEAR.fraud[i];
      let col = 0;
      let off = 0;
      if (fraud) {
        // A fraud sits on its own column, at the tip of the stack.
        col = g.colOf(YEAR.size[i]);
        const h = heights[up ? 0 : 1];
        off = h[col] + rf + 1;
        h[col] += 2 * rf + 2;
      } else ({ col, off } = placed[i]);
      out[i] = { cx: g.centre(col), cy: up ? FLOOR - off : CEIL + off, called: up, fraud, size: YEAR.size[i] };
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

  // Direct labels: the call-back line's, then each fraud's, each where it collides with nothing placed before it.
  const CHAR = 7; // a little wider than a 12px bold character
  const box = (text, tx, ty, anchor, cls) => {
    const w = text.length * CHAR;
    const x0 = anchor === 'end' ? tx - w : anchor === 'middle' ? tx - w / 2 : tx;
    return { text, x: tx, y: ty, anchor, cls, x0, x1: x0 + w, y0: ty - 11, y1: ty + 3 };
  };
  const clash = (a, b) => a.x0 < b.x1 + 4 && b.x0 < a.x1 + 4 && a.y0 < b.y1 + 2 && b.y0 < a.y1 + 2;
  const orders = (a) => (a.length <= 1 ? [a] : a.flatMap((v, i) => orders([...a.slice(0, i), ...a.slice(i + 1)]).map((o) => [v, ...o])));
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
      if (threshold !== Infinity) {
        const words = [`Every payment above ${CALLBACK[callback].label} called back`, `Above ${CALLBACK[callback].label}: all called back`, `Above ${CALLBACK[callback].label}: called`];
        place(words.flatMap((t) => [box(t, lineX + 6, 13, 'start', 'line'), box(t, lineX - 6, 13, 'end', 'line')]));
      }
      for (const d of order) {
        const cls = d.called ? 'stop' : 'miss';
        const side = d.called ? -1 : 1; // away from the axis
        const around = (t) => [
          box(t, d.cx + rf + 4, d.cy + 4, 'start', cls),
          box(t, d.cx - rf - 4, d.cy + 4, 'end', cls),
          box(t, d.cx, d.cy + side * (rf + (side > 0 ? 13 : 5)), 'middle', cls),
          box(t, d.cx + rf + 4, d.cy + 4 + side * 14, 'start', cls),
          box(t, d.cx - rf - 4, d.cy + 4 + side * 14, 'end', cls),
          box(t, d.cx, d.cy + side * (rf + (side > 0 ? 27 : 19)), 'middle', cls),
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
    `One year of ${YEAR.n} requests to pay a new account, by amount. ${year.called} wait for a call-back: ${year.stopped} ${frauds(year.stopped)} stopped and ${year.genuine} genuine clients. ` +
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
      A development lender pays out every working day. About 600 times a year, a payment comes with a request to send
      it to a new bank account. Almost all are genuine; one in 200 is a fraudster’s, and money paid to a fraudster rarely
      comes back.
    </p>
    <p>
      An automatic screen scores each request for signs of fraud: a new country, a request by email, a letterhead that
      does not match. A flagged payment waits for one more link: a call-back to the client, on a number on file,
      which no fraudster can answer. It takes one of three qualified reviewers a day, and payment is promised within
      three working days.
    </p>
    <p>
      The board has set one limit: no year may lose more than $5m to fraud, however good the years around it.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="An automatic screen for account changes" sub="One year’s requests by amount: above the axis, waiting for a call-back; below it, paid at once." {rules}>
      <Puzzle id="gate" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <Slider id="g-sens" label="Screen sensitivity" bind:value={sens} min={0} max={SENSITIVITY.length - 1} format={(i) => SENSITIVITY[i].label} ends={['Few flags', 'Many flags']} />
        <Segmented name="g-call" label="Call back every payment above" bind:value={callback} options={CALLBACK.map((c, i) => ({ value: i, label: c.label }))} />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <p class="side">
          <strong class="tkc-num">Waiting for a call-back: {year.called}</strong>
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
          {#if threshold !== Infinity}
            <!-- The call-back line crosses both sides but leaves the amount axis clear. -->
            <line class="cut" x1={lineX} x2={lineX} y1={4} y2={FLOOR} />
            <line class="cut" x1={lineX} x2={lineX} y1={CEIL} y2={H - 2} />
          {/if}
          {#each dots as d, i (i)}
            {#if !d.fraud}<circle class="dot" class:wait={d.called} {r} style:transform="translate({d.cx}px, {d.cy}px)" />{/if}
          {/each}
          {#each dots as d, i (i)}
            {#if d.fraud}<circle class="fraud" class:stopped={d.called} r={rf} style:transform="translate({d.cx}px, {d.cy}px)" />{/if}
          {/each}
          {#each labels as l (l.text)}
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
          standard deviations higher on average, and one in four exactly like a genuine request. Low, Medium, High and Very
          high flag {SENSITIVITY.map((s) => `${Math.round(s.flags * 100)}%`).join(', ').replace(/, (?=[^,]*$)/, ' and ')} of genuine requests.
        </p>
        <p>
          Call-backs wait in one line, first come first served, for any reviewer who is in (each nine days in ten, away in
          spells of about {WORDS[PARAMS.spell]} days); a call made one day pays the next. Every setting meets the same
          {YEARS.toLocaleString('en-US')} years.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    {#if T}
      <p>
        Whatever the setting, most flags fall on genuine clients, each a <span class="tkc-idea">false positive</span>: an
        alarm with nothing behind it. Fraud is so rare that on Low the screen flags {T.lowGenuine} genuine clients a year
        for about {T.lowFrauds} frauds: one flag in {T.lowOne} is real, and on Very high one in {T.vhOne}.
      </p>
      <p>
        Turning it up stops more fraud, about {T.vhCaught} on Very high, but {T.vhGenuine} genuine clients a year then wait.
        The reviewers are busy {T.vhBusy} of their days and, past a <span class="tkc-idea">tipping point</span> like the
        queues chapter’s, the line runs away: {T.vhLate} of payments are late. And a fraud with no sign, such as a
        request from a client’s own mailbox, taken over, can pass any setting: the worst year still loses {T.vhWorst}.
      </p>
      <p>
        The way out is to size the gate to the loss. A call-back costs a reviewer a day whatever the amount, but what it
        saves grows with the amount. So the gate becomes an <span class="tkc-and">AND</span> behind an
        <span class="tkc-if">IF</span>: above $1m, no payment goes out unchecked: {T.half} the payments, {T.money} of
        the money. Below $1m the screen stays, turned down: its few flags fit in the reviewers’ days, and what
        it misses the bank can survive. The worst year now loses {T.worst}.
      </p>
      <p>
        False positives remain: about {T.genuine} genuine clients a year still wait, {T.more ? 'more than' : 'about as many as'} the
        Medium screen alone, but now where a wait buys the most. Inside the gate sits an
        <span class="tkc-or">OR</span>: any one of three qualified reviewers may call, a <span class="tkc-idea">quorum</span>
        of one; with a named reviewer for each payment, {T.named} would be late.
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
        one. Payment teams call back on a number already on file, never on one given in the request. And dual control,
        the four-eyes rule, is a <span class="tkc-idea">quorum</span> as well: any two qualified people, not two named ones.
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
