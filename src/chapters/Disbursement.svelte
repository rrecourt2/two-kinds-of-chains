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
  import { simulateLoans, typical, nineInTen, shareWithin, histogram, inTime, dateSetters, CONDITIONS, TOTAL, MIN_BEFORE, TARGET, PARAMS } from '../lib/sim/disbursement.js';
  import { linear, ticks, barUp } from '../lib/scales.js';

  const START = { before: TOTAL, late: 'wait', parties: 'unpredictable' };
  const ANSWER = { before: 8, late: 'alt', parties: 'unpredictable' };

  let before = $state(START.before);
  let late = $state(START.late);
  let parties = $state(START.parties);
  let width = $state(560);

  const alternatives = $derived(late === 'alt');
  const predictable = $derived(parties === 'predictable');
  const sim = $derived(simulateLoans({ before, alternatives, predictable }));
  const mid = $derived(typical(sim.days));
  const p90 = $derived(nineInTen(sim.days));
  const loan = $derived(sim.sample);
  const setter = $derived(loan.conditions.find((c) => c.setsDate));
  const isStart = $derived(before === START.before && late === START.late && parties === START.parties);

  // The numbers the text quotes, computed from the model.
  const at = (o) => {
    const s = simulateLoans(o);
    return { s, mid: typical(s.days), p90: nineInTen(s.days) };
  };
  const startRun = at({});
  const F = {
    start: startRun,
    pred: at({ predictable: true }),
    alt: at({ alternatives: true }),
    answer: at({ before: ANSWER.before, alternatives: true }),
    predAlt: at({ alternatives: true, predictable: true }),
  };
  const worstEach = Math.floor(Math.min(...inTime(F.start.s, TARGET)) * 100);
  const allTogether = Math.round(shareWithin(F.start.s.days, TARGET) * 100);
  const slowestTypical = Math.max(...CONDITIONS.map((c) => c.median));
  const registeredShare = dateSetters(F.start.s)[CONDITIONS.findIndex((c) => c.id === 'registered')];

  // Shared horizontal range: working days after signing.
  const XMAX = 120;
  const compact = $derived(width < 420);

  // ---- One loan, condition by condition ----
  const TAG = 22; // the "or" tag column
  const LW = 160; // label column (wide layout)
  const LANE = 24; // the "money moves" label above the rows
  const HEAD = 24; // a group heading
  const RH = $derived(compact ? 31 : 21);
  const n = $derived(sim.before);
  const plotLeft = $derived(compact ? 6 : LW);
  const tx = $derived(linear(0, XMAX, plotLeft, width - 10));
  const day = (d) => Math.min(XMAX, d);
  // Row tops: a heading, the conditions still before the money moves, a heading, the rest.
  const rowTop = (i) => LANE + HEAD + i * RH + (i >= n ? HEAD + 6 : 0);
  const afterHeadY = $derived(LANE + HEAD + n * RH + 6);
  // The same height whatever the split: twelve rows and both headings.
  const rowsBottom = $derived(LANE + HEAD + TOTAL * RH + HEAD + 6);
  const TH = $derived(rowsBottom + 34);
  const dotY = (i) => rowTop(i) + (compact ? 21 : RH / 2);
  const nameY = (i) => (compact ? rowTop(i) + 10 : rowTop(i) + RH / 2 + 4);
  const moneyX = $derived(tx(day(loan.day)));
  const moneyRight = $derived(moneyX + 150 < width);
  // Where the "sets the date" note fits: left of the dot (the money line is just to its right),
  // else beyond the money line, else after the row's name.
  const notePlace = $derived.by(() => {
    if (compact) return 'name';
    const x = tx(day(setter.met));
    if (x - 92 > plotLeft) return 'left';
    if (moneyX + 92 < width && !(setter.alt && tx(day(setter.good)) < moneyX + 92)) return 'beyond';
    return 'name';
  });
  const anyAlt = $derived(loan.conditions.some((c) => c.required && c.alt));
  const loanLabel = $derived(
    `One of the ${PARAMS.loans.toLocaleString('en-US')} loans. The money moves on day ${loan.day}, after ${setter.name}${setter.alt ? ', met by its alternative' : ''}. ` +
      loan.conditions
        .filter((c) => c.required)
        .map((c) => `${c.name}: day ${c.met}${c.alt ? ` by its alternative, original day ${c.good}` : ''}`)
        .join('; ') +
      `. After the money moves: ${loan.conditions.filter((c) => !c.required).map((c) => `${c.name}, day ${c.good}`).join('; ') || 'none'}.`,
  );

  // ---- All loans: days to disbursement ----
  const HH = 216;
  const hm = { top: 50, right: 12, bottom: 56, left: 36 };
  const hx = $derived(linear(0, XMAX + 1, hm.left, width - hm.right));
  const hist = $derived(histogram(sim.days, XMAX));
  const startHist = histogram(startRun.s.days, XMAX);
  const yMax = $derived(Math.max(...hist.bins, ...(isStart ? [] : startHist.bins)) * 1.1 || 1);
  const hy = $derived(linear(0, yMax, HH - hm.bottom, hm.top));
  const step = $derived(hx(1) - hx(0));
  const binW = $derived(Math.max(0.8, step - (step > 3 ? 1 : 0)));
  const ghost = $derived(startHist.bins.reduce((d, c, i) => d + `${i ? 'L' : 'M'}${hx(i).toFixed(1)} ${hy(c).toFixed(1)}H${hx(i + 1).toFixed(1)}`, ''));
  // Reference lines sit on the boundary after their day: loans on or before it are to the left.
  const marks = $derived([
    { key: 'target', x: hx(TARGET + 1), y: 12, text: `Target · ${TARGET} days` },
    { key: 'p90', x: hx(p90 + 1), y: 27, text: `9 in 10 · ${p90} days` },
    { key: 'mid', x: hx(mid + 1), y: 42, text: `Typical · ${mid} days` },
  ]);
  const thisX = $derived(hx(day(loan.day) + 0.5));

  // ---- Puzzle ----
  // The parties switch is context, not a lever: it appears once the puzzle is closed.
  const game = getContext('tkc-game');
  const revealed = $derived(!game.isOpen('disbursement'));
  const unpredictableOk = $derived(!predictable);
  const enoughOk = $derived(before >= 8);
  const fastOk = $derived(p90 <= TARGET);
  const puzzle = $derived({
    goal: `The borrower, lawyers and registries are unpredictable. Keep at least eight conditions before the money moves, and get nine loans in ten disbursed within ${TARGET} working days.`,
    met: unpredictableOk && enoughOk && fastOk,
    checks: [
      { label: `At least 8 conditions before the money moves (now ${before})`, ok: enoughOk },
      { label: `9 in 10 loans disbursed within ${TARGET} working days (now ${p90})`, ok: fastOk },
    ],
    hints: [
      'Look at what sets the date for the loan in the timeline, and whether that condition has an “or”.',
      'Neither change is enough alone: moving conditions and accepting alternatives speed up different conditions.',
    ],
    found: `Fewer conditions first, and alternatives where they exist: with eight before the money moves, nine loans in ten disburse within ${F.answer.p90} working days instead of ${F.start.p90}. Neither move was enough alone. With predictable parties, all twelve conditions would have met the target as they stood: ${F.pred.p90} days.`,
  });
  const showAnswer = () => ((before = ANSWER.before), (late = ANSWER.late), (parties = ANSWER.parties));
</script>

<Chapter
  n={14}
  kicker="Processing time"
  title="Time to disbursement"
  lede="Twelve conditions stand between a signed loan and its first disbursement. Each is usually in good time. When does the money move?"
  puzzle="disbursement"
>
  {#snippet setup()}
    <p>
      Signing a loan is not paying it out. Between the two stands a list of conditions precedent: what the lender must
      have in hand before the first money moves. A board approval, a legal opinion, signed and registered security,
      insurance, permits, the environmental and social actions due before disbursement. Every item must be met, so the
      list is the purest chain of <span class="tkc-and">ANDs</span> a bank has.
    </p>
    <p>
      Each item comes from someone else: the borrower, its lawyers, a registry, a regulator, the central bank. Each has a
      typical time and can be late, and some documents come back for correction. The money moves only when the last one
      is in and checked.
    </p>
    <p>
      A chain like this can bend without dropping a condition. Some conditions can become conditions subsequent:
      promises to deliver within an agreed period after the first disbursement, where missing one is an event of
      default. And some late documents have an accepted alternative, such as a certified copy of a board resolution, a
      regulator’s comfort letter or a broker’s letter of undertaking: an <span class="tkc-or">OR</span> inside the
      chain.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="One signed loan, 2,000 times" sub="One loan, signed 2,000 times with different luck. Each bar counts loans by the day the money moved.">
      <Puzzle id="disbursement" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <Slider
          id="d-before"
          label="Conditions before the money moves"
          bind:value={before}
          min={MIN_BEFORE}
          max={TOTAL}
          format={(v) => `${v} before · ${TOTAL - v} after`}
        />
        <div class="ctl">
          <Segmented
            name="d-late"
            label="If a document is late"
            bind:value={late}
            options={[
              { value: 'wait', label: 'Wait for it' },
              { value: 'alt', label: 'Accept an alternative' },
            ]}
          />
          <p class="tkc-caption">Where one exists, once approved.</p>
        </div>
        {#if revealed}
          <Segmented
            name="d-parties"
            label="The borrower, lawyers and registries are"
            bind:value={parties}
            options={[
              { value: 'predictable', label: 'Predictable' },
              { value: 'unpredictable', label: 'Unpredictable' },
            ]}
          />
        {/if}
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat label="Typical loan" value="{mid} days" sub="working days; half are sooner" />
        <Stat label="9 in 10 disbursed by" value="{p90} days" sub="target: {TARGET} days" swatch="var(--tkc-conditions)" line={true} />
      </div>

      <div class="part" bind:clientWidth={width}>
        <div class="tkc-fig-title small">One of the 2,000 loans</div>
        <svg {width} height={TH} role="img" aria-label={loanLabel}>
          <!-- Group headings -->
          <text class="tkc-axis-title tkc-halo" x="0" y={LANE + 15}>Before the money moves · {n}</text>
          <text class="tkc-axis-title tkc-halo" x="0" y={afterHeadY + 15}>After the money moves · {TOTAL - n}</text>

          <!-- The day the money moves, drawn under the rows so that their labels stay legible -->
          <line class="money" x1={moneyX} x2={moneyX} y1={LANE - 6} y2={rowsBottom} />

          {#each loan.conditions as c, i (c.id)}
            {@const cy = dotY(i)}
            {@const x = tx(day(c.required ? c.met : c.good))}
            {@const cond = CONDITIONS[i]}
            <g class="row" class:moved={!c.required}>
              <line class="track" x1={plotLeft} x2={width - 10} y1={cy} y2={cy} />
              <line class="typical" x1={tx(cond.median)} x2={tx(cond.median)} y1={cy - 5} y2={cy + 5} />
              {#if c.hasAlt}
                <rect class="or-tag" x="0" y={nameY(i) - 11} width="18" height="14" rx="4" />
                <text class="or-text" x="9" y={nameY(i) - 1}>or</text>
              {/if}
              <text class="tkc-label-2 tkc-halo name" class:strong={c.setsDate && c.required} x={TAG} y={nameY(i)}
                >{c.name}{#if c.setsDate && c.required && notePlace === 'name'}<tspan class="sets">{'\u00a0· sets the date'}</tspan>{/if}</text
              >
              {#if c.required && c.alt}
                <line class="saved" x1={x} x2={tx(day(c.good))} y1={cy} y2={cy} />
                <circle class="original" cx={tx(day(c.good))} {cy} r="3.5" />
              {/if}
              {#if c.required && c.setsDate}
                <circle class="ring" cx={x} {cy} r="7" />
              {/if}
              <circle class="dot" class:alt={c.required && c.alt} cx={x} {cy} r="4.5" />
              {#if c.required && c.setsDate && notePlace !== 'name'}
                {@const nx = notePlace === 'beyond' ? moneyX + 6 : x - 11}
                <text class="sets-label tkc-halo" x={nx} y={cy + 4} text-anchor={notePlace === 'left' ? 'end' : 'start'}>sets the date</text>
              {/if}
            </g>
          {/each}

          <text class="tkc-label tkc-halo" x={moneyRight ? moneyX + 5 : moneyX - 5} y={LANE - 10} text-anchor={moneyRight ? 'start' : 'end'}>Money moves · day {loan.day}</text>

          {#each [0, 20, 40, 60, 80, 100, 120] as t}
            <text class="tkc-axis-label" x={tx(t)} y={rowsBottom + 16} text-anchor={t === 0 && compact ? 'start' : t === XMAX ? 'end' : 'middle'}>{t}</text>
          {/each}
          <text class="tkc-axis-label" x={plotLeft + (width - 10 - plotLeft) / 2} y={rowsBottom + 31} text-anchor="middle">working days after signing</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="key-typical" aria-hidden="true"></span>Typical day</span>
          <span><span class="tkc-swatch dot-key" aria-hidden="true"></span>Met</span>
          <span><span class="or-key" aria-hidden="true">or</span>Has an alternative</span>
          {#if anyAlt}<span><span class="tkc-swatch dot-key alt" aria-hidden="true"></span>Met by its alternative <span class="orig-key" aria-hidden="true"></span>original’s day</span>{/if}
        </div>
      </div>

      <div class="part">
        <div class="tkc-fig-title small">All 2,000 loans</div>
        <svg {width} height={HH} role="img" aria-label="Days from signing to disbursement for 2,000 simulated loans. Typical loan {mid} working days; nine in ten by {p90}; target {TARGET}; the loan above, {loan.day}.">
          {#each ticks(0, yMax, 3) as t}
            <line class="tkc-grid" x1={hm.left} x2={width - hm.right} y1={hy(t)} y2={hy(t)} />
            <text class="tkc-axis-label" x={hm.left - 6} y={hy(t) + 4} text-anchor="end">{t}</text>
          {/each}
          <text class="tkc-axis-title" x="0" y={hm.top - 2}>Loans</text>
          {#each hist.bins as c, i}
            {#if c > 0}
              <path d={barUp(hx(i), hy(c), binW, hy(0) - hy(c), 1.5)} class="bin" class:tail={i > p90} />
            {/if}
          {/each}
          {#if !isStart}<path d={ghost} class="ghost" />{/if}
          <line class="tkc-base" x1={hm.left} x2={width - hm.right} y1={hy(0)} y2={hy(0)} />
          {#each marks as mk (mk.key)}
            <line class="mark {mk.key}" x1={mk.x} x2={mk.x} y1={mk.y + 4} y2={hy(0)} />
          {/each}
          {#each marks as mk (mk.key)}
            {@const right = mk.x + 118 < width}
            <text class="tkc-label tkc-halo mark-label {mk.key}" x={right ? mk.x + 4 : mk.x - 4} y={mk.y} text-anchor={right ? 'start' : 'end'}>{mk.text}</text>
          {/each}
          {#each [0, 20, 40, 60, 80, 100, 120] as t}
            <text class="tkc-axis-label" x={hx(t + 0.5)} y={hy(0) + 15} text-anchor={t === XMAX ? 'end' : 'middle'}>{t}</text>
          {/each}
          <path class="this" d="M{thisX} {hy(0) + 20}l5 8h-10z" />
          <text class="tkc-label-2 tkc-halo" x={thisX + (thisX + 120 < width ? 9 : -9)} y={hy(0) + 29} text-anchor={thisX + 120 < width ? 'start' : 'end'}>this loan · day {loan.day}</text>
          <text class="tkc-axis-label" x={Math.max(hm.left + (width - hm.left - hm.right) / 2, 0) - (compact ? 18 : 0)} y={HH - 4} text-anchor="middle">working days from signing to disbursement</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch" style:background="var(--tkc-ink-2)" aria-hidden="true"></span>Loans by day disbursed</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)" aria-hidden="true"></span>Slowest one in ten</span>
          {#if !isStart}<span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-muted)" aria-hidden="true"></span>At the start</span>{/if}
          {#if hist.beyond > 0}<span>{hist.beyond} loans after day {XMAX}, off the chart</span>{/if}
        </div>
      </div>

      {#snippet model()}
        <p>
          A Monte Carlo simulation: the same signed loan, 2,000 times, with the same luck under every setting. Each
          condition is met after a log-normal number of working days around its typical day: KYC checks 7, Board approval
          5, Security signed 10, Legal opinion 12 (after the security is signed), Central bank 20 (the loan registered, or
          exchange-control approval; it moves after disbursement only where local law allows registration after
          drawdown), ESAP actions due before disbursement 15, Permits 30, Equity paid in 15, Insurance 10
          (lenders named on the policies), Security registered 35 (after signing), Hedging 25, Process agent 5. These are
          professional estimates, not data. Eight deliveries in ten arrive within about a fifth of their typical day when
          the parties are predictable, and between half and twice it when they are unpredictable.
        </p>
        <p>
          A document is checked in three working days, and 15% come back for correction; the corrected one arrives after
          about half the original’s typical time. The money moves three working days after the last condition is met. Checks run side by
          side; one reviewer checking documents one at a time, in order of arrival, would add a day or two at the start,
          and up to about two weeks when predictable parties or alternatives bunch the documents together.
        </p>
        <p>
          Alternatives: a condition still open after 20 working days is met by its alternative once that arrives and a
          waiver is signed off, about five working days later. Board approval: a certified copy, originals to follow.
          Permits: a regulator’s comfort letter, or evidence of a filed renewal. Equity paid in: the sponsor’s commitment,
          backed by a bank guarantee or letter of credit. Insurance: the broker’s letter of undertaking. Security
          registered: evidence of filing and a letter from local counsel, which exist only once the security has been
          filed, about ten working days after it is signed.
        </p>
        <p>
          The slider moves conditions to after the money moves, least protective first: Process agent, Hedging, Security
          registered (then due after disbursement, with evidence of filing), Insurance, Equity paid in, Permits, ESAP
          actions, Central bank. KYC checks, Board approval, Security signed and Legal opinion never move. The loan in the
          timeline is one of the 2,000, with the same luck whatever the settings.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Each condition on its own is usually in good time: every one of the twelve is met soon enough for the money to move
      within {TARGET} working days in at least {worstEach} loans in 100. All twelve together manage it in only {allTogether}.
      That is the arithmetic of chapter 1: a chain of <span class="tkc-and">ANDs</span> holds only when every link holds
      at once.
    </p>
    <p>
      Each condition is one more chance to be late, and, as with the pieces of work in chapter 5, the slowest sets the
      date. No condition typically takes more than
      {slowestTypical} working days, yet the typical loan waits {F.start.mid}: it waits for whichever condition is late this
      time, and with twelve, one usually is. Security registered, the slowest on paper, set the date in only
      {registeredShare < 0.425 && registeredShare >= 0.375 ? 'two loans in five' : `${Math.round(registeredShare * 100)}% of loans`}.
    </p>
    <h3>Spread, not averages</h3>
    <p>
      Every condition has the same typical time whether the parties are predictable or not. With predictable parties,
      the typical loan disburses in {F.pred.mid} working days and nine in ten by {F.pred.p90}. With unpredictable ones,
      the typical loan takes {F.start.mid} days and nine in ten take up to {F.start.p90}: {F.start.mid - F.pred.mid} days
      more for the typical loan, {F.start.p90 - F.pred.p90} more for the slow tail. As in the coin game of chapter 7,
      nothing changes on paper, and what the loans live through changes a great deal.
    </p>
    <h3>An OR inside the AND</h3>
    <p>
      An alternative does not make the original arrive sooner. It limits how late that one document can make the loan.
      Like the optional tool in chapter 11, it is worth most when the world is erratic: here alternatives brought the
      nine-in-ten mark forward by {F.start.p90 - F.alt.p90} working days with unpredictable parties, and by
      {F.pred.p90 - F.predAlt.p90} with predictable ones. Variability helps whatever is optional.
    </p>
    <h3>Which conditions must come first</h3>
    <p>
      A condition subsequent keeps the promise but changes its force. Before the money moves, a missing document keeps
      the door shut; afterwards it is a default to manage. Some conditions can wait for a later drawdown instead. Four
      never move here: the lender knows the client, the borrower’s board has approved the loan, the security is signed
      and a legal opinion says it holds, all before any money moves.
    </p>
    <p>
      The whole story fits in this one loan. Specialists each do their part well; joined by ANDs, their parts make a long
      chain, and variability finds its weakest link. Alternatives and a shorter list before the money moves keep every
      condition on the list, and let the chain bend instead of break.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our conditions precedent truly need the money to wait?">
      <p>
        Each condition on a list was added for a reason, usually a good one. The list rarely records which reasons need
        the money to wait, and which a promise with a deadline, or another document, would serve as well.
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
  .part {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--tkc-hair);
  }
  .small {
    font-size: 0.9375rem;
  }
  .part svg {
    display: block;
    overflow: visible;
  }
  .row {
    transition: opacity 200ms ease;
  }
  .row.moved {
    opacity: 0.42;
  }
  .track {
    stroke: var(--tkc-hair);
    stroke-width: 1;
  }
  .typical {
    stroke: var(--tkc-rule);
    stroke-width: 1.5;
  }
  .name.strong {
    fill: var(--tkc-ink);
    font-weight: 600;
  }
  .sets,
  .sets-label {
    fill: var(--tkc-conditions-ink);
    font-weight: 600;
  }
  .sets-label {
    font-size: 12px;
  }
  .or-tag {
    fill: var(--tkc-options-wash);
    stroke: var(--tkc-options);
    stroke-width: 1;
  }
  .or-text {
    fill: var(--tkc-options-ink);
    font-size: 10.5px;
    font-weight: 700;
    text-anchor: middle;
  }
  .dot {
    fill: var(--tkc-ink-2);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
    transition: cx 250ms ease;
  }
  .dot.alt {
    fill: var(--tkc-options);
  }
  .ring {
    fill: none;
    stroke: var(--tkc-conditions);
    stroke-width: 2;
    transition: cx 250ms ease;
  }
  .original {
    fill: var(--tkc-surface);
    stroke: var(--tkc-muted);
    stroke-width: 1.25;
  }
  .saved {
    stroke: var(--tkc-muted);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .money {
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
  }
  .bin {
    fill: var(--tkc-ink-2);
    opacity: 0.78;
  }
  .bin.tail {
    fill: var(--tkc-conditions);
    opacity: 1;
  }
  .ghost {
    fill: none;
    stroke: var(--tkc-muted);
    stroke-width: 1.25;
    stroke-linejoin: round;
  }
  .mark {
    stroke-width: 1.5;
  }
  .mark.mid {
    stroke: var(--tkc-ink);
  }
  .mark.p90 {
    stroke: var(--tkc-conditions);
  }
  .mark.target {
    stroke: var(--tkc-ink-2);
    stroke-dasharray: 4 3;
  }
  .mark-label.p90 {
    fill: var(--tkc-conditions-ink);
  }
  .this {
    fill: var(--tkc-ink);
  }
  .key-typical {
    display: inline-block;
    width: 2px;
    height: 10px;
    background: var(--tkc-rule);
  }
  .dot-key {
    border-radius: 50%;
    background: var(--tkc-ink-2);
  }
  .dot-key.alt {
    background: var(--tkc-options);
  }
  .orig-key {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.25px solid var(--tkc-muted);
    margin-left: 4px;
  }
  .or-key {
    display: inline-block;
    padding: 0 4px;
    border-radius: 4px;
    border: 1px solid var(--tkc-options);
    background: var(--tkc-options-wash);
    color: var(--tkc-options-ink);
    font-size: 0.6875rem;
    font-weight: 700;
    line-height: 14px;
  }
</style>
