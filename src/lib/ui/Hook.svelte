<script>
  // The opening puzzle: guess, then watch 100 loans flow through a chain of checks.
  import { getContext, onDestroy, tick } from 'svelte';
  import { makeRng } from '../sim/rng.js';
  import { prefersReducedMotion } from '../motion.js';

  const prefix = getContext('tkc-id') ?? 'tkc';
  const go = getContext('tkc-go');
  const game = getContext('tkc-game');
  const total = getContext('tkc-total') ?? 12;
  const NAMES = ['Client file', 'Credit', 'E&S review', 'Legal', 'Limits', 'Payments', 'Sanctions', 'Collateral', 'Impact', 'Treasury', 'Archive', 'Access'];
  const REASONS = ['missing document', 'data mismatch', 'approver away', 'system down', 'awaiting sign-off', 'wrong format', 'old version', 'stale value', 'false alert', 'posting error', 'retention flag', 'access expired'];
  const RELIABILITY = 0.95;
  const REQUESTS = 100;

  let guess = $state(50);
  let scoredRun = $state(false); // whether the run on show is the one that set the opening puzzle's points
  let phase = $state('ask'); // ask | run | done
  let gates = $state(6);
  let backups = $state(false);
  let runs = $state([]); // history of { gates, backups, through, guess }
  let width = $state(560);
  let t = $state(0);
  let announce = $state('');
  let raf = 0;
  let seed = 1;
  let guessEl = $state();
  let statusEl = $state();
  let resultEl = $state();
  let picEl = $state();

  const pass = $derived(backups ? 1 - (1 - RELIABILITY) ** 2 : RELIABILITY);

  // Exact counts at each gate (rounded), so the picture matches the arithmetic.
  function plan(n, q, s) {
    const rng = makeRng(s);
    const alive = Array.from({ length: REQUESTS }, (_, i) => i);
    const stuckAt = new Array(REQUESTS).fill(-1);
    for (let k = 0; k < n; k++) {
      const target = Math.round(REQUESTS * q ** (k + 1));
      while (alive.length > target) {
        const j = Math.floor(rng() * alive.length);
        stuckAt[alive[j]] = k;
        alive.splice(j, 1);
      }
    }
    return { stuckAt, through: alive.length, jitter: Array.from({ length: REQUESTS }, () => rng() * 2 - 1) };
  }
  let flow = $state(plan(6, RELIABILITY, 1));

  // Geometry: an inbox of 100 requests, a lane through the gates, and a tray for what gets through.
  const H = 250;
  const laneY = 74;
  const trayY = 200;
  const narrow = $derived(width < 480);
  const ip = $derived(narrow ? 5 : 6); // spacing of the waiting requests
  const inboxX = 2;
  const laneStart = $derived(inboxX + ip * 10 + 12);
  const pileCols = $derived(narrow ? 6 : 8);
  const endX = $derived(width - pileCols * 7 - 12);
  const gateFrom = $derived(laneStart + 14);
  const spacing = $derived((endX - 14 - gateFrom) / gates);
  const gateX = (k) => gateFrom + spacing * (k + 0.5);
  const gateW = $derived(Math.max(8, Math.min(22, spacing * 0.7)));
  const stackCols = $derived(spacing < 24 ? 2 : 3);
  const showNames = $derived(spacing >= 70);
  const showReasons = $derived(spacing >= 112);
  const showCounts = $derived(spacing >= 22);
  const dotR = $derived(narrow ? 2.2 : 2.6);
  const inboxPos = (i) => ({ x: inboxX + 4 + (i % 10) * ip, y: laneY - 4.5 * ip + Math.floor(i / 10) * ip });
  const pileX = (slot) => endX + 8 + (slot % pileCols) * 7;
  const pileY = (slot) => trayY - Math.floor(slot / pileCols) * 7;

  // The first run is the show; repeat runs are quicker.
  const ENTER = 160;
  const FALL = 450;
  let duration = 2400;
  let stagger = 22;
  const totalTime = () => (REQUESTS - 1) * stagger + ENTER + duration + FALL + 100;
  const ease = (f) => f * f * (3 - 2 * f);

  function position(i) {
    const start = i * stagger;
    const home = inboxPos(i);
    if (t < start) return { ...home, state: 'wait' };
    const y = laneY + flow.jitter[i] * 9;
    const since = t - start;
    if (since < ENTER) {
      const f = since / ENTER;
      return { x: home.x + (laneStart - home.x) * f, y: home.y + (y - home.y) * f, state: 'move' };
    }
    const tt = since - ENTER;
    const travel = endX - laneStart;
    const k = flow.stuckAt[i];
    if (k >= 0) {
      const gx = gateX(k);
      const reach = ((gx - laneStart) / travel) * duration;
      if (tt < reach) return { x: laneStart + (tt / duration) * travel, y, state: 'move' };
      const slot = stackSlots[i];
      const tx = gx + ((slot % stackCols) - (stackCols - 1) / 2) * 6;
      const ty = trayY - Math.floor(slot / stackCols) * 6;
      const e = ease(Math.min(1, (tt - reach) / FALL));
      return { x: gx + (tx - gx) * e, y: y + (ty - y) * e, state: 'stuck' };
    }
    if (tt < duration) return { x: laneStart + (tt / duration) * travel, y, state: 'move' };
    const slot = pileSlots[i];
    const e = ease(Math.min(1, (tt - duration) / FALL));
    return { x: endX + (pileX(slot) - endX) * e, y: y + (pileY(slot) - y) * e, state: 'through' };
  }

  // Slot numbers for stacking, computed once per run.
  let stackSlots = [];
  let pileSlots = [];
  function prepareSlots() {
    const perGate = new Array(gates).fill(0);
    let pile = 0;
    stackSlots = flow.stuckAt.map((k) => (k >= 0 ? perGate[k]++ : -1));
    pileSlots = flow.stuckAt.map((k) => (k < 0 ? pile++ : -1));
  }
  prepareSlots();

  const stuckCounts = $derived.by(() => {
    const c = new Array(gates).fill(0);
    flow.stuckAt.forEach((k) => k >= 0 && c[k]++);
    return c;
  });
  // The reader's guess, drawn as hollow dots in the tray, until the first run is over.
  const showGuess = $derived(phase === 'ask' || runs.length === 0 || (phase === 'done' && runs.length === 1));

  async function send(next = {}) {
    cancelAnimationFrame(raf);
    if (next.gates) gates = next.gates;
    if (next.backups !== undefined) backups = next.backups;
    duration = runs.length ? 1500 : 2400;
    stagger = runs.length ? 12 : 22;
    seed += 1;
    flow = plan(gates, pass, seed);
    prepareSlots();
    phase = 'run';
    announce = `Sending 100 loans through ${describe({ gates, backups })}.`;
    const reduced = prefersReducedMotion();
    await tick();
    statusEl?.focus({ preventScroll: true });
    if (reduced) {
      finish();
      return;
    }
    // On a narrow screen the picture sits below the controls: bring it into view to watch.
    if (picEl) {
      const box = picEl.getBoundingClientRect();
      if (box.bottom > window.innerHeight || box.top < 0) picEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    t = 0;
    let last = 0;
    const step = (now) => {
      if (!last) last = now;
      t += Math.min(50, now - last);
      last = now;
      if (t >= totalTime()) {
        finish();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  async function finish() {
    t = totalTime();
    phase = 'done';
    runs = [...runs, { gates, backups, through: flow.through, guess }];
    // The opening guess is the first puzzle: two points within 5, one within 10.
    scoredRun = runs.length === 1 && !!game?.isOpen('start');
    if (scoredRun) {
      const off = Math.abs(guess - flow.through);
      if (off <= 5) game.solve('start');
      else if (off <= 10) (game.help('start'), game.solve('start'));
      else game.show('start');
    }
    announce = `${flow.through} of 100 got through ${describe({ gates, backups })}.${runs.length === 1 ? ` You guessed ${guess}.` : ''}`;
    await tick();
    resultEl?.focus({ preventScroll: true });
    // On a phone the result can land below the fold: bring its first lines into view.
    const box = resultEl?.getBoundingClientRect();
    if (box && box.top > window.innerHeight - 160) resultEl.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  async function again() {
    cancelAnimationFrame(raf);
    gates = 6;
    backups = false;
    runs = [];
    phase = 'ask';
    announce = '';
    t = 0;
    flow = plan(6, RELIABILITY, seed);
    prepareSlots();
    await tick();
    guessEl?.focus();
  }

  onDestroy(() => cancelAnimationFrame(raf));

  const first = $derived(runs[0]);
  const latest = $derived(runs[runs.length - 1]);
  const describe = (r) => `${r.gates === 6 ? 'six' : r.gates === 12 ? 'twelve' : r.gates} checks${r.backups ? ', each with a backup' : ''}`;
  const entry = $derived(game?.entry('start'));
  const pointsText = $derived.by(() => {
    if (!entry || entry.status === 'open') return '';
    if (!scoredRun) return 'Practice run: your first guess set your score';
    return entry.points ? `Puzzle: ${entry.points} point${entry.points === 1 ? '' : 's'}` : 'Puzzle: no points this time';
  });
  const arithmetic = $derived(
    latest ? `${latest.backups ? '0.9975' : '0.95'} multiplied ${latest.gates} times ≈ ${Math.round(100 * (latest.backups ? 0.9975 : 0.95) ** latest.gates)}%` : '',
  );
  const picLabel = $derived(
    phase === 'ask'
      ? `${REQUESTS} loans waiting to pass ${gates} checks. Your guess, ${guess}, is drawn in the tray.`
      : `${REQUESTS} loans pass ${gates} checks; ${flow.through} get through.`,
  );
</script>

<div class="hook tkc-fig">
  <div class="grid">
    <div class="tkc-eyebrow head">Before you start: a quick guess</div>
    <p class="q" id="{prefix}-hook-q">
      A loan has to pass <strong>six checks</strong> before the money can be paid out. Each check clears it without a hitch
      <strong>95% of the time</strong>: no missing document, no approver away. Out of 100 loans, how many get through all
      six the first time?
    </p>

    {#if phase === 'ask'}
      <div class="ask">
        <label class="guess-label" for="{prefix}-guess">Your guess</label>
        <div class="guess-row">
          <input id="{prefix}-guess" type="range" min="0" max="100" bind:value={guess} bind:this={guessEl} aria-describedby="{prefix}-hook-q" style:--pct="{guess}%" />
          <output for="{prefix}-guess" class="guess-value tkc-num">{guess}</output>
        </div>
        <p class="tkc-small rule">{entry && entry.status !== 'open' ? 'Your first guess already counted; this one is practice.' : 'Within 5 of the result: 2 points. Within 10: 1 point.'}</p>
        <button type="button" class="tkc-btn tkc-btn--primary go" onclick={() => send()}>Send 100 loans</button>
      </div>
    {:else if phase === 'run'}
      <p class="ask running" tabindex="-1" bind:this={statusEl}>
        {runs.length === 0 ? `You guessed ${guess}. ` : ''}Sending 100 loans through {describe({ gates, backups })}…
      </p>
    {/if}

    <div class="pic tkc-chart" bind:clientWidth={width} bind:this={picEl}>
      <svg {width} height={H} role="img" aria-label={picLabel}>
        <rect x={inboxX} y={laneY - 5 * ip - 4} width={ip * 10 + 4} height={ip * 10 + 8} rx="6" class="inbox" />
        <text class="tkc-axis-label" x={inboxX} y={laneY - 5 * ip - 12}>{REQUESTS} loans</text>
        <line x1={laneStart} x2={endX} y1={laneY} y2={laneY} class="lane" />
        {#each Array(gates) as _, k}
          {@const x = gateX(k)}
          {#if backups}
            <rect x={x - gateW / 2 + 4} y={laneY - 27} width={gateW} height="44" rx={Math.min(6, gateW / 3)} class="gate twin" />
          {/if}
          <rect x={x - gateW / 2} y={laneY - 22} width={gateW} height="44" rx={Math.min(6, gateW / 3)} class="gate" />
          <text class="tkc-axis-label" x={x} y={laneY - 32} text-anchor="middle">{showNames ? NAMES[k] : k + 1}</text>
          {#if phase === 'done' && stuckCounts[k] > 0 && showCounts}
            <text class="tkc-label stuck-n" x={x} y={trayY + 22} text-anchor="middle">−{stuckCounts[k]}</text>
            {#if showReasons}<text class="tkc-axis-label" x={x} y={trayY + 36} text-anchor="middle">{REASONS[k]}</text>{/if}
          {/if}
        {/each}
        <line x1={gateFrom} x2={endX - 6} y1={trayY + 6} y2={trayY + 6} class="tray" />
        <text class="tkc-axis-label" x={gateFrom} y={H - 4}>{phase === 'done' ? `Stuck: ${REQUESTS - flow.through}` : 'Stuck'}</text>
        <text class="tkc-axis-label" x={width - 2} y={laneY - 32} text-anchor="end">Through</text>
        <line x1={endX + 4} x2={width - 2} y1={trayY + 6} y2={trayY + 6} class="tray" />
        {#if showGuess}
          {#each Array(guess) as _, slot}
            <circle cx={pileX(slot)} cy={pileY(slot)} r={dotR} class="ghost" />
          {/each}
          <text class="tkc-axis-label" x={width - 2} y={trayY + 22} text-anchor="end">Guess {guess}</text>
        {/if}
        {#if phase === 'done'}
          <text class="tkc-label through-n" x={width - 2} y={showGuess ? trayY + 38 : trayY + 22} text-anchor="end">{flow.through} through</text>
        {/if}
        {#each Array(REQUESTS) as _, i}
          {@const p = position(i)}
          <circle cx={p.x} cy={p.y} r={dotR} class="dot {p.state}" />
        {/each}
      </svg>
    </div>

    {#if phase === 'done' && latest}
      <div class="result" tabindex="-1" bind:this={resultEl}>
        <div class="big">
          <span class="num">{latest.through}</span>
          <span class="of">of 100 got through {describe(latest)}</span>
        </div>
        {#if runs.length === 1}
          <p class="lead">
            You guessed {first.guess}.
            {#if Math.abs(first.guess - first.through) <= 5}
              Spot on. Each check looks safe on its own, yet one loan in four gets stuck: {arithmetic}.
            {:else if first.guess > first.through}
              Most people guess higher. Each check looks safe on its own, yet one loan in four gets stuck, because the
              chances multiply: {arithmetic}.
            {:else}
              Fewer get stuck than that: {arithmetic}. Still, one loan in four does.
            {/if}
            {#if pointsText}<span class="points" class:none={!scoredRun || !entry?.points}>{pointsText}</span>{/if}
          </p>
        {:else if latest.backups}
          <p class="lead">
            Same {latest.gates === 6 ? 'six' : 'twelve'} checks, same 95%. The only change: each has a backup, a second person or a second system, so a loan
            is stuck only when both fail. Conditions multiply the risk; alternatives divide it.
          </p>
        {:else}
          <p class="lead">Twice the checks, and almost half the loans get stuck: {arithmetic}. Every new condition multiplies in another 95%.</p>
        {/if}
        <div class="tkc-row">
          {#if !(latest.gates === 12 && !latest.backups)}
            <button type="button" class="tkc-btn tkc-btn--small" onclick={() => send({ gates: 12, backups: false })}>Now try twelve checks</button>
          {/if}
          {#if !latest.backups}
            <button type="button" class="tkc-btn tkc-btn--small" onclick={() => send({ gates: latest.gates, backups: true })}>Give every check a backup</button>
          {/if}
          <button type="button" class="tkc-btn tkc-btn--small" onclick={again}>Start over</button>
        </div>
        {#if runs.length > 1}
          <ul class="history">
            {#each runs as r, i (i)}
              <li><span class="tkc-num">{r.through}</span> of 100 · {describe(r)}</li>
            {/each}
          </ul>
        {/if}
        <div class="next">
          <button type="button" class="tkc-btn tkc-btn--primary" onclick={() => go?.(1)}>Start the story →</button>
          <span class="tkc-small">{(game?.ids.length ?? total + 1) - 1} more puzzles about why this happens, and what changes it.</span>
        </div>
      </div>
    {/if}
  </div>
  <p class="tkc-sr" aria-live="polite">{announce}</p>
</div>

<style>
  /* One column on a phone: question, guess, picture, result. Two on a wide card:
     the question and the guess or result on the left, the picture on the right. */
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'head' 'q' 'ask' 'pic' 'result';
    gap: 14px;
    min-width: 0;
  }
  @container fig (min-width: 860px) {
    .grid {
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      grid-template-areas: 'head pic' 'q pic' 'ask pic' 'result pic';
      grid-template-rows: auto auto auto 1fr;
      column-gap: clamp(24px, 4cqi, 48px);
    }
    .pic {
      align-self: start;
      padding-top: 8px;
    }
  }
  .head {
    grid-area: head;
  }
  .q {
    grid-area: q;
    font-family: var(--tkc-font-display);
    font-weight: 600;
    font-size: clamp(1.2rem, 1rem + 1cqi, 1.55rem);
    line-height: 1.3;
    text-wrap: pretty;
    max-width: 44rem;
  }
  .q strong {
    font-weight: 600;
    text-decoration: underline;
    text-decoration-color: var(--tkc-rule);
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
  }
  .ask {
    grid-area: ask;
    display: grid;
    gap: 8px;
    max-width: 30rem;
  }
  .running {
    color: var(--tkc-ink-2);
    font-weight: 600;
    min-height: 46px;
    align-content: center;
  }
  .running:focus {
    outline: none;
  }
  .pic {
    grid-area: pic;
  }
  .result {
    grid-area: result;
    display: grid;
    gap: 10px;
    align-content: start;
  }
  .result:focus {
    outline: none;
  }
  .result:focus-visible {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 4px;
    border-radius: 6px;
  }
  .guess-label {
    font-size: 0.875rem;
    font-weight: 600;
  }
  .guess-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .guess-value {
    font-size: 2.25rem;
    font-weight: 650;
    min-width: 3ch;
    text-align: right;
    line-height: 1.1;
  }
  .go {
    justify-self: start;
    min-height: 46px;
    padding-inline: 1.3em;
  }
  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    height: 28px;
    margin: 0;
    background: transparent;
    cursor: pointer;
  }
  input[type='range']::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, var(--tkc-ink) var(--pct), var(--tkc-rule) var(--pct));
  }
  input[type='range']::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, var(--tkc-ink) var(--pct), var(--tkc-rule) var(--pct));
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    margin-top: -9px;
    border-radius: 50%;
    background: var(--tkc-surface);
    border: 2px solid var(--tkc-ink);
  }
  input[type='range']::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--tkc-surface);
    border: 2px solid var(--tkc-ink);
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
  .inbox {
    fill: var(--tkc-sunken);
    stroke: var(--tkc-hair);
  }
  .lane {
    stroke: var(--tkc-hair);
    stroke-width: 26;
    stroke-linecap: round;
  }
  .tray {
    stroke: var(--tkc-rule);
    stroke-width: 1;
  }
  .gate {
    fill: var(--tkc-surface);
    stroke: var(--tkc-ink-2);
    stroke-width: 1.5;
  }
  .gate.twin {
    stroke: var(--tkc-options);
  }
  .ghost {
    fill: none;
    stroke: var(--tkc-muted);
    stroke-width: 1;
  }
  .dot {
    fill: var(--tkc-ink-2);
  }
  .dot.stuck {
    fill: var(--tkc-conditions);
  }
  .dot.through {
    fill: var(--tkc-options);
  }
  .stuck-n {
    fill: var(--tkc-conditions-ink);
  }
  .through-n {
    fill: var(--tkc-options-ink);
  }
  .big {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
  }
  .num {
    font-size: clamp(2.6rem, 2rem + 3cqi, 3.6rem);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .of {
    font-size: 1.0625rem;
    color: var(--tkc-ink-2);
  }
  .lead {
    max-width: 42rem;
    text-wrap: pretty;
  }
  .points {
    display: inline-block;
    margin-left: 6px;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--tkc-options-ink);
    background: var(--tkc-options-wash);
  }
  .points.none {
    color: var(--tkc-muted);
    background: var(--tkc-sunken);
  }
  .rule {
    color: var(--tkc-muted);
  }
  .history {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    font-size: 0.875rem;
    color: var(--tkc-ink-2);
  }
  .history .tkc-num {
    font-weight: 700;
    color: var(--tkc-ink);
  }
  .next {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
    padding-top: 10px;
    border-top: 1px solid var(--tkc-hair);
  }
</style>
