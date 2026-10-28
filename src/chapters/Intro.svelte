<script>
  import { getContext } from 'svelte';
  import Hook from '../lib/ui/Hook.svelte';
  import { CHAPTERS, PARTS } from './index.js';

  const go = getContext('tkc-go');
  const game = getContext('tkc-game');
  // A returning reader picks up at the first chapter whose puzzle is still open.
  const started = $derived(game.ids.some((id) => !game.isOpen(id)));
  const resume = $derived(CHAPTERS.findIndex((c, i) => i > 0 && game.ids.includes(c.id) && game.isOpen(c.id)));
  const standing = (id) => {
    const e = game.entry(id);
    return e.status === 'solved' ? `✓ ${e.points} point${e.points === 1 ? '' : 's'}` : e.status === 'shown' ? 'Answer shown' : '';
  };
  const prefix = getContext('tkc-id') ?? 'tkc';
  const total = CHAPTERS.length - 1;

  const contents = {
    riddle: 'Why can a pencil’s chain of thousands beat a loan’s chain of six?',
    specialization: 'When does adding specialists make things cheaper, and not just longer?',
    systems: 'One loan, six linked systems, and a wrong field that travels.',
    queues: 'Four busy reviewers and one stream of requests: where does the waiting come from?',
    async: 'Five pieces of one client request: what really sets the pace?',
    emergence: 'One committee, five places, and a fast track any deal can take: what happens when every deal takes it?',
    ergodicity: 'A bet that pays 5% a round on paper and leaves most players poorer.',
    contagion: 'Forty-eight banks, one large loss: where does it stop, and where should extra capital go?',
    'black-swans': 'A toll road has paid 96 months in a row. Which year would it miss?',
    extinction: 'Two species, forty islands, and weather that grows less calm: which one lasts?',
    gate: 'On its lowest setting, a fraud screen flags 60 genuine clients a year to catch two frauds. Which payments are worth a call-back?',
    graph: 'Sixty people who must all work with each other: how much gets done?',
    knot: 'Twelve documents, twenty sensible clauses, and a power deal that cannot close: which clauses can wait until after the money?',
    modules: 'Two watchmakers, the same watch, and a phone that keeps ringing.',
    disbursement: 'A three-month promise, twelve conditions: how often is the money on time?',
    covenants: 'Twelve covenants on every loan, and 10 of 200 borrowers in real trouble: what does one breach tell the lender?',
    tools: 'The same AI with a person in the loop or on autopilot: which one gains when the AI turns erratic?',
    automation: 'A system that reads borrowers’ accounts and almost never fails: what does the day it fails cost, once nobody does its work any more?',
    variety: 'Sixty kinds of client request, offices that may decide ten of them, and a committee with five places a week: how many kinds should offices decide?',
    tinkering: 'A budget of 100, and nobody can tell which approach will work: one big programme, or pilots first?',
    redqueen: 'Checks catch three frauds in four in their first month. Reviewed every month, what do they catch in year three, once the other side has learned?',
    pace: 'After a crisis every lender adds links. How fast should the lesson fade?',
    monday: 'The patterns behind the puzzles, and your score.',
  };

</script>

<section class="intro" aria-labelledby="{prefix}-story-title">
  <header class="masthead">
    <div class="tkc-eyebrow">An interactive story in {game.ids.length} puzzles · every chart is live</div>
    <h1 class="tkc-display title" id="{prefix}-story-title" tabindex="-1">Two Kinds of Chains</h1>
    <p class="deck">
      Why some complexity makes a bank smarter, some makes it stall, and why the stall, when it comes, comes all at
      once.
    </p>
  </header>

  <Hook />

  <div class="thesis" role="list">
    <p role="listitem"><span class="tkc-or">Good complexity</span> multiplies options.</p>
    <p role="listitem"><span class="tkc-and">Bad complexity</span> multiplies conditions.</p>
    <p role="listitem"><span class="scale">Scale</span> multiplies whichever you have.</p>
  </div>
  <p class="howto">
    Each chapter is a short puzzle about one problem: what happens as a chain of conditions grows long and rigid, and what lets it bend and learn. Solve
    it unaided for two points, or after a hint or a wrong try for one. Stuck? Ask for the answer and read on.
  </p>

  <div class="start">
    {#if started && resume > 0}
      <button type="button" class="tkc-btn tkc-btn--primary big" onclick={() => go(resume)}>Continue: chapter {resume} →</button>
      <span class="tkc-small">Your score so far: {game.score} of {game.max} points. Chapters can be taken in any order.</span>
    {:else}
      <button type="button" class="tkc-btn tkc-btn--primary big" onclick={() => go(1)}>Start the story →</button>
      <span class="tkc-small">Chapters can be taken in any order from the top of the page.</span>
    {/if}
  </div>

  {#each PARTS as part, k (part)}
    <section class="part" aria-labelledby="{prefix}-part-{k + 1}">
      <h2 class="part-title" id="{prefix}-part-{k + 1}"><span class="part-n tkc-num">Part {k + 1}</span>{part}</h2>
      <ol class="toc">
        {#each CHAPTERS.map((c, i) => [c, i]).filter(([c]) => c.part === k + 1) as [chapter, i] (chapter.id)}
      <li>
        <button type="button" onclick={() => go(i)}>
          <span class="toc-n tkc-num">{i}</span>
          <span class="toc-text">
            <span class="toc-title">{chapter.title}</span>
            <span class="toc-desc">{contents[chapter.id]}</span>
            {#if standing(chapter.id)}<span class="toc-done" class:shown={game.entry(chapter.id).status === 'shown'}>{standing(chapter.id)}</span>{/if}
          </span>
        </button>
      </li>
        {/each}
      </ol>
    </section>
  {/each}
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
  @container tkc (max-width: 560px) {
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
  .howto {
    max-width: 40rem;
    font-size: 1.0625rem;
    line-height: 1.55;
    color: var(--tkc-ink-2);
    margin-top: -12px;
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
  .part {
    display: grid;
    gap: 12px;
  }
  .part-title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
    font-family: var(--tkc-font-display);
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.25;
  }
  .part-n {
    font-family: var(--tkc-font-body);
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--tkc-muted);
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
  .toc-done {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--tkc-options-ink);
  }
  .toc-done.shown {
    color: var(--tkc-muted);
    font-weight: 600;
  }
</style>
