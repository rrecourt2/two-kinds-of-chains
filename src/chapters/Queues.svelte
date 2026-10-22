<script>
  import { onMount, untrack } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { LiveQueue, meanWait } from '../lib/sim/queue.js';
  import { makeRng } from '../lib/sim/rng.js';
  import { linear, line, ticks } from '../lib/scales.js';
  import { hours } from '../lib/format.js';
  import { prefersReducedMotion, watchVisibility } from '../lib/motion.js';
  import { getContext } from 'svelte';

  // Until the puzzle is done, only the way of assigning requests that is set up is shown.
  const game = getContext('tkc-game');
  const revealed = $derived(!game.isOpen('queues'));

  const SERVERS = 4;
  const SPEED = 1.6; // simulated hours per second of animation

  let busy = $state(80);
  let mode = $state('named');
  let width = $state(560);
  let liveW = $state(560);
  let frame = $state(0);
  let running = $state(false);
  let hover = $state(null);
  let panel;

  const rho = $derived(busy / 100);
  const named = $derived(meanWait(1, rho));
  const pooled = $derived(meanWait(SERVERS, rho));

  const queue = new LiveQueue({ servers: SERVERS, rho: 0.8, mode: 'named', rng: makeRng(12) });
  queue.advance(40);

  // Settings changes redraw the live panel; `untrack` keeps these effects from depending on `frame`.
  $effect(() => {
    queue.setRho(rho);
    if (prefersReducedMotion()) queue.advance(60);
    untrack(() => frame++);
  });
  $effect(() => {
    queue.setMode(mode);
    untrack(() => frame++);
  });

  onMount(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    let last = 0;
    const loop = (t) => {
      if (last) queue.advance(Math.min(0.1, (t - last) / 1000) * SPEED);
      last = t;
      frame++;
      raf = requestAnimationFrame(loop);
    };
    const stopWatching = watchVisibility(panel, (visible) => {
      cancelAnimationFrame(raf);
      last = 0;
      running = visible;
      if (visible) raf = requestAnimationFrame(loop);
    });
    return () => {
      stopWatching();
      cancelAnimationFrame(raf);
    };
  });

  // Snapshot of the live queue for drawing (re-read every frame).
  const snap = $derived.by(() => {
    frame;
    return {
      lines: queue.lines.map((l) => l.length),
      shared: queue.shared.length,
      busy: queue.busy.map(Boolean),
      avg: queue.averageWait(),
      samples: queue.sampleSize(),
      idleNeeded: queue.idleButNeeded(),
      waiting: queue.waitingCount(),
    };
  });

  // Live panel geometry.
  const laneH = 30;
  const deskW = 64;
  const dot = 9;
  const liveH = SERVERS * laneH + 16;
  const maxDots = $derived(Math.max(4, Math.floor((liveW - deskW - 70) / (dot + 3))));
  const laneY = (s) => 8 + s * laneH + laneH / 2;

  // Hockey-stick chart.
  const H = 238;
  const m = { top: 28, right: 64, bottom: 38, left: 40 };
  const Y_MAX = 24;
  const x = $derived(linear(0.5, 0.98, m.left, width - m.right));
  const y = $derived(linear(0, Y_MAX, H - m.bottom, m.top));
  const grid = Array.from({ length: 97 }, (_, i) => 0.5 + i * 0.005);
  // Draw each curve until it leaves the top of the chart, ending exactly on the edge.
  function curve(c) {
    const pts = [];
    for (const r of grid) {
      const w = meanWait(c, r);
      if (w > Y_MAX) {
        const lo = pts.length ? x.invert(pts[pts.length - 1][0]) : r;
        let a = lo;
        let b = r;
        for (let k = 0; k < 30; k++) {
          const mid = (a + b) / 2;
          if (meanWait(c, mid) > Y_MAX) b = mid;
          else a = mid;
        }
        pts.push([x(a), y(Y_MAX)]);
        return { d: line(pts), exit: a };
      }
      pts.push([x(r), y(w)]);
    }
    return { d: line(pts), exit: null };
  }
  const namedCurve = $derived(curve(1));
  const pooledCurve = $derived(curve(SERVERS));

  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const r = x.invert(e.clientX - box.left + m.left);
    hover = Math.max(0.5, Math.min(0.98, Math.round(r * 100) / 100));
  }

  const wait = $derived(mode === 'pooled' ? pooled : named);
  const showNamed = $derived(revealed || mode === 'named');
  const showPooled = $derived(revealed || mode === 'pooled');
  const puzzle = $derived({
    goal: 'There is no budget for a fifth reviewer. Cut the average wait for a review to under an hour.',
    met: busy >= 80 && wait < 1,
    checks: [
      { label: 'Reviewers at least 80% busy, as the budget requires', ok: busy >= 80 },
      { label: `Average wait under an hour (now ${hours(wait)})`, ok: wait < 1 },
    ],
    hints: ['How busy they are is only half of it. Look at how requests reach the reviewers.', 'Can a request wait while a reviewer who could take it is free?'],
    found: 'One shared line does it. At 80% busy, the same four people cut the average wait from four hours to 45 minutes.',
  });
</script>

<Chapter
  n={4}
  kicker="Queues"
  title="Why full calendars make long queues"
  lede="A full calendar looks like productivity. To everyone waiting for it, it is a queue."
  puzzle="queues"
>
  {#snippet setup()}
    <p>
      Even when the right people are in, they are busy. Say four credit analysts review every new deal, and each review
      takes about an hour. Queueing theory, the mathematics of waiting lines, says that how busy they are decides how
      long everyone else waits.
    </p>
    <p>The surprise is the shape. Waiting does not grow in step with how busy someone is.</p>
  {/snippet}

  {#snippet figure()}
    <Instrument rules={['Four reviewers; a review takes an hour on average, sometimes much longer.', 'Requests arrive at random, not on a timetable.', 'Named lines: each request waits for its own reviewer. One shared line: whoever is free next takes it.']} title="Four reviewers, one stream of requests" sub="Requests queueing for four reviewers, live, and below it the average wait at every level of busyness. Requests arrive at random; each review takes an hour on average.">
      <Puzzle id="queues" {...puzzle} onshow={() => ((mode = 'pooled'), (busy = 80))} />
      <div class="tkc-controls">
        <Slider id="q-busy" label="How busy are the reviewers?" bind:value={busy} min={50} max={98} format={(v) => `${v}% of their time`} />
        <Segmented
          name="q-mode"
          label="How requests are assigned"
          bind:value={mode}
          options={[
            { value: 'named', label: 'To a named reviewer' },
            { value: 'pooled', label: 'To whoever is free next' },
          ]}
        />
      </div>

      <div class="live" bind:this={panel} bind:clientWidth={liveW}>
        <svg width={liveW} height={liveH} role="img" aria-label="Animated queue: {snap.waiting} requests waiting.">
          {#if mode === 'named'}
            {#each snap.lines as n, s}
              <line class="lane" x1="10" x2={liveW - deskW - 14} y1={laneY(s)} y2={laneY(s)} />
              {#each Array(Math.min(n, maxDots)) as _, k}
                <circle cx={liveW - deskW - 24 - k * (dot + 3)} cy={laneY(s)} r={dot / 2} class="req" />
              {/each}
              {#if n > maxDots}
                <text class="tkc-label-2" x="12" y={laneY(s) - 8}>+{n - maxDots} more</text>
              {/if}
            {/each}
          {:else}
            {@const mid = liveH / 2}
            <line class="lane" x1="10" x2={liveW - deskW - 30} y1={mid} y2={mid} />
            {#each Array(SERVERS) as _, s}
              <line class="lane" x1={liveW - deskW - 30} x2={liveW - deskW - 6} y1={mid} y2={laneY(s)} />
            {/each}
            {#each Array(Math.min(snap.shared, maxDots)) as _, k}
              <circle cx={liveW - deskW - 40 - k * (dot + 3)} cy={mid} r={dot / 2} class="req" />
            {/each}
            {#if snap.shared > maxDots}
              <text class="tkc-label-2" x="12" y={mid - 10}>+{snap.shared - maxDots} more</text>
            {/if}
          {/if}
          {#each snap.busy as isBusy, s}
            {@const idleWhileWaiting = !isBusy && mode === 'named' && snap.lines[s] === 0 && snap.waiting > 0}
            <rect x={liveW - deskW} y={laneY(s) - 11} width={deskW - 4} height="22" rx="6" class="desk" class:on={isBusy} class:idle={idleWhileWaiting} />
            <text class="desk-label" class:light={isBusy} x={liveW - deskW / 2 - 2} y={laneY(s) + 4} text-anchor="middle">
              {isBusy ? 'busy' : idleWhileWaiting ? 'idle' : 'free'}
            </text>
          {/each}
        </svg>
        <p class="tkc-caption">
          {#if !running && !prefersReducedMotion()}The animation pauses while it is off screen.{:else if snap.idleNeeded > 0}{snap.idleNeeded} reviewer{snap.idleNeeded > 1 ? 's are' : ' is'} idle while requests wait in other lines.{:else}{snap.waiting} request{snap.waiting === 1 ? '' : 's'} waiting.{/if}
        </p>
      </div>

      <div class="tkc-stats" class:tkc-stats--3={revealed} use:announce>
        {#if revealed}
          <Stat label="Average wait, named reviewer" value={hours(named)} sub="before work starts" swatch="var(--tkc-conditions)" line={true} />
          <Stat label="Average wait, shared line" value={hours(pooled)} sub="same people, same workload" swatch="var(--tkc-options)" line={true} />
        {:else}
          <Stat label="Average wait, as set up" value={hours(wait)} sub={mode === 'named' ? 'each request waits for a named reviewer' : 'one shared line for all four'} swatch={mode === 'named' ? 'var(--tkc-conditions)' : 'var(--tkc-options)'} line={true} />
        {/if}
        <Stat
          quiet
          label="In the animation so far"
          value={snap.samples < 30 ? 'Measuring…' : hours(snap.avg)}
          sub={snap.samples < 30 ? 'collecting the first requests' : `last ${Math.min(400, snap.samples)} requests, ${mode === 'named' ? 'named' : 'shared'}`}
        />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label={revealed ? 'Average wait against how busy the reviewers are, for named reviewers and for a shared line.' : 'Average wait against how busy the reviewers are, as set up.'}>
          {#each ticks(0, Y_MAX, 4) as t}
            <line class="tkc-grid" x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={m.left - 6} y={y(t) + 4} text-anchor="end">{t}h</text>
          {/each}
          {#each [0.5, 0.6, 0.7, 0.8, 0.9] as t}
            <text class="tkc-axis-label" x={x(t)} y={H - m.bottom + 16} text-anchor="middle">{Math.round(t * 100)}%</text>
          {/each}
          <line class="tkc-base" x1={m.left} x2={width - m.right} y1={y(0)} y2={y(0)} />
          {#if showNamed}<path d={namedCurve.d} class="curve" style:stroke="var(--tkc-conditions)" />{/if}
          {#if showPooled}
            <path d={pooledCurve.d} class="curve" style:stroke="var(--tkc-options)" />
            <text class="tkc-label-2" x={width - m.right + 6} y={y(meanWait(SERVERS, 0.98)) + 4}>Shared</text>
          {/if}
          <line class="now" x1={x(rho)} x2={x(rho)} y1={showNamed && namedCurve.exit !== null ? m.top + 18 : m.top} y2={y(0)} />
          {#if showNamed && named <= Y_MAX}
            <circle cx={x(rho)} cy={y(named)} r="5" class="pt" style:fill="var(--tkc-conditions)" />
          {/if}
          {#if showPooled}<circle cx={x(rho)} cy={y(pooled)} r="5" class="pt" style:fill="var(--tkc-options)" />{/if}
          {#if showNamed && namedCurve.exit !== null}
            <text class="tkc-label-2 tkc-halo" x={x(namedCurve.exit) - 6} y={m.top + 12} text-anchor="end">Named ↑ {Math.round(meanWait(1, 0.98))}h at 98%</text>
          {/if}
          {#if hover !== null}
            <line class="cross" x1={x(hover)} x2={x(hover)} y1={m.top} y2={y(0)} />
          {/if}
          <text class="tkc-axis-title" x={m.left + (width - m.left - m.right) / 2} y={H - 4} text-anchor="middle">How busy the reviewers are</text>
          <text class="tkc-axis-title" x={m.left - 34} y={m.top - 12}>Average wait for a one-hour review</text>
          <rect x={m.left} y={m.top} width={Math.max(0, width - m.left - m.right)} height={H - m.top - m.bottom} fill="transparent" role="presentation" onpointermove={onMove} onpointerleave={() => (hover = null)} />
        </svg>
        {#if hover !== null}
          <div class="tkc-tip" style:left="{Math.min(width - 190, Math.max(0, x(hover) + 10))}px" style:top="24px">
            <div>At {Math.round(hover * 100)}% busy</div>
            {#if showNamed}<div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span><strong>{hours(meanWait(1, hover))}</strong> named</div>{/if}
            {#if showPooled}<div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)"></span><strong>{hours(meanWait(SERVERS, hover))}</strong> shared</div>{/if}
          </div>
        {/if}
        <div class="tkc-legend">
          {#if showNamed}<span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span>Each request waits for a named reviewer</span>{/if}
          {#if showPooled}<span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)"></span>One shared line for all four</span>{/if}
        </div>
      </div>

      {#snippet model()}
        <p>Requests arrive at random, and review times vary the way an exponential distribution does: an hour on average, sometimes much longer. The named line is the classic single-server queue: average wait = busy ÷ (1 − busy) × work time. At 90% busy that is 0.9 ÷ 0.1 = 9 hours. Reviews that always took exactly one hour would halve the waits. Kingman (1961) showed that, approximately, any single-server queue near full load has this shape, scaled by how variable the arrivals and the work are.</p>
        <p>The shared line is the same four people serving one queue, which queueing theory calls M/M/4 and solves with the Erlang C formula. The animation is a live simulation of the same system.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      At 50% busy, a one-hour review waits about an hour. At 80% it waits four hours, at 90% nine, and at 95% nineteen.
      The last few points of utilization cost the most waiting. Hospitals aim to keep roughly one bed in seven free for
      the same reason: above about 85% occupancy, emergency patients start to find no bed.
    </p>
    <p>
      With one shared line, no request waits while a colleague who could do it sits idle. Bank branches learned this
      long ago: one line for all the tellers beats a line per teller.
    </p>
    <p>
      In a long chain, the waits add up. A request that passes six named reviewers, each 95% busy, waits about nineteen
      hours at each: nearly three working weeks of waiting for six hours of work. That is how a chain in which everyone
      works flat out can still deliver slowly. Spare capacity is what lets work flow, in people and in IT systems alike:
      a server at 95% load answers slowly for everyone, which is why engineers keep headroom.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Who are the three busiest reviewers in our processes, and could their work go to a shared pool?">
      <p>
        A reviewer at 70–80% has room for the urgent case; one at 95% does not. Spare capacity looks like waste on a
        utilization report. The waiting it prevents appears on no report at all.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .live {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 6px;
    padding: 10px 0 0;
  }
  .lane {
    stroke: var(--tkc-hair);
    stroke-width: 2;
  }
  .req {
    fill: var(--tkc-ink-2);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
  }
  .desk {
    fill: var(--tkc-surface);
    stroke: var(--tkc-rule);
    stroke-width: 1.5;
  }
  .desk.on {
    fill: var(--tkc-ink-2);
    stroke: var(--tkc-ink-2);
  }
  .desk.idle {
    stroke: var(--tkc-conditions);
    stroke-width: 2;
  }
  .desk-label {
    font-size: 11px;
    font-weight: 600;
    fill: var(--tkc-ink-2);
  }
  .desk-label.light {
    fill: var(--tkc-surface);
  }
  .curve {
    fill: none;
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .now {
    stroke: var(--tkc-ink);
    stroke-width: 1;
  }
  .cross {
    stroke: var(--tkc-muted);
    stroke-width: 1;
  }
  .pt {
    stroke: var(--tkc-surface);
    stroke-width: 2;
  }
</style>
