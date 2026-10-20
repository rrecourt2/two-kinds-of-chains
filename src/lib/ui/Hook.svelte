<script>
  // The opening hook: guess, then watch 100 requests flow through a chain of systems.
  import { getContext, onDestroy } from 'svelte';
  import { makeRng } from '../sim/rng.js';
  import { prefersReducedMotion } from '../motion.js';

  const prefix = getContext('tkc-id') ?? 'tkc';
  const NAMES = ['Client file', 'Risk model', 'Limits', 'Pricing', 'Booking', 'Reporting', 'Documents', 'Collateral', 'Sanctions', 'Accounting', 'Archive', 'Access'];
  const REASONS = ['missing field', 'data mismatch', 'approver away', 'system down', 'awaiting sign-off', 'wrong format', 'old version', 'stale value', 'false alert', 'posting error', 'retention flag', 'access expired'];
  const RELIABILITY = 0.95;
  const REQUESTS = 100;

  let guess = $state(50);
  let phase = $state('ask'); // ask | run | done
  let gates = $state(6);
  let backups = $state(false);
  let runs = $state([]); // history of { gates, backups, through, guess }
  let width = $state(640);
  let t = $state(0);
  let raf = 0;
  let seed = 1;

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

  // Geometry.
  const H = 252;
  const laneY = 64;
  const trayY = 214;
  const left = 18;
  const pileW = $derived(width < 480 ? 56 : 76);
  const span = $derived(width - left - pileW - 18);
  const gateX = (k) => left + 24 + ((span - 24) * (k + 0.5)) / gates;
  const endX = $derived(left + span + 10);
  const showNames = $derived(span / gates >= 74);
  const DURATION = 2600; // ms for one request to cross
  const STAGGER = 26;
  const FALL = 450;

  function position(i) {
    const start = i * STAGGER;
    const x0 = left;
    const travel = endX - x0;
    const p = Math.max(0, t - start) / DURATION;
    const y = laneY + flow.jitter[i] * 11;
    const k = flow.stuckAt[i];
    if (t < start) return { x: x0, y, state: 'wait' };
    if (k >= 0) {
      const gx = gateX(k);
      const reach = ((gx - x0) / travel) * DURATION;
      const since = t - start - reach;
      if (since < 0) return { x: x0 + p * travel, y, state: 'move' };
      const slot = stackIndex(i, k);
      const tx = gx + ((slot % 3) - 1) * 7;
      const ty = trayY - Math.floor(slot / 3) * 7;
      const f = Math.min(1, since / FALL);
      const ease = f * f * (3 - 2 * f);
      return { x: gx + (tx - gx) * ease, y: y + (ty - y) * ease, state: 'stuck' };
    }
    if (p < 1) return { x: x0 + p * travel, y, state: 'move' };
    const slot = pileIndex(i);
    const cols = width < 480 ? 6 : 8;
    const since = t - start - DURATION;
    const f = Math.min(1, since / FALL);
    const ease = f * f * (3 - 2 * f);
    const tx = endX + 4 + (slot % cols) * 7;
    const ty = trayY - Math.floor(slot / cols) * 7;
    return { x: endX + (tx - endX) * ease, y: y + (ty - y) * ease, state: 'through' };
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
  const stackIndex = (i) => stackSlots[i];
  const pileIndex = (i) => pileSlots[i];
  prepareSlots();

  const totalTime = () => (REQUESTS - 1) * STAGGER + DURATION + FALL + 100;
  const stuckCounts = $derived.by(() => {
    const c = new Array(gates).fill(0);
    flow.stuckAt.forEach((k) => k >= 0 && c[k]++);
    return c;
  });

  function send(next = {}) {
    cancelAnimationFrame(raf);
    if (next.gates) gates = next.gates;
    if (next.backups !== undefined) backups = next.backups;
    seed += 1;
    flow = plan(gates, pass, seed);
    prepareSlots();
    phase = 'run';
    if (prefersReducedMotion()) {
      t = totalTime();
      finish();
      return;
    }
    t = 0;
    let last = 0;
    const tick = (now) => {
      if (!last) last = now;
      t += Math.min(50, now - last);
      last = now;
      if (t >= totalTime()) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function finish() {
    t = totalTime();
    phase = 'done';
    runs = [...runs, { gates, backups, through: flow.through, guess }];
  }

  function again() {
    cancelAnimationFrame(raf);
    gates = 6;
    backups = false;
    runs = [];
    phase = 'ask';
    t = 0;
    flow = plan(6, RELIABILITY, seed);
    prepareSlots();
  }

  onDestroy(() => cancelAnimationFrame(raf));

  const first = $derived(runs[0]);
  const latest = $derived(runs[runs.length - 1]);
  const describe = (r) => `${r.gates} systems${r.backups ? ', each with a backup' : ''}`;
  const arithmetic = $derived(
    latest ? `${latest.backups ? '0.9975' : '0.95'} multiplied ${latest.gates} times ≈ ${Math.round(100 * (latest.backups ? 0.9975 : 0.95) ** latest.gates)}%` : '',
  );
</script>

<div class="hook tkc-fig" aria-labelledby="{prefix}-hook-q">
  <div class="tkc-eyebrow">Before you start: a quick guess</div>
  <p class="q" id="{prefix}-hook-q">
    A client request has to pass through <strong>six systems</strong>, each built by a different specialist team.
    Each one works <strong>95% of the time</strong>. Out of 100 requests, how many get all the way through without
    getting stuck?
  </p>

  {#if phase === 'ask'}
    <div class="ask">
      <label class="guess-label" for="{prefix}-guess">Your guess</label>
      <div class="guess-row">
        <input id="{prefix}-guess" type="range" min="0" max="100" bind:value={guess} style:--pct="{guess}%" />
        <output for="{prefix}-guess" class="guess-value">{guess}</output>
      </div>
      <button type="button" class="tkc-btn tkc-btn--primary go" onclick={() => send()}>Send 100 requests</button>
    </div>
  {/if}

  {#if phase !== 'ask'}
    <div class="tkc-chart" bind:clientWidth={width}>
      <svg {width} height={H} role="img" aria-label="{REQUESTS} requests flow through {gates} systems; {flow.through} get through.">
        <line x1={left} x2={endX} y1={laneY} y2={laneY} class="lane" />
        {#each Array(gates) as _, k}
          {@const x = gateX(k)}
          {#if backups}
            <rect x={x - 9} y={laneY - 27} width="22" height="44" rx="6" class="gate twin" />
          {/if}
          <rect x={x - 13} y={laneY - 22} width="22" height="44" rx="6" class="gate" />
          <text class="tkc-axis-label" x={x - 2} y={laneY - 32} text-anchor="middle">{showNames ? NAMES[k] : k + 1}</text>
          {#if phase === 'done' && stuckCounts[k] > 0}
            <text class="tkc-label" x={x} y={trayY + 22} text-anchor="middle">−{stuckCounts[k]}</text>
            {#if showNames}<text class="tkc-axis-label" x={x} y={trayY + 36} text-anchor="middle">{REASONS[k]}</text>{/if}
          {/if}
        {/each}
        <line x1={left} x2={endX - 8} y1={trayY + 6} y2={trayY + 6} class="tray" />
        <text class="tkc-axis-label" x={endX + 4} y={laneY - 32}>Through</text>
        {#each Array(REQUESTS) as _, i}
          {@const p = position(i)}
          {#if p.state !== 'wait'}
            <circle cx={p.x} cy={p.y} r="3" class="dot {p.state}" />
          {/if}
        {/each}
      </svg>
    </div>
  {/if}

  {#if phase === 'done' && latest}
    <div class="result" aria-live="polite">
      <div class="big">
        <span class="num">{latest.through}</span>
        <span class="of">of 100 got through {describe(latest)}</span>
      </div>
      {#if runs.length === 1}
        <p class="lead">
          You guessed {first.guess}.
          {#if Math.abs(first.guess - first.through) <= 4}
            Well done: you multiplied the chances instead of adding them.
          {:else if first.guess > first.through}
            Six steps that each work 95% of the time do not make a 95% process. They make a 74% one, because the chances
            multiply: {arithmetic}.
          {:else}
            It is better than that, but not by much: {arithmetic}.
          {/if}
        </p>
      {:else if latest.backups}
        <p class="lead">
          Same six systems, same 95%. The only change: every step has an alternative, a stand-in or a second system, so it
          is stuck only when both fail. Links that must all hold multiply the risk; links with alternatives divide it.
        </p>
      {:else}
        <p class="lead">Twice the systems, and almost half the requests get stuck: {arithmetic}. Every new link multiplies in another 95%.</p>
      {/if}
      <div class="tkc-row">
        {#if !(latest.gates === 12 && !latest.backups)}
          <button type="button" class="tkc-btn tkc-btn--small" onclick={() => send({ gates: 12, backups: false })}>Now try twelve systems</button>
        {/if}
        {#if !latest.backups}
          <button type="button" class="tkc-btn tkc-btn--small" onclick={() => send({ gates: 6, backups: true })}>Give every step a backup</button>
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
    </div>
  {/if}
</div>

<style>
  .hook {
    gap: 14px;
  }
  .q {
    font-family: var(--tkc-font-display);
    font-weight: 600;
    font-size: clamp(1.25rem, 1rem + 1.2cqi, 1.65rem);
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
    display: grid;
    gap: 10px;
    max-width: 30rem;
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
  .dot {
    fill: var(--tkc-ink-2);
  }
  .dot.stuck {
    fill: var(--tkc-conditions);
  }
  .dot.through {
    fill: var(--tkc-options);
  }
  .result {
    display: grid;
    gap: 10px;
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
</style>
