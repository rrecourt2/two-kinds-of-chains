<script>
  // One chapter's challenge. A target puzzle is solved the moment the figure meets its
  // goal; a choice puzzle is solved by picking the right answer. Hints and wrong tries
  // lower the points from two to one; "Show me the answer" sets the figure and gives none.
  import { getContext, untrack } from 'svelte';

  let {
    id,
    goal,
    met = false,
    progress = '',
    choices = null,
    answer = null,
    multi = false,
    hints = [],
    onshow = null,
    found = '',
    wrong = null,
    picked = $bindable(multi ? [] : null),
  } = $props();

  const game = getContext('tkc-game');
  const prefix = getContext('tkc-id') ?? 'tkc';
  const e = $derived(game.entry(id));
  const open = $derived(e.status === 'open');
  let hintsShown = $state(0);
  let feedback = $state('');
  // A new pick, here or in the figure, clears the last feedback.
  $effect(() => {
    picked;
    untrack(() => (feedback = ''));
  });

  // A target puzzle counts as solved as soon as the figure meets the goal.
  $effect(() => {
    if (!choices && met && open) game.solve(id);
  });

  const same = (a, b) => a.length === b.length && a.every((v) => b.includes(v));
  function pick(value, on) {
    if (multi) picked = on ? [...picked, value] : picked.filter((v) => v !== value);
    else picked = value;
  }
  function check() {
    const ok = multi ? same(picked, answer) : picked === answer;
    if (ok) {
      game.solve(id);
      feedback = '';
    } else {
      game.help(id);
      feedback = wrong?.(picked) ?? 'Not this one. The figure can help; then try again.';
    }
  }
  function hint() {
    if (hintsShown >= hints.length) return;
    hintsShown += 1;
    game.help(id);
  }
  function show() {
    game.show(id);
    onshow?.();
  }
  const status = $derived(
    e.status === 'solved' ? `Solved: ${e.points} point${e.points === 1 ? '' : 's'}` : e.status === 'shown' ? 'Answer shown' : e.help ? 'Worth 1 point' : 'Worth 2 points',
  );
</script>

<section class="puzzle" class:done={!open} aria-labelledby="{prefix}-{id}-pz">
  <div class="head">
    <span class="tkc-eyebrow" id="{prefix}-{id}-pz">Puzzle</span>
    <span class="state" class:solved={e.status === 'solved'}>{status}</span>
  </div>
  <p class="goal">{goal}</p>

  {#if open}
    {#if choices}
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
      <div class="row">
        <button type="button" class="tkc-btn tkc-btn--primary tkc-btn--small" onclick={check} disabled={multi ? !picked.length : picked === null}>Check</button>
      </div>
    {:else if progress}
      <p class="progress">{progress}</p>
    {/if}
    {#if feedback}<p class="feedback">{feedback}</p>{/if}
    {#if hintsShown}
      <ul class="hints">
        {#each hints.slice(0, hintsShown) as h (h)}<li>{h}</li>{/each}
      </ul>
    {/if}
    <div class="row actions">
      {#if hintsShown < hints.length}
        <button type="button" class="tkc-btn tkc-btn--small" onclick={hint}>{hintsShown ? 'Another hint' : 'Hint'}</button>
      {/if}
      <button type="button" class="link" onclick={show}>Show me the answer</button>
    </div>
  {:else if found}
    <p class="found">{found}</p>
  {/if}
  <p class="tkc-sr" aria-live="polite">{open ? feedback : `${status}. ${found}`}</p>
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
  }
  .puzzle.done {
    border-left-color: var(--tkc-ink-2);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .state {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--tkc-muted);
    white-space: nowrap;
  }
  .state.solved {
    color: var(--tkc-options-ink);
  }
  .goal {
    font-weight: 600;
    color: var(--tkc-ink);
    line-height: 1.45;
    text-wrap: pretty;
  }
  .progress,
  .feedback,
  .found {
    font-size: 0.9375rem;
    color: var(--tkc-ink-2);
  }
  .feedback {
    color: var(--tkc-conditions-ink);
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
  .link {
    border: 0;
    background: none;
    padding: 4px 0;
    min-height: 24px;
    color: var(--tkc-muted);
    font: inherit;
    font-size: 0.875rem;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  .link:hover {
    color: var(--tkc-ink);
  }
  .link:focus-visible {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 2px;
  }
</style>
