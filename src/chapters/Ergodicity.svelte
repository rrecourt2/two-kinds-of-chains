<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import TryThis from '../lib/ui/TryThis.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulateCoin, typicalFactor, expectedFactor } from '../lib/sim/coin.js';
  import { linear, log10, line } from '../lib/scales.js';
  import { multiple, multipleTick, pct, signedPct } from '../lib/format.js';
  import { prefersReducedMotion } from '../lib/motion.js';

  const clipId = `${getContext('tkc-id') ?? 'tkc'}-coin-clip`;

  const ROUNDS = 100;
  let stake = $state(100);
  let pool = $state(1);
  let seed = $state(5);
  let shown = $state(ROUNDS);
  let width = $state(560);
  let hover = $state(null);
  let timer;

  const base = $derived(simulateCoin({ rounds: ROUNDS, stake: 1, pool: 1, seed }));
  const mine = $derived(simulateCoin({ rounds: ROUNDS, stake: stake / 100, pool, seed }));
  const changed = $derived(stake !== 100 || pool !== 1);
  const growthMine = $derived(typicalFactor(stake / 100, pool));

  function replay() {
    clearInterval(timer);
    if (prefersReducedMotion()) {
      shown = ROUNDS;
      return;
    }
    shown = 0;
    timer = setInterval(() => {
      shown = Math.min(ROUNDS, shown + 2);
      if (shown >= ROUNDS) clearInterval(timer);
    }, 40);
  }

  // Chart geometry: wealth on a log scale, from a thousandth to ten thousand times the start.
  const H = 300;
  const m = { top: 16, right: 92, bottom: 36, left: 52 };
  const LO = 1e-3;
  const HI = 1e4;
  const x = $derived(linear(0, ROUNDS, m.left, width - m.right));
  const y = $derived(log10(LO, HI, H - m.bottom, m.top));
  const yTicks = [1e-3, 1e-2, 1e-1, 1, 10, 100, 1000, 10000];
  const cap = (v) => Math.min(HI * 1.5, Math.max(LO / 1.5, v));
  const series = (arr) => line(Array.from({ length: shown + 1 }, (_, t) => [x(t), y(cap(arr[t]))]));

  const samplePaths = $derived(mine.paths.map((p) => series(p)));
  const avgPath = $derived(series(mine.expected));
  const basePath = $derived(series(base.median));
  const minePath = $derived(series(mine.median));
  const end = $derived(shown);

  const lostNow = $derived(mine.lost[end]);

  // Direct labels at the right edge, nudged apart if they collide.
  const labels = $derived.by(() => {
    const items = [
      { id: 'avg', text: `Average ${multiple(mine.expected[end])}`, y: y(cap(mine.expected[end])) },
      { id: 'base', text: `Typical ${multiple(base.median[end])}`, y: y(cap(base.median[end])) },
    ];
    if (changed) items.push({ id: 'mine', text: `Yours ${multiple(mine.median[end])}`, y: y(cap(mine.median[end])) });
    items.sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < 15) items[i].y = items[i - 1].y + 15;
    return items;
  });

  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    hover = Math.max(0, Math.min(end, Math.round(x.invert(e.clientX - box.left + m.left))));
  }

  const tries = [
    { label: 'Stake only 25% each round', apply: () => ((stake = 25), (pool = 1)) },
    { label: 'Pool with four others', apply: () => ((stake = 100), (pool = 5)) },
    { label: 'Everything, alone', apply: () => ((stake = 100), (pool = 1)) },
  ];
</script>

<Chapter
  n={6}
  kicker="Ergodicity"
  title="When the average lies"
  lede="When outcomes multiply, the average result is not what a typical person, team or bank lives through. Survival comes first."
>
  {#snippet setup()}
    <p>
      Here is a game. Each round, flip a coin. Heads, your wealth grows by 50%. Tails, it shrinks by 40%. On average,
      each round makes you 5% richer. Would you play it every round, with everything you own?
    </p>
    <p>Below, 2,000 players each play 100 rounds.</p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="The coin game" sub="Heads: +50%. Tails: −40%. Each grey line is one player.">
      <div class="tkc-controls">
        <Slider id="e-stake" label="Share of wealth staked each round" bind:value={stake} min={10} max={100} step={5} format={(v) => `${v}%`} />
        <Segmented
          name="e-pool"
          label="Players who pool and share everything"
          bind:value={pool}
          options={[
            { value: 1, label: 'Alone' },
            { value: 2, label: '2' },
            { value: 5, label: '5' },
            { value: 20, label: '20' },
          ]}
        />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label="Wealth over 100 rounds on a log scale. The average rises to {multiple(mine.expected[ROUNDS])}; the typical player ends at {multiple(base.median[ROUNDS])}.">
          <defs>
            <clipPath id={clipId}><rect x={m.left} y={m.top - 2} width={Math.max(0, width - m.left - m.right)} height={H - m.top - m.bottom + 4} /></clipPath>
          </defs>
          {#each yTicks as t}
            <line class={t === 1 ? 'tkc-base' : 'tkc-grid'} x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={m.left - 8} y={y(t) + 4} text-anchor="end">{multipleTick(t)}</text>
          {/each}
          {#each [0, 25, 50, 75, 100] as t}
            <text class="tkc-axis-label" x={x(t)} y={H - m.bottom + 16} text-anchor="middle">{t}</text>
          {/each}
          <g clip-path="url(#{clipId})">
            {#each samplePaths as d}
              <path {d} class="player" />
            {/each}
            <path d={basePath} class="ln" style:stroke="var(--tkc-conditions)" />
            {#if changed}<path d={minePath} class="ln" style:stroke="var(--tkc-options)" />{/if}
            <path d={avgPath} class="ln avg" />
          </g>
          {#each labels as l (l.id)}
            <text class="tkc-label" x={width - m.right + 8} y={l.y + 4}>{l.text}</text>
          {/each}
          {#if hover !== null}
            <line class="cross" x1={x(hover)} x2={x(hover)} y1={m.top} y2={H - m.bottom} />
          {/if}
          <text class="tkc-axis-title" x={m.left + (width - m.left - m.right) / 2} y={H - 4} text-anchor="middle">Round</text>
          <rect x={m.left} y={m.top} width={Math.max(0, width - m.left - m.right)} height={H - m.top - m.bottom} fill="transparent" role="presentation" onpointermove={onMove} onpointerleave={() => (hover = null)} />
        </svg>
        {#if hover !== null}
          <div class="tkc-tip" style:left="{Math.min(width - 210, Math.max(0, x(hover) + 10))}px" style:top="20px">
            <div>After round {hover}</div>
            <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink)"></span><strong>{multiple(mine.expected[hover])}</strong> average</div>
            <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span><strong>{multiple(base.median[hover])}</strong> typical, all in, alone</div>
            {#if changed}<div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)"></span><strong>{multiple(mine.median[hover])}</strong> typical, your settings</div>{/if}
          </div>
        {/if}
        <div class="tkc-legend">
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink)"></span>Average across all players (expected value)</span>
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span>Typical player, all in, alone (median)</span>
          {#if changed}<span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)"></span>Typical player, your settings</span>{/if}
        </div>
      </div>

      <div class="tkc-row">
        <button type="button" class="tkc-btn tkc-btn--small" onclick={replay}>Replay 100 rounds</button>
        <button type="button" class="tkc-btn tkc-btn--small" onclick={() => (seed += 1)}>New players</button>
      </div>

      <div class="tkc-stats tkc-stats--3" aria-live="polite">
        <Stat label="Average wealth" value={multiple(mine.expected[end])} sub="{signedPct(expectedFactor(stake / 100))} a round" />
        <Stat label="Typical player, all in, alone" value={multiple(base.median[end])} sub="{signedPct(typicalFactor(1, 1))} a round" swatch="var(--tkc-conditions)" line={true} />
        {#if changed}
          <Stat label="Typical player, your settings" value={multiple(mine.median[end])} sub="{signedPct(growthMine)} a round" swatch="var(--tkc-options)" line={true} />
        {:else}
          <Stat label="Players who lost money" value={pct(lostNow)} sub="after {end} rounds" />
        {/if}
      </div>

      <TryThis items={tries} />

      {#snippet model()}
        <p>2,000 players flip independent fair coins. With a stake below 100%, only that share of wealth rides on each flip. Pooled players add up their results every round and split the total equally.</p>
        <p>The average line is the expected value, 1.05 to the power of the round (at full stake). The typical player is the median of all 2,000. Long-run growth for a typical player alone is √(1.5 × 0.6) − 1 = −5.1% a round.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      The average rises steadily while the typical player is almost wiped out. Both are correct. A handful of
      extraordinarily lucky players pull the average up, while most players lose. One head and one tail multiply your
      wealth by 1.5 × 0.6 = 0.9: a 10% loss every two rounds.
    </p>
    <p>
      A system is called <strong>ergodic</strong> when the average across many people equals what happens to one person
      over time. This game is not. The physicist Ole Peters uses it to show why expected value is the wrong guide when
      outcomes multiply. Nassim Taleb puts it this way: a hundred people going to a casino once is not the same as one
      person going a hundred times. If that one person goes bust on day 28, there is no day 29.
    </p>
    <h3>Two classic remedies</h3>
    <ul>
      <li><strong>Stake less.</strong> At a 25% stake, the typical player grows. Giving up some average return removes the path to ruin.</li>
      <li>
        <strong>Pool.</strong> Let players share everything each round. With a few partners, the typical player grows;
        with twenty, almost as fast as the average. This is the logic of insurance, of mutual funds and of banks
        themselves.
      </li>
    </ul>
    <h3>Why this matters for how we organize</h3>
    <p>
      Dependencies multiply. A chain of sign-offs, a chain of counterparties, a species that relies on one food: each
      succeeds only if every link succeeds, so one bad draw can zero the whole product. In multiplicative systems the
      average misleads, and survival comes first.
    </p>
    <p>Pooling is interdependence too, of the good kind. It shares risk instead of chaining it.</p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our processes would we design differently if we judged them by their worst month instead of their average month?">
      <p>
        A bank cannot average over parallel universes; it has to survive the one path it is on. That is why it holds
        capital and liquidity buffers. Processes need the same thinking: slack and stand-ins are buffers, and a pool of
        reviewers is risk-sharing.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .player {
    fill: none;
    stroke: var(--tkc-ink-2);
    stroke-width: 1;
    opacity: 0.18;
  }
  .ln {
    fill: none;
    stroke-width: 2.5;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .avg {
    stroke: var(--tkc-ink);
  }
  .cross {
    stroke: var(--tkc-muted);
    stroke-width: 1;
  }
</style>
