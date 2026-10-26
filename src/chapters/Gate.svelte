<script>
  import { onMount } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { STOPS, LIMIT, YEARS, PARAMS, chapterReady, chapterStep } from '../lib/sim/gate.js';
  import { linear, log10 } from '../lib/scales.js';

  const stopAt = (amount) => STOPS.findIndex((s) => s.at === amount);
  const ANSWER = stopAt(1);
  let stop = $state(0); // every payment checked, as the bank does today
  let width = $state(560);

  // A thousand simulated years at every stop, worked out in short steps the first time the chapter
  // opens, so the page never stalls; a later visit or a reset finds them ready.
  let sims = $state.raw(chapterReady());
  onMount(() => {
    if (sims) return;
    let timer = 0;
    const step = () => {
      const done = chapterStep();
      if (done) sims = done;
      else timer = setTimeout(step, 0);
    };
    timer = setTimeout(step, 0);
    return () => clearTimeout(timer);
  });
  const run = $derived(sims ? sims.stops[stop] : null);

  // ---- Words and numbers, all from the model ----
  const money = (v) => (v === 0 ? '$0' : v < 0.095 ? `$${Math.round(v * 100) * 10},000` : Number.isInteger(v) ? `$${v}m` : `$${v.toFixed(1)}m`);
  const share = (v) => (v === 0 ? '0%' : v < 0.001 ? 'under 0.1%' : v < 0.1 ? `${(v * 100).toFixed(1)}%` : `${Math.round(v * 100)}%`);
  const whole = (v) => (v > 0 && v < 0.005 ? 'under 1%' : `${Math.round(v * 100)}%`);
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const fraction = (v) => {
    const k = Math.round(v * 10);
    return k === 5 ? 'half' : k === 10 ? 'all' : `${WORDS[k]}-tenth${k === 1 ? '' : 's'}`;
  };
  const T = $derived.by(() => {
    if (!sims) return null;
    const s = sims.stops;
    const answer = s[ANSWER];
    const all = s[0];
    const ten = s[stopAt(10)];
    return {
      half: fraction(answer.checkedShare),
      money: fraction(answer.moneyShare),
      worstA: money(answer.worst),
      busyA: share(answer.busy),
      busyAll: share(all.busy),
      lateAll: share(all.late),
      mean10: money(ten.mean),
      worst10: money(ten.worst),
      over10: ten.over,
      named: share(sims.named.late),
    };
  });

  const rules = [
    'About 600 payments a year to a new account, $50,000–$80m; one in 200 is fraud.',
    'A check catches every fraud; any of three qualified reviewers does one a day.',
    'Each reviewer is in nine days in ten; payment is promised within three working days.',
  ];

  // The coin game's trap: the average year sits inside the limit while the worst does not.
  const trap = $derived(!!run && run.mean <= LIMIT && run.worst > LIMIT);
  const puzzle = $derived({
    goal: 'Set the check so that no year in 1,000 loses more than $5m, and fewer than 1 payment in 100 is late.',
    met: !!run && run.worst <= LIMIT && run.late < 0.01,
    checks: [
      { label: `No year loses more than $5m${run ? ` (worst now ${money(run.worst)})` : ''}`, ok: !!run && run.worst <= LIMIT },
      { label: `Fewer than 1 payment in 100 late${run ? ` (now ${share(run.late)})` : ''}`, ok: !!run && run.late < 0.01 },
    ],
    progress: trap ? `The average year loses ${money(run.mean)}, under the limit; the worst year loses ${money(run.worst)}.` : '',
    hints: [
      'A check costs a reviewer the same day whatever the amount. Which payments carry most of the money?',
      'Watch the worst of the 1,000 years, not the average one: a single bad year breaks the limit.',
    ],
    found: T ? `Every payment above $1m checked: that ${T.half} of the payments carries ${T.money} of the money.` : 'Every payment above $1m checked.',
  });
  const showAnswer = () => (stop = ANSWER);

  // ---- The chart: one dot per simulated year, losses on a log scale, years without loss on a row of their own ----
  const H = 300;
  const m = { top: 22, right: 10, left: 46 };
  const BOTTOM = H - 64; // foot of the log scale
  const ZERO = H - 42; // the row of years that lose nothing
  const LO = 0.035;
  const HI = 120;
  const span = $derived(Math.max(width, 200));
  const x = $derived(linear(1, YEARS, m.left + 4, span - m.right - 4));
  const y = log10(LO, HI, BOTTOM, m.top);
  const yOf = (v) => (v === 0 ? ZERO : y(v));
  const narrow = $derived(span < 420);
  const R = $derived(narrow ? 1.6 : 2.1);
  const yTicks = [0.1, 1, 10, 100];
  const xTicks = $derived(narrow ? [1, 500, 1000] : [1, 250, 500, 750, 1000]);

  const dots = $derived(run ? run.losses.map((l, t) => ({ cx: x(t + 1), cy: yOf(l), over: l > LIMIT })) : []);

  // Direct labels, each placed where it collides with nothing placed before it.
  const CHAR = 6.6; // a little wider than a 12px bold character
  const box = (text, tx, ty, anchor) => {
    const w = text.length * CHAR;
    const x0 = anchor === 'end' ? tx - w : tx;
    return { text, x: tx, y: ty, anchor, x0, x1: x0 + w, y0: ty - 11, y1: ty + 3 };
  };
  const clash = (a, b) => a.x0 < b.x1 + 4 && b.x0 < a.x1 + 4 && a.y0 < b.y1 + 2 && b.y0 < a.y1 + 2;
  const labels = $derived.by(() => {
    if (!run) return [];
    const left = m.left + 4;
    const right = span - m.right - 2;
    const placed = [];
    const fits = (b) => b.x0 >= m.left && b.x1 <= span - m.right + 2 && b.y0 >= 0 && placed.every((p) => !clash(p, b));
    const place = (cls, options) => placed.push({ ...(options.find(fits) ?? options[0]), cls });
    // Checking every payment loses nothing; say on the empty chart what it costs instead.
    const late = share(run.late);
    const nothing =
      run.lossless === YEARS
        ? [`Every payment checked: nothing lost, but ${late} of payments are late`, `Nothing lost, but ${late} of payments are late`, `Nothing lost; ${late} paid late`]
        : [`${run.lossless.toLocaleString('en-US')} years lose nothing`];
    if (run.lossless) place('zero', nothing.map((t) => box(t, right, ZERO - 6, 'end')));
    if (run.worst > 0) {
      const cx = x(run.worstYear + 1);
      const cy = yOf(run.worst);
      const s = `Worst year ${money(run.worst)}`;
      place('worst', [box(s, cx + 9, cy + 4, 'start'), box(s, cx - 9, cy + 4, 'end'), box(s, cx + 9, cy - 8, 'start'), box(s, cx - 9, cy - 8, 'end'), box(s, cx + 9, cy + 16, 'start'), box(s, cx - 9, cy + 16, 'end')]);
    }
    // The limit and the average label away from each other: one above its line, the other below.
    const below = run.mean > LIMIT;
    const near = (v, under) => (under ? y(v) + 15 : y(v) - 5);
    const sides = (s, v, under) => [box(s, right, near(v, under), 'end'), box(s, left, near(v, under), 'start'), box(s, right, near(v, !under), 'end'), box(s, left, near(v, !under), 'start')];
    place('limit', sides(`Board limit ${money(LIMIT)}`, LIMIT, below));
    if (run.mean > 0) place('avg', sides(`Average year ${money(run.mean)}`, run.mean, !below));
    return placed;
  });

  const describe = $derived(
    run
      ? `${YEARS.toLocaleString('en-US')} simulated years, checking ${stop === 0 ? 'every payment' : stop === STOPS.length - 1 ? 'no payment' : `payments above ${STOPS[stop].label}`}. ` +
          (run.worst === 0
            ? 'No year loses anything to fraud.'
            : `The worst year loses ${money(run.worst)}, the average year ${money(run.mean)}; ${run.over === 0 ? 'no year goes over' : `${run.over} years go over`} the board’s limit of ${money(LIMIT)}.`)
      : 'Simulating a thousand years of payments.',
  );
</script>

<Chapter
  n={11}
  kicker="Gates"
  title="The gate worth keeping"
  lede="A chain that bends still keeps a few links rigid: the checks before a payment that cannot be undone. The question is which payments."
  puzzle="gate"
>
  {#snippet setup()}
    <p>
      A development lender pays out money every working day. About 600 times a year, a payment comes with a request to
      send it to a new bank account. Almost all are genuine: a client has changed banks. About one in 200 comes from a
      fraudster with a copied letterhead, and money paid to a fraudster rarely comes back.
    </p>
    <p>
      A call to the client, on a number already on file, catches every fraud. It is one more link between request and
      payment: one of three qualified reviewers must make it, which takes a day, and the bank promises to pay within
      three working days.
    </p>
    <p>
      The board has set one limit: no year may lose more than $5m to fraud, however good the years around it. Today
      every payment is checked.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="A thousand years of payments" sub="Each dot is one simulated year and what fraud took from it; each gridline is ten times the one below." {rules}>
      <Puzzle id="gate" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <Slider id="g-check" label="Check payments above" bind:value={stop} min={0} max={STOPS.length - 1} format={(i) => STOPS[i].label} ends={['Check all: slow', 'Check none: exposed']} />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={span} height={H} role="img" aria-label={describe}>
          {#each yTicks as t (t)}
            <line class="tkc-grid" x1={m.left} x2={span - m.right} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={m.left - 6} y={y(t) + 4} text-anchor="end">${t}m</text>
          {/each}
          <line class="tkc-base" x1={m.left} x2={span - m.right} y1={BOTTOM} y2={BOTTOM} />
          <line class="tkc-grid" x1={m.left} x2={span - m.right} y1={ZERO} y2={ZERO} />
          <text class="tkc-axis-label" x={m.left - 6} y={ZERO + 4} text-anchor="end">$0</text>
          {#each xTicks as t (t)}
            <text class="tkc-axis-label" x={x(t)} y={H - 22} text-anchor={t === 1 ? 'start' : t === YEARS ? 'end' : 'middle'}>{t.toLocaleString('en-US')}</text>
          {/each}
          <text class="tkc-axis-title" x={m.left + (span - m.left - m.right) / 2} y={H - 4} text-anchor="middle">Simulated year</text>

          {#if run}
            {#each dots as d, t (t)}
              {#if !d.over}<circle class="yr" cx={d.cx} cy={d.cy} r={R} />{/if}
            {/each}
            {#each dots as d, t (t)}
              {#if d.over}<circle class="yr over" cx={d.cx} cy={d.cy} r={R} />{/if}
            {/each}
            {#if run.mean > 0}
              <line class="avg" x1={m.left} x2={span - m.right} y1={y(run.mean)} y2={y(run.mean)} />
            {/if}
            <line class="limit" x1={m.left} x2={span - m.right} y1={y(LIMIT)} y2={y(LIMIT)} />
            {#if run.worst > 0}
              <circle class="ring" cx={x(run.worstYear + 1)} cy={yOf(run.worst)} r="5.5" />
            {/if}
            {#each labels as l (l.cls)}
              <text class="tkc-label tkc-halo lab-{l.cls}" x={l.x} y={l.y} text-anchor={l.anchor}>{l.text}</text>
            {/each}
          {:else}
            <line class="limit" x1={m.left} x2={span - m.right} y1={y(LIMIT)} y2={y(LIMIT)} />
            <text class="tkc-label-2" x={m.left + (span - m.left - m.right) / 2} y={y(0.4)} text-anchor="middle">Simulating a thousand years…</text>
          {/if}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch dot"></span>A year within the limit</span>
          <span><span class="tkc-swatch dot over"></span>A year over the limit</span>
        </div>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat
          label="Worst year in 1,000"
          value={run ? money(run.worst) : '…'}
          sub={run ? (run.worst === 0 ? 'no year loses anything' : `average ${money(run.mean)}, typical year ${money(run.median)}`) : 'simulating'}
          swatch={run && run.worst > LIMIT ? 'var(--tkc-conditions)' : ''}
        />
        <Stat
          label="Payments late"
          value={run ? share(run.late) : '…'}
          sub={run ? (run.checkedShare === 0 ? 'no payment checked' : `${whole(run.checkedShare)} checked; any of three reviewers, busy ${whole(run.busy)} of their days`) : 'simulating'}
        />
      </div>

      {#snippet model()}
        <p>
          Each simulated year has {PARAMS.days} working days. Requests arrive at random, {PARAMS.perDay} a working day on
          average. Amounts follow a lognormal distribution with a median of $1m and a spread (σ) of {PARAMS.sigma}, kept
          between $50,000 and $80m. Each request is a fraud with a chance of one in {PARAMS.fraudEvery}; a fraud paid
          unchecked is lost in full.
        </p>
        <p>
          Requests at or above the amount set wait in one line, first come first served, for any of the three reviewers
          who is in; absences come in spells of about {WORDS[PARAMS.spell]} days. A check done on one day pays the next,
          and a payment is late after {WORDS[PARAMS.promise]} working days. Every setting meets the same {YEARS.toLocaleString('en-US')}
          independent years.{#if T}
            With each request waiting for its own named reviewer, the same $1m gate leaves {T.named} of payments late.{/if}
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    {#if T}
      <p>
        A check costs a reviewer the same day whatever the amount, but what it saves grows with the amount. So the gate
        earns its wait where a loss would be large and could not be undone. Below $1m, payments go straight through, and
        the frauds among them cost the worst of the 1,000 years {T.worstA}. Above it, every fraud is stopped, and the
        reviewers are busy {T.busyA} of their days.
      </p>
      <p>
        The trap is the average. Checking only above $10m, the average year loses {T.mean10}, inside the limit, yet the
        worst year loses {T.worst10} and {T.over10} years in 1,000 break it. Like the player in the coin game, the bank
        does not live the average year. It lives one year after another, and a year that breaks the limit is not mended
        by the calm years around it.
      </p>
      <p>
        Checking everything fails the other way. Every payment waits for a reviewer, the three are {T.busyAll} busy, and at
        that load the line grows the way full calendars make it grow: {T.lateAll} of payments are late. A gate everywhere
        is a queue everywhere.
      </p>
      <p>
        The gate itself is an <span class="tkc-and">AND</span> behind an <strong>IF</strong>: above $1m, no payment goes out unchecked. Inside it sits an <span class="tkc-or">OR</span>, taken as given here: any one of three qualified
        reviewers may make the call, a quorum of one. If each
        payment waited for its own named reviewer instead, the same gate would make payments late again.
      </p>
      <p>
        A lizard caught by the tail can shed it and grow another, but it guards its head. A chain that bends works the
        same way: it lets small losses through, where they can be survived, and holds firm where a single loss would be
        one too many.
      </p>
    {:else}
      <p class="tkc-small">Simulating a thousand years…</p>
    {/if}
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our checks are sized to what we cannot afford to lose, and which make every amount wait alike?">
      <p>
        Bank capital rules for operational risk long asked for enough to survive the worst year in a thousand, not the
        average year. Payment controls often grow with the amount, with more checks, and more senior ones, for larger
        sums. Dual control, the four-eyes rule, is a quorum as well: any two qualified people, not two named ones.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .yr {
    fill: var(--tkc-ink-2);
    opacity: 0.4;
  }
  .yr.over {
    fill: var(--tkc-conditions);
    opacity: 0.85;
  }
  .limit {
    stroke: var(--tkc-conditions);
    stroke-width: 1.5;
  }
  .avg {
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
    stroke-dasharray: 6 4;
  }
  .ring {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
  }
  .lab-limit {
    fill: var(--tkc-conditions-ink);
  }
  .lab-zero {
    fill: var(--tkc-ink-2);
    font-weight: 400;
  }
  .dot {
    border-radius: 50%;
    background: var(--tkc-ink-2);
    opacity: 0.55;
  }
  .dot.over {
    background: var(--tkc-conditions);
    opacity: 1;
  }
</style>
