<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import TryThis from '../lib/ui/TryThis.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { STEPS, READY_AT, simulateMornings, checks } from '../lib/sim/breakfast.js';
  import { linear, barRight } from '../lib/scales.js';
  import { pct } from '../lib/format.js';

  const MORNINGS = 40;
  let towardBank = $state(0);
  let picked = $state(0);
  let seed = $state(8);
  let width = $state(560);

  const b = $derived(towardBank / 100);
  const mornings = $derived(simulateMornings({ bankness: b, mornings: MORNINGS, seed }));
  const morning = $derived(mornings[Math.min(picked, MORNINGS - 1)]);
  const eggSlowest = $derived(mornings.filter((d) => d.slowest === 0).length);
  const onTime = $derived(mornings.filter((d) => d.onTime).length);
  const check = $derived(checks(b));
  const place = $derived(towardBank <= 20 ? 'Grove’s kitchen' : towardBank <= 60 ? 'An operations team' : 'A credit request');

  // Gantt of Grove's plan and the chosen morning.
  const rowH = 30;
  const gm = { top: 20, left: 64, right: 12, bottom: 40 };
  const gH = gm.top + STEPS.length * rowH + gm.bottom;
  const tMax = $derived(Math.max(READY_AT * 1.25, ...mornings.map((d) => d.ready)) * 1.02);
  const gx = $derived(linear(0, tMax, gm.left, width - gm.right));
  const tickStep = $derived(tMax > 12 ? 4 : tMax > 6 ? 2 : 1);
  const gTicks = $derived(Array.from({ length: Math.floor(tMax / tickStep) + 1 }, (_, i) => i * tickStep));

  // Mornings strip.
  const cell = $derived(Math.max(9, Math.min(18, (width - 2) / MORNINGS - 2)));

  // Where to put the check.
  const cm = { left: 196, right: 54 };
  const cx = $derived(linear(0, 1, cm.left, Math.max(cm.left + 40, width - cm.right)));

  const tries = [
    { label: 'Grove’s kitchen', apply: () => (towardBank = 0) },
    { label: 'An operations team', apply: () => (towardBank = 50) },
    { label: 'A credit request', apply: () => (towardBank = 100) },
  ];
</script>

<Chapter
  n={5}
  kicker="Production"
  title="The breakfast factory"
  lede="Andrew Grove’s lessons work beautifully for repeatable, visible work. Applied to a bank’s variable, linked work, they put the checks in the wrong place."
>
  {#snippet setup()}
    <p>
      In <em>High Output Management</em> (1983), Intel’s Andrew Grove taught management with a breakfast: a three-minute
      soft-boiled egg, buttered toast and coffee, all served hot at the same moment. The book has shaped a generation of
      executives, and its breakfast factory carries three lessons.
    </p>
    <ul>
      <li><strong>Find the limiting step.</strong> The egg takes longest, so start it first and time the toast and coffee to finish with it.</li>
      <li><strong>Catch problems where they are cheapest.</strong> Check the egg before it is boiled, not at the table.</li>
      <li><strong>Choose between spare stock and spare capacity:</strong> boiled eggs waiting, or a second cook.</li>
    </ul>
    <p>
      Grove argued that the same principles apply to any manager’s work. In a kitchen they are exactly right. Slide the
      figure from his kitchen to a bank and watch what happens to them.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="From Grove’s kitchen to a bank" sub="Forty mornings of the same breakfast, with the plan built around the egg.">
      <div class="tkc-controls tkc-controls--wide">
        <Slider id="b-bank" label="Where the work happens" bind:value={towardBank} min={0} max={100} step={5} format={() => place} ends={['Kitchen', 'Bank']} />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <div class="tkc-fig-title small">Grove’s plan, and morning {picked + 1}</div>
        <svg {width} height={gH} role="img" aria-label="Plan: egg from 0 to 3, toast and coffee from 2 to 3. Morning {picked + 1}: breakfast ready at {morning.ready.toFixed(1)}.">
          {#each gTicks as t}
            <line class="tkc-grid" x1={gx(t)} x2={gx(t)} y1={gm.top - 6} y2={gH - gm.bottom} />
            <text class="tkc-axis-label" x={gx(t)} y={gH - gm.bottom + 16} text-anchor="middle">{t}</text>
          {/each}
          <line class="ready" x1={gx(READY_AT)} x2={gx(READY_AT)} y1={gm.top - 10} y2={gH - gm.bottom} />
          <text class="tkc-axis-label" x={gx(READY_AT) + 4} y={gm.top - 8}>Planned: ready at 3</text>
          {#each STEPS as step, i (step.id)}
            {@const yy = gm.top + i * rowH}
            <text class="tkc-label-2" x="0" y={yy + 18}>{step.label}</text>
            <rect x={gx(READY_AT - step.planned)} y={yy + 4} width={gx(step.planned) - gx(0)} height={20} rx="4" class="plan" />
            <rect x={gx(morning.starts[i])} y={yy + 9} width={Math.max(1, gx(morning.times[i]) - gx(0))} height={10} rx="3" class="actual" class:slow={morning.slowest === i && i !== 0} />
          {/each}
          <text class="tkc-axis-title" x={width - gm.right} y={gH - 2} text-anchor="end">Time (minutes in a kitchen, days in a bank)</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-plan"></span>Plan</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-ink-2)"></span>What happened</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Slowest step, when it is not the egg</span>
        </div>
      </div>

      <div class="strip">
        <div class="tkc-fig-title small">The slowest step, morning by morning</div>
        <div class="cells" role="list">
          {#each mornings as d, i}
            <button
              type="button"
              role="listitem"
              class="day"
              class:moved={d.slowest !== 0}
              class:late={!d.onTime}
              class:on={i === picked}
              style:width="{cell}px"
              style:height="{cell + 6}px"
              aria-label="Morning {i + 1}: slowest step {STEPS[d.slowest].label}{d.onTime ? '' : ', breakfast late'}"
              onclick={() => (picked = i)}>{STEPS[d.slowest].letter}</button
            >
          {/each}
        </div>
        <p class="tkc-caption">E, T and C mark the slowest step: egg, toast or coffee. Orange: the plan’s limiting step was not the limit. A line underneath: breakfast was late. Click a morning to see it above.</p>
      </div>

      <div class="tkc-stats" aria-live="polite">
        <Stat label="The egg was the slowest step" value="{eggSlowest} of {MORNINGS}" sub="mornings" />
        <Stat label="Breakfast ready on time" value="{onTime} of {MORNINGS}" sub="within 10% of the plan" />
      </div>

      <div class="checks">
        <div class="tkc-fig-title small">Where should the check go?</div>
        <svg {width} height="96" role="img" aria-label="A check before every step catches {pct(check.early.caught)} of problems; one check at the end catches {pct(check.late.caught)}.">
          {#each [{ label: 'Before every step (Grove)', sub: '3 checks to wait for', v: check.early.caught }, { label: 'Once, at the end', sub: '1 check to wait for', v: check.late.caught }] as row, i (row.label)}
            {@const yy = 8 + i * 44}
            <text class="tkc-label-2" x="0" y={yy + 13}>{row.label}</text>
            <text class="tkc-axis-label" x="0" y={yy + 29}>{row.sub}</text>
            <rect x={cx(0)} y={yy + 2} width={cx(1) - cx(0)} height="18" rx="4" class="track" />
            <path d={barRight(cx(0), yy + 2, Math.max(2, cx(row.v) - cx(0)), 18)} class="caught" class:win={row.v >= Math.max(check.early.caught, check.late.caught)} />
            <text class="tkc-label" x={cx(row.v) + 6} y={yy + 15}>{pct(row.v)}</text>
          {/each}
        </svg>
        <p class="tkc-small">
          Share of problems caught.
          {#if check.early.caught > check.late.caught}
            Here early checks win: problems are easy to see before the work starts, and a check is a glance.
          {:else}
            Here one check at the end wins on both counts: it catches more, and the request waits once instead of three times.
          {/if}
        </p>
      </div>

      <TryThis items={tries} />

      {#snippet model()}
        <p>Planned times: egg 3, toast 1, coffee 1, in minutes for a kitchen or days for a bank. Each step starts so that it would finish at 3. Moving right, each step’s time varies more (up to 60% either way), a step is held up on 15% of mornings (a person away, a system down) for 3 extra units on average, and a check before a step spots a problem less often: 90% of the time in the kitchen, 20% in the bank.</p>
        <p>One check at the end, when the work is complete and visible, spots 95% of problems.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>Three things change between a kitchen and a bank.</p>
    <ul>
      <li>
        <strong>The limiting step moves.</strong> In Grove’s kitchen the egg is always the slowest step. In a bank the
        slowest step is whoever or whatever is missing today: the approver on holiday, the system that is down, the form
        that came back. You cannot plan around a limiting step that changes every morning. You need spare capacity and
        alternatives instead.
      </li>
      <li>
        <strong>Early checks see little.</strong> A cracked egg is visible before it is boiled. The risk in a credit file
        or a system change often only becomes visible as the work proceeds. An approval before every step adds a wait
        each time and catches less than one careful approval later, when the whole picture exists.
      </li>
      <li><strong>No two requests are alike.</strong> A kitchen learns by making the same breakfast a thousand times. Bank requests differ every time, and the rare case dominates (chapter 9).</li>
    </ul>
    <h3>Where Grove is right</h3>
    <p>
      For cheap checks. Validate data the moment it is typed, automatically, before it spreads into other systems.
      That is his principle of catching problems where they are cheapest, done by software in a second. The mistake is
      applying the same rule to approvals by people, which cost days each.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our processes really are repeatable breakfasts, and which only look like them?">
      <p>
        Use Grove’s playbook where work is repeatable and visible, such as payment operations or standard account
        openings. Where work is variable and linked, plan for spare capacity and alternatives instead of a fixed limiting
        step, automate the cheap checks at entry, and hold human approvals until the picture is complete. Checks the law
        fixes in time, such as sanctions screening before a payment, stay where the law puts them.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .small {
    font-size: 0.9375rem;
  }
  .ready {
    stroke: var(--tkc-ink);
    stroke-width: 1;
  }
  .plan {
    fill: var(--tkc-sunken);
    stroke: var(--tkc-rule);
    stroke-width: 1;
  }
  .sw-plan {
    background: var(--tkc-sunken);
    box-shadow: inset 0 0 0 1px var(--tkc-rule);
  }
  .actual {
    fill: var(--tkc-ink-2);
  }
  .actual.slow {
    fill: var(--tkc-conditions);
  }
  .strip,
  .checks {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 8px;
    border-top: 1px solid var(--tkc-hair);
    padding-top: 14px;
  }
  .cells {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }
  .day {
    padding: 0;
    border: 0;
    border-radius: 3px;
    background: var(--tkc-sunken);
    color: var(--tkc-ink-2);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    box-shadow: inset 0 -3px 0 0 transparent;
  }
  .day.moved {
    background: var(--tkc-conditions);
    color: var(--tkc-on-strong);
  }
  .day.late {
    box-shadow: inset 0 -3px 0 0 var(--tkc-ink);
  }
  .day.on {
    outline: 2px solid var(--tkc-ink);
    outline-offset: 1px;
  }
  .track {
    fill: var(--tkc-sunken);
  }
  .caught {
    fill: var(--tkc-ink-2);
  }
  .caught.win {
    fill: var(--tkc-options);
  }
</style>
