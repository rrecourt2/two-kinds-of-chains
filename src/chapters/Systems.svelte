<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulateSystems, histogram, SYSTEMS, HORIZON, DEADLINE, SPOT_END, ENTER, FIX, AWAY, QUEUED, OK, STOP, IDLE } from '../lib/sim/systems.js';
  import { linear, ticks, barUp } from '../lib/scales.js';
  import { pct, shortDays } from '../lib/format.js';

  // Fixed assumptions: six systems, a one-in-ten chance of a hidden problem in each form, approvers in 85% of days.
  const FIXED = { systems: 6, problems: 0.1, availability: 0.85, meanSpell: 4, standIns: 0 };
  const START = { info: 'copies', approvals: 'each' };
  const systems = FIXED.systems;

  let info = $state(START.info);
  let approvals = $state(START.approvals);
  let width = $state(560);
  let hover = $state(null);

  // The first 40 requests are recorded day by day (recording draws nothing, so the results are unchanged).
  const result = $derived(simulateSystems({ ...FIXED, info, approvals }, { journeys: 40 }));
  const baseline = simulateSystems({ ...FIXED, ...START });
  const isStart = $derived(info === START.info && approvals === START.approvals);

  // Histogram of lead times: the second chart, across all the simulated requests.
  const MAX = 60;
  const H = 170;
  const m = { top: 24, right: 10, bottom: 36, left: 36 };
  const bins = $derived(histogram(result.days, MAX));
  const baseBins = histogram(baseline.days, MAX);
  const yMax = $derived(Math.max(...bins, ...(isStart ? [] : baseBins)) * 1.12 || 1);
  const x = $derived(linear(0, MAX + 1, m.left, width - m.right));
  const y = $derived(linear(0, yMax, H - m.bottom, m.top));
  const binW = $derived(Math.max(1, x(1) - x(0) - 2));
  const baseOutline = $derived(baseBins.reduce((d, c, i) => d + `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(c).toFixed(1)}H${x(i + 1).toFixed(1)}`, ''));

  // The main chart: one request's journey through the six systems, day by day. It is the recorded journey
  // closest to the median as the tile rounds it, preferring one where a problem was found. The day scale stays
  // at four working weeks unless the journey is longer, so a faster design shows as a shorter row of days.
  const stopsIn = (j) => j.filter((d) => d.gates.includes(STOP) || d.final === STOP).length;
  const pick = $derived.by(() => {
    const off = (j) => Math.abs(j.length - Math.round(result.median));
    return result.journeys.reduce((a, j, i) => (off(j) < off(result.journeys[a]) || (off(j) === off(result.journeys[a]) && stopsIn(j) > stopsIn(result.journeys[a])) ? i : a), 0);
  });
  const journey = $derived(result.journeys[pick] ?? []);
  const journeyHours = $derived(Math.round(result.journeyWork[pick] ?? 0));
  const shownDays = $derived(Math.min(journey.length, MAX));
  const scaleDays = $derived(Math.max(20, shownDays));
  const rows = $derived([...SYSTEMS.slice(0, systems), ...(approvals === 'end' ? ['Final approval'] : [])]);
  const narrowJ = $derived(width < 420);
  const labelW = $derived(narrowJ ? 94 : 116);
  const cellW = $derived(Math.max(3, Math.min(24, (width - labelW - 4) / scaleDays)));
  const rowH = $derived(narrowJ ? 16 : 20);
  const rowGap = 4;
  const journeyStops = $derived(stopsIn(journey));
  const dayTicks = $derived([1, ...Array.from({ length: Math.floor(scaleDays / 5) }, (_, i) => (i + 1) * 5)].filter((d) => d <= scaleDays));
  // Room above the rows for the label on the end line.
  const JT = 16;
  const endX = $derived(labelW + shownDays * cellW);
  const endText = $derived(journey.length > MAX ? `not done by day ${MAX}` : `done: day ${journey.length}`);
  const svgW = $derived(Math.max(width, labelW + scaleDays * cellW + 4));
  const endAnchor = $derived(endX + endText.length * 3.3 > svgW ? 'end' : endX - endText.length * 3.3 < labelW ? 'start' : 'middle');

  // Who sees a problem: the rule behind the share that slips through.
  const PRICING = SYSTEMS.indexOf('Pricing tool');
  const sees = $derived(
    approvals === 'end'
      ? `Every problem meets one approver, at the end, who catches ${Math.round(SPOT_END * 10)} in 10.`
      : info === 'copies'
        ? `Each approver sees only their own system’s copy: a problem typed into the Pricing tool meets ${systems - PRICING} of the ${systems} approvers.`
        : `Every approver reads the one record: a problem anywhere meets all ${systems} approvers, and any one of them can stop it.`,
  );
  const cellClass = { [ENTER]: 'enter', [FIX]: 'fix', [AWAY]: 'away', [QUEUED]: 'queued', [OK]: 'ok', [STOP]: 'stop' };

  const fast = $derived(result.median < 10);
  const safe = $derived(result.slipped < 0.02);
  const puzzle = $derived({
    goal: 'All six systems stay. Make the typical request faster and safer at the same time.',
    met: fast && safe,
    checks: [
      { label: `Typical request under two weeks (now ${shortDays(result.median, HORIZON)} working days)`, ok: fast },
      { label: `Problems slip through on fewer than 2% of requests (now ${pct(result.slipped, 1)})`, ok: safe },
    ],
    hints: ['Cutting checks is not the only way to speed things up. Look at how the systems get their data.', 'Which setting changes how many places a problem has to be fixed?'],
    found: 'One shared record, with every approval kept: a typical request takes about a week, and almost no problems slip through.',
  });
  const showAnswer = () => ((info = 'shared'), (approvals = 'each'));
</script>

<Chapter
  n={3}
  kicker="Linked systems"
  title="When systems lean on each other"
  lede="Six good systems can add up to one slow chain. Can it be made faster and safer at the same time?"
  puzzle="systems"
>
  {#snippet setup()}
    <p>
      Specialists build systems, and that is good complexity. The risk team builds the risk model, the credit team the
      limits register, operations the loan booking system. Each one is excellent at its job.
    </p>
    <p>
      Then a client request arrives that needs all of them. Each system has its own form, its own approval and its own
      copy of the client’s data, taken from the system before. Each approval is a gate, and the systems are linked in
      one long chain.
    </p>
    <p>
      Two things happen in a chain like that. Approvers are sometimes away, and the request waits. A problem entered
      early, a wrong date or a missing identifier, travels unseen into every system after it; once spotted, it stops
      the request and has to be fixed everywhere it went.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument rules={['Six systems, a day each; each form has a one-in-ten chance of a hidden problem.', 'An approver catches half the problems in front of them; one at the end, 90%.', 'Approvers are in 85% of days, and nobody stands in for them.']} title="One request, six linked systems" sub="One request through the six systems, day by day; below it, how long 1,500 such requests take.">
      <Puzzle id="systems" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls tkc-controls--wide">
        <Segmented
          name="s-info"
          label="Client data"
          bind:value={info}
          options={[
            { value: 'copies', label: 'Each system copies the one before' },
            { value: 'shared', label: 'One shared record' },
          ]}
        />
        <Segmented
          name="s-appr"
          label="Approvals"
          bind:value={approvals}
          options={[
            { value: 'each', label: 'One approval per system' },
            { value: 'end', label: 'One approval at the end' },
          ]}
        />
      </div>
      <p class="tkc-small sees" use:announce>{sees}</p>

      <div class="journey">
        <p class="tkc-label j-title">One request, day by day</p>
        <p class="tkc-small">
          One request near the median: {journey.length >= HORIZON ? 'more than a year' : `${journey.length} working day${journey.length === 1 ? '' : 's'}`} for
          {journeyHours} hours of work, the rest waiting;
          {journeyStops ? `stopped ${journeyStops === 1 ? 'once' : `${journeyStops} times`} by a problem, fixed and approved again.` : 'no problem found.'}
        </p>
        <div class="tkc-scroll-x" bind:clientWidth={width}>
          <svg width={svgW} height={JT + rows.length * (rowH + rowGap) + 22} role="img" aria-label="Day-by-day journey of one request near the median through the systems: {journey.length} working days, {journeyHours} hours of work.">
            <text class="tkc-label-2" x={endX} y="11" text-anchor={endAnchor}>{endText}</text>
            <g transform="translate(0 {JT})">
            {#each rows as label, r}
              <text class="tkc-label-2" class:j-small={narrowJ} x="0" y={r * (rowH + rowGap) + rowH / 2 + 4}>{label}</text>
              <line class="tkc-grid" x1={labelW} x2={labelW + scaleDays * cellW} y1={r * (rowH + rowGap) + rowH + rowGap / 2} y2={r * (rowH + rowGap) + rowH + rowGap / 2} />
            {/each}
            {#each journey.slice(0, shownDays) as day, d}
              {#each [...day.gates] as c, g}
                {#if c !== IDLE}
                  <rect x={labelW + d * cellW + 0.5} y={g * (rowH + rowGap)} width={Math.max(1, cellW - 2)} height={rowH} rx="3" class="cell {cellClass[c]}" />
                {/if}
              {/each}
              {#if approvals === 'end' && day.final !== IDLE}
                <rect x={labelW + d * cellW + 0.5} y={systems * (rowH + rowGap)} width={Math.max(1, cellW - 2)} height={rowH} rx="3" class="cell {cellClass[day.final]}" />
              {/if}
            {/each}
            <line class="j-end" x1={endX} x2={endX} y1="-2" y2={rows.length * (rowH + rowGap)} />
            {#each dayTicks as t}
              <text class="tkc-axis-label" x={labelW + (t - 0.5) * cellW} y={rows.length * (rowH + rowGap) + 14} text-anchor="middle">{t}</text>
            {/each}
            <text class="tkc-axis-label" x={labelW - 8} y={rows.length * (rowH + rowGap) + 14} text-anchor="end">Day</text>
            </g>
          </svg>
        </div>
        {#if journey.length > MAX}
          <p class="tkc-caption">Showing the first {MAX} days of {journey.length >= HORIZON ? 'more than 250' : journey.length}.</p>
        {/if}
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-enter"></span>Filling in</span>
          <span><span class="tkc-swatch sw-ok"></span>Approved</span>
          <span><span class="tkc-swatch sw-away"></span>Waiting: approver away</span>
          <span><span class="tkc-swatch sw-stop"></span>Problem found: stopped</span>
          <span><span class="tkc-swatch sw-fix"></span>{info === 'copies' ? 'Fixing it, in every copy it reached' : 'Fixing it, once, in the shared record'}</span>
        </div>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat label="Typical request" value="{shortDays(result.median, HORIZON)} days" sub="median, working days" />
        <Stat label="Hidden problems that slip through" value={pct(result.slipped, 1)} sub="of requests, after every check" />
      </div>

      <!-- The second chart repeats what the tiles say, so it stays folded until asked for. -->
      <details class="tkc-note hist">
        <summary>1,500 such requests</summary>
        <div class="tkc-chart">
          <svg {width} height={H} role="img" aria-label="Distribution of lead times. Median {Math.round(result.median)} days; the slowest one in ten take {Math.round(result.p90)} days or more.">
            {#each ticks(0, yMax, 3) as t}
              <line class="tkc-grid" x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} />
              <text class="tkc-axis-label" x={m.left - 6} y={y(t) + 4} text-anchor="end">{t}</text>
            {/each}
            <line class="tkc-base" x1={m.left} x2={width - m.right} y1={y(0)} y2={y(0)} />
            {#each bins as c, i}
              {#if c > 0}
                <path d={barUp(x(i) + 1, y(c), binW, y(0) - y(c), 2)} class="bin" class:hot={hover === i} class:tail={i >= result.p90} />
              {/if}
            {/each}
            {#if !isStart}<path d={baseOutline} class="ghost" />{/if}
            <line class="deadline" x1={x(DEADLINE + 1)} x2={x(DEADLINE + 1)} y1={m.top - 6} y2={y(0)} />
            <text class="tkc-axis-label" x={x(DEADLINE + 1) + 4} y={m.top - 10}>Two weeks</text>
            <line class="marker" x1={x(result.median + 0.5)} x2={x(result.median + 0.5)} y1={m.top + 4} y2={y(0)} />
            <text class="tkc-label tkc-halo" x={x(result.median + 0.5) + 4} y={m.top + 14}>Median</text>
            {#each [0, 10, 20, 30, 40, 50, 60] as t}
              <text class="tkc-axis-label" x={x(t + 0.5)} y={H - m.bottom + 16} text-anchor="middle">{t === MAX ? '60+' : t}</text>
            {/each}
            <text class="tkc-axis-title" x={m.left + (width - m.left - m.right) / 2} y={H - 4} text-anchor="middle">Working days from request to done</text>
            <text class="tkc-axis-title" x={m.left - 30} y={m.top - 10}>Requests</text>
            <rect
              x={m.left}
              y={m.top}
              width={Math.max(0, width - m.left - m.right)}
              height={H - m.top - m.bottom}
              fill="transparent"
              role="presentation"
              onpointermove={(e) => {
                const box = e.currentTarget.getBoundingClientRect();
                hover = Math.max(0, Math.min(MAX, Math.floor(x.invert(e.clientX - box.left + m.left))));
              }}
              onpointerleave={() => (hover = null)}
            />
          </svg>
          {#if hover !== null}
            <div class="tkc-tip" style:left="{Math.min(width - 170, Math.max(0, x(hover) - 60))}px" style:top="30px">
              <strong>{bins[hover]} requests</strong>
              <div>took {hover === MAX ? '60 or more' : hover} working day{hover === 1 ? '' : 's'}</div>
            </div>
          {/if}
          <div class="tkc-legend">
            <span><span class="tkc-swatch" style:background="var(--tkc-ink-2)"></span>Requests by lead time</span>
            <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Slowest one in ten</span>
            {#if !isStart}<span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-muted)"></span>Starting setup</span>{/if}
          </div>
        </div>
      </details>

      {#snippet model()}
        <p>Filling in a system takes two hours of work; the next person picks it up the next day. Each form has a 10% chance of a hidden problem.</p>
        <p>An approver sees only their own system’s data (with copies, that includes every problem copied in from earlier systems) and spots each problem in it half the time. On one shared record every approver sees the whole record, independently, so six together miss a problem about 1 time in 64; approvers who miss the same problems would catch far fewer. One approver at the end spots 90%. A spotted problem stops the request. With copies it is corrected where it started and in every later system it reached, and approved again; with a shared record, once. Approvers are in 85% of days, absences last four days on average, and nobody stands in for them.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      The starting chain takes more than three working weeks for a typical request, and only about one hour in seven
      of that time is spent working on it. One request in ten still carries a hidden problem at the end, because a
      problem that enters late meets few checks.
    </p>
    <p>
      Copying data from system to system is the party game of passing a whispered message down a line: it arrives
      changed, and nobody can say where it changed. Each copy is a chance for a field to drift, and each fix has to be
      made and approved again, system by system.
    </p>
    <h3>Same checks, different shape</h3>
    <p>
      With one shared record, the data is entered once and a problem is fixed in one place. Every approver sees the
      whole request, so the approvals can run at the same time. Every gate stays, and the request is both faster and
      safer.
    </p>
    <p>
      One approval at the end, on a shared record, is the fastest design, but it lets about 4 requests in 100 through,
      against fewer than 1 in 100 when six approvers review the shared record side by side. Which matters more depends
      on whether the decision can be undone.
    </p>
    <p>
      Shared does not have to mean central. A single database that every request must pass through is itself a hub:
      when it is slow, everyone is slow, and people start keeping their own copies again. A record works best when each
      piece of data has one home, close to the people who create it, and everyone else reads it from there. Every new
      tool that brings its own form, approval and copy of the data makes sense to the team that built it, and makes the
      chain one link longer.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our systems ask for data that already exists in another system?">
      <p>
        A client’s owners, accounts and address can sit in the onboarding, credit, booking and monitoring systems at once.
        Each time the same data is typed in again, there is one more copy that can drift, and one more place where a fix
        must be repeated.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .bin {
    fill: var(--tkc-ink-2);
    opacity: 0.78;
  }
  .bin.tail {
    fill: var(--tkc-conditions);
    opacity: 1;
  }
  .bin.hot {
    opacity: 0.55;
  }
  .ghost {
    fill: none;
    stroke: var(--tkc-muted);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  .deadline {
    stroke: var(--tkc-rule);
    stroke-width: 1;
  }
  .marker {
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
  }
  .journey {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 6px;
  }
  .j-title {
    font-size: 0.875rem;
    color: var(--tkc-ink);
  }
  .hist .tkc-chart {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    padding-top: 8px;
  }
  .j-small {
    font-size: 11px;
  }
  .j-end {
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
  }
  .sees {
    padding: 8px 12px;
    border-left: 3px solid var(--tkc-rule);
    color: var(--tkc-ink-2);
    text-wrap: pretty;
  }
  .cell.enter,
  .sw-enter {
    fill: var(--tkc-rule);
    background: var(--tkc-rule);
  }
  .cell.ok,
  .sw-ok {
    fill: var(--tkc-ink-2);
    background: var(--tkc-ink-2);
  }
  .cell.away,
  .sw-away {
    fill: color-mix(in srgb, var(--tkc-conditions) 35%, var(--tkc-surface));
    background: color-mix(in srgb, var(--tkc-conditions) 35%, var(--tkc-surface));
  }
  .cell.away {
    stroke: var(--tkc-conditions);
    stroke-width: 1;
  }
  .sw-away {
    box-shadow: inset 0 0 0 1px var(--tkc-conditions);
  }
  .cell.queued {
    fill: var(--tkc-sunken);
  }
  .cell.stop,
  .sw-stop {
    fill: var(--tkc-conditions);
    background: var(--tkc-conditions);
  }
  .cell.fix {
    fill: var(--tkc-surface);
    stroke: var(--tkc-conditions);
    stroke-width: 1.5;
    stroke-dasharray: 2 2;
  }
  .sw-fix {
    background: var(--tkc-surface);
    border: 1.5px dashed var(--tkc-conditions);
  }
</style>
