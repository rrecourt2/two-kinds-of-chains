<script>
  import { getContext, onMount } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { uptake, ROUTES, REVIEW_DAYS, DEALS } from '../lib/sim/fasttrack.js';
  import { linear, line } from '../lib/scales.js';
  import { prefersReducedMotion } from '../lib/motion.js';

  // A prediction: the slider and the small chart open after the first answer or a hint.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('emergence'));

  // Deal teams on the fast track; the rest split evenly between the two old routes.
  let onFast = $state(0);
  let width = $state(560);
  let chart = $state();
  let hover = $state(null);

  const now = $derived(uptake(onFast));

  const num = (v) => String(Math.round(v * 10) / 10);
  const dealsText = (v) => `${num(v)} deal${v === 1 ? '' : 's'}`;
  const daysText = (v) => `${num(v)} day${v === 1 ? '' : 's'}`;
  const savedText = (v) => (v === 0.5 ? 'half a day' : daysText(v));

  // Deals per route and committee days glide to their new values.
  const toTween = (u) => [u.split.route1, u.split.route2, u.split.fast, u.stage.regional, u.stage.head];
  const tween = new Tween(toTween(uptake(0)), { duration: 650, easing: cubicOut });
  $effect(() => {
    tween.set(toTween(now), { duration: prefersReducedMotion() ? 0 : 650 });
  });

  // Geometry of the route bars: one row per route (name and count, a dot per deal, then the bar), and a day axis.
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

  // Text inside a segment or a row's header: the longest version that fits. The numbers are drawn
  // with tabular figures, as wide as a zero, which a canvas does not apply, so digits are measured as zeros.
  let fontFamily = $state('system-ui, sans-serif');
  let ctx = null;
  onMount(() => {
    fontFamily = getComputedStyle(chart).fontFamily || fontFamily;
  });
  function textWidth(s, weight) {
    try {
      ctx ??= document.createElement('canvas').getContext('2d');
      ctx.font = `${weight} 12px ${fontFamily}`;
      return ctx.measureText(s.replace(/[0-9]/g, '0')).width;
    } catch {
      return s.length * 7;
    }
  }
  const fits = (lines, room) => lines.every((l, i) => textWidth(l, i === 0 && lines.length > 1 ? 650 : 400) + 3 <= room);

  const STAGES = {
    regional: { name: 'Regional committee', short: 'Regional' },
    head: { name: 'Head-office committee', short: 'Head office' },
    review: { name: 'Outside adviser', short: 'Adviser' },
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
  // Row headers: the name's length is set by the figure's width alone, so names stay put while the slider
  // moves; an empty route's longer note shortens instead.
  const heads = $derived.by(() => {
    const busiest = `${dealsText(88)} · ${daysText(88.8)}`;
    const key = ['name', 'short', 'tiny'].find((k) => ROUTES.every((r) => textWidth(r[k], 600) + 12 + textWidth(busiest, 400) <= width)) ?? 'tiny';
    const room = (route) => width - 12 - textWidth(route[key], 600);
    const note = (route, level) => {
      const days = daysText(now.times[route.id]);
      const count = now.split[route.id];
      return count > 0 ? `${dealsText(count)} · ${days}` : [`No deals · would take ${days}`, `None · would take ${days}`, `would take ${days}`][level];
    };
    const level = [0, 1, 2].find((l) => ROUTES.every((r) => textWidth(note(r, l), 400) <= room(r))) ?? 2;
    return ROUTES.map((route) => ({ name: route[key], sum: note(route, level) }));
  });

  const rows = $derived(
    ROUTES.map((route, k) => {
      const days = { regional: tween.current[3], head: tween.current[4], review: REVIEW_DAYS };
      let left = 0;
      const segs = route.stages.map((stage) => {
        const w = Math.max(0, x(days[stage]));
        const seg = { stage, x: left, w: Math.max(0, w - GAP), lines: label(stage, w - GAP) };
        left += w;
        return seg;
      });
      return { ...route, top: k * ROW, segs, dots: Math.round(tween.current[k]), empty: now.split[route.id] === 0, ...heads[k] };
    }),
  );

  const ariaLabel = $derived(
    `${now.onFast} of ${DEALS} deal teams on the fast track. ` +
      rows.map((r) => `${r.name}: ${r.sum}.`).join(' ') +
      ` Each committee has ${dealsText(now.agenda.regional)} on its agenda and takes ${daysText(now.stage.regional)}.`,
  );

  // The mechanism in one line.
  const sentence = $derived(
    now.onFast < DEALS
      ? `The fast track takes ${daysText(now.fastTime)}; the old routes ${num(now.oldTime)}. A team that switches now saves ${savedText(now.saving)}.`
      : `The fast track takes ${daysText(now.fastTime)}. Nobody gains by switching back: the old routes would take ${daysText(now.oldTime)} too.`,
  );
  // Read once the slider has come to rest, not at every step.
  let spoken = $state('');
  let first = true;
  $effect(() => {
    const text = sentence;
    if (first) {
      first = false;
      return;
    }
    const t = setTimeout(() => (spoken = text), 900);
    return () => clearTimeout(t);
  });

  // The small chart: time on each route as teams switch.
  const CH = 196;
  const cm = { top: 30, right: 12, bottom: 42, left: 28 };
  const cx = $derived(linear(0, DEALS, cm.left, width - cm.right));
  const cy = linear(0, MAX_DAYS, CH - cm.bottom, cm.top);
  const fastAt = (k) => uptake(k).fastTime;
  const oldAt = (k) => uptake(k).oldTime;
  const ends = (f) => line([[cx(0), cy(f(0))], [cx(DEALS), cy(f(DEALS))]]);
  const atK = $derived(tween.current[2]);
  // Direct labels: "Old routes" above its line, "Fast track" below its line, clear of both ends.
  const oldLabel = $derived.by(() => {
    const k0 = 2;
    const k1 = cx.invert(cx(k0) + textWidth('Old routes', 600));
    return { x: cx(k0), y: cy(oldAt(k1)) - 7 };
  });
  const fastLabel = $derived({ x: cx(5), y: cy(fastAt(5)) + 16 });

  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const k = cx.invert(e.clientX - box.left + cm.left);
    hover = Math.max(0, Math.min(DEALS, 2 * Math.round(k / 2)));
  }

  const chartLabel = $derived(
    `Days a deal takes as deal teams switch to the fast track: the fast track rises from ${fastAt(0)} to ${fastAt(DEALS)} days, the old routes from ${oldAt(0)} to ${oldAt(DEALS)}, and the fast track stays quicker until all ${DEALS} teams have switched. Now ${now.onFast} have switched.`,
  );

  const puzzle = {
    goal: 'Forty deals a quarter, 30 days each. The fast track skips the 20-day adviser, and each team picks the quickest route for its own deal. Once every team has chosen, what happens to the time a deal takes?',
    choices: [
      { value: 'shorter', label: 'Shorter: it skips the 20-day adviser' },
      { value: 'same', label: 'About the same' },
      { value: 'longer', label: 'Longer' },
    ],
    answer: 'longer',
    wrong: (v) =>
      v === 'shorter'
        ? 'That is what the first team to take it finds. Watch both committees’ agendas as more teams switch.'
        : 'Watch both committees’ agendas as more teams switch.',
    hints: [
      'A deal on the fast track goes through both committees. Whose agendas does it join?',
      'Suppose every team takes the fast track. How many deals does each committee then have, and how long does it take?',
    ],
    found: 'Longer: 40 days instead of 30. The fast track swapped a fixed step for a shared one: every deal now waits on both committees.',
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
      Banks have their rush hours too. Say a bank signs forty deals a quarter, and each needs two independent opinions
      before signing: a committee’s, and a second one. There are two equally good ways through: the regional committee,
      then an outside adviser; or the adviser first, then the head-office committee. Half the teams go each way, and a
      deal takes 30 days on either.
    </p>
    <p>
      Committees slow down as their agendas fill; advisers do not, as each deal has its own. Then the bank adds a fast
      track: a deal cleared by the regional committee may go straight to the head-office committee, whose sign-off counts
      as the second opinion.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="How long a deal takes, route by route"
      sub="Each bar is one route to approval, in working days; each dot is one deal."
      rules={[
        '40 deals a quarter, each needing a committee and a second opinion.',
        'A committee takes one working day for every two deals on its agenda.',
        'The outside adviser always takes 20 working days.',
        'Each team picks the route that is quickest for its own deal.',
      ]}
    >
      <Puzzle id="emergence" {...puzzle} predict onshow={() => (onFast = DEALS)} />
      <div class="tkc-controls" class:tkc-wait={!live} inert={live ? undefined : true}>
        <Slider id="ft-teams" label="Deal teams on the fast track" bind:value={onFast} min={0} max={DEALS} step={2} format={(v) => `${v} of ${DEALS}`} ends={['None', `All ${DEALS}`]} />
      </div>

      <div class="tkc-chart" bind:clientWidth={width} bind:this={chart}>
        <svg {width} height={H} role="img" aria-label={ariaLabel}>
          {#each rows as r (r.id)}
            {@const barY = r.top + BAR_TOP}
            <text class="tkc-label" x="0" y={r.top + 12}>{r.name}</text>
            <text class="tkc-label-2 count" class:muted={r.empty} x={width} y={r.top + 12} text-anchor="end">{r.sum}</text>
            {#each Array(Math.min(r.dots, 2 * PER_LINE)) as _, i (i)}
              <circle class="deal" cx={3 + (i % PER_LINE) * DOT_PITCH} cy={r.top + 22 + Math.floor(i / PER_LINE) * DOT_PITCH} r="2.8" />
            {/each}
            {#each [10, 20, 30] as t (t)}
              <line class="tkc-grid" x1={x(t)} x2={x(t)} y1={barY - 3} y2={barY + BAR_H + 3} />
            {/each}
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
          <span><span class="tkc-swatch key review"></span>Outside adviser</span>
          <span><span class="tkc-swatch key dot"></span>One deal</span>
        </div>
      </div>

      <p class="mech tkc-num">
        {#if now.onFast < DEALS}
          The fast track takes <strong>{daysText(now.fastTime)}</strong>; the old routes <strong>{num(now.oldTime)}</strong>. A team that
          switches now saves <strong>{savedText(now.saving)}</strong>.
        {:else}
          The fast track takes <strong>{daysText(now.fastTime)}</strong>. Nobody gains by switching back: the old routes would take
          <strong>{daysText(now.oldTime)}</strong> too.
        {/if}
      </p>
      <p class="tkc-sr" aria-live="polite">{spoken}</p>

      {#if live}
        <div class="tkc-chart">
          <svg {width} height={CH} role="img" aria-label={chartLabel}>
            {#each [0, 10, 20, 30, 40] as t (t)}
              <line class="tkc-grid" x1={cm.left} x2={width - cm.right} y1={cy(t)} y2={cy(t)} />
              {#if t > 0}<text class="tkc-axis-label" x={cm.left - 6} y={cy(t) + 4} text-anchor="end">{t}</text>{/if}
              <text class="tkc-axis-label" x={cx(t)} y={CH - cm.bottom + 16} text-anchor="middle">{t}</text>
            {/each}
            <line class="tkc-base" x1={cm.left} x2={width - cm.right} y1={cy(0)} y2={cy(0)} />
            <text class="tkc-axis-title" x="0" y="12">Days a deal takes</text>
            <text class="tkc-axis-title" x={(cm.left + width - cm.right) / 2} y={CH - 6} text-anchor="middle">Deal teams on the fast track</text>
            <path class="trend old" d={ends(oldAt)} />
            <path class="trend fast" d={ends(fastAt)} />
            <line class="now" x1={cx(atK)} x2={cx(atK)} y1={cm.top} y2={cy(0)} />
            <circle class="pt old" cx={cx(atK)} cy={cy(oldAt(atK))} r="5" />
            <circle class="pt fast" cx={cx(atK)} cy={cy(fastAt(atK))} r="5" />
            <text class="tkc-label tkc-halo" x={oldLabel.x} y={oldLabel.y}>Old routes</text>
            <text class="tkc-label tkc-halo" x={fastLabel.x} y={fastLabel.y}>Fast track</text>
            {#if hover !== null}
              <line class="cross" x1={cx(hover)} x2={cx(hover)} y1={cm.top} y2={cy(0)} />
            {/if}
            <rect x={cm.left} y={cm.top} width={Math.max(0, width - cm.left - cm.right)} height={CH - cm.top - cm.bottom} fill="transparent" role="presentation" onpointermove={onMove} onpointerleave={() => (hover = null)} />
          </svg>
          {#if hover !== null}
            <div class="tkc-tip" style:left="{Math.min(width - 170, Math.max(0, cx(hover) + 10))}px" style:top="30px">
              <div>{hover} of {DEALS} teams switched</div>
              <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span><strong>{daysText(fastAt(hover))}</strong> fast track</div>
              <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink-2)"></span><strong>{daysText(oldAt(hover))}</strong> old routes</div>
            </div>
          {/if}
          <div class="tkc-legend">
            <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span>Fast track</span>
            <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink-2)"></span>Old routes, either way round</span>
          </div>
        </div>
      {/if}

      {#snippet model()}
        <p>
          Forty deals a quarter each need two independent opinions: a committee’s and a second one. One old route goes to
          the regional committee, then an outside adviser; the other to the adviser, then the head-office committee; the
          fast track to the regional committee, then the head-office committee. Each deal has its own outside adviser,
          who takes 20 working days however many deals there are. A committee’s time follows a stipulated congestion
          rule, a working day for every two deals on its agenda, not a literal timetable: the fuller the agenda, the
          slower the committee. The adviser’s step is a second opinion that a committee can stand in for, not the
          independent environmental and social review that higher-risk projects need in any case.
        </p>
        <p>
          The slider illustrates the mechanism; it is not a history of individual decisions. It treats the deals as a
          smooth flow, puts the chosen number on the fast track and splits the rest evenly between the old routes. With
          k teams on the fast track, each committee has 20 + k/2 deals, the fast track takes 20 + k/2 days and the old
          routes 30 + k/4. So the fast track is quicker until k reaches 40, where both take 40 days and no team can save
          time by switching alone (an equilibrium of the flow, in Wardrop’s sense). The saving shown compares the times
          as they stand. Counted in whole deals, a switching deal also adds half a day to the committee it joins, so the
          last switches gain nothing.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      The fast track starts ten days quicker than the old routes, so the first team takes it, then the next. But every
      switch puts one more deal on a committee’s agenda, and the fast track passes both committees, so it slows twice as
      fast as the old routes. The gap closes only when all forty have moved and each committee takes 20 days. Going back
      is then no better: the old routes pass a 20-day committee and the 20-day adviser. No team can gain by switching
      alone, so the slower pattern stays.
    </p>
    <p>
      The adviser was the link that did not mind volume: each deal had its own, so it took 20 days however many deals
      came. A committee is shared, and every deal on its agenda slows all the others. What decided the time was not
      how many steps a deal passed, but how many of them were shared.
    </p>
    <p>
      So whether it helps depends on the traffic. With 12 deals a quarter, the same fast track would cut every deal from
      23 days to 12; it saves time only below about 27 deals a quarter. Scale decides which kind of complexity a rule
      turns out to be.
    </p>
    <h3>Local best, global worse</h3>
    <p>
      The mathematician Dietrich Braess described the same effect on roads in 1968: a new road can make every journey
      slower, because every driver takes it. Cities have seen it happen. When New York closed 42nd Street for Earth Day
      in 1990, traffic in the area flowed better, not worse, as Gina Kolata reported in The New York Times.
    </p>
    <p>
      Every team chose well for its own deal, and together they made every deal slower. In the same way, a new system
      that serves one team well can add a step for everyone else, and a control that removes one risk can push another
      somewhere out of sight.
    </p>
    <p>
      Picture five lenders financing one wind farm. Each adds a condition that protects its own position: a reserve
      account here, a consent right there. Each condition is sensible. Together they can make the project too slow or
      too costly to build, and then every lender loses.
    </p>
    <p>
      Here the average deal got slower with every switch, from 30 days to 40. A measure of the whole journey, across all
      deals, is the one number no shortcut can improve at the others’ expense.
    </p>
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
  .mech {
    margin: 0;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid var(--tkc-hair);
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--tkc-ink-2);
    text-wrap: pretty;
  }
  .mech strong {
    color: var(--tkc-ink);
    font-weight: 700;
  }
  .trend {
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .trend.fast {
    stroke: var(--tkc-conditions);
  }
  .trend.old {
    stroke: var(--tkc-ink-2);
  }
  .pt {
    stroke: var(--tkc-surface);
    stroke-width: 2;
  }
  .pt.fast {
    fill: var(--tkc-conditions);
  }
  .pt.old {
    fill: var(--tkc-ink-2);
  }
  .now {
    stroke: var(--tkc-ink);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .cross {
    stroke: var(--tkc-muted);
    stroke-width: 1;
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
