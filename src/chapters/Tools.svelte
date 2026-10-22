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
    tool: { name: 'Optional (tool)', note: 'a person keeps a good draft and drops a bad one' },
    gate: { name: 'Mandatory (gate)', note: 'every request passes the AI, and its answer is used as it is' },
  };
  const wrongNote = (r) =>
    r.id === 'tool'
      ? `${r.wrong} bad draft${r.wrong === 1 ? '' : 's'} dropped`
      : `${r.wrong} request${r.wrong === 1 ? '' : 's'} stuck`;

  const puzzle = {
    goal: 'The AI becomes erratic: brilliant on some requests, wrong on others, still worth half an hour on average. What happens to the time it saves?',
    choices: [
      { value: 'both-less', label: 'Both save less' },
      { value: 'both-more', label: 'Both save more' },
      { value: 'tool-more', label: 'The optional tool saves more; the mandatory gate saves less' },
      { value: 'tool-less', label: 'The optional tool saves less; the mandatory gate saves more' },
    ],
    answer: 'tool-more',
    wrong: (v) =>
      v === 'both-less'
        ? 'Not for the optional tool. What does a bad draft cost a person who can drop it?'
        : v === 'both-more'
          ? 'Not for the mandatory gate. Its best answers cannot save more than its half hour. What do its wrong ones cost?'
          : 'The other way round. Switch the AI to Erratic and compare the two totals.',
    hints: [
      'When the AI is wrong, what does each design lose? A person can drop a bad draft; a gate stops the request.',
      'When the AI is brilliant, what can each design gain? A tool keeps all of it; a gate saves at most its half hour.',
    ],
    found: 'The tool saves more; the gate starts to cost. As a tool, about 58 minutes saved per request (24 with the steady AI). As a gate, about 87 minutes lost (22 saved with the steady AI). Variability helps whatever is optional and hurts whatever is mandatory.',
  };
</script>

{#snippet flow(id)}
  <svg class="flow" width="244" height="50" viewBox="0 0 244 50" role="img" aria-label={id === 'tool' ? 'Sketch: a request goes to a person, with the AI’s draft or without it.' : 'Sketch: every request must pass the AI before it reaches a person.'}>
    <rect class="node" x="0.5" y="27.5" width="62" height="20" rx="5" />
    <text class="node-label" x="31.5" y="41.5" text-anchor="middle">Request</text>
    <rect class="node" x="181.5" y="27.5" width="62" height="20" rx="5" />
    <text class="node-label" x="212.5" y="41.5" text-anchor="middle">Person</text>
    {#if id === 'tool'}
      <line class="edge" x1="63" y1="37.5" x2="176" y2="37.5" />
      <path class="edge-opt" d="M70 37.5 C 84 37.5 84 10.5 98 10.5" />
      <path class="edge-opt" d="M146 10.5 C 160 10.5 160 37.5 172 37.5" />
      <rect class="node ai-opt" x="98.5" y="1.5" width="47" height="18" rx="5" />
      <text class="node-label" x="122" y="14" text-anchor="middle">AI draft</text>
      <text class="or-label" x="122" y="33" text-anchor="middle">or</text>
    {:else}
      <line class="edge" x1="63" y1="37.5" x2="93" y2="37.5" />
      <path class="head" d="M98 37.5 l-6 -3.5 v7 Z" />
      <line class="edge" x1="146" y1="37.5" x2="176" y2="37.5" />
      <rect class="node ai-gate" x="99" y="26" width="46" height="23" rx="3" />
      <text class="node-label strong" x="122" y="41.5" text-anchor="middle">AI</text>
      <text class="gate-label" x="122" y="17" text-anchor="middle">every request must pass</text>
    {/if}
    <path class="head" d="M181 37.5 l-6 -3.5 v7 Z" />
  </svg>
{/snippet}

<Chapter
  n={11}
  kicker="AI and tools"
  title="Tool or gate?"
  lede="The same AI can shorten a chain or add a link to it. It depends on whether the work can go around it."
  puzzle="tools"
>
  {#snippet setup()}
    <p>
      Since the coin game in chapter 7, variability has mostly done harm in this story. Swings that look generous on
      paper left the typical player poorer, and more variable years drove the specialist off island after island. The species
      that survived was the generalist, which had four plants to choose from. This chapter is about that difference, and
      its example is the newest link in many chains: AI.
    </p>
    <p>
      A modern AI model can read a request written in plain language, draft the answer and fill in the systems behind it.
      It can be built into a process in two ways.
    </p>
    <ul>
      <li>
        <strong>Optional, as a tool.</strong> The AI drafts and a person decides. A good draft is kept; a bad one is
        dropped, at the cost of the six minutes spent looking at it. The work can always go ahead without it.
      </li>
      <li>
        <strong>Mandatory, as a gate.</strong> Here the AI itself is the gate, like the approvals in chapter 3: every
        request must pass it, and its answer is used as it is, with no person choosing. When the answer is right, the
        request reaches the next desk half an hour sooner, and no sooner, because the next step is booked for then. When
        it is wrong, the request stops, with those queued behind it, until someone notices and puts it right.
      </li>
    </ul>
    <p>
      Below, the same AI handles the same twenty requests both ways. For now it is steady: it saves about half an hour
      on most requests and is rarely wrong.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="One AI, twenty requests, two designs" sub="Each bar is one request: time saved above the line, time lost below.">
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
        <p>On each request the AI’s draft is worth X hours: half an hour on average, give or take {STEADY} hours for the steady AI and {ERRATIC} hours for the erratic one (a normal distribution). Both AIs see the same twenty requests, with the same luck, scaled by their spread.</p>
        <p>Optional (tool): a person spends six minutes looking at the draft and keeps it only when it helps, so a request saves max(X, 0) − 0.1 hours. Mandatory (gate): every request passes the AI and its answer is used. A good answer saves at most the half hour the next steps are planned around; a wrong one stops the request and the work queued behind it until someone notices and fixes it, which the model counts as three times the loss (3X). The figures “in the long run” are exact averages over all possible requests.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      An option is used only when it pays. When the erratic AI is brilliant, the person keeps the draft and the gain is
      large; when it is wrong, the draft is dropped and the loss is six minutes. Wilder swings bring more brilliant drafts
      to keep, while the losses stay small. A gate has no such choice. Its best answers are capped at the half hour the
      rest of the process expects, and every wrong one holds up the line. Wilder swings bring more stopped lines and no
      bigger gains.
    </p>
    <p>
      Anyone who has priced an option will recognise the shapes. A tool is a bought option: a small, known downside and a
      large upside. A gate is a sold option: the reverse. In the language of this story, a tool adds an
      <span class="tkc-or">OR</span> to the chain, and a gate adds an <span class="tkc-and">AND</span>.
    </p>
    <p>
      A tool works where a person can tell a good draft from a bad one at a glance; where they cannot, the tool quietly
      becomes a gate.
    </p>
    <h3>AI agents have the same problem as approval chains</h3>
    <p>
      An AI agent that can call many tools and try another when one fails is built from ORs. An agent that must work
      through a fixed sequence of systems is built from ANDs, and the arithmetic from the opening applies: at 95% a step,
      a 20-step sequence gets everything right only about one time in three.
    </p>
    <p>
      The fixes from earlier chapters work here too: one record for the AI to read, rather than many systems to fill in,
      and people reviewing the finished work side by side, rather than a gate at every step. The rest of this part is
      about chains that bend instead of breaking, and ends with a loan that cannot move until a dozen conditions are
      met.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Where would an AI step add a link to the chain, and where would it take one away?">
      <p>
        An AI project is easiest to judge by what it takes out of the chain: steps, fields and waits. As a gate, it is
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
  .ai-opt {
    stroke: var(--tkc-options);
    stroke-dasharray: 3 2;
    fill: var(--tkc-options-wash);
  }
  .ai-gate {
    stroke: var(--tkc-conditions);
    stroke-width: 2.5;
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
  .edge-opt {
    fill: none;
    stroke: var(--tkc-options);
    stroke-width: 1.5;
    stroke-dasharray: 3 2;
  }
  .head {
    fill: var(--tkc-ink-2);
  }
  .or-label {
    font-size: 10.5px;
    font-weight: 700;
    fill: var(--tkc-options-ink);
  }
  .gate-label {
    font-size: 10.5px;
    font-weight: 700;
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
</style>
