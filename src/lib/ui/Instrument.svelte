<script>
  let { title, sub = '', children, model } = $props();
</script>

<figure class="tkc-fig">
  <figcaption class="tkc-fig-head">
    <span class="tkc-fig-title">{title}</span>
    {#if sub}<span class="tkc-small">{sub}</span>{/if}
  </figcaption>
  {@render children()}
  {#if model}
    <details class="tkc-note">
      <summary>How this model works</summary>
      <div class="model">{@render model()}</div>
    </details>
  {/if}
</figure>

<style>
  .model {
    display: grid;
    gap: 6px;
  }
</style>
