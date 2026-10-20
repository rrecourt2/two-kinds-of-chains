<script module>
  let instances = 0;
</script>

<script>
  import { setContext, tick } from 'svelte';
  import { CHAPTERS } from './chapters/index.js';
  import { prefersReducedMotion } from './lib/motion.js';

  let { theme = 'auto', syncHash = false, startAt } = $props();

  const prefix = instances++ ? `tkc${instances}` : 'tkc';
  setContext('tkc-id', prefix);

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

  const current = $derived(CHAPTERS[index]);
  const Current = $derived(current.component);
  const prev = $derived(index > 0 ? CHAPTERS[index - 1] : null);
  const next = $derived(index < CHAPTERS.length - 1 ? CHAPTERS[index + 1] : null);

  async function go(target) {
    const i = typeof target === 'string' ? CHAPTERS.findIndex((c) => c.id === target) : target;
    if (i < 0 || i >= CHAPTERS.length || i === index) return;
    index = i;
    visited[i] = true;
    if (syncHash) {
      try {
        history.replaceState(null, '', `#${CHAPTERS[i].id}`);
      } catch {
        /* the host may not allow URL changes */
      }
    }
    await tick();
    top?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
  setContext('tkc-go', go);

  function onKey(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const el = event.target;
    const tag = el?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
    if (event.key === 'ArrowRight' && next) go(index + 1);
    if (event.key === 'ArrowLeft' && prev) go(index - 1);
  }

  function onHashChange() {
    const i = indexFromHash();
    if (i >= 0 && i !== index) go(i);
  }
</script>

<svelte:window onkeydown={onKey} onhashchange={onHashChange} />

<div class="tkc" data-theme={theme === 'auto' ? undefined : theme}>
  <header class="bar">
    <div class="bar-inner">
      <button type="button" class="home" onclick={() => go(0)} aria-label="Two Kinds of Chains: opening page">
        <span class="home-mark" aria-hidden="true"></span>
        <span class="home-name">Two Kinds of Chains</span>
      </button>

      <nav class="links" aria-label="Chapters">
        <ol>
          {#each CHAPTERS as chapter, i (chapter.id)}
            <li>
              <button
                type="button"
                class="link"
                class:on={i === index}
                class:seen={visited[i]}
                aria-current={i === index ? 'step' : undefined}
                aria-label="{i === 0 ? 'Start' : `Chapter ${i}`}: {chapter.title}"
                title={chapter.title}
                onclick={() => go(i)}
              ></button>
            </li>
          {/each}
        </ol>
        <span class="where tkc-num" aria-hidden="true">
          {index === 0 ? 'Start' : `${index} / 9 · ${current.short}`}
        </span>
      </nav>
    </div>
  </header>

  <main class="page" bind:this={top}>
    {#key index}
      <div class="view">
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
    <p class="nogates tkc-caption">Jump to any chapter from the links at the top. This story has no approval gates.</p>
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
    border: 2.5px solid var(--tkc-rule);
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
  .link.on::before {
    border-color: var(--tkc-ink);
    background: var(--tkc-ink);
  }
  .link:hover::before {
    border-color: var(--tkc-ink);
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

  @container tkc (max-width: 760px) {
    .where {
      display: none;
    }
  }
  @container tkc (max-width: 560px) {
    .home-name {
      display: none;
    }
    .pager {
      grid-template-columns: 1fr;
    }
    .pager-btn--next {
      grid-column: 1;
      grid-row: 1;
    }
  }
  @container tkc (max-width: 400px) {
    .link {
      width: 28px;
    }
    .link::before {
      left: 4px;
      width: 20px;
    }
    li + li {
      margin-left: -4px;
    }
  }
</style>
