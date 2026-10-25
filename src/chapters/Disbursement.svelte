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
  import { simulateLoans, typical, nineInTen, shareWithin, histogram, inTime, dateSetters, CONDITIONS, TOTAL, MIN_BEFORE, POLICY_BEFORE, TARGET, PARAMS } from '../lib/sim/disbursement.js';
  import { linear, ticks, barUp } from '../lib/scales.js';

  const START = { before: TOTAL, late: 'wait', parties: 'unpredictable' };

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
  // The rows of "One of the loans": the conditions still required, any safeguard a moved
  // condition leaves behind, then the conditions no longer required before the money moves.
  const rows = $derived([
    ...loan.conditions.filter((c) => c.required),
    ...loan.safeguards.map((g) => ({ ...g, required: true, safeguard: true })),
    ...loan.conditions.filter((c) => !c.required),
  ]);
  const setter = $derived(rows.find((r) => r.required && r.setsDate));
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
    predAlt: at({ alternatives: true, predictable: true }),
  };
  // Every setting the puzzle accepts (within policy, unpredictable parties). In this model:
  // alternatives, with ten, nine or eight conditions first, all at 55 days.
  const solving = [];
  for (let b = POLICY_BEFORE; b <= TOTAL; b++) {
    for (const a of [false, true]) {
      const r = at({ before: b, alternatives: a });
      if (r.p90 <= TARGET) solving.push({ before: b, alternatives: a, p90: r.p90 });
    }
  }
  // "Show me the answer": the fewest conditions moved that meet the goal.
  const fewest = solving.reduce((best, x) => (x.before > best.before ? x : best));
  const ANSWER = { before: fewest.before, late: fewest.alternatives ? 'alt' : 'wait', parties: 'unpredictable' };
  const words = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
  const movedAtFewest = CONDITIONS.slice(fewest.before)
    .reverse()
    .map((c) => `the ${c.name.toLowerCase()}`);
  const moreChangesNothing = solving.every((x) => x.p90 === fewest.p90);
  // Average delivery, unpredictable over predictable parties: the same medians, a wider spread.
  const meanMet = (s) => s.met.reduce((a, v) => a + v, 0) / s.met.length;
  const meanStretch = Math.round((meanMet(F.start.s) / meanMet(F.pred.s) - 1) * 100);
  const worstEach = Math.floor(Math.min(...inTime(F.start.s, TARGET)) * 100);
  const allTogether = Math.round(shareWithin(F.start.s.days, TARGET) * 100);
  const slowestTypical = Math.max(...CONDITIONS.map((c) => c.median));
  const registeredShare = dateSetters(F.start.s)[CONDITIONS.findIndex((c) => c.id === 'registered')];
  const altCount = CONDITIONS.filter((c) => c.alt).length;
  // Once security registered follows the money, its filing evidence stays before it: one row more than the count.
  const REG = CONDITIONS.findIndex((c) => c.safeguard);
  const beforeLabel = (v) => `${v} of ${TOTAL}${v <= REG ? ' + filing' : ''}`;
  const weeks = (d) => words[Math.round(d / 5)];
  const fastest = Math.min(...CONDITIONS.map((c) => c.median));

  // What the reader is told before the puzzle: the model in a few plain statements.
  const rules = [
    `As signed, all twelve come before the money; each usually takes ${weeks(fastest)} to ${weeks(slowestTypical)} weeks.`,
    `Any can be late; about one document in ${words[Math.round(1 / PARAMS.returned)]} comes back for correction.`,
    `Some may follow the money as undertakings; policy keeps at least ${words[POLICY_BEFORE]} first.`,
  ];

  // Shared horizontal range: working days after signing.
  const XMAX = 120;
  const textWidth = (s) => s.length * 6.9; // 12px SVG text, a little generous
  const compact = $derived(width < 420);

  // ---- One of the loans, condition by condition ----
  // Wide: one row per condition, its name to the left of its line. Narrow: each name on its own
  // line just above its dot, on a light band, so that every name reads with its own dot.
  const TAG = 22; // the "or" tag column
  const LW = 160; // label column (wide layout)
  const LANE = 22; // the "money moves" label above the rows
  const HEAD = $derived(compact ? 22 : 20); // a group heading
  const RH = $derived(compact ? 29 : 17);
  const n = $derived(sim.before);
  const plotLeft = $derived(compact ? 6 : LW);
  const tx = $derived(linear(0, XMAX, plotLeft, width - 10));
  const day = (d) => Math.min(XMAX, d);
  const nBefore = $derived(n + loan.safeguards.length);
  const SAFE_MAX = CONDITIONS.filter((c) => c.safeguard).length;
  // Row tops: a heading, the rows required before the money moves, a heading, the rest.
  const rowTop = (i) => LANE + HEAD + i * RH + (i >= nBefore ? HEAD + 4 : 0);
  const afterHeadY = $derived(LANE + HEAD + nBefore * RH + 4);
  // The same height whatever the split: every row, any safeguard and both headings.
  const rowsBottom = $derived(LANE + HEAD + (TOTAL + SAFE_MAX) * RH + HEAD + 4);
  const TH = $derived(rowsBottom + 34);
  const dotY = (i) => rowTop(i) + (compact ? 21 : RH / 2);
  const nameY = (i) => (compact ? rowTop(i) + 12 : rowTop(i) + RH / 2 + 4);
  const moneyX = $derived(tx(day(loan.day)));
  const moneyText = $derived(`Money moves · day ${loan.day}`);
  // Right of the line where it fits, else left of it, kept inside the chart.
  const moneyLabelX = $derived(moneyX + 5 + textWidth(moneyText) <= width ? moneyX + 5 : Math.max(0, moneyX - 5 - textWidth(moneyText)));
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
  const regByPackage = $derived(loan.conditions.some((c) => c.id === 'registered' && c.required && c.alt));
  const HEAD_BEFORE = 'Before the money moves';
  const HEAD_AFTER = $derived(`Not required before the money moves${n === TOTAL ? ': none' : ''}`);
  const knockouts = $derived([
    { x: -2, y: LANE + 3, w: textWidth(HEAD_BEFORE) + 4 },
    { x: -2, y: afterHeadY + 3, w: textWidth(HEAD_AFTER) + 4 },
    ...rows.map((c, i) => ({
      x: TAG - 2,
      y: nameY(i) - 11,
      w: textWidth(c.name + (c.setsDate && c.required ? ' · sets the date' : '')) + 4,
      band: true,
    })),
  ]);
  const verdict = $derived(
    loan.day <= TARGET
      ? `This client is paid on day ${loan.day}, within the promise.`
      : `This client is paid on day ${loan.day}, ${loan.day - TARGET} working days after the promise.`,
  );
  const loanLabel = $derived(
    `One of the ${PARAMS.loans.toLocaleString('en-US')} loans. The money moves on day ${loan.day}, after ${setter.name}${setter.alt ? ', met by its alternative' : ''}${setter.safeguard ? (setter.byPackage ? ', the filing package' : ', the registration itself') : ''}. Before the money moves: ` +
      rows
        .filter((c) => c.required)
        .map((c) => `${c.name}: day ${c.met}${c.alt ? ` by its alternative, original day ${c.good}` : ''}${c.safeguard ? (c.byPackage ? ` by the filing package; registration day ${c.good}` : ' by the registration itself') : ''}`)
        .join('; ') +
      `. Not required before the money moves: ${loan.conditions.filter((c) => !c.required).map((c) => `${c.name}, day ${c.good}`).join('; ') || 'none'}.`,
  );

  // ---- All loans: days to disbursement ----
  const HH = $derived(compact ? 196 : 216);
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
  // Each label takes one of three heights and one side of its line; of all the arrangements,
  // the one where no label crosses another line or leaves the chart wins.
  const LEVELS = [12, 27, 42];
  const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const marks = $derived.by(() => {
    const m = [
      { key: 'mid', x: hx(mid + 1), text: 'Typical' },
      { key: 'p90', x: hx(p90 + 1), text: '9 in 10' },
      { key: 'target', x: hx(TARGET + 1), text: `Promise · ${TARGET} days` },
    ];
    // Natural order: the leftmost line has the highest label.
    const rank = [...m].sort((a, b) => a.x - b.x).map((d) => d.key);
    let best = null;
    for (const perm of PERMS) {
      for (let sides = 0; sides < 8; sides++) {
        const lay = m.map((d, i) => {
          const right = !(sides & (1 << i));
          const w = textWidth(d.text);
          const y = LEVELS[perm[i]];
          return { ...d, y, right, l: right ? d.x + 4 : d.x - 4 - w, r: right ? d.x + 4 + w : d.x - 4 };
        });
        let cost = 0;
        for (const a of lay) {
          if (a.l < 0 || a.r > width) cost += 100;
          if (a.l < hm.left + 2 && a.y + 3 > hm.top - 14) cost += 100; // the "Loans" axis title

          if (!a.right) cost += 2;
          for (const b of lay) if (a !== b && b.x >= a.l - 2 && b.x <= a.r + 2 && b.y + 4 < a.y + 3) cost += 100;
        }
        lay.forEach((d) => (cost += Math.abs(LEVELS.indexOf(d.y) - rank.indexOf(d.key))));
        // Two lines closer than 12 px: their labels face away from each other, so each reads with its own line.
        for (const a of lay)
          for (const b of lay) if (a.x < b.x && b.x - a.x < 12 && (a.right || !b.right)) cost += 50;
        if (!best || cost < best.cost) best = { cost, lay };
      }
    }
    return best.lay;
  });
  const thisX = $derived(hx(day(loan.day) + 0.5));

  // ---- Puzzle ----
  // The parties switch is context, not a lever: it appears once the puzzle is closed.
  const game = getContext('tkc-game');
  const revealed = $derived(!game.isOpen('disbursement'));
  const unpredictableOk = $derived(!predictable);
  const enoughOk = $derived(before >= POLICY_BEFORE);
  const fastOk = $derived(p90 <= TARGET);
  const goalMet = $derived(unpredictableOk && enoughOk && fastOk);
  // The setting the reader solved with, so that the found text describes it.
  let solvedWith = $state(null);
  $effect(() => {
    if (game.isOpen('disbursement')) solvedWith = goalMet ? { before, alternatives, p90 } : null;
  });
  const foundText = $derived.by(() => {
    const w = solvedWith ?? { before: ANSWER.before, alternatives: ANSWER.late === 'alt', p90: fewest.p90 };
    const how = w.alternatives ? 'Alternatives accepted' : 'Every original awaited';
    return `${how}, ${words[w.before]} conditions first: nine clients in ten are paid within ${w.p90} working days, not ${F.start.p90}; neither move works alone.`;
  });
  const puzzle = $derived({
    goal: `Keep the three-month promise for nine clients in ten, with at least ${words[POLICY_BEFORE]} conditions still met before the money moves.`,
    met: goalMet,
    checks: [
      { label: `At least ${POLICY_BEFORE} conditions before the money moves (now ${before})`, ok: enoughOk },
      { label: `9 clients in 10 paid within ${TARGET} working days (now ${p90})`, ok: fastOk },
    ],
    hints: [
      'In “One of the loans”, look at which condition sets the date, and whether it has an “or”.',
      'Neither change is enough alone: moving conditions and accepting alternatives speed up different conditions.',
    ],
    found: foundText,
  });
  const showAnswer = () => ((before = ANSWER.before), (late = ANSWER.late), (parties = ANSWER.parties));
</script>

<Chapter
  n={15}
  kicker="Processing time"
  title="Time to disbursement"
  lede="A client is promised payment within three months of signing. Twelve conditions stand in between, each usually on time. How often does the promise hold?"
  puzzle="disbursement"
>
  {#snippet setup()}
    <p>
      Signing a loan is not paying it out. The client has been told the money will come within about three months of
      signing: 60 working days. In between stands a list of conditions precedent: a board approval, a legal opinion,
      signed and registered security, insurance, permits and more. Every item must be met, so the list is the purest
      chain of <span class="tkc-and">ANDs</span> a bank has.
    </p>
    <p>
      Each item comes from someone else, a borrower, a lawyer, a registry or a central bank, with its own queue and its
      own bad weeks.
    </p>
    <p>
      The chain can bend without dropping a condition. Some conditions can follow the money, as undertakings with a
      deadline; some late documents have an accepted alternative, such as a certified copy: an
      <span class="tkc-or">OR</span> inside the chain.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Twelve conditions, {PARAMS.loans.toLocaleString('en-US')} loans" sub="Each loan has the same twelve conditions and its own luck." {rules}>
      <Puzzle id="disbursement" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <div class="ctl">
          <Slider id="d-before" label="Conditions first" bind:value={before} min={MIN_BEFORE} max={TOTAL} format={beforeLabel} />
          <p class="tkc-caption">From the bottom of the list up, conditions move after the money as undertakings.</p>
        </div>
        <div class="ctl">
          <Segmented
            name="d-late"
            label="A late document"
            bind:value={late}
            options={[
              { value: 'wait', label: 'Wait for it' },
              { value: 'alt', label: 'Accept alternative' },
            ]}
          />
          <p class="tkc-caption">{words[altCount][0].toUpperCase() + words[altCount].slice(1)} conditions have one, asked for after {weeks(PARAMS.wait)} weeks.</p>
        </div>
        {#if revealed}
          <div class="ctl">
            <Segmented
              name="d-parties"
              label="The parties are"
              bind:value={parties}
              options={[
                { value: 'predictable', label: 'Predictable' },
                { value: 'unpredictable', label: 'Unpredictable' },
              ]}
            />
            <p class="tkc-caption">You played the puzzle with unpredictable parties.</p>
          </div>
        {/if}
      </div>

      <div class="part" bind:clientWidth={width}>
        <div class="head">
          <div class="tkc-fig-title small">One of the loans</div>
          <p class="tkc-small verdict">{verdict}</p>
        </div>
        <svg {width} height={TH} role="img" aria-label={loanLabel}>
          {#if compact}
            <!-- On a narrow screen each name sits on its own line above its dot; a light band holds the two together. -->
            {#each rows as c, i (c.id)}
              <rect class="band" x="0" y={rowTop(i) + 1} width={width} height={RH - 3} rx="5" />
            {/each}
          {/if}
          <!-- The day the money moves, drawn under the rows so that their labels stay legible -->
          <line class="money" x1={moneyX} x2={moneyX} y1={LANE - 6} y2={rowsBottom} />
          {#if compact}
            <!-- On a narrow screen the names sit above the dots, across the money line: clear the line behind them. -->
            {#each knockouts as k, i (i)}
              <rect class="knock" class:on-band={k.band} x={k.x} y={k.y} width={k.w} height="15" />
            {/each}
          {/if}
          <!-- Group headings -->
          <text class="tkc-axis-title tkc-halo" x="0" y={LANE + 15}>{HEAD_BEFORE}</text>
          <text class="tkc-axis-title tkc-halo" x="0" y={afterHeadY + 15}>{HEAD_AFTER}</text>

          {#each rows as c, i (c.id)}
            {@const cy = dotY(i)}
            {@const x = tx(day(c.required ? c.met : c.good))}
            <g class="row" class:moved={!c.required}>
              {#if !compact}<line class="track" x1={plotLeft} x2={width - 10} y1={cy} y2={cy} />{/if}
              {#if c.hasAlt}
                <rect class="or-tag" x="0" y={nameY(i) - 11} width="18" height="14" rx="4" />
                <text class="or-text" x="9" y={nameY(i) - 1}>or</text>
              {/if}
              <text class="tkc-label-2 tkc-halo name" class:strong={c.setsDate && c.required} x={TAG} y={nameY(i)}
                >{c.name}{#if c.setsDate && c.required && notePlace === 'name'}<tspan class="sets">{' · sets the date'}</tspan>{/if}</text
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

          <text class="tkc-label tkc-halo" x={moneyLabelX} y={LANE - 10}>{moneyText}</text>

          {#each [0, 20, 40, 60, 80, 100, 120] as t}
            <text class="tkc-axis-label" x={tx(t)} y={rowsBottom + 16} text-anchor={t === 0 && compact ? 'start' : t === XMAX ? 'end' : 'middle'}>{t}</text>
          {/each}
          <text class="tkc-axis-label" x={plotLeft + (width - 10 - plotLeft) / 2} y={rowsBottom + 31} text-anchor="middle">working days after signing</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch dot-key" aria-hidden="true"></span>Met</span>
          <span><span class="or-key" aria-hidden="true">or</span>Has an alternative</span>
          {#if anyAlt}<span><span class="tkc-swatch dot-key alt" aria-hidden="true"></span>Met by its alternative <span class="orig-key" aria-hidden="true"></span>original’s day</span>{/if}
        </div>
        {#if loan.safeguards.length}
          <p class="tkc-caption">
            Security registered may follow the money only once its filing evidence is in: proof of filing and a letter
            from local counsel, or the registration itself if that comes first.
          </p>
        {:else if regByPackage}
          <p class="tkc-caption">
            Security registered’s alternative is its filing package: proof of filing and a letter from local counsel. Its
            hollow circle is the registration itself.
          </p>
        {/if}
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat label="Typical loan" value="{mid} days" sub="working days; half are sooner" />
        <Stat label="9 in 10 paid by" value="{p90} days" sub="promise: {TARGET} days" swatch="var(--tkc-conditions)" line={true} />
      </div>

      <div class="part">
        <div class="tkc-fig-title small">{PARAMS.loans.toLocaleString('en-US')} loans like this one</div>
        <svg {width} height={HH} role="img" aria-label="Days from signing to disbursement for {PARAMS.loans.toLocaleString('en-US')} loans. Typical loan {mid} working days; nine in ten by {p90}; promise {TARGET}; the loan above, {loan.day}.">
          <!-- No tick label so near the top that it meets the axis title. -->
          {#each ticks(0, yMax, 3).filter((t) => hy(t) >= hm.top + 10) as t}
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
            <text class="tkc-label tkc-halo mark-label {mk.key}" x={mk.right ? mk.x + 4 : mk.x - 4} y={mk.y} text-anchor={mk.right ? 'start' : 'end'}>{mk.text}</text>
          {/each}
          {#each [0, 20, 40, 60, 80, 100, 120] as t}
            <text class="tkc-axis-label" x={hx(t + 0.5)} y={hy(0) + 15} text-anchor={t === XMAX ? 'end' : 'middle'}>{t}</text>
          {/each}
          <path class="this" d="M{thisX} {hy(0) + 20}l5 8h-10z" />
          <text class="tkc-label-2 tkc-halo" x={thisX + (thisX + 120 < width ? 9 : -9)} y={hy(0) + 29} text-anchor={thisX + 120 < width ? 'start' : 'end'}>this loan · day {loan.day}</text>
          <text class="tkc-axis-label" x={Math.max(hm.left + (width - hm.left - hm.right) / 2, 0) - (compact ? 18 : 0)} y={HH - 4} text-anchor="middle">working days from signing to disbursement</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch" style:background="var(--tkc-ink-2)" aria-hidden="true"></span>Loans by day paid</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)" aria-hidden="true"></span>Slowest one in ten</span>
          {#if !isStart}<span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-muted)" aria-hidden="true"></span>At the start</span>{/if}
          {#if hist.beyond > 0}<span>{hist.beyond} loans after day {XMAX}, off the chart</span>{/if}
        </div>
      </div>

      {#snippet model()}
        <p>
          A simulation of {PARAMS.loans.toLocaleString('en-US')} loans, each with its own luck, the same under every
          setting. Each condition is met a log-normal number of working days after signing,
          around a typical day from 5 (Board approval, Process agent) to 35 (Security registered): professional
          estimates, not data. Eight deliveries in ten arrive within about a fifth of that day when the parties are
          predictable, and between half and twice it when they are not.
        </p>
        <p>
          A document is checked in three working days, and 15% come back for correction; the money moves three working
          days after the last condition. A condition still open after 20 working days is met by its alternative, about
          five days after that arrives. The slider moves conditions after the money from Process agent upwards; four
          never move, and Security registered still needs its filing evidence first. The floor of eight stands for a
          credit policy.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Each condition alone is usually in time: every one is met in time for at least {worstEach} clients in 100. All twelve together keep the promise for only {allTogether}. That is the riddle’s arithmetic: a
      chain of <span class="tkc-and">ANDs</span> holds only when every link holds at once. Side by side, the slowest sets the date,
      a different one each time: no condition typically takes more than {slowestTypical} working days, yet the typical
      loan waits {F.start.mid}.
    </p>
    <p>
      The spread decides. Predictable or not, the parties take the same typical time, but the wider spread makes
      deliveries about {meanStretch}% longer on average and the slowest loans much later: nine in ten are paid by day
      {F.start.p90}, against {F.pred.p90} with predictable parties, who keep the promise as things stand.
    </p>
    <p>
      An alternative does not make the original arrive sooner; it limits how late one document can make the loan. It is
      an option, worth most when the world is erratic: it brings the nine-in-ten mark forward by
      {F.start.p90 - F.alt.p90} working days with unpredictable parties, and by {F.pred.p90 - F.predAlt.p90} with
      predictable ones. With it, letting {list(movedAtFewest)} follow the money is enough{moreChangesNothing ? '; moving more changes nothing' : ''}.
    </p>
    <p>
      Which conditions must come first is the question of the gate worth keeping, asked of a whole loan. Before the money
      moves, a missing document keeps the door shut; afterwards it is a default to manage. So four never move here: the
      lender knows the client, the borrower’s board has approved the loan, the security is signed and a legal opinion
      says it holds.
    </p>
    <p>
      An <span class="tkc-or">OR</span> here and an undertaking with a deadline there keep every condition on the list,
      and let the chain bend instead of break. Once the money moves, other conditions take over for the life of the loan:
      the covenants.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our conditions precedent truly need the money to wait?">
      <p>
        Each condition on a list was added for a reason, usually a good one, and most were added one loan at a time. The
        list rarely records which reasons need the money to wait, and which an undertaking with a deadline, or another
        document, would serve as well.
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
  .head {
    display: grid;
    gap: 2px;
  }
  .verdict {
    margin: 0;
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
  .knock {
    fill: var(--tkc-surface);
  }
  .band,
  .knock.on-band {
    fill: var(--tkc-sunken);
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
