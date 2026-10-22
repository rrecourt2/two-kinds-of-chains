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
  import { prefersReducedMotion } from '../lib/motion.js';

  // A prediction: the choice of AI opens after the first answer or a hint.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('tools'));

  const N = 20;
  const SEED = 1;
  let ai = $state('steady');
  let width = $state(560);

  const spread = $derived(ai === 'steady' ? STEADY : ERRATIC);
  const drafts = $derived(sampleRequests(N, spread, SEED));
  const rows = $derived(
    SHOWN.map((d) => ({ ...d, ...runDesign(d, drafts), avg: averagePayoff(d, spread), steadyAvg: averagePayoff(d, STEADY) })),
  );

  // The bars glide to their new heights when the AI changes.
  const bars = new Tween(SHOWN.flatMap(() => Array(N).fill(0)), { duration: 450, easing: cubicOut });
  $effect(() => {
    bars.set(rows.flatMap((r) => r.values), { duration: prefersReducedMotion() ? 0 : 450 });
  });

  // Twenty bars around a zero line, per design.
  const LIMIT = 4; // hours shown each way; larger values are clipped and marked
  const HALF = 34;
  const PAD = 9;
  const H = 2 * (HALF + PAD);
  const ZERO = HALF + PAD;
  const gap = 2;
  const bw = $derived(Math.max(3, (width - gap * (N - 1)) / N));
  const bx = (i) => i * (bw + gap);
  const h = (v) => (Math.min(LIMIT, Math.abs(v)) / LIMIT) * HALF;

  const hrs = (v) => `${Math.abs(v).toFixed(1)} h`;
  const total = (v) => `${hrs(v)} ${v >= 0 ? 'saved' : 'lost'}`;
  const mins = (v) => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 60)} min`;
  const NAMES = {
    tool: { name: 'With a person in the loop', note: 'the AI drafts; a person keeps a good draft and drops a bad one' },
    autopilot: { name: 'On autopilot', note: 'the AI’s answer is used as it is, with nobody looking' },
  };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const wrongNote = (r) =>
    r.id === 'tool' ? `${plural(r.wrong, 'bad draft', 'bad drafts')} dropped` : `${plural(r.wrong, 'wrong answer', 'wrong answers')} passed on`;

  const rules = [
    'Each AI draft saves half an hour on average; a wrong draft costs time instead.',
    'A person in the loop spends six minutes looking and drops every bad draft.',
    'On autopilot nobody looks; a wrong answer is built on and costs three times as much.',
    'The steady AI is wrong about one time in twenty; the erratic one, four in ten.',
  ];

  const puzzle = {
    goal: 'The AI turns erratic: brilliant on some requests, wrong on others, still worth half an hour on average. Which design saves more time now?',
    choices: [
      { value: 'autopilot', label: 'Autopilot, as before: nobody spends time checking' },
      { value: 'person', label: 'The person in the loop' },
      { value: 'same', label: 'About the same' },
    ],
    answer: 'person',
    wrong: (v) =>
      v === 'autopilot'
        ? 'Not any more. Autopilot keeps every brilliant answer, but what happens to each wrong one?'
        : 'They part ways. What does a wrong answer cost each design, and how often is the erratic AI wrong?',
    hints: [
      'When the AI is brilliant, both designs keep the gain; the person only spends six minutes looking.',
      'When the AI is wrong, the person drops the draft. On autopilot, the mistake is built on.',
    ],
    found: 'The person in the loop, by a wide margin. With the erratic AI it saves about 58 minutes a request, up from 24; autopilot goes from 29 minutes saved to 39 lost. Variability helps whatever is optional.',
  };
</script>

{#snippet flow(id)}
  <svg
    class="flow"
    width="280"
    height="50"
    viewBox="0 0 280 50"
    role="img"
    aria-label={id === 'tool'
      ? 'Sketch: a request goes to the AI for a draft, then to a person, who keeps a good draft or does the work without it, then on to the next step.'
      : 'Sketch: a request goes to the AI, and its answer goes straight on to the next step, with no one looking.'}
  >
    <rect class="node" x="0.5" y="27.5" width="58" height="20" rx="5" />
    <text class="node-label" x="29.5" y="41.5" text-anchor="middle">Request</text>
    <line class="edge" x1="59" y1="37.5" x2="71" y2="37.5" />
    <path class="head" d="M76 37.5 l-6 -3.5 v7 Z" />
    <rect class="node next" x="218.5" y="27.5" width="61" height="20" rx="5" />
    <text class="node-label" x="249" y="41.5" text-anchor="middle">Next step</text>
    <path class="head" d="M218 37.5 l-6 -3.5 v7 Z" />
    {#if id === 'tool'}
      <rect class="node ai-draft" x="76.5" y="27.5" width="54" height="20" rx="5" />
      <text class="node-label" x="103.5" y="41.5" text-anchor="middle">AI draft</text>
      <line class="edge" x1="131" y1="37.5" x2="143" y2="37.5" />
      <path class="head" d="M148 37.5 l-6 -3.5 v7 Z" />
      <rect class="node person" x="148.5" y="27.5" width="52" height="20" rx="5" />
      <text class="node-label strong" x="174.5" y="41.5" text-anchor="middle">Person</text>
      <line class="edge" x1="201" y1="37.5" x2="213" y2="37.5" />
      <!-- The person can go around the draft and do the work as before. -->
      <path class="edge-or" d="M42 27 C 42 4, 168 4, 168 21" />
      <path class="head-or" d="M168 27 l-3.5 -6 h7 Z" />
      <text class="or-label tkc-halo" x="105" y="14" text-anchor="middle">or</text>
    {:else}
      <rect class="node ai-auto" x="76.5" y="27.5" width="54" height="20" rx="5" />
      <text class="node-label strong" x="103.5" y="41.5" text-anchor="middle">AI</text>
      <line class="edge" x1="131" y1="37.5" x2="213" y2="37.5" />
      <text class="nobody" x="172" y="31" text-anchor="middle">no one looking</text>
    {/if}
  </svg>
{/snippet}

<Chapter
  n={11}
  kicker="AI and tools"
  title="A person in the loop"
  lede="The same AI can be put to work with a person checking each draft, or on autopilot. Checking takes time; what it buys depends on the AI."
  puzzle="tools"
>
  {#snippet setup()}
    <p>
      Since the coin game in chapter 7, variability has mostly done harm in this story. Swings that look generous on
      paper left the typical player poorer, and more variable years drove the specialist off island after island. The species
      that survived was the generalist, which spread its bets over four plants; variability still cost it, only less.
      This chapter is about something stronger, a design that gains from variability, and its example is the newest
      link in many chains: AI.
    </p>
    <p>
      A modern AI model can read a request written in plain language, draft the answer and fill in the systems behind it.
      There are two ways to put it to work. With a person in the loop, the AI drafts and someone looks before anything
      moves on: a good draft is kept, and a bad one is dropped and the work done as before. On autopilot, the answer goes
      straight to the next step. Nobody spends time checking, so every good answer saves its full value. A wrong one
      travels on unnoticed, and others build on it before anyone finds it.
    </p>
    <p>
      Below, the same AI handles the same twenty requests both ways. For now it is steady: it saves about half an hour
      on most requests and is rarely wrong.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="One AI, twenty requests, two designs"
      sub="Each bar is one request: time saved above the line, time lost below."
      {rules}
    >
      <Puzzle id="tools" {...puzzle} predict onshow={() => (ai = 'erratic')} />
      <div class="tkc-controls" class:tkc-wait={!live} inert={live ? undefined : true}>
        <Segmented
          name="t-ai"
          label="The AI, worth half an hour a request on average"
          bind:value={ai}
          options={[
            { value: 'steady', label: 'Steady: rarely wrong' },
            { value: 'erratic', label: 'Erratic: brilliant or wrong' },
          ]}
        />
      </div>

      <div class="tkc-chart designs" bind:clientWidth={width}>
        {#each rows as r, k (r.id)}
          <section class="design" aria-label={NAMES[r.id].name}>
            <div class="d-head">
              <p class="d-name"><strong>{NAMES[r.id].name}:</strong> {NAMES[r.id].note}</p>
              <p class="d-total">
                <strong class:neg={r.total < 0}>{total(r.total)}</strong>
                <span>in all · {wrongNote(r)}</span>
              </p>
            </div>
            {@render flow(r.id)}
            <svg {width} height={H} role="img" aria-label="{NAMES[r.id].name}, {ai} AI: {total(r.total)} over twenty requests; {wrongNote(r)}.">
              <line class="zero" x1="0" x2={width} y1={ZERO} y2={ZERO} />
              {#each Array(N) as _, i (i)}
                {@const v = bars.current[k * N + i]}
                <rect x={bx(i)} y={v >= 0 ? ZERO - h(v) : ZERO} width={bw} height={Math.max(0.5, h(v))} rx="1.5" class={v >= 0 ? 'saved' : 'lost'} />
                {#if Math.abs(v) > LIMIT}
                  <path d={v > 0 ? `M${bx(i)} ${ZERO - HALF - 2}l${bw / 2} -5l${bw / 2} 5Z` : `M${bx(i)} ${ZERO + HALF + 2}l${bw / 2} 5l${bw / 2} -5Z`} class={v > 0 ? 'saved' : 'lost'} />
                {/if}
              {/each}
            </svg>
          </section>
        {/each}
        <div class="tkc-legend">
          <span><span class="tkc-swatch" style:background="var(--tkc-options)"></span>Time saved</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Time lost</span>
          <span>Bars stop at ±{LIMIT} hours; a small arrow marks a longer one.</span>
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        {#each rows as r (r.id)}
          <Stat
            label="{NAMES[r.id].name}, in the long run"
            value={mins(r.avg)}
            sub={ai === 'steady' ? `per request, ${r.avg >= 0 ? 'saved' : 'lost'}` : `per request; with the steady AI, ${mins(r.steadyAvg)}`}
          />
        {/each}
      </div>

      {#snippet model()}
        <p>On each request the AI’s draft is worth X hours: half an hour on average, give or take {STEADY} hours for the steady AI and {ERRATIC} hours for the erratic one (a normal distribution). Below zero, the draft is wrong and using it costs time. Both AIs see the same twenty requests, with the same luck, scaled by their spread.</p>
        <p>With a person in the loop, someone spends six minutes looking at each draft and keeps it only when it helps, so a request saves max(X, 0) − 0.1 hours. The model assumes the person can always tell a good draft from a bad one. On autopilot the answer is always used: a good one saves X hours; a wrong one is passed on and built on before anyone notices, which the model counts as three times the loss (3X). The figures “in the long run” are exact averages over all possible requests.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      With a steady AI there is little for the person to catch. It is rarely wrong, so the six minutes spent looking buy
      almost nothing, and autopilot comes out ahead. The erratic AI is wrong on four requests in ten, and brilliant on
      others. When it is brilliant, the person keeps the draft and the gain is large; when it is wrong, the draft is
      dropped and the loss is six minutes. Wilder swings bring more brilliant drafts to keep, while the losses stay small.
      Autopilot keeps the brilliant answers too, but every wrong one goes on down the chain, and the wilder the AI, the
      more often it is wrong and the bigger its mistakes.
    </p>
    <p>
      A person in the loop is usually counted as a safety measure, a cost paid for caution. Here it is also what turns the
      AI’s variability into a gain.
    </p>
    <p>
      Anyone who has priced an option will recognise the shapes. The person in the loop holds a bought option: a small,
      known cost and a large upside. Autopilot has the shape of a sold option: its losses grow faster than its gains. In
      the language of this story, the person adds an <span class="tkc-or">OR</span> to the chain, the draft or the work
      done as before, and autopilot adds an <span class="tkc-and">AND</span>: the next step needs the AI to be right.
    </p>
    <p>
      The loop works where a person can tell a good draft from a bad one at a glance; where they cannot, it quietly
      becomes autopilot.
    </p>
    <h3>AI agents have the same problem as approval chains</h3>
    <p>
      An AI agent that can call many tools and try another when one fails is built from ORs. An agent that must work
      through a fixed sequence of systems is built from ANDs, and the arithmetic from the opening applies: at 95% a step,
      a 20-step sequence gets everything right only about one time in three.
    </p>
    <p>
      The fixes from earlier chapters work here too: one record for the AI to read, rather than many systems to fill in,
      and people reviewing the finished work side by side, rather than a sign-off at every step. The rest of this part is
      about chains that bend instead of breaking, and ends with a loan that cannot move until a dozen conditions are
      met.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Where does an AI’s answer travel on with nobody looking, and what would a wrong one cost by the time it surfaced?">
      <p>
        An AI project is easiest to judge by what it takes out of the chain: steps, fields and waits. On autopilot, it is
        safe only where its mistakes are small, visible and easy to undo.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .designs {
    display: grid;
    gap: 16px;
  }
  .design {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .d-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 2px 16px;
  }
  .d-name {
    flex: 1 1 15rem;
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--tkc-ink-2);
  }
  .d-name strong {
    color: var(--tkc-ink);
  }
  .d-total {
    flex: none;
    margin: 0;
    display: grid;
    justify-items: end;
    font-size: 0.8125rem;
    line-height: 1.35;
    color: var(--tkc-muted);
    font-variant-numeric: tabular-nums;
  }
  .d-total strong {
    font-size: 0.9375rem;
    color: var(--tkc-ink);
  }
  .d-total strong.neg {
    color: var(--tkc-conditions-ink);
  }
  @container fig (max-width: 440px) {
    .d-total {
      justify-items: start;
    }
  }
  .flow {
    display: block;
    max-width: 100%;
    height: auto;
    overflow: visible;
  }
  .node {
    fill: var(--tkc-surface);
    stroke: var(--tkc-rule);
    stroke-width: 1;
  }
  .ai-draft {
    stroke: var(--tkc-options);
    stroke-dasharray: 3 2;
    fill: var(--tkc-options-wash);
  }
  .person {
    stroke: var(--tkc-ink-2);
    stroke-width: 1.5;
  }
  .ai-auto {
    stroke: var(--tkc-conditions);
    stroke-width: 1.5;
    fill: var(--tkc-conditions-wash);
  }
  .node-label {
    font-size: 11px;
    fill: var(--tkc-ink-2);
  }
  .node-label.strong {
    font-weight: 700;
    fill: var(--tkc-ink);
  }
  .edge {
    stroke: var(--tkc-ink-2);
    stroke-width: 1.5;
  }
  .edge-or {
    fill: none;
    stroke: var(--tkc-options);
    stroke-width: 1.5;
    stroke-dasharray: 3 2;
  }
  .head {
    fill: var(--tkc-ink-2);
  }
  .head-or {
    fill: var(--tkc-options);
  }
  .or-label {
    font-size: 10.5px;
    font-weight: 700;
    fill: var(--tkc-options-ink);
  }
  .nobody {
    font-size: 10.5px;
    font-style: italic;
    fill: var(--tkc-conditions-ink);
  }
  .zero {
    stroke: var(--tkc-rule);
    stroke-width: 1;
  }
  .saved {
    fill: var(--tkc-options);
  }
  .lost {
    fill: var(--tkc-conditions);
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
