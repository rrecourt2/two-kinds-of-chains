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
  import { simulateMonth, coverageOdds, ROLES } from '../lib/sim/presence.js';
  import { pct } from '../lib/format.js';

  const DAYS = 20; // four working weeks
  const COUNT = 6; // six roles
  // A month close to the long-run odds for the puzzle's settings (test/riddle.test.js), with absences of
  // three or four days, and one day on which a named person and their stand-in are both away.
  const SEED = 2984;
  const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six'];

  let availability = $state(90);
  let backups = $state(0);
  let need = $state(COUNT); // how many of the six roles a decision needs: all six, or a quorum
  let width = $state(600);

  const month = $derived(simulateMonth({ roles: COUNT, standIns: backups, availability: availability / 100, days: DAYS, seed: SEED, need }));
  const odds = $derived(coverageOdds(COUNT, backups, availability / 100, need));

  // Calendar geometry: 21 working days in 4+ weeks. Labels sit left of each row,
  // or above it on narrow screens so the days keep their size.
  const narrow = $derived(width < 520);
  const stacked = $derived(width < 420);
  const labelW = $derived(stacked ? 0 : narrow ? 96 : 150);
  const gap = 2;
  const weekGap = $derived(narrow ? 5 : 8);
  const cell = $derived(Math.max(6, Math.min(24, (width - labelW - 4 * weekGap - DAYS * gap) / DAYS)));
  const dayX = (d) => labelW + d * (cell + gap) + Math.floor(d / 5) * weekGap;
  const stripY = $derived(stacked ? 36 : 18);
  const rowY = (r) => (stacked ? 64 : 34) + r * (cell + gap + (stacked ? 18 : 4));
  const labelY = (r) => (stacked ? rowY(r) - 5 : rowY(r) + cell / 2 + 4);
  const height = $derived(stacked ? rowY(COUNT) - 12 : rowY(COUNT) + 8);
  const label = (r) => (narrow && !stacked ? ROLES[r].replace('Investment officer', 'Investment').replace('E&S specialist', 'E&S') : ROLES[r]);

  const formula = $derived.by(() => {
    const a = (availability / 100).toFixed(2);
    const each = backups === 0 ? '' : `each role is covered ${pct(odds.roleCovered, 1)} of the time; `;
    const p = backups === 0 ? a : pct(odds.roleCovered, 1);
    if (need === COUNT) return `${each}${p} multiplied ${COUNT} times = ${pct(odds.enough)}`;
    return `${each}at least ${WORDS[need]} of six roles covered, the binomial sum = ${pct(odds.enough)}`;
  });
  const sub = $derived(
    need === COUNT
      ? 'One month, six roles. The top strip is dark on days when every role below is covered.'
      : `One month, six roles. The top strip is dark on days when at least ${WORDS[need]} roles below are covered.`,
  );

  const puzzle = {
    goal: 'Which of these changes gives the most days on which the decision can be made?',
    choices: [
      { value: 'attend', label: 'Better planning lifts everyone’s attendance from 90% to 97%' },
      { value: 'standin', label: 'Each of the six gets one qualified stand-in, who is also in on 90% of days' },
      { value: 'same', label: 'Both help about equally' },
    ],
    answer: 'standin',
    wrong: (v) => (v === 'attend' ? 'Six people at 97% are all in together on about 83% of days. Set the sliders to compare.' : 'They differ more than it seems. Set the sliders to compare.'),
    hints: ['When everyone must be in, the chances multiply: 0.97 six times over.', 'With a stand-in, a role is uncovered only when both people are out on the same day. How often is that?'],
    found: 'The stand-ins win: decisions on 94% of days, against 83% with better attendance.',
  };
  // A prediction: the controls open after the first answer or a hint.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('riddle'));
  // After solving, a third control: how many of the six a decision needs.
  const revealed = $derived(!game.isOpen('riddle'));
  const showAnswer = () => ((availability = 90), (backups = 1), (need = COUNT));
</script>

<Chapter
  n={1}
  kicker="The riddle"
  title="A riddle about chains"
  lede="When work needs everyone at once, it waits for whoever is missing. What stops the waiting soonest?"
  puzzle="riddle"
>
  {#snippet setup()}
    <p>
      The pencil on your desk was made by thousands of people who have never met. Cedar from one country, graphite
      from another, rubber, brass, paint and glue from others. Nobody runs the whole chain, and nobody waits for
      anybody. The pencil costs less than a coffee.
    </p>
    <p>
      A loan that needs six colleagues and six systems in one building can take weeks. Both are chains, and the
      pencil’s chain is far longer. Why does it work so much better?
    </p>
    <p>
      Some work needs every link on the same day: a credit committee, a joint site visit, a same-day payment cut-off,
      or simply a working day that needs remote access, sign-in, the client file and the risk model all at once.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument rules={[need === COUNT ? 'A decision needs all six roles covered on the same day.' : `A decision needs any ${WORDS[need]} of the six roles covered on the same day.`, 'Each person is in on 90% of days; absences last about three days.', 'A qualified stand-in can cover a role; nobody’s absences depend on another’s.']} title="Who is in this month?" {sub}>
      <Puzzle id="riddle" {...puzzle} predict onshow={showAnswer} />
      <!-- Before the first answer, lower attendance can be tried; better attendance and the stand-ins wait. -->
      <div class="tkc-controls">
        <Slider id="r-avail" label="Attendance" bind:value={availability} min={70} max={99} format={(v) => `${v}% of days`} limit={live ? null : 90} limitNote="Above 90%: opens after your first answer." />
        <div class:tkc-wait={!live} inert={live ? undefined : true} data-lock="Opens after your first answer.">
          <Slider id="r-backup" label="Stand-ins per role" bind:value={backups} min={0} max={3} format={(v) => (v === 0 ? 'None' : String(v))} />
        </div>
        {#if revealed}
          <div class="quorum">
            <Segmented
              name="r-need"
              label="Decision needs"
              bind:value={need}
              options={[
                { value: 6, label: 'All six' },
                { value: 5, label: 'Any five' },
                { value: 4, label: 'Any four' },
              ]}
            />
          </div>
        {/if}
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={width} height={height} role="img" aria-label="Calendar of {COUNT} roles over {DAYS} working days. The decision could be made on {month.possibleDays} days.">
          {#each [0, 1, 2, 3] as wk}
            <text class="tkc-axis-label" x={dayX(wk * 5)} y="12">Week {wk + 1}</text>
          {/each}
          <!-- On a phone every label sits above its row, the strip's too. -->
          {#if stacked}<text class="tkc-axis-label" x="0" y={stripY - 6}>Decision possible</text>
          {:else}<text class="tkc-axis-label" x="0" y={stripY + 8}>{narrow ? 'Decision' : 'Decision possible'}</text>{/if}
          {#each month.allIn as ok, d}
            <rect x={dayX(d)} y={stripY} width={cell} height="8" rx="2" class="day" class:blocked={!ok} />
          {/each}
          {#each month.grid as row, r}
            <text class="tkc-label-2" x="0" y={labelY(r)}>{label(r)}</text>
            {#each row as day, d}
              <rect x={dayX(d)} y={rowY(r)} width={cell} height={cell} rx="3" class="cell" class:in={day.main} class:cover={!day.main && day.covered} class:gap={!day.covered} />
            {/each}
          {/each}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-in"></span>Named person in</span>
          {#if backups > 0}<span><span class="tkc-swatch sw-cover"></span>Stand-in covers</span>{/if}
          <span><span class="tkc-swatch sw-gap"></span>{backups > 0 ? 'Named person and stand-in both away' : 'Nobody in for this role'}</span>
          <span><span class="tkc-swatch sw-blocked"></span>Decision blocked</span>
        </div>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat label="Days this month the decision could be made" value="{month.possibleDays} of {DAYS}" sub="In the long run: {pct(odds.enough)} of days" />
        <Stat
          label={need === COUNT ? 'Longest wait for everyone to be in' : `Longest wait for any ${WORDS[need]} to be in`}
          value={month.longestWait === 0 ? 'No wait' : `${month.longestWait} working day${month.longestWait === 1 ? '' : 's'}`}
          sub={month.longestWait === 0 ? 'the decision never had to wait' : need === COUNT ? 'in a row with someone missing' : 'in a row with too few in'}
          swatch={month.longestWait === 0 ? null : 'var(--tkc-conditions)'}
        />
      </div>

      {#snippet model()}
        <p>Each person is in on {availability}% of days in the long run. Absences last three days on average, so they cluster the way holidays and training do.</p>
        <p>A role is covered on a day when its named person or any stand-in is in. The decision needs {need === COUNT ? 'all six roles' : `any ${WORDS[need]} of the six roles`} covered on the same day. Over many months that happens on {pct(odds.enough)} of days: {formula}.</p>
        <p>Each person’s absences are independent of everyone else’s. Stand-ins who take the same holidays as the people they cover would help less.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Better attendance helps less than it seems: six people at 97% are all in together on only 83% of days. A stand-in
      changes the arithmetic. A role is covered unless both people are out, so each link holds on 99 days in 100, and all
      six hold on 94% of days. Nobody has to be in more often; more people can sign.
    </p>
    <p>
      The danger is how fast a chain of ANDs falls apart. With four more named roles, the decision is possible on one
      day in three, though each of the ten is in on nine days in ten. The blocked days come in stretches, too: one person’s week of holiday stops everything that needs
      them.
    </p>
    <p>
      Old Christmas lights were wired the same way. One dead bulb and the whole string went dark, and finding it meant
      testing every bulb. Newer bulbs carry a small bypass, so the string stays lit when one fails.
    </p>
    <p>
      That is the answer to the riddle. In the pencil’s chain, every link has many possible suppliers: if one graphite
      mine floods, the factory buys from another. Each link is an <span class="tkc-or">OR</span>. In a chain of named
      people and single systems, each link is an <span class="tkc-and">AND</span>. ORs let a chain grow long and stay
      strong. ANDs weaken it with every link, and past a point it is blocked more often than it is open.
    </p>
    <p>
      Between the two sits the quorum. All six of six is an AND; any one of two, a person or their stand-in, is an
      OR; any four of six lies in between. The same six people, each in on nine days in ten, are all in together on
      {pct(coverageOdds(COUNT, 0, 0.9).enough)} of days; any five on {pct(coverageOdds(COUNT, 0, 0.9, 5).enough)}, any
      four on {pct(coverageOdds(COUNT, 0, 0.9, 4).enough)}. A quorum keeps several judgements without waiting for every
      one of them.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our approvals wait for one named person, where a standing deputy or a pool would do?">
      <p>
        Many approvals name a person: the head of credit, the chief risk officer. When that person is travelling, the
        deal waits, or a delegation is drafted for the occasion. A standing delegation to a named deputy, or to any of
        several qualified colleagues, keeps the same control and takes the waiting out.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .quorum {
    grid-column: 1 / -1;
  }
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
  /* The top strip: possible days in ink, blocked days orange; blue is kept for the stand-ins. */
  .day {
    fill: var(--tkc-ink-2);
  }
  .day.blocked,
  .sw-blocked {
    fill: var(--tkc-conditions);
    background: var(--tkc-conditions);
  }
</style>
