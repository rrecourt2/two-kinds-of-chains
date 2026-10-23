<script module>
  let instances = 0;
</script>

<script>
  import { setContext, tick } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { CHAPTERS } from './chapters/index.js';
  import { prefersReducedMotion } from './lib/motion.js';
  import { createGame } from './lib/game.svelte.js';

  let { theme = 'auto', syncHash = false, startAt } = $props();

  const prefix = instances++ ? `tkc${instances}` : 'tkc';
  const total = CHAPTERS.length - 1;
  setContext('tkc-id', prefix);
  setContext('tkc-total', total);
  // A chapter's number comes from its place in the story, so chapters can move without renumbering.
  setContext('tkc-number', (id) => CHAPTERS.findIndex((c) => c.id === id));
  // Every chapter has a puzzle except the playbook at the end.
  const game = createGame(CHAPTERS.filter((c) => c.puzzle !== false).map((c) => c.id));
  setContext('tkc-game', game);
  const solvedHere = (id) => game.entry(id).status === 'solved';
  const shownHere = (id) => game.entry(id).status === 'shown';

  function indexFromHash() {
    if (!syncHash) return -1;
    try {
      const id = decodeURIComponent(window.location.hash.slice(1));
      return CHAPTERS.findIndex((c) => c.id === id);
    } catch {
      return -1;
    }
  }

  function initialIndex() {
    const fromHash = indexFromHash();
    if (fromHash >= 0) return fromHash;
    const fromProp = CHAPTERS.findIndex((c) => c.id === startAt);
    return fromProp >= 0 ? fromProp : 0;
  }

  let index = $state(initialIndex());
  let visited = $state(CHAPTERS.map((_, i) => i === index));
  let top = $state();
  let root = $state();
  let menuEl = $state();
  function closeMenu(refocus = false) {
    if (!menuEl?.open) return;
    menuEl.open = false;
    if (refocus) menuEl.querySelector('summary')?.focus();
  }

  const headingId = (i) => (i === 0 ? `${prefix}-story-title` : `${prefix}-chapter-title`);
  function focusHeading() {
    document.getElementById(headingId(index))?.focus({ preventScroll: true });
  }
  function setTitle() {
    if (syncHash) document.title = index === 0 ? 'Two Kinds of Chains' : `${CHAPTERS[index].title} · Two Kinds of Chains`;
  }
  setTitle();

  const current = $derived(CHAPTERS[index]);
  const Current = $derived(current.component);
  const prev = $derived(index > 0 ? CHAPTERS[index - 1] : null);
  const next = $derived(index < CHAPTERS.length - 1 ? CHAPTERS[index + 1] : null);

  // On the standalone page, chapters slide in with a view transition; a host page is left alone.
  const useTransitions = syncHash && typeof document !== 'undefined' && 'startViewTransition' in document;

  // A chapter chosen in the story gets its own history entry, so the browser's Back button returns to the
  // previous chapter; a move that comes from the history itself (Back, Forward, a typed hash) adds none.
  let going = -1;
  async function go(target, fromHistory = false) {
    const i = typeof target === 'string' ? CHAPTERS.findIndex((c) => c.id === target) : target;
    if (i < 0 || i >= CHAPTERS.length || i === index || i === going) return;
    going = i;
    const animate = useTransitions && !prefersReducedMotion();
    const swap = async () => {
      index = i;
      visited[i] = true;
      if (syncHash && !fromHistory) {
        try {
          history.pushState(null, '', `#${CHAPTERS[i].id}`);
        } catch {
          /* the host may not allow URL changes */
        }
      }
      setTitle();
      closeMenu();
      await tick();
      top?.scrollIntoView({ block: 'start', behavior: animate || prefersReducedMotion() ? 'auto' : 'smooth' });
    };
    if (animate) {
      document.documentElement.dataset.tkcDir = i > index ? 'forward' : 'back';
      await document.startViewTransition(swap).updateCallbackDone;
    } else {
      await swap();
    }
    going = -1;
    // Move keyboard and screen-reader users to the new chapter, not the button they left behind.
    focusHeading();
  }
  setContext('tkc-go', go);

  // "Reset" on a figure builds the chapter afresh, so every control returns to where it started.
  let fresh = $state(0);
  async function resetView() {
    fresh += 1;
    await tick();
  }
  setContext('tkc-reset', resetView);

  // The score in the header counts up, and opens a small panel with a reset.
  const shownScore = new Tween(game.score, { duration: 600 });
  let pulse = $state(false);
  let lastScore = game.score;
  $effect(() => {
    const s = game.score;
    shownScore.set(s, { duration: prefersReducedMotion() ? 0 : 600 });
    if (s > lastScore) {
      pulse = false;
      requestAnimationFrame(() => (pulse = true));
    }
    lastScore = s;
  });
  let scoreOpen = $state(false);
  let confirmReset = $state(false);
  let scoreBox = $state();
  let panelLeft = $state(0);
  // Open the panel under the score, nudged so that it stays inside the window on a phone.
  function openScore() {
    const r = scoreBox?.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const w = Math.min(280, vw - 32);
    panelLeft = r ? Math.min(Math.max(r.left, 16), vw - 16 - w) - r.left : 0;
    scoreOpen = true;
  }
  function closeScore(refocus = false) {
    scoreOpen = false;
    confirmReset = false;
    if (refocus) scoreBox?.querySelector('.score')?.focus();
  }
  async function askReset(on) {
    confirmReset = on;
    await tick();
    scoreBox?.querySelector(on ? '.keep' : '.ask-reset')?.focus();
  }
  // Close only when focus has really moved elsewhere; a button that the panel redraws should not close it.
  function onScoreFocusOut() {
    setTimeout(() => {
      const a = document.activeElement;
      if (scoreOpen && a && a !== document.body && !scoreBox?.contains(a)) closeScore();
    });
  }
  async function resetScore() {
    game.reset();
    closeScore(true);
    await resetView();
  }

  function onKey(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const el = event.target;
    // Embedded in a host page, the arrow keys belong to the host unless focus is in the story.
    if (!syncHash && !root?.contains(el)) return;
    const tag = el?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
    if (el?.closest?.('[role="radiogroup"]')) return;
    // Inside a figure or a puzzle, the arrow keys belong to its controls, not to the chapter pager.
    if (el?.closest?.('.tkc-fig, .puzzle, [role="group"]')) return;
    if (menuEl?.open) return;
    if (event.key === 'ArrowRight' && next) go(index + 1);
    if (event.key === 'ArrowLeft' && prev) go(index - 1);
  }

  // Back and Forward land on a chapter's hash, or on the page without one, which is the opening.
  function onHistory() {
    if (!syncHash) return;
    const i = window.location.hash.length > 1 ? indexFromHash() : 0;
    if (i >= 0 && i !== index) go(i, true);
  }
</script>

<svelte:window
  onkeydown={onKey}
  onhashchange={onHistory}
  onpopstate={onHistory}
  onclick={(e) => {
    // The path is fixed when the click happens, so it still holds a button the click itself removed.
    const path = e.composedPath();
    if (menuEl?.open && !path.includes(menuEl)) closeMenu();
    if (scoreOpen && !path.includes(scoreBox)) closeScore();
  }}
/>

<div class="tkc" data-theme={theme === 'auto' ? undefined : theme} bind:this={root}>
  <header class="bar">
    <div class="bar-inner">
      <button type="button" class="skip" onclick={focusHeading}>Skip to the chapter</button>
      <button type="button" class="home" onclick={() => go(0)} aria-label="Two Kinds of Chains: opening page">
        <span class="home-mark" aria-hidden="true"></span>
        <span class="home-name">Two Kinds of Chains</span>
      </button>

      <nav class="links" aria-label="Chapters">
        <ol style:--links={CHAPTERS.length}>
          {#each CHAPTERS as chapter, i (chapter.id)}
            <li>
              <button
                type="button"
                class="link"
                class:on={i === index}
                class:seen={visited[i]}
                class:solved={solvedHere(chapter.id)}
                class:shown={shownHere(chapter.id)}
                aria-current={i === index ? 'step' : undefined}
                aria-label="{i === 0 ? 'Start' : `Chapter ${i}`}: {chapter.title}{solvedHere(chapter.id) ? ', puzzle solved' : ''}"
                title={chapter.title}
                onclick={() => go(i)}
              ></button>
            </li>
          {/each}
        </ol>
        <div class="scorebox" bind:this={scoreBox} onfocusout={onScoreFocusOut} onkeydown={(e) => e.key === 'Escape' && scoreOpen && closeScore(true)}>
          <button type="button" class="score tkc-num" class:pulse aria-expanded={scoreOpen} aria-controls="{prefix}-score-panel" onclick={() => (scoreOpen ? closeScore() : openScore())} onanimationend={() => (pulse = false)}>
            <span aria-hidden="true">★ {Math.round(shownScore.current)}/{game.max}</span><span class="tkc-sr">Score: {game.score} of {game.max} points</span>
          </button>
          {#if scoreOpen}
            <div class="score-panel" id="{prefix}-score-panel" role="group" aria-label="Your score" style:left="{panelLeft}px">
              <p class="score-line"><strong>{game.score} of {game.max} points</strong> · {game.solved} of {game.ids.length} puzzles solved</p>
              {#if confirmReset}
                <p class="score-note">This clears all your points and opens every puzzle again.</p>
                <div class="score-row">
                  <button type="button" class="tkc-btn tkc-btn--small danger" onclick={resetScore}>Clear my score</button>
                  <button type="button" class="tkc-btn tkc-btn--small keep" onclick={() => askReset(false)}>Keep it</button>
                </div>
              {:else}
                <button type="button" class="tkc-btn tkc-btn--small ask-reset" onclick={() => askReset(true)}>Reset score</button>
              {/if}
            </div>
          {/if}
        </div>
        <span class="where tkc-num" aria-hidden="true">
          {index === 0 ? 'Start' : `${index} / ${total} · ${current.short}`}
        </span>
        <!-- On a phone the chain gives way to a compact chapter menu. -->
        <details
          class="menu"
          bind:this={menuEl}
          onkeydown={(e) => e.key === 'Escape' && closeMenu(true)}
          onfocusout={(e) => !menuEl.contains(e.relatedTarget) && closeMenu()}
          ontoggle={() => menuEl.open && menuEl.querySelector('.menu-list .on')?.scrollIntoView({ block: 'nearest' })}
        >
          <summary class="tkc-num"><span class="menu-label">{index === 0 ? 'Start' : `${index} / ${total} · ${current.short}`}</span></summary>
          <ol class="menu-list">
            {#each CHAPTERS as chapter, i (chapter.id)}
              <li>
                <button type="button" class:on={i === index} aria-current={i === index ? 'step' : undefined} onclick={() => (closeMenu(), go(i))}>
                  <span class="menu-n tkc-num">{i === 0 ? '' : i}</span><span class="menu-t">{chapter.title}</span>{#if solvedHere(chapter.id)}<span class="menu-ok" aria-label="puzzle solved">✓</span>{/if}
                </button>
              </li>
            {/each}
          </ol>
        </details>
      </nav>
    </div>
  </header>

  <main class="page" bind:this={top}>
    {#key `${index}:${fresh}`}
      <div class="view" class:vt={useTransitions}>
        <Current />
      </div>
    {/key}

    <nav class="pager" aria-label="Previous and next chapter">
      {#if prev}
        <button type="button" class="pager-btn" onclick={() => go(index - 1)}>
          <span class="pager-dir">← Previous</span>
          <span class="pager-title">{prev.title}</span>
        </button>
      {:else}
        <span></span>
      {/if}
      {#if next}
        <button type="button" class="pager-btn pager-btn--next" onclick={() => go(index + 1)}>
          <span class="pager-dir">{index === 0 ? 'Begin' : 'Next'} →</span>
          <span class="pager-title">{next.title}</span>
        </button>
      {/if}
    </nav>
    <p class="nogates tkc-caption">Jump to any chapter from the top of the page.</p>
  </main>
</div>

<style>
  .bar {
    position: sticky;
    top: env(safe-area-inset-top, 0px);
    z-index: 20;
    background: var(--tkc-surface);
    border-bottom: 1px solid var(--tkc-hair);
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
  }
  /* On phones with a notch, cover the strip above the sticky bar so text does not show through. */
  .bar::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 100%;
    height: env(safe-area-inset-top, 0px);
    background: var(--tkc-surface);
  }
  .bar-inner {
    position: relative;
    max-width: 1200px;
    margin-inline: auto;
    min-height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .skip {
    position: absolute;
    left: 0;
    top: 9px;
    z-index: 1;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--tkc-ink);
    background: var(--tkc-surface);
    color: var(--tkc-ink);
    font-weight: 600;
    cursor: pointer;
  }
  /* Hidden until a keyboard user reaches it. */
  .skip:not(:focus-visible) {
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    border: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .home {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 6px 4px;
    border: 0;
    background: none;
    cursor: pointer;
    color: var(--tkc-ink);
    min-width: 0;
  }
  .home-mark {
    position: relative;
    width: 26px;
    height: 14px;
    flex: none;
  }
  .home-mark::before,
  .home-mark::after {
    content: '';
    position: absolute;
    top: 0;
    width: 15px;
    height: 14px;
    border-radius: 7px;
    border: 2.5px solid var(--tkc-conditions);
  }
  .home-mark::before {
    left: 0;
  }
  .home-mark::after {
    left: 11px;
    border-color: var(--tkc-options);
  }
  .home-name {
    font-family: var(--tkc-font-display);
    font-weight: 600;
    font-size: 1.0625rem;
    white-space: nowrap;
  }
  .links {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }
  ol {
    display: flex;
    align-items: center;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li + li {
    margin-left: -6px;
  }
  .link {
    position: relative;
    width: 30px;
    height: 32px;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }
  .link::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 9px;
    width: 22px;
    height: 14px;
    border-radius: 7px;
    border: 2.5px solid color-mix(in srgb, var(--tkc-muted) 70%, var(--tkc-surface));
    background: transparent;
    transition: border-color 150ms ease, background-color 150ms ease;
  }
  li:nth-child(even) .link::before {
    top: 11px;
    height: 10px;
  }
  .link.seen::before {
    border-color: var(--tkc-ink-2);
  }
  .link.solved::before {
    border-color: var(--tkc-options);
    background: var(--tkc-options-wash);
  }
  .link.shown::before {
    border-style: dashed;
  }
  .link.on::before {
    border-color: var(--tkc-ink);
    background: var(--tkc-ink);
  }
  .link:hover::before {
    border-color: var(--tkc-ink);
  }
  .score {
    flex: none;
    display: inline-block;
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--tkc-options-ink);
    white-space: nowrap;
  }
  .scorebox {
    position: relative;
    flex: none;
  }
  .score {
    border: 0;
    background: none;
    padding: 6px 4px;
    min-height: 32px;
    cursor: pointer;
    border-radius: 6px;
  }
  .score:hover {
    background: var(--tkc-options-wash);
  }
  .score:focus-visible {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 1px;
  }
  .score-panel {
    position: absolute;
    top: calc(100% + 6px);
    z-index: 30;
    width: min(280px, calc(100vw - 32px));
    display: grid;
    gap: 10px;
    justify-items: start;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--tkc-hair);
    background: var(--tkc-surface);
    box-shadow: var(--tkc-shadow, 0 8px 24px rgb(0 0 0 / 0.12));
    font-size: 0.875rem;
    color: var(--tkc-ink-2);
  }
  .score-line strong {
    color: var(--tkc-ink);
  }
  .score-note {
    color: var(--tkc-muted);
  }
  .score-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .danger {
    color: var(--tkc-conditions-ink);
    border-color: var(--tkc-conditions);
  }
  .score.pulse {
    animation: score-pulse 600ms ease-out;
  }
  @keyframes score-pulse {
    30% {
      transform: scale(1.25);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .score.pulse {
      animation: none;
    }
  }
  .where {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--tkc-ink-2);
    white-space: nowrap;
  }
  .page {
    max-width: 1200px;
    margin-inline: auto;
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
    padding-block: clamp(28px, 5cqi, 56px) 40px;
    scroll-margin-top: 64px;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 40px;
  }
  .view {
    animation: enter 320ms ease-out both;
  }
  .view.vt {
    animation: none;
    view-transition-name: tkc-view;
  }
  @keyframes enter {
    from {
      opacity: 0.4;
      transform: translateY(6px);
    }
  }
  .pager {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    border-top: 1px solid var(--tkc-hair);
    padding-top: 24px;
  }
  .pager-btn {
    display: grid;
    gap: 2px;
    text-align: left;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--tkc-hair);
    background: var(--tkc-surface);
    color: var(--tkc-ink);
    cursor: pointer;
    min-width: 0;
  }
  .pager-btn:hover {
    border-color: var(--tkc-ink-2);
  }
  .pager-btn--next {
    text-align: right;
    grid-column: 2;
  }
  .pager-dir {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--tkc-muted);
  }
  .pager-title {
    font-family: var(--tkc-font-display);
    font-weight: 600;
    font-size: 1.0625rem;
    line-height: 1.25;
  }
  .nogates {
    text-align: center;
    margin-top: -24px;
  }

  .menu {
    display: none;
  }
  @container tkc (max-width: 900px) {
    .home-name {
      display: none;
    }
  }
  @container tkc (max-width: 560px) {
    .pager {
      grid-template-columns: 1fr;
    }
    .pager-btn--next {
      grid-column: 1;
      grid-row: 1;
    }
  }
  /* Phones, small tablets and narrow web-part columns: a chapter menu instead of the chain. */
  @container tkc (max-width: 760px) {
    .where {
      display: none;
    }
    .links {
      flex: 1;
      min-width: 0;
    }
    .links > ol {
      display: none;
    }
    .menu {
      display: block;
      flex: 1;
      min-width: 0;
    }
    .menu summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-height: 44px;
      padding: 0 4px;
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--tkc-ink);
      cursor: pointer;
      list-style: none;
    }
    .menu-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .menu summary::-webkit-details-marker {
      display: none;
    }
    .menu summary::after {
      content: 'Chapters';
      flex: none;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--tkc-rule);
      font-size: 0.8125rem;
    }
    .menu[open] summary::after {
      content: 'Close';
    }
    .menu summary:focus-visible {
      outline: 2px solid var(--tkc-focus);
      outline-offset: 2px;
      border-radius: 6px;
    }
    .menu-list {
      position: absolute;
      left: 0;
      right: 0;
      top: 100%;
      z-index: 30;
      margin: 0;
      padding: 6px;
      list-style: none;
      display: grid;
      gap: 2px;
      max-height: min(70vh, 560px);
      overflow-y: auto;
      background: var(--tkc-surface);
      border: 1px solid var(--tkc-hair);
      border-radius: 0 0 12px 12px;
      box-shadow: var(--tkc-shadow);
    }
    .menu-list button {
      width: 100%;
      display: flex;
      gap: 10px;
      align-items: baseline;
      min-height: 40px;
      padding: 8px 10px;
      border: 0;
      border-radius: 8px;
      background: none;
      color: var(--tkc-ink);
      font: inherit;
      font-size: 0.9375rem;
      text-align: left;
      cursor: pointer;
    }
    .menu-list button:hover {
      background: var(--tkc-sunken);
    }
    .menu-list button.on {
      background: var(--tkc-ink);
      color: var(--tkc-page);
    }
    .menu-t {
      flex: 1;
    }
    .menu-ok {
      color: var(--tkc-options-ink);
      font-weight: 700;
    }
    .menu-list button.on .menu-ok {
      color: inherit;
    }
    .menu-n {
      min-width: 1.6em;
      font-weight: 700;
      color: inherit;
      opacity: 0.7;
    }
  }
</style>
