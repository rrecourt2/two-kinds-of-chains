<script>
  import { getContext, untrack } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { MEMORIES, WORLDS, YEARS, COUNTRIES, LIMIT, HISTORIES, VALUE, PARAMS, rows, best, band, figure, countedOnce } from '../lib/sim/pace.js';
  import { linear, log10, barUp } from '../lib/scales.js';
  import { int } from '../lib/format.js';

  // "Countries change" opens once the puzzle is solved or its answer shown.
  const game = getContext('tkc-game');
  const revealed = $derived(!game.isOpen('pace'));

  let memory = $state(1); // forgets fast: each limit follows last year's losses
  let world = $state('sometimes');
  let width = $state(560);
  const here = $derived(revealed ? world : 'sometimes');

  // The memories tried so far: the cost chart fills in as the reader searches.
  let tried = $state([1]);
  $effect(() => {
    const m = memory;
    untrack(() => {
      if (!tried.includes(m)) tried = [...tried, m];
    });
  });

  const runs = $derived(figure(here));
  const run = $derived(runs[memory - 1]);
  const table = $derived(rows(here));
  const cur = $derived(table[memory - 1]);
  const low = $derived(best(table));

  // ---- Words and numbers, all from the model ----
  const SOME = rows('sometimes');
  const BAND = band(SOME);
  const ANSWER = best(SOME).memory;
  const ONE = SOME[0];
  const AT = SOME[ANSWER - 1];
  const LONG = SOME.at(-1);
  const RARE = best(rows('rarely')).memory;
  const ONCE = best(countedOnce(SOME)).memory; // the best memory if lending after a bad year counted once
  const OFTEN = best(rows('often')).memory;
  const usd = (v) => `$${v.toFixed(1)}m`;
  const years = (n) => `${n} year${n === 1 ? '' : 's'}`;
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const word = (n) => WORDS[n] ?? String(n);
  const Word = (n) => word(n).charAt(0).toUpperCase() + word(n).slice(1);
  const EVERY = { rarely: 'forty years', sometimes: 'ten', often: 'three' };

  const rules = [
    'A country’s risk doubles in a crisis and halves with a reform, now and then.',
    'One year in ten is a bad year that passes; lending just after counts double.',
    'The limit is full at 1% losses remembered, a third less per doubling.',
  ];

  // ---- Puzzle: in the world where countries change sometimes, a memory within 1% of the lowest total ----
  const inBand = $derived(BAND.includes(memory));
  const puzzle = $derived({
    goal: 'Countries change sometimes. Find the memory that keeps the total cost, losses plus good lending missed, at its lowest.',
    met: here === 'sometimes' && inBand,
    checks: [{ label: `Total cost at its lowest (now ${usd(SOME[memory - 1].total)} a year)`, ok: inBand }],
    progress:
      memory < BAND[0]
        ? `Each bad year still moves the limits: ${usd(SOME[memory - 1].afterBad)} a year of good lending is missed just after one.`
        : memory > BAND.at(-1)
          ? 'The limits trail real changes: the average still holds years from before a crisis or a reform.'
          : '',
    hints: [
      'Try short and long memories; the chart under the tiles keeps the total for each one you try.',
      'The total falls fast as the memory lengthens, then rises slowly. Look between four and ten years.',
    ],
    found: `${Word(BAND[0])} to ${word(BAND.at(-1))} years: at ${word(ANSWER)}, ${usd(AT.total)} a year in all, against ${usd(ONE.total)} remembering one year and ${usd(LONG.total)} remembering twenty.`,
  });
  const showAnswer = () => {
    memory = ANSWER;
    world = 'sometimes';
  };

  // ---- The country: risk and losses above (log scale), the limit below ----
  const m = { left: 40, right: 8 };
  const A = { top: 40, h: 128 };
  const B = { top: A.top + A.h + 38, h: 66 };
  const H = B.top + B.h + 36;
  const span = $derived(Math.max(width, 240));
  const narrow = $derived(span < 440);
  const bw = $derived((span - m.left - m.right) / YEARS);
  const xl = (year) => m.left + (year - 1) * bw;
  const ya = log10(0.5, 32, A.top + A.h, A.top);
  const yb = linear(0, 1, B.top + B.h, B.top);
  const clampA = (v) => Math.max(0.5, Math.min(32, v));
  const aTicks = [1, 2, 4, 8, 16];
  const xTicks = $derived(narrow ? [1, 20, 40] : [1, 10, 20, 30, 40]);

  const steps = (ys) => ys.map((v, i) => `${i === 0 ? `M${xl(1).toFixed(1)} ${v.toFixed(1)}` : `V${v.toFixed(1)}`}H${(xl(i + 1) + bw).toFixed(1)}`).join('');
  const riskLine = $derived(steps(run.path.map((p) => ya(p.risk))));
  const beliefLine = $derived(steps(run.path.map((p) => ya(clampA(p.belief)))));
  const heldLine = $derived(steps(run.path.map((p) => yb(p.held))));
  const rightLine = $derived(steps(run.path.map((p) => yb(p.right))));
  const gaps = $derived(
    run.path
      .filter((p) => Math.abs(p.held - p.right) > 0.004)
      .map((p) => ({ year: p.year, over: p.held > p.right, y: yb(Math.max(p.held, p.right)), h: Math.abs(yb(p.held) - yb(p.right)) })),
  );
  const dots = $derived(run.path.map((p) => ({ year: p.year, bad: p.bad, x: xl(p.year) + bw / 2, y: ya(clampA(p.loss)) })));

  // Crises and reforms, marked at the top; a change soon after another is part of the same story and goes unlabelled.
  const changes = $derived.by(() => {
    const out = [];
    let last = -Infinity;
    for (const p of run.path) {
      if (!p.change) continue;
      const x = xl(p.year);
      out.push({ year: p.year, x, label: here !== 'often' && x - last >= 52 ? (p.change > 0 ? 'Crisis' : 'Reform') : '' });
      if (out.at(-1).label) last = x;
    }
    return out;
  });
  // The first bad year in a calm spell (no change in the three years before or the year after), labelled.
  const calmBad = $derived.by(() => {
    const ch = run.path.filter((p) => p.change).map((p) => p.year);
    const p = run.path.find((q) => q.bad && q.risk <= 2 && !ch.some((c) => c >= q.year - 3 && c <= q.year + 1));
    return p ? dots[p.year - 1] : null;
  });

  const listYears = (ys) => (ys.length < 2 ? ys.join('') : `${ys.slice(0, -1).join(', ')} and ${ys.at(-1)}`);
  const describe = $derived.by(() => {
    const p = run.path;
    const moves = p.filter((q) => q.change).map((q) => `${q.change > 0 ? 'a crisis' : 'a reform'} in year ${q.year} (to ${q.risk}%)`);
    const over = p.filter((q) => q.held > q.right + 0.004).length;
    const under = p.filter((q) => q.right > q.held + 0.004).length;
    return (
      `One country over forty years. Its true risk starts at ${p[0].risk}% a year${moves.length ? `, with ${moves.join(', ')}` : ''}. ` +
      `Bad years: ${listYears(p.filter((q) => q.bad).map((q) => q.year))}. ` +
      `Remembering ${years(memory)}, the lender lends too much in ${over} of the 40 years and misses good lending in ${under}.`
    );
  });

  // ---- The total cost for each memory: the ones tried, then (once the puzzle is closed) all of them ----
  const CH = 176;
  const cm = { top: 24, right: 8, bottom: 36, left: 36 };
  const CMAX = 30;
  const cband = $derived((span - cm.left - cm.right) / MEMORIES.length);
  const cy = linear(0, CMAX, CH - cm.bottom, cm.top);
  const cbw = $derived(Math.min(22, cband * 0.7));
  const cLabels = $derived(cband >= 20 ? MEMORIES : [1, 5, 10, 15, 20]);
  const cols = $derived(
    table.map((r, i) => {
      const x0 = cm.left + i * cband + (cband - cbw) / 2;
      return {
        memory: r.memory,
        shown: revealed || tried.includes(r.memory),
        x0,
        mid: x0 + cbw / 2,
        losses: `M${x0} ${cy(0)}V${cy(r.losses)}H${x0 + cbw}V${cy(0)}Z`,
        missed: barUp(x0, cy(r.total), cbw, cy(r.losses) - cy(r.total), 3),
        top: cy(r.total),
      };
    }),
  );
  const lowCol = $derived(cols[low.memory - 1]);
</script>

<Chapter
  n={22}
  kicker="Country limits"
  title="How fast to forget"
  lede="Every loss teaches a lender something about a country. The hard part is deciding how long to remember it."
  puzzle="pace"
>
  {#snippet setup()}
    <p>
      After an infection the body lets most of the cells that fought it go and keeps a few for years: enough to know
      the next attack.
    </p>
    <p>
      A lender learns from losses the same way. It sets each country’s limit from the losses it remembers: after bad
      years the limit comes down, a link added to the chain; in calm years it goes back up. For a development lender
      the timing matters: the year after a bad one is often when a country most needs finance, and when other lenders
      pull out.
    </p>
    <p>
      But not every bad year is a change. Some are noise, <span class="tkc-idea">false positives</span>: a drought, a slump in a commodity price, one large default.
      Others mark a crisis that lasts, or a reform that holds. The question is how long a memory it takes to tell them
      apart.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Twenty countries, forty years" sub="One country’s forty years; the tiles add up all twenty, averaged over {int(HISTORIES)} histories." {rules}>
      <Puzzle id="pace" {...puzzle} onshow={showAnswer} />

      <div class="tkc-controls">
        <Slider id="p-memory" label="Lender remembers" bind:value={memory} min={1} max={MEMORIES.length} format={years} ends={['Forgets fast', 'Remembers long']} />
        {#if revealed}
          <div class="ctl">
            <Segmented
              name="p-world"
              label="Countries change"
              bind:value={world}
              options={[
                { value: 'rarely', label: 'Rarely' },
                { value: 'sometimes', label: 'Sometimes' },
                { value: 'often', label: 'Often' },
              ]}
            />
            <p class="tkc-caption">About once in forty years, once a decade, or once in three years.</p>
          </div>
        {/if}
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={span} height={H} role="img" aria-label={describe}>
          <text class="tkc-axis-title" x="0" y="12">Each year’s losses (dots), % of the loan</text>
          {#each changes as c (c.year)}
            <line class="when" x1={c.x} x2={c.x} y1={A.top - 6} y2={B.top + B.h} />
            {#if c.label}<text class="tkc-label-2" x={c.x + 3} y={A.top - 10}>{c.label}</text>{/if}
          {/each}
          {#each aTicks as t (t)}
            <line class="tkc-grid" x1={m.left} x2={span - m.right} y1={ya(t)} y2={ya(t)} />
            <text class="tkc-axis-label" x={m.left - 6} y={ya(t) + 4} text-anchor="end">{t}%</text>
          {/each}
          <path class="truth" d={riskLine} />
          {#each dots as d (d.year)}
            <circle class={d.bad ? 'bad' : 'dot'} cx={d.x} cy={d.y} r={d.bad ? 3.5 : 2.2} />
          {/each}
          <path class="lender" d={beliefLine} />
          {#if calmBad}
            <text class="tkc-label-2 tkc-halo" x={Math.min(span - m.right, Math.max(m.left, calmBad.x))} y={calmBad.y - 9} text-anchor={calmBad.x < m.left + 30 ? 'start' : calmBad.x > span - 40 ? 'end' : 'middle'}>Bad year</text>
          {/if}

          <text class="tkc-axis-title" x="0" y={B.top - 12}>Limit held, % of the full ${LIMIT}m</text>
          {#each [0, 1] as t (t)}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={m.left} x2={span - m.right} y1={yb(t)} y2={yb(t)} />
            <text class="tkc-axis-label" x={m.left - 6} y={yb(t) + 4} text-anchor="end">{t * 100}%</text>
          {/each}
          {#each gaps as g (g.year)}
            <rect class={g.over ? 'over' : 'under'} x={xl(g.year)} y={g.y} width={bw + 0.4} height={g.h} />
          {/each}
          <path class="truth" d={rightLine} />
          <path class="lender" d={heldLine} />
          {#each xTicks as t (t)}
            <text class="tkc-axis-label" x={xl(t) + bw / 2} y={H - 18} text-anchor={t === 1 ? 'start' : t === YEARS ? 'end' : 'middle'}>{t}</text>
          {/each}
          <text class="tkc-axis-title" x={m.left + (span - m.left - m.right) / 2} y={H - 2} text-anchor="middle">Year</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch key-truth" aria-hidden="true"></span>True risk; the limit it calls for</span>
          <span><span class="tkc-swatch key-lender" aria-hidden="true"></span>Losses remembered; the limit held</span>
          <span><span class="tkc-swatch sw-over" aria-hidden="true"></span>Lent too much</span>
          <span><span class="tkc-swatch sw-under" aria-hidden="true"></span>Good lending missed</span>
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat label="Lent too much" value="{usd(cur.losses)} a year" sub="lost in countries riskier than it believed, all {COUNTRIES}" swatch="var(--tkc-conditions)" />
        <Stat label="Good lending missed" value="{usd(cur.missed)} a year" sub="{usd(cur.afterBad)} of it just after a bad year" swatch="var(--pace-missed-key)" />
      </div>

      <div class="many">
        <span class="tkc-fig-title small">{revealed ? 'Every memory' : 'The memories you have tried'}</span>
        <svg width={span} height={CH} role="img" aria-label={revealed ? `Total cost a year for every memory, in a world where countries change ${here}: ${usd(table[0].total)} at one year, ${usd(table.at(-1).total)} at twenty, lowest at ${years(low.memory)} with ${usd(low.total)}.` : `Total cost a year for the memories tried: ${table.filter((r) => tried.includes(r.memory)).map((r) => `${years(r.memory)}, ${usd(r.total)}`).join('; ')}.`}>
          <text class="tkc-axis-title" x="0" y="12">Total cost, $m a year</text>
          {#each [0, 10, 20, 30] as t (t)}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={cm.left} x2={span - cm.right} y1={cy(t)} y2={cy(t)} />
            <text class="tkc-axis-label" x={cm.left - 6} y={cy(t) + 4} text-anchor="end">{t}</text>
          {/each}
          {#each cols as c (c.memory)}
            {#if c.shown}
              <path class="c-over" d={c.losses} />
              <path class="c-under" d={c.missed} />
            {/if}
            {#if c.memory === memory}<rect class="mine" x={c.x0 - 2.5} y={(c.shown ? c.top : cy(0)) - 2.5} width={cbw + 5} height={c.shown ? cy(0) - c.top + 2.5 : 2.5} rx="4" />{/if}
            {#if cLabels.includes(c.memory) || c.memory === memory}
              <text class="tkc-axis-label" class:on={c.memory === memory} x={c.mid} y={CH - cm.bottom + 15} text-anchor="middle">{c.memory}</text>
            {/if}
          {/each}
          {#if revealed}
            <text class="lowest tkc-halo" x={Math.min(span - cm.right, Math.max(0, lowCol.mid))} y={lowCol.top - 8} text-anchor={lowCol.mid > span - 40 ? 'end' : lowCol.mid < 40 ? 'start' : 'middle'}>Lowest</text>
          {/if}
          <text class="tkc-axis-title" x={cm.left + (span - cm.left - cm.right) / 2} y={CH - 2} text-anchor="middle">Years remembered</text>
        </svg>
      </div>

      {#snippet model()}
        <p>
          Each country’s true risk, the share of a loan it loses a year in the long run, is 1, 2, 4 or 8%. Each year it
          moves one rung up or down with a chance of one in {EVERY[here]}. A year’s losses scatter around it (a lognormal
          spread of {PARAMS.noise}), and one year in {PARAMS.badEvery} is a bad year with {PARAMS.badTimes} times the usual
          losses. The lender averages the last N years of losses; its limit is the full ${LIMIT}m at 1% or less, nothing at
          8% or more, a third less for each doubling between. Lending more than the true risk calls for loses its loss
          rate on the extra; lending less gives up {VALUE}% a year of it, twice that just after a bad year. Costs add up
          {COUNTRIES} countries over {YEARS} years, after 20 years of history, averaged over {int(HISTORIES)} histories; the
          chart shows one country. Counted once, not twice, lending after a bad year moves the best memory from
          {word(ANSWER)} years to {word(ONCE)}.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Forgetting fast, the lender reads every year as news. A few calm years and it believes a country safer than it
      is, because bad years are part of the risk and none is remembered; then one arrives and it cuts the limit just
      when the country needs the money most. At one year, {usd(ONE.losses)} a year is lost on lending too much and
      {usd(ONE.missed)} of good lending is missed, {usd(ONE.afterBad)} of it in the year after a bad one. Jack Guttentag and
      Richard Herring called the first half of this disaster myopia (1986): the longer since the last shock, the less
      likely the next one seems.
    </p>
    <p>
      Remembering long fails the other way. At twenty years the average hardly moves when a country really changes: the
      lender keeps lending into one that has turned ({usd(LONG.losses)} a year) and stays out of one that has reformed.
      Every old lesson stays on as a link.
    </p>
    <p>
      In between, at about {word(ANSWER)} years, the total is lowest: {usd(AT.total)} a year, against {usd(ONE.total)} and
      {usd(LONG.total)}. Losses lower the limits and calm years raise them again: a <span class="tkc-idea">loop</span> that
      steadies itself, where the stress test’s fed itself, if it learns at the right pace. Antifragility is a matter of
      pace: enough change to adapt, not so fast that the lesson is forgotten.
    </p>
    <h3>What sets the pace</h3>
    <p>
      Where countries change rarely, about once in forty years, the best memory lengthens to about {word(RARE)} years:
      almost every bad year is noise, and it pays to wait. Where they change every three years or so, it shortens to
      about {word(OFTEN)}: last year is the best guide there is. The right pace of forgetting is the pace at which the
      world changes.
    </p>
    <p>
      A chain that learns adds links after a shock and takes them off as the calm returns, at the pace the world sets.
      Most lessons stay on as links, though, and a list of them is what stands between a signed loan and its money.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="How many years of losses set our country limits, and how often do the countries we lend to really change?">
      <p>
        Capital rules set a minimum memory. A bank that estimates its own credit risk must base default rates on at least
        five years of history, and losses on loans to firms, banks and governments on at least seven. Country limits are
        usually reviewed each year, in the light of recent losses.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .tkc-chart,
  .many,
  .tkc-stats {
    --pace-missed: color-mix(in srgb, var(--tkc-ink-2) 34%, var(--tkc-surface));
    --pace-missed-key: color-mix(in srgb, var(--tkc-ink-2) 40%, var(--tkc-surface));
  }
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ctl {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .when {
    stroke: var(--tkc-rule);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .truth {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
    stroke-dasharray: 5 3;
    stroke-linejoin: round;
  }
  .lender {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 2.25;
    stroke-linejoin: round;
  }
  .dot {
    fill: var(--tkc-muted);
    opacity: 0.75;
  }
  .bad {
    fill: var(--tkc-surface);
    stroke: var(--tkc-ink-2);
    stroke-width: 1.75;
  }
  .over,
  .c-over {
    fill: var(--tkc-conditions);
  }
  .under,
  .c-under {
    fill: var(--pace-missed);
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
  .key-truth,
  .key-lender {
    width: 16px;
    height: 0;
    border-radius: 0;
    border-top: 2px dashed var(--tkc-ink);
  }
  .key-lender {
    border-top: 2.5px solid var(--tkc-ink);
  }
  .sw-over {
    background: var(--tkc-conditions);
  }
  .sw-under {
    background: var(--pace-missed);
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
