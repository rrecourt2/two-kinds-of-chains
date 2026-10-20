<script>
  let { children, ask = '' } = $props();
</script>

<aside class="tkc-bank" aria-label="Back at the bank">
  <div class="tkc-bank-label">
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 1.5 16.5 5.5H1.5Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
      <path d="M3.5 7.5v6M7 7.5v6M11 7.5v6M14.5 7.5v6M1.5 16h15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>
    <span class="tkc-eyebrow">Back at the bank</span>
  </div>
  <div class="tkc-prose">{@render children()}</div>
  {#if ask}<p class="tkc-ask"><strong>Ask your team:</strong> {ask}</p>{/if}
</aside>

<style>
  svg {
    color: var(--tkc-muted);
    flex: none;
  }
</style>
