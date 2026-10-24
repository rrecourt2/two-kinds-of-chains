<script>
  import { getContext } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { SHOWN, averagePayoff, runDesign, sampleRequests, STEADY, ERRATIC } from '../lib/sim/convexity.js';
  import { linear, line } from '../lib/scales.js';
  import { prefersReducedMotion } from '../lib/motion.js';

  // A prediction: the choice of AI opens after the first answer or a hint.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('tools'));

  const N = 20;
  const SEED = 1;
  let ai = $state('steady');
  let width = $state(560);

  // Hours saved, added up request by request, for one sample of twenty requests.
  const added = (values) => {
    let sum = 0;
    return [0, ...values.map((v) => (sum += v))];
  };
  const runFor = (spread) => {
    const drafts = sampleRequests(N, spread, SEED);
    return SHOWN.map((d) => ({ ...d, ...runDesign(d, drafts), avg: averagePayoff(d, spread) }));
  };
  const RUNS = { steady: runFor(STEADY), erratic: runFor(ERRATIC) };
  const rows = $derived(RUNS[ai]);
  const steadyAvg = Object.fromEntries(RUNS.steady.map((r) => [r.id, r.avg]));

  // The lines glide to their new shape when the AI changes.
  const sums = new Tween(RUNS.steady.flatMap((r) => added(r.values)), { duration: 450, easing: cubicOut });
  $effect(() => {
    sums.set(rows.flatMap((r) => added(r.values)), { duration: prefersReducedMotion() ? 0 : 450 });
  });
  const series = $derived(rows.map((r, k) => sums.current.slice(k * (N + 1), (k + 1) * (N + 1))));

  // ---- The chart: one domain for both AIs, so the switch shows the change ----
  const all = Object.values(RUNS).flatMap((rs) => rs.flatMap((r) => added(r.values)));
  const Y0 = Math.min(0, Math.floor(Math.min(...all)));
  const Y1 = Math.ceil(Math.max(...all) / 5) * 5;
  const H = 260;
  const m = { top: 24, right: 46, bottom: 36, left: 30 };
  const x = $derived(linear(0, N, m.left, Math.max(m.left + 100, width - m.right)));
  const y = linear(Y0, Y1, H - m.bottom, m.top);
  const yTicks = Array.from({ length: Math.floor((Y1 - Math.ceil(Y0 / 5) * 5) / 5) + 1 }, (_, i) => Math.ceil(Y0 / 5) * 5 + 5 * i);
  const xTicks = [1, 5, 10, 15, 20];
  const pts = (s) => s.map((v, i) => [x(i), y(v)]);
  // Autopilot's falls: each is a wrong draft used as it was, the time lost drawn in orange.
  const falls = $derived(
    series[1]
      .map((v, i) => (i > 0 && rows[1].values[i - 1] < 0 ? { i, d: line([[x(i - 1), y(series[1][i - 1])], [x(i), y(v)]]) } : null))
      .filter(Boolean),
  );
  // End labels, kept at least a line apart.
  const ends = $derived.by(() => {
    const a = y(series[0][N]);
    const b = y(series[1][N]);
    const gap = 14;
    if (Math.abs(a - b) >= gap) return [a, b];
    const mid = (a + b) / 2;
    return a < b ? [mid - gap / 2, mid + gap / 2] : [mid + gap / 2, mid - gap / 2];
  });

  const hrs = (v) => `${Math.abs(v).toFixed(1)} h`;
  const mins = (v) => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 60)} min`;
  const NAMES = { tool: 'Person in the loop', autopilot: 'On autopilot' };
  const label = $derived(
    `Hours saved, added up over one sample of twenty requests, with the ${ai} AI: ${rows.map((r) => `${NAMES[r.id].toLowerCase()}, ${hrs(r.total)} ${r.total >= 0 ? 'saved' : 'lost'}`).join('; ')}. ` +
      `${rows[1].wrong} ${rows[1].wrong === 1 ? 'draft was' : 'drafts were'} wrong: autopilot used ${rows[1].wrong === 1 ? 'it' : 'them'} and lost the time to redo the work; the person dropped ${rows[1].wrong === 1 ? 'it' : 'them'} at six minutes each.`,
  );

  const rules = [
    'Each draft saves half an hour on average; a wrong one costs time to redo.',
    'In six minutes, a person keeps a helpful draft and drops a harmful one.',
    'On autopilot, every draft is used as it is, with nobody looking.',
  ];

  const puzzle = {
    goal: 'The AI turns erratic: brilliant on some requests, wrong on others, still worth half an hour on average. Which design saves more over many requests?',
    choices: [
      { value: 'autopilot', label: 'Autopilot, as before: nobody spends time checking' },
      { value: 'person', label: 'The person in the loop' },
      { value: 'same', label: 'About the same' },
    ],
    answer: 'person',
    wrong: (v) =>
      v === 'autopilot'
        ? 'Not any more. Autopilot still saves its half hour on average. What do the wider swings give a person who can choose?'
        : 'They part ways. Autopilot stays at its half hour on average; what happens to the person’s six-minute losses and brilliant gains?',
    hints: [
      'Autopilot uses every draft, so on average it saves what the AI is worth: half an hour, steady or erratic.',
      'The person keeps the brilliant drafts and drops the wrong ones at six minutes each. What do wider swings do to that?',
    ],
    found: 'The person in the loop: the swings lift it to about 58 minutes a request, while autopilot stays at its 30.',
  };
</script>

<Chapter
  n={17}
  kicker="AI and tools"
  title="A person in the loop"
  lede="The same AI can work with a person checking each draft, or on autopilot. Checking takes time; what it buys depends on the AI."
  puzzle="tools"
>
  {#snippet setup()}
    <p>
      So far, variability has mostly done harm in this story. In the coin game, the stress test and on the islands,
      chains broke when the world pulled on them; since then, they have learned to bend. The chains in this last part
      learn, and some even gain from the swings.
    </p>
    <p>
      The first is the newest link in many chains: an AI that reads a request, drafts the answer and fills in the
      systems behind it. With a person in the loop, someone looks at each draft before it moves on, keeps a good one and
      drops a bad one. On autopilot, every draft goes straight on, and a wrong one is redone further down the chain.
    </p>
    <p>Below, the same AI handles the same twenty requests both ways. For now it is steady: rarely wrong.</p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="One AI, twenty requests, two designs" sub="One sample of twenty requests: the hours each design saves, added up request by request." {rules}>
      <Puzzle id="tools" {...puzzle} predict onshow={() => (ai = 'erratic')} />
      <div class="tkc-controls" class:tkc-wait={!live} inert={live ? undefined : true}>
        <div class="ctl">
          <Segmented
            name="t-ai"
            label="The AI"
            bind:value={ai}
            options={[
              { value: 'steady', label: 'Steady' },
              { value: 'erratic', label: 'Erratic' },
            ]}
          />
          <p class="tkc-caption">Both save half an hour a request on average. The steady AI is rarely wrong; the erratic one is brilliant or wrong.</p>
        </div>
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label={label}>
          <text class="tkc-axis-title" x="0" y="12">Hours saved, added up</text>
          {#each yTicks as t (t)}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={m.left} x2={x(N)} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={m.left - 6} y={y(t) + 4} text-anchor="end">{t}</text>
          {/each}
          {#each xTicks as t (t)}
            <text class="tkc-axis-label" x={x(t)} y={H - m.bottom + 16} text-anchor={t === N ? 'end' : 'middle'}>{t}</text>
          {/each}
          <text class="tkc-axis-title" x={m.left + (x(N) - m.left) / 2} y={H - 4} text-anchor="middle">Requests handled</text>
          <path class="run auto" d={line(pts(series[1]))} />
          {#each falls as f (f.i)}<path class="run fall" d={f.d} />{/each}
          <path class="run person" d={line(pts(series[0]))} />
          {#each series as s, k (k)}
            <circle class="end" class:person={k === 0} cx={x(N)} cy={y(s[N])} r="4" />
            <text class="tkc-label tkc-halo end-label" class:person-label={k === 0} x={x(N) + 8} y={ends[k] + 4}>{hrs(s[N])}</text>
          {/each}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-options)" aria-hidden="true"></span>Person in the loop</span>
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-ink-2)" aria-hidden="true"></span>On autopilot</span>
          <span><span class="tkc-swatch tkc-swatch--line" style:background="var(--tkc-conditions)" aria-hidden="true"></span>Wrong draft used: time lost</span>
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        {#each rows as r (r.id)}
          <Stat
            label="{NAMES[r.id]}, on average"
            value={mins(r.avg)}
            sub={ai === 'steady' ? 'a request, over many requests' : `a request; with the steady AI, ${mins(steadyAvg[r.id])}`}
            swatch={r.id === 'tool' ? 'var(--tkc-options)' : 'var(--tkc-ink-2)'}
            line={true}
          />
        {/each}
      </div>

      {#snippet model()}
        <p>
          On each request the AI’s draft is worth X hours: half an hour on average, give or take {STEADY} hours for the
          steady AI and {ERRATIC} for the erratic one (a normal distribution). Below zero the draft is wrong, and using it
          costs time. Both AIs see the same twenty requests, with the same luck scaled by their spread.
        </p>
        <p>
          With a person in the loop, someone spends six minutes on each draft and keeps it only when it helps: max(X, 0)
          − 0.1 hours, assuming they can always tell. On autopilot every draft is used: X hours, a wrong one costing its
          full value to redo, so its average is the AI’s own half hour, whatever the spread. The tiles are exact averages
          over all possible requests; the chart is one sample.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      With a steady AI there is little for the person to catch. It is rarely wrong, so the six minutes spent looking buy
      almost nothing, and autopilot comes out ahead. The erratic AI is wrong on four requests in ten and brilliant on
      others. When it is brilliant, the person keeps the draft and the gain is large; when it is wrong, the draft is
      dropped and the loss is six minutes. Wilder swings bring more brilliant drafts to keep, while the losses stay small.
    </p>
    <p>
      Autopilot uses every draft, gains and losses alike, so its average is simply the AI’s own: wider swings add as
      much above the line as below it. The average hides who pays. In the sample above, the erratic AI’s six wrong drafts
      each take more than an hour to redo, the worst about four, and each of those hours lands on someone further down
      the chain.
    </p>
    <p>
      Anyone who has priced an option will recognize the shape. The person in the loop holds a bought option: a small,
      known cost and an upside that grows with the swings. In the language of this story, the person adds an
      <span class="tkc-or">OR</span> to the chain, the draft or the work done as before; autopilot adds an
      <span class="tkc-and">AND</span>, because the next step needs the AI to be right.
    </p>
    <p>
      A person in the loop is usually counted as a safety measure, a cost paid for caution. Here it is also what turns the
      AI’s swings into a gain. It works only while the person can tell a good draft from a bad one in the time they have;
      where they cannot, it quietly becomes autopilot. That is where the irony of the reliable machine begins.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Where do AI answers travel on with nobody looking, and what would a wrong one cost when it surfaced?">
      <p>
        An AI project is easiest to judge by what it takes out of the chain: steps, fields and waits. On autopilot, it is
        safe only where its mistakes are small, visible and easy to undo. With a person in the loop, its worth depends on
        that person having the time, and the knowledge, to tell.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .ctl {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .tkc-chart svg {
    display: block;
    overflow: visible;
  }
  .run {
    fill: none;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .run.person {
    stroke: var(--tkc-options);
  }
  .run.auto {
    stroke: var(--tkc-ink-2);
  }
  .run.fall {
    stroke: var(--tkc-conditions);
    stroke-width: 3;
  }
  .end {
    fill: var(--tkc-ink-2);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
  }
  .end.person {
    fill: var(--tkc-options);
  }
  .end-label.person-label {
    fill: var(--tkc-options-ink);
  }
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  @container fig (max-width: 300px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
