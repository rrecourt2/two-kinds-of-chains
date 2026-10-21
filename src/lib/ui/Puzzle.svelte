<script>
  // One chapter's challenge. A target puzzle is solved once the figure rests on its goal;
  // a choice puzzle is solved by picking the right answer. Hints and wrong tries lower
  // the points from two to one; "Show me the answer" sets the figure and gives none.
  import { getContext, tick, untrack } from 'svelte';
  import { fly, slide } from 'svelte/transition';
  import { prefersReducedMotion } from '../motion.js';

  let {
    id,
    goal,
    met = false,
    progress = '',
    checks = null,
    choices = null,
    answer = null,
    multi = false,
    hints = [],
    onshow = null,
    found = '',
    wrong = null,
    predict = false,
    picker = null,
    picked = $bindable(multi ? [] : null),
  } = $props();

  const game = getContext('tkc-game');
  const ms = prefersReducedMotion() ? 0 : 220;
  const prefix = getContext('tkc-id') ?? 'tkc';
  const e = $derived(game.entry(id));
  const open = $derived(e.status === 'open');
  const waiting = $derived(predict && open && !game.engaged(id));
  let hintsShown = $state(0);
  let feedback = $state('');
  let foundEl = $state();
  let hintsEl = $state();

  // A target puzzle counts once the figure has rested on the goal, not while a slider sweeps past it.
  $effect(() => {
    if (choices || !met || !open) return;
    const t = setTimeout(() => game.solve(id), 700);
    return () => clearTimeout(t);
  });

  // A new pick, here or in the figure, clears the last feedback.
  $effect(() => {
    picked;
    untrack(() => (feedback = ''));
  });

  const same = (a, b) => a.length === b.length && a.every((v) => b.includes(v));
  function pick(value, on) {
    if (multi) picked = on ? [...picked, value] : picked.filter((v) => v !== value);
    else picked = value;
  }
  async function reveal() {
    await tick();
    foundEl?.focus();
  }
  function check() {
    const ok = multi ? same(picked, answer) : picked === answer;
    if (ok) {
      game.solve(id);
      reveal();
    } else {
      game.help(id);
      feedback = `Not quite. ${wrong?.(picked) ?? 'The figure can help; then try again.'}`;
    }
  }
  async function hint() {
    if (hintsShown >= hints.length) return;
    hintsShown += 1;
    game.help(id);
    // The hint button disappears after the last hint, so keep the reader's place.
    if (hintsShown === hints.length) {
      await tick();
      hintsEl?.querySelector('li:last-child')?.focus();
    }
  }
  function show() {
    game.show(id);
    onshow?.();
    reveal();
  }
  function toExplanation() {
    const el = document.getElementById(`${prefix}-after`);
    el?.scrollIntoView({ block: 'start' });
    el?.focus({ preventScroll: true });
  }
  // Chapters have an explanation below the figure; the playbook does not.
  let hasExplanation = $state(false);
  $effect(() => {
    hasExplanation = !open && !!document.getElementById(`${prefix}-after`);
  });
  const status = $derived(
    e.status === 'solved' ? `Solved · ${e.points} point${e.points === 1 ? '' : 's'}` : e.status === 'shown' ? 'Answer shown' : e.help ? 'Worth 1 point' : 'Worth 2 points',
  );
  const latestHint = $derived(hintsShown ? hints[hintsShown - 1] : '');
</script>

<section class="puzzle" class:solved={e.status === 'solved'} class:shown={e.status === 'shown'} id="{prefix}-{id}-puzzle" tabindex="-1" aria-labelledby="{prefix}-{id}-pz">
  <div class="head">
    <span class="tkc-eyebrow" id="{prefix}-{id}-pz">Puzzle</span>
    {#key e.status}
      <span class="state" class:pop={e.status === 'solved'}>{#if e.status === 'solved'}<span class="tick" aria-hidden="true">✓</span>{/if}{status}</span>
    {/key}
  </div>
  <p class="goal">{goal}</p>

  {#if open}
    {#if checks?.length}
      <ul class="checks">
        {#each checks as c (c.label)}
          <li class:ok={c.ok}><span class="mark" aria-hidden="true">{c.ok ? '✓' : '○'}</span><span class="tkc-sr">{c.ok ? 'Met: ' : 'Not yet: '}</span>{c.label}</li>
        {/each}
      </ul>
    {/if}
    {#if choices}
      {#if picker}
        {@render picker()}
      {:else}
        <fieldset class="choices">
          <legend class="tkc-sr">{multi ? 'Choose all that apply' : 'Choose one'}</legend>
          {#each choices as c, i (c.value)}
            {@const on = multi ? picked.includes(c.value) : picked === c.value}
            <label class:on>
              <input
                type={multi ? 'checkbox' : 'radio'}
                name="{prefix}-{id}-choice"
                id="{prefix}-{id}-c{i}"
                checked={on}
                onchange={(ev) => pick(c.value, ev.currentTarget.checked)}
              />
              <span>{c.label}</span>
            </label>
          {/each}
        </fieldset>
      {/if}
      {#if waiting}<p class="note">Answer first for 2 points: the figure below opens after your first answer. A hint opens it now, for 1 point.</p>{/if}
      <div class="row">
        <button type="button" class="tkc-btn tkc-btn--primary tkc-btn--small" onclick={check} disabled={multi ? !picked.length : picked === null}>Check</button>
      </div>
    {:else if progress}
      <p class="progress">{progress}</p>
    {/if}
    {#if feedback}<p class="feedback" transition:slide={{ duration: ms }}>{feedback}</p>{/if}
    {#if hintsShown}
      <ul class="hints" bind:this={hintsEl}>
        {#each hints.slice(0, hintsShown) as h (h)}<li tabindex="-1" in:fly={{ y: -6, duration: ms }}>{h}</li>{/each}
      </ul>
    {/if}
    <div class="row actions">
      {#if hintsShown < hints.length}
        <button type="button" class="tkc-btn tkc-btn--small" onclick={hint}>{hintsShown ? 'Another hint' : e.help ? 'Hint' : 'Hint (−1 point)'}</button>
      {/if}
      <button type="button" class="link" onclick={show}>Show me the answer</button>
    </div>
  {:else}
    {#if found}<p class="found" tabindex="-1" bind:this={foundEl} in:fly={{ y: 8, duration: ms * 1.6 }}>{found}</p>{/if}
    {#if picker}{@render picker()}{/if}
    {#if hasExplanation}
      <div class="row"><button type="button" class="link strong" onclick={toExplanation}>Why it works ↓</button></div>
    {/if}
  {/if}
  <p class="tkc-sr" aria-live="polite">{open ? feedback || latestHint : `${status}. ${found}`}</p>
</section>

<style>
  .puzzle {
    display: grid;
    gap: 8px;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--tkc-hair);
    border-left: 4px solid var(--tkc-options);
    background: var(--tkc-page);
    scroll-margin-top: 72px;
  }
  .puzzle:focus {
    outline: none;
  }
  .puzzle.solved {
    background: var(--tkc-options-wash);
  }
  .puzzle.shown {
    border-left-color: var(--tkc-ink-2);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .state {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--tkc-muted);
    white-space: nowrap;
  }
  .solved .state {
    color: var(--tkc-options-ink);
  }
  .tick {
    font-size: 0.9375rem;
  }
  .pop {
    animation: pop 420ms ease-out both;
  }
  @keyframes pop {
    0% {
      transform: scale(0.85);
      opacity: 0;
    }
    60% {
      transform: scale(1.12);
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pop {
      animation: none;
    }
  }
  .goal {
    font-weight: 600;
    color: var(--tkc-ink);
    line-height: 1.45;
    text-wrap: pretty;
  }
  .progress,
  .feedback,
  .found,
  .note {
    font-size: 0.9375rem;
    color: var(--tkc-ink-2);
  }
  .found:focus {
    outline: none;
  }
  .note {
    color: var(--tkc-muted);
    font-size: 0.875rem;
  }
  .feedback {
    color: var(--tkc-conditions-ink);
  }
  .checks {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 4px;
    font-size: 0.9375rem;
    color: var(--tkc-ink-2);
  }
  .checks li {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  .mark {
    flex: none;
    width: 1em;
    text-align: center;
    font-weight: 700;
    color: var(--tkc-muted);
    transition: color 200ms ease;
  }
  .checks li {
    transition: color 200ms ease;
  }
  .checks li.ok .mark {
    color: var(--tkc-options-ink);
  }
  .checks li.ok {
    color: var(--tkc-ink);
  }
  .choices {
    border: 0;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .choices label {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--tkc-hair);
    background: var(--tkc-surface);
    cursor: pointer;
    font-size: 0.9375rem;
    line-height: 1.4;
  }
  .choices label.on {
    border-color: var(--tkc-options);
    background: var(--tkc-options-wash);
  }
  .choices input {
    margin-top: 3px;
    accent-color: var(--tkc-options);
  }
  .choices input:focus-visible {
    outline: none;
  }
  .choices label:has(input:focus-visible) {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 2px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    align-items: center;
  }
  .hints {
    margin: 0;
    padding-left: 1.2em;
    font-size: 0.9375rem;
    color: var(--tkc-ink-2);
    display: grid;
    gap: 4px;
  }
  .hints li:focus {
    outline: none;
  }
  .link {
    border: 0;
    background: none;
    padding: 4px 0;
    min-height: 32px;
    color: var(--tkc-muted);
    font: inherit;
    font-size: 0.875rem;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  .link.strong {
    color: var(--tkc-options-ink);
    font-weight: 600;
  }
  .link:hover {
    color: var(--tkc-ink);
  }
  .link:focus-visible {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 2px;
  }
</style>
