<script>
  let { items } = $props();
</script>

<div class="tkc-try">
  <span class="tkc-eyebrow">Try this</span>
  <div class="tkc-try-list">
    {#each items as item (item.label)}
      <button type="button" onclick={item.apply}>{item.label}</button>
    {/each}
  </div>
</div>
