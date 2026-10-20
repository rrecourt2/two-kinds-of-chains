<script>
  import { getContext } from 'svelte';

  let { name, label, options, value = $bindable() } = $props();
  const prefix = getContext('tkc-id') ?? 'tkc';
</script>

<fieldset class="seg">
  <legend>{label}</legend>
  <div class="opts">
    {#each options as option, i (option.value)}
      <label class:on={value === option.value}>
        <input
          type="radio"
          id="{prefix}-{name}-{i}"
          name="{prefix}-{name}"
          checked={value === option.value}
          onchange={() => (value = option.value)}
        />
        <span>{option.label}</span>
      </label>
    {/each}
  </div>
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
  label.on {
    background: var(--tkc-surface);
    color: var(--tkc-ink);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
  }
  input {
    position: absolute;
    opacity: 0;
    inset: 0;
    margin: 0;
    cursor: pointer;
  }
  label:has(input:focus-visible) {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 1px;
  }
</style>
