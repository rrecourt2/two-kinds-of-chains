<script>
  import { onDestroy } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import TryThis from '../lib/ui/TryThis.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { buildNetwork, layout, cascade, pickSeeds, mostConnected, sweep } from '../lib/sim/network.js';
  import { makeRng } from '../lib/sim/rng.js';
  import { linear } from '../lib/scales.js';
  import { prefersReducedMotion } from '../lib/motion.js';

  const N = 48;
  let links = $state(3);
  let capital = $state(4);
  let shape = $state('random');
  let draw = $state(0);
  let width = $state(560);
  let stripW = $state(560);

  const seed = $derived(1000 + links * 37 + (shape === 'hubs' ? 500 : 0) + draw * 7919);
  const adj = $derived(buildNetwork(shape, N, links, seed));
  const pos = $derived(layout(adj, seed));
  const meanLinks = $derived(adj.reduce((s, a) => s + a.length, 0) / N);
  const hub = $derived(mostConnected(adj));

  // The running cascade: all waves are computed at once and revealed one by one.
  let waves = $state([]);
  let revealed = $state(0);
  let timer;
  const shockRng = makeRng(77);

  const failedNow = $derived.by(() => {
    const f = new Uint8Array(N);
    waves.slice(0, revealed).forEach((w) => w.forEach((i) => (f[i] = 1)));
    return f;
  });
  const latest = $derived(new Set(revealed > 0 ? waves[revealed - 1] : []));
  const count = $derived(failedNow.reduce((a, b) => a + b, 0));
  const done = $derived(waves.length > 0 && revealed >= waves.length);

  function clear() {
    clearInterval(timer);
    waves = [];
    revealed = 0;
  }
  // A different network or capital level starts from a healthy system.
  $effect(() => {
    adj;
    capital;
    clear();
  });
  onDestroy(() => clearInterval(timer));

  function start(seeds) {
    clear();
    waves = cascade(adj, capital, seeds).waves;
    if (prefersReducedMotion()) {
      revealed = waves.length;
      return;
    }
    revealed = 1;
    timer = setInterval(() => {
      if (revealed >= waves.length) clearInterval(timer);
      else revealed += 1;
    }, 420);
  }

  // Network drawing.
  const netH = $derived(Math.round(Math.min(440, Math.max(300, width * 0.68))));
  const px = (p) => p.x * width;
  const py = (p) => p.y * netH;
  const radius = (i) => 3.5 + 1.6 * Math.sqrt(adj[i].length);

  // Strip charts: share of banks failing after a shock, by counterparties, for networks of similar banks.
  const one = $derived(sweep({ n: N, capitalPct: capital, shock: 1, trials: 40 }));
  const five = $derived(sweep({ n: N, capitalPct: capital, shock: 5, trials: 40 }));
  const sideBySide = $derived(stripW >= 560);
  const panelW = $derived(sideBySide ? (stripW - 16) / 2 : stripW);
  const SH = 170;
  const sm = { top: 26, right: 8, bottom: 34, left: 38 };
  const sx = $derived(linear(0.5, 12.5, sm.left, panelW - sm.right));
  const sy = linear(0, 1, SH - sm.bottom, sm.top);
  const jitter = Array.from({ length: 40 }, (_, i) => ((i * 0.61803) % 1) - 0.5);
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const tries = [
    { label: 'One counterparty each', apply: () => ((shape = 'random'), (links = 1)) },
    { label: 'Ten counterparties each', apply: () => ((shape = 'random'), (links = 10)) },
    { label: 'A few giants', apply: () => ((shape = 'hubs'), (links = 4)) },
    { label: 'Capital at 8%', apply: () => (capital = 8) },
  ];
</script>

<Chapter
  n={7}
  kicker="Contagion"
  title="2008: when links became conditions"
  lede="Links absorb small shocks and spread big ones. The more connected a system, the more it depends on its buffers and its hubs."
>
  {#snippet setup()}
    <p>
      Before 2008, banks grew ever more connected through interbank loans, derivatives, repo funding and shared
      holdings of the same mortgage securities. The common view was that connections spread risk thinly, so the
      system as a whole was safer. That was half right.
    </p>
    <p>
      Below is a network of 48 banks. Each bank lends 20% of its balance sheet to its counterparties, split evenly. If
      a counterparty fails, that loan is lost. A bank fails when its losses exceed its capital.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="An interbank network" sub="Click any bank to make it fail, or use the buttons. Failures spread in rounds.">
      <div class="tkc-controls">
        <Slider id="c-links" label="Counterparties per bank" bind:value={links} min={1} max={12} format={(v) => `about ${v}`} />
        <Slider id="c-capital" label="Capital" bind:value={capital} min={2} max={10} format={(v) => `${v}% of assets`} />
        <Segmented
          name="c-shape"
          label="Network"
          bind:value={shape}
          options={[
            { value: 'random', label: 'Many similar banks' },
            { value: 'hubs', label: 'A few giants' },
          ]}
        />
      </div>

      <div class="tkc-row">
        <button type="button" class="tkc-btn tkc-btn--small" onclick={() => start(pickSeeds(shockRng, adj, 1))}>Fail one random bank</button>
        <button type="button" class="tkc-btn tkc-btn--small" onclick={() => start(pickSeeds(shockRng, adj, 5))}>Hit five banks at once</button>
        <button type="button" class="tkc-btn tkc-btn--small" onclick={() => start([hub])}>Fail the most connected bank</button>
        <button type="button" class="tkc-btn tkc-btn--small" onclick={clear} disabled={!waves.length}>Reset</button>
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={netH} role="img" aria-label="Network of {N} banks. {count} have failed.">
          {#each adj as nbrs, i}
            {#each nbrs as j}
              {#if j > i}
                <line x1={px(pos[i])} y1={py(pos[i])} x2={px(pos[j])} y2={py(pos[j])} class="edge" class:hot={failedNow[i] && failedNow[j]} />
              {/if}
            {/each}
          {/each}
          {#each pos as p, i}
            <circle
              cx={px(p)}
              cy={py(p)}
              r={radius(i)}
              class="bank"
              class:failed={failedNow[i]}
              class:latest={latest.has(i)}
              onclick={() => start([i])}
              role="presentation"
            />
          {/each}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-bank"></span>Healthy bank (size = number of counterparties)</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Failed</span>
        </div>
      </div>

      <div class="tkc-stats tkc-stats--3" aria-live="polite">
        <Stat label="Banks failed" value="{count} of {N}" sub={!waves.length ? 'No shock yet' : done && count <= waves[0].length ? 'Absorbed: no other bank failed' : done ? 'Contagion has stopped' : 'Spreading…'} swatch="var(--tkc-conditions)" />
        <Stat label="Rounds of contagion" value={Math.max(0, revealed - 1)} sub="after the first failure" />
        <Stat label="Counterparties per bank" value={meanLinks.toFixed(1)} sub="in this network, on average" />
      </div>

      <div class="strips" bind:clientWidth={stripW}>
        <div class="tkc-fig-title small">What usually happens, in 960 simulated crises</div>
        <p class="tkc-small">Each dot is one random network of similar banks at {capital}% capital. The black tick is the average.</p>
        <div class="panels" class:side={sideBySide}>
          {#each [{ title: 'After one bank fails', data: one }, { title: 'After five fail at once', data: five }] as panel (panel.title)}
            <svg width={panelW} height={SH} role="img" aria-label="{panel.title}: share of banks that fail, by number of counterparties.">
              <text class="tkc-label" x={sm.left} y="14">{panel.title}</text>
              <rect x={sx(links - 0.5)} y={sm.top} width={sx(1) - sx(0)} height={SH - sm.top - sm.bottom} class="band" />
              {#each [0, 0.5, 1] as t}
                <line class="tkc-grid" x1={sm.left} x2={panelW - sm.right} y1={sy(t)} y2={sy(t)} />
                <text class="tkc-axis-label" x={sm.left - 6} y={sy(t) + 4} text-anchor="end">{t * 100}%</text>
              {/each}
              {#each panel.data as col (col.z)}
                {#each col.shares as share, k}
                  <circle cx={sx(col.z) + jitter[k] * (sx(1) - sx(0)) * 0.6} cy={sy(share)} r="2.4" class="dot" />
                {/each}
                <line x1={sx(col.z) - 7} x2={sx(col.z) + 7} y1={sy(mean(col.shares))} y2={sy(mean(col.shares))} class="avg" />
              {/each}
              {#each [1, 4, 8, 12] as t}
                <text class="tkc-axis-label" x={sx(t)} y={SH - sm.bottom + 16} text-anchor="middle">{t}</text>
              {/each}
              <text class="tkc-axis-label" x={sm.left + (panelW - sm.left - sm.right) / 2} y={SH - 2} text-anchor="middle">Counterparties per bank</text>
            </svg>
          {/each}
        </div>
      </div>

      <TryThis items={tries} />

      {#snippet model()}
        <p>Each bank lends 20% of its assets to other banks, split evenly across its counterparties, and holds capital of {capital}% of assets. A failed counterparty’s loan is lost in full, so a bank with k counterparties fails once more than {capital} ÷ 20 × k of them have failed.</p>
        <p>“Many similar banks” is a random network. “A few giants” grows by preferential attachment: newcomers link to banks that already have many links. This follows Watts (2002) and Gai and Kapadia (2010).</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>Try a few failures at different levels of connection.</p>
    <ul>
      <li>With one counterparty each, failures stay local. The network is too sparse to carry them.</li>
      <li>Around three counterparties, one failure can bring down most of the system.</li>
      <li>With eight or more, each loss is a small slice of capital, and a single failure is absorbed.</li>
    </ul>
    <p>
      That last result is the trap. A dense network absorbs small shocks so well that it looks safe. Now hit five banks
      at once, the way a fall in house prices hit everyone holding the same mortgage securities. The same links that
      absorbed one failure carry five to every bank. Andrew Haldane of the Bank of England called the system “robust
      yet fragile”.
    </p>
    <p>
      Switch to <em>A few giants</em> and fail a random bank: usually nothing happens. Then fail the most connected
      bank. That is the shape of September 2008: Lehman Brothers filed for bankruptcy on the 15th, the largest
      bankruptcy in US history, and the next day the Federal Reserve lent $85 billion to AIG, which had sold credit
      protection to banks around the world.
    </p>
    <p>
      Organizations have the same shape. A person that every process must pass through is a hub. Small, spread-out
      dependencies get absorbed. A dependency on one central approver is a single point of failure: when that person
      is out, everything behind them stops. Systems are no different: when a shared service such as sign-in or the
      client file goes down, every system that leans on it stops at once.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Who are the hubs in our processes: the people or systems that everything passes through? What is their stand-in?">
      <p>
        After 2008, regulators used three tools: more capital (bigger buffers), central clearing and resolution plans
        (robust hubs, and failures that can be survived), and ring-fencing (firebreaks). The same tools work inside the
        bank: slack, a stand-in for every hub, and teams that can keep working when a neighbour stops.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .edge {
    stroke: var(--tkc-rule);
    stroke-width: 1;
    opacity: 0.8;
  }
  .edge.hot {
    stroke: var(--tkc-conditions);
    opacity: 0.45;
  }
  .bank {
    fill: var(--tkc-surface);
    stroke: var(--tkc-ink-2);
    stroke-width: 1.5;
    cursor: pointer;
    transition: fill 250ms ease, stroke 250ms ease;
  }
  .bank:hover {
    stroke: var(--tkc-ink);
    stroke-width: 2.5;
  }
  .bank.failed {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
  }
  .bank.latest {
    stroke: var(--tkc-conditions);
    stroke-width: 3;
    stroke-opacity: 0.45;
  }
  .sw-bank {
    background: var(--tkc-surface);
    box-shadow: inset 0 0 0 1.5px var(--tkc-ink-2);
    border-radius: 50%;
  }
  .strips {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 6px;
    border-top: 1px solid var(--tkc-hair);
    padding-top: 14px;
  }
  .small {
    font-size: 0.9375rem;
  }
  .panels {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 8px;
  }
  .panels.side {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
  }
  .band {
    fill: var(--tkc-sunken);
  }
  .dot {
    fill: var(--tkc-ink-2);
    opacity: 0.35;
  }
  .avg {
    stroke: var(--tkc-ink);
    stroke-width: 2;
    stroke-linecap: round;
  }
</style>
