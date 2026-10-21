<script>
  import { getContext } from 'svelte';
  import Hook from '../lib/ui/Hook.svelte';
  import { CHAPTERS } from './index.js';

  const go = getContext('tkc-go');
  const prefix = getContext('tkc-id') ?? 'tkc';
  const total = CHAPTERS.length - 1;

  const contents = {
    riddle: 'Why a pencil’s long supply chain beats a short chain of sign-offs.',
    specialization: 'Adam Smith’s pin workshop, the chip industry, and splitting at the right level.',
    systems: 'One request, six linked systems: how a missing field becomes a week.',
    queues: 'Why busy experts slow everyone down, and how one shared line fixes it.',
    async: 'The breakfast factory: start what can start, and keep bad inputs out first.',
    emergence: 'A new road that makes every journey slower, and the risk of optimizing locally.',
    tools: 'UI fatigue, and AI as a tool that works the screens or as one more gate.',
    ergodicity: 'A coin game in which average wealth soars while the typical player goes broke.',
    contagion: 'How a network of banks absorbs small shocks and spreads big ones.',
    'black-swans': 'The turkey problem: why the data hides the risks that matter most.',
    survivors: 'Where to armour a bomber, and what the missing data would have said.',
    extinction: 'Specialists, generalists, and the danger of depending on one thing.',
    graph: 'Why a network’s shape, not its size, decides whether growth helps.',
    winners: 'Twenty equal firms, one winner: how small leads become whole markets.',
    monday: 'A two-question test for every step, and a tool to check a process you know.',
  };

</script>

<section class="intro" aria-labelledby="{prefix}-story-title">
  <header class="masthead">
    <div class="tkc-eyebrow">An interactive story · 15 short chapters · every chart is live</div>
    <h1 class="tkc-display title" id="{prefix}-story-title" tabindex="-1">Two Kinds of Chains</h1>
    <p class="deck">
      Why some complexity makes a bank smarter, some makes it stall, and why scale amplifies whichever kind you have.
    </p>
  </header>

  <Hook />

  <div class="thesis" role="list">
    <p role="listitem"><span class="tkc-or">Good complexity</span> multiplies options.</p>
    <p role="listitem"><span class="tkc-and">Bad complexity</span> multiplies conditions.</p>
    <p role="listitem"><span class="scale">Scale</span> multiplies whichever you have.</p>
  </div>

  <div class="start">
    <button type="button" class="tkc-btn tkc-btn--primary big" onclick={() => go(1)}>Start the story →</button>
    <span class="tkc-small">{total} short chapters. Use the chain at the top to jump anywhere.</span>
  </div>

  <ol class="toc">
    {#each CHAPTERS.slice(1) as chapter, i (chapter.id)}
      <li>
        <button type="button" onclick={() => go(i + 1)}>
          <span class="toc-n tkc-num">{i + 1}</span>
          <span class="toc-text">
            <span class="toc-title">{chapter.title}</span>
            <span class="toc-desc">{contents[chapter.id]}</span>
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
    font-size: clamp(2.6rem, 1.2rem + 5cqi, 4.5rem);
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
  /* On a phone the guess comes first; the thesis further down says the same. */
  @container tkc (max-width: 560px) {
    .deck {
      display: none;
    }
    .masthead {
      gap: 8px;
    }
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
    min-width: 1.4em;
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
