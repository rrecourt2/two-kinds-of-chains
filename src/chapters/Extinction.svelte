<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulateIslands, longRunGrowth, CAPACITY, SPECIALIST_RATE, GENERALIST_RATE } from '../lib/sim/species.js';
  import { linear, log10, line } from '../lib/scales.js';
  import { signedPct } from '../lib/format.js';
  import { getContext } from 'svelte';

  const game = getContext('tkc-game');
  const done = $derived(!game.isOpen('extinction'));

  const ISLANDS = 40;
  const YEARS = 100;
  const START = 100; // animals of each species per island in year 0
  const SEED = 21;
  let swing = $state(10); // ± percent change in a plant's food supply between good and bad years
  let width = $state(560);
  let curveW = $state(560);
  let hover = $state(null);

  const v = $derived(swing / 100);
  const sim = $derived(simulateIslands({ v, start: START, islands: ISLANDS, years: YEARS, seed: SEED }));
  const gs = $derived(longRunGrowth('specialist', v));
  const gg = $derived(longRunGrowth('generalist', v));

  // Small multiples of island populations, on a shared log scale.
  const sideBySide = $derived(width >= 560);
  const panelW = $derived(sideBySide ? (width - 16) / 2 : width);
  const PH = $derived(sideBySide ? 216 : 192);
  const pm = { top: 44, right: 10, bottom: 30, left: 44 };
  const px = $derived(linear(0, YEARS, pm.left, panelW - pm.right));
  const py = $derived(log10(1, CAPACITY, PH - pm.bottom, pm.top));
  const path = (p) => {
    const pts = [];
    for (let t = 0; t <= YEARS; t++) {
      pts.push([px(t), py(Math.max(1, p[t]))]);
      if (p[t] === 0) break;
    }
    return line(pts);
  };
  const panels = $derived([
    { id: 'specialist', title: 'Specialist · one plant', color: 'var(--tkc-ink-2)', runs: sim.specialist, alive: sim.survivors.specialist },
    { id: 'generalist', title: 'Generalist · four plants', color: 'var(--tkc-options)', runs: sim.generalist, alive: sim.survivors.generalist },
  ]);

  // Long-run growth against variability.
  const CH = 216;
  const cm = { top: 26, right: 92, bottom: 38, left: 46 };
  const cx = $derived(linear(0, 70, cm.left, curveW - cm.right));
  const cy = linear(-0.24, 0.12, CH - cm.bottom, cm.top);
  const swings = Array.from({ length: 71 }, (_, i) => i);
  // Until the puzzle is done, the curves are drawn only as far as the swing the reader has tried.
  const reach = $derived(done ? 70 : swing);
  const curve = (kind) => line(swings.filter((s) => s <= reach).map((s) => [cx(s), cy(longRunGrowth(kind, s / 100) - 1)]));
  const crossing = swings.find((s) => longRunGrowth('specialist', s / 100) < longRunGrowth('generalist', s / 100));
  // The first step of the slider at which the generalist is ahead.
  const firstAhead = Math.ceil(crossing / 5) * 5;

  // Details only for the part of the chart already drawn: before the puzzle is solved, a reading past the
  // reader's own swing would give the answer away. A selection the slider leaves behind is cleared.
  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const at = Math.max(0, Math.min(70, Math.round(cx.invert(e.clientX - box.left + cm.left))));
    hover = at <= reach ? at : null;
  }
  $effect(() => {
    if (hover !== null && hover > reach) hover = null;
  });
  const tip = $derived(hover !== null && hover <= reach ? hover : null);

  // "Generalist ahead" names the shaded band: at its right edge where it fits, on one line or two, and never
  // struck through by the line at the reader's swing (on a phone it may sit just right of that line).
  const aheadTag = $derived.by(() => {
    const xl = cx(crossing);
    const xr = curveW - cm.right;
    const xn = cx(swing);
    const widthOf = (lines) => Math.max(...lines.map((s) => s.length)) * 6.4;
    const one = ['Generalist ahead'];
    const two = ['Generalist', 'ahead'];
    const at = (lines, where) => {
      const w = widthOf(lines);
      const x0 = where === 'right' ? xr - 6 - w : where === 'left' ? xl + 6 : xn + 6;
      return { lines, w, x0, x: where === 'right' ? xr - 6 : x0, anchor: where === 'right' ? 'end' : 'start' };
    };
    const options = [at(one, 'right'), at(two, 'right'), at(one, 'left'), at(two, 'left'), at(one, 'line'), at(two, 'line')];
    const fits = (o) => o.x0 >= xl + 2 && o.x0 + o.w <= curveW - 2 && (xn < o.x0 - 5 || xn > o.x0 + o.w + 5);
    return options.find(fits) ?? options[0];
  });

  const puzzle = $derived({
    goal: 'The specialist grows faster in a calm world. Make the years more variable: at what swing does the generalist start to grow faster?',
    met: swing === firstAhead,
    checks: [{ label: `Generalist grows faster (now specialist ${signedPct(gs)}, generalist ${signedPct(gg)})`, ok: gg > gs }],
    progress: gg > gs && swing > firstAhead ? 'The generalist is ahead here. Is it already ahead in a calmer world?' : '',
    hints: ['Start from a calm world and make the years more variable, one step at a time.', 'Watch the two growth rates above the islands as you go. The lead changes hands once.'],
    found: `At about ±${crossing}%: beyond it the generalist grows faster, and the specialist, already losing islands, vanishes from more with every step.`,
  });
</script>

<Chapter
  n={10}
  kicker="Extinction"
  title="Why species go extinct"
  lede="Efficiency or variety? The answer depends on how calm the world is, and the world is getting less calm."
  puzzle="extinction"
>
  {#snippet setup()}
    <p>
      Ecologists have studied dependence for a century. When an asteroid struck 66 million years ago, many of the
      survivors were small animals that could live on many kinds of food. Most extinctions are slower.
    </p>
    <p>
      The species most at risk are usually not the weakest, but the ones that depend on something irreplaceable: one
      host, one food plant, one habitat. Their chain has a link with no alternative, and when it goes, they go with it.
      Biologists call it co-extinction.
    </p>
    <p>
      Below, two species share the same islands and the same weather: a specialist, very good at living on one food
      plant, and a generalist, less efficient but able to live on four. Some years are kind to a plant, some are not.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="Specialist or generalist?"
      sub="Each line is one island’s population over a century. Both species live through the same good and bad years."
      rules={[
        `${ISLANDS === 40 ? 'Forty' : ISLANDS} islands; each species starts at ${START} animals, with room for ${CAPACITY.toLocaleString('en-US')} on each.`,
        'The specialist eats one plant, the generalist four; each plant’s food swings each year.',
        `While there is room, the specialist grows ${Math.round((SPECIALIST_RATE - 1) * 100)}% in an average year, the generalist ${Math.round((GENERALIST_RATE - 1) * 100)}%.`,
      ]}
    >
      <Puzzle id="extinction" {...puzzle} onshow={() => (swing = firstAhead)} />
      <div class="tkc-controls">
        <Slider id="x-swing" label="Swing in food" bind:value={swing} min={0} max={70} step={5} format={(s) => `±${s}%`} ends={['Calm', 'Volatile']} />
      </div>

      <div class="tkc-chart islands">
        <div class="panels" class:side={sideBySide} bind:clientWidth={width}>
          {#each panels as panel (panel.id)}
            <svg width={panelW} height={PH} role="img" aria-label="{panel.title}. Survives on {panel.alive} of {ISLANDS} islands.">
              <text class="tkc-label" x="0" y="14">{panel.title}</text>
              <text class="tkc-axis-label" x={panelW - pm.right} y="14" text-anchor="end">{panel.alive} of {ISLANDS} survive</text>
              <!-- The ceiling every island shares: populations flatten here. -->
              <line class="ceiling" x1={pm.left} x2={panelW - pm.right} y1={py(CAPACITY)} y2={py(CAPACITY)} />
              <text class="tkc-axis-label" x={pm.left} y={py(CAPACITY) - 5}>room for {CAPACITY.toLocaleString('en-US')}</text>
              {#each [1, 10, 100, 1000] as t}
                <line class={t === 1 ? 'tkc-base' : 'tkc-grid'} x1={pm.left} x2={panelW - pm.right} y1={py(t)} y2={py(t)} />
                <text class="tkc-axis-label" x={pm.left - 6} y={py(t) + 4} text-anchor="end">{t === 1 ? 'gone' : t.toLocaleString('en-US')}</text>
              {/each}
              {#each panel.runs as run}
                <path d={path(run.path)} class="island" style:stroke={panel.color} />
              {/each}
              {#each panel.runs as run}
                {#if run.extinctAt !== null}
                  <circle cx={px(run.extinctAt)} cy={py(1)} r="3" class="gone" />
                {/if}
              {/each}
              {#each [0, 50, 100] as t}
                <text class="tkc-axis-label" x={px(t)} y={PH - pm.bottom + 16} text-anchor={t === 0 ? 'start' : t === YEARS ? 'end' : 'middle'}>{t === 0 ? 'Year 0' : t}</text>
              {/each}
            </svg>
          {/each}
        </div>
        <div class="tkc-legend">
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink-2)" aria-hidden="true"></span>Specialist</span>
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)" aria-hidden="true"></span>Generalist</span>
          <span><span class="tkc-swatch round" style:background="var(--tkc-conditions)" aria-hidden="true"></span>Died out on an island</span>
        </div>
        <p class="tkc-caption">Read the specialist as a borrower that sells one crop; the generalist sells four.</p>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat label="Specialist survives on" value="{sim.survivors.specialist} of {ISLANDS}" sub="islands · {signedPct(gs)} a year while there is room" swatch="var(--tkc-ink-2)" line={true} />
        <Stat label="Generalist survives on" value="{sim.survivors.generalist} of {ISLANDS}" sub="islands · {signedPct(gg)} a year while there is room" swatch="var(--tkc-options)" line={true} />
      </div>

      <div class="tkc-chart curve" bind:clientWidth={curveW}>
        <div class="tkc-fig-title small">Who grows faster while there is room?</div>
        <svg width={curveW} height={CH} role="img" aria-label="Growth of each species while there is room, year after year, against how variable the years are{done ? `. The generalist overtakes the specialist at about ±${crossing}% food` : `, drawn up to ±${swing}% food`}.">
          <text class="tkc-axis-title" x="0" y="11">Growth a year</text>
          {#each [-0.2, -0.1, 0, 0.1] as t}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={cm.left} x2={curveW - cm.right} y1={cy(t)} y2={cy(t)} />
            <text class="tkc-axis-label" x={cm.left - 6} y={cy(t) + 4} text-anchor="end">{t > 0 ? '+' : t < 0 ? '−' : ''}{Math.abs(Math.round(t * 100))}%</text>
          {/each}
          {#if done}
            <rect x={cx(crossing)} y={cm.top} width={Math.max(0, cx(70) - cx(crossing))} height={CH - cm.top - cm.bottom} class="zone" />
            <text class="tkc-axis-label tkc-halo" y={cm.top + 12} text-anchor={aheadTag.anchor}>{#each aheadTag.lines as l, i (l)}<tspan x={aheadTag.x} dy={i ? 13 : 0}>{l}</tspan>{/each}</text>
          {/if}
          <path d={curve('specialist')} class="cv" style:stroke="var(--tkc-ink-2)" />
          <path d={curve('generalist')} class="cv" style:stroke="var(--tkc-options)" />
          {#if done}
            <text class="tkc-label-2" x={curveW - cm.right + 6} y={cy(longRunGrowth('specialist', 0.7) - 1) + 4}>Specialist</text>
            <text class="tkc-label-2" x={curveW - cm.right + 6} y={cy(longRunGrowth('generalist', 0.7) - 1) + 4}>Generalist</text>
          {/if}
          <line class="now" x1={cx(swing)} x2={cx(swing)} y1={cm.top} y2={CH - cm.bottom} />
          <circle cx={cx(swing)} cy={cy(gs - 1)} r="5" class="pt" style:fill="var(--tkc-ink-2)" />
          <circle cx={cx(swing)} cy={cy(gg - 1)} r="5" class="pt" style:fill="var(--tkc-options)" />
          {#if tip !== null}
            <line class="cross" x1={cx(tip)} x2={cx(tip)} y1={cm.top} y2={CH - cm.bottom} />
          {/if}
          {#each [0, 20, 40, 60] as t}
            <text class="tkc-axis-label" x={cx(t)} y={CH - cm.bottom + 16} text-anchor="middle">±{t}%</text>
          {/each}
          <text class="tkc-axis-title" x={cm.left + (curveW - cm.left - cm.right) / 2} y={CH - 4} text-anchor="middle">{curveW < 380 ? 'Swing in food from year to year' : 'Swing in food between good and bad years'}</text>
          <rect x={cm.left} y={cm.top} width={Math.max(0, curveW - cm.left - cm.right)} height={CH - cm.top - cm.bottom} fill="transparent" role="presentation" onpointerdown={onMove} onpointermove={onMove} onpointerleave={() => (hover = null)} />
        </svg>
        {#if tip !== null}
          <div class="tkc-tip" style:left="{Math.min(curveW - 190, Math.max(0, cx(tip) + 10))}px" style:top="40px">
            <div>Swing of ±{tip}%</div>
            <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink-2)"></span><strong>{signedPct(longRunGrowth('specialist', tip / 100))}</strong> a year, specialist</div>
            <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)"></span><strong>{signedPct(longRunGrowth('generalist', tip / 100))}</strong> a year, generalist</div>
          </div>
        {/if}
      </div>

      {#snippet model()}
        <p>Each year, each of four plants independently has a good year (food × (1 + swing)) or a bad one (food × (1 − swing)). The specialist eats only the first plant and grows 10% in an average year; the generalist eats all four and grows 6%.</p>
        <p>Each island starts with {START} animals of each species. The two never compete: each species has its own ceiling of {CAPACITY.toLocaleString('en-US')} animals per island, and they share only the weather. Births and deaths are random (Poisson), so small populations can die out by chance.</p>
        <p>The growth rates in the figures hold while there is room: the geometric mean, the rate at which a single population compounds year after year until it nears its ceiling, leaving chance births and deaths aside.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      In a calm world the specialist wins: it grows faster and fills its islands first. As the years get more variable,
      its one plant fails it again and again, and it disappears from island after island. The generalist is not better
      at anything; it just never depends on a single plant. The crossing is a <span class="tkc-idea">tipping point</span>: past it, each extra bit of variability costs the specialist more than the last.
    </p>
    <p>
      This is not Adam Smith’s specialist: its trouble is not its skill but its single source of food. A chain of named
      people and single systems has that trouble many times over: it needs every one of its plants to have a good year
      at once.
    </p>
    <p>
      A changing climate makes many years more variable, and punishes whoever depends on one crop, one region or one
      supplier. A smallholder who grows one cash crop is the specialist: a better income in a normal year, nothing to
      fall back on in a drought. One who also keeps a second crop and a few animals earns less in a good year, and is
      still farming after a bad one.
    </p>
    <p>
      Small populations also die of bad luck. In this model, even in a calm world, ten generalists on an island die out
      about one time in three within a century; a hundred almost never do.
    </p>
    <h3>Why islands</h3>
    <p>
      A larger area holds more species in all, but fewer for its size. Globalization joins the world into one large
      area, where a few winners spread at the expense of local variety. The islands here never swap animals, so a
      collapse on one stays there: each is a firebreak, as the banks in the stress test were not. Each island is
      fragile; the archipelago lasts while any one of its forty does: a <span class="tkc-idea">quorum</span> of one.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which small teams do something nobody else in the bank can do?">
      <p>
        Small teams are small populations: a team of two can disappear through one resignation and one long illness,
        however good the average year. A portfolio has its specialists too: a fund in one sector, a desk in one
        currency, a programme built on one partner. They earn more in a normal year, and depend on one plant.
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
  .ceiling {
    stroke: var(--tkc-rule);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .gone {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 1;
  }
  .islands {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  .islands svg,
  .curve svg {
    display: block;
    overflow: visible;
  }
  .round {
    border-radius: 50%;
  }
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
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
