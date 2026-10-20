<script>
  // `quiet` keeps an animated value out of the screen-reader summary (see announce.js).
  let { label, value, sub = '', swatch = '', line = false, quiet = false } = $props();
</script>

<div class="tkc-stat" data-quiet={quiet || undefined}>
  <span class="tkc-stat-label">
    {#if swatch}<span class="tkc-swatch" class:tkc-swatch--line={line} style:background={swatch} aria-hidden="true"></span>{/if}
    {label}
  </span>
  <span class="tkc-stat-value">{value}</span>
  {#if sub}<span class="tkc-stat-sub">{sub}</span>{/if}
</div>
