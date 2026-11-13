<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulate, curveOf, yearOf, allCheckedFrom, onReviewed, PATTERNS, P, MONTHS, ATTEMPTS, CHECKS, PARAMS, EVERY, SEED, RUNS, NUMBERS } from '../lib/sim/redqueen.js';

  // Procurement schemes across a lender's projects against integrity reviews that move. In the model's words a pattern
  // is a red flag, a check is a review, an attempt is a rigged contract and a review is a move of the reviews.
  // A prediction about monthly moves. Never and Yearly can be played from the start; Monthly shows locked until the
  // first answer or a hint (and the chart stays on yearly if it is somehow chosen); "The reviews" once the puzzle is closed.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('redqueen'));
  const revealed = $derived(!game.isOpen('redqueen'));

  let review = $state('yearly');
  let mode = $state('review');
  let width = $state(560);

  const r = $derived(!live && review === 'monthly' ? 'yearly' : review);
  const m = $derived(revealed ? mode : 'review');
  const curve = $derived(curveOf(r, m)); // the average over 400 runs, in per cent
  const first = $derived(curve[0]);
  const y3 = $derived(yearOf(curve, 2));
  const run = $derived(simulate({ review: r, random: m === 'random', grow: m === 'grow', seed: SEED })); // one run, for the pattern map
  const checksEnd = $derived(run[MONTHS - 1].checked.length);
  const grown = $derived(m === 'grow' && r !== 'never');

  const pc = (v) => `${Math.round(v)}%`;
  const LEARN = { 0.25: 'a quarter', 0.5: 'half' }[PARAMS.learn] ?? `${Math.round(PARAMS.learn * 100)}%`;
  const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];

  // ---- What the text quotes: the averages over 400 runs, from the model ----
  const T = {
    first: curveOf('yearly')[0],
    firstRandom: curveOf('yearly', 'random')[0],
    jumps: [curveOf('yearly')[12], curveOf('yearly')[24]],
    never: yearOf(curveOf('never'), 2),
    yearly: yearOf(curveOf('yearly'), 2),
    monthly: yearOf(curveOf('monthly'), 2),
    neverRandom: yearOf(curveOf('never', 'random'), 2),
    yearlyRandom: yearOf(curveOf('yearly', 'random'), 2),
    grow: yearOf(curveOf('monthly', 'grow'), 2),
    growFrom: allCheckedFrom('monthly'),
  };

  // ---- What just happened, under the chart ----
  const story = $derived.by(() => {
    const c = curve;
    if (r === 'never')
      return m === 'random'
        ? `Two reviews stay where they began; the third, drawn at random each month, keeps the catch near ${pc(y3)}.`
        : `The reviews stay where they began; within a year the schemes have moved round them, and the catch falls to ${pc(y3)}.`;
    if (r === 'yearly')
      return m === 'random'
        ? `With one review at random, the first month catches less (${pc(c[0])}), but no red flag stays safe for long: ${pc(y3)} in year three.`
        : m === 'grow'
          ? `Each yearly move adds one review and drops none; the old reviews guard flags the schemes have left: ${pc(y3)} in year three.`
          : `Each move puts the reviews on last month’s worst: the catch jumps to ${pc(c[12])}, then ${pc(c[24])}, and falls again as the schemes move on.`;
    if (m === 'grow') {
      const from = run.findIndex((x) => x.checked.length === P) + 1;
      return `A review added every month and none dropped: from month ${from}, all ${P} red flags are reviewed and the catch holds at ${pc(c[from - 1])}.`;
    }
    return m === 'random'
      ? `Moved every month, the reviews gain nothing from the random one: the catch levels off at ${pc(y3)} either way.`
      : `Moved every month, the reviews chase the schemes, and the catch levels off at ${pc(y3)}: running to stand still.`;
  });
  const MODE_NOTE = {
    review: 'At each move, all three reviews go to last month’s three worst flags.',
    random: 'Two reviews follow the findings; the third is drawn at random each month from the rest.',
  };
  const modeNote = $derived(m === 'grow' ? `Each move adds a review on last month’s worst and none is dropped: ${checksEnd} reviews by month 36.` : MODE_NOTE[m]);

  // ---- Both views share one month axis: the catch above, one run's attempts by pattern below ----
  const wide = $derived(width >= 480);
  const span = $derived(Math.max(width, 240));
  const LABEL = $derived(wide ? 118 : 92);
  const YG = $derived(wide ? 6 : 3); // the gap between years
  const cw = $derived((span - LABEL - 2 * YG) / MONTHS);
  const xOf = (mo) => LABEL + mo * cw + Math.floor(mo / 12) * YG;
  const xMid = (mo) => xOf(mo) + cw / 2;
  const yearMid = (y) => (xOf(12 * y) + xOf(12 * y + 11) + cw) / 2;

  // The catch, month by month.
  const PT = 26;
  const PH = $derived(wide ? 170 : 136);
  const y0 = $derived(PT + PH);
  const H = $derived(y0 + 42);
  const yOf = (v) => PT + PH * (1 - v / 100);
  const yTicks = [0, 25, 50, 75, 100];
  const linePath = $derived(curve.map((v, i) => `${i ? 'L' : 'M'}${xMid(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(''));
  const areaPath = $derived(`${linePath}L${xMid(MONTHS - 1).toFixed(1)} ${y0}L${xMid(0).toFixed(1)} ${y0}Z`);
  const reviews = $derived(EVERY[r] ? [...Array(MONTHS).keys()].filter((mo) => mo > 0 && mo % EVERY[r] === 0) : []);
  const firstLabelY = $derived(yOf(first) - 6);
  // Year three's catch, as a bar across year three; its label goes below the bar when it would meet the first month's.
  const y3Below = $derived(Math.abs(yOf(y3) - 6 - firstLabelY) < 16);
  const y3LabelY = $derived(y3Below ? yOf(y3) + 15 : yOf(y3) - 6);
  const phoneY3 = $derived.by(() => {
    const y = yOf(Math.max(y3, ...curve.slice(24))) - 7;
    return { y, lead: yOf(y3) - y > 12 };
  });
  // The drift in year one, labelled where the line falls (not where the random review or the growing chain changes
  // it): at month five, low enough for the label to clear the first month's line.
  const showDrift = $derived(m === 'review' || (m === 'grow' && r === 'yearly'));
  const DM = 4;
  const drift = $derived({ x: xMid(DM), y: yOf(curve[DM]), tx: xMid(DM + 1) + 6, ty: yOf(curve[DM]) - (wide ? 40 : 34) });

  // One run's rigged contracts: a row per red flag, a column per month.
  const HCH = $derived(wide ? 9 : 7);
  const HP = $derived(wide ? 12 : 10);
  const hy = (p) => 3 + p * HP;
  const HH = $derived(P * HP + 4);
  // Five steps of colour, from a red flag barely seen to one on fifteen rigged contracts or more.
  const level = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : n <= 14 ? 4 : 5);
  const cells = $derived(run.flatMap((month, mo) => month.n.map((n, p) => ({ key: `${p}-${mo}`, x: xOf(mo), y: hy(p), lvl: level(n), on: month.checked.includes(p) }))));
  // Each spell of reviewing one red flag, outlined as one box.
  const spells = $derived.by(() => {
    const out = [];
    for (let p = 0; p < P; p++) {
      let start = -1;
      for (let mo = 0; mo <= MONTHS; mo++) {
        const on = mo < MONTHS && run[mo].checked.includes(p);
        if (on && start < 0) start = mo;
        if (!on && start >= 0) {
          out.push({ key: `${p}-${start}`, x: xOf(start) - 1, y: hy(p) - 1, w: xOf(mo - 1) + cw - xOf(start) + 1, h: HCH + 2 });
          start = -1;
        }
      }
    }
    return out;
  });
  const onChecked = (from, to) => 100 * onReviewed(run, from, to);

  const HOW = { never: 'never moved', yearly: 'moved once a year', monthly: 'moved every month' };
  const MODE_WORDS = { review: '', random: ', with one review drawn at random each month', grow: ', adding a review at each move and dropping none' };
  const label = $derived(
    `Share of rigged contracts caught each month over three years, averaged over ${RUNS} runs, with the reviews ${HOW[r]}${MODE_WORDS[m]}: ` +
      `${pc(first)} in the first month and ${pc(y3)} in year three. ${story}`,
  );
  const mapLabel = $derived(
    `One run: where fifty rigged contracts a month fall among twelve red flags, and which flags are reviewed. ${pc(onChecked(0, 1))} of the first month’s ` +
      `rigged contracts carry a reviewed flag, and ${pc(onChecked(24, 36))} of year three’s.`,
  );

  // ---- Puzzle ----
  const puzzle = {
    goal: 'The team moves its reviews every month, twelve times as often as once a year. What do they catch in year three?',
    choices: [
      { value: '3/4', label: 'About three in four' },
      { value: '1/2', label: 'About half' },
      { value: '1/4', label: 'About one in four' },
      { value: '1/10', label: 'About one in ten' },
    ],
    answer: '1/4',
    wrong: (v) =>
      v === '3/4'
        ? `Far fewer. Each move aims at last month’s schemes, which are already moving on; the first month’s ${pc(T.first)} never comes back.`
        : v === '1/2'
          ? `Fewer. Even the month right after a yearly move catches only ${pc(T.jumps[0])}, and ${pc(T.jumps[1])} a year later.`
          : `More than that: moved once a year, the reviews already catch ${pc(T.yearly)}. Monthly moves do better, though not twelve times better.`,
    hints: [
      `Even right after a yearly move the reviews catch only ${pc(T.jumps[0])}, then ${pc(T.jumps[1])}, never the first month’s ${pc(T.first)}; moved every month, they leave the schemes less time to pile up anywhere.`,
      'Three reviews cover three red flags of twelve, and schemes chased every month never pile up where the reviews are.',
    ],
    found: `About one in four: moving its reviews twelve times as often, the team holds the catch near ${pc(T.monthly)}; each move aims at last month’s schemes.`,
  };
  const showAnswer = () => {
    review = 'monthly';
    mode = 'review';
  };
</script>

<Chapter
  kicker="Co-evolution"
  title="Running to stand still"
  lede="Most links in this story fail by accident. Some are tested on every tender, and what gets through is passed on."
  puzzle="redqueen"
>
  {#snippet setup()}
    <p>
      A development lender’s clients buy most of what it finances through tenders, and across hundreds of projects a few
      contracts are rigged. Twelve kinds of rigging each leave a red flag: a contract split to stay under the
      prior-review threshold, a single bid, a price padded after award, a subcontract to an official’s cousin.
    </p>
    <p>
      Its integrity team can review three flags thoroughly: first the three seen most, then, whenever it moves its
      reviews, wherever most turned up.
    </p>
    <p>
      Nobody works full time against the lender. But contractors and officials see what the reviews catch: a scheme that
      was caught is dropped; one that went through is used again on the next tender, and copied on other projects. Each
      review is a link, and the schemes test them all.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="Reviews against schemes that spread"
      sub="Rigged contracts across a lender’s projects: what its integrity reviews catch each month, and which red flags they carry."
      rules={[
        'Fifty rigged contracts a month, over twelve red flags; a review catches nine in ten.',
        'Three flags are reviewed; moving the reviews puts them on last month’s three worst.',
        'What got through is used again on other tenders; a few try something new.',
      ]}
    >
      <Puzzle id="redqueen" {...puzzle} predict onshow={showAnswer} />

      <div class="tkc-controls" class:tkc-controls--wide={revealed}>
        <div class="ctl">
          <Segmented
            name="rq-review"
            label="Reviews moved"
            bind:value={review}
            options={[
              { value: 'never', label: 'Never' },
              { value: 'yearly', label: 'Yearly' },
              { value: 'monthly', label: 'Monthly', locked: !live },
            ]}
            lockNote="Monthly opens after your first answer."
          />
        </div>
        {#if revealed}
          <div class="ctl">
            <Segmented
              name="rq-check"
              label="The reviews"
              bind:value={mode}
              options={[
                { value: 'review', label: 'Follow findings' },
                { value: 'random', label: 'One at random' },
                { value: 'grow', label: 'Never dropped' },
              ]}
            />
            <p class="tkc-caption">{modeNote}</p>
          </div>
        {/if}
      </div>

      <div class="tkc-chart views" bind:clientWidth={width}>
        <svg width={span} height={H} role="img" aria-label={label} class:narrow={!wide}>
          <text class="tkc-axis-title" x="0" y="12">{wide ? `Rigged contracts caught each month, average of ${RUNS} runs` : `Caught each month (${RUNS}-run average)`}</text>
          {#each yTicks as t (t)}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={LABEL} x2={span} y1={yOf(t)} y2={yOf(t)} />
            <text class="tkc-axis-label" x={LABEL - 6} y={yOf(t) + 4} text-anchor="end">{t}%</text>
          {/each}
          <path class="area" d={areaPath} />
          <line class="ref" x1={LABEL} x2={span} y1={yOf(first)} y2={yOf(first)} />
          <text class="tkc-label-2 tkc-halo" x={span} y={firstLabelY} text-anchor="end">First month: {pc(first)}</text>
          <line class="y3" x1={xOf(24)} x2={xOf(MONTHS - 1) + cw} y1={yOf(y3)} y2={yOf(y3)} />
          <path class="line" d={linePath} />
          {#if wide}
            <text class="tkc-label tkc-halo" x={span} y={y3LabelY} text-anchor="end">Year three: {pc(y3)}</text>
          {:else}
            <!-- On a phone the label spans most of year three, so it sits above the line, with a leader down to the bar. -->
            {#if phoneY3.lead}<line class="lead" x1={span - 1} x2={span - 1} y1={phoneY3.y + 3} y2={yOf(y3) - 2} />{/if}
            <text class="tkc-label tkc-halo y3-small" x={span - (phoneY3.lead ? 5 : 0)} y={phoneY3.y} text-anchor="end">Year three: {pc(y3)}</text>
          {/if}
          {#if showDrift}
            <line class="lead" x1={drift.tx - 3} y1={drift.ty + 4} x2={drift.x + 3} y2={drift.y - 4} />
            <text class="note tkc-halo" x={drift.tx} y={drift.ty - 12}>the schemes move</text>
            <text class="note tkc-halo" x={drift.tx} y={drift.ty + 1}>round the reviews</text>
          {/if}

          <text class="tkc-axis-label" x={LABEL - 6} y={y0 + 20} text-anchor="end">Moves</text>
          {#each reviews as mo (mo)}
            <line class="tick" x1={xMid(mo)} x2={xMid(mo)} y1={y0 + 9} y2={y0 + 19} />
          {/each}
          {#if !reviews.length}<text class="tkc-axis-label" x={LABEL + 2} y={y0 + 20}>none</text>{/if}
          {#each [0, 1, 2] as y (y)}
            <text class="tkc-axis-label" x={yearMid(y)} y={y0 + 37} text-anchor="middle">Year {y + 1}</text>
          {/each}
        </svg>
        <p class="tkc-caption story">{story}</p>

        <div class="map">
          <span class="map-title">One of the runs: where the schemes go{wide ? ' (darker: more)' : ''}</span>
          <svg width={span} height={HH} role="img" aria-label={mapLabel} class:narrow={!wide}>
            {#each PATTERNS as name, p (name)}
              <text class="name" x={LABEL - 6} y={hy(p) + HCH / 2 + (wide ? 4 : 3)} text-anchor="end">{name}</text>
            {/each}
            {#each cells as c (c.key)}
              <rect class="cell l{c.lvl}" class:on={c.on} x={c.x} y={c.y} width={Math.max(1, cw - 1)} height={HCH} />
            {/each}
            {#each spells as b (b.key)}
              <rect class="spell" x={b.x} y={b.y} width={b.w} height={b.h} rx="2" />
            {/each}
          </svg>
          <div class="tkc-legend">
            <span><span class="tkc-swatch" style:background="var(--tkc-options)" aria-hidden="true"></span>On a reviewed flag</span>
            <span><span class="tkc-swatch" style:background="var(--tkc-conditions)" aria-hidden="true"></span>Meeting no review</span>
            <span><span class="tkc-swatch box" aria-hidden="true"></span>Reviewed that month</span>
          </div>
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat
          label="Caught, first month"
          value={pc(first)}
          sub={m === 'random' ? 'two on the flags seen most, one at random' : 'reviews on the three flags seen most'}
          swatch="var(--tkc-options)"
        />
        <Stat
          label="Caught, year three"
          value={pc(y3)}
          sub={grown ? `with ${checksEnd} reviews on every contract` : `about ${Math.round((y3 / 100) * 12 * ATTEMPTS)} of ${12 * ATTEMPTS} rigged contracts`}
          swatch="var(--tkc-options)"
        />
      </div>

      {#snippet model()}
        <p>
          Each month {ATTEMPTS} rigged contracts fall on the twelve red flags at random, in proportion to the schemes’ mix,
          which starts with {Math.round(PARAMS.start * 100)}% on the three reviewed first. A review catches nine in ten of
          the rigged contracts carrying its flag. The lender learns of every catch and, later, of half of those that got
          through; a move puts the {CHECKS} reviews on the flags with the most found in the latest month.
        </p>
        <p>
          After each month the mix moves towards what paid: each flag’s share grows by {LEARN} of its payoff above the
          average (slowly, as a scheme waits for the next tender), and {Math.round(PARAMS.innovate * 100)}% of the mix is
          spread evenly, as new tries. At random, the third review is drawn each month from the other ten; never dropped,
          each move adds a review on the worst unreviewed flag. The line averages {RUNS} runs; the map shows one.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      The reviews never got worse: each still catches nine rigged contracts in ten. The schemes moved. Left where they
      began, the reviews cover {NUMBERS.onFirstThree[1]}% of the rigged contracts in the first month and
      {NUMBERS.onFirstThree[12]}% by the twelfth. Nobody planned it: a firm caught splitting contracts stopped, one whose
      padded variation went through padded the next, and others heard, on other projects.
    </p>
    <p>
      Two <span class="tkc-idea">loops</span> are racing. The schemes’ turns with every tender: what got through is used
      again. The lender’s turns each time the reviews move: wherever most turned up is reviewed. Moved once a year, the
      reviews catch {pc(T.yearly)} in year three; every month, {pc(T.monthly)}. Neither gets back to the first month’s
      {pc(T.first)}. Each move aims at last month’s schemes, and schemes chased every month spread almost evenly, so three
      reviews of twelve cover only {NUMBERS.onReviewedYear3.monthly}% of them.
    </p>
    <p>
      In Lewis Carroll’s <i>Through the Looking-Glass</i>, the Red Queen tells Alice that “it takes all the running you can
      do, to keep in the same place”. The biologist Leigh Van Valen (1973) gave her name to evolution’s version, in which
      species must keep changing to keep up with their rivals. Nobody directs that race either: what works leaves more
      copies.
    </p>
    <p>
      One way out is to add a review at every move and never drop one. Moved monthly, the reviews catch {pc(T.grow)} from
      the {ORD[T.growFrom]} month, when all twelve flags are reviewed. That takes four times the team, and every honest
      tender then waits on twelve reviews: the riddle’s long chain of <span class="tkc-and">ANDs</span>, grown one sensible
      link at a time.
    </p>
    <h3>A review they cannot predict</h3>
    <p>
      Copying beats only what it can predict. With one of the three reviews drawn at random each month, the first month
      catches less, {pc(T.firstRandom)} instead of {pc(T.first)}; but year three catches {pc(T.yearlyRandom)} instead of
      {pc(T.yearly)} with yearly moves, and {pc(T.neverRandom)} instead of {pc(T.never)} with none, because no red flag
      stays safe for long. When every tender tests the links, a chain is kept strong less by its strongest links than by
      being hard to learn.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our procurement reviews are judged by whether they were done, and which by what they found?">
      <p>
        Procurement reviews are often judged by whether they were done: the prior review signed off, the red-flag
        checklist run on every contract. Schemes change with what gets through, and a review can be done perfectly while
        guarding a red flag nobody uses any more. A falling count of findings can mean the schemes have moved, not that
        they have gone.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ctl {
    display: grid;
    align-content: start;
    gap: 6px;
    min-width: 0;
  }
  .views {
    display: grid;
    gap: 8px;
  }
  .views svg {
    display: block;
  }
  .area {
    fill: var(--tkc-options-wash);
  }
  .line {
    fill: none;
    stroke: var(--tkc-options);
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .ref {
    stroke: var(--tkc-ink-2);
    stroke-width: 1.25;
    stroke-dasharray: 5 4;
  }
  .y3 {
    stroke: var(--tkc-ink);
    stroke-width: 2;
  }
  .lead {
    stroke: var(--tkc-muted);
    stroke-width: 1;
  }
  .note {
    fill: var(--tkc-ink-2);
    font-size: 12px;
    font-style: italic;
  }
  .tick {
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
  }
  .story {
    margin: 0;
    min-height: 2.9em;
  }
  .map {
    display: grid;
    gap: 6px;
    padding-top: 10px;
    border-top: 1px solid var(--tkc-hair);
  }
  .map-title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--tkc-ink-2);
  }
  .name {
    fill: var(--tkc-ink-2);
    font-size: 11px;
  }
  .cell {
    fill: var(--tkc-sunken);
  }
  .cell.l1 {
    fill: color-mix(in srgb, var(--tkc-conditions) 28%, var(--tkc-surface));
  }
  .cell.l2 {
    fill: color-mix(in srgb, var(--tkc-conditions) 46%, var(--tkc-surface));
  }
  .cell.l3 {
    fill: color-mix(in srgb, var(--tkc-conditions) 64%, var(--tkc-surface));
  }
  .cell.l4 {
    fill: color-mix(in srgb, var(--tkc-conditions) 82%, var(--tkc-surface));
  }
  .cell.l5 {
    fill: var(--tkc-conditions);
  }
  .cell.on.l1 {
    fill: color-mix(in srgb, var(--tkc-options) 28%, var(--tkc-surface));
  }
  .cell.on.l2 {
    fill: color-mix(in srgb, var(--tkc-options) 46%, var(--tkc-surface));
  }
  .cell.on.l3 {
    fill: color-mix(in srgb, var(--tkc-options) 64%, var(--tkc-surface));
  }
  .cell.on.l4 {
    fill: color-mix(in srgb, var(--tkc-options) 82%, var(--tkc-surface));
  }
  .cell.on.l5 {
    fill: var(--tkc-options);
  }
  .spell {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 1.25;
  }
  .box {
    background: none;
    border: 1.5px solid var(--tkc-ink);
    border-radius: 2px;
  }
  .narrow .name {
    font-size: 10px;
  }
  .narrow .note,
  .y3-small {
    font-size: 11px;
  }
</style>
