<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import TryThis from '../lib/ui/TryThis.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulateHistory, worst, DAYS_PER_YEAR, turkeyConfidence } from '../lib/sim/tails.js';
  import { linear, line } from '../lib/scales.js';

  const YEARS = 40;
  let known = $state(10);
  let seed = $state(3);
  let width = $state(560);
  let turkeyW = $state(360);

  const history = $derived(simulateHistory({ years: YEARS, seed }));
  const worlds = $derived([
    { id: 'thin', title: 'Thin tails: the textbook world', data: history.thin, color: 'var(--tkc-ink-2)' },
    { id: 'fat', title: 'Fat tails: closer to real markets', data: history.fat, color: 'var(--tkc-conditions)' },
  ]);
  const stats = $derived(
    worlds.map((w) => {
      const before = worst(w.data, 0, known);
      const after = worst(w.data, known, YEARS);
      return { ...w, before, after, ratio: after / before };
    }),
  );

  // Small multiples on one shared scale.
  const sideBySide = $derived(width >= 560);
  const panelW = $derived(sideBySide ? (width - 16) / 2 : width);
  const PH = 200;
  const pm = { top: 28, right: 8, bottom: 28, left: 36 };
  const yMax = $derived(Math.max(4, Math.ceil(Math.max(...stats.map((s) => Math.max(s.before, s.after))))));
  const px = $derived(linear(0, YEARS, pm.left, panelW - pm.right));
  const py = $derived(linear(0, yMax, PH - pm.bottom, pm.top));
  const yTicks = $derived(yMax > 12 ? [0, 5, 10, 15, 20].filter((t) => t <= yMax) : yMax > 6 ? [0, 2, 4, 6, 8, 10].filter((t) => t <= yMax) : [0, 1, 2, 3, 4]);

  // Big days only (above 1.5%) as dots, plus the running record.
  const marks = (data) => {
    const dots = [];
    const rec = [];
    let w = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > 1.5) dots.push([i / DAYS_PER_YEAR, data[i]]);
      if (data[i] > w) {
        w = data[i];
        rec.push([i / DAYS_PER_YEAR, w]);
      }
    }
    rec.push([YEARS, w]);
    return { dots, rec };
  };
  const drawn = $derived(worlds.map((w) => ({ ...w, ...marks(w.data) })));
  const stepPath = (rec) => {
    let d = '';
    let prev = null;
    for (const [t, v] of rec) {
      if (!prev) d += `M${px(0).toFixed(1)} ${py(v).toFixed(1)}`;
      else d += `H${px(t).toFixed(1)}V${py(v).toFixed(1)}`;
      prev = v;
    }
    return d;
  };

  // The turkey.
  const TH = 120;
  const tm = { top: 12, right: 10, bottom: 24, left: 38 };
  const tx = $derived(linear(0, 1001, tm.left, turkeyW - tm.right));
  const ty = linear(0, 1, TH - tm.bottom, tm.top);
  const turkeyPath = $derived(line([...Array.from({ length: 101 }, (_, i) => [tx(i * 10), ty(turkeyConfidence(i * 10))]), [tx(1001), ty(0)]]));

  const fmt = (v) => `${v.toFixed(1)}%`;
  const tries = [
    { label: 'Only 3 years of data', apply: () => (known = 3) },
    { label: '20 years of data', apply: () => (known = 20) },
    { label: 'Another 40 years', apply: () => (seed += 1) },
  ];
</script>

<Chapter
  n={10}
  kicker="Black swans"
  title="What the data cannot show"
  lede="The risks that matter most are the ones least visible in your data, and the costs of caution are the ones nobody records."
>
  {#snippet setup()}
    <p>
      For centuries Europeans took it as settled that all swans are white, because every swan anyone had seen was
      white. In 1697 Dutch explorers in Western Australia found black swans. Thousands of white swans could not prove
      the rule; one black swan disproved it. The philosopher Karl Popper made this asymmetry the basis of science:
      evidence can falsify a theory, but never prove it.
    </p>
    <p>
      Nassim Taleb borrowed the image for rare events with huge consequences that look predictable only in hindsight.
      His favourite illustration is a turkey. Fed every day for a thousand days, it grows more confident with every meal
      that people are kind. Its confidence is highest on the day before Thanksgiving.
    </p>
    <figure class="turkey" bind:clientWidth={turkeyW}>
      <svg width={turkeyW} height={TH} role="img" aria-label="The turkey's confidence rises towards 100% over 1,000 days, then collapses on day 1,001.">
        {#each [0, 0.5, 1] as t}
          <line class="tkc-grid" x1={tm.left} x2={turkeyW - tm.right} y1={ty(t)} y2={ty(t)} />
          <text class="tkc-axis-label" x={tm.left - 6} y={ty(t) + 4} text-anchor="end">{t * 100}%</text>
        {/each}
        <path d={turkeyPath} class="turkey-line" />
        <circle cx={tx(1000)} cy={ty(turkeyConfidence(1000))} r="4" class="peak" />
        <text class="tkc-axis-label" x={tx(0)} y={TH - 6}>Day 1</text>
        <text class="tkc-axis-label" x={tx(1001)} y={TH - 6} text-anchor="end">Day 1,001</text>
      </svg>
      <figcaption class="tkc-caption">The turkey’s confidence that tomorrow will be fine, updated after every good day.</figcaption>
    </figure>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Two worlds with the same volatility" sub="Forty years of daily losses. Both worlds have a standard deviation of 1% a day. Dots are days with losses above 1.5%.">
      <div class="tkc-controls tkc-controls--wide">
        <Slider id="k-years" label="Years of data you have" bind:value={known} min={2} max={20} format={(v) => `${v} years`} />
      </div>

      <div class="panels" class:side={sideBySide} bind:clientWidth={width}>
        {#each drawn as w (w.id)}
          <svg width={panelW} height={PH} role="img" aria-label="{w.title}: worst day in your data {fmt(stats.find((s) => s.id === w.id).before)}, afterwards {fmt(stats.find((s) => s.id === w.id).after)}.">
            <text class="tkc-label" x="0" y="14">{w.title}</text>
            <rect x={px(0)} y={pm.top} width={px(known) - px(0)} height={PH - pm.top - pm.bottom} class="known" />
            {#each yTicks as t}
              <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={pm.left} x2={panelW - pm.right} y1={py(t)} y2={py(t)} />
              <text class="tkc-axis-label" x={pm.left - 6} y={py(t) + 4} text-anchor="end">{t}%</text>
            {/each}
            {#each w.dots as [t, v]}
              <circle cx={px(t)} cy={py(Math.min(v, yMax))} r="1.6" class="day" style:fill={w.color} />
            {/each}
            <path d={stepPath(w.rec)} class="record" />
            {#each [0, 10, 20, 30, 40] as t}
              <text class="tkc-axis-label" x={px(t)} y={PH - pm.bottom + 16} text-anchor="middle">{t === 0 ? 'Year 0' : t}</text>
            {/each}
            <text class="tkc-axis-label" x={px(known / 2)} y={pm.top + 12} text-anchor="middle">{known > 4 ? 'your data' : ''}</text>
          </svg>
        {/each}
      </div>
      <div class="tkc-legend">
        <span><span class="tkc-swatch sw-known"></span>The years in your data</span>
        <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink)"></span>Worst day so far (the record)</span>
      </div>

      <div class="tkc-stats" use:announce>
        {#each stats as s (s.id)}
          <Stat
            label={s.id === 'thin' ? 'Thin tails: worst day after your data' : 'Fat tails: worst day after your data'}
            value={s.ratio > 1 ? `${s.ratio.toFixed(s.ratio < 1.1 ? 2 : 1)}× worse` : 'Not beaten'}
            sub="{fmt(s.after)} against {fmt(s.before)} in your {known} years"
            swatch={s.color}
          />
        {/each}
      </div>

      <TryThis items={tries} />

      {#snippet model()}
        <p>Each world has 10,000 trading days with a standard deviation of 1% a day. The thin-tailed world draws them from a normal distribution, the textbook assumption. The fat-tailed world draws them from a Student’s t distribution with three degrees of freedom, a common simple model of daily market moves, scaled to the same standard deviation. Its ordinary days are calmer than the thin-tailed world’s, and its worst days far worse.</p>
        <p>“Worst day after your data” compares the largest loss in the remaining years with the largest loss in the years you had.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      In both worlds the worst day in your data will probably be beaten. The difference is by how much. With thin
      tails the new record is barely worse, so ten years of data tell you almost everything. With fat tails, in more
      than one history in four it is at least twice as bad. Twenty years of data cut that risk to about one history in
      ten, but do not remove it.
    </p>
    <p>
      In August 2007 the finance chief of Goldman Sachs said the firm was seeing “25-standard deviation moves, several
      days in a row”. In a thin-tailed world, one such day should not happen even once since the Big Bang. The world was
      not thin-tailed. The models were.
    </p>
    <h3>The data problem is not only about markets</h3>
    <ul>
      <li><strong>Data records what happened.</strong> The rare event is mostly absent from it by definition. “No incident in five years” is a count of white swans.</li>
      <li>
        <strong>Some costs never reach the data.</strong> Nobody logs the client who gave up, the project that was never
        started, or the week a request spent waiting for a sign-off. An incident, by contrast, gets an investigation, a
        report and a new control. So every control has a visible reason to exist, while its cost stays out of sight.
      </li>
      <li>
        <strong>The past may not be a guide.</strong> Loss histories come from yesterday’s climate, yesterday’s systems
        and yesterday’s clients. When the world itself changes, even a long, clean record says little about what comes
        next.
      </li>
    </ul>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our risks have we never seen in our data, and which of our costs have we never measured?">
      <p>
        When a new control is proposed after an incident, weigh what it costs on the thousand ordinary days, not only what
        it would have prevented on the one bad day. Treat a clean track record as a hypothesis to test, not as proof.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .turkey {
    margin: 0;
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .turkey-line {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .peak {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 2;
  }
  .panels {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 10px;
  }
  .panels.side {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
  }
  .known {
    fill: var(--tkc-sunken);
  }
  .sw-known {
    background: var(--tkc-sunken);
    box-shadow: inset 0 0 0 1px var(--tkc-rule);
  }
  .day {
    opacity: 0.55;
  }
  .record {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 2;
  }
</style>
