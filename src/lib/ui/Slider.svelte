<script>
  import { getContext } from 'svelte';

  let {
    id,
    label,
    value = $bindable(),
    min,
    max,
    step = 1,
    format = (v) => String(v),
    ends = null,
  } = $props();

  const prefix = getContext('tkc-id') ?? 'tkc';
  const inputId = $derived(`${prefix}-${id}`);
  const pct = $derived(((value - min) / (max - min)) * 100);
</script>

<div class="ctl">
  <div class="top">
    <label for={inputId}>{label}</label>
    <output for={inputId} class="tkc-num" aria-hidden="true">{format(value)}</output>
  </div>
  <input id={inputId} type="range" {min} {max} {step} bind:value aria-valuetext={format(value)} style:--pct="{pct}%" />
  {#if ends}
    <div class="ends" aria-hidden="true"><span>{ends[0]}</span><span>{ends[1]}</span></div>
  {/if}
</div>

<style>
  .ctl {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }
  label {
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--tkc-ink);
  }
  output {
    font-size: 0.9375rem;
    font-weight: 650;
    color: var(--tkc-ink);
    white-space: nowrap;
  }
  .ends {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--tkc-muted);
    margin-top: -2px;
  }
  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 24px;
    margin: 0;
    background: transparent;
    cursor: pointer;
  }
  input[type='range']::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(to right, var(--tkc-ink) var(--pct), var(--tkc-rule) var(--pct));
  }
  input[type='range']::-moz-range-track {
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(to right, var(--tkc-ink) var(--pct), var(--tkc-rule) var(--pct));
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    margin-top: -7px;
    border-radius: 50%;
    background: var(--tkc-surface);
    border: 2px solid var(--tkc-ink);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.2);
  }
  input[type='range']::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--tkc-surface);
    border: 2px solid var(--tkc-ink);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.2);
  }
  input[type='range']:focus-visible {
    outline: none;
  }
  input[type='range']:focus-visible::-webkit-slider-thumb {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 2px;
  }
  input[type='range']:focus-visible::-moz-range-thumb {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 2px;
  }
</style>
