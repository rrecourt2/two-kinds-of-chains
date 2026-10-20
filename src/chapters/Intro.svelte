<script>
  import { getContext } from 'svelte';
  import Hook from '../lib/ui/Hook.svelte';
  import { CHAPTERS } from './index.js';

  const go = getContext('tkc-go');
  const prefix = getContext('tkc-id') ?? 'tkc';
  const total = CHAPTERS.length - 1;

  const contents = {
    riddle: 'Why a pencil’s long supply chain beats a short chain of sign-offs.',
    specialization: 'Adam Smith’s pin workshop: specialists pay off, but only at scale.',
    systems: 'One request, six linked systems: how a missing field becomes a week.',
    queues: 'Why busy experts slow everyone down, and how one shared line fixes it.',
    breakfast: 'Andrew Grove’s famous lesson in production, and where it breaks.',
    ergodicity: 'A coin game that makes the average player rich and the typical player broke.',
    contagion: 'How a network of banks absorbs small shocks and spreads big ones.',
    'black-swans': 'The turkey problem: why the data hides the risks that matter most.',
    extinction: 'Specialists, generalists, and the danger of depending on one thing.',
    graph: 'Graph theory, Simon’s watchmakers, and why modular systems stay flexible.',
    tools: 'UI fatigue, and AI as a tool that works the screens or as one more gate.',
    monday: 'A two-question test for every step, and a tool to check a process you know.',
  };

  const minute = [
    { ch: 'monday', text: 'Keep the controls. Change their shape: alternatives at every link, one shared record, reviews in parallel or once at the end, spare capacity.' },
    { ch: 'riddle', text: 'Chains multiply. Six links that each work 95% of the time make a 74% process. Give every link an alternative and it is 99%.' },
    { ch: 'systems', text: 'Linked systems spread problems. When each system copies the last, one wrong field stops the request and must be fixed everywhere it went. With one shared record, data is entered once, fixed once and approved in parallel.' },
    { ch: 'queues', text: 'Full calendars are queues. At 90% busy, a one-hour review waits about nine hours.' },
    { ch: 'ergodicity', text: 'Averages mislead when outcomes multiply, and the data hides the rare event. Survival comes first.' },
    { ch: 'tools', text: 'Tools beat gates. AI that fills in the screens for people, with a person checking, eases UI fatigue. AI added as one more mandatory screen adds to it.' },
  ];
</script>

<section class="intro" aria-labelledby="{prefix}-story-title">
  <header class="masthead">
    <div class="tkc-eyebrow">An interactive story · about 20 minutes · every chart is live</div>
    <h1 class="tkc-display title" id="{prefix}-story-title" tabindex="-1">Two Kinds of Chains</h1>
    <p class="deck">
      Why some complexity makes a bank smarter, some makes it stall, and why scale amplifies whichever kind you have.
    </p>
  </header>

  <Hook />

  <div class="pair">
    <section class="minute" aria-labelledby="{prefix}-minute">
      <h2 class="tkc-eyebrow" id="{prefix}-minute">If you have one minute</h2>
      <ul>
        {#each minute as item (item.ch)}
          {@const n = CHAPTERS.findIndex((c) => c.id === item.ch)}
          <li>
            <span>{item.text}</span>
            <button type="button" class="see" onclick={() => go(item.ch)}>Chapter {n}</button>
          </li>
        {/each}
      </ul>
    </section>

    <div class="thesis" role="list">
      <p role="listitem"><span class="tkc-or">Good complexity</span> multiplies options.</p>
      <p role="listitem"><span class="tkc-and">Bad complexity</span> multiplies conditions.</p>
      <p role="listitem"><span class="scale">Scale</span> multiplies whichever you have.</p>
    </div>
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
  .pair {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: clamp(28px, 4.5cqi, 48px);
  }
  @container tkc (min-width: 1000px) {
    .pair {
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
      align-items: center;
    }
    .pair .thesis {
      font-size: clamp(1.6rem, 0.9rem + 1.6cqi, 2.3rem);
    }
  }
  .minute {
    display: grid;
    gap: 12px;
    padding: 18px 20px;
    border-radius: 12px;
    background: var(--tkc-surface);
    border: 1px solid var(--tkc-hair);
  }
  .minute ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
  }
  .minute li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 14px;
    font-size: 0.9375rem;
    line-height: 1.45;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--tkc-hair);
  }
  .minute li:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }
  .see {
    flex: none;
    border: 0;
    background: none;
    padding: 0;
    color: var(--tkc-options-ink);
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
    white-space: nowrap;
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
