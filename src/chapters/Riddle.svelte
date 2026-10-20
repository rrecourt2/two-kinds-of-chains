<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import TryThis from '../lib/ui/TryThis.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulateMonth, coverageOdds, ROLES } from '../lib/sim/presence.js';
  import { pct } from '../lib/format.js';

  const DAYS = 21;
  let roles = $state(6);
  let availability = $state(90);
  let standIns = $state(0);
  let seed = $state(4);
  let width = $state(600);

  const month = $derived(simulateMonth({ roles, standIns, availability: availability / 100, days: DAYS, seed }));
  const odds = $derived(coverageOdds(roles, standIns, availability / 100));

  // Calendar geometry: role labels on the left, 21 working days in 4+ weeks.
  const narrow = $derived(width < 520);
  const labelW = $derived(narrow ? 92 : 150);
  const gap = 2;
  const weekGap = $derived(narrow ? 5 : 8);
  const cell = $derived(Math.max(8, Math.min(24, (width - labelW - 4 * weekGap - DAYS * gap) / DAYS)));
  const dayX = (d) => labelW + d * (cell + gap) + Math.floor(d / 5) * weekGap;
  const rowY = (r) => 34 + r * (cell + gap + 4);
  const height = $derived(rowY(roles) + 8);

  const formula = $derived.by(() => {
    const a = (availability / 100).toFixed(2);
    if (standIns === 0) return `${a} multiplied ${roles} time${roles === 1 ? '' : 's'} = ${pct(odds.allCovered)}`;
    return `Each role is covered ${pct(odds.roleCovered, 1)} of the time; ${pct(odds.roleCovered, 1)} multiplied ${roles} times = ${pct(odds.allCovered)}`;
  });

  const tries = [
    { label: 'Ten roles, no stand-ins', apply: () => ((roles = 10), (standIns = 0)) },
    { label: 'Now add one stand-in each', apply: () => ((roles = 10), (standIns = 1)) },
    { label: 'People in 80% of the time', apply: () => (availability = 80) },
  ];

  const roleLabel = (r) => (narrow ? ROLES[r].replace('Relationship manager', 'Rel. manager').replace('Product owner', 'Product') : ROLES[r]);
</script>

<Chapter n={1} kicker="The riddle" title="A riddle about chains">
  {#snippet setup()}
    <p>
      The pencil on your desk was made by thousands of people who have never met. Cedar from one country, graphite
      from another, rubber, brass, paint and glue from others. Nobody runs the whole chain, and nobody waits for
      anybody. The pencil costs less than a coffee.
    </p>
    <p>
      The credit request on your desk needs sign-off from six colleagues in one building. It will take weeks.
    </p>
    <p>
      Both are chains of people who depend on each other, and the pencil’s chain is far longer. Why does it work so
      much better?
    </p>
    <p>
      Start with the simplest version of the problem: a decision that needs every role below on the same day. Think
      of a committee, a joint review or a same-day payment cut-off.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Who is in this month?" sub="Each square is one working day. Absences come in runs: a week of holiday, a few days of training.">
      <div class="tkc-controls">
        <Slider id="r-roles" label="Roles that must sign off" bind:value={roles} min={1} max={10} />
        <Slider id="r-avail" label="Each person is in" bind:value={availability} min={70} max={99} format={(v) => `${v}% of days`} />
        <Slider id="r-stand" label="Qualified stand-ins per role" bind:value={standIns} min={0} max={3} />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={width} height={height} role="img" aria-label="Calendar of {roles} roles over {DAYS} working days. The decision could be made on {month.possibleDays} days.">
          {#each [0, 1, 2, 3, 4] as w}
            {#if w * 5 < DAYS}
              <text class="tkc-axis-label" x={dayX(w * 5)} y="12">Week {w + 1}</text>
            {/if}
          {/each}
          {#each month.allIn as ok, d}
            <rect
              x={dayX(d)}
              y="18"
              width={cell}
              height="8"
              rx="2"
              fill={ok ? 'var(--tkc-options)' : 'var(--tkc-conditions)'}
            />
          {/each}
          {#each month.grid as row, r}
            <text class="tkc-label-2" x="0" y={rowY(r) + cell / 2 + 4}>{roleLabel(r)}</text>
            {#each row as day, d}
              <rect
                x={dayX(d)}
                y={rowY(r)}
                width={cell}
                height={cell}
                rx="3"
                class="cell"
                class:in={day.main}
                class:cover={!day.main && day.covered}
                class:gap={!day.covered}
              />
            {/each}
          {/each}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-in"></span>Named person in</span>
          {#if standIns > 0}<span><span class="tkc-swatch sw-cover"></span>Stand-in covers</span>{/if}
          <span><span class="tkc-swatch sw-gap"></span>Nobody in for this role</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-options)"></span>Decision possible</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Blocked</span>
        </div>
      </div>

      <div class="tkc-stats" aria-live="polite">
        <Stat label="Days this month the decision could be made" value="{month.possibleDays} of {DAYS}" sub={month.possibleDays < DAYS / 2 ? 'Less than half the month' : ''} />
        <Stat label="Long-run share of days" value={pct(odds.allCovered)} sub={formula} />
      </div>

      <div class="tkc-row">
        <button type="button" class="tkc-btn tkc-btn--small" onclick={() => (seed += 1)}>Simulate another month</button>
      </div>

      <TryThis items={tries} />

      {#snippet model()}
        <p>Each person is in on {availability}% of days in the long run. Absences last three days on average, so they cluster the way holidays and training do.</p>
        <p>A role is covered on a day when its named person or any stand-in is in. The decision needs every role covered on the same day.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      With six named people who are each in 90% of the time, the decision can be made on only about half of all days.
      Every extra role multiplies in another 90%. With ten roles it is about one day in three.
    </p>
    <p>
      Now add one qualified stand-in per role. You have doubled the number of people involved, which sounds like more
      complexity. Yet the decision is now possible on 94% of days.
    </p>
    <p>
      That is the answer to the riddle. In the pencil’s chain, every link has many possible suppliers. If one graphite
      mine floods, the factory buys from another. Each link is an <span class="tkc-or">OR</span>: this supplier, or
      that one, or that one. In the approval chain, each link is an <span class="tkc-and">AND</span>: this person, and
      this person, and this person.
    </p>
    <p>
      Adding ORs makes a system more reliable. Adding ANDs makes it less reliable. Engineers know this as the
      difference between components in parallel and components in series. It holds for factories, committees and IT
      systems alike.
    </p>
    <p>
      The economist Michael Kremer built a theory of economic development on the same arithmetic. He named it after
      the O-ring, the small seal whose failure destroyed the space shuttle Challenger in 1986: when every part must
      work, small differences in reliability multiply into large differences in output.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which sign-off in your area can only one named person give, and what happens to the work when they are away?">
      <p>
        For any approval, ask whether the role is filled by a person or by anyone qualified. A role that only one named
        person can fill is an AND condition, however small it looks.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .cell {
    fill: var(--tkc-sunken);
    stroke: none;
  }
  .cell.in {
    fill: var(--tkc-ink-2);
    opacity: 0.55;
  }
  .cell.cover {
    fill: var(--tkc-options);
  }
  .cell.gap {
    fill: var(--tkc-surface);
    stroke: var(--tkc-conditions);
    stroke-width: 1.5;
  }
  .sw-in {
    background: var(--tkc-ink-2);
    opacity: 0.55;
  }
  .sw-cover {
    background: var(--tkc-options);
  }
  .sw-gap {
    background: var(--tkc-surface);
    box-shadow: inset 0 0 0 1.5px var(--tkc-conditions);
  }
</style>
