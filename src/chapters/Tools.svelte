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
  import { DESIGNS, averagePayoff, sampleRequests, STEADY, ERRATIC } from '../lib/sim/convexity.js';
  import { prefersReducedMotion } from '../lib/motion.js';

  // A prediction: the choice of AI opens after the first answer or a hint.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('tools'));

  const N = 20;
  let ai = $state('steady');
  let seed = $state(1);
  let width = $state(560);

  const spread = $derived(ai === 'steady' ? STEADY : ERRATIC);
  const drafts = $derived(sampleRequests(N, spread, seed));
  const rows = $derived(DESIGNS.map((d) => ({ ...d, values: drafts.map(d.payoff), avg: averagePayoff(d, spread) })));
  const totals = $derived(rows.map((r) => r.values.reduce((a, b) => a + b, 0)));

  // The bars glide to their new heights when the AI or the requests change.
  const bars = new Tween(DESIGNS.flatMap(() => Array(N).fill(0)), { duration: 450, easing: cubicOut });
  $effect(() => {
    bars.set(rows.flatMap((r) => r.values), { duration: prefersReducedMotion() ? 0 : 450 });
  });

  // One row per design: a heading line, then the twenty bars around a zero line.
  const LIMIT = 4; // hours shown each way; larger values are clipped and marked
  const HEAD = 20;
  const HALF = 30;
  const ROW = HEAD + 2 * HALF + 18;
  const H = 3 * ROW;
  const gap = 2;
  const bw = $derived(Math.max(3, (width - gap * (N - 1)) / N));
  const bx = (i) => i * (bw + gap);
  const h = (v) => (Math.min(LIMIT, Math.abs(v)) / LIMIT) * HALF;
  const fmtH = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(v !== 0 && Math.abs(v) < 10 ? 1 : 0)} h`;
  const NOTES = { tool: 'a person keeps what is right', rule: 'drafts go in as they are', gate: 'every request must pass it' };
  const COLORS = { tool: 'var(--tkc-options)', rule: 'var(--tkc-ink-2)', gate: 'var(--tkc-conditions)' };

  const puzzle = {
    goal: 'Both AIs save half an hour per request on average. One is steady; the other is brilliant on some requests and wrong on others. Which pairing saves the most time over many requests?',
    choices: [
      { value: 'steady-gate', label: 'The steady AI, as a gate every request must pass' },
      { value: 'steady-tool', label: 'The steady AI, as a tool people may use' },
      { value: 'erratic-tool', label: 'The erratic AI, as a tool people may use' },
      { value: 'erratic-rule', label: 'The erratic AI, as a rule: its drafts always go in' },
    ],
    answer: 'erratic-tool',
    wrong: (v) =>
      v === 'steady-tool'
        ? 'Good, but not the most. Compare the erratic AI used the same way.'
        : v === 'steady-gate'
          ? 'A gate caps what the AI can save and multiplies what it costs.'
          : 'As a rule, its wrong drafts cost about as much as its good ones save.',
    hints: ['What does a tool cost you when the AI is wrong?', 'With a tool, a person keeps the best drafts and drops the wrong ones. Which AI has more brilliant drafts?'],
    found: 'The erratic AI, as a tool: almost an hour saved per request, against 25 minutes for the steady one used the same way. People keep its brilliant drafts and drop its wrong ones. Built in as a gate, the same AI loses almost an hour and a half per request.',
  };
</script>

<Chapter
  n={7}
  kicker="AI and tools"
  title="Tool, rule or gate?"
  lede="The same AI can make a chain shorter, or add one more link. It depends on where it sits."
  puzzle="tools"
>
  {#snippet setup()}
    <p>
      Larry Tesler, the computer scientist who helped invent cut-and-paste, liked to point out that every task has some
      complexity that cannot be removed, only moved. Either the system carries it, or the person using it does.
    </p>
    <p>
      AI is the newest place to move it to. Modern AI models can read a request written in plain language, fill in the
      systems behind it and show a person what they did. Where the AI sits in the chain decides what it does. There are
      three ways to build it in:
    </p>
    <ul>
      <li><strong>A tool:</strong> the AI drafts, and a person keeps what is right.</li>
      <li><strong>A rule:</strong> its drafts go in as they are.</li>
      <li><strong>A gate:</strong> every request must pass the AI step before it can continue, and a wrong answer holds up the work behind it.</li>
    </ul>
    <p>
      Below, two AIs work through the same twenty requests. Both save half an hour per request on average. One is
      steady; the other is brilliant on some requests and wrong on others.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Twenty requests, one AI" sub="Each bar is one request: time saved above the line, time lost below.">
      <Puzzle id="tools" {...puzzle} predict onshow={() => (ai = 'erratic')} />
      <div class="tkc-controls" class:tkc-wait={!live} inert={live ? undefined : true}>
        <Segmented
          name="t-ai"
          label="The AI"
          bind:value={ai}
          options={[
            { value: 'steady', label: 'Steady' },
            { value: 'erratic', label: 'Erratic' },
          ]}
        />
        <div class="again">
          <button type="button" class="tkc-btn tkc-btn--small" onclick={() => (seed += 1)}>Another twenty requests</button>
        </div>
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label="Time saved over twenty requests with the {ai} AI: tool {fmtH(totals[0])}, rule {fmtH(totals[1])}, gate {fmtH(totals[2])}.">
          {#each rows as r, k (r.id)}
            {@const top = k * ROW}
            {@const zero = top + HEAD + HALF}
            <text class="tkc-label" x="0" y={top + 14}>{r.short}<tspan class="note" dx="8">{width < 400 ? '' : NOTES[r.id]}</tspan></text>
            <text class="tkc-label total" x={width} y={top + 14} text-anchor="end" style:fill={totals[k] < 0 ? 'var(--tkc-conditions-ink)' : 'var(--tkc-ink)'}>{fmtH(totals[k])} in all</text>
            <line class="zero" x1="0" x2={width} y1={zero} y2={zero} />
            {#each Array(N) as _, i (i)}
              {@const v = bars.current[k * N + i]}
              <rect x={bx(i)} y={v >= 0 ? zero - h(v) : zero} width={bw} height={Math.max(0.5, h(v))} rx="1.5" class={v >= 0 ? 'saved' : 'lost'} />
              {#if Math.abs(v) > LIMIT}
                <path d={v > 0 ? `M${bx(i)} ${zero - HALF - 2}l${bw / 2} -5l${bw / 2} 5Z` : `M${bx(i)} ${zero + HALF + 2}l${bw / 2} 5l${bw / 2} -5Z`} class={v > 0 ? 'saved' : 'lost'} />
              {/if}
            {/each}
          {/each}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch" style:background="var(--tkc-options)"></span>Time saved</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Time lost</span>
          <span>Bars stop at ±{LIMIT} hours; a small arrow marks a longer one.</span>
        </div>
      </div>

      <div class="tkc-stats tkc-stats--3" use:announce>
        {#each rows as r (r.id)}
          <Stat label="{r.short}, over many requests" value={fmtH(r.avg)} sub="per request, {ai} AI" swatch={COLORS[r.id]} line={true} />
        {/each}
      </div>

      {#snippet model()}
        <p>On each request the AI’s draft is worth X hours: half an hour on average, give or take {STEADY} hours for the steady AI and {ERRATIC} hours for the erratic one (a normal distribution). Both AIs see the same requests, with the same luck, scaled by their spread.</p>
        <p>A tool costs six minutes to look at and is used only when it helps: max(X, 0) − 0.1. A rule always uses the draft: X. A gate saves at most the half hour the process was designed around, and when it is wrong the work behind it waits as well, tripling the loss. The figures “over many requests” are exact long-run averages.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      With the steady AI the three designs come out about even, and the rule is the simplest. With the erratic one they
      pull apart. As a tool, its brilliant drafts are kept and its wrong ones cost only the minutes spent looking, so its
      variety becomes an advantage. As a gate, every wrong answer holds up the work behind it, while its best answers can
      only save what the process was built around.
    </p>
    <p>
      Anyone who has priced an option will recognise the shapes. A tool is a bought option: a small, known downside and a
      large upside. A gate is a sold option: the reverse. In the language of this story, a tool adds an
      <span class="tkc-or">OR</span> to the chain, and a gate adds an <span class="tkc-and">AND</span>.
    </p>
    <h3>AI agents have the same problem as approval chains</h3>
    <p>
      An AI agent that can call many tools and try another when one fails is built from ORs. An agent that must work
      through a fixed sequence of systems is built from ANDs, and the arithmetic from the opening applies: at 95% a step,
      a 20-step sequence gets everything right only about one time in three.
    </p>
    <p>
      The same remedies apply as in earlier chapters: one record for the AI to read, rather than many systems to fill in,
      and human reviews of the finished work, side by side, rather than a gate at every step.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Where would an AI step add a link to the chain, and where would it take one away?">
      <p>
        An AI project is easiest to judge by what it takes out of the chain: steps, fields and waits. As a gate it is safe
        only where its mistakes are small, visible and easy to undo.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .again {
    display: flex;
    align-items: end;
  }
  .note {
    font-weight: 400;
    fill: var(--tkc-muted);
  }
  .total {
    font-variant-numeric: tabular-nums;
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
</style>
