<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { REQUEST, schedule } from '../lib/sim/async.js';
  import { linear, barRight } from '../lib/scales.js';

  let faster = $state([]);
  let width = $state(560);

  const pieces = REQUEST.pieces;
  const seq = $derived(schedule(REQUEST, { mode: 'sequence', faster }));
  const par = $derived(schedule(REQUEST, { mode: 'parallel', faster }));
  const toggleFaster = (id) => (faster = faster.includes(id) ? faster.filter((f) => f !== id) : [...faster, id]);

  const num = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const amount = (v) => `${num(v)} day${v === 1 ? '' : 's'}`;
  const detail = (r) => (r.waiting ? `${num(r.waiting)} of them waiting for handoffs` : 'no waiting');

  // Two Gantt panels on one time scale.
  const narrow = $derived(width < 460);
  const labelW = $derived(narrow ? 92 : 124);
  const rowH = 22;
  const panelH = pieces.length * rowH + 30;
  const H = 2 * panelH + 30;
  const tMax = $derived(Math.max(seq.total, par.total) * 1.06);
  const x = $derived(linear(0, tMax, labelW, width - 10));
  const step = $derived(tMax > 10 ? 2 : 1);
  const tickVals = $derived(Array.from({ length: Math.floor(tMax / step) + 1 }, (_, i) => i * step));
  const panels = $derived([
    { id: 'sequence', title: 'One after another', run: seq, y0: 0 },
    { id: 'parallel', title: 'In parallel, meeting at the end', run: par, y0: panelH },
  ]);
  const label = (p) => (narrow ? p.label.replace('Credit analysis', 'Credit').replace('Legal documents', 'Legal docs') : p.label);

  const best = $derived(faster.length === 2 && faster.includes('credit') && faster.includes('es'));
  const puzzle = $derived({
    goal: 'With the work done in parallel, there is budget to make two pieces twice as fast. Which two cut the total time the most?',
    met: best,
    progress:
      faster.length > 2
        ? 'The budget covers two pieces, not more.'
        : faster.length === 2 && !best
          ? `With these two: ${amount(par.total)}. Another pair does better.`
          : `In parallel: ${amount(par.total)}.`,
    hints: ['In parallel, one piece sets the total. Which one?', 'Once the slowest piece is faster, another piece becomes the slowest.'],
    found: 'Credit analysis and the E&S review: five days instead of seven, because speeding up credit alone leaves the E&S review as the slowest piece.',
  });
  // Which piece is slowest stays unlabelled until the puzzle is done: finding it is the puzzle.
  const game = getContext('tkc-game');
  const revealed = $derived(!game.isOpen('async'));
  const showAnswer = () => (faster = ['credit', 'es']);
</script>

<Chapter
  n={5}
  kicker="Asynchronous work"
  title="Don’t wait for each other"
  lede="Much of the waiting in a long chain is for steps not needed yet. Take it out, and a different rule sets the pace."
  puzzle="async"
>
  {#snippet setup()}
    <p>Busy people are one source of waiting. The order of the work is another.</p>
    <p>
      Take a client request with five pieces of work: the client data, a credit analysis, an E&amp;S review, the legal
      documents and the pricing. Each is done by a specialist, and that is good complexity. Every piece is built on the
      client data, but none of the others needs another piece’s result.
    </p>
    <p>
      Done in lockstep, each piece still waits for the one before it and for someone to pick it up: a chain of conditions
      that nobody needed. Asynchronous work is the opposite. Everything that can start, starts, and the pieces come
      together once, at the end.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument rules={['Days of work: client data 1, credit 4, E&S review 3, legal 2, pricing 1.', 'Every handoff waits a day for someone to pick it up.', 'In parallel, the client data comes first; the other four then run side by side.']} title="One client request, two ways" sub="Each bar is one piece of work, in days.">
      <Puzzle id="async" {...puzzle} onshow={showAnswer} />

      <div class="speed" role="group" aria-label="Make a piece twice as fast">
        <span class="speed-label">Make a piece twice as fast:</span>
        {#each pieces as p (p.id)}
          <button type="button" class="chip" aria-pressed={faster.includes(p.id)} onclick={() => toggleFaster(p.id)}>{p.label}</button>
        {/each}
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label="One after another: {amount(seq.total)}. In parallel: {amount(par.total)}. Pieces: {pieces.map((p) => `${p.label}, ${amount(faster.includes(p.id) ? p.time / 2 : p.time)}`).join('; ')}.">
          {#each panels as panel (panel.id)}
            {@const top = panel.y0 + 22}
            <text class="tkc-label" x="0" y={panel.y0 + 14}>{panel.title}</text>
            <text class="tkc-label total" x={width - 10} y={panel.y0 + 14} text-anchor="end">{amount(panel.run.total)}</text>
            {#each pieces as p, r (p.id)}
              <text class="tkc-label-2" x="0" y={top + r * rowH + 15}>{label(p)}</text>
              <line class="tkc-grid" x1={labelW} x2={width - 10} y1={top + r * rowH + rowH - 1} y2={top + r * rowH + rowH - 1} />
            {/each}
            {#each panel.run.bars as b, i (i)}
              <path d={barRight(x(b.start), top + b.row * rowH + 4, Math.max(1.5, x(b.end) - x(b.start) - 1), rowH - 8, 3)} class="bar {b.kind}" />
            {/each}
            <line class="end" x1={x(panel.run.total)} x2={x(panel.run.total)} y1={top - 2} y2={top + pieces.length * rowH} />
            {#if panel.id === 'parallel' && !narrow && revealed}
              {#each panel.run.slowestAll as id (id)}
                {@const sp = pieces.findIndex((p) => p.id === id)}
                {@const sb = panel.run.bars.filter((b) => b.row === sp).reduce((a, b) => (b.end > a.end ? b : a), { end: 0 })}
                {#if sb.end > 0 && x(sb.end) + 150 < width}<text class="tkc-axis-label tkc-halo" x={x(sb.end) + 6} y={top + sp * rowH + 15}>{panel.run.slowestAll.length > 1 ? 'tied slowest' : 'slowest: sets the pace'}</text>{/if}
              {/each}
            {/if}
          {/each}
          {#each tickVals as t}
            <text class="tkc-axis-label" x={x(t)} y={H - 6} text-anchor="middle">{t}</text>
          {/each}
          <text class="tkc-axis-label" x="0" y={H - 6}>days</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-work"></span>Work</span>
          <span><span class="tkc-swatch sw-wait"></span>Waiting for a handoff</span>
        </div>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat label="One after another" value={amount(seq.total)} sub={detail(seq)} />
        <Stat label="In parallel" value={amount(par.total)} sub={revealed ? `${detail(par)}; ${par.slowestAll.length > 1 ? 'tied slowest' : 'slowest piece'}: ${par.slowestAll.map((id) => pieces.find((p) => p.id === id)?.label.toLowerCase()).join(' and ')}` : detail(par)} />
      </div>

      {#snippet model()}
        <p>Each piece takes a fixed time. One after another, every piece after the first waits a day for a handoff before someone picks it up, and the last one waits a day to be delivered. In parallel, the client data comes first, because every other piece is built on it; the other four start together after one handoff and wait once more to be brought together.</p>
        <p>A mistake in the client data found only at the end means the data is fixed and everything built on it is done again. Caught at the start, it costs a check of half a day before any other work begins.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      One after another, the client request takes sixteen days, five of them spent waiting for handoffs, and every
      speed-up helps a little. In parallel, only the slowest piece matters, along with anything every piece waits for,
      such as the client data. Making any other piece faster changes nothing. Improving a part is not the same as
      improving the whole, as the fast track shows.
    </p>
    <p>
      A Formula 1 pit stop works the parallel way. About twenty people change four tyres in around two seconds, each
      doing one task at the same moment. Nobody hands over to anybody, and the car leaves when the last wheel is on.
    </p>
    <h3>What decides the pace</h3>
    <ul>
      <li>
        <strong>The slowest piece sets the pace.</strong> Effort spent anywhere else changes little: with credit and
        the E&amp;S review both twice as fast, credit and the legal documents tie at two days. And real work varies: the
        more pieces run side by side, the more likely one of them is late, and that one sets the date.
      </li>
      <li>
        <strong>Bad inputs are cheapest to stop at the start.</strong> Quality engineers call this the 1-10-100 rule: a
        problem that costs 1 to prevent at entry costs 10 to correct later and 100 if it reaches the client. A mistake in
        the client data, found only at the end, means doing the work twice: the lockstep chain goes back to the start,
        and sixteen days become thirty-two. In parallel work it spoils every piece at once. Caught as the data comes in,
        it costs a check of half a day.
      </li>
    </ul>
    <p>
      Parallel work needs pieces that do not depend on each other. Often a step waits not for another step’s result
      but for data held in another system, and reading the data where it lives, as in the linked-systems chapter,
      removes that wait.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which steps wait for a step they do not actually need, and where are bad inputs found late?">
      <p>
        Often many steps need only the client data, not each other’s results, and could all start on the first day: a
        credit paper, an E&amp;S screening and the first legal drafts can all begin from the same verified client file.
        A mistake in that file, found late, comes back to every one of them.
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
    padding: 14px;
    border-radius: 10px;
    background: var(--tkc-page);
    border: 1px solid var(--tkc-hair);
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
</style>
