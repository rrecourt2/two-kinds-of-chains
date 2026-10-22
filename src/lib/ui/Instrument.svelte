<script>
  import { getContext, tick } from 'svelte';

  let { title, sub = '', rules = [], children, model } = $props();
  const prefix = getContext('tkc-id') ?? 'tkc';
  // Provided by the story shell: builds the chapter afresh, so every control returns to where it started.
  const reset = getContext('tkc-reset');

  async function again() {
    await reset?.();
    await tick();
    document.getElementById(`${prefix}-fig-reset`)?.focus();
  }
</script>

<figure class="tkc-fig">
  <figcaption class="tkc-fig-head">
    <span class="top">
      <span class="tkc-fig-title">{title}</span>
      {#if reset}<button type="button" class="reset" id="{prefix}-fig-reset" onclick={again} title="Put this figure back as it started">↺ Reset</button>{/if}
    </span>
    {#if sub}<span class="tkc-small">{sub}</span>{/if}
  </figcaption>
  <!-- The model's few assumptions, in plain words, before the puzzle asks anything. -->
  {#if rules.length}
    <div class="rules">
      <span class="tkc-eyebrow">In this model</span>
      <ul>
        {#each rules as rule (rule)}<li>{rule}</li>{/each}
      </ul>
    </div>
  {/if}
  {@render children()}
  {#if model}
    <details class="tkc-note">
      <summary>How this model works</summary>
      <div class="model">{@render model()}</div>
    </details>
  {/if}
</figure>

<style>
  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .reset {
    flex: none;
    border: 1px solid var(--tkc-hair);
    background: var(--tkc-surface);
    border-radius: 999px;
    padding: 3px 10px;
    min-height: 28px;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--tkc-ink-2);
    cursor: pointer;
  }
  .reset:hover {
    border-color: var(--tkc-ink-2);
    color: var(--tkc-ink);
  }
  .reset:focus-visible {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 2px;
  }
  .model {
    display: grid;
    gap: 6px;
  }
  .rules {
    display: grid;
    gap: 4px;
    padding: 10px 14px;
    border-radius: 10px;
    background: var(--tkc-sunken);
  }
  .rules ul {
    margin: 0;
    padding-left: 1.1em;
    display: grid;
    gap: 2px;
    font-size: 0.9375rem;
    line-height: 1.45;
    color: var(--tkc-ink-2);
  }
</style>
