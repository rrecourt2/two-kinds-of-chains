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
  import { simulateCoin, typicalFactor, expectedFactor } from '../lib/sim/coin.js';
  import { linear, log10, line } from '../lib/scales.js';
  import { multiple, multipleTick, pct, signedPct } from '../lib/format.js';

  const clipId = `${getContext('tkc-id') ?? 'tkc'}-coin-clip`;

  const ROUNDS = 100;
  const SEED = 5;
  let stake = $state(100);
  let pool = $state(1);
  let width = $state(560);
  let hover = $state(null);

  const base = simulateCoin({ rounds: ROUNDS, stake: 1, pool: 1, seed: SEED });
  const mine = $derived(simulateCoin({ rounds: ROUNDS, stake: stake / 100, pool, seed: SEED }));
  const changed = $derived(stake !== 100 || pool !== 1);
  const growthMine = $derived(typicalFactor(stake / 100, pool));

  /** Wealth against the start: −99.5% or +86% for modest changes, ×15 or ×131 for large gains. */
  function change(v) {
    if (!Number.isFinite(v)) return '—';
    if (v < 1) {
      const lost = (1 - v) * 100;
      return `−${lost >= 99 ? lost.toFixed(1) : Math.round(lost)}%`;
    }
    if (v < 2) return `+${Math.round((v - 1) * 100)}%`;
    // Large multiples are rounded down, so the paper value (1.05^100 = 131.5) reads ×131, never more than it is.
    if (v >= 100) return `×${Math.floor(v).toLocaleString('en-US')}`;
    return multiple(v);
  }
  /** A growth rate per round, with a decimal only when it matters: +5%, −5.1%, +0.6%. */
  const perRound = (f) => signedPct(f, Math.abs((f - 1) * 100 - Math.round((f - 1) * 100)) < 0.05 ? 0 : 1);

  // Chart geometry: wealth on a log scale, from a thousandth to ten thousand times the start.
  const H = 300;
  const m = { top: 16, right: 104, bottom: 36, left: 58 };
  const LO = 1e-3;
  const HI = 1e4;
  const x = $derived(linear(0, ROUNDS, m.left, width - m.right));
  const y = $derived(log10(LO, HI, H - m.bottom, m.top));
  const yTicks = [1e-3, 1e-2, 1e-1, 1, 10, 100, 1000, 10000];
  const cap = (v) => Math.min(HI * 1.5, Math.max(LO / 1.5, v));
  const series = (arr) => line(Array.from({ length: ROUNDS + 1 }, (_, t) => [x(t), y(cap(arr[t]))]));

  const samplePaths = $derived(mine.paths.map((p) => series(p)));
  const avgPath = $derived(series(mine.expected));
  const basePath = $derived(series(base.median));
  const minePath = $derived(series(mine.median));

  // Direct labels at the right edge, nudged apart if they collide.
  const labels = $derived.by(() => {
    const items = [
      { id: 'avg', text: `On paper ${change(mine.expected[ROUNDS])}`, y: y(cap(mine.expected[ROUNDS])) },
      { id: 'base', text: `Typical ${change(base.median[ROUNDS])}`, y: y(cap(base.median[ROUNDS])) },
    ];
    if (changed) items.push({ id: 'mine', text: `Yours ${change(mine.median[ROUNDS])}`, y: y(cap(mine.median[ROUNDS])) });
    items.sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < 15) items[i].y = items[i - 1].y + 15;
    return items;
  });

  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    hover = Math.max(0, Math.min(ROUNDS, Math.round(x.invert(e.clientX - box.left + m.left))));
  }

  const puzzle = $derived({
    goal: 'The coin cannot change, and a risk limit caps any stake at 80% of wealth. Get the typical player growing by at least 2.5% a round.',
    met: stake <= 80 && growthMine >= 1.025,
    checks: [
      { label: 'Stake at most 80% of wealth', ok: stake <= 80 },
      { label: `Typical player grows at least 2.5% a round (now ${signedPct(growthMine)})`, ok: growthMine >= 1.025 },
    ],
    hints: ['Staking less stops the slide. But how fast can a player on their own grow?', 'Players can also share their results.'],
    found: 'Pool with others. Five players who share every result and stake 80% grow about 2.7% a round; twenty grow about 3.7%. On their own, the best a typical player can manage is about 0.6%.',
  });
</script>

<Chapter
  n={7}
  kicker="Averages"
  title="When the average lies"
  lede="A bet worth 5% a round on paper, that leaves most of the people who play it poorer. What would you change?"
  puzzle="ergodicity"
>
  {#snippet setup()}
    <p>
      So far this story has been about speed. The next chapters are about survival, which is why a bank has controls at all.
      Start with a game. Each round, flip a coin. Heads, your wealth grows by 50%. Tails, it shrinks by 40%. On paper
      the bet is worth 5% a round: that is its expected value, the average over every possible outcome. Would you play
      it every round, with everything you own?
    </p>
    <p>Below, 2,000 players each play 100 rounds.</p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="The coin game" sub="Heads: +50%. Tails: −40%. Wealth after each round, against the start. Each grey line is one player.">
      <Puzzle id="ergodicity" {...puzzle} onshow={() => ((stake = 80), (pool = 5))} />
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
        <svg {width} height={H} role="img" aria-label="Wealth over 100 rounds on a log scale, one grey line per player. On paper it ends at {change(mine.expected[ROUNDS])} of the start; the typical player who stakes everything alone ends at {change(base.median[ROUNDS])}{changed ? `; with your settings the typical player ends at ${change(mine.median[ROUNDS])}` : ''}.">
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
            <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink)"></span><strong>{change(mine.expected[hover])}</strong> on paper</div>
            <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span><strong>{change(base.median[hover])}</strong> typical, all in, alone</div>
            {#if changed}<div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)"></span><strong>{change(mine.median[hover])}</strong> typical, your settings</div>{/if}
          </div>
        {/if}
        <div class="tkc-legend">
          <span><span class="tkc-swatch tkc-swatch--line sw-dash"></span>On paper: the expected value</span>
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span>Typical player, all in, alone (the median)</span>
          {#if changed}<span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)"></span>Typical player, your settings</span>{/if}
          <span><span class="tkc-swatch tkc-swatch--line sw-player"></span>One player</span>
        </div>
      </div>

      <div class="tkc-stats tkc-stats--3" use:announce>
        <Stat label="On paper" value={change(mine.expected[ROUNDS])} sub="{perRound(expectedFactor(stake / 100))} a round: the expected value" />
        {#if changed}
          <Stat label="Typical player, your settings" value={change(mine.median[ROUNDS])} sub="{perRound(growthMine)} a round" swatch="var(--tkc-options)" line={true} />
        {:else}
          <Stat label="Typical player" value={change(base.median[ROUNDS])} sub="after 100 rounds: {perRound(typicalFactor(1, 1))} a round" swatch="var(--tkc-conditions)" line={true} />
        {/if}
        <Stat label="Poorer than at the start" value={pct(mine.lost[ROUNDS])} sub="of players{changed ? ', your settings' : ''}, after 100 rounds" />
      </div>

      {#snippet model()}
        <p>2,000 players flip independent fair coins. With a stake below 100%, only that share of wealth rides on each flip. Pooled players add up their results every round and split the total equally.</p>
        <p>“On paper” is the expected value, 1.05 to the power of the round at full stake: the average over every possible run of luck. The typical player is the median of the 2,000. Long-run growth for a typical player alone is √(1.5 × 0.6) − 1 = −5.1% a round. How much of the paper value each number of heads contributes follows from the binomial distribution.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      On paper the game is generous: 5% a round, which compounds to more than 131 times the starting wealth after a
      hundred rounds. That figure is an average over every possible run of luck, and nobody lives through every possible
      run of luck. Each player lives through one, a hundred rounds long. On that path one head and one tail multiply
      wealth by 1.5 × 0.6 = 0.9, a 10% loss every two rounds, and the typical player ends with half a percent of what
      they started with.
    </p>
    <p>
      The paper value is held up by a few extraordinary runs. About two thirds of it comes from runs of seventy heads or
      more in a hundred throws, which roughly one player in 25,000 gets. It takes fifty-six heads just to end above the
      start, and most players do not throw that many. A handful of extreme winners can hold up an average that almost
      nobody lives through, which is why the average is the wrong guide here.
    </p>
    <p>
      Nassim Taleb puts the difference this way: a hundred people going to a casino once is not the same as one person
      going a hundred times. A casino can count on its average because it plays against many people, each once; their
      luck is pooled in its accounts. Here the odds even favour the player, and most lose all the same: each lives one
      path a hundred times in a row, and every round starts from what the last one left. A player down to a tenth of
      their wealth by round 30 plays round 31 with that tenth.
    </p>
    <p>
      A system is called <strong>ergodic</strong> when the average across many people equals what happens to one person
      over time. This game is not. The physicist Ole Peters uses it to show why expected value is the wrong guide when
      outcomes multiply.
    </p>
    <p>
      Every round is a link in a chain that multiplies, like the checks in the opening. In such a chain the swings do not
      cancel out; they compound. The wider the swings, the harder they pull the typical player down, and the longer the
      chain, the further it falls.
    </p>
    <h3>Two classic remedies</h3>
    <ul>
      <li>
        <strong>Stake less.</strong> At a quarter of their wealth, the typical player grows, slowly. Smaller swings give
        up some of the paper return and remove the path to ruin.
      </li>
      <li>
        <strong>Pool.</strong> Players share everything each round. A pair is not enough: two players who stake
        everything still shrink slightly. Staking everything, a pool of five grows the typical player about 3% a round,
        and a pool of twenty 4.5%, almost as fast as the paper value. This is the logic of insurance, of a portfolio spread over many
        countries and sectors, and of banks themselves.
      </li>
    </ul>
    <p>
      Pooling is interdependence too, of the good kind. It shares risk instead of chaining it. The next chapter shows
      what happens when the links run the other way.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our processes would we design differently if we judged them by their worst month instead of their average month?">
      <p>
        A bank lives through one path, so it holds capital and liquidity buffers and caps what rides on any one client,
        country or sector: staking less and pooling, in banking terms.
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
    stroke-dasharray: 6 4;
  }
  .sw-dash {
    background: repeating-linear-gradient(90deg, var(--tkc-ink) 0 6px, transparent 6px 9px);
  }
  .sw-player {
    background: var(--tkc-ink-2);
    opacity: 0.35;
    height: 1.5px;
  }
  .cross {
    stroke: var(--tkc-muted);
    stroke-width: 1;
  }
</style>
