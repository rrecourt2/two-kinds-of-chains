<script>
  import { getContext, onDestroy, onMount, tick, untrack } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import {
    BANKS as N,
    CAPITAL,
    CAPITALS,
    LOSS,
    EXTRA,
    LIMIT,
    INTERBANK_PCT,
    ALTERNATIVES,
    SHARES,
    SYSTEMS,
    SIMILAR_LINKS,
    systemOf,
    byLinks,
    capitalFor,
    landing,
    added,
    withinBudget,
    worstCurve,
    tippingPoint,
    partnersToFail,
    holdsAcross,
    worstAcross,
    layout,
  } from '../lib/sim/network.js';
  import { linear, line } from '../lib/scales.js';
  import { prefersReducedMotion, watchVisibility } from '../lib/motion.js';

  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times', 'six times'];
  // Grown around hubs, the best-connected banks are the biggest; among many similar banks they are only the
  // best connected.
  const NAMED = {
    hubs: ['The biggest bank', 'The second biggest bank', 'The third biggest bank'],
    similar: ['The best-connected bank', 'The second best-connected bank'],
  };

  // Each banking system's network, its banks from most to least connected, and the worst place to land
  // at every capital for each choice of extra for the hubs, all computed once.
  function systemData(value) {
    const sys = systemOf(value);
    const adj = sys.network();
    const order = byLinks(adj);
    const rankOf = new Int32Array(N);
    order.forEach((b, r) => (rankOf[b] = r));
    const edges = adj.flatMap((nbrs, i) => nbrs.filter((j) => j > i).map((j) => [i, j]));
    const curves = Object.fromEntries(SHARES.map((s) => [s.value, worstCurve(adj, s.top)]));
    return { adj, order, rankOf, edges, curves, seed: sys.seed, layouts: {} };
  }
  const DATA = Object.fromEntries(SYSTEMS.map((s) => [s.value, systemData(s.value)]));
  const HUBS = DATA.hubs;
  // The drawn similar network's partners per bank, on average (the generator aims at SIMILAR_LINKS).
  const similarMean = Math.round(DATA.similar.edges.length * 2 / N);
  const hub = HUBS.order[0];
  const ci = (c) => CAPITALS.indexOf(c);

  // Where the loss lands (the biggest hub to begin with, so the cascade shows at once), the capital
  // every bank holds, the extra for the hubs, and, once the puzzle is solved, the banking system.
  let at = $state(hub);
  let base = $state(CAPITAL);
  let share = $state('none');
  let system = $state('hubs');
  const net = $derived(DATA[system]);
  const links = (b) => net.adj[b].length;
  const game = getContext('tkc-game');
  const solved = $derived(!game.isOpen('contagion'));
  // The loss stays on the bank of the same rank: the biggest bank in one system, the best connected in the other.
  function switchSystem(value) {
    if (value === system) return;
    const r = net.rankOf[at];
    system = value;
    at = DATA[value].order[r];
  }
  let width = $state(560);
  let chartW = $state(560);
  let hover = $state(null);
  let diagram;

  const top = $derived(SHARES.find((s) => s.value === share).top);
  const capital = $derived(capitalFor(net.adj, top, base));
  const outcome = $derived(landing(net.adj, capital, at));
  const now = $derived(net.curves[share][ci(base)]);
  const add = $derived(added(base, top));
  const hasExtra = (b) => capital[b] > base;

  // The outcome, revealed one round of failures at a time.
  let shown = $state({ key: '', waves: [] });
  let wave = $state(0);
  let seen = false;
  let timer = 0;
  const WAVE_MS = 220;

  function play() {
    clearInterval(timer);
    if (prefersReducedMotion()) {
      wave = shown.waves.length;
      return;
    }
    wave = 1;
    if (!seen) return;
    timer = setInterval(() => {
      if (wave >= shown.waves.length) clearInterval(timer);
      else wave += 1;
    }, WAVE_MS);
  }
  $effect(() => {
    const { waves, failed } = outcome;
    const key = `${system}:${at}:${failed.join('')}`;
    untrack(() => {
      if (key === shown.key) {
        // The same banks fail as before: keep what is on screen.
        const complete = wave >= shown.waves.length;
        shown = { key, waves };
        wave = complete ? waves.length : Math.min(wave, waves.length);
        return;
      }
      shown = { key, waves };
      play();
    });
  });
  // The first round waits until the diagram is on screen.
  onMount(() =>
    watchVisibility(diagram, (visible) => {
      if (!visible || seen) return;
      seen = true;
      play();
    }),
  );
  onDestroy(() => clearInterval(timer));

  const failedNow = $derived.by(() => {
    const f = new Uint8Array(N);
    shown.waves.slice(0, wave).forEach((w) => w.forEach((i) => (f[i] = 1)));
    return f;
  });
  const count = $derived(failedNow.reduce((a, b) => a + b, 0));
  const spreading = $derived(wave < shown.waves.length);
  const rounds = $derived(Math.max(0, shown.waves.length - 1));

  // ---- The network: banks laid out for the shape of the frame, so a phone gets a squarer one. ----
  const narrow = $derived(width < 420);
  const H = $derived(Math.round(Math.min(320, Math.max(280, width * 0.6))));
  const ASPECTS = [1, 1.3, 1.65, 2];
  const aspect = $derived(ASPECTS.reduce((a, b) => (Math.abs(b - width / H) < Math.abs(a - width / H) ? b : a)));
  const pos = $derived((net.layouts[aspect] ??= layout(net.adj, net.seed, 320, aspect)));
  const px = (b) => pos[b].x * width;
  const py = (b) => pos[b].y * H;
  const radius = (b) => (narrow ? 3 : 3.5) + (narrow ? 1.4 : 1.6) * Math.sqrt(links(b));
  // The label on the landing ring sits on the side with more room.
  const tagLeft = $derived(px(at) > width - 70);
  const tagBelow = $derived(py(at) < 26);

  // Tap or click: the nearest bank within reach of the pointer, so small banks are easy to hit on a phone.
  function onTap(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - box.left;
    const my = e.clientY - box.top;
    let best = -1;
    let gap = Infinity;
    for (let b = 0; b < N; b++) {
      const d = Math.hypot(px(b) - mx, py(b) - my) - radius(b);
      if (d < gap) (gap = d), (best = b);
    }
    if (best >= 0 && gap <= 18) at = best;
  }
  // The arrow keys move the loss from bank to bank, most connected first.
  async function onKey(e) {
    const r = net.rankOf[at];
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let next;
    if (step) next = (r + step + N) % N;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = N - 1;
    else return;
    e.preventDefault();
    at = net.order[next];
    await tick();
    diagram?.querySelector(`[data-bank="${at}"]`)?.focus();
  }

  const who = (b) => NAMED[system][net.rankOf[b]] ?? 'This bank';
  const describe = (b) => (NAMED[system][net.rankOf[b]]?.toLowerCase() ?? `a bank with ${links(b)} partners`);
  // A bank's rule in words: an IF on its capital, which its loans turn into a quorum of its partners.
  function quorum(k, n) {
    if (k === n) return n === 2 ? 'if both its partners fail' : `if all ${n} of its partners fail`;
    return `if ${k} of its ${n} partners fail${k === 1 ? 's' : ''}`;
  }
  const rule = $derived.by(() => {
    const n = links(at);
    const c = capital[at];
    const k = partnersToFail(c, n);
    if (k === null) return 'never, even if all its partners fail';
    if (c < LOSS) return `${quorum(k, n)}, or if the ${LOSS}% loss lands on it`;
    return `${quorum(k, n)}, but not from the ${LOSS}% loss alone`;
  });
  const failSub = $derived(
    spreading
      ? 'Spreading, round by round…'
      : outcome.absorbed
        ? `Its ${capital[at]}% capital covers the ${LOSS}% loss`
        : count === 1
          ? 'The loss stops there: its partners absorb it'
          : rounds === 1
            ? 'Its weakest partners fall with it, in one round'
            : `${rounds} rounds, each set off by the one before`,
  );
  const addValue = $derived(add < 0 ? `−${-add}` : String(add));
  const addSub = $derived(
    base < CAPITAL ? `percentage points: every bank below today’s ${CAPITAL}%` : add > EXTRA ? `percentage points, over the ${EXTRA} allowed` : `percentage points, of the ${EXTRA} allowed`,
  );

  // ---- The curve: the worst place to land, against the capital every bank holds. ----
  // A little taller on a phone, where the cliffs stand closer together and the labels need the room.
  const CH = $derived(chartW < 420 ? 256 : 216);
  const cm = { top: 30, right: 14, bottom: 40, left: 34 };
  const cx = $derived(linear(CAPITALS[0], CAPITALS.at(-1), cm.left, chartW - cm.right));
  const cy = $derived(linear(0, N, CH - cm.bottom, cm.top));
  const path = (s) => line(net.curves[s].map((p) => [cx(p.capital), cy(p.worst)]));
  const others = $derived(SHARES.filter((s) => s.value !== share));
  const xTicks = $derived((chartW - cm.left - cm.right) / (CAPITALS.length - 1) >= 30 ? CAPITALS : CAPITALS.filter((c) => c % 2 === 0));
  const shareLabel = (s) => SHARES.find((x) => x.value === s).label;
  // Once the puzzle is solved, the other banking system's curve for the same extra, dotted.
  const otherSystem = $derived(SYSTEMS.find((s) => s.value !== system));
  const twin = $derived(solved ? DATA[otherSystem.value].curves[share] : null);
  const AXIS_TITLE = '↑ Banks that fail, at the worst place';
  // A grey curve that never strays more than two banks from the orange one is drawn under it and not named.
  const alike = (a, b) => a.every((p, k) => Math.abs(p.worst - b[k].worst) <= 2);
  const greysAlike = $derived(others.every((s) => alike(net.curves[s.value], net.curves[share])));

  // ---- Direct labels on the curve, each placed where it crosses no line and no label placed before it. ----
  const CHAR = 6; // a 12px character, a little generous
  function tag(text, x, y, anchor = 'start') {
    const w = text.length * CHAR + 4;
    const x0 = anchor === 'end' ? x - w : x;
    return { text, x, y, anchor, x0, x1: x0 + w, y0: y - 10, y1: y + 3 };
  }
  const clash = (a, b) => a.x0 < b.x1 + 3 && b.x0 < a.x1 + 3 && a.y0 < b.y1 + 2 && b.y0 < a.y1 + 2;
  // How close a line through `pts` comes to a label (0 if it runs through it).
  function reach(b, pts) {
    let best = Infinity;
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1];
      const [bx, by] = pts[k];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
      for (let s = 0; s <= n; s++) {
        const qx = ax + ((bx - ax) * s) / n;
        const qy = ay + ((by - ay) * s) / n;
        best = Math.min(best, Math.hypot(Math.max(b.x0 - qx, 0, qx - b.x1), Math.max(b.y0 - qy, 0, qy - b.y1)));
      }
    }
    return best;
  }
  const ptsOf = (curve) => curve.map((p) => [cx(p.capital), cy(p.worst)]);
  const cliffOf = (curve) => {
    const i = tippingPoint(curve);
    const P = [cx(curve[i].capital), cy(curve[i].worst)];
    const Q = [cx(curve[i + 1].capital), cy(curve[i + 1].worst)];
    return { i, P, Q, M: [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2] };
  };
  // Beside a point: right, left, above and below it (far enough out to clear a steep cliff through it).
  const around = (text, [x, y], dx = 10) => [
    tag(text, x + dx, y + 4),
    tag(text, x - dx, y + 4, 'end'),
    tag(text, x + dx - 1, y - 7),
    tag(text, x - dx + 1, y - 7, 'end'),
    tag(text, x + dx + 1, y + 16),
    tag(text, x - dx - 1, y + 16, 'end'),
  ];
  const curveTags = $derived.by(() => {
    const lines = [
      { id: share, pts: ptsOf(net.curves[share]) },
      ...others.map((s) => ({ id: s.value, pts: ptsOf(net.curves[s.value]) })),
      ...(twin ? [{ id: 'twin', pts: ptsOf(twin) }] : []),
    ];
    const rules = [
      [[cm.left, cy(LIMIT)], [chartW - cm.right, cy(LIMIT)]],
      [[cx(base), cy(now.worst)], [cx(base), cy(0)]],
    ];
    const placed = [
      { x0: 0, x1: 8 + AXIS_TITLE.length * CHAR, y0: cm.top - 27, y1: cm.top - 13 },
      { x0: cx(base) - 6, x1: cx(base) + 6, y0: cy(now.worst) - 6, y1: cy(now.worst) + 6 },
    ];
    // What a label would cover, weighted: running off the chart or into another label counts most, then the
    // axes, the orange curve and the two rules; a faint grey or dotted line, under the label's halo, least.
    const misses = (b) =>
      (b.x0 < 0 || b.x1 > chartW ? 50 : 0) +
      (b.x0 < cm.left + 2 || b.x1 > chartW - 1 || b.y0 < cm.top - 14 || b.y1 > cy(0) - 2 ? 4 : 0) +
      20 * placed.filter((p) => clash(p, b)).length +
      2 * rules.filter((r) => reach(b, r) <= 3).length +
      lines.filter((l) => reach(b, l.pts) <= 3).reduce((a, l) => a + (l.id === share ? 2 : 1), 0);
    const out = [];
    // The dot, the tipping point and the limit are always labelled, in the best place there is.
    const must = (cls, options) => {
      let b = options[0];
      let worst = Infinity;
      for (const o of options) {
        const m = misses(o);
        if (m < worst) (b = o), (worst = m);
        if (!m) break;
      }
      placed.push(b);
      out.push({ ...b, cls });
    };
    // A curve's name only where it is free, and nearer its own curve than any other.
    const name = (cls, id, options) => {
      const own = lines.find((l) => l.id === id).pts;
      const b = options.find((o) => {
        if (misses(o)) return false;
        const d = reach(o, own);
        return d <= 12 && lines.every((l) => l.id === id || reach(o, l.pts) > d + 3);
      });
      if (b) placed.push(b), out.push({ ...b, cls });
    };
    const dot = [cx(base), cy(now.worst)];
    const dotText = now.worst === 0 ? 'worst: none' : `worst: ${now.worst}`;
    // Beside the dot; near the floor, above the limit line; then a little further off.
    const aboveLimit = Math.min(dot[1], cy(LIMIT)) - 7;
    const dotOptions = [
      ...around(dotText, dot, 9),
      tag(dotText, dot[0] + 9, aboveLimit),
      tag(dotText, dot[0] - 9, aboveLimit, 'end'),
      tag(dotText, dot[0] + 9, dot[1] + 28),
      tag(dotText, dot[0] - 9, dot[1] + 28, 'end'),
      tag(dotText, dot[0] + 9, dot[1] - 19),
      tag(dotText, dot[0] - 9, dot[1] - 19, 'end'),
    ];
    // Right of the line first, unless the dot is near the right edge.
    const flip = (list) => list.flatMap((o, k) => (k % 2 ? [] : [list[k + 1], o]));
    must('tkc-label tkc-halo', base >= 9 ? flip(dotOptions) : dotOptions);
    // The tipping point: beside the middle of the cliff, then beside points further up or down it.
    const { P: tp, Q: tq } = cliffOf(net.curves[share]);
    const along = (f) => [tp[0] + (tq[0] - tp[0]) * f, tp[1] + (tq[1] - tp[1]) * f];
    must('tkc-label-2 tkc-halo', [0.5, 0.3, 0.7, 0.15, 0.85].flatMap((f) => around('tipping point', along(f))));
    const limitText = `limit: ${WORDS[LIMIT]}`;
    must('tkc-label-2 tkc-halo', [
      tag(limitText, cm.left + 4, cy(LIMIT) - 5),
      tag(limitText, chartW - cm.right - 2, cy(LIMIT) - 5, 'end'),
      ...CAPITALS.map((c) => tag(limitText, cx(c) + 4, cy(LIMIT) - 5)),
      ...CAPITALS.map((c) => tag(limitText, cx(c) + 4, cy(LIMIT) + 14)),
    ]);
    // Each grey curve is named where it leaves the top: beside its cliff first, then near its other points.
    const nearby = (curve, text) => {
      const { i, P, Q, M } = cliffOf(curve);
      const pts = ptsOf(curve);
      const order = pts.map((_, k) => k).sort((a, b) => Math.abs(a - i - 0.5) - Math.abs(b - i - 0.5));
      return [...around(text, M), ...around(text, P), ...around(text, Q), ...order.flatMap((k) => around(text, pts[k]))];
    };
    for (const s of others) if (!alike(net.curves[s.value], net.curves[share])) name('grey-tag tkc-halo', s.value, nearby(net.curves[s.value], s.label));
    if (twin && !alike(twin, net.curves[share])) name('twin-tag tkc-halo', 'twin', nearby(twin, otherSystem.label));
    return out;
  });
  // Where a grey curve could not be named on the chart (on a phone, mostly), the legend names both, in the
  // order their cliffs stand from the left.
  const greyKey = $derived.by(() => {
    if (greysAlike) return 'Grey: the other two choices, almost the same here';
    const named = others.every((s) => alike(net.curves[s.value], net.curves[share]) || curveTags.some((t) => t.text === s.label));
    if (named) return 'Grey: the other two choices';
    const order = [...others].sort((a, b) => tippingPoint(net.curves[a.value]) - tippingPoint(net.curves[b.value]));
    return `Grey, from the left: ${order.map((s) => s.label).join('; ')}`;
  });

  function onMove(e) {
    const box = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    hover = Math.max(CAPITALS[0], Math.min(CAPITALS.at(-1), Math.round(cx.invert(e.clientX - box.left))));
  }

  // ---- The puzzle: every landing to five failures or fewer, within the budget. ----
  const answer = HUBS.curves.top12[ci(CAPITAL)];
  const met = $derived(now.worst <= LIMIT && withinBudget(base, top));
  function progressFor() {
    if (met || base < CAPITAL) return '';
    if (now.worst <= LIMIT)
      return `${now.worst === 0 ? 'Nothing fails, wherever the loss lands' : `At most ${WORDS[now.worst]} fail`}, but the capital added is ${add}: ${TIMES[add / EXTRA] ?? `${add / EXTRA} times`} the ${EXTRA} allowed.`;
    const where = describe(now.worstAt.reduce((a, b) => (net.rankOf[b] < net.rankOf[a] ? b : a)));
    if (share === 'none' && base > CAPITAL) return `${base}% is still less than the ${LOSS}% loss: a loss at ${where} brings down ${now.worst}.`;
    if (share === 'top3') return `The three biggest stand; a loss at ${where} still brings down ${now.worst}.`;
    return '';
  }
  const puzzle = $derived({
    goal: `Raise capital by at most ${EXTRA} percentage points in all, so that wherever the loss lands, ${WORDS[LIMIT]} banks or fewer fail.`,
    met,
    checks: [
      { label: `Wherever the loss lands, ${WORDS[LIMIT]} banks or fewer fail (now ${now.worst ? `up to ${now.worst}` : 'none'})`, ok: now.worst <= LIMIT },
      base < CAPITAL
        ? { label: `Capital raised, not cut: every bank at ${CAPITAL}% or more (now ${base}%)`, ok: false }
        : { label: `At most ${EXTRA} percentage points added (now ${add})`, ok: add <= EXTRA },
    ],
    progress: progressFor(),
    hints: [
      `A buffer stops the loss only where it covers all ${LOSS}%; raising every bank that far adds ${added(LOSS, 0)}.`,
      'The loss travels furthest from the biggest banks. On the curve, the grey lines show the other two choices of extra.',
    ],
    found: `Capital of ${CAPITAL + EXTRA / 12}% for the 12 biggest: wherever the loss lands, at most ${WORDS[answer.worst]} banks fail, for ${EXTRA} percentage points; ${LOSS}% everywhere would cost ${added(LOSS, 0)}.`,
  });

  // Numbers quoted in the explanation, read from the same model.
  const none = HUBS.curves.none[ci(CAPITAL)];
  const atMostNine = none.sizes.filter((s) => s <= 9).length;
  const allFall = none.sizes.filter((s) => s === N).length;
  const smallK = partnersToFail(CAPITAL, 2);
  const hubLinks = HUBS.adj[hub].length;
  const hubK = partnersToFail(CAPITAL, hubLinks);
  const evenly = CAPITAL + EXTRA / N;
  const tipNone = CAPITALS[tippingPoint(HUBS.curves.none) + 1];
  const tipTop12 = CAPITALS[tippingPoint(HUBS.curves.top12) + 1];
  // The other system: many similar banks tip lower, with no extra, and absorb a single loss at 5%.
  const tipSimilar = CAPITALS[tippingPoint(DATA.similar.curves.none) + 1];
  const similarMost = worstAcross('similar', CAPITAL);
  // The model note: the same choice on the other hub networks grown the same way.
  const robust = holdsAcross(12);
  const robustLower = holdsAcross(12, LIMIT, ALTERNATIVES, tipTop12);
</script>

<Chapter
  n={9}
  kicker="The stress test"
  title="When links become conditions"
  lede="Loans between banks spread risk thinly, until a loss lands in the wrong place. Then every link becomes a condition."
  puzzle="contagion"
>
  {#snippet setup()}
    <p>
      A development bank seldom lends to a small firm directly. It lends through a country’s banks, and those banks
      lend to each other. Every loan between them is a link in a chain, and a condition: a bank stands only while
      enough of the banks it lent to stand.
    </p>
    <p>
      The links are not spread evenly: a few hubs deal with nine or more banks, and more than half deal with only two
      or three. One bank takes a large loss on its own loans. Where it lands decides whether it stops there or runs
      along the links.
    </p>
    <p>
      Today every bank holds capital of {CAPITAL}% of its assets. The supervisor can ask for {EXTRA} percentage points
      more, in all: one more for every bank, or more for the few hubs.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="The stress test"
      sub="{N} banks; bigger circles have more partners. Tap or click a bank to land an {LOSS}% loss on it."
      rules={[
        `Each bank lends ${INTERBANK_PCT}% of its assets to its partners, in equal parts.`,
        'A bank fails if its losses exceed its capital, and then repays nothing.',
        `One bank loses ${LOSS}% of its assets on its own loans.`,
      ]}
    >
      <Puzzle id="contagion" {...puzzle} onshow={() => ((system = 'hubs'), (base = CAPITAL), (share = 'top12'), (at = hub))} />
      <div class="tkc-controls tkc-controls--wide">
        <Slider id="c-capital" label="Capital, every bank" bind:value={base} min={CAPITALS[0]} max={CAPITALS.at(-1)} format={(v) => `${v}% of assets`} />
        <div class="ctl">
          <Segmented name="c-extra" label="Extra for the hubs" bind:value={share} options={SHARES.map(({ value, label }) => ({ value, label }))} />
          <p class="tkc-small">On top, for the banks with the most partners: {EXTRA} percentage points in all.</p>
        </div>
        {#if solved}
          <div class="ctl">
            <Segmented name="c-system" label="The banking system" value={system} onchange={switchSystem} options={SYSTEMS.map(({ value, label }) => ({ value, label }))} />
            <p class="tkc-small">Many similar banks: the same {N} banks and rules, about {WORDS[similarMean]} partners each, no hubs.</p>
          </div>
        {/if}
      </div>

      <div class="tkc-chart curve" bind:clientWidth={chartW}>
        <div class="tkc-fig-title small">Worst place to land, at every level of capital{system === 'similar' ? ': many similar banks' : ''}</div>
        <svg
          width={chartW}
          height={CH}
          role="img"
          aria-label="Banks that fail at the worst place to land, against the capital every bank holds. {systemOf(system).label}, {shareLabel(share)}: {net.curves[share].map((p) => `${p.capital}%, ${p.worst}`).join('; ')}. Limit: {WORDS[LIMIT]}. Grey lines: the other two choices of extra.{twin ? ` Dotted: ${otherSystem.label.toLowerCase()}, the same extra: ${twin.map((p) => `${p.capital}%, ${p.worst}`).join('; ')}.` : ''}"
        >
          {#each [0, 12, 24, 36, 48] as t (t)}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={cm.left} x2={chartW - cm.right} y1={cy(t)} y2={cy(t)} />
            <text class="tkc-axis-label" x={cm.left - 6} y={cy(t) + 4} text-anchor="end">{t}</text>
          {/each}
          <line class="limit" x1={cm.left} x2={chartW - cm.right} y1={cy(LIMIT)} y2={cy(LIMIT)} />
          {#each others as s (s.value)}
            <path d={path(s.value)} class="faint" />
          {/each}
          {#if twin}<path d={line(ptsOf(twin))} class="twin" />{/if}
          <path d={path(share)} class="bold" />
          {#each net.curves[share] as p (p.capital)}
            <circle cx={cx(p.capital)} cy={cy(p.worst)} r="2.75" class="pt-small" />
          {/each}
          <line class="now" x1={cx(base)} x2={cx(base)} y1={cy(now.worst)} y2={cy(0)} />
          {#each curveTags as l (l.text)}
            <text class={l.cls} x={l.x} y={l.y} text-anchor={l.anchor}>{l.text}</text>
          {/each}
          <circle cx={cx(base)} cy={cy(now.worst)} r="5.5" class="pt" />
          {#if hover !== null}
            <line class="cross" x1={cx(hover)} x2={cx(hover)} y1={cm.top} y2={cy(0)} />
          {/if}
          {#each xTicks as c (c)}
            <text class="tkc-axis-label" x={cx(c)} y={CH - cm.bottom + 16} text-anchor="middle">{c}%</text>
          {/each}
          <text class="tkc-axis-title" x={cm.left + (chartW - cm.left - cm.right) / 2} y={CH - 4} text-anchor="middle">Capital, every bank</text>
          <text class="tkc-axis-title" x={4} y={cm.top - 16}>{AXIS_TITLE}</text>
          <rect x={cm.left} y={cm.top} width={Math.max(0, chartW - cm.left - cm.right)} height={CH - cm.top - cm.bottom} fill="transparent" role="presentation" onpointermove={onMove} onpointerleave={() => (hover = null)} />
        </svg>
        {#if hover !== null}
          <div class="tkc-tip" style:left="{Math.min(chartW - 190, Math.max(0, cx(hover) + 10))}px" style:top="40px">
            <div>Every bank at {hover}%</div>
            {#each [share, ...others.map((s) => s.value)] as s (s)}
              <div class="tkc-tip-row">
                <span class="tkc-swatch tkc-swatch--line" style:background={s === share ? 'var(--tkc-conditions)' : 'var(--tkc-rule)'}></span><strong>{net.curves[s][ci(hover)].worst}</strong>
                {shareLabel(s) === 'None' ? 'no extra' : shareLabel(s)}
              </div>
            {/each}
            {#if twin}
              <div class="tkc-tip-row">
                <span class="tkc-swatch sw-dots"></span><strong>{twin[ci(hover)].worst}</strong>
                {otherSystem.label.toLowerCase()}
              </div>
            {/if}
          </div>
        {/if}
        <div class="tkc-legend">
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)"></span>Extra for the hubs: {shareLabel(share)}</span>
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-rule)"></span>{greyKey}</span>
          {#if twin}<span><span class="tkc-swatch sw-dots"></span>Dotted: {otherSystem.label.toLowerCase()}, same extra</span>{/if}
        </div>
      </div>

      <div class="tkc-chart net" bind:clientWidth={width} bind:this={diagram}>
        <!-- Each bank is a radio that takes focus and the arrow keys; a tap anywhere picks the nearest bank. -->
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
        <svg {width} height={H} role="radiogroup" aria-label="Where the loss lands: {N} banks ({systemOf(system).label.toLowerCase()}), most connected first. The arrow keys move the loss." onclick={onTap}>
          <g aria-hidden="true">
            {#each net.edges as [i, j] (`${system}-${i}-${j}`)}
              <line x1={px(i)} y1={py(i)} x2={px(j)} y2={py(j)} class="edge" class:hot={failedNow[i] && failedNow[j]} />
            {/each}
          </g>
          {#each net.order as b (`${system}-${b}`)}
            <circle
              cx={px(b)}
              cy={py(b)}
              r={radius(b)}
              class="bank"
              class:extra={hasExtra(b)}
              class:failed={failedNow[b]}
              data-bank={b}
              role="radio"
              aria-checked={b === at}
              aria-label="{who(b)}, {links(b)} partners, {capital[b]}% capital"
              tabindex={b === at ? 0 : -1}
              onkeydown={onKey}
            />
          {/each}
          <circle cx={px(at)} cy={py(at)} r={radius(at) + 4} class="ring" aria-hidden="true" />
          <text
            class="tkc-label tkc-halo tag"
            x={px(at) + (tagLeft ? -1 : 1) * (radius(at) + 7)}
            y={py(at) + (tagBelow ? radius(at) + 16 : -radius(at) - 5)}
            text-anchor={tagLeft ? 'end' : 'start'}
            aria-hidden="true">{LOSS}% loss</text
          >
        </svg>
        <p class="readout">
          <strong>{who(at)}</strong>, with {links(at)} partners and {capital[at]}% capital, fails if its losses exceed its
          capital: here, {rule}.
        </p>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-ring"></span>Where the loss lands</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Failed</span>
          {#if share !== 'none'}<span><span class="tkc-swatch sw-extra"></span>Extra for the hubs</span>{/if}
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat label="Banks that fail, from this landing" value="{count} of {N}" sub={failSub} swatch="var(--tkc-conditions)" />
        <Stat label="Capital added" value={addValue} sub={addSub} />
      </div>

      {#snippet model()}
        <p>Each bank lends {INTERBANK_PCT}% of its assets to its partners, split evenly; every link runs both ways. A bank with k partners loses {INTERBANK_PCT} ÷ k % for each one that fails, and fails once its losses exceed its capital. Failures spread in rounds until a round adds none. Capital moves in whole percentage points; what is added counts from today’s {CAPITAL}%.</p>
        <p>As it is, the network grows by preferential attachment: each new bank links to two others, more often to those with many links already. Across {ALTERNATIVES} networks grown this way, {CAPITAL}% with four more for the 12 biggest keeps every landing to {WORDS[LIMIT]} failures or fewer in {robust}; {tipTop12}% with four more, in {robustLower}. Many similar banks: every pair is linked with the same chance; across {ALTERNATIVES} such networks, no landing at {CAPITAL}% brings down more than {WORDS[similarMost]}. After Watts (2002) and Gai and Kapadia (2010).</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      At {CAPITAL}% the system looks sound from almost everywhere: of the {N} places the loss can land, {atMostNine}
      bring down nine banks or fewer. The {WORDS[allFall]} biggest hubs each bring down all {N}: robust yet
      fragile, as central bankers came to call it.
    </p>
    <p>
      Each bank hangs on an <strong>IF</strong>: it fails if its losses exceed its capital. Through its loans the IF
      becomes a quorum: a small bank falls if {WORDS[smallK]} of its two partners fails, the biggest if {WORDS[hubK]} of
      its {WORDS[hubLinks]} do. When the hub falls, each round of failures sets up the next: a loop that feeds itself.
    </p>
    <p>
      So one bank’s IF becomes the system’s tipping point, the cliff in the curve. Raising every bank to {evenly}% spends the {EXTRA} percentage points and changes nothing: the cliff is at {tipNone}%. Four more each for the 12 biggest puts the buffer where the links meet, and the cliff moves to {tipTop12}%. Many similar banks, about
      {WORDS[SIMILAR_LINKS]} partners each, absorb what the hubs pass on: at {CAPITAL}% no landing brings down more than
      {WORDS[similarMost]}, and their cliff sits at {tipSimilar}%, unaided. Robust yet fragile belongs to the hubs.
    </p>
    <p>
      September 2008 had this shape. A large investment bank, a hub, was allowed to fail on the 15th. The next day an
      insurer that had sold credit protection to banks around the world was rescued: its failure would have passed the
      loss to all of them.
    </p>
    <h3>Hubs inside organizations</h3>
    <p>
      Organizations grow hubs the same way. Work flows to whoever already handles the most: the expert everyone
      asks, the committee that sees every deal or the system every other system reads from. On a normal day a hub is
      efficient. On a bad day it is where a loss travels furthest, and where a deputy or a second route counts most.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which partner, supplier or system in our chain would bring down many others if it failed?">
      <p>
        In 2011 the world’s bank supervisors agreed that the banks whose failure would travel furthest should hold more
        capital than the rest: 1 to 3.5 extra percentage points of risk-weighted assets, set by how large, interlinked, complex, global and hard to replace a
        bank is. National supervisors now do the same for the banks that matter most at home.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .ctl {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  /* The three choices keep to one row on a phone. */
  @container fig (max-width: 420px) {
    .ctl :global(.opts label) {
      padding-inline: 6px;
    }
  }
  .net svg {
    cursor: pointer;
    touch-action: manipulation;
  }
  /* The curve sits right under the controls, so the lever and the cliff can be watched together; the
     network where the loss lands follows. */
  .net {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    border-top: 1px solid var(--tkc-hair);
    padding-top: 14px;
  }
  .readout {
    font-size: 0.875rem;
    line-height: 1.45;
    color: var(--tkc-ink-2);
    text-wrap: pretty;
  }
  .readout strong {
    color: var(--tkc-ink);
    font-weight: 650;
  }
  .edge {
    stroke: var(--tkc-rule);
    stroke-width: 1;
    opacity: 0.8;
  }
  .edge.hot {
    stroke: var(--tkc-conditions);
    opacity: 0.5;
  }
  .bank {
    fill: var(--tkc-surface);
    stroke: var(--tkc-ink-2);
    stroke-width: 1.5;
    transition: fill 180ms ease, stroke 180ms ease;
  }
  .bank.extra {
    stroke: var(--tkc-options);
    stroke-width: 2.5;
  }
  .bank.failed {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
  }
  .bank:focus {
    outline: none;
  }
  .bank:focus-visible {
    stroke: var(--tkc-focus);
    stroke-width: 3;
  }
  .ring {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 2;
    pointer-events: none;
  }
  .tag {
    font-weight: 650;
    pointer-events: none;
  }
  .sw-ring {
    width: 12px;
    height: 12px;
    background: transparent;
    box-shadow: inset 0 0 0 2px var(--tkc-ink);
    border-radius: 50%;
  }
  .sw-extra {
    background: var(--tkc-surface);
    box-shadow: inset 0 0 0 2.5px var(--tkc-options);
    border-radius: 50%;
  }
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  /* "48 of 48" stays on one line, in a smaller size on the narrowest phones. */
  .two :global(.tkc-stat-value) {
    white-space: nowrap;
  }
  @container fig (max-width: 300px) {
    .two :global(.tkc-stat-value) {
      font-size: 1.25rem;
    }
  }
  .curve {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
  .small {
    font-size: 0.9375rem;
  }
  .limit {
    stroke: var(--tkc-ink-2);
    stroke-width: 1.25;
    stroke-dasharray: 5 4;
  }
  .faint {
    fill: none;
    stroke: var(--tkc-rule);
    stroke-width: 1.75;
    stroke-linejoin: round;
  }
  /* The other banking system, same extra: dotted, so it is not taken for the dashed limit. */
  .twin {
    fill: none;
    stroke: var(--tkc-muted);
    stroke-width: 2;
    stroke-dasharray: 0.5 4.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .grey-tag,
  .twin-tag {
    fill: var(--tkc-muted);
    font-size: 12px;
  }
  .sw-dots {
    width: 15px;
    height: 3px;
    border-radius: 0;
    background: radial-gradient(circle, var(--tkc-muted) 1.2px, transparent 1.4px) 0 50% / 5px 3px repeat-x;
  }
  .bold {
    fill: none;
    stroke: var(--tkc-conditions);
    stroke-width: 2.5;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .pt-small {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
  }
  .pt {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 2;
  }
  .now {
    stroke: var(--tkc-ink);
    stroke-width: 1;
  }
  .cross {
    stroke: var(--tkc-muted);
    stroke-width: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .bank {
      transition: none;
    }
  }
</style>
