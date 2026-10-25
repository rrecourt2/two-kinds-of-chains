<script>
  import { getContext } from 'svelte';

  // An option with `locked: true` waits for the reader's first answer to a prediction puzzle: it shows,
  // cannot be chosen, and `lockNote` says what opens it.
  let { name, label, options, value = $bindable(), onchange = null, lockNote = 'Locked options open after your first answer.' } = $props();
  const prefix = getContext('tkc-id') ?? 'tkc';
  const anyLocked = $derived(options.some((o) => o.locked));
  let nudged = $state(false);
  function nudge() {
    nudged = false;
    requestAnimationFrame(() => (nudged = true));
  }
</script>

<fieldset class="seg">
  <legend>{label}</legend>
  <div class="opts">
    {#each options as option, i (option.value)}
      <label class:on={value === option.value} class:locked={option.locked} title={option.locked ? lockNote : undefined} onpointerdown={option.locked ? nudge : undefined}>
        <input
          type="radio"
          id="{prefix}-{name}-{i}"
          name="{prefix}-{name}"
          checked={value === option.value}
          disabled={option.locked}
          aria-describedby={option.locked ? `${prefix}-${name}-lock` : undefined}
          onchange={() => (onchange ? onchange(option.value) : (value = option.value))}
        />
        <span>{option.label}</span>
      </label>
    {/each}
  </div>
  {#if anyLocked}
    <p class="tkc-lock-note" id="{prefix}-{name}-lock" data-tkc-nudge={nudged || undefined} onanimationend={() => (nudged = false)}>{lockNote}</p>
  {/if}
</fieldset>

<style>
  .seg {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
    display: grid;
    gap: 6px;
  }
  legend {
    padding: 0;
    margin-bottom: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--tkc-ink);
  }
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    padding: 3px;
    border-radius: 9px;
    background: var(--tkc-sunken);
  }
  label {
    flex: 1 1 auto;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    padding: 4px 10px;
    border-radius: 7px;
    font-size: 0.875rem;
    font-weight: 550;
    line-height: 1.25;
    text-align: center;
    color: var(--tkc-ink-2);
    cursor: pointer;
    transition: background-color 120ms ease, color 120ms ease;
  }
  label:hover {
    color: var(--tkc-ink);
  }
  /* Inverted, so the choice stands out from the track in light and dark themes alike. */
  label.on,
  label.on:hover {
    background: var(--tkc-ink);
    color: var(--tkc-page);
  }
  label.locked,
  label.locked:hover {
    color: var(--tkc-muted);
    outline: 1px dashed var(--tkc-rule);
    outline-offset: -3px;
    cursor: not-allowed;
  }
  label.locked span {
    opacity: 0.7;
  }
  input {
    position: absolute;
    opacity: 0;
    inset: 0;
    margin: 0;
    cursor: pointer;
  }
  input:disabled {
    cursor: not-allowed;
  }
  label:has(input:focus-visible) {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 1px;
  }
</style>
