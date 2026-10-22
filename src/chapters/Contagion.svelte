<script>
  import { onDestroy, onMount, getContext, untrack } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { BANKS as N, TRIALS, CAPITALS, NETWORKS, SCENES, INTERBANK_PCT, stressTest, stressNetwork, lowestCapital, layout, cascade, absorbs } from '../lib/sim/network.js';
  import { linear, line } from '../lib/scales.js';
  import { pct } from '../lib/format.js';
  import { prefersReducedMotion, watchVisibility } from '../lib/motion.js';

  const SCENE_LABEL = { similar: 'Many similar banks, five fail at once', giants: 'A few hubs, the most connected fails' };
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth'];

  // Until the puzzle is done, the figure shows only the stress test; then a second scene opens.
  const game = getContext('tkc-game');
  const revealed = $derived(!game.isOpen('contagion'));

  let scene = $state('similar');
  let capital = $state(4);
  let width = $state(560);
  let chartW = $state(560);
  let hover = $state(null);

  // The stress test (40 networks × 3 shocks × 9 capital levels) and the example network's layout
  // are computed once per kind of network, so moving the slider only reads stored results.
  const tests = {};
  const examples = {};
  const testFor = (kind) => (tests[kind] ??= stressTest(kind));
  function exampleFor(kind) {
    if (!examples[kind]) {
      const t = testFor(kind).typical;
      const { adj, first } = stressNetwork(kind, t);
      examples[kind] = { adj, first, pos: layout(adj, NETWORKS[kind].seed + t) };
    }
    return examples[kind];
  }
  const kind = $derived(SCENES[scene].network);
  const shock = $derived(SCENES[scene].shock);
  const test = $derived(testFor(kind));
  const example = $derived(exampleFor(kind));
  const at = (c) => CAPITALS.indexOf(c);
  const mean = $derived(test.mean[shock][at(capital)]);
  const collapses = $derived(test.collapses[shock][at(capital)]);

  // The one rule: how many failed borrowers a bank survives at this capital, from the model's own failure condition.
  // A typical bank in each scene, and two neighbours for comparison.
  const TYPICAL = { similar: [10, 8, 12], giants: [2, 3, 4] };
  const survives = (k) => {
    const s = absorbs(capital, k);
    return s === 0 ? 'falls at the first failure' : `survives ${WORDS[s]} failure${s === 1 ? '' : 's'} and falls at the ${ORDINAL[s + 1]}`;
  };
  const fallsAt = (k) => `at the ${ORDINAL[absorbs(capital, k) + 1]}`;
  const rule = $derived.by(() => {
    const [k, k1, k2] = TYPICAL[scene];
    return {
      main: `With ${capital}% capital, a bank with ${WORDS[k]} borrowers ${survives(k)}.`,
      more: `Each loan is ${INTERBANK_PCT / k}% of its assets. A bank with ${WORDS[k1]} borrowers falls ${fallsAt(k1)}; one with ${WORDS[k2]}, ${fallsAt(k2)}.`,
    };
  });
  const rules = $derived([
    scene === 'similar' ? '48 banks; each lends 20% of its assets to about ten others, in equal parts.' : '48 banks; each lends 20% of its assets in equal parts, most to two or three others.',
    'A bank that fails repays nothing: its lenders lose those loans in full.',
    'A bank fails when its losses exceed its capital.',
    scene === 'similar' ? 'Five banks fail at once; the rest follow, or not.' : 'The most connected bank fails; the rest follow, or not.',
  ]);

  // The example network: the outcome for the current settings, revealed one round of failures at a time.
  const outcome = $derived(cascade(example.adj, capital, example.first[shock]));
  let shown = $state({ key: '', waves: [] });
  let wave = $state(0);
  let seen = false;
  let timer = 0;
  let diagram;
  const WAVE_MS = 200;

  function play() {
    clearInterval(timer);
    if (prefersReducedMotion()) {
      wave = shown.waves.length;
      return;
    }
    if (!seen) {
      wave = 1;
      return;
    }
    wave = 1;
    timer = setInterval(() => {
      if (wave >= shown.waves.length) clearInterval(timer);
      else wave += 1;
    }, WAVE_MS);
  }
  $effect(() => {
    const { waves, failed } = outcome;
    const key = `${scene}:${failed.join('')}`;
    untrack(() => {
      if (key === shown.key) {
        // The same banks fail as before: keep what is on screen.
        const complete = wave >= shown.waves.length;
        shown = { key, waves };
        wave = complete ? waves.length : Math.min(wave, waves.length);
        return;
      }
      shown = { key, waves };
      play();
    });
  });
  // The first round waits until the diagram is on screen.
  onMount(() =>
    watchVisibility(diagram, (visible) => {
      if (!visible || seen) return;
      seen = true;
      play();
    }),
  );
  onDestroy(() => clearInterval(timer));

  const failedNow = $derived.by(() => {
    const f = new Uint8Array(N);
    shown.waves.slice(0, wave).forEach((w) => w.forEach((i) => (f[i] = 1)));
    return f;
  });
  const hitFirst = $derived(new Set(shown.waves[0] ?? []));
  const count = $derived(failedNow.reduce((a, b) => a + b, 0));
  const spreading = $derived(wave < shown.waves.length);
  const rounds = $derived(Math.max(0, shown.waves.length - 1));

  // Network drawing.
  const netH = $derived(Math.round(Math.min(440, Math.max(300, width * 0.68))));
  const px = (p) => p.x * width;
  const py = (p) => p.y * netH;
  const radius = (i) => 3.5 + 1.6 * Math.sqrt(example.adj[i].length);

  // Line chart: share of banks that fail, on average, against capital, for the current scene.
  const CH = 230;
  const cm = { top: 30, right: 18, bottom: 40, left: 44 };
  const cx = $derived(linear(2, 10, cm.left, chartW - cm.right));
  const cy = linear(0, 1, CH - cm.bottom, cm.top);
  const curve = $derived(line(CAPITALS.map((c, i) => [cx(c), cy(test.mean[shock][i])])));
  const xTicks = $derived((chartW - cm.left - cm.right) / 8 >= 30 ? CAPITALS : CAPITALS.filter((c) => c % 2 === 0));
  const tagBelow = $derived(mean > 0.8);
  const tagLeft = $derived(capital >= 9);

  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    hover = Math.max(2, Math.min(10, Math.round(cx.invert(e.clientX - box.left + cm.left))));
  }

  // The stress test: many similar banks, five failing at once.
  const similar = testFor('similar');
  const lowest = lowestCapital(similar, 'five', 0.25);
  const stressMean = (c) => similar.mean.five[at(c)];
  const stressNow = $derived(scene === 'similar');
  const stressed = $derived(stressMean(capital));
  // Across the 40 networks, the most banks that fail beyond the first five at the answer.
  const worstExtra = Math.round(Math.max(...similar.shares.five[at(lowest)]) * N) - 5;
  const puzzle = $derived({
    goal: 'A stress test: five of these banks fail at once. Find the lowest capital at which, on average, fewer than a quarter of all 48 banks fail.',
    met: stressNow && capital === lowest,
    checks: [{ label: `On average, fewer than a quarter of the banks fail (now ${pct(stressed)})`, ok: stressed < 0.25 }],
    progress: stressed < 0.25 && capital > lowest ? `Under a quarter at ${capital}%. Does a lower capital still hold?` : '',
    hints: ['The chart under the network shows the average at every level of capital.', 'Raise capital one point at a time from 4%. When the drop comes, it is sudden.'],
    found: `${lowest}%. With ${lowest - 2}% capital, five failures at once bring down ${pct(stressMean(lowest - 2))} of the banks on average; with ${lowest - 1}%, ${pct(stressMean(lowest - 1))}; with ${lowest}%, ${pct(stressMean(lowest))}, never more than ${WORDS[worstExtra] ?? worstExtra} banks beyond the first five. Two points of capital separate a collapse from a contained crisis.`,
  });
  // Numbers quoted in the explanation, read from the same stress test.
  const giants = testFor('giants');
  const giantsLowest = lowestCapital(giants, 'biggest', 0.25);
</script>

<Chapter
  n={8}
  kicker="Contagion"
  title="2008: when links became conditions"
  lede="The links between banks were meant to spread risk thinly. A stress test shows what they really do."
  puzzle="contagion"
>
  {#snippet setup()}
    <p>
      Before 2008, banks grew ever more connected through interbank loans, derivatives, repo funding and shared
      holdings of the same mortgage securities. The common view was that connections spread risk thinly, so the
      system as a whole was safer. That was half right.
    </p>
    <p>
      Every loan to another bank is also a condition: the lender stays standing only while enough of its borrowers do.
      So one question decides everything below: how many of its borrowers can fail before a bank falls? The answer
      depends on its capital, the buffer that absorbs its losses, and on how many borrowers share its lending.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="An interbank network" sub="48 banks that lend to each other, and what a shock does to them. Failures spread in rounds." {rules}>
      <Puzzle id="contagion" {...puzzle} onshow={() => ((scene = 'similar'), (capital = lowest))} />
      <div class="tkc-controls tkc-controls--wide">
        <div class="ctl">
          <Slider id="c-capital" label="Capital" bind:value={capital} min={2} max={10} format={(v) => `${v}% of assets`} />
          <p class="rule"><strong>{rule.main}</strong> {rule.more}</p>
        </div>
        {#if revealed}
          <Segmented name="c-scene" label="The scene" bind:value={scene} options={Object.entries(SCENE_LABEL).map(([value, label]) => ({ value, label }))} />
        {/if}
      </div>

      <div class="tkc-chart" bind:clientWidth={width} bind:this={diagram}>
        <svg {width} height={netH} role="img" aria-label="{SCENE_LABEL[scene]}: one network of {N} banks, with {capital}% capital. {count} of {N} banks have failed{spreading ? ' so far' : ''}.">
          {#each example.adj as nbrs, i}
            {#each nbrs as j}
              {#if j > i}
                <line x1={px(example.pos[i])} y1={py(example.pos[i])} x2={px(example.pos[j])} y2={py(example.pos[j])} class="edge" class:hot={failedNow[i] && failedNow[j]} />
              {/if}
            {/each}
          {/each}
          {#each example.pos as p, i}
            <circle cx={px(p)} cy={py(p)} r={radius(i)} class="bank" class:failed={failedNow[i]} />
          {/each}
          {#each [...hitFirst] as i (i)}
            <circle cx={px(example.pos[i])} cy={py(example.pos[i])} r={radius(i) + 3.5} class="ring" />
          {/each}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-bank"></span>Healthy bank (size = number of borrowers)</span>
          <span><span class="tkc-swatch sw-ring"></span>Hit by the shock</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Failed</span>
        </div>
        <p class="tkc-caption">One of the {TRIALS} networks behind the chart below: the one whose results come closest to their average.</p>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat
          label="Banks that fail, this network"
          value="{count} of {N}"
          sub={spreading ? 'Spreading…' : count <= hitFirst.size ? 'Absorbed: no other bank failed' : `${rounds} round${rounds === 1 ? '' : 's'} of contagion`}
          swatch="var(--tkc-conditions)"
        />
        <Stat
          label="Average of {TRIALS} networks"
          value={pct(mean)}
          sub={collapses === 0 ? `Most banks fail in none of the ${TRIALS}` : collapses === TRIALS ? `Most banks fail in all ${TRIALS}` : `Most banks fail in ${collapses} of the ${TRIALS}`}
        />
      </div>

      <div class="tkc-chart curve" bind:clientWidth={chartW}>
        <div class="tkc-fig-title small">Across {TRIALS} networks like this one</div>
        <svg
          width={chartW}
          height={CH}
          role="img"
          aria-label="Banks that fail, on average over {TRIALS} networks like this one ({SCENE_LABEL[scene].toLowerCase()}), against capital: {CAPITALS.map((c, i) => `${c}% capital, ${pct(test.mean[shock][i])}`).join('; ')}."
        >
          {#each [0, 0.25, 0.5, 0.75, 1] as t}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={cm.left} x2={chartW - cm.right} y1={cy(t)} y2={cy(t)} />
            <text class="tkc-axis-label" x={cm.left - 6} y={cy(t) + 4} text-anchor="end">{t * 100}%</text>
          {/each}
          <path d={curve} class="bold" />
          {#each CAPITALS as c, i (c)}
            <circle cx={cx(c)} cy={cy(test.mean[shock][i])} r="3" class="pt-small" />
          {/each}
          <line class="now" x1={cx(capital)} x2={cx(capital)} y1={cm.top} y2={cy(0)} />
          <circle cx={cx(capital)} cy={cy(mean)} r="5.5" class="pt" />
          <text class="tkc-label tkc-halo" x={cx(capital) + (tagLeft ? -9 : 9)} y={cy(mean) + (tagBelow ? 18 : -9)} text-anchor={tagLeft ? 'end' : 'start'}>{pct(mean)}</text>
          {#if hover !== null}
            <line class="cross" x1={cx(hover)} x2={cx(hover)} y1={cm.top} y2={cy(0)} />
          {/if}
          {#each xTicks as c (c)}
            <text class="tkc-axis-label" x={cx(c)} y={CH - cm.bottom + 16} text-anchor="middle">{c}%</text>
          {/each}
          <text class="tkc-axis-title" x={cm.left + (chartW - cm.left - cm.right) / 2} y={CH - 4} text-anchor="middle">Capital, as a share of assets</text>
          <text class="tkc-axis-title" x={cm.left - 38} y={cm.top - 14}>Banks that fail, on average</text>
          <rect x={cm.left} y={cm.top} width={Math.max(0, chartW - cm.left - cm.right)} height={CH - cm.top - cm.bottom} fill="transparent" role="presentation" onpointermove={onMove} onpointerleave={() => (hover = null)} />
        </svg>
        {#if hover !== null}
          <div class="tkc-tip" style:left="{Math.min(chartW - 170, Math.max(0, cx(hover) + 10))}px" style:top="44px">
            <div>With {hover}% capital</div>
            <div class="tkc-tip-row"><strong>{pct(test.mean[shock][at(hover)])}</strong> fail on average</div>
          </div>
        {/if}
      </div>

      {#snippet model()}
        <p>Each bank lends 20% of its assets to the banks it is linked to, split evenly, and holds capital of {capital}% of assets; every link runs both ways. A failed borrower’s loan is lost in full, so a bank with k borrowers fails once more than {capital} ÷ 20 × k of them have failed. With exactly that many, its losses equal its capital and it stands.</p>
        <p>“Many similar banks” is a random network: every pair of banks is linked with the same chance, giving about ten borrowers each. “A few hubs” grows by preferential attachment: each newcomer links to two banks, more often to those that already have many links. “Five fail at once” picks five banks at random; the most connected bank is the one with the most links; the model has links, not sizes.</p>
        <p>The chart averages {TRIALS} networks of each kind, the same {TRIALS} for every reader. The diagram shows the one whose results come closest to that average. The model follows Watts (2002) and Gai and Kapadia (2010).</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      With 4% capital, a bank with ten borrowers survives two failures. So a single failure seldom spreads: across the
      {TRIALS} networks of similar banks, on average {(similar.mean.one[at(4)] * N).toFixed(1)} of the {N} banks fail,
      the one that was hit and seldom another. A dense network absorbs small shocks so well that it looks safe. That is
      the trap. Five failures at once bring down all {N}, in every one of the {TRIALS} networks. A fall in house prices
      was that kind of shock: it hit everyone holding the same mortgage securities together. The same links that absorbed
      one failure carry five to every bank. Andrew Haldane of the Bank of England called the system “robust yet fragile”.
    </p>
    <p>
      Climbers roped together know the pattern. On easy ground, the rope lets the others hold one who slips. On a
      steep face, one fall can pull the whole team off. And the buffer does not work like a dial: below a certain
      level of capital, the system does not bend a little more. It breaks.
    </p>
    <p>
      It breaks because contagion feeds on itself: every bank that falls is one more failed borrower for the banks that
      lent to it. With enough capital the losses die out within a round or two; with too little, each round of failures
      sets up the next. Every link had become a condition, and the chain of conditions ran through the whole system.
    </p>
    <p>
      The second scene, now open in the figure, links the same {N} banks as <em>a few hubs</em>. Most banks in it have
      only two or three borrowers, so each loan is a large share of their assets: with 6% capital, such a bank falls at the
      first failure. A failure picked at random brings down {pct(giants.mean.one[at(6)])} of the banks on average,
      because most banks have few links. When the most connected bank fails, {pct(giants.mean.biggest[at(6)])} go down. Even the 7%
      that contained the stress test leaves {pct(giants.mean.biggest[at(7)])}; it takes {giantsLowest}% to keep the
      fall of the most connected bank under a quarter. That is the shape of September 2008: Lehman Brothers filed for bankruptcy on the 15th,
      the largest bankruptcy in US history, and the next day the Federal Reserve agreed to lend AIG up to $85 billion.
      AIG had sold credit protection to banks around the world.
    </p>
    <h3>Hubs inside organizations</h3>
    <p>
      Organizations grow hubs the same way the hubs grew in the figure. Work flows to whoever already handles the
      most: the expert everyone asks, the committee that sees every deal, the central system every other system reads
      from. Each new link makes the hub a little more useful, so the next link goes there too.
    </p>
    <p>
      On a normal day a hub is efficient: one place to ask, one place to look. It is also a queue, as chapter 4 showed,
      and a single point of failure. When the hub is busy, everyone waits; when it stops, everything stops. On 19 July
      2024 a faulty update to one security product crashed about 8.5 million Windows computers, grounding flights and
      disrupting banks and hospitals on the same day. Small, spread-out dependencies get absorbed. A hub’s failure is
      everyone’s.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which single event would hit many of our teams, systems or suppliers at the same time?">
      <p>
        After 2008, regulators used three tools: more capital (bigger buffers), central clearing and resolution plans
        (robust hubs, and failures that can be survived), and ring-fencing (firebreaks). Inside a bank the same three
        shapes appear as slack, a deputy for every hub, and teams that can keep working when a neighbour stops.
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
    transition: fill 180ms ease, stroke 180ms ease;
  }
  .bank.failed {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
  }
  .ring {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 1.75;
  }
  .sw-bank {
    background: var(--tkc-surface);
    box-shadow: inset 0 0 0 1.5px var(--tkc-ink-2);
    border-radius: 50%;
  }
  .sw-ring {
    width: 12px;
    height: 12px;
    background: var(--tkc-conditions);
    box-shadow: 0 0 0 1.5px var(--tkc-surface), 0 0 0 3px var(--tkc-ink);
    border-radius: 50%;
  }
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .curve {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    border-top: 1px solid var(--tkc-hair);
    padding-top: 14px;
  }
  .small {
    font-size: 0.9375rem;
  }
  .ctl {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  .rule {
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--tkc-ink-2);
    text-wrap: pretty;
  }
  .rule strong {
    color: var(--tkc-ink);
    font-weight: 600;
  }
  .bold {
    fill: none;
    stroke: var(--tkc-conditions);
    stroke-width: 2.5;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .pt-small {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
  }
  .pt {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 2;
  }
  .now {
    stroke: var(--tkc-ink);
    stroke-width: 1;
  }
  .cross {
    stroke: var(--tkc-muted);
    stroke-width: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .bank {
      transition: none;
    }
  }
</style>
