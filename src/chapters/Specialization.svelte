<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import TryThis from '../lib/ui/TryThis.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { ROLE_OPTIONS, MARKETS, workshop, bestDesign } from '../lib/sim/pins.js';
  import { linear, ticks, barUp } from '../lib/scales.js';
  import { int, pct } from '../lib/format.js';

  let exponent = $state(2); // pins ordered per day = 10^exponent
  let picked = $state(null); // { roles, demand }: a design the reader clicked, for this market size only
  let width = $state(560);
  let hover = $state(null);

  const demand = $derived(Math.round(Math.pow(10, exponent)));
  const market = $derived(MARKETS.reduce((m, x) => (demand >= x.demand * 0.55 ? x : m), MARKETS[0]));
  const designs = $derived(ROLE_OPTIONS.map((r) => workshop(demand, r)));
  const best = $derived(bestDesign(demand));
  const solo = $derived(designs[0]);
  const shown = $derived((picked?.demand === demand && designs.find((d) => d.roles === picked.roles)) || best);

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

  const tries = [
    { label: 'A village: 10 pins a day', apply: () => (exponent = 1) },
    { label: 'A city: 1,000 pins a day', apply: () => (exponent = 3) },
    { label: '12 specialists for a village', apply: () => ((exponent = 1), (picked = { roles: 12, demand: 10 })) },
  ];

  // The chain diagram for the design on show.
  const chainW = $derived(Math.max(260, width));
  const linkGap = 6;
  const linkW = $derived(Math.min(64, (chainW - linkGap * (shown.roles - 1)) / shown.roles));
</script>

<Chapter
  n={2}
  kicker="Specialization"
  title="Why longer chains get cheaper"
  lede="Specialists make long chains cheaper, but only when there is enough work to keep them busy and the work can reach any of them."
>
  {#snippet setup()}
    <p>
      In 1776 Adam Smith described a pin workshop. One worker doing every step alone, he wrote, could perhaps make one
      pin a day, and certainly not twenty. Ten workers who split the job into about eighteen separate operations made
      48,000 pins a day: 4,800 each.
    </p>
    <p>
      Specialists get faster with practice. They stop losing time switching between tasks, and they can justify
      special tools. This is good complexity: more roles and more handoffs, yet more output per person.
    </p>
    <p>
      Smith added a condition that is easy to miss: <em>the division of labour is limited by the extent of the
      market</em>. A specialist only pays off when there is enough work to keep them busy. That is the first way scale
      matters.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="The pin workshop" sub="How many specialist roles should the 12 operations be split into?">
      <div class="tkc-controls tkc-controls--wide">
        <Slider
          id="p-market"
          label="Market size"
          bind:value={exponent}
          min={1}
          max={4}
          step={0.05}
          format={() => `${int(demand)} pins a day · ${market.label}`}
          ends={['Village', 'Nation']}
        />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label="Worker-minutes per pin for each number of specialist roles. Best: {best.roles} roles at {fmtMin(best.minutesPerPin)} minutes.">
          {#each yTicks as t}
            <line class="tkc-grid" x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={m.left - 8} y={y(t) + 4} text-anchor="end">{t}</text>
          {/each}
          <line class="tkc-base" x1={m.left} x2={width - m.right} y1={y(0)} y2={y(0)} />
          {#each designs as d, i (d.roles)}
            {@const isBest = d.roles === best.roles}
            {@const isShown = d.roles === shown.roles}
            <g
              class="bar"
              role="button"
              tabindex="0"
              aria-label="{d.roles} role{d.roles > 1 ? 's' : ''}: {fmtMin(d.minutesPerPin)} worker-minutes per pin"
              onclick={() => (picked = { roles: d.roles, demand })}
              onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), (picked = { roles: d.roles, demand }))}
              onpointerenter={() => (hover = i)}
              onpointerleave={() => (hover = null)}
              onfocus={() => (hover = i)}
              onblur={() => (hover = null)}
            >
              <rect x={m.left + band * i} y={m.top} width={band} height={H - m.top - m.bottom} fill="transparent" />
              <path
                d={barUp(bx(i), y(d.minutesPerPin), barW, y(0) - y(d.minutesPerPin))}
                fill={isBest ? 'var(--tkc-options)' : isShown ? 'var(--tkc-ink-2)' : 'var(--tkc-rule)'}
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
          {#each Array(shown.roles) as _, i}
            {@const x0 = i * (linkW + linkGap)}
            {#if i > 0}<line x1={x0 - linkGap - 1} x2={x0 + 1} y1="18" y2="18" class="joint" />{/if}
            <rect x={x0} y="4" width={linkW} height="28" rx="8" class="link" class:best={shown.roles === best.roles} />
            {#if linkW > 26}
              <text class="tkc-label-2" x={x0 + linkW / 2} y="22" text-anchor="middle">×{int(shown.perRole)}</text>
            {/if}
          {/each}
          <text class="tkc-caption-svg" x="0" y="50">
            {shown.roles === 1 ? 'One link: everyone does all 12 operations' : `A ${shown.roles}-link chain: each link does ${12 / shown.roles} of the 12 operations`}
          </text>
        </svg>
      </div>

      <div class="tkc-stats tkc-stats--3" aria-live="polite">
        <Stat label="Best design at this market size" value="{best.roles} role{best.roles > 1 ? 's' : ''}" sub="{int(best.workers)} worker{best.workers > 1 ? 's' : ''} in total" swatch="var(--tkc-options)" />
        <Stat label="Worker-minutes per pin" value={fmtMin(shown.minutesPerPin)} sub={shown.roles === 1 ? 'Everyone does everything' : `${(solo.minutesPerPin / shown.minutesPerPin).toFixed(1)}× cheaper than working alone`} />
        <Stat label="Specialists busy" value={pct(shown.utilization)} sub={shown.utilization < 0.4 ? 'Mostly idle: the market is too small' : 'of each working day'} />
      </div>

      <TryThis items={tries} />

      {#snippet model()}
        <p>A trained pin-maker working alone makes 10 pins a day. Split the 12 operations among n specialist roles and each specialist works n times faster at their share.</p>
        <p>Every role needs at least one whole person, so a small market leaves specialists idle. Worker-minutes per pin = everyone’s working time ÷ pins made. Click a bar to see that design’s chain.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Drag the market from a village to a nation. The best design gets longer as the market grows: one generalist for
      a village, a dozen specialists for a nation. In this workshop the useful number of specialist roles grows with
      the square root of demand, so quadrupling the market lets you afford twice as many.
    </p>
    <p>
      This is why supply chains get longer as markets grow, and why each new link tends to make the product cheaper.
      Around 70% of international trade now involves global value chains, in which parts cross borders several
      times before they become a product (OECD).
    </p>
    <p>
      Specialization is also where innovation comes from. Ten specialties can be paired in 45 ways; a hundred in
      4,950. Every pairing is a chance to combine know-how in a new way.
    </p>
    <h3>What keeps a long chain safe</h3>
    <p>
      Every link has alternatives. A pencil maker depends on <em>a</em> graphite supplier, never on one particular
      mine. Specialization concentrates skill. It does not have to concentrate dependence.
    </p>
    <p>
      Specialists also build systems. The risk team builds the tool that suits risk, the credit team the one that suits
      credit. That is good complexity too, until a single client request has to pass through all of them. That is the
      next chapter.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Where do we have enough volume to justify a specialist team, and can work reach any qualified member of it?">
      <p>
        Specialist teams are good complexity when the volume justifies them and work can go to any qualified
        specialist. A centre of expertise that serves the whole bank is specialization. A sign-off that only its head
        can give is dependence.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .bar {
    cursor: pointer;
    outline: none;
  }
  .bar:focus-visible path {
    stroke: var(--tkc-focus);
    stroke-width: 2;
  }
  .chain {
    overflow: hidden;
  }
  .link {
    fill: var(--tkc-surface);
    stroke: var(--tkc-ink-2);
    stroke-width: 2;
  }
  .link.best {
    stroke: var(--tkc-options);
    fill: var(--tkc-options-wash);
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
