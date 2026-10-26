<script>
  import { getContext, onMount } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { MEMORIES, YEARS, COSTS, HISTORIES, LIMITS, costs, best, checks, figureRuns, chapterReady, chapterStep } from '../lib/sim/pace.js';
  import { linear, barUp } from '../lib/scales.js';
  import { int } from '../lib/format.js';

  // "Idle cushion costs" opens once the puzzle is solved or its answer shown.
  const game = getContext('tkc-game');
  const revealed = $derived(!game.isOpen('pace'));

  const at = (m) => MEMORIES.indexOf(m);
  const ANSWER = at(6);
  let stop = $state(0); // a one-year memory: the cushion is last year's losses
  let cost = $state('some');
  let width = $state(560);

  // The figure's one history at every memory (quick), and the averages over 3,000 histories, worked out in short
  // steps the first time the chapter opens; a later visit or a reset finds them ready.
  const runs = figureRuns();
  let rows = $state.raw(chapterReady());
  onMount(() => {
    if (rows) return;
    let timer = 0;
    const step = () => {
      const done = chapterStep();
      if (done) rows = done;
      else timer = setTimeout(step, 0);
    };
    timer = setTimeout(step, 0);
    return () => clearTimeout(timer);
  });

  const carry = $derived(revealed ? COSTS[cost] : COSTS.some);
  const run = $derived(runs[stop]);
  const avg = $derived(rows ? costs(rows[stop], carry) : null);
  const all = $derived(rows ? rows.map((r) => costs(r, carry)) : null);
  const top = $derived(rows ? best(rows, carry) : null);

  // ---- Words and numbers, all from the model ----
  const pc = (v) => `${Math.round(v)}%`;
  const years = (m) => `${m} year${m === 1 ? '' : 's'}`;
  const T = $derived.by(() => {
    if (!rows) return null;
    const one = costs(rows[0], COSTS.some);
    const six = costs(rows[ANSWER], COSTS.some);
    const fifty = costs(rows[at(50)], COSTS.some);
    const ok = MEMORIES.filter((m) => {
      const c = checks(costs(rows[at(m)], COSTS.some));
      return c.through && c.held;
    });
    return {
      one,
      six,
      fifty,
      from: ok[0],
      to: ok.at(-1),
      little: best(rows, COSTS.little).memory,
      some: best(rows, COSTS.some).memory,
      lot: best(rows, COSTS.lot).memory,
    };
  });
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const TENS = { 15: 'fifteen', 20: 'twenty', 30: 'thirty', 50: 'fifty' };
  const word = (n) => WORDS[n] ?? TENS[n] ?? String(n);
  const Word = (n) => word(n).charAt(0).toUpperCase() + word(n).slice(1);

  const rules = [
    'One year in twenty is a crisis, with four times a normal year’s losses.',
    'The cushion covers the worst year remembered; memory fades a little each year.',
    'Each year the cushion holds back lending worth a tenth of it.',
  ];

  // ---- Puzzle: judged on the averages, at the whole percent the tiles show ----
  const now = $derived(avg ? checks(avg) : { through: false, held: false });
  const puzzle = $derived({
    goal: `Keep losses beyond the cushion within ${LIMITS.through}% of the book over 60 years, and lending held back within ${LIMITS.held}%.`,
    met: !!avg && now.through && now.held,
    checks: [
      { label: `Losses beyond the cushion within ${LIMITS.through}%${avg ? ` (now ${pc(avg.through)})` : ''}`, ok: now.through },
      { label: `Lending held back within ${LIMITS.held}%${avg ? ` (now ${pc(avg.held)})` : ''}`, ok: now.held },
    ],
    progress: !avg ? '' : !now.through ? 'Each crisis finds a cushion sized to the calm years before it.' : !now.held ? 'The cushion stays up through decades of calm, waiting for the next crisis.' : '',
    hints: [
      'With a one-year memory, the cushion is last year’s losses. What happens in a crisis year?',
      'Each year of memory stops more losses and holds more lending back. Both limits hold only in a stretch in between.',
    ],
    found: T
      ? `${Word(T.from)} to ${word(T.to)} years: at six, ${pc(T.six.through)} gets through and ${pc(T.six.held)} is held back, against ${pc(T.one.through)} and ${pc(T.one.held)} at one year.`
      : 'Four to ten years.',
  });
  const showAnswer = () => ((stop = ANSWER), (cost = 'some'));

  // ---- The chart: sixty years of losses as bars, the cushion as a step line ----
  const H = 266;
  const m = { top: 24, right: 6, bottom: 38, left: 34 };
  const YMAX = 12;
  const span = $derived(Math.max(width, 200));
  const narrow = $derived(span < 440);
  const band = $derived((span - m.left - m.right) / YEARS);
  const xl = (year) => m.left + (year - 1) * band; // a year's left edge
  const xc = (year) => xl(year) + band / 2;
  const y = linear(0, YMAX, H - m.bottom, m.top);
  const yTicks = [0, 4, 8, 12];
  const xTicks = $derived(narrow ? [1, 20, 40, 60] : [1, 10, 20, 30, 40, 50, 60]);
  const bw = $derived(Math.max(2, band * 0.66));

  const step = $derived.by(() => {
    let d = '';
    run.path.forEach((p, i) => {
      const yy = y(p.cushion).toFixed(1);
      d += i === 0 ? `M${xl(1).toFixed(1)} ${yy}` : `V${yy}`;
      d += `H${(xl(p.year) + band).toFixed(1)}`;
    });
    return d;
  });
  const area = $derived(`${step}V${y(0)}H${xl(1)}Z`);
  const bars = $derived(
    run.path.map((p) => {
      const x0 = xc(p.year) - bw / 2;
      const under = Math.min(p.loss, p.cushion);
      const r = Math.min(2, bw / 2);
      return {
        year: p.year,
        // Below the cushion: rounded on top unless the loss goes beyond it.
        under: p.beyond > 0 ? `M${x0} ${y(0)}V${y(under)}H${x0 + bw}V${y(0)}Z` : barUp(x0, y(p.loss), bw, y(0) - y(p.loss), r),
        beyond: p.beyond > 0 ? barUp(x0, y(p.loss), bw, y(p.cushion) - y(p.loss), r) : '',
      };
    }),
  );
  const crises = $derived(run.path.filter((p) => p.crisis));
  const describe = $derived(
    `Sixty years of losses in one country, as a share of the loan book: about 1 to 4% in a normal year, 9 to 10% in the crises of years ${crises.map((p) => p.year).join(' and ')}. ` +
      `Remembering ${years(MEMORIES[stop])}, the cushion falls short in ${run.broken} of the 60 years of this history.`,
  );

  // ---- Across all histories (once the puzzle is closed): both costs for every memory ----
  const CH = 182;
  const cm = { top: 26, right: 6, bottom: 38, left: 34 };
  const CMAX = 80;
  const cband = $derived((span - cm.left - cm.right) / MEMORIES.length);
  const cx = (i) => cm.left + i * cband;
  const cy = linear(0, CMAX, CH - cm.bottom, cm.top);
  const cbw = $derived(Math.min(30, cband * 0.7));
  const cLabels = $derived(cband >= 22 ? MEMORIES : [1, 3, 6, 10, 20, 50]);
  const cols = $derived(
    (all ?? []).map((c, i) => {
      const x0 = cx(i) + (cband - cbw) / 2;
      return {
        i,
        memory: c.memory,
        x0,
        mid: x0 + cbw / 2,
        through: `M${x0} ${cy(0)}V${cy(c.through)}H${x0 + cbw}V${cy(0)}Z`,
        held: barUp(x0, cy(c.through + c.held), cbw, cy(c.through) - cy(c.through + c.held), 3),
        top: cy(c.total),
      };
    }),
  );
  const bestCol = $derived(top ? cols[at(top.memory)] : null);
  const costWord = $derived(cost === 'little' ? 'little' : cost === 'lot' ? 'a lot' : 'some');
  // How lending held back is worked out, on its tile: the share of the cushion, each year, for 60 years.
  const SHARE = { little: 'a twentieth', some: 'a tenth', lot: 'three twentieths' };
  const share = $derived(SHARE[revealed ? cost : 'some']);
</script>

<Chapter
  n={22}
  kicker="Antifragility"
  title="How fast to forget"
  lede="After a crisis, every lender adds links to its chain. The hard part is deciding when to take them off."
  puzzle="pace"
>
  {#snippet setup()}
    <p>Some systems come out of a shock stronger. After an infection the body lets most of the cells that fought it go and keeps a few for years: enough to remember, with room left for the next one.</p>
    <p>
      A lender learns from losses the same way. After a bad year in a country, it adds links to its chain: a bigger
      cushion, a lower limit, a
      second look at each new loan. Each calm year it takes a little back, because an idle cushion is lending the
      country does not get.
    </p>
    <p>
      The question is how fast that memory should fade. Below, one country over sixty years, with a cushion sized to the
      worst year the lender remembers.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Sixty years in one country" sub="Each bar is one year’s losses; the outline is the cushion held. The tiles average {int(HISTORIES)} histories like this." {rules}>
      <Puzzle id="pace" {...puzzle} onshow={showAnswer} />

      <div class="tkc-controls">
        <Slider id="p-memory" label="Bank remembers" bind:value={stop} min={0} max={MEMORIES.length - 1} format={(i) => years(MEMORIES[i])} ends={['Forgets fast', 'Never forgets']} />
        {#if revealed}
          <div class="ctl">
            <Segmented
              name="p-cost"
              label="Idle cushion costs"
              bind:value={cost}
              options={[
                { value: 'little', label: 'Little' },
                { value: 'some', label: 'Some' },
                { value: 'lot', label: 'A lot' },
              ]}
            />
            <p class="tkc-caption">Each year, lending held back worth 5%, 10% or 15% of the cushion.</p>
          </div>
        {/if}
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={span} height={H} role="img" aria-label={describe}>
          <text class="tkc-axis-title" x="0" y="12">% of the book</text>
          {#each yTicks as t (t)}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={m.left} x2={span - m.right} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={m.left - 6} y={y(t) + 4} text-anchor="end">{t}%</text>
          {/each}
          <path class="held" d={area} />
          {#each bars as b (b.year)}
            <path class="loss" d={b.under} />
            {#if b.beyond}<path class="beyond" d={b.beyond} />{/if}
          {/each}
          <path class="cushion" d={step} />
          {#each crises as p (p.year)}
            <text class="tkc-label-2 tkc-halo" x={xc(p.year)} y={y(Math.max(p.loss, p.cushion)) - 7} text-anchor="middle">Crisis</text>
          {/each}
          {#each xTicks as t (t)}
            <text class="tkc-axis-label" x={xc(t)} y={H - m.bottom + 15} text-anchor={t === 1 ? 'start' : t === YEARS ? 'end' : 'middle'}>{t}</text>
          {/each}
          <text class="tkc-axis-title" x={m.left + (span - m.left - m.right) / 2} y={H - 2} text-anchor="middle">Year</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-loss" aria-hidden="true"></span>Losses in a year</span>
          <span><span class="tkc-swatch sw-beyond" aria-hidden="true"></span>Beyond the cushion</span>
          <span><span class="tkc-swatch sw-cushion" aria-hidden="true"></span>Cushion held</span>
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat
          label="Losses beyond the cushion"
          value={avg ? pc(avg.through) : '…'}
          sub={avg ? `of the book over 60 years; short in ${Math.round(avg.broken)} of them` : 'averaging 3,000 histories'}
          swatch="var(--tkc-conditions)"
        />
        <Stat
          label="Lending held back"
          value={avg ? pc(avg.held) : '…'}
          sub={avg ? `of the book: ${YEARS} years of ${share} of a ${(rows[stop].cushion / YEARS).toFixed(1)}% cushion` : 'averaging 3,000 histories'}
          swatch="var(--pace-held-key)"
        />
      </div>

      {#if revealed && all}
        <div class="many">
          <span class="tkc-fig-title small">Across {int(HISTORIES)} histories</span>
          <svg width={span} height={CH} role="img" aria-label="Both costs for every memory, averaged over {int(HISTORIES)} histories, when an idle cushion costs {costWord}: {pc(all[0].total)} of the book at one year, {pc(all.at(-1).total)} at fifty, lowest at {years(top.memory)} with {pc(top.total)}.">
            <text class="tkc-axis-title" x="0" y="12">Both costs, % of the book</text>
            {#each [0, 40, 80] as t (t)}
              <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={cm.left} x2={span - cm.right} y1={cy(t)} y2={cy(t)} />
              <text class="tkc-axis-label" x={cm.left - 6} y={cy(t) + 4} text-anchor="end">{t}%</text>
            {/each}
            {#each cols as c (c.memory)}
              <path class="c-beyond" d={c.through} />
              <path class="c-held" d={c.held} />
              {#if c.i === stop}<rect class="mine" x={c.x0 - 2.5} y={c.top - 2.5} width={cbw + 5} height={cy(0) - c.top + 2.5} rx="4" />{/if}
              {#if cLabels.includes(c.memory)}
                <text class="tkc-axis-label" class:on={c.i === stop} x={c.mid} y={CH - cm.bottom + 15} text-anchor="middle">{c.memory}</text>
              {/if}
            {/each}
            {#if bestCol}
              <text class="lowest tkc-halo" x={Math.min(span - cm.right, Math.max(0, bestCol.mid))} y={bestCol.top - 8} text-anchor={bestCol.mid > span - 40 ? 'end' : bestCol.mid < 40 ? 'start' : 'middle'}>Lowest</text>
            {/if}
            <text class="tkc-axis-title" x={cm.left + (span - cm.left - cm.right) / 2} y={CH - 2} text-anchor="middle">Years remembered</text>
          </svg>
          <div class="tkc-legend">
            <span><span class="tkc-swatch sw-beyond" aria-hidden="true"></span>Beyond the cushion</span>
            <span><span class="tkc-swatch sw-held" aria-hidden="true"></span>Lending held back</span>
            <span><span class="tkc-swatch sw-mine" aria-hidden="true"></span>Your setting</span>
          </div>
        </div>
      {/if}

      {#snippet model()}
        <p>
          A normal year’s losses start at 2% of the country’s loan book and drift slowly, a random walk kept between 0.5%
          and 8%, with some noise each year; one year in twenty is a crisis with four times the losses. The cushion each
          year equals the worst year remembered. After the year, that memory moves a share 1/N of the way towards the year
          just seen, never below it, for a memory of N years: with one year, the cushion is last year’s losses. Lending held
          back is a tenth of the cushion each year (a twentieth or three twentieths under “Idle cushion costs”). Both costs
          are added up over 60 years, after 40 years to settle in, and averaged over {int(HISTORIES)} histories; the chart
          shows one of them.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    {#if T}
      <p>
        Forgetting fast, the lender sizes each year’s cushion to the year before. That looks prudent in the calm years, and
        every crisis arrives as a surprise: the cushion falls short in {Math.round(T.one.broken)} years of 60, and {pc(T.one.through)}
        of the book goes through it. Jack Guttentag and Richard Herring called this disaster myopia (1986): the longer
        since the last shock, the less likely the next one seems, and the thinner the cushion held against it.
      </p>
      <p>
        Never forgetting fails the other way. At fifty years the cushion hardly comes down between crises: only
        {pc(T.fifty.through)} gets through, but {pc(T.fifty.held)} of the book is held back. Every lesson stays on as a link,
        and, like the chain of <span class="tkc-and">ANDs</span> in the riddle, each one holds a little more back.
      </p>
      <p>
        In between, at about {word(T.some)} years, the two costs together are lowest. Losses raise the cushion and calm
        lowers it, but not so far that the next crisis finds it bare: a loop that steadies itself, like a thermostat. Biologists know the pattern as hormesis: a small dose of stress
        makes an organism stronger, and a large one harms it. Antifragility is a matter of dose: enough change to adapt, not so fast that the lesson is forgotten.
      </p>
      <h3>What sets the pace</h3>
      <p>
        The best pace depends on what an idle cushion costs. Where it costs little, about {word(T.little)} years of memory
        is best; where it costs a lot, about {word(T.lot)}. How fast the world drifts hardly matters: with no drift at all,
        or five times as much, the best stays at five or six years.
      </p>
      <p>
        A chain that learns adds links after a shock, and does not take them off as soon as the weather clears. Nor does
        it keep them all for ever. That is the last of the puzzles; what follows gathers what the chains have shown.
      </p>
    {:else}
      <p class="tkc-small">Averaging {int(HISTORIES)} histories…</p>
    {/if}
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which lessons from the last crisis are still in our limits, and which have faded in the calm years since?">
      <p>
        Capital rules set a minimum memory. A bank that estimates its own credit risk must base default rates on at least
        five years of history, and losses on loans to firms, banks and governments on at least seven, ideally a whole
        economic cycle. Country limits and provisions are usually reviewed each year, in the light of recent losses.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .tkc-chart,
  .many {
    --pace-held: color-mix(in srgb, var(--tkc-ink-2) 16%, var(--tkc-surface));
  }
  .tkc-stats {
    --pace-held-key: color-mix(in srgb, var(--tkc-ink-2) 30%, var(--tkc-surface));
  }
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ctl {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .held {
    fill: var(--pace-held);
  }
  .loss {
    fill: var(--tkc-ink-2);
    opacity: 0.55;
  }
  .beyond,
  .c-beyond {
    fill: var(--tkc-conditions);
  }
  .cushion {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .c-held {
    fill: color-mix(in srgb, var(--tkc-ink-2) 30%, var(--tkc-surface));
  }
  .mine {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
  }
  .tkc-axis-label.on {
    fill: var(--tkc-ink);
    font-weight: 700;
  }
  .lowest {
    fill: var(--tkc-options-ink);
    font-size: 12px;
    font-weight: 700;
  }
  .sw-loss {
    background: var(--tkc-ink-2);
    opacity: 0.55;
  }
  .sw-beyond {
    background: var(--tkc-conditions);
  }
  .sw-cushion {
    background: var(--pace-held);
    box-shadow: inset 0 2px 0 var(--tkc-ink);
    border-radius: 0;
  }
  .sw-held {
    background: color-mix(in srgb, var(--tkc-ink-2) 30%, var(--tkc-surface));
  }
  .sw-mine {
    background: none;
    box-shadow: inset 0 0 0 1.5px var(--tkc-ink);
  }
  .many {
    display: grid;
    gap: 6px;
    min-width: 0;
    padding-top: 10px;
    border-top: 1px solid var(--tkc-hair);
  }
  .many svg {
    display: block;
    overflow: visible;
  }
  .small {
    font-size: 0.9375rem;
  }
</style>
