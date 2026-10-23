<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { MONTHS, WORST, ALONE, cover, coverLabel, misses, withinRecord, breaksClaim, breakingCurrency, record } from '../lib/sim/tollroad.js';
  import { linear, line } from '../lib/scales.js';

  // The break region is drawn only once the puzzle is solved or shown.
  const game = getContext('tkc-game');
  const done = $derived(!game.isOpen('black-swans'));

  const RECORD = record();
  const lowest = Math.min(...RECORD.map((p) => p.cover));
  // The most both falls ever reached in the same month, rounded up to a whole percent (6%).
  const maxBoth = Math.ceil(Math.max(...RECORD.map((p) => Math.min(p.traffic, p.currency))) * 100);
  const WT = Math.round(WORST.traffic * 100);
  const WC = Math.round(WORST.currency * 100);

  // The reader's test year, in whole percents.
  let traffic = $state(0);
  let currency = $state(0);
  let width = $state(560);
  const t = $derived(traffic / 100);
  const c = $derived(currency / 100);
  const now = $derived(cover(t, c));
  const short = $derived(misses(t, c));
  const inside = $derived(withinRecord(t, c));

  const fmt = coverLabel;

  // Each test year the reader settles on stays on the chart. A normal year (no falls) is not a test.
  let tests = $state([]);
  $effect(() => {
    const tt = traffic;
    const cc = currency;
    if (tt === 0 && cc === 0) return;
    const timer = setTimeout(() => {
      if (!tests.some((p) => p.t === tt && p.c === cc)) tests = [...tests.slice(-59), { t: tt, c: cc }];
    }, 600);
    return () => clearTimeout(timer);
  });
  const passed = $derived(tests.filter((p) => !misses(p.t / 100, p.c / 100)).length);
  const broke = $derived(tests.filter((p) => breaksClaim(p.t / 100, p.c / 100)).length);

  function showAnswer() {
    const add = [
      { t: WT, c: 0 },
      { t: 0, c: WC },
      { t: WT, c: WC },
    ];
    tests = [...tests.filter((p) => !add.some((a) => a.t === p.t && a.c === p.c)), ...add];
    traffic = WT;
    currency = WC;
  }

  const puzzle = $derived({
    goal: 'Find a year in which the road misses its payment, with neither fall worse than the worst the record has seen.',
    met: short && inside,
    checks: [
      { label: `The road misses its payment (cover now ${fmt(t, c)})`, ok: short },
      { label: `Neither fall beyond the record’s worst (${WT}% and ${WC}%)`, ok: inside },
    ],
    progress: short && !inside ? 'The road misses, but in a year worse than any on record; the claim covers only what it has seen.' : '',
    hints: ['On record, the worst month for traffic and the worst month for the currency came years apart.', `Each fall alone, at its worst, still pays. What about a year in which both fall?`],
    found: 'Both at once: each fall alone was survived, but together they leave the road short, which 96 good months could never show.',
  });

  // ---- The plane: traffic fall across, currency fall up. Negative falls (growth) sit in grey bands. ----
  const T0 = -0.12;
  const T1 = 0.3;
  const C0 = -0.05;
  const C1 = 0.4;
  const H = 300;
  const m = { top: 26, right: 12, bottom: 44, left: 42 };
  const span = $derived(Math.max(width, 200));
  const x = $derived(linear(T0, T1, m.left, span - m.right));
  const y = $derived(linear(C0, C1, H - m.bottom, m.top));
  const clampC = (v) => Math.min(C1, Math.max(C0, v));
  const pc = (v) => `${Math.round(v * 100)}%`;

  // Where the cover falls below 1.0: above the curve.
  const SAMPLES = Array.from({ length: 169 }, (_, i) => T0 + (i * (T1 - T0)) / 168);
  const region = $derived(
    line([...SAMPLES.map((s) => [x(s), y(clampC(breakingCurrency(s)))]), [x(T1), y(C1)], [x(T0), y(C1)]]) + 'Z',
  );
  const edge = $derived(
    line(SAMPLES.filter((s) => breakingCurrency(s) <= C1 && breakingCurrency(s) >= C0).map((s) => [x(s), y(breakingCurrency(s))])),
  );

  const summary = $derived(
    `Traffic fall across, currency fall up. ${MONTHS} months on record, all paid, lowest cover ${lowest.toFixed(2)}; the record’s worst: traffic down ${WT}%, currency down ${WC}%, in different years. ` +
      `This test: traffic down ${traffic}%, currency down ${currency}%, cover ${fmt(t, c)}, the road ${short ? 'misses its payment' : 'pays'}. ` +
      `${tests.length} test${tests.length === 1 ? '' : 's'} so far, ${broke} breaking the claim.` +
      (done ? ` Shaded: the years in which the road misses its payment, including a corner of the record’s box where both fall at least 9%.` : ''),
  );

  const testsSub = $derived(
    broke ? `and ${broke === 1 ? 'one year' : `${broke} years`} that broke the claim` : passed ? `${MONTHS} months on record, ${passed} of your tests` : `the ${MONTHS} months on record`,
  );
</script>

<Chapter
  n={10}
  kicker="Black swans"
  title="How to find a black swan"
  lede="Ninety-six good months can agree with a claim without once testing it. The test is the year that would break it."
  puzzle="black-swans"
>
  {#snippet setup()}
    <p>
      A claim can rest on years of evidence and still be false. Bertrand Russell wrote of a chicken that was fed every
      day of its life, until the day the man who fed it wrung its neck instead.
    </p>
    <p>
      A development bank lent dollars to a toll road. The tolls come in local currency, so the loan rests on two links:
      cars keep coming, and the currency holds. For eight years both held well enough. Traffic once fell 15% in a
      recession; the currency once fell 20% in a year. All 96 monthly payments were made.
    </p>
    <p>The portfolio review concludes: this road can pay through anything it has seen.</p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="Eight years on record, and your test years"
      sub="Each grey dot is a month on record: how far traffic and the currency had fallen on a year earlier."
      rules={[
        'Tolls are paid in local currency; the loan is repaid in dollars.',
        'A normal year earns 1.45 times the debt payment; running costs stay fixed.',
        'A test year sets how far traffic and the currency fall.',
      ]}
    >
      <Puzzle id="black-swans" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <Slider id="bs-traffic" label="Traffic falls by" bind:value={traffic} min={0} max={30} format={(v) => `${v}%`} />
        <Slider id="bs-currency" label="Currency falls by" bind:value={currency} min={0} max={40} format={(v) => `${v}%`} />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={span} height={H} role="img" aria-label={summary}>
          <!-- Growth, not a fall: traffic up (left band), currency up (bottom band). -->
          <rect class="band" x={x(T0)} y={y(C1)} width={x(0) - x(T0)} height={y(C0) - y(C1)} />
          <rect class="band" x={x(0)} y={y(0)} width={x(T1) - x(0)} height={y(C0) - y(0)} />
          {#each [0.1, 0.2, 0.3] as v (v)}
            <line class="tkc-grid" x1={x(v)} x2={x(v)} y1={y(C1)} y2={y(C0)} />
          {/each}
          {#each [0.1, 0.2, 0.3, 0.4] as v (v)}
            <line class="tkc-grid" x1={x(T0)} x2={x(T1)} y1={y(v)} y2={y(v)} />
          {/each}
          <line class="tkc-base" x1={x(0)} x2={x(0)} y1={y(C1)} y2={y(C0)} />
          <line class="tkc-base" x1={x(T0)} x2={x(T1)} y1={y(0)} y2={y(0)} />

          {#if done}
            <path class="region" d={region} />
            <path class="edge" d={edge} />
          {/if}

          <!-- Above the record's dots (which reach 20%) and clear of the break region. -->
          <text class="band-label" x={(x(T0) + x(0)) / 2} y={y(0.29)} text-anchor="middle"><tspan x={(x(T0) + x(0)) / 2}>traffic</tspan><tspan x={(x(T0) + x(0)) / 2} dy="13">grew</tspan></text>
          <text class="band-label tkc-halo" x={x(T1) - 4} y={y(C0) - 4} text-anchor="end">currency rose</text>

          {#each RECORD as p (p.month)}
            <circle class="month" cx={x(p.traffic)} cy={y(p.currency)} r="2.6" />
          {/each}

          <rect class="box" x={x(0)} y={y(WORST.currency)} width={x(WORST.traffic) - x(0)} height={y(0) - y(WORST.currency)} />
          <text class="tkc-label-2 tkc-halo" x={(x(0) + x(WORST.traffic)) / 2} y={y(WORST.currency) - 11} text-anchor="middle">the record’s worst</text>

          {#if done}
            <text class="miss-label tkc-halo" x={span - m.right - 6} y={y(C1) + 16} text-anchor="end">The road misses its payment</text>
          {/if}

          {#each tests as p (`${p.t}-${p.c}`)}
            <circle class="test" class:miss={misses(p.t / 100, p.c / 100)} cx={x(p.t / 100)} cy={y(p.c / 100)} r="5" />
          {/each}

          {#if traffic || currency}
            <line class="guide" x1={x(t)} x2={x(t)} y1={y(c) + 9} y2={y(C0)} />
            <line class="guide" x1={x(T0)} x2={x(t) - 9} y1={y(c)} y2={y(c)} />
          {/if}
          <circle class="now" class:miss={short} cx={x(t)} cy={y(c)} r="8" />

          {#each [0, 0.1, 0.2, 0.3] as v (v)}
            <text class="tkc-axis-label" x={x(v)} y={H - m.bottom + 16} text-anchor={v === 0.3 ? 'end' : 'middle'} dx={v === 0.3 ? 8 : 0}>{pc(v)}</text>
          {/each}
          {#each [0, 0.1, 0.2, 0.3, 0.4] as v (v)}
            <text class="tkc-axis-label" x={m.left - 6} y={y(v) + 4} text-anchor="end">{pc(v)}</text>
          {/each}
          <text class="tkc-axis-title" x={x(0.09)} y={H - 6} text-anchor="middle">Traffic falls by →</text>
          <text class="tkc-axis-title" x={4} y={13}>↑ Currency falls by</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-month"></span>A month on record</span>
          <span><span class="tkc-swatch sw-test"></span>Your test: the road pays</span>
          <span><span class="tkc-swatch sw-miss"></span>The road misses its payment</span>
        </div>
      </div>

      <div class="tkc-stats" use:announce>
        <div class="tile" class:miss={short}>
          <Stat
            label="Cover in this test"
            value={fmt(t, c)}
            sub={short ? `${Math.max(1, Math.round((1 - now) * 100))}% short of the payment` : 'cash for the loan, per dollar due'}
            swatch={short ? 'var(--tkc-conditions)' : ''}
          />
        </div>
        <Stat label="Tests passed" value={String(MONTHS + passed)} sub={testsSub} />
      </div>

      {#snippet model()}
        <p>
          In a normal year the road collects 100 in tolls and spends 40 on running costs, both in local currency at the
          starting exchange rate. The year’s debt payment is 41.4 in dollars, so the cover is 60 ÷ 41.4 = 1.45. A test
          year cuts the tolls by the traffic fall, keeps the running costs, and turns what is left into dollars at the
          fallen currency: cover = (100 × (1 − traffic fall) − 40) × (1 − currency fall) ÷ 41.4. Below 1.0 the road misses
          its payment. On its own, traffic would have to fall {(ALONE.traffic * 100).toFixed(1)}%, or the currency
          {Math.round(ALONE.currency * 100)}%.
        </p>
        <p>
          The record is invented. Traffic usually grows about 5% a year and the currency slips about 2%; a recession in
          year three and a devaluation in year six bring the worst months. Reserves, hedges and interest rates are left
          out.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Every month on record tested the road, but one link at a time: in the recession the currency held, and in the
      devaluation traffic held up. In no month did both fall by more than {maxBoth}%. That is 96 confirmations of one
      kind, and none speaks to a year in which both links pull at once. One such year outweighs them all: at the
      record’s own worst pair, {WT}% and {WC}%, the cover is {fmt(WORST.traffic, WORST.currency)}.
    </p>
    <p>
      The falls do not add; they multiply. The payment hangs on a chain of two links, cars
      <span class="tkc-and">AND</span> the currency, and each link scales whatever the other leaves. Fixed running costs
      sharpen it: a {WT}% fall in traffic takes a quarter off the cash for the loan, and a {WC}% fall in the currency
      then takes a fifth of what is left. Like the rounds of the coin game, the links compound.
    </p>
    <p>
      In many countries a recession and a devaluation arrive together, often from the same crisis, so the year the
      record never showed is not the least likely. A chain like this can bend. A reserve of six months’ payments is an
      <span class="tkc-or">OR</span>: the payment comes from the tolls or the reserve, and the bad year passes. A loan
      in local currency, or a hedge, takes the currency link out.
    </p>
    <h3>One black swan</h3>
    <p>
      Europeans long took it as settled that all swans are white, until Dutch explorers found black ones in Western
      Australia in 1697. Karl Popper built his view of science on that asymmetry: no number of white swans proves that
      all swans are white; one black swan proves they are not. A reverse stress test applies it to a loan: it starts
      from the missed payment and looks for the years that would cause it.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our claims has been tested with the case that would break it, rather than counted in good months?">
      <p>
        Bank supervisors ask for reverse stress tests across a whole portfolio: from the loss that would break the bank
        back to the events that could cause it. The answer is often several shocks at once, each survivable alone, which
        is why a clean record and a tested one can look the same in a report.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .band {
    fill: var(--tkc-sunken);
    opacity: 0.6;
  }
  .band-label {
    font-size: 11px;
    fill: var(--tkc-muted);
  }
  .region {
    fill: var(--tkc-conditions-wash);
  }
  .edge {
    fill: none;
    stroke: var(--tkc-conditions);
    stroke-width: 1.5;
  }
  .miss-label {
    font-size: 12px;
    font-weight: 600;
    fill: var(--tkc-conditions-ink);
  }
  .month {
    fill: var(--tkc-muted);
    opacity: 0.5;
  }
  .box {
    fill: none;
    stroke: var(--tkc-ink-2);
    stroke-width: 1.5;
    stroke-dasharray: 5 4;
  }
  .test {
    fill: var(--tkc-ink-2);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
  }
  .test.miss {
    fill: var(--tkc-conditions);
  }
  .guide {
    stroke: var(--tkc-rule);
    stroke-width: 1;
  }
  .now {
    fill: var(--tkc-surface);
    fill-opacity: 0.6;
    stroke: var(--tkc-ink);
    stroke-width: 2;
  }
  .now.miss {
    fill: var(--tkc-conditions);
    fill-opacity: 1;
  }
  .sw-month {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--tkc-muted);
    opacity: 0.6;
  }
  .sw-test,
  .sw-miss {
    border-radius: 50%;
  }
  .sw-test {
    background: var(--tkc-ink-2);
  }
  .sw-miss {
    background: var(--tkc-conditions);
  }
  .tile {
    display: grid;
    min-width: 0;
  }
  .tile.miss :global(.tkc-stat-value) {
    color: var(--tkc-conditions-ink);
  }
</style>
