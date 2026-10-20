<script>
  let { label, value, sub = '', swatch = '', line = false } = $props();
</script>

<div class="tkc-stat">
  <span class="tkc-stat-label">{label}</span>
  <span class="tkc-stat-value">
    {#if swatch}<span class="tkc-swatch" class:tkc-swatch--line={line} style:background={swatch}></span>{/if}
    {value}
  </span>
  {#if sub}<span class="tkc-stat-sub">{sub}</span>{/if}
</div>
