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
  const m = { top: 16, right: 100, bottom: 36, left: 58 };
  const LO = 1e-3;
  const HI = 1e4;
  const x = $derived(linear(0, ROUNDS, m.left, width - m.right));
  const y = $derived(log10(LO, HI, H - m.bottom, m.top));
  const yTicks = [1e-3, 1e-2, 1e-1, 1, 10, 100, 1000, 10000];
  const cap = (v) => Math.min(HI * 1.5, Math.max(LO / 1.5, v));
  const series = (arr) => line(Array.from({ length: shown + 1 }, (_, t) => [x(t), y(cap(arr[t]))]));

  const samplePaths = $derived(mine.paths.map((p) => series(p)));
  const avgPath = $derived(series(mine.expected));
  const meanPath = $derived(series(mine.mean));
  const basePath = $derived(series(base.median));
  const minePath = $derived(series(mine.median));
  const end = $derived(shown);

  const lostNow = $derived(mine.lost[end]);

  // Direct labels at the right edge, nudged apart if they collide.
  const labels = $derived.by(() => {
    const items = [
      { id: 'avg', text: `On paper ${multiple(mine.expected[end])}`, y: y(cap(mine.expected[end])) },
      { id: 'mean', text: `Actual ${multiple(mine.mean[end])}`, y: y(cap(mine.mean[end])) },
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
  n={8}
  kicker="Ergodicity"
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
    <Instrument title="The coin game" sub="Heads: +50%. Tails: −40%. Each grey line is one player.">
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
        <svg {width} height={H} role="img" aria-label="Wealth over 100 rounds on a log scale. On paper it rises to {multiple(mine.expected[ROUNDS])}; the players’ actual average reaches {multiple(mine.mean[ROUNDS])}; the typical player ends at {multiple(base.median[ROUNDS])}.">
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
            <path d={meanPath} class="ln mean" />
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
            <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink)"></span><strong>{multiple(mine.expected[hover])}</strong> on paper</div>
            <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink-2)"></span><strong>{multiple(mine.mean[hover])}</strong> actual average</div>
            <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span><strong>{multiple(base.median[hover])}</strong> typical, all in, alone</div>
            {#if changed}<div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)"></span><strong>{multiple(mine.median[hover])}</strong> typical, your settings</div>{/if}
          </div>
        {/if}
        <div class="tkc-legend">
          <span><span class="tkc-swatch tkc-swatch--line sw-dash" style:background="var(--tkc-ink)"></span>On paper: the expected value</span>
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink-2)"></span>Actual average of all 2,000 players</span>
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span>Typical player, all in, alone (median)</span>
          {#if changed}<span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)"></span>Typical player, your settings</span>{/if}
        </div>
      </div>

      <div class="tkc-row">
        <button type="button" class="tkc-btn tkc-btn--small" onclick={replay}>Replay 100 rounds</button>
        <button type="button" class="tkc-btn tkc-btn--small" onclick={() => (seed += 1)}>New players</button>
      </div>

      <div class="tkc-stats tkc-stats--3" use:announce>
        <Stat label="On paper" value={multiple(mine.expected[end])} sub="the expected value, {signedPct(expectedFactor(stake / 100))} a round" />
        <Stat label="Actual average of the players" value={multiple(mine.mean[end])} sub="{pct(mine.topShare[end])} of it held by the richest 1%" />
        {#if changed}
          <Stat label="Typical player, your settings" value={multiple(mine.median[end])} sub="{signedPct(growthMine)} a round" swatch="var(--tkc-options)" line={true} />
        {:else}
          <Stat label="Typical player" value={multiple(base.median[end])} sub="{pct(lostNow)} of players are poorer than at the start" swatch="var(--tkc-conditions)" line={true} />
        {/if}
      </div>

      {#snippet model()}
        <p>2,000 players flip independent fair coins. With a stake below 100%, only that share of wealth rides on each flip. Pooled players add up their results every round and split the total equally.</p>
        <p>“On paper” is the expected value, 1.05 to the power of the round at full stake: what the average would be over every possible run of luck. The actual average is the mean wealth of these 2,000 players; it follows the paper value for a while and then lags, because the outcomes that hold up the expected value are too rare to turn up even among 2,000 players. The typical player is the median. Long-run growth for a typical player alone is √(1.5 × 0.6) − 1 = −5.1% a round.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      On paper the bet gains 5% a round, and the players’ actual average rises too. But nearly all of that wealth sits
      with a handful of extraordinarily lucky players: after 100 rounds the richest 1% hold almost all of it. Most
      players lose, and the typical player is almost wiped out. One head and one tail multiply wealth by 1.5 × 0.6 = 0.9:
      a 10% loss every two rounds, and that is the rate each player actually lives through.
    </p>
    <p>
      A system is called <strong>ergodic</strong> when the average across many people equals what happens to one person
      over time. This game is not. The physicist Ole Peters uses it to show why expected value is the wrong guide when
      outcomes multiply. Nassim Taleb puts it this way: a hundred people going to a casino once is not the same as one
      person going a hundred times. If that one person goes bust on day 28, there is no day 29.
    </p>
    <p>
      Every round is a link in a chain that multiplies, like the checks in the opening. That is why a long run of
      rounds is so unforgiving: one bust, and the chain ends.
    </p>
    <h3>Two classic remedies</h3>
    <ul>
      <li><strong>Stake less.</strong> At a quarter of their wealth, the typical player grows, slowly. Giving up some average return removes the path to ruin.</li>
      <li>
        <strong>Pool.</strong> Let players share everything each round. A pair is not enough: two players who stake
        everything still shrink slightly. In a pool of five, the typical player grows about 3% a round; in a pool of
        twenty, 4.5%, almost as fast as the paper value. This is the logic of insurance, of a portfolio spread over many
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
  .mean {
    stroke: var(--tkc-ink-2);
    stroke-width: 1.75;
  }
  .sw-dash {
    background: repeating-linear-gradient(90deg, var(--tkc-ink) 0 6px, transparent 6px 9px) !important;
  }
  .cross {
    stroke: var(--tkc-muted);
    stroke-width: 1;
  }
</style>
