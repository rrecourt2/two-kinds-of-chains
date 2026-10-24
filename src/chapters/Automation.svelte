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

  let auto = $state(99); // percent of payments the system screens, as the bank has it
  let practice = $state('none');
  let width = $state(560);
  const r = $derived(run(auto / 100, practice));

  // ---- Words and numbers, all from the model ----
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const word = (n) => WORDS[n] ?? String(n);
  // Mistakes on a day it fails, as whole numbers; a value just under the limit never reads as the limit.
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
    normalDays: int(DAYS - BASE.failed.length),
    worstPractised: mistakes(PRACTISED.worstAny),
  };

  const rules = [
    'The system gets 1 payment in 1,000 wrong; practised people, 1 in 100.',
    'When it fails, people screen all of that day’s 200 payments by hand.',
    'Unused, skill fades in weeks; out of practice, people get 1 in 10 wrong.',
  ];

  const enough = $derived(automatedEnough(auto / 100));
  const safe = $derived(failureDayOk(r));
  const puzzle = $derived({
    goal: 'Let the system screen at least 90% of payments, and keep mistakes under 10 whichever day it fails.',
    met: enough && safe,
    checks: [
      { label: `The system screens at least 90% (now ${auto}%)`, ok: enough },
      { label: `Under 10 mistakes whichever day it fails (now ${auto === 0 ? 'no system to fail' : `up to ${mistakes(r.worstAny)}`})`, ok: safe },
    ],
    progress: safe && !enough ? `With ${100 - auto}% screened by hand every day, people stay in practice; but the system no longer screens nine payments in ten.` : '',
    hints: [
      'Watch the line after each day people screen everything by hand: it starts low, then climbs as their skill fades.',
      'People need not wait for the system to fail to spend a day screening by hand.',
    ],
    found: `A day by hand each month: even at 99% automated, no day it fails costs more than ${T.worstPractised} mistakes, against ${T.worst}.`,
  });
  const showAnswer = () => ((auto = 99), (practice = 'month'));

  // ---- The chart: for every working day, the mistakes people would make if the system failed that morning ----
  const H = 260;
  const m = { top: 14, right: 12, bottom: 44, left: 30 };
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
  // Direct labels, each placed where it collides with no dot and no label placed before it.
  const CHAR = 6.6; // a little wider than a 12px bold character
  const box = (text, tx, ty, anchor) => {
    const w = text.length * CHAR;
    const x0 = anchor === 'end' ? tx - w : tx;
    return { text, x: tx, y: ty, anchor, x0, x1: x0 + w, y0: ty - 11, y1: ty + 3 };
  };
  const clash = (a, b) => a.x0 < b.x1 + 3 && b.x0 < a.x1 + 3 && a.y0 < b.y1 + 1 && b.y0 < a.y1 + 1;
  const labels = $derived.by(() => {
    const placed = r.failed.map((f) => ({ x0: x(f.day) - 5, x1: x(f.day) + 5, y0: y(f.mistakes) - 5, y1: y(f.mistakes) + 5 }));
    const fits = (b) => b.x0 >= m.left && b.x1 <= span - m.right + 2 && b.y0 >= 0 && b.y1 <= BASELINE && placed.every((p) => !clash(p, b));
    const out = {};
    // The limit is always labelled; the other two labels are left out rather than drawn over something.
    const place = (key, options, required = false) => {
      const b = options.find(fits) ?? (required ? options[0] : null);
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
    place('limit', along(narrow ? `Limit: ${LIMIT}` : `Limit: ${LIMIT} mistakes`, y(LIMIT)), true);
    // Keep the other labels off the limit line itself.
    placed.push({ x0: m.left, x1: span - m.right, y0: y(LIMIT) - 1, y1: y(LIMIT) + 1 });
    if (worst) {
      const cx = x(worst.day);
      const cy = y(worst.mistakes);
      const s = `${mistakes(worst.mistakes)} mistakes`;
      place('worst', [box(s, cx + 9, cy + 4, 'start'), box(s, cx - 9, cy + 4, 'end'), box(s, cx + 6, cy - 9, 'start'), box(s, cx - 6, cy - 9, 'end'), box(s, cx + 6, cy + 17, 'start'), box(s, cx - 6, cy + 17, 'end')]);
    }
    place('normal', along('A normal day', y(r.perNormalDay)).sort((a, b) => b.x1 - a.x1));
    return out;
  });
  const PRACTICE_WORDS = { none: 'no practice days', quarter: 'a day by hand each quarter', month: 'a day by hand each month' };
  const describe = $derived(
    `Three years after go-live, with ${auto}% of payments screened by the system and ${PRACTICE_WORDS[practice]}. ` +
      (auto === 0
        ? 'People screen every payment, so a failure changes nothing: about 2 mistakes a day.'
        : `Had the system failed, people would have made up to ${mistakes(r.worstAny)} mistakes that day. It failed on ${r.failed.length} days, ${over === 0 ? 'none' : over} of them over the limit of ${LIMIT}. A normal day has ${r.perNormalDay.toFixed(1)} mistakes.`),
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
      Every payment a development lender sends passes one link before it leaves: a screening against sanctions lists
      and the client’s file. For years people did it by hand, about 200 payments a day. Then the bank bought a system
      that makes a tenth of their mistakes. Year by year it took more of the work, and people kept what it passed to
      them.
    </p>
    <p>
      A few days a year the system fails: an outage, or an update that quietly stops it working. On those days people
      screen every payment by hand again, as they used to.
    </p>
    <p>On a normal day, the more the system does, the fewer the mistakes. The question is what the days it fails cost.</p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="Three years with the system"
      sub="Each working day of the first three years: how many mistakes people would make if the system failed that day."
      {rules}
    >
      <Puzzle id="automation" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <Slider id="au-share" label="Automated" bind:value={auto} min={0} max={99} format={(v) => `${v}% of payments`} />
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
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={span} height={H} role="img" aria-label={describe}>
          {#each [0, 5, 10, 15, 20] as t (t)}
            {#if t > 0}<line class="tkc-grid" x1={m.left} x2={span - m.right} y1={y(t)} y2={y(t)} />{/if}
            <text class="tkc-axis-label" x={m.left - 6} y={y(t) + 4} text-anchor="end">{t}</text>
          {/each}
          <line class="tkc-base" x1={m.left} x2={span - m.right} y1={BASELINE} y2={BASELINE} />
          {#each monthTicks as t (t)}
            <text class="tkc-axis-label" x={x(t * PARAMS.monthDays)} y={BASELINE + 22} text-anchor={t === 0 ? 'start' : t === 36 ? 'end' : 'middle'}>{t}</text>
          {/each}
          <text class="tkc-axis-title" x={m.left + (span - m.left - m.right) / 2} y={H - 4} text-anchor="middle">Months since the system went live</text>

          <!-- Practice days: short blue ticks under the axis. -->
          {#each r.practiceDays as d (d)}
            <line class="practice" x1={x(d)} x2={x(d)} y1={BASELINE + 2} y2={BASELINE + 9} />
          {/each}

          <line class="limit" x1={m.left} x2={span - m.right} y1={y(LIMIT)} y2={y(LIMIT)} />
          <line class="normal" x1={m.left} x2={span - m.right} y1={y(r.perNormalDay)} y2={y(r.perNormalDay)} />

          <path class="curve" d={path} />

          {#each r.failed as f (f.day)}
            <circle class="fail" class:over={f.mistakes >= LIMIT} cx={x(f.day)} cy={y(f.mistakes)} r="4.5" />
          {/each}
          {#if labels.normal}
            <text class="tkc-label-2 tkc-halo" x={labels.normal.x} y={labels.normal.y}>{labels.normal.text}</text>
          {/if}
          <text class="tkc-label tkc-halo lab-limit" x={labels.limit.x} y={labels.limit.y} text-anchor={labels.limit.anchor}>{labels.limit.text}</text>
          {#if labels.worst}
            <text class="tkc-label tkc-halo" class:lab-over={worst.mistakes >= LIMIT} x={labels.worst.x} y={labels.worst.y} text-anchor={labels.worst.anchor}>{labels.worst.text}</text>
          {/if}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink)"></span>Mistakes if it failed that day</span>
          <span><span class="tkc-swatch sw-fail"></span>A day it failed</span>
          <span><span class="tkc-swatch sw-fail over"></span>Over the limit</span>
          {#if practice !== 'none'}<span><span class="tkc-swatch sw-practice"></span>Practice day</span>{/if}
        </div>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat
          label="Mistakes on normal days"
          value="{int(r.normalYear)} a year"
          sub={auto === 0 ? 'people screen every payment' : `${int(BY_HAND.normalYear)} a year with no system`}
        />
        <Stat
          label={auto === 0 ? 'Mistakes on days it failed' : `Mistakes on the ${word(r.failed.length)} days it failed`}
          value={auto === 0 ? 'None' : int(r.failTotal)}
          sub={auto === 0 ? 'no system to fail' : `in three years; on all the normal days, ${int(r.normalTotal)}`}
          swatch={over ? 'var(--tkc-conditions)' : ''}
        />
      </div>

      {#snippet model()}
        <p>
          Each working day brings {PARAMS.perDay} payments; a month has {PARAMS.monthDays} working days, and the run
          covers the {PARAMS.months} months after go-live, when people were in full practice. Mistakes are expected
          numbers. People’s skill runs from 0 to 1; on a day they screen everything they get 1% + 9% × (1 − skill)
          wrong. A whole day by hand, a failure or a practice day, brings skill back to 1. After it, skill fades with a
          time constant of two months towards a floor kept up by the share people screen every day: full practice at
          30% or more, proportionally less below. On a practice day the system screens behind people, so their
          mistakes are caught. Failures come at random, about three a year; this run has {word(BASE.failed.length)}, and
          the answer holds in 200 other runs. People out of practice are also slower; the model leaves that out.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      The system did what it was bought for: at 99%, a year of normal days brings {T.yearBase} mistakes instead of
      {T.yearHand}. But every payment it takes is one people no longer screen, and skill that is not used fades. The
      first failure, a month after go-live, cost {T.first} mistakes, while people still remembered the work; later
      ones cost up to {T.worst}. Over three years the {T.count} days it failed brought {T.failTotal} mistakes,
      two-thirds as many as the other {T.normalDays} days together.
    </p>
    <p>
      Lisanne Bainbridge called these the ironies of automation, in 1983. The machine takes the work that is easy to
      automate and leaves people the rest; skills that are not used fade; and nobody watches well for something that
      almost never happens. Hence her line that “the more advanced a control system is, so the more crucial may be the
      contribution of the human operator.” Reliability sharpens it: every failure is also a day of practice, so the
      rarer the failures, the longer since people last did the work.
    </p>
    <p>
      In the chain, the screening link is an <span class="tkc-or">OR</span>: the system, or people when it fails. Like
      the riddle’s stand-in who has never stood in, the second half of that OR can exist on paper only.
    </p>
    <p>
      The practice day does on purpose what a failure does by accident, with the system screening behind people to
      catch their mistakes. It is a deliberate cost that catches nothing on the day itself, and so the first thing cut
      in a good year. In 2009 an airliner over the Atlantic lost its speed readings when ice
      blocked its sensors; the autopilot handed control to pilots who had rarely flown by hand at that height, and 228
      people died. Investigators recommended compulsory practice in flying by hand. A chain that learns also has to
      remember.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="When did the people behind our most reliable system last do its work by hand?">
      <p>
        Continuity plans say who takes over when a critical system fails. Bank supervisors now ask that critical
        operations keep running through severe but plausible disruptions, and that the plans be tested. A plan
        discussed around a table shows who would act; only running the fallback shows whether they still can.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .curve {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
    stroke-linejoin: round;
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
  .practice {
    stroke: var(--tkc-options);
    stroke-width: 2;
    stroke-linecap: round;
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
