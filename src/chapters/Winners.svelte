<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulateMarket, manyMarkets, FIRMS, CUSTOMERS } from '../lib/sim/market.js';
  import { linear, line } from '../lib/scales.js';
  import { pct, int } from '../lib/format.js';

  const RETURNS = { none: 0, some: 1, lots: 1.5 };
  let size = $state('lots');
  let better = $state('same');
  let seed = $state(7);
  let width = $state(560);

  const boost = $derived(better === 'better' ? 0.2 : 0);
  const m = $derived(simulateMarket({ returns: RETURNS[size], better: boost, seed }));
  const many = $derived(manyMarkets({ returns: RETURNS[size], better: boost }));
  const name = (i) => `Firm ${String.fromCharCode(65 + i)}`;
  const big = $derived(m.final.filter((s) => s >= 0.05).length);

  // Market shares over time.
  const H = 250;
  const cm = { top: 14, right: 86, bottom: 34, left: 40 };
  const samples = $derived(m.shares[0].length);
  const x = $derived(linear(0, samples - 1, cm.left, width - cm.right));
  const y = linear(0, 1, H - cm.bottom, cm.top);
  const path = (series) => line(series.map((v, i) => [x(i), y(v)]));
  const order = $derived([...Array(FIRMS).keys()].sort((a, b) => (a === m.leader) - (b === m.leader) || (a === 0) - (b === 0)));
  const endLabels = $derived.by(() => {
    const items = [{ i: m.leader, y: y(m.final[m.leader]) }];
    if (boost && m.leader !== 0) items.push({ i: 0, y: y(m.final[0]) });
    items.sort((a, b) => a.y - b.y);
    if (items.length === 2 && items[1].y - items[0].y < 15) items[1].y = items[0].y + 15;
    return items;
  });

  const puzzle = {
    goal: 'Firm A’s product is 20% better than every other firm’s. In which market does it most often end up the largest?',
    choices: [
      { value: 'none', label: 'Where size does not attract customers at all' },
      { value: 'some', label: 'Where size helps somewhat' },
      { value: 'lots', label: 'Where size helps a lot, so its lead grows fastest' },
    ],
    answer: 'none',
    wrong: (v) => (v === 'lots' ? 'Size helps whoever is ahead, and early on that is mostly luck. Try it in the figure.' : 'Close, but not the most often. Compare all three in the figure.'),
    hints: ['Set firm A’s product to 20% better, then compare the three markets.', 'The figure counts how often, in 100 histories, the better product came first.'],
    found: 'Where size does not matter. There the better product comes first in about half of all histories; where size helps a lot, in only one in ten.',
  };
</script>

<Chapter
  n={12}
  kicker="Winner-take-all"
  title="Why the winner takes most"
  lede="In more and more markets, the biggest firm keeps getting bigger. Does the best product still win?"
  puzzle="winners"
>
  {#snippet setup()}
    <p>
      In many markets the biggest firm keeps getting bigger. A payment network, a marketplace or a
      messaging app is worth more the more people use it.
    </p>
    <p>
      Below, twenty identical firms compete for {int(CUSTOMERS)} customers. Each new customer picks a firm, and if size
      helps, a big firm is more likely to be picked. Choose how much size helps.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Twenty equal firms, one market" sub="Each line is one firm’s share of all customers so far.">
      <Puzzle id="winners" {...puzzle} onshow={() => ((size = 'none'), (better = 'better'))} />
      <div class="tkc-controls">
        <Segmented
          name="w-size"
          label="How much size attracts customers"
          bind:value={size}
          options={[
            { value: 'none', label: 'Not at all' },
            { value: 'some', label: 'Somewhat' },
            { value: 'lots', label: 'A lot' },
          ]}
        />
        <Segmented
          name="w-better"
          label="Firm A’s product"
          bind:value={better}
          options={[
            { value: 'same', label: 'Same as the rest' },
            { value: 'better', label: '20% better' },
          ]}
        />
      </div>

      <div class="tkc-row">
        <button type="button" class="tkc-btn tkc-btn--small" onclick={() => (seed += 1)}>Run history again</button>
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label="Market shares over time. {name(m.leader)} ends with {pct(m.leaderShare)}.">
          {#each [0, 0.25, 0.5, 0.75, 1] as t}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={cm.left} x2={width - cm.right} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={cm.left - 6} y={y(t) + 4} text-anchor="end">{t * 100}%</text>
          {/each}
          {#each order as i (i)}
            <path d={path(m.shares[i])} class="firm" class:lead={i === m.leader} class:better={boost && i === 0} />
          {/each}
          {#each endLabels as l (l.i)}
            <text class="tkc-label tkc-halo" x={width - cm.right + 6} y={l.y + 4} class:better-label={boost && l.i === 0}>{name(l.i)} {pct(m.final[l.i])}</text>
          {/each}
          <text class="tkc-axis-label" x={cm.left} y={H - cm.bottom + 16}>First customer</text>
          <text class="tkc-axis-label" x={width - cm.right} y={H - cm.bottom + 16} text-anchor="end">{int(CUSTOMERS)}th</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span>The largest firm</span>
          {#if boost}<span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)"></span>Firm A, the better product</span>{/if}
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-rule)"></span>The other firms</span>
        </div>
      </div>

      <div class="tkc-stats tkc-stats--3" use:announce>
        <Stat label="Largest firm’s share" value={pct(m.leaderShare)} sub={m.leader === 0 && boost ? 'firm A, the better product' : `${name(m.leader)}, which started like the rest`} swatch="var(--tkc-conditions)" line={true} />
        <Stat label="Firms with at least 5%" value="{big} of {FIRMS}" sub="at the end of this history" />
        {#if boost}
          <Stat label="The better product came first" value="{many.betterWins} of {many.runs}" sub="histories; a random firm would lead 5" swatch="var(--tkc-options)" line={true} />
        {:else}
          <Stat label="Typical largest share" value={pct(many.medianLeader)} sub="across {many.runs} histories" />
        {/if}
      </div>

      {#snippet model()}
        <p>Each firm starts with one customer. Every new customer picks a firm with a chance proportional to its number of customers raised to a power: 0 when size does not matter, 1 when every customer adds the same pull, 1.5 when big firms pull harder than their size alone. A better product multiplies a firm’s pull by 1.2.</p>
        <p>This is the urn model behind W. Brian Arthur’s work on increasing returns. The hundred histories behind the third figure use 1,500 customers each.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      When size does not help, the market stays shared. When it helps a lot, one firm ends up with most of the market,
      and which firm wins is settled by luck among the first few hundred customers. Run history again: a different
      firm wins almost every time. Economists call this lock-in. The concentration emerges; nobody designs it.
    </p>
    <p>
      Size rewards whoever is ahead early, and early on, being ahead is mostly luck. So the more size matters, the less
      often the better product wins.
    </p>
    <p>
      We increasingly live in this world. Sales in most US industries have become more concentrated in fewer, larger
      “superstar” firms since the 1980s (Autor and colleagues, 2020). Search, cloud computing, payments and market data
      are each served by a handful of providers. Mobile money shows both sides: in Kenya, M-Pesa reached most adults
      within a few years of its launch in 2007, because every new user made it more useful to the rest, and the same
      pull made it hard for any rival to catch up.
    </p>
    <h3>What it means</h3>
    <ul>
      <li><strong>Early matters more than perfect.</strong> Where a market tips, the first good-enough offer can lock it in before a better one arrives.</li>
      <li><strong>Winners become hubs.</strong> Everyone who depends on the winner shares its single points of failure, as in 2008 and in the software outage of 2024 (chapter 9).</li>
    </ul>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Where do we compete in a market that tips to one winner, and where do we depend on a winner we do not control?">
      <p>
        Inside the bank, the platform most people use attracts the most investment, data and skills, whether or not it
        is the best. Choose it deliberately, and early.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .firm {
    fill: none;
    stroke: var(--tkc-rule);
    stroke-width: 1.2;
  }
  .firm.lead {
    stroke: var(--tkc-conditions);
    stroke-width: 2.5;
  }
  .firm.better {
    stroke: var(--tkc-options);
    stroke-width: 2.5;
  }
  .better-label {
    fill: var(--tkc-options-ink);
  }
</style>
