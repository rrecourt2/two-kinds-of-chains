<script>
  // The little notes on the story’s underlined ideas (AND, OR, IF, a quorum, a tipping point …): one short
  // definition and the chapter where the idea is first met. Mounted once, beside the chapters; no chapter needs
  // to change. Each underlined span is found from its class (.tkc-and, .tkc-or, .tkc-if, .tkc-idea) and its
  // idea from its text (src/lib/ideas.js).
  //
  // How it is reached:
  // - Mouse: hover opens the note after a moment; it stays while the pointer is on the word or the note, so the
  //   chapter link can be clicked. A click keeps it open until a click elsewhere or Escape.
  // - Touch: a tap opens it, a tap on the word again or anywhere else closes it.
  // - Keyboard and screen readers: each idea is a toggle button (role="button", aria-expanded), but only one per
  //   paragraph is a tab stop (a roving tabindex): Tab lands on a paragraph’s first idea, the left and right
  //   arrow keys move between the ideas in that paragraph. Focus opens the note and points the word’s
  //   aria-describedby at it, so a screen reader reads the definition with the word; Enter or Space closes and
  //   reopens it, Escape closes it. The note is placed in the page right after the word, so the next Tab
  //   reaches its chapter link and reading order follows it.
  // The note is placed above the line it explains, on the text already read, or below when there is no room;
  // it stays inside the story and the window, at most 300px wide.
  import { getContext } from 'svelte';
  import { IDEAS, ideaOf } from '../ideas.js';

  let { root, chapters = [], current = '', go } = $props();

  const prefix = getContext('tkc-id') ?? 'tkc';
  const SELECTOR = '.tkc-and, .tkc-or, .tkc-if, .tkc-idea';
  const BLOCK = 'p, li, dd, dt, td, th, figcaption, blockquote, h1, h2, h3, h4, h5, h6';
  // Places an idea never gets a note: inside the note itself, inside another control, or hidden from readers.
  const SKIP = '.tkc-gloss, button, a, summary, label, select, svg, [aria-hidden="true"]';
  const WIDTH = 300; // the note's widest
  const EDGE = 10; // the least room kept between the note and the window or the story's edge
  const GAP = 8; // between the line and the note
  const textId = `${prefix}-gloss-text`;
  const keysId = `${prefix}-gloss-keys`;

  let open = null; // { el, key, pinned, via: 'hover' | 'focus' | 'keys' | 'tap' }
  let note = null;
  let pointer = null; // where the pointer last met an idea, to point at the right line of a word that wraps
  let showTimer = 0;
  let hideTimer = 0;
  let quiet = null; // an idea just closed with Escape or Enter: focus or hover does not reopen it at once

  const blockOf = (el) => el.closest(BLOCK) ?? el.parentElement;
  const ideasIn = (block) => [...block.querySelectorAll('[data-tkc-idea]')].filter((e) => blockOf(e) === block);
  const ideaAt = (node) => {
    const el = node?.closest?.('[data-tkc-idea]');
    return el && root?.contains(el) ? el : null;
  };
  const inNote = (node) => !!(note && node && note.contains(node));

  // ---------- Finding the ideas ----------

  const seen = new WeakSet();
  function enhance() {
    if (!root) return;
    const touched = new Set();
    for (const el of root.querySelectorAll(SELECTOR)) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (el.closest(SKIP)) continue;
      const key = ideaOf(el.textContent);
      if (!key) continue;
      el.dataset.tkcIdea = key;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-expanded', 'false');
      el.tabIndex = -1;
      touched.add(blockOf(el));
    }
    // One tab stop per paragraph: its first idea, until the arrow keys pick another.
    for (const block of touched) {
      const all = ideasIn(block);
      if (!all.some((e) => e.tabIndex === 0)) all[0].tabIndex = 0;
    }
    if (open && !open.el.isConnected) close();
  }

  let frame = 0;
  function schedule(mutations) {
    if (open && !open.el.isConnected) close();
    const relevant = mutations.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && !inNote(n) && (n.matches(SELECTOR) || n.querySelector(SELECTOR))));
    if (!relevant || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      enhance();
    });
  }

  // ---------- The note ----------

  function build(el, key, via) {
    const idea = IDEAS[key];
    const box = document.createElement('span');
    box.className = 'tkc-gloss';
    box.id = `${prefix}-gloss`;
    box.setAttribute('role', 'note');
    box.dataset.mark = idea.mark;
    const name = document.createElement('span');
    name.className = 'tkc-gloss-name';
    name.textContent = idea.name;
    const text = document.createElement('span');
    text.className = 'tkc-gloss-text';
    text.id = textId;
    text.textContent = idea.text;
    box.append(name, text);
    if (via === 'keys' && ideasIn(blockOf(el)).length > 1) {
      const keys = document.createElement('span');
      keys.className = 'tkc-gloss-keys';
      keys.id = keysId;
      keys.textContent = 'Left and right arrow keys: the other ideas in this paragraph.';
      box.append(keys);
    }
    const at = chapters.findIndex((c) => c.id === idea.first);
    if (at > 0 && idea.first !== current) {
      const line = document.createElement('span');
      line.className = 'tkc-gloss-first';
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'tkc-gloss-link';
      link.textContent = chapters[at].title;
      link.addEventListener('click', () => {
        close();
        go?.(idea.first);
      });
      line.append('First met in ', link);
      box.append(line);
    }
    // A press inside the note keeps focus where it is, so the note does not close before its link is clicked.
    box.addEventListener('mousedown', (e) => e.preventDefault());
    return box;
  }

  function show(el, via, pinned = false) {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    if (open?.el === el) {
      open.pinned ||= pinned;
      return;
    }
    close();
    const key = el.dataset.tkcIdea;
    if (!IDEAS[key]) return;
    open = { el, key, pinned, via };
    note = build(el, key, via);
    el.after(note);
    el.setAttribute('aria-expanded', 'true');
    el.setAttribute('aria-controls', note.id);
    el.setAttribute('aria-describedby', note.querySelector(`#${keysId}`) ? `${textId} ${keysId}` : textId);
    place();
  }

  function close({ refocus = false } = {}) {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    if (!open) return;
    const { el } = open;
    const hadFocus = inNote(document.activeElement);
    el.setAttribute('aria-expanded', 'false');
    el.removeAttribute('aria-controls');
    el.removeAttribute('aria-describedby');
    if ((refocus || hadFocus) && el.isConnected) el.focus({ preventScroll: true });
    note?.remove();
    note = null;
    open = null;
  }

  // Above the line it explains, over text already read; below it when the top of the window (or the story's
  // sticky bar) leaves no room. Never wider than the story or the window allow.
  function place() {
    if (!open || !note) return;
    const el = open.el;
    const rects = [...el.getClientRects()];
    if (!rects.length) return;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const story = root.getBoundingClientRect();
    const left = Math.max(EDGE, story.left + EDGE);
    const right = Math.min(vw - EDGE, story.right - EDGE);
    const w = Math.max(160, Math.min(WIDTH, right - left));
    note.style.width = `${w}px`;
    note.style.left = '0px';
    note.style.top = '0px';
    // The note's own origin: wherever left 0, top 0 lands inside its containing block.
    const origin = note.getBoundingClientRect();
    const h = origin.height;
    let line = rects[0];
    if (open.via === 'hover' && pointer) line = rects.find((r) => pointer.y >= r.top - 2 && pointer.y <= r.bottom + 2) ?? line;
    const mid = (line.left + line.right) / 2;
    const x = Math.max(left, Math.min(right - w, mid - w / 2));
    const bar = root.querySelector(':scope > header');
    const barBottom = bar ? bar.getBoundingClientRect().bottom : 0;
    const top = Math.max(0, barBottom) + EDGE;
    const above = line.top - GAP - h;
    const below = line.bottom + GAP;
    const side = above >= top ? 'above' : below + h <= vh - EDGE ? 'below' : line.top - top >= vh - line.bottom ? 'above' : 'below';
    note.dataset.side = side;
    note.style.left = `${x - origin.left}px`;
    note.style.top = `${(side === 'above' ? above : below) - origin.top}px`;
    note.style.setProperty('--tkc-gloss-x', `${Math.max(14, Math.min(w - 14, mid - x))}px`);
  }

  // ---------- Pointer, touch and keys ----------

  function onPointerOver(e) {
    if (e.pointerType === 'touch') return;
    if (inNote(e.target)) {
      clearTimeout(hideTimer);
      return;
    }
    const el = ideaAt(e.target);
    if (!el) return;
    pointer = { x: e.clientX, y: e.clientY };
    clearTimeout(hideTimer);
    if (open?.el === el || open?.pinned || quiet === el) return;
    clearTimeout(showTimer);
    showTimer = setTimeout(() => show(el, 'hover'), open ? 60 : 160);
  }

  function onPointerOut(e) {
    if (e.pointerType === 'touch') return;
    const from = inNote(e.target) ? note : ideaAt(e.target);
    if (!from) return;
    const to = e.relatedTarget;
    if (to && (from.contains(to) || inNote(to) || open?.el.contains(to))) return;
    clearTimeout(showTimer);
    if (quiet && from === quiet) quiet = null;
    if (open && !open.pinned && open.via === 'hover') hideTimer = setTimeout(close, 240);
  }

  function onClick(e) {
    const el = ideaAt(e.target);
    if (!el) return;
    quiet = null;
    if (open?.el === el && open.pinned) close();
    else show(el, open?.el === el ? open.via : 'tap', true);
  }

  // A click or tap anywhere but the open idea and its note closes the note.
  function onDocumentClick(e) {
    if (!open) return;
    const path = e.composedPath();
    if (path.includes(open.el) || (note && path.includes(note))) return;
    close();
  }

  function onFocusIn(e) {
    const el = ideaAt(e.target);
    if (!el || e.target !== el) return;
    // The paragraph's tab stop follows the idea last used.
    for (const other of ideasIn(blockOf(el))) other.tabIndex = other === el ? 0 : -1;
    if (quiet === el) return;
    let keys = false;
    try {
      keys = el.matches(':focus-visible');
    } catch {
      /* an older browser */
    }
    show(el, keys ? 'keys' : 'focus');
  }

  function onFocusOut(e) {
    const from = e.target;
    const to = e.relatedTarget;
    if (quiet === from && to !== from && !inNote(to)) quiet = null;
    if (!open) return;
    if (from !== open.el && !inNote(from)) return;
    if (to && (to === open.el || inNote(to))) return;
    if (open.via === 'hover' && !open.pinned) return;
    close();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && open) {
      quiet = open.el;
      close({ refocus: inNote(document.activeElement) });
      return;
    }
    const el = ideaAt(e.target);
    if (!el || e.target !== el || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open?.el === el) {
        quiet = el;
        close();
      } else {
        quiet = null;
        show(el, 'keys', true);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      // The arrow keys stay in the paragraph: they never page to another chapter from an idea.
      e.preventDefault();
      const all = ideasIn(blockOf(el));
      const next = all[all.indexOf(el) + (e.key === 'ArrowRight' ? 1 : -1)];
      if (next) {
        quiet = null;
        next.focus();
      }
    }
  }

  function onResize() {
    if (open) place();
  }

  $effect(() => {
    if (!root) return;
    enhance();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    root.addEventListener('pointerover', onPointerOver);
    root.addEventListener('pointerout', onPointerOut);
    root.addEventListener('click', onClick);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    root.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('keydown', onEscape, true);
    window.addEventListener('resize', onResize);
    return () => {
      close();
      cancelAnimationFrame(frame);
      observer.disconnect();
      root.removeEventListener('pointerover', onPointerOver);
      root.removeEventListener('pointerout', onPointerOut);
      root.removeEventListener('click', onClick);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      root.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onDocumentClick, true);
      document.removeEventListener('keydown', onEscape, true);
      window.removeEventListener('resize', onResize);
    };
  });

  // Escape closes an open note wherever focus is, even outside the story (a note opened with a tap).
  function onEscape(e) {
    if (e.key !== 'Escape' || !open || root?.contains(e.target)) return;
    quiet = open.el;
    close();
  }
</script>
