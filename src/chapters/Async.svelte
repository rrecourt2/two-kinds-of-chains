<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { EXAMPLES, schedule } from '../lib/sim/async.js';
  import { linear, barRight } from '../lib/scales.js';

  let exampleId = $state('breakfast');
  let handoff = $state(EXAMPLES.breakfast.handoff);
  let mistake = $state('none');
  let faster = $state([]);
  let width = $state(560);

  const ex = $derived(EXAMPLES[exampleId]);
  const seq = $derived(schedule(ex, { mode: 'sequence', handoff, faster, mistake }));
  const par = $derived(schedule(ex, { mode: 'parallel', handoff, faster, mistake }));

  function setExample(id) {
    exampleId = id;
    handoff = EXAMPLES[id].handoff;
    mistake = 'none';
    faster = [];
  }
  const toggleFaster = (id) => (faster = faster.includes(id) ? faster.filter((f) => f !== id) : [...faster, id]);

  const num = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const amount = (v) => `${num(v)} ${v === 1 ? ex.unit.replace(/s$/, '') : ex.unit}`;
  const detail = (r) => (r.rework ? `${num(r.rework)} of them redoing work` : r.waiting ? `${num(r.waiting)} of them waiting for handoffs` : 'no waiting');

  // Two Gantt panels on one time scale.
  const narrow = $derived(width < 460);
  const labelW = $derived(narrow ? 92 : 124);
  const rowH = 22;
  const panelH = $derived(ex.pieces.length * rowH + 30);
  const H = $derived(2 * panelH + 30);
  const tMax = $derived(Math.max(seq.total, par.total) * 1.06);
  const x = $derived(linear(0, tMax, labelW, width - 10));
  const step = $derived(tMax > 24 ? 4 : tMax > 10 ? 2 : 1);
  const tickVals = $derived(Array.from({ length: Math.floor(tMax / step) + 1 }, (_, i) => i * step));
  const panels = $derived([
    { id: 'sequence', title: 'One after another', run: seq, y0: 0 },
    { id: 'parallel', title: 'In parallel, meeting at the end', run: par, y0: panelH },
  ]);
  const label = (p) => (narrow ? p.label.replace('Credit analysis', 'Credit').replace('Legal documents', 'Legal docs') : p.label);

  const onRequest = $derived(exampleId === 'request');
  const fair = $derived(onRequest && handoff === EXAMPLES.request.handoff && mistake === 'none');
  const puzzle = $derived({
    goal: 'In the client request, done in parallel, you can afford to make two pieces twice as fast. Which two cut the total time the most?',
    met: fair && faster.length === 2 && faster.includes('credit') && faster.includes('es'),
    progress: !onRequest
      ? 'Switch the example to the client request to begin.'
      : !fair
        ? 'Keep one day at each handoff and no mistakes, so only the speed-ups change.'
        : faster.length > 2
          ? 'The budget covers two pieces, not more.'
          : faster.length === 2 && !(faster.includes('credit') && faster.includes('es'))
            ? `With these two: ${amount(par.total)}. Another pair does better.`
            : `In parallel: ${amount(par.total)}.`,
    hints: ['In parallel, one piece sets the total. Which one?', 'Once you speed up the slowest piece, another piece becomes the slowest.'],
    found: 'Credit analysis and the E&S review: five days instead of seven. Speed up credit alone and the E&S review takes over as the slowest piece. Faster legal documents or pricing change nothing at all.',
  });
  // Which piece is slowest stays unlabelled until the puzzle is done: finding it is the puzzle.
  const game = getContext('tkc-game');
  const revealed = $derived(!game.isOpen('async'));
  const showAnswer = () => {
    setExample('request');
    faster = ['credit', 'es'];
  };
</script>

<Chapter
  n={5}
  kicker="Asynchronous work"
  title="Don’t wait for each other"
  lede="Much of the waiting in a long chain is for steps that are not needed yet. Take it out, and a different rule decides how fast the work goes."
  puzzle="async"
>
  {#snippet setup()}
    <p>Busy people are one source of waiting. The order of the work is another.</p>
    <p>
      Andrew Grove, who ran Intel, taught management with a breakfast: a boiled egg, toast and coffee, all ready at the
      same moment. A good cook does not boil the egg, then make the toast, then the coffee. They start everything that
      can start, and the pieces come together once, at the end.
    </p>
    <p>
      That is asynchronous work. Nobody waits for anybody, and no piece waits for a step it does not need. Its opposite
      is work in lockstep, where each step waits for the one before it and for someone to pick it up.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="The same work, two ways" sub="Each bar is one piece of work. Change the example, the waits and the mistakes, or speed a piece up.">
      <Puzzle id="async" {...puzzle} onshow={showAnswer} />
      <div class="tkc-controls">
        <Segmented
          name="a-ex"
          label="Example"
          value={exampleId}
          options={[
            { value: 'breakfast', label: 'Breakfast' },
            { value: 'request', label: 'A client request' },
          ]}
          onchange={setExample}
        />
        <Segmented
          name="a-mistake"
          label={ex.mistake}
          bind:value={mistake}
          options={[
            { value: 'none', label: 'None' },
            { value: 'end', label: 'Found late' },
            { value: 'start', label: 'Caught early' },
          ]}
        />
        {#if exampleId === 'request'}
          <Slider id="a-handoff" label="Wait at each handoff" bind:value={handoff} min={0} max={3} format={(v) => (v === 0 ? 'none' : `${v} day${v > 1 ? 's' : ''}`)} />
        {/if}
      </div>

      <div class="speed" role="group" aria-label="Make a piece twice as fast">
        <span class="speed-label">Make a piece twice as fast:</span>
        {#each ex.pieces as p (p.id)}
          <button type="button" class="chip" aria-pressed={faster.includes(p.id)} onclick={() => toggleFaster(p.id)}>{p.label}</button>
        {/each}
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label="One after another: {amount(seq.total)}. In parallel: {amount(par.total)}.">
          {#each panels as panel (panel.id)}
            {@const top = panel.y0 + 22}
            <text class="tkc-label" x="0" y={panel.y0 + 14}>{panel.title}</text>
            <text class="tkc-label total" x={width - 10} y={panel.y0 + 14} text-anchor="end">{amount(panel.run.total)}</text>
            {#each ex.pieces as p, r (p.id)}
              <text class="tkc-label-2" x="0" y={top + r * rowH + 15}>{label(p)}</text>
              <line class="tkc-grid" x1={labelW} x2={width - 10} y1={top + r * rowH + rowH - 1} y2={top + r * rowH + rowH - 1} />
            {/each}
            {#each panel.run.bars as b, i (i)}
              <path d={barRight(x(b.start), top + b.row * rowH + 4, Math.max(1.5, x(b.end) - x(b.start) - 1), rowH - 8, 3)} class="bar {b.kind}" />
            {/each}
            <line class="end" x1={x(panel.run.total)} x2={x(panel.run.total)} y1={top - 2} y2={top + ex.pieces.length * rowH} />
            {#if panel.id === 'parallel' && !narrow && revealed}
              {@const sp = ex.pieces.findIndex((p) => p.id === panel.run.slowest)}
              {@const sb = panel.run.bars.filter((b) => b.row === sp).reduce((a, b) => (b.end > a.end ? b : a), { end: 0 })}
              {#if sb.end > 0 && x(sb.end) + 150 < width}<text class="tkc-axis-label tkc-halo" x={x(sb.end) + 6} y={top + sp * rowH + 15}>slowest: sets the pace</text>{/if}
            {/if}
          {/each}
          {#each tickVals as t}
            <text class="tkc-axis-label" x={x(t)} y={H - 6} text-anchor="middle">{t}</text>
          {/each}
          <text class="tkc-axis-label" x="0" y={H - 6}>{ex.unit}</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-work"></span>Work</span>
          {#if seq.waiting > 0}<span><span class="tkc-swatch sw-wait"></span>Waiting for a handoff</span>{/if}
          {#if mistake === 'end'}<span><span class="tkc-swatch sw-redo"></span>Redoing work</span>{/if}
          {#if mistake === 'start'}<span><span class="tkc-swatch sw-check"></span>Checking the input first</span>{/if}
        </div>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat label="One after another" value={amount(seq.total)} sub={detail(seq)} />
        <Stat label="In parallel" value={amount(par.total)} sub={revealed ? `${detail(par)}; slowest piece: ${ex.pieces.find((p) => p.id === par.slowest)?.label.toLowerCase()}` : detail(par)} />
      </div>

      {#snippet model()}
        <p>Each piece takes a fixed time. One after another, every piece waits for a handoff before someone picks it up, and the last one waits to be delivered. In parallel, the pieces start together and wait once to be brought together. In the client request, every piece is built on the client data, so it comes first in both designs.</p>
        <p>A mistake found at the end means the first piece is fixed and everything built on it is done again. Caught at the start, it costs a short check before any other work begins.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      One after another, the client request takes sixteen days, five of them spent waiting for handoffs, and every
      speed-up helps a little. In parallel, only the slowest piece matters, along with anything every piece waits for,
      such as the client data. Making any other piece faster changes nothing. Improving a part is not the same as
      improving the whole, which is the subject of the next chapter.
    </p>
    <p>
      A Formula 1 pit stop works the parallel way. About twenty people change four tyres in around two seconds, each
      doing one task at the same moment. Nobody hands over to anybody, and the car leaves when the last wheel is on.
    </p>
    <h3>What Grove’s breakfast teaches</h3>
    <ul>
      <li>
        <strong>The slowest step sets the pace.</strong> Effort spent anywhere else changes little. And it moves: real
        work varies, so the slowest piece changes from one request to the next.
      </li>
      <li>
        <strong>Bad inputs are cheapest to stop at the start.</strong> Grove checked the egg before boiling it. Quality engineers call this the
        1-10-100 rule: a problem that costs 1 to prevent at entry costs 10 to correct later and 100 if it reaches the
        client. Found late, it means doing the work twice: one bad input sends the lockstep chain back to the start, and
        sixteen days become thirty-two. In parallel work it spoils every piece at once.
      </li>
      <li>
        <strong>A monitor can often do a gate’s job.</strong> A gate holds all work until it has been checked. A monitoring step checks samples while the work flows on, and checks less often while quality is
        good.
      </li>
      <li>
        <strong>Every measure has a counterpart.</strong> Speed counted alone invites errors, and volume alone invites
        lower quality. Counted in pairs, neither can quietly improve at the other’s expense.
      </li>
    </ul>
    <p>
      Parallel work needs pieces that do not depend on each other. Often a step waits not for another step’s result
      but for data held in another system, and reading the data where it lives (chapter 3) removes that wait.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which steps wait for a step they do not actually need, and where are bad inputs found late?">
      <p>
        Often many steps need only the client data, not each other’s results, and could all start on the first
        day.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .speed {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
  }
  .speed-label {
    font-size: 0.875rem;
    font-weight: 600;
    margin-right: 2px;
  }
  .chip {
    min-height: 32px;
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid var(--tkc-rule);
    background: var(--tkc-surface);
    color: var(--tkc-ink);
    font-size: 0.875rem;
    cursor: pointer;
  }
  .chip[aria-pressed='true'] {
    background: var(--tkc-options-wash);
    border-color: var(--tkc-options);
    color: var(--tkc-options-ink);
    font-weight: 600;
  }
  .chip[aria-pressed='true']::before {
    content: '×2 ';
    content: '×2 ' / '';
  }
  .chip:focus-visible {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 2px;
  }
  .total {
    font-weight: 700;
  }
  .bar.work {
    fill: var(--tkc-ink-2);
  }
  .bar.wait {
    fill: var(--tkc-rule);
    stroke: var(--tkc-ink-2);
    stroke-dasharray: 3 2;
  }
  .bar.redo {
    fill: var(--tkc-conditions);
  }
  .bar.check {
    fill: var(--tkc-options);
  }
  .end {
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
  }
  .sw-work {
    background: var(--tkc-ink-2);
  }
  .sw-wait {
    background: var(--tkc-rule);
    border: 1px dashed var(--tkc-ink-2);
  }
  .sw-redo {
    background: var(--tkc-conditions);
  }
  .sw-check {
    background: var(--tkc-options);
  }
</style>
