<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulate, summary, PATTERNS, P, MONTHS, ATTEMPTS, CHECKS, PARAMS, SEED, RUNS, NUMBERS } from '../lib/sim/redqueen.js';

  // A prediction: the control, and years two and three of the figure, open after the first answer
  // or a hint; "One check" once the puzzle is closed.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('redqueen'));
  const revealed = $derived(!game.isOpen('redqueen'));

  let review = $state('yearly');
  let check = $state('review');
  let width = $state(560);

  const random = $derived(revealed && check === 'random');
  const run = $derived(simulate({ review, random, seed: SEED }));
  const s = $derived(summary(run));
  const shown = $derived(live ? MONTHS : 12);
  const pct = (v) => `${Math.round(v * 100)}%`;
  const N = NUMBERS;

  // ---- The heatmap: a row per pattern, a column per month, then the share caught each month ----
  const wide = $derived(width >= 480);
  const span = $derived(Math.max(width, 240));
  const LABEL = $derived(wide ? 124 : 0);
  const YG = $derived(wide ? 6 : 4); // the gap between years
  const cw = $derived((span - LABEL - 2 * YG) / MONTHS);
  const xOf = (m) => LABEL + m * cw + Math.floor(m / 12) * YG;
  const LH = $derived(wide ? 0 : 12); // on a phone, each pattern's name sits on a line above its row
  const CH = $derived(wide ? 13 : 9);
  const PITCH = $derived(wide ? 16 : LH + CH + 4);
  const TOP = 2;
  const rowY = (p) => TOP + p * PITCH + LH;
  const heatEnd = $derived(TOP + P * PITCH);
  const BTOP = $derived(heatEnd + (wide ? 10 : 24));
  const BH = 32;
  const AXIS = $derived(BTOP + BH + 17);
  const H = $derived(AXIS + 4);

  // Five steps of colour, from a pattern barely tried to one used by fifteen attempts or more.
  const level = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : n <= 14 ? 4 : 5);
  const cells = $derived(
    run.slice(0, shown).flatMap((month, m) =>
      month.n.map((n, p) => ({ key: `${p}-${m}`, x: xOf(m), y: rowY(p), lvl: level(n), on: month.checked.includes(p) })),
    ),
  );
  // Each spell of checking one pattern, outlined as one box.
  const spells = $derived.by(() => {
    const out = [];
    for (let p = 0; p < P; p++) {
      let start = -1;
      for (let m = 0; m <= shown; m++) {
        const on = m < shown && run[m].checked.includes(p);
        if (on && start < 0) start = m;
        if (!on && start >= 0) {
          out.push({ key: `${p}-${start}`, x: xOf(start) - 1, y: rowY(p) - 1, w: xOf(m - 1) + cw - xOf(start) + 1, h: CH + 2 });
          start = -1;
        }
      }
    }
    return out;
  });
  // Before the first answer, years two and three wait behind a veil (the names of patterns stay readable over it).
  const veilX = $derived(xOf(12) - 1);
  const veilLines = $derived(wide ? ['Years two and three', 'open after your first answer'] : ['Years two and three', 'open after your', 'first answer']);
  const bars = $derived(run.slice(0, shown).map((month, m) => ({ m, x: xOf(m), h: (month.caught / ATTEMPTS) * BH })));

  const HOW = { never: 'never reviewed', yearly: 'reviewed once a year', monthly: 'reviewed every month' };
  const label = $derived(
    live
      ? `Thirty-six months of attempts across twelve patterns, with the checks ${HOW[review]}${random ? ' and one check drawn at random each month' : ''}. ` +
          `The checks catch ${pct(s.first)} of attempts in the first month, ${pct(s.years[0])} in year one and ${pct(s.years[2])} in year three.`
      : `The first twelve months of attempts across twelve patterns. In the first month most attempts use the three patterns checked, ` +
          `and the checks catch ${pct(s.first)}; month by month the attempts move to the other nine, and the checks catch ${pct(s.years[0])} over the year. Years two and three open after your first answer.`,
  );

  // ---- Puzzle ----
  const puzzle = {
    goal: 'The checks catch about three attempts in four in their first month and are reviewed once a year. What do they catch in year three?',
    choices: [
      { value: '3/4', label: 'About three in four' },
      { value: '1/2', label: 'About half' },
      { value: '1/4', label: 'About one in four' },
      { value: '1/10', label: 'About one in ten' },
    ],
    answer: '1/10',
    wrong: (v) =>
      v === '3/4'
        ? 'Far fewer. The checks stay as good as they were, but the attempts do not stay where the checks are.'
        : v === '1/2'
          ? 'Fewer. Each review brings a burst of catches; watch what the attempts do in the months after it.'
          : 'That is about what reviewing every month manages. Once a year leaves the attempts eleven months to move.',
    hints: [
      'Look at year one in the figure: where have the attempts gone by the sixth month?',
      'A review moves the checks to where the fraud was last month. How long does it stay there?',
    ],
    found: 'About one in ten: each yearly review brings a burst of catches, and within six months the attempts have moved round the checks.',
  };
  const showAnswer = () => {
    review = 'yearly';
    check = 'review';
  };
</script>

<Chapter
  kicker="Adversaries"
  title="Running to stand still"
  lede="Most links in this story fail by accident. Some are tested every day, by someone looking for the weakest."
  puzzle="redqueen"
>
  {#snippet setup()}
    <p>
      Payments leave a development lender every day, and some people work full time at getting round its checks.
      Fraudsters and sanctions evaders use a changed bank account, a lookalike supplier invoice, a route through a third
      country, a new intermediary, or a payment split to stay below a threshold. The bank knows twelve such patterns.
    </p>
    <p>
      Its compliance team can check three thoroughly each month, and starts with the three in use most. At each review it
      moves the checks to wherever most fraud turned up.
    </p>
    <p>
      Each check is a link that every payment passes. The other side tests every link, every month, and needs no review:
      it copies whatever gets through.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="Where the attempts go"
      sub="Each row is a pattern, each column a month; the stronger the colour, the more attempts."
      rules={[
        'Fifty attempts a month across twelve patterns; a check stops nine in ten.',
        'Three patterns are checked; a review moves the checks to last month’s three worst.',
        'Attempts drift to unchecked patterns; a few try new ones.',
      ]}
    >
      <Puzzle id="redqueen" {...puzzle} predict onshow={showAnswer} />

      <div class="tkc-controls" class:tkc-wait={!live} inert={live ? undefined : true}>
        <Segmented
          name="rq-review"
          label="Checks reviewed"
          bind:value={review}
          options={[
            { value: 'never', label: 'Never' },
            { value: 'yearly', label: 'Yearly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />
        {#if revealed}
          <div class="ctl">
            <Segmented
              name="rq-check"
              label="One check"
              bind:value={check}
              options={[
                { value: 'review', label: 'Follows review' },
                { value: 'random', label: 'At random' },
              ]}
            />
            <p class="tkc-caption">At random, two checks follow the review and the third is drawn each month from the rest.</p>
          </div>
        {/if}
      </div>

      <div class="tkc-chart heat" bind:clientWidth={width}>
        <svg width={span} height={H} role="img" aria-label={label}>
          {#if !live}<rect class="veil" x={veilX} y={TOP} width={span - veilX} height={BTOP + BH - TOP} rx="6" />{/if}
          {#each PATTERNS as name, p (name)}
            {#if wide}
              <text class="tkc-label-2" x={LABEL - 10} y={rowY(p) + CH / 2 + 4} text-anchor="end">{name}</text>
            {:else}
              <text class="name" x="0" y={rowY(p) - 3}>{name}</text>
            {/if}
          {/each}
          {#each cells as c (c.key)}
            <rect class="cell l{c.lvl}" class:on={c.on} x={c.x} y={c.y} width={Math.max(1, cw - 1)} height={CH} />
          {/each}
          {#each spells as b (b.key)}
            <rect class="spell" x={b.x} y={b.y} width={b.w} height={b.h} rx="2" />
          {/each}

          {#if wide}
            <text class="tkc-label-2" x={LABEL - 10} y={BTOP + BH / 2 - 2} text-anchor="end">Caught</text>
            <text class="tkc-axis-label" x={LABEL - 10} y={BTOP + BH / 2 + 12} text-anchor="end">each month</text>
          {:else}
            <text class="name" x="0" y={BTOP - 4}>Caught each month</text>
          {/if}
          {#each bars as b (b.m)}
            <rect class="track" x={b.x} y={BTOP} width={Math.max(1, cw - 1)} height={BH} />
            {#if b.h > 0}<rect class="caught" x={b.x} y={BTOP + BH - b.h} width={Math.max(1, cw - 1)} height={b.h} />{/if}
          {/each}

          {#if !live}
            {#each veilLines as line, i (line)}
              <text class="tkc-label-2" x={veilX + (span - veilX) / 2} y={(TOP + BTOP + BH) / 2 + 16 * (i - (veilLines.length - 1) / 2) + 4} text-anchor="middle">{line}</text>
            {/each}
          {/if}
          {#each [0, 1, 2] as y (y)}
            <text class="tkc-axis-label" x={(xOf(12 * y) + xOf(12 * y + 11) + cw) / 2} y={AXIS} text-anchor="middle">Year {y + 1}</text>
          {/each}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch" style:background="var(--tkc-options)" aria-hidden="true"></span>Attempts at a checked pattern</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)" aria-hidden="true"></span>Attempts that meet no check</span>
          <span><span class="tkc-swatch box" aria-hidden="true"></span>Checked that month</span>
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat label="Caught, first month" value={pct(s.first)} sub="{run[0].caught} of {ATTEMPTS} attempts" swatch="var(--tkc-options)" />
        <Stat
          label="Caught, year three"
          value={live ? pct(s.years[2]) : '?'}
          sub={live ? `${s.caughtYear3} of ${12 * ATTEMPTS} attempts` : 'opens after your first answer'}
          swatch="var(--tkc-options)"
        />
      </div>

      {#snippet model()}
        <p>
          Each month {ATTEMPTS} attempts fall at random on the twelve patterns, in proportion to the other side’s current
          mix, which starts with {Math.round(PARAMS.start * 100)}% on the three patterns checked first. A check stops each
          attempt on its pattern with a chance of nine in ten. The bank learns of every catch and of half the attempts that
          got through, and a review moves the {CHECKS} checks to the patterns with the most found in the latest month.
        </p>
        <p>
          After each month the mix moves towards what paid: each pattern’s share grows by half its payoff above the average,
          and {Math.round(PARAMS.innovate * 100)}% of the mix is spread evenly, for new tries. At random, two checks follow
          the review and the third is drawn each month from the other ten. The figure is one run; the text quotes averages
          over {RUNS} runs.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      The checks never got worse: each still stops nine attempts in ten. The attempts moved. In the first month
      {N.onFirstThree[1]}% of them use the three patterns checked; by the sixth month, {N.onFirstThree[6]}%. The fraud in
      the gate worth keeping stood still for its one check; this one learns.
    </p>
    <p>
      Reviewing more often helps, but never gets back to the start: in year three, quarterly reviews catch
      {N.year3.quarterly}%, monthly ones {N.year3.monthly}%, and checks left where they began {N.year3.never}%. Each review
      aims at last month’s fraud, which is already moving on. In Lewis Carroll’s <i>Through the Looking-Glass</i>, the
      Red Queen tells Alice that “it takes all the running you can do, to keep in the same place”. The biologist Leigh Van
      Valen (1973) gave her name to evolution’s version, in which every species must keep changing just to keep up with
      its rivals.
    </p>
    <p>
      One way to keep up is to add a check at every review and never drop one. Reviewed quarterly, the checks then catch
      {N.grow}% in year three. By then all twelve patterns are checked, which takes four times the team, and every
      genuine payment passes twelve checks: the riddle’s long chain of <span class="tkc-and">ANDs</span>, grown one
      sensible link at a time.
    </p>
    <h3>A check they cannot predict</h3>
    <p>
      The other side learns what it can predict. Draw one of the three checks at random each month, and the first month
      catches less, {N.firstRandom}% instead of {N.first}%; but with yearly reviews, year three catches
      {N.year3Random.yearly}% instead of {N.year3.yearly}%, because no pattern stays safe for long. The body’s defences work
      the same way, making antibodies at random, multiplying the ones that fit and remembering them. When someone tests
      every link, a chain is kept strong less by its strongest links than by being hard to learn.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our controls are judged by whether they were performed, and which by what they caught?">
      <p>
        Controls are often tested by whether they were performed: the screening ran, the call-back was made and logged.
        Fraud and sanctions evasion change with what gets through, and a control can be performed perfectly while
        guarding a pattern nobody uses any more. A falling count of catches can be the first sign that the other side has
        moved.
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
    gap: 6px;
    min-width: 0;
  }
  .heat svg {
    display: block;
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
    stroke-width: 1.5;
  }
  .track {
    fill: var(--tkc-sunken);
  }
  .caught {
    fill: var(--tkc-options);
  }
  .veil {
    fill: var(--tkc-page);
    stroke: var(--tkc-rule);
    stroke-dasharray: 4 3;
  }
  .box {
    background: none;
    border: 1.5px solid var(--tkc-ink);
    border-radius: 2px;
  }
</style>
