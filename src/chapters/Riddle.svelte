<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulateMonth, coverageOdds, ROLES } from '../lib/sim/presence.js';
  import { pct } from '../lib/format.js';

  const DAYS = 21;
  const COUNT = 6; // six roles must all be in for the decision
  const SEED = 58; // a month close to the long-run odds for the settings in the puzzle

  let availability = $state(90);
  let backups = $state(0);
  let width = $state(600);

  const month = $derived(simulateMonth({ roles: COUNT, standIns: backups, availability: availability / 100, days: DAYS, seed: SEED }));
  const odds = $derived(coverageOdds(COUNT, backups, availability / 100));

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
  const height = $derived(stacked ? rowY(COUNT) - 12 : rowY(COUNT) + 8);
  const label = (r) => (narrow && !stacked ? ROLES[r].replace('Investment officer', 'Investment').replace('E&S specialist', 'E&S') : ROLES[r]);

  const formula = $derived.by(() => {
    const a = (availability / 100).toFixed(2);
    if (backups === 0) return `${a} multiplied ${COUNT} times = ${pct(odds.allCovered)}`;
    return `each role is covered ${pct(odds.roleCovered, 1)} of the time; ${pct(odds.roleCovered, 1)} multiplied ${COUNT} times = ${pct(odds.allCovered)}`;
  });

  const puzzle = {
    goal: 'Six people must all be in for a decision, and each is in on 90% of days. Which change gives the most days on which the decision can be made?',
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
  const showAnswer = () => ((availability = 90), (backups = 1));
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
    <p>A loan that needs six colleagues and six systems in one building can take weeks.</p>
    <p>Both are chains, and the pencil’s chain is far longer. Why does it work so much better?</p>
    <p>
      Some work needs every link on the same day: a credit committee, a joint site visit, a same-day payment cut-off,
      or simply a working day that needs remote access, sign-in, the client file and the risk model all at once.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument rules={['Six roles; a decision needs all six covered on the same day.', 'At the start, each person is in on 90% of days; absences come in spells of about three days.', 'A qualified stand-in can cover a role when its named person is away.', 'Nobody’s absences depend on anyone else’s.']} title="Who is in this month?" sub="Six people who must all be in for a decision, over one month. Each square is a working day; the strip on top shows the days the decision could be made.">
      <Puzzle id="riddle" {...puzzle} predict onshow={showAnswer} />
      <div class="tkc-controls" class:tkc-wait={!live} inert={live ? undefined : true}>
        <Slider id="r-avail" label="Each person is in" bind:value={availability} min={70} max={99} format={(v) => `${v}% of days`} />
        <Slider id="r-backup" label="Qualified stand-ins per role" bind:value={backups} min={0} max={3} format={(v) => (v === 0 ? 'None' : String(v))} />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg width={width} height={height} role="img" aria-label="Calendar of {COUNT} roles over {DAYS} working days. The decision could be made on {month.possibleDays} days.">
          {#each [0, 1, 2, 3] as wk}
            <text class="tkc-axis-label" x={dayX(wk * 5)} y="12">Week {wk + 1}</text>
          {/each}
          {#if !stacked}<text class="tkc-axis-label" x="0" y="26">{narrow ? 'Decision' : 'Decision possible'}</text>{/if}
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
          <span><span class="tkc-swatch sw-in"></span>Named person in</span>
          {#if backups > 0}<span><span class="tkc-swatch sw-cover"></span>Stand-in covers</span>{/if}
          <span><span class="tkc-swatch sw-gap"></span>Nobody in for this role</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-options)"></span>Decision possible</span>
          <span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Blocked</span>
        </div>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat label="Days this month the decision could be made" value="{month.possibleDays} of {DAYS}" sub="In the long run: {pct(odds.allCovered)} of days" />
        <Stat
          label="Longest wait for everyone to be in"
          value={month.longestWait === 0 ? 'No wait' : `${month.longestWait} working day${month.longestWait === 1 ? '' : 's'}`}
          sub={month.longestWait > 0 ? 'in a row with someone missing' : 'the decision never had to wait'}
          swatch="var(--tkc-conditions)"
        />
      </div>

      {#snippet model()}
        <p>Each person is in on {availability}% of days in the long run. Absences last three days on average, so they cluster the way holidays and training do.</p>
        <p>A role is covered on a day when its named person or any stand-in is in. The decision needs all six roles covered on the same day. Over many months that happens on {pct(odds.allCovered)} of days: {formula}.</p>
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
      day in three. The blocked days come in stretches, too: one person’s week of holiday stops everything that needs
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
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which decisions wait for everyone to be present, when a quorum of qualified people would do?">
      <p>
        A committee that needs all six members present is a chain of ANDs: with each member in 90% of the time, it can
        meet on about half of all days. One that can decide with any four of the six can meet on almost every day.
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
