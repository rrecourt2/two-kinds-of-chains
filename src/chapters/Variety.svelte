<script>
  import { getContext, untrack } from 'svelte';
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
  import { REQUESTS, ROOM, WORLDS, DELEGATED, WEEKS_A_YEAR, KIND_NAMES, weeklyRates, outcome, fewestDelegated } from '../lib/sim/variety.js';
  import { linear } from '../lib/scales.js';
  import { prefersReducedMotion } from '../lib/motion.js';

  // The second world opens once the puzzle is solved or its answer shown.
  const game = getContext('tkc-game');
  const solved = $derived(!game.isOpen('variety'));

  // The kinds of request an office may decide on its own: its delegations.
  let decided = $state(DELEGATED.start);
  let world = $state('today');
  let width = $state(560);

  const RATES = { today: weeklyRates('today'), varied: weeklyRates('varied') };
  const kinds = $derived(WORLDS[world]);
  const rates = $derived(RATES[world]);
  const now = $derived(outcome(world, decided));
  const off = $derived(kinds - decided);

  // ---- Numbers the text quotes, all from the model ----
  const BEST = fewestDelegated('today');
  const START = outcome('today', DELEGATED.start);
  const AT = outcome('today', BEST);
  const LESS = outcome('today', BEST - 1);
  const MORE = outcome('today', BEST + 10);
  const SAME = outcome('varied', BEST);
  const VARIED_BEST = fewestDelegated('varied');
  const PRINCIPLED = outcome('varied', BEST, { principles: 1 / 3 });
  const NEW_KINDS = RATES.varied.slice(WORLDS.today);
  const newTotal = NEW_KINDS.reduce((a, b) => a + b, 0);
  const newMax = Math.max(...NEW_KINDS) * WEEKS_A_YEAR;
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const NUMBERS = { 20: 'twenty', 30: 'thirty', 40: 'forty', 60: 'sixty' };
  const word = (v) => WORDS[v] ?? NUMBERS[v] ?? String(v);
  const one = (v) => v.toFixed(1);
  const cap = (t) => t[0].toUpperCase() + t.slice(1);

  // Names and how often each kind comes up; the more varied world's sixty new kinds are not named one by one.
  const nameOf = (i) => KIND_NAMES[i] ?? 'A new kind of request';
  const often = (i) => {
    const r = rates[i];
    return r >= 1 ? `about ${Math.round(r)} a week` : `about ${Math.max(1, Math.round(r * WEEKS_A_YEAR))} a year`;
  };
  // Cases left waiting after an average meeting, as shown: whole cases from three up, tenths below.
  const pile = (o) => (o.left < 0.05 ? 'none' : o.left < 3 ? one(o.left) : String(Math.round(o.left)));
  const weeksOrDays = (v) => (v >= 10 ? `about ${Math.round(v / 5)} weeks` : `${one(v)} working days`);
  const waitNow = (o) => (o.escalated === 0 ? 'nothing waits' : o.jammed ? 'the queue keeps growing' : weeksOrDays(o.wait));

  const rules = [
    `About ${REQUESTS} client requests a week, of ${WORLDS.today} kinds: a few common, most rare.`,
    'Offices may decide the most common kinds of request on their own.',
    `Anything else goes to a head-office committee that hears ${word(ROOM)} a week; the rest wait.`,
  ];

  const puzzle = $derived({
    goal: 'Each kind an office may decide needs training there. Find the fewest that keep the average wait at head office under two weeks.',
    met: world === 'today' && now.met && !outcome(world, decided - 1).met,
    checks: [
      { label: `Average wait at head office under two weeks (now ${waitNow(now)})`, ok: now.met },
      { label: 'No fewer kinds would do it', ok: now.met && !outcome(world, decided - 1).met },
    ],
    hints: [
      `Delegate one more kind at a time from ${word(DELEGATED.start)}, and watch the cases left waiting after each meeting.`,
      'Once the wait is under two weeks, try one kind fewer.',
    ],
    found: `${cap(word(BEST))} kinds, a third of them: the cases left after a meeting fall from ${word(Math.round(LESS.left))} to ${word(Math.round(AT.left))}, and the wait to about ${word(Math.round(AT.wait))} days.`,
  });
  const showAnswer = () => {
    world = 'today';
    decided = BEST;
  };

  // ---- The delegations, as the office sees them: the first kinds, the newest, and how many in between ----
  const decidedList = $derived(
    decided <= 6
      ? KIND_NAMES.slice(0, decided).map((t) => ({ t }))
      : [{ t: KIND_NAMES[0] }, { t: KIND_NAMES[1] }, { t: `${decided - 4} more`, more: true }, { t: KIND_NAMES[decided - 2] }, { t: KIND_NAMES[decided - 1] }],
  );

  // ---- What the last move changed, in a line under the chart ----
  let before = $state(null);
  let seen = { decided: DELEGATED.start, world: 'today' };
  $effect(() => {
    const at = { decided, world };
    untrack(() => {
      if (at.decided !== seen.decided || at.world !== seen.world) {
        before = seen;
        seen = at;
      }
    });
  });
  const leftAfter = (o) => {
    const p = pile(o);
    return p === 'none' ? 'nothing is left waiting after a meeting' : `${p} ${p === '1' ? 'is' : 'are'} left waiting after an average meeting`;
  };
  const change = $derived.by(() => {
    if (now.escalated === 0) return 'Every kind is delegated: nothing goes to head office.';
    const flow = `${one(now.escalated)} cases a week reach the committee’s ${word(ROOM)} places`;
    if (!before) return now.jammed ? `${cap(flow)}: the queue grows every week.` : `${cap(flow)}; ${leftAfter(now)}.`;
    if (before.world !== world) {
      const head = world === 'varied' ? 'A more varied world' : 'Today’s world';
      return `${head}: the same ${decided} delegated kinds send ${one(now.escalated)} a week to head office${now.jammed ? ', and the queue grows every week' : `; ${leftAfter(now)}`}.`;
    }
    const d = decided - before.decided;
    const head =
      d === 1
        ? `Delegated ‘${nameOf(decided - 1)}’, ${often(decided - 1)}`
        : d === -1
          ? `Took back ‘${nameOf(decided)}’, ${often(decided)}`
          : d > 0
            ? `Delegated ${d} more kinds, up to ‘${nameOf(decided - 1)}’`
            : `Took back ${-d} kinds`;
    const was = outcome(world, before.decided);
    if (now.jammed) return `${head}: ${flow}, and the queue ${was.jammed ? 'keeps growing' : 'now grows every week'}.`;
    if (was.jammed) return `${head}: the queue stops growing; ${leftAfter(now)}.`;
    if (pile(now) === pile(was)) return `${head}: ${leftAfter(now)}, as before.`;
    return `${head}: left waiting after a meeting, ${pile(now)} instead of ${pile(was)}.`;
  });

  // ---- The chart: the week's requests, kind by kind, and head office's five places with the cases left waiting ----
  const H = 300;
  const M = { top: 34, right: 2, bottom: 46, left: 30 };
  const Y_MAX = 16;
  const y = linear(0, Y_MAX, H - M.bottom, M.top);
  const base = y(0);
  // Head office: five places a week (one row) and the cases left waiting stacked above, five to a row.
  const TOK = 8;
  const PITCH = 10;
  const COL = ROOM * PITCH - (PITCH - TOK);
  const GAP = 26;
  const JAM = 30; // cases drawn when the queue grows without end
  const placesY = base - 1 - TOK;
  const rowY = (r) => placesY - 6 - TOK - r * PITCH;
  const span = $derived(Math.max(width, 240));
  const narrow = $derived(span < 420);
  const right = $derived(span - M.right - COL - GAP); // end of the bars
  const colX = $derived(span - M.right - COL);
  const step = $derived((right - M.left) / kinds);
  const barW = $derived(step > 4 ? step - 1.5 : step > 2 ? step - 0.75 : step * 0.8);
  const bx = (i) => M.left + i * step;
  const bh = (r) => Math.max(1, base - y(r));

  // The places fill with the cases heard each week, and the cases left waiting pile up above them.
  const ms = () => (prefersReducedMotion() ? 0 : 380);
  const target = (o) => (o.jammed ? JAM : Math.min(JAM, o.left));
  const heard = new Tween(Math.min(ROOM, START.escalated), { duration: 380, easing: cubicOut });
  const left = new Tween(target(START), { duration: 380, easing: cubicOut });
  $effect(() => {
    heard.set(Math.min(ROOM, now.escalated), { duration: ms() });
    left.set(target(now), { duration: ms() });
  });
  const tokens = $derived.by(() => {
    const n = left.current;
    const out = [];
    for (let k = 0; k < Math.ceil(n - 0.04); k++) {
      const part = Math.min(1, n - k);
      out.push({ x: colX + (k % ROOM) * PITCH, y: rowY(Math.floor(k / ROOM)), w: TOK * part, fade: now.jammed && k >= JAM - ROOM });
    }
    return out;
  });
  const stackTop = $derived(tokens.length ? tokens[tokens.length - 1].y : placesY);

  // Over the column: how many are left after a meeting.
  const headY = $derived(y(8.6));
  const head = $derived(
    now.jammed
      ? { a: 'Left waiting: no end', b: `grows by ${Math.round(now.growth)} a year`, hot: true }
      : pile(now) === 'none'
        ? { a: 'None left waiting', b: 'after a meeting', hot: false }
        : { a: `${pile(now)} left waiting`, b: 'after a meeting, on average', hot: true },
  );

  // The flow to head office: along above the rare kinds, then down into the five places.
  // Between the second and third names, so the arrow never runs through a label.
  const arrowY = $derived((y(rates[1]) + 4 + 3 + (y(rates[2]) + 4 - 10)) / 2);
  const elbowX = $derived(colX - 12);
  const together = $derived(narrow ? `${one(now.escalated)} a week` : `together, ${one(now.escalated)} a week`);

  // Labels under the axis: centred under their bracket when there is room, pushed to the ends when not.
  // A generous width for 12px text (the delegated kinds' label is bold); short forms where the long ones do not fit.
  const textW = (s, bold = false) => s.length * (bold ? 7.2 : 6.8);
  const labels = $derived.by(() => {
    const split = bx(decided) - (step - barW) / 2;
    let decidedText = `${decided} kinds delegated`;
    const offText = `${off} sent up`;
    if (off > 0 && textW(decidedText, true) + textW(offText) + 10 > right - M.left) {
      decidedText = `${decided} delegated`;
    }
    const mw = textW(decidedText, true);
    const ow = textW(offText);
    let mx = Math.max(M.left, (M.left + split) / 2 - mw / 2);
    let ox = Math.min(right - ow, (split + right) / 2 - ow / 2);
    if (off > 0 && mx + mw + 10 > ox) {
      mx = M.left;
      ox = right - ow;
    }
    return { split, mx, ox, decidedText, offText };
  });

  // Names on the chart: the three commonest kinds beside their bars, and a few rare ones above theirs,
  // each placed only where it covers no taller bar and no other label.
  const CHAR = 6.4;
  const named = $derived.by(() => {
    const placed = [];
    const clear = (x0, x1, top, bottom) => {
      for (const b of placed) if (x0 < b.x1 + 4 && x1 > b.x0 - 4 && top < b.bottom + 2 && bottom > b.top - 2) return false;
      for (let i = 0; i < kinds; i++) {
        const l = bx(i);
        if (l + barW > x0 && l < x1 && base - bh(rates[i]) < bottom + 2) return false;
      }
      return true;
    };
    const out = [];
    // The commonest, to the right of each bar's top.
    for (let i = 0; i < 3; i++) {
      const t = KIND_NAMES[i];
      const x0 = bx(i) + barW + 4;
      const yb = y(rates[i]) + 4;
      const x1 = x0 + t.length * CHAR;
      if (x1 > right) continue;
      placed.push({ x0, x1, top: yb - 10, bottom: yb + 3 });
      out.push({ t, x: x0, y: yb, anchor: 'start', on: i < decided });
    }
    // Rare kinds: text ending at the bar, a tick down to it, in two rows under the flow arrow.
    const rare =
      world === 'today'
        ? [
            { i: 59, forms: ['Rarest: cooperative, no audited accounts', 'Co-op, no audited accounts', 'Co-op, no accounts'] },
            { i: 44, forms: ['Grace period after a drought', 'Drought grace period'] },
          ]
        : [
            { i: kinds - 1, forms: ['Sixty new kinds, each under three a year', 'Sixty new kinds', 'New kinds'] },
            { i: 59, forms: ['Cooperative, no audited accounts', 'Co-op, no accounts'] },
          ];
    const rows = [base - 36, base - 18];
    for (const r of rare) {
      const cx = bx(r.i) + barW / 2;
      for (const t of narrow ? r.forms.slice(1) : r.forms) {
        const w = t.length * CHAR;
        const spot = rows.find((yb) => clear(cx + 3 - w, cx + 3, yb - 10, yb + 3) && clear(cx - 1, cx + 1, yb + 3, base - bh(rates[r.i]) - 2));
        if (spot === undefined) continue;
        placed.push({ x0: cx + 3 - w, x1: cx + 3, top: spot - 10, bottom: spot + 3 });
        out.push({ t, x: cx + 3, y: spot, anchor: 'end', on: r.i < decided, tick: { x: cx, y0: spot + 4, y1: base - bh(rates[r.i]) - 2 } });
        break;
      }
    }
    // The flow's label sits over the arrow, near head office; it gives way to the names.
    const tw = together.length * CHAR;
    const flow = { x0: elbowX - 4 - tw, x1: elbowX - 4, top: arrowY - 16, bottom: arrowY - 3 };
    const showFlow = off > 0 && placed.every((b) => !(flow.x0 < b.x1 + 4 && flow.x1 > b.x0 - 4 && flow.top < b.bottom + 2 && flow.bottom > b.top - 2));
    return { names: out, showFlow };
  });

  // Hover or tap a bar for its name.
  let tip = $state(null);
  function pick(e) {
    const box = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const i = Math.floor((e.clientX - box.left - M.left) / step);
    tip = i >= 0 && i < kinds ? i : null;
  }
  const tipX = $derived(tip === null ? 0 : Math.max(0, Math.min(span - 230, bx(tip) + step + 8)));

  const aria = $derived(
    `Bars for the ${kinds} kinds of request, most common first, from “${KIND_NAMES[0]}” to the rarest. Offices may decide the ${decided} most common, ${Math.round(now.answered * 100)}% of requests. ` +
      (off > 0
        ? `The other ${off} kinds bring ${one(now.escalated)} cases a week to a committee with ${ROOM} places a week; ${now.jammed ? 'the queue grows every week' : `${leftAfter(now)}, and the average wait is ${weeksOrDays(now.wait)}`}.`
        : 'Nothing goes to head office.'),
  );

  // ---- Tiles ----
  const answeredSub = $derived(now.escalated === 0 ? `all ${REQUESTS} requests a week` : `${one(REQUESTS - now.escalated)} of about ${REQUESTS} requests a week`);
  const waitValue = $derived(
    now.escalated === 0 ? 'None' : now.jammed ? 'No end' : now.wait >= 10 ? `${Math.round(now.wait / 5)} weeks` : `${one(now.wait)} days`,
  );
  const waitSub = $derived(
    now.escalated === 0
      ? 'every request is decided in the office'
      : now.jammed
        ? `the queue grows by about ${Math.round(now.growth)} cases a year`
        : now.wait >= 10
          ? `${Math.round(now.wait)} working days; the committee is ${Math.round(now.load * 100)}% full`
          : `in working days; the committee is ${Math.round(now.load * 100)}% full`,
  );
</script>

<Chapter
  n={18}
  kicker="Requisite variety"
  title="Only variety absorbs variety"
  lede="An office’s delegations say what it may decide on its own. Whatever the world asks beyond them travels up the chain."
  puzzle="variety"
>
  {#snippet setup()}
    <p>
      A development lender’s offices in a dozen countries receive about forty client requests a week. Most are
      familiar: a loan on standard terms, a new repayment date. Some are not: a working capital line in a new currency, a
      guarantee for a local bank, a loan to a cooperative with no audited accounts, a grace period after a drought.
    </p>
    <p>
      Each office has delegated authority: the kinds of request it may decide on its own, within its products, terms
      and limits. A request outside its delegations becomes an exception and travels up the chain to head office, where
      a committee hears exceptions once a week. Today an office may decide {word(DELEGATED.start)} kinds of request, and
      the committee’s agenda never clears.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="The week’s requests, kind by kind"
      sub="Bars: kinds of client request, most common first; blue, those an office may decide on its own."
      {rules}
    >
      <Puzzle id="variety" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <div class="ctl">
          <Slider id="v-menu" label="Office may decide" bind:value={decided} min={DELEGATED.min} max={DELEGATED.max} format={(v) => `${v} of ${kinds} kinds`} />
          <p class="tkc-caption kinds-list">
            Delegated:
            {#each decidedList as item, k (k)}{#if k}<span class="dot" aria-hidden="true">{' · '}</span>{/if}<span class:more={item.more} class:last={k === decidedList.length - 1}>{item.t}</span>{/each}
          </p>
        </div>
        {#if solved}
          <Segmented
            name="v-world"
            label="The world"
            bind:value={world}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'varied', label: 'More varied' },
            ]}
          />
        {/if}
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={span} height={H} role="img" aria-label={aria}>
          {#each [0, 5, 10, 15] as t (t)}
            <line class="tkc-grid" x1={M.left} x2={right} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={M.left - 6} y={y(t) + 4} text-anchor="end">{t}</text>
          {/each}
          <text class="tkc-axis-title" x="0" y={M.top - 16}>Requests a week</text>

          {#each rates as r, i (i)}
            <rect class="bar" class:on={i < decided} class:hover={tip === i} x={bx(i)} y={base - bh(r)} width={barW} height={bh(r)} />
          {/each}
          <line class="tkc-base" x1={M.left} x2={right} y1={base} y2={base} />

          <!-- The kinds, named: the commonest beside their bars, a few rare ones above theirs. -->
          {#each named.names as l (l.t)}
            {#if l.tick}<line class="tick" x1={l.tick.x} x2={l.tick.x} y1={l.tick.y0} y2={l.tick.y1} />{/if}
            <text class="name tkc-halo" class:on={l.on} x={l.x} y={l.y} text-anchor={l.anchor}>{l.t}</text>
          {/each}

          {#if off > 0}
            <!-- Everything no office may decide, however rare each kind, ends up in one place. -->
            <path class="arrow" d="M{labels.split} {arrowY}H{elbowX}V{placesY + TOK / 2}H{colX - 6}" />
            <path class="head" d="M{colX - 1} {placesY + TOK / 2} l-6 -3.5 v7 Z" />
            {#if named.showFlow}<text class="tkc-label-2 tkc-halo" x={elbowX - 4} y={arrowY - 6} text-anchor="end">{together}</text>{/if}
          {/if}

          <!-- Head office: five places a week, and the cases left waiting after a meeting. -->
          {#each Array(ROOM) as _, k (k)}
            <rect class="place-fill" x={colX + k * PITCH} y={placesY} width={TOK * Math.max(0, Math.min(1, heard.current - k))} height={TOK} />
            <rect class="place" x={colX + k * PITCH + 0.5} y={placesY + 0.5} width={TOK - 1} height={TOK - 1} />
          {/each}
          {#each tokens as t, k (k)}
            <rect class="waiting" class:fade={t.fade} x={t.x} y={t.y} width={t.w} height={TOK} />
          {/each}
          {#if now.jammed}
            <path class="up" d="M{colX + COL / 2} {stackTop - 4}V{headY + 22}" />
            <path class="up-head" d="M{colX + COL / 2} {headY + 18} l-3.5 6 h7 Z" />
          {:else if stackTop - 6 > headY + 24}
            <line class="leader" x1={colX + COL / 2} x2={colX + COL / 2} y1={headY + 22} y2={stackTop - 4} />
          {/if}
          <text class="head-a tkc-halo" class:hot={head.hot} x={span} y={headY} text-anchor="end">{head.a}</text>
          <text class="tkc-label-2 tkc-halo" x={span} y={headY + 15} text-anchor="end">{head.b}</text>
          <line class="tkc-base" x1={colX - 4} x2={span - M.right} y1={base} y2={base} />

          <!-- Under the axis: the kinds delegated, the kinds sent up, and head office. -->
          <path class="brace on" d="M{M.left} {base + 5}v4H{labels.split - 1}v-4" />
          <text class="under on" x={labels.mx} y={base + 22}>{labels.decidedText}</text>
          {#if off > 0}
            <path class="brace" d="M{labels.split + 1} {base + 5}v4H{right}v-4" />
            <text class="under" x={labels.ox} y={base + 22}>{labels.offText}</text>
          {/if}
          <text class="under" x={span} y={base + 22} text-anchor="end">Head office</text>
          <text class="tkc-axis-title" x={M.left} y={H - 4}>{narrow ? 'Kinds, most common first' : 'Kinds of request, most common first'}</text>

          <rect
            x={M.left}
            y={M.top}
            width={Math.max(0, right - M.left)}
            height={base - M.top + 4}
            fill="transparent"
            role="presentation"
            onpointermove={pick}
            onpointerdown={pick}
            onpointerleave={(e) => e.pointerType === 'mouse' && (tip = null)}
          />
        </svg>
        {#if tip !== null}
          <div class="tkc-tip" style:left="{tipX}px" style:top="30px">
            <strong>{nameOf(tip)}</strong>
            <div>{often(tip)}{tip >= WORLDS.today ? ': new markets, climate, technology' : ''}</div>
            <div>{tip < decided ? 'Delegated: decided in the office' : 'Sent to head office'}</div>
          </div>
        {/if}
        <p class="tkc-small change">{change}</p>
        <div class="tkc-legend">
          <span><span class="tkc-swatch" style:background="var(--tkc-options)"></span>Delegated</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-muted)"></span>Sent to head office</span>
          <span><span class="tkc-swatch slot-key"></span>{cap(word(ROOM))} places a week</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Left waiting</span>
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat label="Decided in the office" value="{Math.round(now.answered * 100)}%" sub={answeredSub} />
        <Stat label="Average wait at head office" value={waitValue} sub={waitSub} />
      </div>

      {#snippet model()}
        <p>Kinds of request follow Zipf’s law: the k-th most common is asked for in proportion to 1/k^1.34. In today’s world of {WORLDS.today} kinds the most common is {Math.round((RATES.today[0] / REQUESTS) * 100)}% of requests, the rarest about {word(Math.round(RATES.today[WORLDS.today - 1] * WEEKS_A_YEAR))} a year; names are illustrative. Requests arrive at random. Offices that may decide m kinds decide the m most common; the rest go to a committee that meets weekly and hears up to {word(ROOM)}, oldest first.</p>
        <p>The chart shows the cases left after a meeting, and the wait, as exact long-run averages for this queue, checked against a simulation: half a week to the next meeting, plus a week for each meeting with no room. With {word(ROOM)} or more exceptions a week the queue grows without end. The more varied world spreads the same {REQUESTS} requests over {WORLDS.varied} kinds by the same law. In the text, principles let an office settle one unlisted case in three.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      The escalations were never a verdict on the offices. With {word(DELEGATED.start)} kinds delegated, one request in
      five fitted none of them: delegations with less variety than the world send the difference up the chain. The cybernetician
      W.&nbsp;Ross Ashby called this the law of requisite variety: “only variety can destroy variety”
      (1956). Whatever keeps a system steady needs a response for each kind of disturbance it is
      to absorb.
    </p>
    <p>
      With {word(BEST)} kinds delegated, none of the {word(WORLDS.today - BEST)} still sent up comes up more than about
      once a month; together they bring {one(AT.escalated)} a week, nine-tenths of the committee’s room. Ten more kinds
      save {word(Math.round(AT.wait - MORE.wait))} days between them. One fewer, and the committee passes its <span class="tkc-idea">tipping point</span>: {word(Math.round(LESS.left))} cases are left
      after a meeting instead of {word(Math.round(AT.left))}, and the wait grows by
      {word(Math.round(LESS.wait - AT.wait))} days.
    </p>
    <p>
      Then the world grows more varied: {word(WORLDS.varied - WORLDS.today)} new kinds, from new markets, climate shocks
      and new technologies, each asked for fewer than {word(Math.ceil(newMax))} times a year, together
      {word(Math.round(newTotal))} a week. The same {word(BEST)} delegations send {one(SAME.escalated)} a week to
      {word(ROOM)} places; the queue grows by about {Math.round(SAME.growth)} a year. Nobody in the offices has changed.
    </p>
    <h3>Cases nobody listed</h3>
    <p>
      Delegations can grow with the world, here to {word(VARIED_BEST)} kinds. Or offices can hold what a list cannot:
      principles, such as what a loan is for and what the bank can afford to lose. If
      principles settled one unlisted case in three, the wait would stay near {word(Math.round(PRINCIPLED.wait))} days.
      Ashby’s homeostat of 1948 kept no list: pushed out of bounds, it tried new settings until one held.
    </p>
    <p>
      A rulebook with less variety than the world turns every surprise into an escalation, and every escalation into a
      longer chain. Variety at the edge keeps it short.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="How many of last month’s escalations were cases our delegations did not cover?">
      <p>
        Escalation figures are usually read as a measure of an office: its skill, its caution, its confidence. They
        also measure the delegations. A request that fits no product, limit or delegation travels up the chain whoever
        receives it. Delegations are often reviewed by amount, and less often by the kinds of case they cover.
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
  .kinds-list {
    margin: 0;
    color: var(--tkc-ink-2);
  }
  .kinds-list .more {
    color: var(--tkc-muted);
  }
  .kinds-list .last {
    color: var(--tkc-options-ink);
    font-weight: 600;
  }
  .kinds-list .dot {
    color: var(--tkc-muted);
  }
  .bar {
    fill: var(--tkc-muted);
  }
  .bar.on {
    fill: var(--tkc-options);
  }
  .bar.hover {
    stroke: var(--tkc-ink);
    stroke-width: 1;
  }
  .name {
    font-size: 12px;
    fill: var(--tkc-ink-2);
  }
  .name.on {
    fill: var(--tkc-options-ink);
  }
  .tick {
    stroke: var(--tkc-muted);
    stroke-width: 1;
  }
  .arrow {
    fill: none;
    stroke: var(--tkc-ink-2);
    stroke-width: 1.25;
    stroke-linejoin: round;
  }
  .head,
  .up-head {
    fill: var(--tkc-ink-2);
  }
  .up {
    stroke: var(--tkc-ink-2);
    stroke-width: 1.25;
  }
  .leader {
    stroke: var(--tkc-muted);
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }
  .place {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 1;
  }
  .place-fill {
    fill: var(--tkc-muted);
  }
  .waiting {
    fill: var(--tkc-conditions);
  }
  .waiting.fade {
    opacity: 0.45;
  }
  .head-a {
    font-size: 12px;
    font-weight: 600;
    fill: var(--tkc-ink-2);
  }
  .head-a.hot {
    fill: var(--tkc-conditions-ink);
  }
  .change {
    margin: 8px 0 6px;
  }
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  @container fig (max-width: 300px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .brace {
    fill: none;
    stroke: var(--tkc-rule);
    stroke-width: 1;
  }
  .brace.on {
    stroke: var(--tkc-options);
  }
  .under {
    font-size: 12px;
    fill: var(--tkc-ink-2);
  }
  .under.on {
    fill: var(--tkc-options-ink);
    font-weight: 600;
  }
  .slot-key {
    background: transparent;
    border: 1px solid var(--tkc-ink);
    border-radius: 2px;
  }
</style>
