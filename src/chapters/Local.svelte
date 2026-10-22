<script>
  import { getContext, onMount } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { equilibrium, ROUTES, REVIEW_DAYS } from '../lib/sim/fasttrack.js';
  import { linear } from '../lib/scales.js';
  import { prefersReducedMotion } from '../lib/motion.js';

  // A prediction: the controls open after the first answer or a hint.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('emergence'));
  // Until the puzzle is done, a closed fast track is not compared with an open one.
  const revealed = $derived(!game.isOpen('emergence'));

  const START = 40;
  let deals = $state(START);
  let track = $state('closed');
  let width = $state(560);
  let chart = $state();

  const open = $derived(track === 'open');
  const now = $derived(equilibrium({ deals, fastTrack: open }));
  const other = $derived(equilibrium({ deals, fastTrack: !open }));

  const num = (v) => String(Math.round(v * 10) / 10);
  const dealsText = (v) => `${num(v)} deal${v === 1 ? '' : 's'}`;
  const daysText = (v) => `${num(v)} day${v === 1 ? '' : 's'}`;

  // Deals per route and committee days glide to their new values; the fast track fades in and out.
  const toTween = (e) => [e.split.route1, e.split.route2, e.split.fast, e.stage.regional, e.stage.head, e.fastTrack ? 1 : 0];
  const tween = new Tween(toTween(equilibrium({ deals: START, fastTrack: false })), { duration: 650, easing: cubicOut });
  $effect(() => {
    tween.set(toTween(now), { duration: prefersReducedMotion() ? 0 : 650 });
  });

  // Geometry: one row per route (name and count, a dot per deal, then the bar), and a day axis.
  const MAX_DAYS = 40;
  const BAR_TOP = 38;
  const BAR_H = 38;
  const ROW = 94;
  const AXIS = 2 * ROW + BAR_TOP + BAR_H + 8;
  const H = AXIS + 24;
  const DOT_PITCH = 8;
  const PER_LINE = 20;
  const GAP = 2;
  const PAD = 5;
  const x = $derived(linear(0, MAX_DAYS, 0, width));

  // Text inside a segment: the longest version that fits its width.
  let fontFamily = $state('system-ui, sans-serif');
  let ctx = null;
  onMount(() => {
    fontFamily = getComputedStyle(chart).fontFamily || fontFamily;
  });
  function textWidth(s, weight) {
    try {
      ctx ??= document.createElement('canvas').getContext('2d');
      ctx.font = `${weight} 12px ${fontFamily}`;
      return ctx.measureText(s).width;
    } catch {
      return s.length * 7;
    }
  }
  const fits = (lines, room) => lines.every((l, i) => textWidth(l, i === 0 && lines.length > 1 ? 650 : 400) <= room);

  const STAGES = {
    regional: { name: 'Regional committee', short: 'Regional' },
    head: { name: 'Head-office committee', short: 'Head office' },
    review: { name: 'Outside opinion', short: 'Opinion' },
  };
  function label(stage, w) {
    const s = STAGES[stage];
    const room = w - 2 * PAD;
    const options =
      stage === 'review'
        ? [
            [s.name, `always ${daysText(REVIEW_DAYS)}`],
            [s.short, daysText(REVIEW_DAYS)],
            [daysText(REVIEW_DAYS)],
          ]
        : [
            [s.name, `${dealsText(now.agenda[stage])} · ${daysText(now.stage[stage])}`],
            [s.short, `${dealsText(now.agenda[stage])} · ${daysText(now.stage[stage])}`],
            [s.short, dealsText(now.agenda[stage])],
            [dealsText(now.agenda[stage])],
          ];
    return options.find((o) => fits(o, room)) ?? [];
  }

  const rows = $derived(
    ROUTES.map((route, k) => {
      const shown = route.id === 'fast' ? tween.current[5] : 1;
      const days = { regional: tween.current[3], head: tween.current[4], review: REVIEW_DAYS };
      let left = 0;
      const segs = route.stages.map((stage) => {
        const w = Math.max(0, x(days[stage]) * shown);
        const seg = { stage, x: left, w: Math.max(0, w - GAP), lines: shown > 0.6 ? label(stage, w - GAP) : [] };
        left += w;
        return seg;
      });
      const count = now.split[route.id];
      const closed = route.id === 'fast' && !open;
      const summary = closed ? 'closed' : count > 0 ? `${dealsText(count)} · ${daysText(now.times[route.id])}` : `0 deals · would take ${daysText(now.times[route.id])}`;
      return { ...route, top: k * ROW, segs, dots: Math.round(tween.current[k]), shown, closed, summary, empty: !closed && count === 0 };
    }),
  );
  const CLOSED_NOTE = 'Closed: every deal has an outside opinion';
  const closedNote = $derived(textWidth(CLOSED_NOTE, 400) + 2 * PAD <= width ? CLOSED_NOTE : 'Closed');

  const ariaLabel = $derived(
    `${deals} deals a quarter, fast track ${track}. ` +
      rows.map((r) => (r.closed ? 'Fast track: closed.' : `${r.name}: ${r.summary}.`)).join(' ') +
      ` Each committee has ${dealsText(now.agenda.regional)} on its agenda. Every deal takes ${daysText(now.time)}.`,
  );

  const timeSub = $derived(
    open ? `was ${daysText(other.time)} before the fast track` : revealed ? `${daysText(other.time)} with the fast track open` : 'each team on the quickest route for its deal',
  );
  const agendaSub = $derived(
    open ? `was ${num(other.agenda.regional)} before the fast track` : revealed ? `${num(other.agenda.regional)} with the fast track open` : 'a day in committee for every two',
  );

  const puzzle = {
    goal: 'Forty deals a quarter, 30 days each. The bank opens the fast track, skipping the 20-day outside opinion. Each deal team picks the quickest route for its own deal. What happens to the time a deal takes?',
    choices: [
      { value: 'shorter', label: 'Shorter: it skips a 20-day outside opinion' },
      { value: 'same', label: 'About the same' },
      { value: 'longer', label: 'Longer' },
    ],
    answer: 'longer',
    wrong: (v) =>
      v === 'shorter'
        ? 'That is what the first team to take it finds. Open the fast track in the figure and watch both committees’ agendas.'
        : 'Open the fast track in the figure and watch both committees’ agendas.',
    hints: [
      'A deal on the fast track goes through both committees. Whose agendas does it join?',
      'Suppose every team takes the fast track. How many deals does each committee then have, and how long does it take?',
    ],
    found:
      'Longer: 40 days instead of 30. The fast track removed a step from each deal and added a condition to all of them.',
  };
</script>

<Chapter
  n={6}
  kicker="Shortcuts"
  title="The fast track"
  lede="When every part does what is best for itself, what does the whole do?"
  puzzle="emergence"
>
  {#snippet setup()}
    <p>
      Nobody plans a traffic jam. In 2008, Japanese physicists asked 22 drivers to circle a 230-metre track at a steady
      30 km/h, and soon a jam formed and rolled backwards around the track, with no accident and no bottleneck. Sensible
      drivers, each adjusting a little, made a jam that none of them intended: what scientists call emergence.
    </p>
    <p>
      Banks have their rush hours too, when every deal team wants a place on the same agendas. Say every deal needs two
      independent opinions before signing: a committee’s, and one other. Deals of this size may go to either committee.
      Route 1: the regional committee, then an outside adviser’s second opinion. Route 2: the adviser’s opinion first,
      because head office wants it in hand, then the head-office committee. Each deal team takes the route that will be quicker for its deal.
    </p>
    <p>
      A committee takes a working day for every two deals on its agenda; the outside opinion always takes 20 working
      days. Today forty deals a quarter split evenly between the two routes: 10 days in committee and 20 for the
      opinion, 30 days in all.
    </p>
    <p>
      Now the bank considers a fast track: a second committee counts as the second opinion, so a deal cleared by the
      regional committee may go straight to the head-office committee, with no adviser.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="How long a deal takes, route by route"
      sub="Each bar is one route to approval, in working days. A committee takes a day for every two deals on its agenda; an outside opinion always takes 20 days."
    >
      <Puzzle id="emergence" {...puzzle} predict onshow={() => ((track = 'open'), (deals = START))} />
      <div class="tkc-controls" class:tkc-wait={!live} inert={live ? undefined : true}>
        <Segmented
          name="ft-track"
          label="Fast track"
          bind:value={track}
          options={[
            { value: 'closed', label: 'Closed' },
            { value: 'open', label: 'Open' },
          ]}
        />
        <Slider id="ft-deals" label="Deals a quarter" bind:value={deals} min={8} max={60} step={4} ends={['8', '60']} />
      </div>

      <div class="tkc-stats pair" use:announce>
        <Stat label="Every deal takes" value={daysText(now.time)} sub={timeSub} />
        <Stat label="Each committee’s agenda" value={dealsText(now.agenda.regional)} sub={agendaSub} />
      </div>

      <div class="tkc-chart" bind:clientWidth={width} bind:this={chart}>
        <svg {width} height={H} role="img" aria-label={ariaLabel}>
          {#each rows as r (r.id)}
            {@const barY = r.top + BAR_TOP}
            <text class="tkc-label" x="0" y={r.top + 12}>{r.name}</text>
            <text class="tkc-label-2 count" class:muted={r.closed || r.empty} x={width} y={r.top + 12} text-anchor="end">{r.summary}</text>
            {#each Array(Math.min(r.dots, 2 * PER_LINE)) as _, i (i)}
              <circle class="deal" cx={3 + (i % PER_LINE) * DOT_PITCH} cy={r.top + 22 + Math.floor(i / PER_LINE) * DOT_PITCH} r="2.8" />
            {/each}
            {#each [10, 20, 30] as t (t)}
              <line class="tkc-grid" x1={x(t)} x2={x(t)} y1={barY - 3} y2={barY + BAR_H + 3} />
            {/each}
            {#if r.id === 'fast' && r.shown < 1}
              <rect class="shut" x="0.5" y={barY + 0.5} width={Math.max(0, width - 1)} height={BAR_H - 1} rx="5" opacity={1 - r.shown} />
              {#if r.shown < 0.4}
                <text class="tkc-label-2 shut-text" x={PAD + 2} y={barY + BAR_H / 2 + 4} opacity={1 - r.shown}>{closedNote}</text>
              {/if}
            {/if}
            {#each r.segs as s (s.stage)}
              {#if s.w > 0.5}
                {#if r.empty}<rect class="under" x={s.x} y={barY} width={s.w} height={BAR_H} rx="5" />{/if}
                <rect class="seg {s.stage}" class:empty={r.empty} x={s.x} y={barY} width={s.w} height={BAR_H} rx="5" />
                {#if s.lines.length === 2}
                  <text class="seg-text {s.stage}" x={s.x + PAD} y={barY + 16}>
                    <tspan class="seg-name">{s.lines[0]}</tspan>
                    <tspan x={s.x + PAD} dy="15">{s.lines[1]}</tspan>
                  </text>
                {:else if s.lines.length === 1}
                  <text class="seg-text {s.stage}" x={s.x + PAD} y={barY + BAR_H / 2 + 4}>{s.lines[0]}</text>
                {/if}
              {/if}
            {/each}
          {/each}
          <line class="tkc-base" x1="0" x2={width} y1={AXIS} y2={AXIS} />
          {#each [0, 10, 20, 30, 40] as t (t)}
            <line class="tick" x1={x(t)} x2={x(t)} y1={AXIS} y2={AXIS + 4} />
            <text class="tkc-axis-label" x={x(t)} y={AXIS + 17} text-anchor={t === 0 ? 'start' : t === MAX_DAYS ? 'end' : 'middle'}>{t === MAX_DAYS ? `${t} days` : t}</text>
          {/each}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch key regional"></span>Regional committee</span>
          <span><span class="tkc-swatch key head"></span>Head-office committee</span>
          <span><span class="tkc-swatch key review"></span>Outside opinion</span>
          <span><span class="tkc-swatch key dot"></span>One deal</span>
        </div>
      </div>

      {#snippet model()}
        <p>
          {deals} deals a quarter each need two independent opinions: a committee’s and one other. Route 1 goes to the
          regional committee, then an outside adviser; route 2 to the adviser, then the head-office committee; the fast
          track to the regional committee, then the head-office committee. A committee takes half a working day for each
          deal on its agenda, so it slows as its agenda grows. The outside opinion takes 20 working days however many
          deals there are, as each deal has its own adviser. The outside step is a second opinion that a committee can
          stand in for, not the independent environmental and social review that higher-risk projects need in any case.
        </p>
        <p>
          Each team takes the route that is quickest for its own deal, so the deals settle where no team can save time by
          switching alone: a Nash equilibrium. With the fast track closed, the deals split evenly. With it open, every
          deal takes it as long as two committees beat a committee and an adviser; beyond 40 deals the committees fill
          until each takes 20 days, as long as the adviser.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      At forty deals, the first team to take the fast track saves nearly ten days. So the next team takes it, and the
      next. But each deal on the fast track joins both agendas, and once all forty have moved, each committee takes 20
      days. Going back is no better: the old routes now pass a 20-day committee and a 20-day opinion. No team can gain
      by switching alone, so the slower pattern is stable.
    </p>
    <p>
      The outside opinion was the link that did not mind volume: each deal had its own adviser, so it took 20 days
      however many deals came. A committee is shared, and every deal on its agenda slows all the others. The fast track
      looked like a shorter chain, but it swapped a link that scales for a second shared one.
    </p>
    <p>
      So whether it helps depends on the traffic. With 12 deals a quarter it cuts every deal from 23 days to 12. Below
      about 27 deals a quarter it saves time; from there up to 80, it costs time. Scale decides which kind of
      complexity a rule turns out to be.
    </p>
    <h3>Local best, global worse</h3>
    <p>
      The mathematician Dietrich Braess described the same effect on roads in 1968: a new road can make every journey
      slower, because every driver takes it. Cities have seen it happen. When New York closed 42nd Street for Earth Day
      in 1990, traffic in the area flowed better, not worse, as Gina Kolata reported in The New York Times.
    </p>
    <p>
      Every team chose well for its own deal, and together they made every deal slower. In
      the same way, a new system that serves one team well can add a step for everyone else, and a control that removes
      one risk can push another somewhere out of sight.
    </p>
    <p>
      Picture five lenders financing one wind farm. Each adds a condition that protects its own position: a reserve
      account here, a consent right there. Each condition is sensible. Together they can make the project too slow or
      too costly to build, and then every lender loses.
    </p>
    <p>A measure of the whole journey, across all deals, is the one number no shortcut can improve at the others’ expense.</p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our shortcuts would still save time if every deal took it?">
      <p>
        A shortcut is usually judged by the first deals that use it. Its full cost shows only once every deal does: in
        the agendas it fills and the queues it joins.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .count {
    font-variant-numeric: tabular-nums;
  }
  .count.muted {
    fill: var(--tkc-muted);
  }
  .pair {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  @container fig (max-width: 299px) {
    .pair {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .deal {
    fill: var(--tkc-ink-2);
  }
  .under {
    fill: var(--tkc-surface);
  }
  .seg.regional {
    fill: color-mix(in srgb, var(--tkc-conditions) 72%, var(--tkc-surface));
  }
  .seg.head {
    fill: color-mix(in srgb, var(--tkc-conditions) 26%, var(--tkc-surface));
    stroke: var(--tkc-conditions);
    stroke-width: 1.5;
  }
  .seg.review {
    fill: var(--tkc-sunken);
    stroke: var(--tkc-rule);
    stroke-width: 1;
  }
  .seg.empty {
    opacity: 0.55;
  }
  .seg-text {
    font-size: 12px;
    fill: var(--tkc-ink);
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  .seg-text.review {
    fill: var(--tkc-ink-2);
  }
  .seg-name {
    font-weight: 650;
  }
  .shut {
    fill: none;
    stroke: var(--tkc-rule);
    stroke-width: 1.5;
    stroke-dasharray: 6 5;
  }
  .shut-text {
    fill: var(--tkc-muted);
  }
  .tick {
    stroke: var(--tkc-rule);
  }
  .key {
    border-radius: 3px;
  }
  .key.regional {
    background: color-mix(in srgb, var(--tkc-conditions) 72%, var(--tkc-surface));
  }
  .key.head {
    background: color-mix(in srgb, var(--tkc-conditions) 26%, var(--tkc-surface));
    box-shadow: inset 0 0 0 1.5px var(--tkc-conditions);
  }
  .key.review {
    background: var(--tkc-sunken);
    box-shadow: inset 0 0 0 1px var(--tkc-rule);
  }
  .key.dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--tkc-ink-2);
  }
</style>
