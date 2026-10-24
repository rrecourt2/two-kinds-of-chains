<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { ROLE_OPTIONS, MARKETS, workshop, bestDesign } from '../lib/sim/pins.js';
  import { linear, ticks, barUp } from '../lib/scales.js';
  import { int, pct } from '../lib/format.js';

  let exponent = $state(2); // pins ordered per day = 10^exponent
  let width = $state(560);
  let hover = $state(null);

  const demand = $derived(Math.round(Math.pow(10, exponent)));
  const market = $derived(MARKETS.reduce((m, x) => (demand >= x.demand * 0.55 ? x : m), MARKETS[0]));
  const designs = $derived(ROLE_OPTIONS.map((r) => workshop(demand, r)));
  const best = $derived(bestDesign(demand));
  const solo = $derived(designs[0]);

  // Bar chart geometry.
  const H = 220;
  const m = { top: 22, right: 8, bottom: 40, left: 40 };
  const yMax = $derived(Math.max(...designs.map((d) => d.minutesPerPin)) * 1.08);
  const y = $derived(linear(0, yMax, H - m.bottom, m.top));
  const band = $derived((width - m.left - m.right) / ROLE_OPTIONS.length);
  const barW = $derived(Math.min(36, band * 0.56));
  const bx = (i) => m.left + band * i + (band - barW) / 2;
  const yTicks = $derived(ticks(0, yMax, 4));

  const fmtMin = (v) => (v >= 100 ? int(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1));

  // Twelve roles are the cheapest design from 721 pins a day; the first slider step past that is 794 (exponent 2.9).
  const FIRST_TWELVE = 794;
  const puzzle = $derived({
    goal: 'Twelve roles make the cheapest pins once the market is big enough. Find the smallest market where they beat every shorter chain.',
    met: best.roles === 12 && demand <= FIRST_TWELVE,
    progress: best.roles === 12 ? `Twelve roles win at ${int(demand)} pins a day. Do they still win in a smaller market?` : '',
    hints: ['Start from a town and drag the market up slowly. The coloured bar marks the cheapest design.', 'It lies between a town and a city, nearer the city.'],
    found: 'Just past 720 pins a day, 794 on the slider, and even there the twelve specialists are idle almost half the day.',
  });

  // The chain diagram follows the cheapest design.
  const chainW = $derived(width);
  const linkGap = 6;
  const linkW = $derived(Math.min(64, (chainW - linkGap * (best.roles - 1)) / best.roles));
</script>

<Chapter
  n={2}
  kicker="Specialization"
  title="Why longer chains get cheaper"
  lede="Specialists make work cheaper, which is why chains grow longer. But every extra link has to earn its place."
  puzzle="specialization"
>
  {#snippet setup()}
    <p>
      In 1776 Adam Smith described a pin workshop. One untrained worker doing every step alone, he wrote, could scarcely
      make one pin a day, and certainly not twenty. Ten workers who split the job into about eighteen separate operations made
      48,000 pins a day: 4,800 each.
    </p>
    <p>
      Specialists get faster with practice. They stop losing time switching between tasks, and they can justify
      special tools. This is good complexity: more links in the chain and more handoffs, yet more output per person.
    </p>
    <p>
      Smith added a condition that is easy to miss: <em>the division of labour is limited by the extent of the
      market</em>.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument rules={['A pin takes twelve operations; one pin-maker doing all twelve makes 10 a day.', 'Split into n roles, each specialist works n times faster at their share.', 'Every role needs at least one whole person, busy or not.']} title="The pin workshop" sub="Worker-minutes per pin for each way of splitting the work; the cheapest is coloured and drawn as a chain below.">
      <Puzzle id="specialization" {...puzzle} onshow={() => (exponent = 2.9)} />
      <div class="tkc-controls tkc-controls--wide">
        <Slider
          id="p-market"
          label="Market size"
          bind:value={exponent}
          min={1}
          max={4}
          step={0.1}
          format={() => `${int(demand)} pins a day · ${market.label}`}
          ends={['Village', 'Nation']}
        />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label="Worker-minutes per pin for each number of specialist roles: {designs.map((d) => `${d.roles} role${d.roles > 1 ? 's' : ''}, ${fmtMin(d.minutesPerPin)}`).join('; ')}. Cheapest: {best.roles} role{best.roles > 1 ? 's' : ''}.">
          {#each yTicks as t}
            <line class="tkc-grid" x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={m.left - 8} y={y(t) + 4} text-anchor="end">{t}</text>
          {/each}
          <line class="tkc-base" x1={m.left} x2={width - m.right} y1={y(0)} y2={y(0)} />
          {#each designs as d, i (d.roles)}
            {@const isBest = d.roles === best.roles}
            <g role="presentation" onpointerenter={() => (hover = i)} onpointerleave={() => (hover = null)}>
              <rect x={m.left + band * i} y={m.top} width={band} height={H - m.top - m.bottom} fill="transparent" />
              <path
                d={barUp(bx(i), y(d.minutesPerPin), barW, y(0) - y(d.minutesPerPin))}
                fill={isBest ? 'var(--tkc-options)' : 'var(--tkc-rule)'}
                opacity={hover === i ? 0.82 : 1}
              />
              <text
                class={isBest ? 'tkc-label' : 'tkc-label-2'}
                x={bx(i) + barW / 2}
                y={y(d.minutesPerPin) - 6}
                text-anchor="middle">{fmtMin(d.minutesPerPin)}</text
              >
              <text class="tkc-axis-label" x={bx(i) + barW / 2} y={H - m.bottom + 18} text-anchor="middle">{d.roles}</text>
            </g>
          {/each}
          <text class="tkc-axis-title" x={m.left + (width - m.left - m.right) / 2} y={H - 4} text-anchor="middle">Specialist roles</text>
          <text class="tkc-axis-title" x={m.left - 34} y={m.top - 10}>Worker-minutes per pin</text>
        </svg>
        {#if hover !== null}
          {@const d = designs[hover]}
          <div class="tkc-tip" style:left="{Math.min(width - 200, Math.max(0, bx(hover) - 70))}px" style:top="{Math.max(0, y(d.minutesPerPin) - 92)}px">
            <strong>{fmtMin(d.minutesPerPin)} min per pin</strong>
            <div>{d.roles} role{d.roles > 1 ? 's' : ''} × {int(d.perRole)} worker{d.perRole > 1 ? 's' : ''}</div>
            <div>Each busy {pct(d.utilization)} of the day</div>
          </div>
        {/if}
      </div>

      <div class="chain" aria-hidden="true">
        <svg width={chainW} height="54">
          {#each Array(best.roles) as _, i}
            {@const x0 = i * (linkW + linkGap)}
            {#if i > 0}<line x1={x0 - linkGap - 1} x2={x0 + 1} y1="18" y2="18" class="joint" />{/if}
            <rect x={x0} y="4" width={linkW} height="28" rx="8" class="link" />
            {#if linkW > 26}
              <text class="tkc-label-2" x={x0 + linkW / 2} y="22" text-anchor="middle">×{int(best.perRole)}</text>
            {/if}
          {/each}
          <text class="tkc-caption-svg" x="0" y="50">
            {best.roles === 1 ? 'One link: everyone does all 12 operations' : chainW < 340 ? `${best.roles} links, ${12 / best.roles} of the 12 operations each` : `A ${best.roles}-link chain: each link does ${12 / best.roles} of the 12 operations`}
          </text>
        </svg>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat label="Cheapest design" value="{best.roles} role{best.roles > 1 ? 's' : ''}" sub="{int(best.workers)} worker{best.workers > 1 ? 's' : ''}, busy {pct(best.utilization)} of the day" swatch="var(--tkc-options)" />
        <Stat label="Worker-minutes per pin" value={fmtMin(best.minutesPerPin)} sub={best.roles === 1 ? 'Everyone does everything' : `${(solo.minutesPerPin / best.minutesPerPin).toFixed(1)}× cheaper than working alone`} />
      </div>

      {#snippet model()}
        <p>A trained pin-maker working alone makes 10 pins a day. Smith’s eighteen operations are grouped here into 12, which divide evenly among 1, 2, 3, 4, 6 or 12 roles; split among n roles, each specialist works n times faster at their share.</p>
        <p>Every role needs at least one whole person, so a small market leaves specialists idle. Worker-minutes per pin = everyone’s working time ÷ pins made. Roughly, the best number of roles grows with the square root of demand, in jumps and not always upwards: because every role needs a whole person, a design with fewer roles sometimes wins for a while. The chain under the chart shows the cheapest design; when designs cost the same, the one with fewer roles is shown. Hovering over a bar shows how that design is staffed.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Twelve roles only win once the market passes about 720 pins a day. Below that a shorter chain does at least as
      well, and in the smallest markets one person doing everything is cheapest of all. A village has a family doctor; a city can
      keep a heart surgeon busy.
    </p>
    <p>
      This is why chains grow as markets grow. Around 70% of international trade now passes through global value
      chains, in which parts cross borders several times before they become a product. It is also how many economies
      have grown: a country that could not yet build a whole car or phone can make one part of it well, and sell that
      part to the world.
    </p>
    <h3>Chips: one of the longest chains, and one of the most inventive</h3>
    <p>
      Until 1987 almost every chip company designed and made its own chips. That year Morris Chang founded a firm in Taiwan
      to do one thing only: make chips that others design. Since then each link has specialized, from the blueprints
      and the design software to the machines that print the circuits, and the chain has been one of the most
      innovative in industry.
    </p>
    <p>
      Its weak spots are the links without an alternative. One firm makes most of the world’s most advanced chips, and
      only one, in the Netherlands, builds the machines that print them. Specialization concentrates skill. It does not
      have to concentrate dependence, but here it does.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Where could one specialist team serve the whole bank, instead of each unit keeping its own?">
      <p>
        A shared team of specialists, in environmental and social risk, say, or in legal, that serves every deal is
        specialization: busy because it sees every case, and skilled for the same reason. A sign-off that only one named
        person can give is dependence.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .chain {
    overflow: hidden;
  }
  .link {
    stroke: var(--tkc-options);
    fill: var(--tkc-options-wash);
    stroke-width: 2;
  }
  .joint {
    stroke: var(--tkc-ink-2);
    stroke-width: 2;
  }
  .tkc-caption-svg {
    fill: var(--tkc-muted);
    font-size: 12px;
  }
</style>
