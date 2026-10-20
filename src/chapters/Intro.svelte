<script>
  import { getContext, onMount } from 'svelte';
  import { makeRng } from '../lib/sim/rng.js';
  import { prefersReducedMotion, watchVisibility } from '../lib/motion.js';
  import { CHAPTERS } from './index.js';

  const go = getContext('tkc-go');
  const prefix = getContext('tkc-id') ?? 'tkc';

  const STEPS = 4;
  const AWAY = 0.1;
  const MONTH = 20;
  const ROWS = [
    { id: 'a', label: 'Each step needs one named person', people: 1, tone: 'conditions' },
    { id: 'b', label: 'Each step can be done by any of three people', people: 3, tone: 'options' },
  ];

  let seed = $state(3);
  let day = $state(0);
  let playing = $state(false);
  let width = $state(640);
  let hero;

  const rng = $derived(makeRng(seed));
  // Pre-draw the whole month so pausing, replaying and reduced motion all agree.
  const month = $derived.by(() => {
    const r = rng;
    return Array.from({ length: MONTH }, () =>
      ROWS.map((row) => Array.from({ length: STEPS }, () => Array.from({ length: row.people }, () => r() >= AWAY))),
    );
  });
  const everyoneIn = ROWS.map((row) => Array.from({ length: STEPS }, () => Array(row.people).fill(true)));
  const today = $derived(day === 0 ? everyoneIn : month[day - 1]);
  const moved = (rowState) => rowState.every((step) => step.some(Boolean));
  const tally = $derived(
    ROWS.map((_, r) => month.slice(0, day).filter((d) => moved(d[r])).length),
  );

  let timer;
  function play() {
    clearInterval(timer);
    playing = true;
    timer = setInterval(() => {
      if (day >= MONTH) {
        clearInterval(timer);
        playing = false;
        return;
      }
      day += 1;
    }, 650);
  }
  function stop() {
    clearInterval(timer);
    playing = false;
  }
  function another() {
    seed += 1;
    if (prefersReducedMotion()) {
      day = MONTH;
      return;
    }
    day = 0;
    play();
  }

  onMount(() => {
    if (prefersReducedMotion()) {
      day = MONTH;
      return;
    }
    let started = false;
    const stopWatching = watchVisibility(hero, (visible) => {
      if (visible && !started) {
        started = true;
        day = 1;
        play();
      } else if (!visible && playing) {
        stop();
      }
    });
    return () => {
      stopWatching();
      stop();
    };
  });

  // Geometry for the hero drawing: four stations spread across the width.
  const x = (s) => 28 + ((width - 56) * s) / (STEPS - 1);

  const contents = [
    'Why a pencil’s long supply chain beats a short chain of sign-offs.',
    'Adam Smith’s pin workshop, and why specialists need scale.',
    'Follow one request through a relay of approvals.',
    'Why busy experts slow everyone down, and how one shared line fixes it.',
    'A coin game that makes the average player rich and the typical player broke.',
    'How a network of banks absorbs small shocks and spreads big ones.',
    'Specialists, generalists, and the danger of depending on one thing.',
    'Why some organizations get smarter as they grow and others get slower.',
    'A two-question test for every step, and a tool to check a process you know.',
  ];
</script>

<section class="intro" aria-labelledby="{prefix}-story-title">
  <header class="masthead">
    <div class="tkc-eyebrow">An interactive story · about 15 minutes · every chart is live</div>
    <h1 class="tkc-display title" id="{prefix}-story-title">Two Kinds of Chains</h1>
    <p class="deck">
      Why some complexity makes an organization smarter, some makes it stall, and why scale amplifies whichever
      kind you have.
    </p>
  </header>

  <div class="pair">
  <div class="hero tkc-fig" bind:this={hero}>
    <div class="hero-head">
      <div class="tkc-fig-head">
        <span class="tkc-fig-title">Same four steps, staffed two ways</span>
        <span class="tkc-small">Everyone is away one day in ten, at random. Which chain keeps moving?</span>
      </div>
      <div class="tkc-row">
        {#if playing}
          <button type="button" class="tkc-btn tkc-btn--small" onclick={stop}>Pause</button>
        {:else if day < MONTH}
          <button type="button" class="tkc-btn tkc-btn--small" onclick={play}>Play</button>
        {/if}
        <button type="button" class="tkc-btn tkc-btn--small" onclick={another}>Run another month</button>
      </div>
    </div>

    <div class="tkc-chart rows" bind:clientWidth={width}>
      {#each ROWS as row, r (row.id)}
        {@const state = today[r]}
        {@const ok = day > 0 && moved(state)}
        {@const firstStuck = state.findIndex((step) => !step.some(Boolean))}
        <div class="row-head">
          <span class="row-label">{row.label}</span>
          <span class="row-status" class:bad={day > 0 && !ok}>
            {#if day === 0}Ready{:else if ok}Moved today{:else}Stuck at step {firstStuck + 1}{/if}
          </span>
        </div>
        <svg width={width} height="44" role="img" aria-label="{row.label}: {day === 0 ? 'ready' : ok ? 'moved today' : `stuck at step ${firstStuck + 1}`}.">
          <line x1={x(0)} x2={x(STEPS - 1)} y1="22" y2="22" class="wire" class:live={ok} style:stroke={ok ? `var(--tkc-${row.tone})` : undefined} />
          {#if day > 0 && !ok && firstStuck >= 0}
            <line x1={x(0)} x2={x(firstStuck)} y1="22" y2="22" style:stroke="var(--tkc-ink-2)" class="wire" />
          {/if}
          {#each state as step, s}
            {@const covered = step.some(Boolean)}
            <rect x={x(s) - 26} y="4" width="52" height="36" rx="9" class="station" class:stuck={day > 0 && !covered} />
            {#each step as present, p}
              <circle cx={x(s) + (p - (row.people - 1) / 2) * 13} cy="22" r="5" class="person" class:away={!present} />
            {/each}
          {/each}
        </svg>
      {/each}
    </div>

    <div class="tallies" aria-live="polite">
      <div class="tally">
        <span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>
        <span>One named person per step: work moved on <strong class="tkc-num">{tally[0]}</strong> of {day} days</span>
      </div>
      <div class="tally">
        <span class="tkc-swatch" style:background="var(--tkc-options)"></span>
        <span>Any of three people per step: work moved on <strong class="tkc-num">{tally[1]}</strong> of {day} days</span>
      </div>
    </div>
    <p class="tkc-caption">
      Over a long run the top chain moves on 66% of days (0.9 × 0.9 × 0.9 × 0.9). The bottom chain moves on 99.6%:
      each step is only stuck when all three of its people are away.
    </p>
  </div>

  <div class="thesis" role="list">
    <p role="listitem"><span class="tkc-or">Good complexity</span> multiplies options.</p>
    <p role="listitem"><span class="tkc-and">Bad complexity</span> multiplies conditions.</p>
    <p role="listitem"><span class="scale">Scale</span> multiplies whichever you have.</p>
  </div>
  </div>

  <div class="start">
    <button type="button" class="tkc-btn tkc-btn--primary big" onclick={() => go(1)}>Start the story →</button>
    <span class="tkc-small">Nine short chapters. Use the chain at the top to jump anywhere.</span>
  </div>

  <ol class="toc">
    {#each CHAPTERS.slice(1) as chapter, i (chapter.id)}
      <li>
        <button type="button" onclick={() => go(i + 1)}>
          <span class="toc-n tkc-num">{i + 1}</span>
          <span class="toc-text">
            <span class="toc-title">{chapter.title}</span>
            <span class="toc-desc">{contents[i]}</span>
          </span>
        </button>
      </li>
    {/each}
  </ol>
</section>

<style>
  .intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: clamp(28px, 4.5cqi, 48px);
  }
  .masthead {
    display: grid;
    gap: 14px;
    max-width: 52rem;
  }
  .title {
    font-size: clamp(2.6rem, 1.2rem + 6.2cqi, 5.4rem);
    line-height: 0.98;
    letter-spacing: -0.025em;
  }
  .deck {
    font-size: clamp(1.15rem, 1rem + 0.7cqi, 1.45rem);
    line-height: 1.45;
    color: var(--tkc-ink-2);
    max-width: 40rem;
    text-wrap: pretty;
  }
  .pair {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: clamp(28px, 4.5cqi, 48px);
  }
  @container tkc (min-width: 1000px) {
    .pair {
      grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
      align-items: center;
    }
    .pair .thesis {
      font-size: clamp(1.6rem, 0.9rem + 1.6cqi, 2.3rem);
    }
  }
  .hero-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .rows {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
  .row-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 2px 12px;
    font-size: 0.8125rem;
    line-height: 1.35;
    margin-top: 6px;
  }
  .row-label {
    color: var(--tkc-ink-2);
  }
  .row-status {
    font-weight: 650;
    color: var(--tkc-ink);
  }
  .row-status.bad {
    color: var(--tkc-conditions-ink);
  }
  .wire {
    stroke: var(--tkc-rule);
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke 200ms ease;
  }
  .wire.live {
    stroke-dasharray: 10 6;
    animation: flow 650ms linear infinite;
  }
  @keyframes flow {
    to {
      stroke-dashoffset: -16;
    }
  }
  .station {
    fill: var(--tkc-surface);
    stroke: var(--tkc-rule);
    stroke-width: 1.5;
    transition: stroke 200ms ease, fill 200ms ease;
  }
  .station.stuck {
    stroke: var(--tkc-conditions);
    stroke-width: 2.5;
    fill: var(--tkc-conditions-wash);
  }
  .person {
    fill: var(--tkc-ink-2);
    stroke: var(--tkc-surface);
    stroke-width: 2;
    transition: fill 200ms ease;
  }
  .person.away {
    fill: var(--tkc-surface);
    stroke: var(--tkc-rule);
    stroke-width: 1.5;
  }
  .tallies {
    display: grid;
    gap: 6px;
    font-size: 0.9375rem;
  }
  .tally {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .thesis {
    display: grid;
    gap: 2px;
    font-family: var(--tkc-font-display);
    font-weight: 600;
    font-size: clamp(1.5rem, 1rem + 2.6cqi, 2.5rem);
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  .thesis .tkc-or,
  .thesis .tkc-and,
  .scale {
    font-weight: 600;
    text-decoration-thickness: 4px;
    text-underline-offset: 6px;
  }
  .scale {
    text-decoration-line: underline;
    text-decoration-color: var(--tkc-ink);
  }
  .start {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 18px;
  }
  .big {
    min-height: 48px;
    padding-inline: 1.4em;
    font-size: 1rem;
  }
  .toc {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  }
  .toc button {
    width: 100%;
    height: 100%;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    text-align: left;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--tkc-hair);
    background: var(--tkc-surface);
    color: var(--tkc-ink);
    cursor: pointer;
  }
  .toc button:hover {
    border-color: var(--tkc-ink-2);
  }
  .toc-n {
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--tkc-muted);
    min-width: 1.2em;
    padding-top: 2px;
  }
  .toc-text {
    display: grid;
    gap: 3px;
  }
  .toc-title {
    font-family: var(--tkc-font-display);
    font-weight: 600;
    font-size: 1.0625rem;
    line-height: 1.25;
  }
  .toc-desc {
    font-size: 0.875rem;
    line-height: 1.45;
    color: var(--tkc-ink-2);
  }
</style>
