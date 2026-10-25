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
    // Before a prediction puzzle's first answer, a chapter can keep the slider playable up to `limit`
    // (the range that does not give the answer away). The rest of the track is drawn dashed and locked,
    // and a line says what opens it: `limitNote`, or "Above … : opens after your first answer."
    limit = null,
    limitNote = '',
  } = $props();

  const prefix = getContext('tkc-id') ?? 'tkc';
  const inputId = $derived(`${prefix}-${id}`);
  const limited = $derived(limit !== null && limit < max);
  const top = $derived(limited ? Math.max(limit, min + step) : max);
  const pct = $derived(Math.max(0, Math.min(100, ((value - min) / (top - min)) * 100)));
  // The open part of the track keeps the scale of the whole: the thumb (18px) sits where it would on the full slider.
  const share = $derived((top - min) / (max - min));
  const note = $derived(limitNote || `Above ${format(limit)}: opens after your first answer.`);
  let nudged = $state(false);
  function nudge() {
    nudged = false;
    requestAnimationFrame(() => (nudged = true));
  }
</script>

<div class="ctl">
  <div class="top">
    <label for={inputId}>{label}</label>
    <output for={inputId} class="tkc-num" aria-hidden="true">{format(value)}</output>
  </div>
  <div class="track">
    <input
      id={inputId}
      type="range"
      {min}
      max={top}
      {step}
      bind:value
      aria-valuetext={format(value)}
      aria-describedby={limited ? `${inputId}-lock` : undefined}
      style:--pct="{pct}%"
      style:width={limited ? `calc(18px + (100% - 18px) * ${share})` : null}
    />
    {#if limited}
      <span class="rest" title={note} aria-hidden="true" onpointerdown={nudge}></span>
    {/if}
  </div>
  {#if ends}
    <div class="ends" aria-hidden="true"><span>{ends[0]}</span><span>{ends[1]}</span></div>
  {/if}
  {#if limited}
    <p class="tkc-lock-note" id="{inputId}-lock" data-tkc-nudge={nudged || undefined} onanimationend={() => (nudged = false)}>{note}</p>
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
  .track {
    display: flex;
    align-items: center;
    min-width: 0;
  }
  /* The locked part of the track: dashed, ending in a padlock, and not for pressing. */
  .rest {
    flex: 1;
    align-self: stretch;
    min-width: 12px;
    margin-left: -9px;
    background:
      var(--tkc-lock-icon) right center / 10px 12px no-repeat,
      repeating-linear-gradient(to right, var(--tkc-rule) 0 5px, transparent 5px 9px) left center / calc(100% - 16px) 2px no-repeat;
    cursor: not-allowed;
  }
  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    flex: none;
    position: relative;
    z-index: 1;
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
