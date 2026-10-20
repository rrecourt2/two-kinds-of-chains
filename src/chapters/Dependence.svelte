<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import TryThis from '../lib/ui/TryThis.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulateRelay, histogram, HORIZON, DEADLINE, APPROVED, SENT_BACK, AWAY } from '../lib/sim/relay.js';
  import { linear, ticks, barUp } from '../lib/scales.js';
  import { pct, shortDays } from '../lib/format.js';

  const START = { gates: 6, standIns: 0, parallel: false, availability: 85, meanSpell: 4, sendBack: 10 };

  let gates = $state(START.gates);
  let standIns = $state(START.standIns);
  let parallel = $state(START.parallel);
  let availability = $state(START.availability);
  let meanSpell = $state(START.meanSpell);
  let sendBack = $state(START.sendBack);
  let journeyIndex = $state(0);
  let width = $state(560);
  let hover = $state(null);

  const options = (o) => ({
    gates: o.gates,
    standIns: o.standIns,
    parallel: o.parallel,
    availability: o.availability / 100,
    meanSpell: o.meanSpell,
    sendBack: o.sendBack / 100,
  });
  const result = $derived(
    simulateRelay(options({ gates, standIns, parallel, availability, meanSpell, sendBack }), { journeys: 12 }),
  );
  const baseline = simulateRelay(options(START));
  const isStart = $derived(
    gates === START.gates &&
      standIns === START.standIns &&
      parallel === START.parallel &&
      availability === START.availability &&
      meanSpell === START.meanSpell &&
      sendBack === START.sendBack,
  );

  // Histogram of lead times.
  const MAX = 60;
  const H = 210;
  const m = { top: 24, right: 10, bottom: 36, left: 36 };
  const bins = $derived(histogram(result.days, MAX));
  const baseBins = histogram(baseline.days, MAX);
  const yMax = $derived(Math.max(...bins, ...(isStart ? [] : baseBins)) * 1.12 || 1);
  const x = $derived(linear(0, MAX + 1, m.left, width - m.right));
  const y = $derived(linear(0, yMax, H - m.bottom, m.top));
  const binW = $derived(Math.max(1, x(1) - x(0) - 2));
  const baseOutline = $derived(
    baseBins.reduce((d, c, i) => d + `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(c).toFixed(1)}H${x(i + 1).toFixed(1)}`, ''),
  );
  const xTicks = [0, 10, 20, 30, 40, 50, 60];

  // One request's journey.
  const journey = $derived(result.journeys[journeyIndex % result.journeys.length] ?? []);
  const shownDays = $derived(Math.min(journey.length, MAX));
  const labelW = 64;
  const cellW = $derived(Math.max(3, Math.min(14, (width - labelW) / Math.max(shownDays, 20))));
  const rowH = 12;
  const journeyHours = $derived(
    journey.reduce((h, day) => h + (day.rework ? 2 : [...day.gates].filter((c) => c === APPROVED || c === SENT_BACK).length), 0),
  );
  const journeySendBacks = $derived(journey.filter((d) => d.rework).length);

  const tries = [
    { label: 'Add two more sign-offs', apply: () => (gates = Math.min(10, gates + 2)) },
    { label: 'Give every gate a stand-in', apply: () => (standIns = 1) },
    { label: 'Review all at once', apply: () => (parallel = true) },
    { label: 'Send-backs at 20%', apply: () => (sendBack = 20) },
    {
      label: 'Reset everything',
      apply: () => {
        ({ gates, standIns, parallel, availability, meanSpell, sendBack } = START);
      },
    },
  ];

  const cellClass = (c) => (c === APPROVED ? 'ok' : c === SENT_BACK ? 'back' : c === AWAY ? 'away' : 'idle');
</script>

<Chapter n={3} kicker="Dependence" title="Waiting for people who aren’t there">
  {#snippet setup()}
    <p>
      Now follow a single request through a chain of sign-offs. Each sign-off takes about an hour of real work. The
      trouble is the waiting in between.
    </p>
    <p>
      Every gate adds a condition: this specific person must be in, and must agree, before anything else can happen.
      People are away in blocks rather than single days: a week of holiday, three days of training, a business trip.
    </p>
    <p>
      And if anyone sends the request back, it starts again from the first gate, because a changed request needs fresh
      approvals.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="The approval relay" sub="1,500 simulated requests through the same process.">
      <div class="tkc-controls">
        <Slider id="d-gates" label="Sign-offs" bind:value={gates} min={1} max={10} />
        <Slider id="d-stand" label="Stand-ins per sign-off" bind:value={standIns} min={0} max={2} />
        <Segmented
          name="d-order"
          label="Order"
          bind:value={parallel}
          options={[
            { value: false, label: 'One after another' },
            { value: true, label: 'All at once' },
          ]}
        />
      </div>
      <details class="assume">
        <summary>Change the assumptions</summary>
        <div class="tkc-controls">
          <Slider id="d-avail" label="Approver is in" bind:value={availability} min={60} max={99} format={(v) => `${v}% of days`} />
          <Slider id="d-spell" label="Typical absence" bind:value={meanSpell} min={1} max={10} format={(v) => `${v} day${v > 1 ? 's' : ''}`} />
          <Slider id="d-back" label="Chance a gate sends it back" bind:value={sendBack} min={0} max={25} format={(v) => `${v}%`} />
        </div>
      </details>

      <div class="tkc-stats tkc-stats--4" aria-live="polite">
        <Stat label="Typical request (median)" value="{shortDays(result.median, HORIZON)} days" sub="working days" />
        <Stat label="1 in 10 takes more than" value="{shortDays(result.p90, HORIZON)} days" swatch="var(--tkc-conditions)" line={true} />
        <Stat label="Answered within two weeks" value={pct(result.withinDeadline)} sub="10 working days" />
        <Stat label="Time actually worked" value={pct(result.workShare, result.workShare < 0.1 ? 1 : 0)} sub="of the elapsed working hours" />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label="Distribution of lead times. Median {Math.round(result.median)} days, 90th percentile {Math.round(result.p90)} days.">
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
          {#if !isStart}
            <path d={baseOutline} class="ghost" />
          {/if}
          <line class="deadline" x1={x(DEADLINE + 1)} x2={x(DEADLINE + 1)} y1={m.top - 6} y2={y(0)} />
          <text class="tkc-axis-label" x={x(DEADLINE + 1) + 4} y={m.top - 10}>Two weeks</text>
          <line class="marker" x1={x(result.median + 0.5)} x2={x(result.median + 0.5)} y1={m.top + 4} y2={y(0)} />
          <text class="tkc-label tkc-halo" x={x(result.median + 0.5) + 4} y={m.top + 14}>Median</text>
          {#each xTicks as t}
            <text class="tkc-axis-label" x={x(t + 0.5)} y={H - m.bottom + 16} text-anchor="middle">{t === MAX ? '60+' : t}</text>
          {/each}
          <text class="tkc-axis-title" x={m.left + (width - m.left - m.right) / 2} y={H - 4} text-anchor="middle">Working days from request to answer</text>
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
          <div class="tkc-tip" style:left="{Math.min(width - 170, Math.max(0, x(hover) - 60))}px" style:top="8px">
            <strong>{bins[hover]} requests</strong>
            <div>took {hover === MAX ? '60 or more' : hover} working day{hover === 1 ? '' : 's'}</div>
          </div>
        {/if}
        <div class="tkc-legend">
          <span><span class="tkc-swatch" style:background="var(--tkc-ink-2)"></span>Requests by lead time</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Slowest 10%</span>
          {#if !isStart}<span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-muted)"></span>Starting setup</span>{/if}
        </div>
      </div>

      <div class="journey">
        <div class="journey-head">
          <span class="tkc-fig-title small">One request’s journey</span>
          <button type="button" class="tkc-btn tkc-btn--small" onclick={() => (journeyIndex += 1)}>Show another request</button>
        </div>
        <p class="tkc-small">
          {journey.length >= HORIZON ? 'More than a year' : `${journey.length} working days`} for {journeyHours} hours of work{journeySendBacks
            ? `, sent back ${journeySendBacks === 1 ? 'once' : `${journeySendBacks} times`}`
            : ''}.
        </p>
        <div class="tkc-scroll-x">
          <svg width={labelW + shownDays * cellW + 4} height={(gates + 1) * (rowH + 3) + 22} role="img" aria-label="Day-by-day journey of one request.">
            {#each Array(gates) as _, g}
              <text class="tkc-axis-label" x="0" y={g * (rowH + 3) + rowH - 2}>Sign-off {g + 1}</text>
            {/each}
            <text class="tkc-axis-label" x="0" y={gates * (rowH + 3) + rowH - 2}>Rework</text>
            {#each journey.slice(0, shownDays) as day, d}
              {#each [...day.gates] as c, g}
                {#if c !== '.'}
                  <rect x={labelW + d * cellW} y={g * (rowH + 3)} width={Math.max(1, cellW - 1)} height={rowH} rx="2" class="cell {cellClass(c)}" />
                {/if}
              {/each}
              {#if day.rework}
                <rect x={labelW + d * cellW} y={gates * (rowH + 3)} width={Math.max(1, cellW - 1)} height={rowH} rx="2" class="cell rework" />
              {/if}
            {/each}
            {#each [0, 10, 20, 30, 40, 50] as t}
              {#if t < shownDays}
                <text class="tkc-axis-label" x={labelW + t * cellW} y={(gates + 1) * (rowH + 3) + 14}>Day {t + 1}</text>
              {/if}
            {/each}
          </svg>
        </div>
        {#if journey.length > MAX}
          <p class="tkc-caption">Showing the first {MAX} days of {journey.length >= HORIZON ? 'more than 250' : journey.length}.</p>
        {/if}
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-ok"></span>Signed</span>
          <span><span class="tkc-swatch sw-away"></span>Waiting: approver away</span>
          <span><span class="tkc-swatch sw-back"></span>Sent back</span>
          <span><span class="tkc-swatch sw-rework"></span>Rework</span>
        </div>
      </div>

      <TryThis items={tries} />

      {#snippet model()}
        <p>Each sign-off is an hour of work. An approver who is in clears it the same day, and the next gate picks it up the next day. With stand-ins, anyone in the pool can sign.</p>
        <p>Approvers are in {availability}% of days, and absences last {meanSpell} day{meanSpell > 1 ? 's' : ''} on average. Each gate sends the request back {sendBack}% of the time; the requester then spends a day on rework and the chain restarts. “All at once” sends the request to every gate on day one; send-backs are collected and handled together.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      With six sign-offs, approvers who are in 85% of the time and occasional send-backs, a request that needs about
      six hours of work takes two to three weeks. Almost all of that time is waiting.
    </p>
    <h3>Three things make it worse than it looks</h3>
    <ul>
      <li><strong>Absences come in blocks.</strong> If one approver is on holiday, everything behind them waits for the whole week.</li>
      <li>
        <strong>Send-backs multiply.</strong> If each gate approves first time 90% of the time, all six do so only 53% of
        the time, and with ten gates only 35%. Every restart repeats the whole chain.
      </li>
      <li><strong>The slow tail grows faster than the middle.</strong> The median request may look acceptable while one in ten turns into an escalation.</li>
    </ul>
    <h3>Two changes fix most of it, without removing a single control</h3>
    <p>
      Give every gate a stand-in, and send independent reviews out at the same time. In sequence, the waits add up. In
      parallel, you wait only for the slowest one.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Pick one process you know well. How many gates does it have, and which of them could run at the same time?">
      <p>
        Count the gates in one process and ask three questions of each. Can anyone qualified sign, or only one person?
        Does it really have to wait for the previous gate? What happens when the approver is on holiday?
      </p>
      <p>Keep the controls. Change their shape: any qualified signer, in parallel where possible, with automatic delegation when someone is away.</p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .assume summary {
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--tkc-ink-2);
    padding: 2px 0;
  }
  .assume[open] summary {
    margin-bottom: 10px;
  }
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
    gap: 8px;
    padding-top: 4px;
    border-top: 1px solid var(--tkc-hair);
  }
  .journey-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 12px;
  }
  .small {
    font-size: 0.9375rem;
  }
  .cell.ok,
  .sw-ok {
    fill: var(--tkc-ink-2);
    background: var(--tkc-ink-2);
  }
  .cell.away,
  .sw-away {
    fill: var(--tkc-conditions-wash);
    background: var(--tkc-conditions-wash);
  }
  .cell.away {
    stroke: var(--tkc-conditions);
    stroke-opacity: 0.4;
    stroke-width: 1;
  }
  .sw-away {
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tkc-conditions) 40%, transparent);
  }
  .cell.back,
  .sw-back {
    fill: var(--tkc-conditions);
    background: var(--tkc-conditions);
  }
  .cell.rework {
    fill: var(--tkc-surface);
    stroke: var(--tkc-conditions);
    stroke-width: 1.5;
  }
  .sw-rework {
    background: var(--tkc-surface);
    box-shadow: inset 0 0 0 1.5px var(--tkc-conditions);
  }
</style>
