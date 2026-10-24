<script>
  import { getContext } from 'svelte';
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
  import { REQUESTS, ROOM, WORLDS, MENU, WEEKS_A_YEAR, weeklyRates, outcome, smallestMenu } from '../lib/sim/variety.js';
  import { linear } from '../lib/scales.js';
  import { prefersReducedMotion } from '../lib/motion.js';

  // The second world opens once the puzzle is solved or its answer shown.
  const game = getContext('tkc-game');
  const solved = $derived(!game.isOpen('variety'));

  let menu = $state(MENU.start);
  let world = $state('today');
  let width = $state(560);

  const RATES = { today: weeklyRates('today'), varied: weeklyRates('varied') };
  const kinds = $derived(WORLDS[world]);
  const rates = $derived(RATES[world]);
  const now = $derived(outcome(world, menu));
  const off = $derived(kinds - menu);

  // ---- Numbers the text quotes, all from the model ----
  const BEST = smallestMenu('today');
  const START = outcome('today', MENU.start);
  const AT = outcome('today', BEST);
  const LESS = outcome('today', BEST - 1);
  const MORE = outcome('today', BEST + 10);
  const SAME = outcome('varied', BEST);
  const VARIED_BEST = smallestMenu('varied');
  const PRINCIPLED = outcome('varied', BEST, { principles: 1 / 3 });
  const NEW_KINDS = RATES.varied.slice(WORLDS.today);
  const newTotal = NEW_KINDS.reduce((a, b) => a + b, 0);
  const newMax = Math.max(...NEW_KINDS) * WEEKS_A_YEAR;
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const NUMBERS = { 20: 'twenty', 30: 'thirty', 40: 'forty', 60: 'sixty' };
  const word = (v) => WORDS[v] ?? NUMBERS[v] ?? String(v);
  const one = (v) => v.toFixed(1);
  const cap = (t) => t[0].toUpperCase() + t.slice(1);

  const daysText = (v) => `${one(v)} working days`;
  const waitNow = (o) => (o.escalated === 0 ? 'nothing waits' : o.jammed ? 'the queue keeps growing' : daysText(o.wait));

  const rules = [
    `About ${REQUESTS} client requests a week, of ${WORLDS.today} kinds: a few common, most rare.`,
    'The menu answers the most common kinds; every other request goes to head office.',
    `A committee there meets weekly, with room for ${word(ROOM)}; the rest wait another week.`,
  ];

  const puzzle = $derived({
    goal: 'Each answer on the menu needs training in every office. Find the smallest menu that keeps the average wait at head office under two weeks.',
    met: world === 'today' && now.met && !outcome(world, menu - 1).met,
    checks: [
      { label: `Average wait at head office under two weeks (now ${waitNow(now)})`, ok: now.met },
      { label: 'Not one answer more than that needs', ok: !outcome(world, menu - 1).met },
    ],
    hints: [
      `Add answers one at a time from ${word(MENU.start)}, and watch how many exceptions reach the committee’s ${word(ROOM)} places.`,
      'Once the wait is under two weeks, try one answer fewer.',
    ],
    found: `${cap(word(BEST))} answers, a third of the kinds: the ${word(WORLDS.today - BEST)} rarer kinds then fit the committee’s ${word(ROOM)} places, and an exception waits about ${word(Math.round(AT.wait))} days.`,
  });
  const showAnswer = () => {
    world = 'today';
    menu = BEST;
  };

  // ---- The chart: the week's requests, kind by kind, and the committee's five places ----
  const H = 300;
  const M = { top: 34, right: 2, bottom: 46, left: 30 };
  const COL = 44;
  const GAP = 26;
  const Y_MAX = 16;
  const y = linear(0, Y_MAX, H - M.bottom, M.top);
  const base = y(0);
  const unit = y(0) - y(1);
  const span = $derived(Math.max(width, 240));
  const right = $derived(span - M.right - COL - GAP); // end of the bars
  const colX = $derived(span - M.right - COL);
  const step = $derived((right - M.left) / kinds);
  const barW = $derived(step > 4 ? step - 1.5 : step > 2 ? step - 0.75 : step * 0.8);
  const bx = (i) => M.left + i * step;
  const bh = (r) => Math.max(1, base - y(r));

  // The column fills to the exceptions a week, gliding as the menu changes.
  const fill = new Tween(START.escalated, { duration: 380, easing: cubicOut });
  $effect(() => {
    fill.set(now.escalated, { duration: prefersReducedMotion() ? 0 : 380 });
  });
  const failing = $derived(now.escalated > 0 && !now.met);

  // Labels under the axis: centred under their bracket when there is room, pushed to the ends when not.
  // A generous width for 12px text (the menu's label is bold); short forms where the long ones do not fit.
  const textW = (s, bold = false) => s.length * (bold ? 7.2 : 6.8);
  const labels = $derived.by(() => {
    const split = bx(menu) - (step - barW) / 2;
    let menuText = `${menu} on the menu`;
    const offText = `${off} sent up`;
    if (off > 0 && textW(menuText, true) + textW(offText) + 10 > right - M.left) {
      menuText = `Menu: ${menu}`;
    }
    const mw = textW(menuText, true);
    const ow = textW(offText);
    let mx = Math.max(M.left, (M.left + split) / 2 - mw / 2);
    let ox = Math.min(right - ow, (split + right) / 2 - ow / 2);
    if (off > 0 && mx + mw + 10 > ox) {
      mx = M.left;
      ox = right - ow;
    }
    return { split, mx, ox, menuText, offText };
  });
  const together = $derived(`together, ${one(now.escalated)} a week`);
  const arrowY = y(1.7);

  const aria = $derived(
    `Bars for the ${kinds} kinds of request, most common first. The menu answers the ${menu} most common, ${Math.round(now.answered * 100)}% of requests. ` +
      (off > 0
        ? `The other ${off} kinds bring ${one(now.escalated)} exceptions a week to a committee with ${ROOM} places a week; ${now.jammed ? 'the queue keeps growing' : `the average wait is ${daysText(now.wait)}`}.`
        : 'Nothing goes to head office.'),
  );

  // ---- Tiles ----
  const answeredSub = $derived(now.escalated === 0 ? 'nothing goes to head office' : `${one(now.escalated)} requests a week go to head office`);
  const waitValue = $derived(now.escalated === 0 ? 'None' : now.jammed ? 'No end' : `${one(now.wait)} days`);
  const waitSub = $derived(
    now.escalated === 0
      ? 'every request is answered in the office'
      : now.jammed
        ? `the queue grows by about ${Math.round(now.growth)} cases a year`
        : `working days; the committee is ${Math.round(now.load * 100)}% full`,
  );
</script>

<Chapter
  n={18}
  kicker="Requisite variety"
  title="Only variety absorbs variety"
  lede="A rulebook is a menu of answers. Whatever the world asks that the menu cannot answer travels up the chain."
  puzzle="variety"
>
  {#snippet setup()}
    <p>
      A development lender’s offices in a dozen countries receive about forty client requests a week. Most are
      familiar: a loan on standard terms, a new repayment date. Some are not: a working capital line in a new currency, a
      guarantee for a local bank, a loan to a cooperative with no audited accounts, a grace period after a drought.
    </p>
    <p>
      Each office has a menu of answers it may give on its own. A request the menu cannot answer becomes an exception
      and travels up the chain to head office, where a committee hears exceptions once a week. Today the menu holds
      {word(MENU.start)} answers, and the committee’s agenda never clears.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="The week’s requests, kind by kind"
      sub="Each bar is one kind of request, most common first. Whatever the menu cannot answer goes to head office."
      {rules}
    >
      <Puzzle id="variety" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <Slider id="v-menu" label="Menu of answers" bind:value={menu} min={MENU.min} max={MENU.max} format={(v) => `${v} of ${kinds}`} />
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
            <line class="tkc-grid" x1={M.left} x2={span - M.right} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={M.left - 6} y={y(t) + 4} text-anchor="end">{t}</text>
          {/each}
          <text class="tkc-axis-title" x="0" y={M.top - 16}>Requests a week</text>

          {#each rates as r, i (i)}
            <rect class="bar" class:on={i < menu} x={bx(i)} y={base - bh(r)} width={barW} height={bh(r)} />
          {/each}
          <line class="tkc-base" x1={M.left} x2={right} y1={base} y2={base} />

          {#if off > 0}
            <!-- Everything off the menu, however rare each kind, ends up in one place. -->
            <line class="arrow" x1={labels.split} x2={colX - 5} y1={arrowY} y2={arrowY} />
            <path class="head" d="M{colX - 1} {arrowY} l-6 -3.5 v7 Z" />
            <text class="tkc-label-2 tkc-halo" x={colX - 8} y={arrowY - 6} text-anchor="end">{together}</text>
          {/if}

          <!-- The committee: five places a week, filled by the exceptions. -->
          {#each Array(ROOM - 1) as _, k (k)}
            <line class="divide" x1={colX} x2={colX + COL} y1={base - (k + 1) * unit} y2={base - (k + 1) * unit} />
          {/each}
          <rect class="fill" class:failing x={colX} y={base - Math.min(fill.current, Y_MAX) * unit} width={COL} height={Math.min(fill.current, Y_MAX) * unit} />
          {#each Array(Math.max(0, Math.min(ROOM - 1, Math.ceil(fill.current) - 1))) as _, k (k)}
            <line class="divide over" x1={colX} x2={colX + COL} y1={base - (k + 1) * unit} y2={base - (k + 1) * unit} />
          {/each}
          <rect class="slot" x={colX + 0.5} y={base - ROOM * unit + 0.5} width={COL - 1} height={ROOM * unit - 1} />
          <line class="tkc-base" x1={colX - 4} x2={span - M.right} y1={base} y2={base} />

          <!-- Under the axis: the menu, the kinds sent up, and head office. -->
          <path class="brace on" d="M{M.left} {base + 5}v4H{labels.split - 1}v-4" />
          <text class="under on" x={labels.mx} y={base + 22}>{labels.menuText}</text>
          {#if off > 0}
            <path class="brace" d="M{labels.split + 1} {base + 5}v4H{right}v-4" />
            <text class="under" x={labels.ox} y={base + 22}>{labels.offText}</text>
          {/if}
          <text class="under" x={span} y={base + 22} text-anchor="end">Head office</text>
          <text class="tkc-axis-title" x={M.left} y={H - 4}>{span < 420 ? 'Kinds, most common first' : 'Kinds of request, most common first'}</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch" style:background="var(--tkc-options)"></span>On the menu: answered in the office</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-muted)"></span>Sent to head office</span>
          <span><span class="tkc-swatch slot-key"></span>The committee’s {word(ROOM)} places a week</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Waiting over two weeks</span>
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat label="Answered in the office" value="{Math.round(now.answered * 100)}%" sub={answeredSub} />
        <Stat label="Average wait at head office" value={waitValue} sub={waitSub} />
      </div>

      {#snippet model()}
        <p>Kinds of request follow Zipf’s law: the k-th most common is asked for in proportion to 1/k^1.34. In today’s world of {WORLDS.today} kinds the most common is {Math.round((RATES.today[0] / REQUESTS) * 100)}% of requests, the rarest about {word(Math.round(RATES.today[WORLDS.today - 1] * WEEKS_A_YEAR))} a year. Requests arrive at random, {REQUESTS} a week on average. A menu of m answers covers the m most common kinds; every other request goes to a committee that meets weekly and hears up to {word(ROOM)}, oldest first.</p>
        <p>An exception waits until the next meeting, half a week on average, plus a week for each meeting with no room for it: the exact long-run average for this queue, checked against a simulation. With {word(ROOM)} or more exceptions a week the queue grows without end. The more varied world spreads the same {REQUESTS} requests over {WORLDS.varied} kinds by the same law. In the text, principles let an office settle one unlisted case in three.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      The escalations were never a verdict on the offices. With {word(MENU.start)} answers, one request in five fitted
      none of them: a menu with less variety than the world sends the difference up the chain. The cybernetician
      W.&nbsp;Ross Ashby called this the law of requisite variety: “only variety can destroy variety”
      (1956). Whatever keeps a system steady needs a response for each kind of disturbance it is
      to absorb.
    </p>
    <p>
      The long tail makes it bite. None of the {word(WORLDS.today - BEST)} kinds left off a {word(BEST)}-answer menu
      comes up more than about once a month; together they bring {one(AT.escalated)} a week, nine-tenths of the
      committee’s room. Ten more answers save {word(Math.round(AT.wait - MORE.wait))} days between them; one fewer
      costs {word(Math.round(LESS.wait - AT.wait))}, with the committee {Math.round(LESS.load * 100)}% full: the curve
      from the queues chapter, on an agenda shared like the fast track’s.
    </p>
    <p>
      Then the world grows more varied: {word(WORLDS.varied - WORLDS.today)} new kinds, from new markets, climate shocks
      and new technologies, each asked for fewer than {word(Math.ceil(newMax))} times a year. Together they add
      {word(Math.round(newTotal))} a week, and the same {word(BEST)} answers send {one(SAME.escalated)} a week to
      {word(ROOM)} places; the queue grows by about {Math.round(SAME.growth)} cases a year. Nobody in the offices has
      changed.
    </p>
    <h3>Answers nobody listed</h3>
    <p>
      The menu can grow with the world, here to {word(VARIED_BEST)} answers. Or offices can hold what a menu cannot:
      principles, such as what a loan is for and what the bank can afford to lose, that answer cases nobody listed. If
      principles settled one unlisted case in three, the wait would stay near {word(Math.round(PRINCIPLED.wait))} days.
      Ashby’s homeostat of 1948 kept no list: pushed out of bounds, it tried new settings until one held.
    </p>
    <p>
      A rulebook with less variety than the world turns every surprise into an escalation, and every escalation into a
      longer chain. Variety at the edge keeps it short.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="How many of last month’s escalations were cases our menu had no answer for?">
      <p>
        Escalation figures are usually read as a measure of an office: its skill, its caution, its confidence. They
        also measure the menu. A request that fits no product, limit or delegation travels up the chain whoever
        receives it. Delegations are often reviewed by amount, and less often by the kinds of case they cover.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .bar {
    fill: var(--tkc-muted);
  }
  .bar.on {
    fill: var(--tkc-options);
  }
  .arrow {
    stroke: var(--tkc-ink-2);
    stroke-width: 1.25;
  }
  .head {
    fill: var(--tkc-ink-2);
  }
  .fill {
    fill: var(--tkc-muted);
  }
  .fill.failing {
    fill: var(--tkc-conditions);
  }
  .slot {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 1;
  }
  .divide {
    stroke: var(--tkc-rule);
    stroke-width: 1;
  }
  .divide.over {
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
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
