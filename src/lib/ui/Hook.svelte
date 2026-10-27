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
  let stripW = $state(320);
  let t = $state(0);
  let announce = $state('');
  let raf = 0;
  let guessEl = $state();
  let statusEl = $state();
  let resultEl = $state();
  let picEl = $state();

  // Every run draws its own luck: each loan meets each check afresh, and clears it 95% of the time. With a
  // backup, a check that trips is tried a second time, and the loan is stuck only when both fail.
  function plan(n, withBackups, s) {
    const rng = makeRng(s);
    const stuckAt = new Array(REQUESTS).fill(-1);
    const savedAt = Array.from({ length: REQUESTS }, () => []);
    const saved = new Array(n).fill(0);
    for (let i = 0; i < REQUESTS; i++) {
      for (let k = 0; k < n; k++) {
        if (rng() < RELIABILITY) continue;
        if (withBackups && rng() < RELIABILITY) {
          savedAt[i].push(k);
          saved[k]++;
          continue;
        }
        stuckAt[i] = k;
        break;
      }
    }
    const through = stuckAt.filter((k) => k < 0).length;
    return { stuckAt, savedAt, saved, through, jitter: Array.from({ length: REQUESTS }, () => rng() * 2 - 1) };
  }
  const freshSeed = () => Math.floor(Math.random() * 2 ** 31) + 1;
  let flow = $state(plan(6, false, 1));

  // What to expect, and how far one run of 100 strays from it: the share that clears every check, and the
  // counts between which nine runs in ten end (the 5th and 95th percentiles of a binomial count).
  const passOf = (r) => (r.backups ? 1 - (1 - RELIABILITY) ** 2 : RELIABILITY) ** r.gates;
  const expectOf = (r) => Math.round(REQUESTS * passOf(r));
  function spreadOf(r) {
    const p = passOf(r);
    let pmf = (1 - p) ** REQUESTS;
    let cdf = 0;
    let lo = null;
    let hi = null;
    for (let k = 0; k <= REQUESTS; k++) {
      cdf += pmf;
      if (lo === null && cdf > 0.05) lo = k;
      if (hi === null && cdf >= 0.95) hi = k;
      pmf *= ((REQUESTS - k) / (k + 1)) * (p / (1 - p));
    }
    return { lo, hi };
  }

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
    if (tt < duration) {
      const x = laneStart + (tt / duration) * travel;
      // A check trips on this loan and its backup clears it: blue while it passes that gate.
      const rescue = flow.savedAt[i].some((g) => Math.abs(x - gateX(g)) <= gateW / 2 + 5);
      return { x, y, state: rescue ? 'saved' : 'move' };
    }
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
    flow = plan(gates, backups, freshSeed());
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
    // The opening guess is the first puzzle, judged against what to expect, not against one run's luck:
    // two points within 5, one within 10.
    scoredRun = runs.length === 1 && !!game?.isOpen('start');
    if (scoredRun) {
      const off = Math.abs(guess - expectOf({ gates, backups }));
      if (off <= 5) game.solve('start');
      else if (off <= 10) (game.help('start'), game.solve('start'));
      else game.show('start');
    }
    announce = `${flow.through} of 100 got through ${describe({ gates, backups })}.${runs.length === 1 ? ` You guessed ${guess}; expect about ${expectOf({ gates, backups })}.` : ''}`;
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
    flow = plan(6, false, 1);
    prepareSlots();
    await tick();
    guessEl?.focus();
  }

  onDestroy(() => cancelAnimationFrame(raf));

  const first = $derived(runs[0]);
  const latest = $derived(runs[runs.length - 1]);
  const previous = $derived(runs[runs.length - 2]);
  const word = (n) => (n === 6 ? 'six' : n === 12 ? 'twelve' : String(n));
  const describe = (r) => `${word(r.gates)} checks${r.backups ? ', each with a backup' : ''}`;

  // The tally: every run so far, grouped by the chain it went through, the latest chain's runs on a number line.
  const kindOf = (r) => `${r.gates}${r.backups ? 'b' : ''}`;
  const sameKind = (a, b) => !!a && !!b && kindOf(a) === kindOf(b);
  const SHOWN = 10; // the most runs listed for one chain; earlier ones are summed up as "…"
  const groups = $derived.by(() => {
    const out = [];
    for (const r of runs) {
      let g = out.find((x) => x.kind === kindOf(r));
      if (!g) out.push((g = { kind: kindOf(r), gates: r.gates, backups: r.backups, counts: [] }));
      g.counts.push(r.through);
    }
    return out;
  });
  const expected = $derived(latest ? expectOf(latest) : 0);
  const spread = $derived(latest ? spreadOf(latest) : { lo: 0, hi: 0 });
  const mine = $derived(latest ? runs.filter((r) => sameKind(r, latest)).map((r) => r.through) : []);
  // A short stretch of the line from 0 to 100: forty loans wide, around what to expect.
  const SH = 54;
  const WINDOW = 40;
  const from = $derived(Math.max(0, Math.min(REQUESTS - WINDOW, expected - WINDOW / 2)));
  const sx = (v) => 6 + ((stripW - 12) * (Math.max(from, Math.min(from + WINDOW, v)) - from)) / WINDOW;
  // Runs that ended on the same count stack upwards, four high at most.
  const stripDots = $derived.by(() => {
    const seen = {};
    return mine.map((v, k) => {
      const level = Math.min(3, (seen[v] = (seen[v] ?? -1) + 1));
      return { x: sx(v), y: 27 - level * 7, last: k === mine.length - 1 };
    });
  });
  const expectLabel = $derived.by(() => {
    const text = `expect ${expected}`;
    const w = text.length * 6.6;
    const x = Math.max(w / 2, Math.min(stripW - w / 2, sx(expected)));
    return { text, x, x0: x - w / 2, x1: x + w / 2 };
  });
  const stripLabel = $derived(
    `Your runs through ${latest ? describe(latest) : ''}: ${mine.join(', ')}. Expect about ${expected}; nine runs in ten end between ${spread.lo} and ${spread.hi}.`,
  );
  const savedTotal = $derived(flow.saved.reduce((a, b) => a + b, 0));
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
    <!-- The question follows the run on show: six checks, twelve, or twelve with a backup each. -->
    <p class="q" id="{prefix}-hook-q">
      {#if backups}
        The same {word(gates)} checks, each clearing a loan <strong>95% of the time</strong>, and now <strong>each with
        a backup</strong>: a second person or a second system. Out of 100 loans, how many get through?
      {:else if gates !== 6}
        Now <strong>{word(gates)} checks</strong>, each still clearing a loan without a hitch <strong>95% of the
        time</strong>. Out of 100 loans, how many get through all {word(gates)}?
      {:else}
        A loan has to pass <strong>six checks</strong> before the money can be paid out. Each check clears it without a
        hitch <strong>95% of the time</strong>: no missing document, no approver away. Out of 100 loans, how many get
        through all six the first time?
      {/if}
    </p>

    {#if phase === 'ask'}
      <div class="ask">
        <label class="guess-label" for="{prefix}-guess">Your guess</label>
        <div class="guess-row">
          <input id="{prefix}-guess" type="range" min="0" max="100" bind:value={guess} bind:this={guessEl} aria-describedby="{prefix}-hook-q" style:--pct="{guess}%" />
          <output for="{prefix}-guess" class="guess-value tkc-num">{guess}</output>
        </div>
        <p class="tkc-small rule">{entry && entry.status !== 'open' ? 'Your first guess already counted; this one is practice.' : 'Within 5 of what to expect: 2 points. Within 10: 1 point.'}</p>
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
          {#if phase === 'done' && backups && flow.saved[k] > 0 && showCounts}
            <text class="tkc-label saved-n" x={x} y={laneY + 38} text-anchor="middle">{showNames ? `${flow.saved[k]} saved` : flow.saved[k]}</text>
          {/if}
          {#if phase === 'done' && stuckCounts[k] > 0 && showCounts}
            <text class="tkc-label stuck-n" x={x} y={trayY + 22} text-anchor="middle">−{stuckCounts[k]}</text>
            {#if showReasons}<text class="tkc-axis-label" x={x} y={trayY + 36} text-anchor="middle">{REASONS[k]}</text>{/if}
          {/if}
        {/each}
        <!-- Two trays: the loans stuck at a check, and the loans that get through. -->
        <line x1={gateFrom} x2={endX - 6} y1={trayY + 6} y2={trayY + 6} class="tray" />
        <text class="tkc-axis-label" x={gateFrom} y={H - 4}>{phase === 'done' ? `Stuck: ${REQUESTS - flow.through}` : 'Stuck at a check'}</text>
        <line x1={endX + 4} x2={width - 2} y1={trayY + 6} y2={trayY + 6} class="tray" />
        {#if showGuess}
          {#each Array(guess) as _, slot}
            <circle cx={pileX(slot)} cy={pileY(slot)} r={dotR} class="ghost" />
          {/each}
        {/if}
        {#if phase === 'done'}
          <text class="tkc-label through-n" x={width - 2} y={trayY + 22} text-anchor="end">{flow.through} through</text>
        {:else}
          <text class="tkc-axis-label" x={width - 2} y={trayY + 22} text-anchor="end">Through</text>
        {/if}
        {#if showGuess}
          <!-- Before the run the guess is labelled on top of its pile; once loans arrive, under the tray. -->
          {#if phase === 'ask'}
            <text class="tkc-axis-label tkc-halo" x={width - 2} y={Math.max(laneY + 28, pileY(Math.max(0, guess - 1)) - (guess ? 9 : 0))} text-anchor="end">Your guess: {guess}</text>
          {:else}
            <text class="tkc-axis-label" x={width - 2} y={trayY + 38} text-anchor="end">Your guess: {guess}</text>
          {/if}
        {/if}
        {#each Array(REQUESTS) as _, i}
          {@const p = position(i)}
          <circle cx={p.x} cy={p.y} r={p.state === 'saved' ? dotR * 1.5 : dotR} class="dot {p.state}" />
        {/each}
      </svg>
      {#if backups}
        <div class="tkc-legend backup-key">
          <span><span class="tkc-swatch sw-twin"></span>Blue outline: a backup, a second person or system. A loan is stuck only when both fail.</span>
          <span><span class="tkc-swatch sw-saved"></span>{showCounts ? 'Blue figures under the checks: loans a backup saved there' : 'A loan flashes blue where a backup saves it'}</span>
        </div>
      {/if}
    </div>

    {#if phase === 'done' && latest}
      <div class="result" tabindex="-1" bind:this={resultEl}>
        <div class="big">
          <span class="num">{latest.through}</span>
          <span class="of">of 100 got through {describe(latest)}</span>
        </div>
        {#if runs.length === 1}
          {@const e = expectOf(first)}
          <p class="lead">
            You guessed {first.guess}.
            {#if Math.abs(first.guess - e) <= 5}
              Spot on: expect about {e} (this run: {first.through}). Each check looks safe on its own, yet one loan in four
              gets stuck: {arithmetic}.
            {:else if first.guess > e}
              Most people guess higher. Expect about {e} (this run: {first.through}): each check looks safe on its own, yet
              one loan in four gets stuck, because the chances multiply: {arithmetic}.
            {:else}
              Fewer get stuck than that: expect about {e} (this run: {first.through}), since {arithmetic}. Still, one loan in
              four does.
            {/if}
            {#if pointsText}<span class="points" class:none={!scoredRun || !entry?.points}>{pointsText}</span>{/if}
          </p>
        {:else if latest.backups}
          <p class="lead">
            Same {word(latest.gates)} checks, same 95%. The only change: each has a backup, a second person or a second system, so a loan
            is stuck only when both fail. The checks still tripped {savedTotal + REQUESTS - latest.through} times; the backups saved
            {savedTotal} of them. Conditions multiply the risk; alternatives divide it.
          </p>
        {:else if sameKind(latest, previous)}
          <p class="lead">
            Same {word(latest.gates)} checks, same 95%, and this time {latest.through}: each loan meets each check afresh, so no
            two runs end quite alike. Expect about {expected}.
          </p>
        {:else}
          <p class="lead">Twice the checks, and almost half the loans can be expected to get stuck: {arithmetic}. Every new condition multiplies in another 95%.</p>
        {/if}
        <div class="runs">
          <p class="tkc-small tally">
            {#if groups.length > 1}<span class="group g-name">Your runs</span>{/if}
            {#each groups as g (g.kind)}
              {@const shown = g.counts.slice(-SHOWN)}
              <span class="group">
                <span class="g-name">{groups.length > 1 ? `${g.gates === 6 ? 'Six' : 'Twelve'} checks${g.backups ? ' with backups' : ''}` : 'Your runs'}:</span>
                {g.counts.length > SHOWN ? '… · ' : ''}{#each shown as v, k (k)}{k ? ' · ' : ''}<span class="tkc-num" class:now={g.kind === kindOf(latest) && k === shown.length - 1}>{v}</span>{/each}
              </span>
            {/each}
          </p>
          <div class="strip" bind:clientWidth={stripW}>
            <svg width={stripW} height={SH} role="img" aria-label={stripLabel}>
              <rect class="band" x={sx(spread.lo)} y="4" width={Math.max(2, sx(spread.hi) - sx(spread.lo))} height="30" rx="3" />
              <line class="axis" x1={sx(from)} x2={sx(from + WINDOW)} y1="34" y2="34" />
              <line class="expect" x1={sx(expected)} x2={sx(expected)} y1="4" y2="38" />
              {#each stripDots as d, k (k)}
                <circle cx={d.x} cy={d.y} r={d.last ? 4.5 : 3.5} class="run" class:last={d.last} />
              {/each}
              {#if expectLabel.x0 > 28}<text class="tkc-axis-label" x={sx(from)} y={SH - 4}>{from}</text>{/if}
              {#if expectLabel.x1 < stripW - 34}<text class="tkc-axis-label" x={sx(from + WINDOW)} y={SH - 4} text-anchor="end">{from + WINDOW}</text>{/if}
              <text class="tkc-axis-label" x={expectLabel.x} y={SH - 4} text-anchor="middle">{expectLabel.text}</text>
            </svg>
          </div>
          <p class="tkc-small range">In 1,000 runs of 100 loans, between {spread.lo} and {spread.hi} get through nine times in ten.</p>
        </div>
        <div class="tkc-row">
          <button type="button" class="tkc-btn tkc-btn--small" onclick={() => send({ gates: latest.gates, backups: latest.backups })}>Run it again</button>
          {#if !(latest.gates === 12 && !latest.backups)}
            <button type="button" class="tkc-btn tkc-btn--small" onclick={() => send({ gates: 12, backups: false })}>Twelve checks, no backups</button>
          {/if}
          {#if !latest.backups}
            <button type="button" class="tkc-btn tkc-btn--small" onclick={() => send({ gates: latest.gates, backups: true })}>Same {word(latest.gates)}, each with a backup</button>
          {/if}
          <button type="button" class="tkc-btn tkc-btn--small" onclick={again}>Start over</button>
        </div>
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
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    align-content: start;
    min-width: 0;
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
  .dot.through,
  .dot.saved {
    fill: var(--tkc-options);
  }
  .saved-n {
    fill: var(--tkc-options-ink);
  }
  .backup-key {
    margin-top: 4px;
  }
  .sw-twin {
    background: var(--tkc-surface);
    box-shadow: inset 0 0 0 1.5px var(--tkc-options);
  }
  .sw-saved {
    border-radius: 50%;
    background: var(--tkc-options);
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
  /* The tally of runs: the counts in words, the latest chain's runs as dots on a line from 0 to 100, and the
     band where nine runs in ten end. */
  .runs {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
    max-width: 30rem;
  }
  .strip {
    min-width: 0;
    overflow: hidden;
  }
  .group {
    display: block;
  }
  .g-name {
    color: var(--tkc-muted);
  }
  .tally .tkc-num {
    font-weight: 600;
  }
  .tally .now {
    font-weight: 700;
    color: var(--tkc-options-ink);
  }
  .strip svg {
    display: block;
  }
  .band {
    fill: var(--tkc-sunken);
  }
  .axis {
    stroke: var(--tkc-rule);
    stroke-width: 1;
  }
  .expect {
    stroke: var(--tkc-ink-2);
    stroke-width: 1.25;
    stroke-dasharray: 3 2;
  }
  .run {
    fill: var(--tkc-options);
    fill-opacity: 0.45;
  }
  .run.last {
    fill-opacity: 1;
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
  }
  .range {
    color: var(--tkc-muted);
    text-wrap: pretty;
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
