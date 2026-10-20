<script>
  import { getContext } from 'svelte';

  let { n, kicker, title, lede = '', setup, figure, after, bank } = $props();
  const prefix = getContext('tkc-id') ?? 'tkc';
</script>

<article class="chapter" aria-labelledby="{prefix}-chapter-title">
  <header class="head">
    <div class="tkc-eyebrow">Chapter {n} of 9 · {kicker}</div>
    <h2 class="tkc-display tkc-chapter-title" id="{prefix}-chapter-title">{title}</h2>
    {#if lede}<p class="tkc-lede">{lede}</p>{/if}
  </header>

  <div class="grid">
    <div class="setup tkc-prose">{@render setup()}</div>
    <div class="fig">{@render figure()}</div>
    {#if after}<div class="after tkc-prose">{@render after()}</div>{/if}
  </div>

  {#if bank}{@render bank()}{/if}
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
