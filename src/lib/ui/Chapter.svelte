<script>
  import { getContext } from 'svelte';

  let { n, kicker, title, lede = '', puzzle = null, setup, figure, after, bank } = $props();
  const prefix = getContext('tkc-id') ?? 'tkc';
  const total = getContext('tkc-total') ?? 12;
  const game = getContext('tkc-game');
  // The explanation waits until the chapter's puzzle is solved or its answer shown.
  const unlocked = $derived(!puzzle || !game || !game.isOpen(puzzle));
</script>

<article class="chapter" aria-labelledby="{prefix}-chapter-title">
  <header class="head">
    <div class="tkc-eyebrow">Chapter {n} of {total} · {kicker}</div>
    <h2 class="tkc-display tkc-chapter-title" id="{prefix}-chapter-title" tabindex="-1">{title}</h2>
    {#if lede}<p class="tkc-lede">{lede}</p>{/if}
  </header>

  <div class="grid">
    <div class="setup tkc-prose">{@render setup()}</div>
    <div class="fig">{@render figure()}</div>
    {#if after}
      <div class="after tkc-prose">
        {#if unlocked}
          {@render after()}
        {:else}
          <p class="locked">What the puzzle shows is explained here once you have solved it, or chosen “Show me the answer”.</p>
        {/if}
      </div>
    {/if}
  </div>

  {#if bank && unlocked}{@render bank()}{/if}
</article>

<style>
  .chapter {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: clamp(24px, 4cqi, 40px);
  }
  .head {
    display: grid;
    gap: 12px;
    max-width: 48rem;
  }
  .grid {
    display: grid;
    gap: 28px;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'setup' 'fig' 'after';
  }
  .setup {
    grid-area: setup;
  }
  .fig {
    grid-area: fig;
    min-width: 0;
  }
  .after {
    grid-area: after;
  }
  .locked {
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px dashed var(--tkc-rule);
    color: var(--tkc-muted);
    font-size: 0.9375rem;
  }
  @container tkc (min-width: 1000px) {
    .grid {
      grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
      grid-template-areas: 'setup fig' 'after fig';
      grid-template-rows: auto 1fr;
      column-gap: clamp(32px, 4cqi, 56px);
      align-items: start;
    }
  }
</style>
