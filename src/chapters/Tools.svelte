<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { DESIGNS, averagePayoff, density, MEAN_HELP } from '../lib/sim/convexity.js';
  import { linear, line } from '../lib/scales.js';
  import { getContext } from 'svelte';

  const clipId = `${getContext('tkc-id') ?? 'tkc'}-payoff-clip`;
  // A prediction: the slider opens after the first answer or a hint.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('tools'));

  let spread = $state(1.5);
  let width = $state(560);
  let hover = $state(null);

  const COLORS = { tool: 'var(--tkc-options)', rule: 'var(--tkc-ink-2)', gate: 'var(--tkc-conditions)' };
  const averages = $derived(DESIGNS.map((d) => ({ ...d, avg: averagePayoff(d, spread) })));

  // Payoff chart: what each design gives you for a given answer.
  const H = 230;
  const m = { top: 16, right: 64, bottom: 36, left: 44 };
  const X0 = -3;
  const X1 = 3;
  const x = $derived(linear(X0, X1, m.left, width - m.right));
  const y = linear(-4, 3, H - m.bottom, m.top);
  const xs = Array.from({ length: 241 }, (_, i) => X0 + (i * (X1 - X0)) / 240);
  const paths = $derived(DESIGNS.map((d) => ({ ...d, path: line(xs.map((v) => [x(v), y(d.payoff(v))])) })));

  // Distribution strip with the same x axis.
  const DH = 64;
  const peak = $derived(density(MEAN_HELP, Math.max(spread, 0.15)));
  const dy = $derived(linear(0, peak * 1.05, DH - 16, 6));
  const area = $derived.by(() => {
    const s = Math.max(spread, 0.15);
    const pts = xs.map((v) => [x(v), dy(density(v, s))]);
    return `${line(pts)}L${x(X1).toFixed(1)} ${dy(0).toFixed(1)}L${x(X0).toFixed(1)} ${dy(0).toFixed(1)}Z`;
  });

  const fmtH = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)} h`;

  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const v = x.invert(e.clientX - box.left + m.left);
    hover = Math.max(X0, Math.min(X1, Math.round(v * 10) / 10));
  }

  const puzzle = {
    goal: 'The AI keeps saving 30 minutes per task on average, but becomes more erratic: bigger wins, bigger mistakes. What happens to the time a tool saves?',
    choices: [
      { value: 'falls', label: 'It falls: an erratic AI is worth less' },
      { value: 'same', label: 'It stays the same: the average has not changed' },
      { value: 'rises', label: 'It rises' },
    ],
    answer: 'rises',
    wrong: (v) => (v === 'falls' ? 'That is what happens to the gate. Move the slider and watch the tool.' : 'Only the rule stays the same. Move the slider and compare.'),
    hints: ['What does a tool cost you on the AI’s worst day?', 'A person keeps the good drafts and drops the bad ones. What does a wilder AI add?'],
    found: 'It rises. People keep the good drafts and drop the bad ones, so more variety brings bigger wins and no bigger losses. Built in as a gate, the same erratic AI does the opposite.',
  };
</script>

<Chapter
  n={7}
  kicker="AI and tools"
  title="Tool, rule or gate?"
  lede="The same AI can remove a dozen screens, or become the thirteenth. It depends on where it sits in the chain."
  puzzle="tools"
>
  {#snippet setup()}
    <p>
      Every specialist team that builds a system also builds a screen. Serving one client can mean a dozen logins, a
      dozen forms and a dozen versions of the client’s name. People call it UI fatigue, and every new system adds to it.
      The computer scientist Larry Tesler, who helped invent cut-and-paste, put the underlying rule simply: every task
      has some complexity that cannot be removed, only moved. Either the system carries it, or the person at the screen
      does.
    </p>
    <p>
      AI can work in the opposite direction. Modern AI models can use software tools: they can read a request written
      in plain language, fill in the systems behind it, and show a person what they did. Used that way, the systems
      become the AI’s tools, and the banker deals with one conversation instead of a dozen screens. Added as one more
      step, it is just one more screen.
    </p>
    <p>
      Below, an AI fills in the entries for a client request. On average it saves half an hour, but some drafts save a
      lot and some are wrong and cost time. There are three ways to build it into the work.
    </p>
    <ul>
      <li><strong>A tool:</strong> the AI drafts the entries and a person keeps what is right.</li>
      <li><strong>A rule:</strong> its entries go in as they are.</li>
      <li><strong>A gate:</strong> every request must pass the AI step before it can continue. When it works it saves a little; when it is wrong, the work behind it waits too.</li>
    </ul>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Same AI, three ways to use it" sub="Hours saved per request. The AI saves 30 minutes on average; how much that varies is up to you.">
      <Puzzle id="tools" {...puzzle} predict onshow={() => (spread = 2.5)} />
      <div class="tkc-controls tkc-controls--wide" class:tkc-wait={!live} inert={live ? undefined : true}>
        <Slider id="t-spread" label="How much the AI’s usefulness varies from task to task" bind:value={spread} min={0} max={2.5} step={0.1} format={(v) => `±${v.toFixed(1)} hours`} ends={['Steady', 'Erratic']} />
      </div>

      <div class="tkc-stats tkc-stats--3" use:announce>
        {#each averages as d (d.id)}
          <Stat label="{d.label}: average" value={fmtH(d.avg)} sub="per task" swatch={COLORS[d.id]} line={true} />
        {/each}
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <div class="tkc-fig-title small">Hours saved, from a bad draft (left) to a good one (right)</div>
        <svg {width} height={H} role="img" aria-label="Payoff lines: the tool never goes much below zero, the rule follows the answer, the gate is capped above and steep below.">
          {#each [-4, -2, 0, 2] as t}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={m.left - 6} y={y(t) + 4} text-anchor="end">{t > 0 ? '+' : ''}{t} h</text>
          {/each}
          <line class="tkc-grid" x1={x(0)} x2={x(0)} y1={m.top} y2={H - m.bottom} />
          <defs><clipPath id={clipId}><rect x={m.left} y={m.top - 4} width={Math.max(0, width - m.left - m.right)} height={H - m.top - m.bottom + 8} /></clipPath></defs>
          <g clip-path="url(#{clipId})">
            <!-- The tool is drawn last: where it runs along the rule, its blue stays visible. -->
            {#each [...paths].reverse() as p (p.id)}
              <path d={p.path} class="cv" style:stroke={COLORS[p.id]} />
            {/each}
          </g>
          <text class="tkc-label-2" x={width - m.right + 6} y={y(DESIGNS[0].payoff(X1)) + 4}>Tool</text>
          <text class="tkc-label-2 tkc-halo" x={x(-2.6)} y={y(-2.6) - 10}>Rule</text>
          <text class="tkc-label-2" x={width - m.right + 6} y={y(DESIGNS[2].payoff(X1)) + 4}>Gate</text>
          {#each [-3, -2, -1, 0, 1, 2, 3] as t}
            <text class="tkc-axis-label" x={x(t)} y={H - m.bottom + 16} text-anchor="middle">{t > 0 ? '+' : ''}{t}</text>
          {/each}
          <text class="tkc-axis-title" x={m.left + (width - m.left - m.right) / 2} y={H - 4} text-anchor="middle">{width < 380 ? 'How good the AI’s draft is (hours)' : 'How good the AI’s draft is (hours it could save)'}</text>
          {#if hover !== null}
            <line class="cross" x1={x(hover)} x2={x(hover)} y1={m.top} y2={H - m.bottom} />
          {/if}
          <rect x={m.left} y={m.top} width={Math.max(0, width - m.left - m.right)} height={H - m.top - m.bottom} fill="transparent" role="presentation" onpointermove={onMove} onpointerleave={() => (hover = null)} />
        </svg>
        {#if hover !== null}
          <div class="tkc-tip" style:left="{Math.min(width - 200, Math.max(0, x(hover) + 10))}px" style:top="20px">
            <div>An answer worth {hover > 0 ? '+' : ''}{hover.toFixed(1)} h</div>
            {#each DESIGNS as d (d.id)}
              <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background={COLORS[d.id]}></span><strong>{fmtH(d.payoff(hover))}</strong> {d.short.toLowerCase()}</div>
            {/each}
          </div>
        {/if}
        <svg {width} height={DH} role="img" aria-label="How often each answer happens: a bell curve centred on +0.5 hours, wider when the AI is more erratic.">
          <path d={area} class="dist" />
          <line class="tkc-base" x1={m.left} x2={width - m.right} y1={dy(0)} y2={dy(0)} />
          <text class="tkc-axis-label" x={m.left} y={DH - 2}>How often each answer happens</text>
        </svg>
        <div class="tkc-legend">
          {#each DESIGNS as d (d.id)}
            <span><span class="tkc-swatch tkc-swatch--line" style:background={COLORS[d.id]}></span>{d.label}</span>
          {/each}
        </div>
      </div>

      {#snippet model()}
        <p>On each task the AI’s answer is worth X hours, drawn from a normal distribution with an average of +0.5 hours and the spread you choose. A tool costs six minutes to look at and is used only when it helps: max(X, 0) − 0.1. A rule always uses the answer: X. A gate saves at most the half hour the process was designed around, and when it is wrong the work behind it waits as well, tripling the loss.</p>
        <p>The averages are exact expectations over that distribution.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      With a steady AI, all three designs do about the same. As the AI gets more erratic, which it often is, they pull
      apart: the tool climbs, the rule stays put and the gate sinks below zero. Every bad answer stops the work behind
      the gate, while its good answers can only save what the process was built around.
    </p>
    <p>
      Anyone who has priced an option will recognise the shapes. A tool is a bought option: a small, known downside
      and a large upside, so variability helps it. A gate is a sold option: the reverse.
    </p>
    <h3>AI agents have the same problem as approval chains</h3>
    <p>
      An AI agent that can call many tools and try another when one fails is built from ORs. An agent that must fill in
      a fixed sequence of screens is built from ANDs, and the arithmetic from the opening applies: at 95% a step, a
      20-step sequence gets everything right only about one time in three.
    </p>
    <p>
      The fixes are the ones from earlier chapters: one shared record for the AI to read instead of a dozen screens to
      fill in, and human reviews of the finished work, side by side, instead of a gate at every step.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="How many screens does it take to serve one client, and which AI initiatives would remove one?">
      <p>
        Judge each AI initiative by the screens, fields and waits it removes. Make it a gate only where its mistakes are small, visible and easy to undo, and keep a manual
        route for the day it fails.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .small {
    font-size: 0.9375rem;
  }
  .cv {
    fill: none;
    stroke-width: 2.5;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .cross {
    stroke: var(--tkc-muted);
    stroke-width: 1;
  }
  .dist {
    fill: var(--tkc-sunken);
    stroke: var(--tkc-muted);
    stroke-width: 1.5;
  }
</style>
