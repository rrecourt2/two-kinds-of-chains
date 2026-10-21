<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import TryThis from '../lib/ui/TryThis.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulateMonth, coverageOdds, ROLES, DAY_SYSTEMS } from '../lib/sim/presence.js';
  import { pct } from '../lib/format.js';

  const DAYS = 21;
  const MODES = {
    people: { count: 6, availability: 90, spell: 3, names: ROLES },
    systems: { count: 6, availability: 97, spell: 1, names: DAY_SYSTEMS },
  };

  let what = $state('people');
  let count = $state(6);
  let availability = $state(90);
  let backups = $state(0);
  let seed = $state(4);
  let width = $state(600);

  const sys = $derived(what === 'systems');
  const mode = $derived(MODES[what]);
  const month = $derived(simulateMonth({ roles: count, standIns: backups, availability: availability / 100, meanSpell: mode.spell, days: DAYS, seed }));
  const odds = $derived(coverageOdds(count, backups, availability / 100));

  function switchTo(next) {
    what = next;
    count = MODES[next].count;
    availability = MODES[next].availability;
    backups = 0;
  }

  // Calendar geometry: 21 working days in 4+ weeks. Labels sit left of each row,
  // or above it on narrow screens so the days keep their size.
  const narrow = $derived(width < 520);
  const stacked = $derived(width < 420);
  const labelW = $derived(stacked ? 0 : narrow ? 96 : 150);
  const gap = 2;
  const weekGap = $derived(narrow ? 5 : 8);
  const cell = $derived(Math.max(6, Math.min(24, (width - labelW - 4 * weekGap - DAYS * gap) / DAYS)));
  const dayX = (d) => labelW + d * (cell + gap) + Math.floor(d / 5) * weekGap;
  const rowY = (r) => (stacked ? 50 : 34) + r * (cell + gap + (stacked ? 18 : 4));
  const labelY = (r) => (stacked ? rowY(r) - 5 : rowY(r) + cell / 2 + 4);
  const height = $derived(stacked ? rowY(count) - 12 : rowY(count) + 8);
  const label = (r) => {
    const name = mode.names[r];
    return narrow && !stacked ? name.replace('Relationship manager', 'Rel. manager').replace('Product owner', 'Product').replace('Booking platform', 'Booking') : name;
  };

  const formula = $derived.by(() => {
    const a = (availability / 100).toFixed(2);
    if (backups === 0) return `${a} multiplied ${count} time${count === 1 ? '' : 's'} = ${pct(odds.allCovered)}`;
    return `Each link is covered ${pct(odds.roleCovered, 1)} of the time; ${pct(odds.roleCovered, 1)} multiplied ${count} times = ${pct(odds.allCovered)}`;
  });

  const tries = $derived(
    sys
      ? [
          { label: 'Ten systems, no backups', apply: () => ((count = 10), (backups = 0)) },
          { label: 'Now give each a backup', apply: () => ((count = 10), (backups = 1)) },
          { label: 'Systems up 95% of the time', apply: () => (availability = 95) },
        ]
      : [
          { label: 'Ten roles, no stand-ins', apply: () => ((count = 10), (backups = 0)) },
          { label: 'Now add one stand-in each', apply: () => ((count = 10), (backups = 1)) },
          { label: 'People in 80% of the time', apply: () => (availability = 80) },
        ],
  );
</script>

<Chapter
  n={1}
  kicker="The riddle"
  title="A riddle about chains"
  lede="When work needs everyone at once, it waits for whoever is missing. Give every role an alternative and the waiting disappears."
>
  {#snippet setup()}
    <p>
      The pencil on your desk was made by thousands of people who have never met. Cedar from one country, graphite
      from another, rubber, brass, paint and glue from others. Nobody runs the whole chain, and nobody waits for
      anybody. The pencil costs less than a coffee.
    </p>
    <p>A request inside a large organization can need six colleagues and six systems in one building, and take weeks.</p>
    <p>Both are chains, and the pencil’s chain is far longer. Why does it work so much better?</p>
    <p>
      The opening showed the arithmetic: when every link must hold, the risks multiply. Here is what that means for
      people’s time. Some work needs every link on the same day: a committee, a joint review, a same-day cut-off, or
      simply a working day that needs remote access, sign-in, the client file and the risk model all at once.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title={sys ? 'What is up this month?' : 'Who is in this month?'} sub={sys ? 'Each square is one working day. Systems fail in incidents and maintenance windows.' : 'Each square is one working day. Absences come in runs: a week of holiday, a few days of training.'}>
      <div class="tkc-controls">
        <Segmented
          name="r-what"
          label="The work needs"
          value={what}
          options={[
            { value: 'people', label: 'People' },
            { value: 'systems', label: 'Systems' },
          ]}
          onchange={switchTo}
        />
        <Slider id="r-count" label={sys ? 'Systems needed at once' : 'Roles that must sign off'} bind:value={count} min={1} max={10} />
        <Slider id="r-avail" label={sys ? 'Each system is up' : 'Each person is in'} bind:value={availability} min={70} max={99} format={(v) => `${v}% of days`} />
        <Slider id="r-backup" label={sys ? 'Backups per system' : 'Qualified stand-ins per role'} bind:value={backups} min={0} max={3} />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={width} height={height} role="img" aria-label="Calendar of {count} {sys ? 'systems' : 'roles'} over {DAYS} working days. The work could be done on {month.possibleDays} days.">
          {#each [0, 1, 2, 3] as wk}
            <text class="tkc-axis-label" x={dayX(wk * 5)} y="12">Week {wk + 1}</text>
          {/each}
          {#each month.allIn as ok, d}
            <rect x={dayX(d)} y="18" width={cell} height="8" rx="2" fill={ok ? 'var(--tkc-options)' : 'var(--tkc-conditions)'} />
          {/each}
          {#each month.grid as row, r}
            <text class="tkc-label-2" x="0" y={labelY(r)}>{label(r)}</text>
            {#each row as day, d}
              <rect x={dayX(d)} y={rowY(r)} width={cell} height={cell} rx="3" class="cell" class:in={day.main} class:cover={!day.main && day.covered} class:gap={!day.covered} />
            {/each}
          {/each}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-in"></span>{sys ? 'System up' : 'Named person in'}</span>
          {#if backups > 0}<span><span class="tkc-swatch sw-cover"></span>{sys ? 'Backup takes over' : 'Stand-in covers'}</span>{/if}
          <span><span class="tkc-swatch sw-gap"></span>{sys ? 'Down, no backup' : 'Nobody in for this role'}</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-options)"></span>Work possible</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Blocked</span>
        </div>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat label="Days this month the work could be done" value="{month.possibleDays} of {DAYS}" sub={month.possibleDays < DAYS / 2 ? 'Less than half the month' : ''} />
        <Stat
          label="Longest wait for everyone to be {sys ? 'up' : 'in'}"
          value={month.longestWait === 0 ? 'No wait' : `${month.longestWait} working day${month.longestWait === 1 ? '' : 's'}`}
          sub={month.longestWait > 0 ? 'in a row with something missing' : 'the work never had to wait'}
          swatch="var(--tkc-conditions)"
        />
      </div>

      <div class="tkc-row">
        <button type="button" class="tkc-btn tkc-btn--small" onclick={() => (seed += 1)}>Simulate another month</button>
      </div>

      <TryThis items={tries} />

      {#snippet model()}
        <p>Each {sys ? 'system is up' : 'person is in'} on {availability}% of days in the long run. {sys ? 'Outages last about a day.' : 'Absences last three days on average, so they cluster the way holidays and training do.'}</p>
        <p>A link is covered on a day when its main {sys ? 'system' : 'person'} or any {sys ? 'backup' : 'stand-in'} is available. The work needs every link covered on the same day. Over many months that happens on {pct(odds.allCovered)} of days: {formula}.</p>
        <p>{sys ? 'Each system fails independently of the others. A backup that shares its main system’s weak points, such as the same network or the same update, would help less.' : 'Each person’s absences are independent of everyone else’s. Stand-ins who take the same holidays as the people they cover would help less.'}</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      With six people who are each in 90% of the time, the work can be done on only about half of all days. And the
      blocked days come in stretches: one person’s week of holiday stops everything that needs them.
    </p>
    <p>
      Now give every role one qualified stand-in. Twice as many people are involved, which sounds like more complexity,
      yet the work is possible on almost every day. Systems behave the same way: switch the figure and give each system
      a backup.
    </p>
    <p>
      That is the answer to the riddle. In the pencil’s chain, every link has many possible suppliers. If one graphite
      mine floods, the factory buys from another. Each link is an <span class="tkc-or">OR</span>: this supplier, or
      that one. In a chain of named people and single systems, each link is an <span class="tkc-and">AND</span>: this
      person, and this system, and this person. ORs make a chain stronger. ANDs make it weaker.
    </p>
    <p>
      The economist Michael Kremer built a theory of economic development on this arithmetic and named it after the
      O-ring, the small seal whose failure destroyed the space shuttle Challenger in 1986: when every part must work,
      small differences in reliability multiply into large differences in output.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which sign-off or system in your area has no alternative, and what happens to the work when it is unavailable?">
      <p>
        For every link in a process, ask whether it is filled by one specific person or system, or by anyone or anything
        qualified. A link with no alternative is an AND condition, however small it looks.
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
