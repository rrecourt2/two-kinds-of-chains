<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulateSystems, histogram, SYSTEMS, HORIZON, DEADLINE, ENTER, FIX, AWAY, QUEUED, OK, STOP, IDLE } from '../lib/sim/systems.js';
  import { linear, ticks, barUp } from '../lib/scales.js';
  import { pct, shortDays } from '../lib/format.js';

  const START = { systems: 6, problems: 10, info: 'copies', approvals: 'each', availability: 85, meanSpell: 4, standIns: 0 };

  let systems = $state(START.systems);
  let problems = $state(START.problems);
  let info = $state(START.info);
  let approvals = $state(START.approvals);
  let availability = $state(START.availability);
  let meanSpell = $state(START.meanSpell);
  let standIns = $state(START.standIns);
  let journeyIndex = $state(0);
  let width = $state(560);
  let hover = $state(null);

  const options = (o) => ({ ...o, problems: o.problems / 100, availability: o.availability / 100 });
  const current = $derived({ systems, problems, info, approvals, availability, meanSpell, standIns });
  const result = $derived(simulateSystems(options(current), { journeys: 12 }));
  const baseline = simulateSystems(options(START));
  const isStart = $derived(Object.keys(START).every((k) => current[k] === START[k]));

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
  const baseOutline = $derived(baseBins.reduce((d, c, i) => d + `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(c).toFixed(1)}H${x(i + 1).toFixed(1)}`, ''));

  // One request's journey, day by day.
  const journey = $derived(result.journeys[journeyIndex % result.journeys.length] ?? []);
  const shownDays = $derived(Math.min(journey.length, MAX));
  const rows = $derived([...SYSTEMS.slice(0, systems), ...(approvals === 'end' ? ['Final approval'] : [])]);
  const labelW = 112;
  const cellW = $derived(Math.max(3, Math.min(14, (width - labelW) / Math.max(shownDays, 20))));
  const rowH = 12;
  const journeyStops = $derived(journey.filter((d) => d.gates.includes(STOP) || d.final === STOP).length);
  const cellClass = { [ENTER]: 'enter', [FIX]: 'fix', [AWAY]: 'away', [QUEUED]: 'queued', [OK]: 'ok', [STOP]: 'stop' };

  const fast = $derived(result.median < 10);
  const safe = $derived(result.slipped < 0.02);
  const fair = $derived(systems >= START.systems && problems >= START.problems);
  const puzzle = $derived({
    goal: 'Without dropping any of the six systems, get the typical request under two weeks, with problems slipping through on fewer than 2% of requests.',
    met: fair && fast && safe,
    progress: !fair
      ? 'Keep all six systems, and forms with problems at least 10% of the time: the work is what it is.'
      : fast && !safe
        ? 'Fast enough, but too many problems slip through.'
        : !fast && safe
          ? 'Safe enough, but still too slow.'
          : '',
    hints: ['Cutting checks is not the only way to speed things up. Look at how the systems get their data.', 'With one shared record, every approver sees the whole request, so the approvals can run side by side.'],
    found: 'One shared record, with every approval kept: a typical request takes about a week, and almost no problems slip through. A single approval at the end is faster still, but lets more through.',
  });
  const showAnswer = () => ((systems = START.systems), (problems = START.problems), (info = 'shared'), (approvals = 'each'));
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
      Then a client request arrives that needs all of them. Each system has its own form to fill in, its own approval
      and its own copy of the client’s data, taken from the system before it. The systems are linked in one long chain.
    </p>
    <p>
      Two things happen in a chain like that. Approvers are sometimes away, so the request waits. And a problem entered
      early, a wrong date or a missing identifier, travels unseen into every system after it. When someone finally
      spots it, the request stops, and the problem has to be fixed everywhere it went.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title={`One request, ${systems} linked systems`} sub="1,500 simulated requests. Filling in a system takes a day, and so does each approval.">
      <Puzzle id="systems" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <Slider id="s-n" label="Systems the request passes through" bind:value={systems} min={2} max={8} />
        <Slider id="s-p" label="Chance a form has a problem" bind:value={problems} min={0} max={30} format={(v) => `${v}%`} />
        <Segmented
          name="s-info"
          label="How systems get their data"
          bind:value={info}
          options={[
            { value: 'copies', label: 'Each copies the last' },
            { value: 'shared', label: 'One shared record' },
          ]}
        />
        <Segmented
          name="s-appr"
          label="Approvals"
          bind:value={approvals}
          options={[
            { value: 'each', label: 'At every system' },
            { value: 'end', label: 'Once, at the end' },
          ]}
        />
      </div>
      <details class="assume">
        <summary>Change the assumptions about approvers</summary>
        <div class="tkc-controls">
          <Slider id="s-avail" label="Approver is in" bind:value={availability} min={60} max={99} format={(v) => `${v}% of days`} />
          <Slider id="s-spell" label="Typical absence" bind:value={meanSpell} min={1} max={10} format={(v) => `${v} day${v > 1 ? 's' : ''}`} />
          <Slider id="s-stand" label="Stand-ins per approver" bind:value={standIns} min={0} max={2} />
        </div>
      </details>

      <div class="tkc-stats tkc-stats--4" use:announce>
        <Stat label="Typical request" value="{shortDays(result.median, HORIZON)} days" sub="median, working days" />
        <Stat label="1 in 10 takes more than" value="{shortDays(result.p90, HORIZON)} days" swatch="var(--tkc-conditions)" line={true} />
        <Stat label="Problems that slip through" value={pct(result.slipped, result.slipped < 0.1 ? 1 : 0)} sub="of requests, after every check" />
        <Stat label="Time actually worked" value={pct(result.workShare)} sub="of the elapsed working hours" />
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
          {journey.length >= HORIZON ? 'More than a year' : `${journey.length} working days`}{journeyStops
            ? `, stopped ${journeyStops === 1 ? 'once' : `${journeyStops} times`} by a problem`
            : ', no problems found'}.
        </p>
        <div class="tkc-scroll-x">
          <svg width={labelW + shownDays * cellW + 44} height={rows.length * (rowH + 3) + 22} role="img" aria-label="Day-by-day journey of one request through the systems.">
            {#each rows as label, r}
              <text class="tkc-axis-label" x="0" y={r * (rowH + 3) + rowH - 2}>{label}</text>
            {/each}
            {#each journey.slice(0, shownDays) as day, d}
              {#each [...day.gates] as c, g}
                {#if c !== IDLE}
                  <rect x={labelW + d * cellW} y={g * (rowH + 3)} width={Math.max(1, cellW - 1)} height={rowH} rx="2" class="cell {cellClass[c]}" />
                {/if}
              {/each}
              {#if approvals === 'end' && day.final !== IDLE}
                <rect x={labelW + d * cellW} y={systems * (rowH + 3)} width={Math.max(1, cellW - 1)} height={rowH} rx="2" class="cell {cellClass[day.final]}" />
              {/if}
            {/each}
            {#each [0, 10, 20, 30, 40, 50] as t}
              {#if t < shownDays}
                <text class="tkc-axis-label" x={labelW + t * cellW} y={rows.length * (rowH + 3) + 14}>Day {t + 1}</text>
              {/if}
            {/each}
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
          <span><span class="tkc-swatch sw-fix"></span>Fixing where it spread</span>
        </div>
      </div>

      {#snippet model()}
        <p>Filling in a system takes two hours of work, and each step takes a day because the next person picks it up the next day. Each form has a {problems}% chance of a hidden problem, such as a wrong date or a missing identifier.</p>
        <p>An approver at a system sees only that system’s data and spots each hidden problem in it half the time. With copies, that data includes every problem copied in from earlier systems. With one shared record, every approver sees the whole record and spots each problem half the time, independently of the others, so six together miss a problem about 1 time in 64. If approvers tend to miss the same problems, parallel reviews catch far fewer. One approver at the end sees the whole request and spots 90%. A spotted problem stops the request. With copies, it is corrected in the system where it started and in every later system it reached, and each of those is approved again. With one shared record, it is corrected once. Approvers are in {availability}% of days, and absences last {meanSpell} day{meanSpell > 1 ? 's' : ''} on average.</p>
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
      Copying data from system to system is the party game of telephone: a message whispered down a line arrives
      changed, and nobody can say where it changed. Each copy is a chance for a field to drift. Once a problem is
      found, the request stops, and the fix has to be made in every system the problem reached and approved again.
    </p>
    <h3>Same controls, different shape</h3>
    <p>
      With one shared record, the data is entered once and a problem is fixed in one place. Every approver sees the
      whole request, so the approvals can run at the same time. Nothing is removed, and the request is both faster and
      safer.
    </p>
    <p>
      One approval at the end is the fastest design, but lets more problems through than parallel reviews of a shared
      record. That is a trade-off to make knowingly: one check for what can be undone, several for what cannot.
    </p>
    <p>
      Every new tool brings its own form, its own approval and its own copy of the data. Each makes sense to the team
      that built it. Together they make the chain longer, and every extra link makes the next problem costlier to fix.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our systems ask for data that already exists in another system?">
      <p>
        Follow one recent request and count how many times the same client data was typed in. Each re-entry is a copy
        that can drift, and one more place where a fix must be repeated.
      </p>
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
