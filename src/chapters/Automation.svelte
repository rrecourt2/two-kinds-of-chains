<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { run, LIMIT, DAYS, PARAMS, automatedEnough, failureDayOk } from '../lib/sim/automation.js';
  import { linear, line } from '../lib/scales.js';
  import { int } from '../lib/format.js';

  let auto = $state(99); // percent of the figures the system reads, as the bank has it
  let practice = $state('none');
  let width = $state(560);
  const r = $derived(run(auto / 100, practice));

  // ---- Words and numbers, all from the model ----
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const TENS = { 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty' };
  const word = (n) => WORDS[n] ?? TENS[n] ?? String(n);
  const pct = (v) => `${Math.round(v * 100)}%`;
  // Misread figures on a day it fails, as whole numbers; a value just under the limit never reads as the limit.
  const mistakes = (v) => (v < LIMIT && Math.round(v) >= LIMIT ? v.toFixed(1) : String(Math.round(v)));
  const BASE = run(0.99, 'none');
  const PRACTISED = run(0.99, 'month');
  const BY_HAND = run(0, 'none');
  const T = {
    yearBase: int(BASE.normalYear),
    yearHand: int(BY_HAND.normalYear),
    first: mistakes(BASE.failed[0].mistakes),
    worst: mistakes(BASE.worstAny),
    count: word(BASE.failed.length),
    failTotal: int(BASE.failTotal),
    failShare: pct(BASE.failShare),
    failDays: pct(BASE.failed.length / DAYS),
    worstPractised: mistakes(PRACTISED.worstAny),
  };

  const rules = [
    'The system misreads 1 figure in 1,000; practised analysts, 1 in 100.',
    `When it fails, analysts spread all of that day’s ${PARAMS.perDay} figures by hand.`,
    'Unused, skill fades within months; out of practice, analysts misread 1 in 10.',
  ];

  const enough = $derived(automatedEnough(auto / 100));
  const safe = $derived(failureDayOk(r));
  const NONE = $derived(run(auto / 100, 'none'));
  const puzzle = $derived({
    goal: `Let the system read at least 90% of the figures, and keep misread figures under ${LIMIT} whichever day it fails.`,
    met: enough && safe,
    checks: [
      { label: `The system reads at least 90% (now ${auto}%)`, ok: enough },
      { label: `Under ${LIMIT} misread whichever day it fails (now ${auto === 0 ? 'no system to fail' : `up to ${mistakes(r.worstAny)}`})`, ok: safe },
    ],
    progress:
      safe && !enough
        ? auto === 0
          ? 'With every figure read by hand, the analysts stay in practice; but there is no system to read nine in ten.'
          : `With ${100 - auto}% read by hand every day, the analysts stay in practice; but the system no longer reads nine figures in ten.`
        : !safe && practice !== 'none'
          ? `Up to ${mistakes(r.worstAny)} misread, against ${mistakes(NONE.worstAny)} with no practice days: skill still fades in between.`
          : '',
    hints: [
      'Watch the line after each day the analysts spread everything by hand: it starts low, then climbs as their skill fades.',
      'The analysts need not wait for the system to fail to spend a day reading by hand.',
    ],
    found: `A day by hand each month: even with the system reading 99%, no day it fails costs more than ${T.worstPractised} misread figures, against ${T.worst}.`,
  });
  const showAnswer = () => ((auto = 99), (practice = 'month'));

  // What the slider leaves to the analysts, in words.
  const handShare = $derived(
    auto === 0
      ? 'Analysts read every figure themselves, so there is no system to fail.'
      : 1 - auto / 100 >= PARAMS.fullShare - 1e-9
        ? `Analysts read the other ${100 - auto}% themselves: enough to stay in full practice.`
        : `Analysts read the other ${100 - auto}% themselves; ${Math.round(PARAMS.fullShare * 100)}% or more would keep them in full practice.`,
  );

  // ---- The chart: for every working day, the figures analysts would misread if the system failed that morning ----
  const H = 264;
  const m = { top: 28, right: 12, bottom: 44, left: 30 };
  const TOP = 20;
  const span = $derived(Math.max(width, 200));
  const narrow = $derived(span < 420);
  const x = $derived(linear(0, DAYS, m.left, span - m.right));
  const y = linear(0, TOP, H - m.bottom, m.top);
  const BASELINE = H - m.bottom;
  const monthTicks = $derived(narrow ? [0, 12, 24, 36] : [0, 6, 12, 18, 24, 30, 36]);
  const path = $derived(line(Array.from(r.curve, (v, d) => [x(d), y(v)])));
  const worst = $derived(r.failed.length ? r.failed.reduce((a, f) => (f.mistakes > a.mistakes ? f : a)) : null);
  const over = $derived(r.failed.filter((f) => f.mistakes >= LIMIT).length);
  // Each practice day brings the line back down: that fall is drawn in blue.
  const practiceFalls = $derived(r.practiceDays.filter((d) => d + 1 < DAYS).map((d) => ({ d, y0: y(r.curve[d]), y1: y(r.curve[d + 1]) })));

  // Direct labels, each placed where it touches no dot, no line and no label placed before it.
  const CHAR = 6.6; // a little wider than a 12px bold character
  const CHAR_2 = 6.1; // and a 12px regular one
  const LINE = 14;
  const box = (lines, tx, ty, anchor, ch = CHAR) => {
    const ls = Array.isArray(lines) ? lines : [lines];
    const w = Math.max(...ls.map((s) => s.length)) * ch;
    const x0 = anchor === 'end' ? tx - w : anchor === 'middle' ? tx - w / 2 : tx;
    return { lines: ls, x: tx, y: ty, anchor, x0, x1: x0 + w, y0: ty - 11, y1: ty + 3 + LINE * (ls.length - 1) };
  };
  const clash = (a, b) => a.x0 < b.x1 + 3 && b.x0 < a.x1 + 3 && a.y0 < b.y1 + 1 && b.y0 < a.y1 + 1;
  const labels = $derived.by(() => {
    const c = r.curve;
    const dayAt = (px) => ((px - m.left) / (span - m.left - m.right)) * DAYS;
    // Does the line pass through the box (with a little room)?
    const onCurve = (b) => {
      const d0 = Math.max(0, Math.floor(dayAt(b.x0 - 3)));
      const d1 = Math.min(DAYS - 1, Math.ceil(dayAt(b.x1 + 3)));
      for (let d = d0; d < d1; d++) {
        const a = y(c[d]);
        const z = y(c[d + 1]);
        if (Math.max(a, z) >= b.y0 - 3 && Math.min(a, z) <= b.y1 + 3) return true;
      }
      return false;
    };
    const placed = r.failed.map((f) => ({ x0: x(f.day) - 5, x1: x(f.day) + 5, y0: y(f.mistakes) - 5, y1: y(f.mistakes) + 5 }));
    const inside = (b) => b.x0 >= m.left && b.x1 <= span - m.right + 2 && b.y0 >= 0 && b.y1 <= BASELINE - 2;
    const free = (b) => inside(b) && placed.every((p) => !clash(p, b));
    const out = {};
    // 'must': clear of the line or not drawn; 'prefer': clear of the line if it can be, over it (with a halo) if not.
    const place = (key, options, { curve = 'must', required = false } = {}) => {
      const b = options.find((o) => free(o) && !onCurve(o)) ?? (curve === 'prefer' ? options.find(free) : null) ?? (required ? options[0] : null);
      if (!b) return;
      placed.push(b);
      out[key] = b;
    };
    const left = m.left + 6;
    const right = span - m.right - 4;
    // Along a horizontal line at height ly: from the left, from the right, then at points in between.
    const along = (s, ly) => {
      const w = s.length * CHAR;
      const starts = [left, right - w, ...[0.25, 0.5, 0.75].map((f) => left + f * (right - left - w))];
      return [...starts.map((x0) => box(s, x0, ly - 6, 'start')), ...starts.map((x0) => box(s, x0, ly + 15, 'start'))];
    };
    place('limit', along(narrow ? `Limit: ${LIMIT}` : `Limit: ${LIMIT} misread`, y(LIMIT)), { curve: 'prefer', required: true });
    // Keep the other labels off the limit line itself.
    placed.push({ x0: m.left, x1: span - m.right, y0: y(LIMIT) - 1, y1: y(LIMIT) + 1 });
    if (worst) {
      const cx = x(worst.day);
      const cy = y(worst.mistakes);
      const s = `${mistakes(worst.mistakes)} misread`;
      place('worst', [box(s, cx + 9, cy + 4, 'start'), box(s, cx - 9, cy + 4, 'end'), box(s, cx + 6, cy - 9, 'start'), box(s, cx - 6, cy - 9, 'end'), box(s, cx + 6, cy + 17, 'start'), box(s, cx - 6, cy + 17, 'end'), box(s, cx, cy - 10, 'middle'), box(s, cx, cy + 19, 'middle')], { curve: 'prefer' });
      // Next to the dot if at all possible; failing that, just above the limit line over it.
      if (!out.worst) place('worst', [box(s, cx, y(LIMIT) - 5, 'middle'), box(s, cx + 4, y(LIMIT) - 5, 'end')], { curve: 'prefer' });
    }
    // The mechanism. A whole day by hand brings the line down: label the foot of the tallest fall that has room.
    const resets = [...r.failed.map((f) => f.day), ...r.practiceDays].filter((d) => d + 1 < DAYS && c[d] - c[d + 1] >= 5).sort((a, b) => c[b] - c[b + 1] - (c[a] - c[a + 1]));
    const backTexts = [['a day by hand:', 'back in practice'], 'back in practice', ['back in', 'practice']];
    place(
      'back',
      backTexts.flatMap((t) => resets.flatMap((d) => [2.6, 3.6, 5].map((v) => box(t, x(d) - 4, y(v) - LINE * ((Array.isArray(t) ? t.length : 1) - 1), 'end', CHAR_2)))),
    );
    // Between those days, skill fades: label the line where it climbs, on the longest stretch with room.
    const starts = [0, ...new Set([...r.failed.map((f) => f.day), ...r.practiceDays])].sort((a, b) => a - b);
    const stretches = starts.map((d, i) => [d, (starts[i + 1] ?? DAYS) - d]).filter(([, len]) => len >= 30).sort((a, b) => b[1] - a[1]);
    const fades = [];
    for (const t of ['skill fades', ['skill', 'fades']]) {
      for (const [d0, len] of stretches) {
        for (const k of [8, 12, 18, 25, 35, 50]) {
          if (k >= len) continue;
          const px = x(d0 + k);
          const py = y(c[d0 + k]);
          fades.push(box(t, px + 5, py + 15, 'start', CHAR_2), box(t, px - 5, py - 6 - (Array.isArray(t) ? LINE : 0), 'end', CHAR_2));
        }
      }
    }
    place('fades', fades);
    place('normal', along('A normal day', y(r.perNormalDay)).sort((a, b) => b.x1 - a.x1), { curve: 'prefer' });
    return out;
  });
  const PRACTICE_WORDS = { none: 'no practice days', quarter: 'a day by hand each quarter', month: 'a day by hand each month' };
  const describe = $derived(
    `Three years after go-live, with the system reading ${auto}% of the figures and ${PRACTICE_WORDS[practice]}. ` +
      (auto === 0
        ? `Analysts read every figure, so a failure changes nothing: about ${Math.round(r.perNormalDay)} misread a day.`
        : `Had the system failed, analysts would have misread up to ${mistakes(r.worstAny)} figures that day; their skill fades between days by hand. It failed on ${r.failed.length} days, ${over === 0 ? 'none' : over} of them over the limit of ${LIMIT}. A normal day has ${r.perNormalDay.toFixed(1)} misread.`),
  );
</script>

<Chapter
  n={18}
  kicker="Automation"
  title="The irony of the reliable machine"
  lede="A system that rarely fails leaves its people little to do, until the day it fails and they must do everything."
  puzzle="automation"
>
  {#snippet setup()}
    <p>
      A covenant is only as good as the figures it is tested on. Every quarter a development lender’s borrowers send
      their accounts: banks, microlenders, factories, power plants, in a dozen accounting traditions. Analysts used to
      spread them by hand, about {word(PARAMS.sets)} sets a working day, {word(PARAMS.figures)} key figures from each into
      the lender’s template. Then the bank bought a system that reads them with a tenth of the
      analysts’ mistakes. Year by year it took more of the reading.
    </p>
    <p>
      A few days a year it fails: an outage, or an update that breaks it. On those days analysts spread every
      set by hand again.
    </p>
    <p>On a normal day, the more the system reads, the fewer the misread figures. The question is what the days it fails cost.</p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="Three years with the system"
      sub="Each working day: how many of the day’s {PARAMS.perDay} figures from borrowers’ accounts analysts would misread if it failed."
      {rules}
    >
      <Puzzle id="automation" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <div class="ctl">
          <Slider id="au-share" label="System reads" bind:value={auto} min={0} max={99} format={(v) => (v === 0 ? 'none' : `${v}% of figures`)} />
          <p class="tkc-caption">{handShare}</p>
        </div>
        <div class="ctl">
          <Segmented
            name="au-practice"
            label="Practice by hand"
            bind:value={practice}
            options={[
              { value: 'none', label: 'None' },
              { value: 'quarter', label: 'A day a quarter' },
              { value: 'month', label: 'A day a month' },
            ]}
          />
          <p class="tkc-caption">On a practice day, analysts spread everything by hand while the system checks behind them.</p>
        </div>
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={span} height={H} role="img" aria-label={describe} class:narrow>
          <text class="tkc-axis-title" x="0" y="12">Misread figures if it failed that day</text>
          {#each [0, 5, 10, 15, 20] as t (t)}
            {#if t > 0}<line class="tkc-grid" x1={m.left} x2={span - m.right} y1={y(t)} y2={y(t)} />{/if}
            <text class="tkc-axis-label" x={m.left - 6} y={y(t) + 4} text-anchor="end">{t}</text>
          {/each}
          <line class="tkc-base" x1={m.left} x2={span - m.right} y1={BASELINE} y2={BASELINE} />
          {#each monthTicks as t (t)}
            <text class="tkc-axis-label" x={x(t * PARAMS.monthDays)} y={BASELINE + 22} text-anchor={t === 0 ? 'start' : t === 36 ? 'end' : 'middle'}>{t}</text>
          {/each}
          <text class="tkc-axis-title" x={m.left + (span - m.left - m.right) / 2} y={H - 4} text-anchor="middle">Months since the system went live</text>

          <line class="limit" x1={m.left} x2={span - m.right} y1={y(LIMIT)} y2={y(LIMIT)} />
          <line class="normal" x1={m.left} x2={span - m.right} y1={y(r.perNormalDay)} y2={y(r.perNormalDay)} />

          <path class="curve" d={path} />
          {#each practiceFalls as f (f.d)}
            <line class="fall" x1={x(f.d)} x2={x(f.d + 1)} y1={f.y0} y2={f.y1} />
          {/each}

          {#each r.failed as f (f.day)}
            <circle class="fail" class:over={f.mistakes >= LIMIT} cx={x(f.day)} cy={y(f.mistakes)} r="4.5" />
          {/each}
          {#each ['back', 'fades', 'normal'] as k (k)}
            {#if labels[k]}
              <text class="tkc-label-2 tkc-halo" x={labels[k].x} y={labels[k].y} text-anchor={labels[k].anchor}>
                {#each labels[k].lines as s, i (i)}<tspan x={labels[k].x} dy={i ? 14 : 0}>{s}</tspan>{/each}
              </text>
            {/if}
          {/each}
          <text class="tkc-label tkc-halo lab-limit" x={labels.limit.x} y={labels.limit.y} text-anchor={labels.limit.anchor}>{labels.limit.lines[0]}</text>
          {#if labels.worst}
            <text class="tkc-label tkc-halo" class:lab-over={worst.mistakes >= LIMIT} x={labels.worst.x} y={labels.worst.y} text-anchor={labels.worst.anchor}>{labels.worst.lines[0]}</text>
          {/if}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-fail" aria-hidden="true"></span>A day it failed</span>
          <span><span class="tkc-swatch sw-fail over" aria-hidden="true"></span>Over the limit</span>
          {#if practice !== 'none'}<span><span class="tkc-swatch sw-practice" aria-hidden="true"></span>Practice day</span>{/if}
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat
          label="Misread on normal days"
          value="{int(r.normalYear)} a year"
          sub={auto === 0 ? 'analysts read every figure' : `${int(BY_HAND.normalYear)} a year with no system`}
        />
        <Stat
          label={auto === 0 ? 'Misread on days it failed' : `Misread on the ${word(r.failed.length)} days it failed`}
          value={auto === 0 ? 'None' : pct(r.failShare)}
          sub={auto === 0 ? 'no system to fail' : `${int(r.failTotal)} of three years’ ${int(r.failTotal + r.normalTotal)} misread figures, on ${pct(r.failed.length / DAYS)} of the days`}
          swatch={over ? 'var(--tkc-conditions)' : ''}
        />
      </div>

      {#snippet model()}
        <p>
          Each working day brings {PARAMS.sets} sets of accounts, {PARAMS.figures} figures each; in reporting season
          there are more. A month has {PARAMS.monthDays} working days, and the run covers the
          {PARAMS.months} months after go-live, when analysts were in full practice. Skill runs from 0 to 1; on a day
          analysts spread everything they misread 1% + 9% × (1 − skill) of the figures. A whole day by hand, a failure
          or a practice day, brings skill back to 1. After it, skill fades with a time constant of two months towards a
          floor kept up by the share analysts read every day, at the practised rate: full practice at 30% or more,
          proportionally less below. Failures come at random, about three a year; this run has
          {word(BASE.failed.length)}, and the answer holds in 200 other runs. Out of practice, analysts are also slower;
          the model leaves that out.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      The system did what it was bought for: at 99%, normal days bring {T.yearBase} misread figures a year instead of
      {T.yearHand}. With no practice days, the first failure, a month in, cost {T.first}, while skills were fresh; later ones cost up to {T.worst}. The {T.count} failures brought {T.failTotal}: {T.failShare} of three years’ misread
      figures, on {T.failDays} of the days. Each can leave a covenant tested on a wrong number.
    </p>
    <p>
      Lisanne Bainbridge called these the ironies of automation, in 1983. The machine takes the work that is easy to
      automate and leaves people the rest; skills that are not used fade; and nobody watches well for what almost never
      happens. Hence her line: “the more advanced a control system is, so the more crucial may be the
      contribution of the human operator.”
    </p>
    <p>
      Reliability starts a <span class="tkc-idea">loop</span> that feeds itself: the better the system reads, the more reading it is given, the less the analysts practise, and the better the system looks beside them. Every failure is also a
      day of practice, so the rarer the failures, the more each one costs. In the chain, reading is an
      <span class="tkc-or">OR</span>: the system, or the analysts when it fails. Like the riddle’s stand-in who has never
      stood in, the second half of that OR can exist on paper only.
    </p>
    <p>
      The practice day does on purpose what a failure does by accident. It catches nothing on the day, and so is
      the first thing cut in a good year. In 2009 an airliner over the Atlantic lost its speed readings when ice blocked
      its sensors; the autopilot handed control to pilots who had rarely flown by hand at that height, and 228 people
      died. Investigators recommended compulsory practice in flying by hand. A chain that learns also has to remember.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="When did the analysts behind our most reliable system last spread a borrower’s accounts by hand?">
      <p>
        Continuity plans say who reads borrowers’ accounts when the system cannot. Supervisors now ask that critical
        operations keep running through severe but plausible disruptions, and that the plans be tested. A plan discussed
        around a table shows who would read the accounts; only a day spent reading them shows whether they still can.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  @container fig (max-width: 300px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .ctl {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .curve {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  .fall {
    stroke: var(--tkc-options);
    stroke-width: 2.25;
    stroke-linecap: round;
  }
  .narrow .fall {
    stroke-width: 1.5;
  }
  .normal {
    stroke: var(--tkc-muted);
    stroke-width: 1.5;
    stroke-dasharray: 5 4;
  }
  .limit {
    stroke: var(--tkc-conditions);
    stroke-width: 1.5;
  }
  .lab-limit,
  .lab-over {
    fill: var(--tkc-conditions-ink);
  }
  .fail {
    fill: var(--tkc-ink-2);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
  }
  .fail.over {
    fill: var(--tkc-conditions);
  }
  .sw-fail {
    border-radius: 50%;
    background: var(--tkc-ink-2);
  }
  .sw-fail.over {
    background: var(--tkc-conditions);
  }
  .sw-practice {
    width: 3px;
    height: 10px;
    border-radius: 2px;
    background: var(--tkc-options);
  }
</style>
