<script>
  import { onDestroy, onMount, tick, untrack } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { BANKS as N, CAPITAL, LOSS, EXTRA, INTERBANK_PCT, ALTERNATIVES, HUB_SEED, EXAMPLE, SHARES, hubSystem, byLinks, capitalFor, landing, everywhere, holdsAcross, layout, absorbs } from '../lib/sim/network.js';
  import { prefersReducedMotion, watchVisibility } from '../lib/motion.js';

  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

  // The figure's network, its banks from most to least connected, and every way of sharing the extra
  // capital with its outcome wherever the loss lands, all computed once.
  const adj = hubSystem();
  const order = byLinks(adj);
  const rankOf = new Int32Array(N);
  order.forEach((b, r) => (rankOf[b] = r));
  const links = (b) => adj[b].length;
  const results = Object.fromEntries(SHARES.map((s) => [s.value, { ...s, capital: capitalFor(adj, s.top), ...everywhere(adj, capitalFor(adj, s.top)) }]));
  const edges = adj.flatMap((nbrs, i) => nbrs.filter((j) => j > i).map((j) => [i, j]));
  const hub = order[0];

  // Where the loss lands: one of the least connected banks to begin with, so it stops there.
  let at = $state(order[N - 1]);
  let share = $state('none');
  let width = $state(560);
  let diagram;

  const result = $derived(results[share]);
  const outcome = $derived(landing(adj, result.capital, at));
  const hasExtra = (b) => result.capital[b] > CAPITAL;

  // The outcome, revealed one round of failures at a time.
  let shown = $state({ key: '', waves: [] });
  let wave = $state(0);
  let seen = false;
  let timer = 0;
  const WAVE_MS = 220;

  function play() {
    clearInterval(timer);
    if (prefersReducedMotion()) {
      wave = shown.waves.length;
      return;
    }
    wave = 1;
    if (!seen) return;
    timer = setInterval(() => {
      if (wave >= shown.waves.length) clearInterval(timer);
      else wave += 1;
    }, WAVE_MS);
  }
  $effect(() => {
    const { waves, failed } = outcome;
    const key = `${at}:${failed.join('')}`;
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
  const count = $derived(failedNow.reduce((a, b) => a + b, 0));
  const spreading = $derived(wave < shown.waves.length);
  const rounds = $derived(Math.max(0, shown.waves.length - 1));

  // The drawing: banks laid out for the shape of the frame, so a phone gets a squarer network.
  const narrow = $derived(width < 420);
  const H = $derived(Math.round(Math.min(320, Math.max(280, width * 0.6))));
  const ASPECTS = [1, 1.3, 1.65, 2];
  const layouts = {};
  const aspect = $derived(ASPECTS.reduce((a, b) => (Math.abs(b - width / H) < Math.abs(a - width / H) ? b : a)));
  const pos = $derived((layouts[aspect] ??= layout(adj, HUB_SEED + EXAMPLE, 320, aspect)));
  const px = (b) => pos[b].x * width;
  const py = (b) => pos[b].y * H;
  const radius = (b) => (narrow ? 3 : 3.5) + (narrow ? 1.4 : 1.6) * Math.sqrt(links(b));

  // Tap or click: the nearest bank within reach of the pointer, so small banks are easy to hit on a phone.
  function onTap(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - box.left;
    const my = e.clientY - box.top;
    let best = -1;
    let gap = Infinity;
    for (let b = 0; b < N; b++) {
      const d = Math.hypot(px(b) - mx, py(b) - my) - radius(b);
      if (d < gap) (gap = d), (best = b);
    }
    if (best >= 0 && gap <= 18) at = best;
  }
  // The arrow keys move the loss from bank to bank, most connected first.
  async function onKey(e) {
    const r = rankOf[at];
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let next;
    if (step) next = (r + step + N) % N;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = N - 1;
    else return;
    e.preventDefault();
    at = order[next];
    await tick();
    diagram?.querySelector(`[data-bank="${at}"]`)?.focus();
  }

  const describe = (b) => (b === hub ? 'the most connected bank' : `a bank with ${links(b)} links`);
  const capitalised = (s) => s[0].toUpperCase() + s.slice(1);
  const failSub = $derived(
    spreading
      ? 'Spreading…'
      : `${capitalised(describe(at))}: ${outcome.absorbed ? 'its capital covers the loss' : count === 1 ? 'the loss stops there' : `${rounds} round${rounds === 1 ? '' : 's'} of failures`}`,
  );
  // Where the worst place is, in words: "at any of the three most connected", "at a bank with 4 links".
  function whereWorst(r) {
    const ranks = r.worstAt.map((b) => rankOf[b]).sort((a, b) => a - b);
    const m = ranks.length;
    if (ranks.every((k, i) => k === i)) return m === 1 ? 'At the most connected bank' : m === 2 ? 'At either of the two most connected' : `At any of the ${WORDS[m]} most connected`;
    if (m === 1) return `At ${describe(r.worstAt[0])}`;
    if (ranks.every((k) => k < ORDINAL.length - 1)) return `At the ${ranks.map((k) => ORDINAL[k + 1]).join(' or ')} most connected`;
    return `At ${m} places`;
  }

  // The puzzle: a target on the worst place to land.
  const every = results.every;
  const top1 = results.top1;
  const PROGRESS = {
    none: '',
    every: `${CAPITAL + 1}% is still less than the ${LOSS}% loss: the bank it lands on falls as before, and ${WORDS[every.worstAt.length]} hubs still bring down all ${N}.`,
    top12: '',
    top1: `The biggest hub stands, at ${CAPITAL + EXTRA}%; a loss at the second still brings down ${top1.worst} of the ${N}.`,
  };
  const puzzle = $derived({
    goal: `Share out the ${EXTRA} points so that, wherever the loss lands, no more than five banks fail.`,
    met: result.worst <= 5,
    checks: [{ label: `Wherever the loss lands, five banks or fewer fail (now up to ${result.worst})`, ok: result.worst <= 5 }],
    progress: PROGRESS[share],
    hints: ['Put the loss on the biggest hubs first. Which banks carry it furthest?', `Extra capital stops the loss at a bank only once it covers all ${LOSS}%.`],
    found: 'Four points each for the 12 most connected: they absorb the loss and stop the rest, so never more than four banks fall.',
  });

  // Numbers quoted in the explanation, read from the same model.
  const none = results.none;
  const onlyHit = none.sizes.filter((s) => s === 1).length;
  const atMostNine = none.sizes.filter((s) => s <= 9).length;
  const allFall = none.sizes.filter((s) => s === N).length;
  const hubSurvives = absorbs(CAPITAL, links(hub));
  const smallLoan = INTERBANK_PCT / 2;
  const top3 = new Set(order.slice(0, 3));
  const touchTop3 = edges.filter(([i, j]) => top3.has(i) || top3.has(j)).length;
  // The model note: the same shares on the other hub networks grown the same way.
  const robust = holdsAcross(12);
  const robustEvery = holdsAcross(N);
</script>

<Chapter
  n={9}
  kicker="The stress test"
  title="When links become conditions"
  lede="Loans between banks spread risk thinly, until a loss lands in the wrong place. Then every link becomes a condition."
  puzzle="contagion"
>
  {#snippet setup()}
    <p>
      A development bank seldom lends to a small firm directly. It lends through a country’s banks, and those banks
      lend to each other. Every loan between them is a link in a chain, and a condition: a bank stands only while
      enough of the banks it lent to stand.
    </p>
    <p>
      The links are not spread evenly. A few hubs deal with nine or more other banks; more than half deal with only
      two or three. One of these banks takes a large loss on its own loans. Where it lands decides whether it
      stops there or runs along the links.
    </p>
    <p>
      The supervisor can ask for more capital: {EXTRA} extra percentage points in all, shared out as it sees fit. One
      point for every bank, or more for a few?
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="The stress test"
      sub="{N} banks, sized by their links. Tap or click any bank to land the loss there; failures spread in rounds."
      rules={[
        `Each bank lends ${INTERBANK_PCT}% of its assets to its linked banks, in equal parts.`,
        `Each holds ${CAPITAL}% capital; a bank whose losses exceed it fails and repays nothing.`,
        `One bank loses ${LOSS}% of its assets on its own loans.`,
      ]}
    >
      <Puzzle id="contagion" {...puzzle} onshow={() => ((share = 'top12'), (at = hub))} />
      <div class="tkc-controls tkc-controls--wide">
        <div class="ctl">
          <Segmented name="c-extra" label="Extra capital" bind:value={share} options={SHARES.map(({ value, label }) => ({ value, label }))} />
          <p class="tkc-small">{EXTRA} points in all: one for every bank, four each for the 12 most connected, or all {EXTRA} for the most connected.</p>
        </div>
      </div>

      <div class="tkc-chart" bind:clientWidth={width} bind:this={diagram}>
        <!-- Each bank is a radio that takes focus and the arrow keys; a tap anywhere picks the nearest bank. -->
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
        <svg {width} height={H} role="radiogroup" aria-label="Where the loss lands: {N} banks, most connected first. The arrow keys move the loss." onclick={onTap}>
          <g aria-hidden="true">
            {#each edges as [i, j] (`${i}-${j}`)}
              <line x1={px(i)} y1={py(i)} x2={px(j)} y2={py(j)} class="edge" class:hot={failedNow[i] && failedNow[j]} />
            {/each}
          </g>
          {#each order as b (b)}
            <circle
              cx={px(b)}
              cy={py(b)}
              r={radius(b)}
              class="bank"
              class:extra={hasExtra(b)}
              class:failed={failedNow[b]}
              data-bank={b}
              role="radio"
              aria-checked={b === at}
              aria-label="{capitalised(describe(b))}{b === hub ? `, ${links(b)} links` : ''}"
              tabindex={b === at ? 0 : -1}
              onkeydown={onKey}
            />
          {/each}
          <circle cx={px(at)} cy={py(at)} r={radius(at) + 4} class="ring" aria-hidden="true" />
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-bank"></span>Bank, sized by its links</span>
          <span><span class="tkc-swatch sw-ring"></span>Where the loss lands</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Failed</span>
          <span><span class="tkc-swatch sw-extra"></span>Extra capital</span>
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat label="Banks that fail" value="{count} of {N}" sub={failSub} swatch="var(--tkc-conditions)" />
        <Stat label="Worst place to land" value="{result.worst} of {N}" sub={whereWorst(result)} />
      </div>

      {#snippet model()}
        <p>Each bank lends {INTERBANK_PCT}% of its assets to the banks it is linked to, split evenly; every link runs both ways. Each holds {CAPITAL}% capital, plus any extra points. The bank where the loss lands loses {LOSS}% of its assets and fails only if that exceeds its capital. A failed bank repays nothing, so a bank with k partners loses {INTERBANK_PCT} ÷ k % for each one that fails, and fails once its losses exceed its capital. Failures spread in rounds until a round adds none.</p>
        <p>The network grows by preferential attachment: each new bank links to two others, more often to those with many links already. Across {ALTERNATIVES} networks grown this way, four points each for the 12 most connected keep the worst place to five failures or fewer in {robust}; one point for every bank, in {robustEvery === 0 ? 'none' : robustEvery}. After Watts (2002) and Gai and Kapadia (2010).</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      With no extra capital the system looks sound from almost everywhere. Of the {N} places the loss can land,
      {onlyHit} bring down only the bank hit, and {atMostNine} at most nine banks. The other {WORDS[allFall]} are the
      biggest hubs, and each brings down all {N}: robust yet fragile, as central bankers came to call it.
    </p>
    <p>
      The hubs are not the weak links: the biggest can lose {WORDS[hubSurvives]} of its {links(hub)} partners and
      stand. But when it fails, {links(hub)} banks lose a loan at once. A bank with two partners has lent each
      {smallLoan}% of its assets, twice its capital, so it falls too, and its lenders may follow. More than a third of all
      links end at the three biggest hubs.
    </p>
    <p>
      Spread evenly, the {EXTRA} points give every bank {CAPITAL + 1}%, still short of the {LOSS}% loss: a buffer
      helps only once it covers the loss. All {EXTRA} on the biggest hub make it safe, but the next two still bring
      down {top1.worst} each. At the twelve most connected, {CAPITAL + 4}% covers the loss where the links meet, and the
      other banks have too few links to carry it far.
    </p>
    <p>
      September 2008 had this shape. A large investment bank, a hub, was allowed to fail on the 15th. The next day an
      insurer that had sold credit protection to banks around the world was rescued: its failure would have passed the
      loss to all of them.
    </p>
    <h3>Hubs inside organizations</h3>
    <p>
      Organizations grow hubs the same way: work flows to whoever already handles the most, such as the expert everyone
      asks, the committee that sees every deal or the system every other system reads from. On a normal day a hub is
      efficient. On a bad day it is where a loss travels furthest, and where a deputy or a second route counts most.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which partner, supplier or system in our chain would bring down many others if it failed?">
      <p>
        In 2011 the world’s bank supervisors agreed that the banks whose failure would travel furthest should hold more
        capital than the rest: 1 to 3.5 extra percentage points, set by how large, interlinked, complex, global and hard to replace a
        bank is. National supervisors now do the same for the banks that matter most at home.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .ctl {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  svg {
    cursor: pointer;
    touch-action: manipulation;
  }
  .edge {
    stroke: var(--tkc-rule);
    stroke-width: 1;
    opacity: 0.8;
  }
  .edge.hot {
    stroke: var(--tkc-conditions);
    opacity: 0.5;
  }
  .bank {
    fill: var(--tkc-surface);
    stroke: var(--tkc-ink-2);
    stroke-width: 1.5;
    transition: fill 180ms ease, stroke 180ms ease;
  }
  .bank.extra {
    stroke: var(--tkc-options);
    stroke-width: 2.5;
  }
  .bank.failed {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
  }
  .bank:focus {
    outline: none;
  }
  .bank:focus-visible {
    stroke: var(--tkc-focus);
    stroke-width: 3;
  }
  .ring {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 2;
    pointer-events: none;
  }
  .sw-bank {
    background: var(--tkc-surface);
    box-shadow: inset 0 0 0 1.5px var(--tkc-ink-2);
    border-radius: 50%;
  }
  .sw-ring {
    width: 12px;
    height: 12px;
    background: transparent;
    box-shadow: inset 0 0 0 2px var(--tkc-ink);
    border-radius: 50%;
  }
  .sw-extra {
    background: var(--tkc-surface);
    box-shadow: inset 0 0 0 2.5px var(--tkc-options);
    border-radius: 50%;
  }
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  /* "48 of 48" stays on one line, in a smaller size on the narrowest phones. */
  .two :global(.tkc-stat-value) {
    white-space: nowrap;
  }
  @container fig (max-width: 300px) {
    .two :global(.tkc-stat-value) {
      font-size: 1.25rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bank {
      transition: none;
    }
  }
</style>
