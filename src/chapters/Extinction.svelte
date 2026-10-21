<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulateIslands, longRunGrowth, CAPACITY } from '../lib/sim/species.js';
  import { linear, log10, line } from '../lib/scales.js';
  import { signedPct } from '../lib/format.js';
  import { getContext } from 'svelte';

  const game = getContext('tkc-game');
  const done = $derived(!game.isOpen('extinction'));

  const ISLANDS = 40;
  const YEARS = 100;
  let swing = $state(10); // ± percent change in a plant's food supply between good and bad years
  let start = $state(100);
  let seed = $state(21);
  let width = $state(560);
  let curveW = $state(560);
  let hover = $state(null);

  const v = $derived(swing / 100);
  const sim = $derived(simulateIslands({ v, start, islands: ISLANDS, years: YEARS, seed }));
  const gs = $derived(longRunGrowth('specialist', v));
  const gg = $derived(longRunGrowth('generalist', v));

  // Small multiples of island populations, on a shared log scale.
  const sideBySide = $derived(width >= 560);
  const panelW = $derived(sideBySide ? (width - 16) / 2 : width);
  const PH = 190;
  const pm = { top: 30, right: 10, bottom: 30, left: 44 };
  const px = $derived(linear(0, YEARS, pm.left, panelW - pm.right));
  const py = log10(1, CAPACITY, PH - pm.bottom, pm.top);
  const path = (p) => {
    const pts = [];
    for (let t = 0; t <= YEARS; t++) {
      pts.push([px(t), py(Math.max(1, p[t]))]);
      if (p[t] === 0) break;
    }
    return line(pts);
  };
  const panels = $derived([
    { id: 'specialist', title: 'Specialist · one plant', color: 'var(--tkc-conditions)', runs: sim.specialist, alive: sim.survivors.specialist },
    { id: 'generalist', title: 'Generalist · four plants', color: 'var(--tkc-options)', runs: sim.generalist, alive: sim.survivors.generalist },
  ]);

  // Long-run growth against variability.
  const CH = 210;
  const cm = { top: 18, right: 92, bottom: 38, left: 46 };
  const cx = $derived(linear(0, 70, cm.left, curveW - cm.right));
  const cy = linear(-0.24, 0.12, CH - cm.bottom, cm.top);
  const swings = Array.from({ length: 71 }, (_, i) => i);
  // Until the puzzle is done, the curves are drawn only as far as the swing the reader has tried.
  const reach = $derived(done ? 70 : swing);
  const curve = (kind) => line(swings.filter((s) => s <= reach).map((s) => [cx(s), cy(longRunGrowth(kind, s / 100) - 1)]));
  const crossing = swings.find((s) => longRunGrowth('specialist', s / 100) < longRunGrowth('generalist', s / 100));
  // The first step of the slider at which the generalist is ahead.
  const firstAhead = Math.ceil(crossing / 5) * 5;

  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    hover = Math.max(0, Math.min(70, Math.round(cx.invert(e.clientX - box.left + cm.left))));
  }

  const puzzle = $derived({
    goal: 'The specialist grows faster in a calm world. Make the years more variable: at what swing does the generalist start to grow faster?',
    met: swing === firstAhead,
    progress: gg > gs && swing > firstAhead ? 'The generalist is ahead here. Is it already ahead in a calmer world?' : '',
    hints: ['Start from a calm world and make the years more variable, one step at a time.', 'Watch the two growth rates above the islands. The answer lies between ±25% and ±40%.'],
    found: `At about ±${crossing}%: at ±30% the specialist is still just ahead, at ±35% the generalist leads. Beyond that the specialist’s growth collapses, and at ±50% it is gone from most islands within a century.`,
  });
</script>

<Chapter
  n={11}
  kicker="Extinction"
  title="Why species go extinct"
  lede="Efficiency or variety? The answer depends on how calm the world is, and the world is getting less calm."
  puzzle="extinction"
>
  {#snippet setup()}
    <p>
      Ecologists have studied dependence for a century, and their findings will sound familiar. Some extinctions come
      out of a clear sky: when an asteroid struck 66 million years ago, many of the survivors were small animals that
      could live on many kinds of food. Most extinctions are slower.
    </p>
    <p>
      The species most at risk are usually not the weakest. They are the ones that depend on something irreplaceable:
      one host, one food plant, one habitat. When that one thing goes, they go with it. Biologists call it
      co-extinction, and estimate that thousands of species are endangered simply because something they depend on is.
    </p>
    <p>
      Below, two species live on 40 islands. The specialist eats one plant and is very efficient at it. The generalist
      eats four plants and is less efficient at each. Every year, each plant has a good year or a bad one.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Specialist or generalist?" sub="40 islands, 100 years, the same weather for both species.">
      <Puzzle id="extinction" {...puzzle} onshow={() => (swing = firstAhead)} />
      <div class="tkc-controls">
        <Slider id="x-swing" label="How variable are the years?" bind:value={swing} min={0} max={70} step={5} format={(s) => `±${s}% food`} ends={['Calm', 'Volatile']} />
        <Segmented
          name="x-start"
          label="Animals per island at the start"
          bind:value={start}
          options={[
            { value: 10, label: '10' },
            { value: 100, label: '100' },
            { value: 1000, label: '1,000' },
          ]}
        />
      </div>

      <div class="tkc-stats" use:announce>
        <Stat label="Specialist survives on" value="{sim.survivors.specialist} of {ISLANDS}" sub="islands · {signedPct(gs)} a year in the long run" swatch="var(--tkc-conditions)" line={true} />
        <Stat label="Generalist survives on" value="{sim.survivors.generalist} of {ISLANDS}" sub="islands · {signedPct(gg)} a year in the long run" swatch="var(--tkc-options)" line={true} />
      </div>

      <div class="panels" class:side={sideBySide} bind:clientWidth={width}>
        {#each panels as panel (panel.id)}
          <svg width={panelW} height={PH} role="img" aria-label="{panel.title}. Survives on {panel.alive} of {ISLANDS} islands.">
            <text class="tkc-label" x="0" y="14">{panel.title}</text>
            <text class="tkc-axis-label" x={panelW - pm.right} y="14" text-anchor="end">{panel.alive} of {ISLANDS} survive</text>
            {#each [1, 10, 100, 1000] as t}
              <line class={t === 1 ? 'tkc-base' : 'tkc-grid'} x1={pm.left} x2={panelW - pm.right} y1={py(t)} y2={py(t)} />
              <text class="tkc-axis-label" x={pm.left - 6} y={py(t) + 4} text-anchor="end">{t === 1 ? 'gone' : t.toLocaleString('en-US')}</text>
            {/each}
            {#each panel.runs as run}
              <path d={path(run.path)} class="island" style:stroke={panel.color} />
              {#if run.extinctAt !== null}
                <circle cx={px(run.extinctAt)} cy={py(1)} r="2.5" class="gone" />
              {/if}
            {/each}
            {#each [0, 50, 100] as t}
              <text class="tkc-axis-label" x={px(t)} y={PH - pm.bottom + 16} text-anchor="middle">{t === 0 ? 'Year 0' : t}</text>
            {/each}
          </svg>
        {/each}
      </div>

      <div class="tkc-row">
        <button type="button" class="tkc-btn tkc-btn--small" onclick={() => (seed += 1)}>Run another century</button>
      </div>

      <div class="tkc-chart curve" bind:clientWidth={curveW}>
        <div class="tkc-fig-title small">Who grows faster in the long run?</div>
        <svg width={curveW} height={CH} role="img" aria-label="Long-run growth of each species against how variable the years are{done ? `. The generalist overtakes the specialist at about ±${crossing}% food` : `, drawn up to ±${swing}% food`}.">
          {#each [-0.2, -0.1, 0, 0.1] as t}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={cm.left} x2={curveW - cm.right} y1={cy(t)} y2={cy(t)} />
            <text class="tkc-axis-label" x={cm.left - 6} y={cy(t) + 4} text-anchor="end">{t > 0 ? '+' : t < 0 ? '−' : ''}{Math.abs(Math.round(t * 100))}%</text>
          {/each}
          {#if done}
            <rect x={cx(crossing)} y={cm.top} width={Math.max(0, cx(70) - cx(crossing))} height={CH - cm.top - cm.bottom} class="zone" />
            <text class="tkc-axis-label" x={cx(crossing) + 6} y={cm.top + 12}>Generalist ahead</text>
          {/if}
          <path d={curve('specialist')} class="cv" style:stroke="var(--tkc-conditions)" />
          <path d={curve('generalist')} class="cv" style:stroke="var(--tkc-options)" />
          {#if done}
            <text class="tkc-label-2" x={curveW - cm.right + 6} y={cy(longRunGrowth('specialist', 0.7) - 1) + 4}>Specialist</text>
            <text class="tkc-label-2" x={curveW - cm.right + 6} y={cy(longRunGrowth('generalist', 0.7) - 1) + 4}>Generalist</text>
          {/if}
          <line class="now" x1={cx(swing)} x2={cx(swing)} y1={cm.top} y2={CH - cm.bottom} />
          <circle cx={cx(swing)} cy={cy(gs - 1)} r="5" class="pt" style:fill="var(--tkc-conditions)" />
          <circle cx={cx(swing)} cy={cy(gg - 1)} r="5" class="pt" style:fill="var(--tkc-options)" />
          {#if hover !== null}
            <line class="cross" x1={cx(hover)} x2={cx(hover)} y1={cm.top} y2={CH - cm.bottom} />
          {/if}
          {#each [0, 20, 40, 60] as t}
            <text class="tkc-axis-label" x={cx(t)} y={CH - cm.bottom + 16} text-anchor="middle">±{t}%</text>
          {/each}
          <text class="tkc-axis-title" x={cm.left + (curveW - cm.left - cm.right) / 2} y={CH - 4} text-anchor="middle">{curveW < 380 ? 'Swing in food from year to year' : 'Swing in food between good and bad years'}</text>
          <rect x={cm.left} y={cm.top} width={Math.max(0, curveW - cm.left - cm.right)} height={CH - cm.top - cm.bottom} fill="transparent" role="presentation" onpointermove={onMove} onpointerleave={() => (hover = null)} />
        </svg>
        {#if hover !== null}
          <div class="tkc-tip" style:left="{Math.min(curveW - 190, Math.max(0, cx(hover) + 10))}px" style:top="40px">
            <div>Swing of ±{hover}%</div>
            <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span><strong>{signedPct(longRunGrowth('specialist', hover / 100))}</strong> a year, specialist</div>
            <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)"></span><strong>{signedPct(longRunGrowth('generalist', hover / 100))}</strong> a year, generalist</div>
          </div>
        {/if}
        <div class="tkc-legend">
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span>Specialist: +10% a year in an average year</span>
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)"></span>Generalist: +6% a year in an average year</span>
        </div>
      </div>

      {#snippet model()}
        <p>Each year, each of four plants independently has a good year (food × (1 + swing)) or a bad one (food × (1 − swing)). The specialist eats only the first plant and grows 10% in an average year; the generalist eats all four and grows 6%.</p>
        <p>Births and deaths are random (Poisson), so small populations can die out by chance. Each island holds at most {CAPACITY.toLocaleString('en-US')} animals. Long-run growth is the geometric mean, the growth rate that a single population actually experiences over time.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      In a calm world the specialist wins: it grows faster and fills its islands first. As the years get more
      variable, its one plant fails it again and again, and it disappears from island after island. The generalist is
      not better at anything. It just never depends on a single plant. The change is not gradual, either: past the
      crossing point, each extra bit of variability costs the specialist more than the last. A chain of named people and
      single systems is a specialist many times over: it needs every one of its plants to have a good year at once.
    </p>
    <p>
      A changing climate makes many years more variable. That is why it worries ecologists, farmers and lenders alike:
      it punishes whoever depends on one crop, one region or one supplier. A smallholder who grows one cash crop is the
      specialist, with a better income in a normal year and nothing to fall back on in a drought. One who also keeps a
      second crop and a few animals earns less in a good year, and is still farming after a bad one.
    </p>
    <p><strong>Small populations die of bad luck</strong>, even when the average year is good. Start with 10 animals per island and watch.</p>
    <p>
      Scale protects, but only when it is diverse. The Gros Michel banana was grown by the billion, but every plant was
      a clone. When Panama disease spread through the plantations, the export trade had to switch to another variety
      altogether. A billion identical plants are one dependency, copied a billion times.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which small teams do something nobody else in the bank can do?">
      <p>
        Small teams are small populations: a team of two can disappear through one resignation and one long illness,
        however good the average year.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
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
  .island {
    fill: none;
    stroke-width: 1.25;
    opacity: 0.45;
    stroke-linejoin: round;
  }
  .gone {
    fill: var(--tkc-ink-2);
  }
  .curve {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 8px;
    border-top: 1px solid var(--tkc-hair);
    padding-top: 14px;
  }
  .small {
    font-size: 0.9375rem;
  }
  .zone {
    fill: var(--tkc-options-wash);
  }
  .cv {
    fill: none;
    stroke-width: 2.5;
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
