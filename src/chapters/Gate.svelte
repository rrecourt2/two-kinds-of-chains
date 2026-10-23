<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { INSTRUCTIONS, DESIGNS, REVIEW_DAYS, LAST_DAY, runDesign } from '../lib/sim/gate.js';
  import { linear } from '../lib/scales.js';

  // A prediction: the choice of design opens after the first answer or a hint.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('gate'));

  // The scenario is fixed, so each design is worked out once; switching only picks one.
  const RUNS = Object.fromEntries(DESIGNS.map((d) => [d.id, runDesign(d)]));
  let design = $state('named');
  let width = $state(560);
  const run = $derived(RUNS[design]);

  // ---- Words and numbers the text quotes, all from the model ----
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
  const num = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const dayCount = (v) => (v === Infinity ? 'never' : `${num(v)} day${v === 1 ? '' : 's'}`);
  const row = (id, key) => RUNS[id].rows.find((r) => r.id === key);
  const fraudId = INSTRUCTIONS.find((i) => i.fraud).id;
  const waitedB = row('named', 'B').reviewStart; // days B waits for its named reviewer
  const before = RUNS.named.avgValidDays;
  const after = RUNS.any.avgValidDays;
  const quicker = after - RUNS['pay-first'].avgValidDays;
  const foundLate = row('pay-first', fraudId).foundAt;
  const awayUntil = INSTRUCTIONS.find((i) => i.named > 0).named;

  const rules = [
    `Three payment instructions, A to C, ask to change where the money goes; ${fraudId} is fraudulent.`,
    `A check takes ${words[REVIEW_DAYS]} day, and it always catches the fraud.`,
    `B’s and C’s named reviewer is away until day\u00a0${awayUntil}; a qualified deputy is in.`,
    'Money paid to a fraudster cannot be recovered.',
  ];

  const puzzle = {
    goal: 'Payments wait for the check, and clients complain. Which change makes valid payments quicker without letting the fraudulent one through?',
    choices: [
      { value: 'pay-first', label: 'Pay first, check after' },
      { value: 'any', label: 'Let any qualified reviewer do the check' },
      { value: 'neither', label: 'Neither: speed and safety trade off' },
    ],
    answer: 'any',
    wrong: (v) =>
      v === 'pay-first'
        ? 'Valid payments would go out at once, but so would the fraudulent one. What can a check do once the money has gone?'
        : `Here they need not. What does instruction B wait ${words[waitedB]} days for: the check, or one person?`,
    hints: [
      `The check takes ${words[REVIEW_DAYS]} day. Instruction B waits ${words[waitedB]} days before it, for one person to come back.`,
      'A check after the payment can find the fraud, but it cannot bring the money back.',
    ],
    found: `Let any qualified reviewer do the check. Valid payments go out after ${dayCount(after)} on average, against ${dayCount(before)} before, and the fraudulent instruction is still held. Paying first is ${quicker === 1 ? 'a day' : dayCount(quicker)} quicker still, and pays the fraudster.`,
  };
  const showAnswer = () => (design = 'any');

  // ---- One row per instruction, days 0 to 6 ----
  const PAD = 8;
  const TOP = 3;
  const TRACK = 24;
  const MID = TOP + TRACK / 2;
  const H = TOP + TRACK + 18;
  // The chart can measure 0 for a moment while the chapter mounts; keep the scale the right way round.
  const span = $derived(Math.max(width, 120));
  const x = $derived(linear(0, LAST_DAY, PAD, span - PAD));
  const dayW = $derived((span - 2 * PAD) / LAST_DAY);
  // Room for a label of 11px SVG text (a little generous; bold runs wider) after a lead-in.
  const textW = (s, bold = false) => s.length * (bold ? 6.5 : 6.1);
  const fits = (s, space, lead = 6, bold = false) => lead + textW(s, bold) + 4 <= space;

  const checkFirst = $derived(DESIGNS.find((d) => d.id === design).checkFirst);
  const truth = (r) => (r.fraud ? 'fraudulent' : 'valid');
  const away = (ins) => (ins.named === 0 ? 'named reviewer in' : ins.named === null ? 'named reviewer away' : `named reviewer away until day\u00a0${ins.named}`);
  const by = (r) => (r.checkedBy === 'deputy' ? 'by the deputy' : 'by the named reviewer');
  const outcome = (r) =>
    r.outcome === 'paid'
      ? `Paid on day\u00a0${r.paidAt}`
      : r.outcome === 'held'
        ? `Held on day\u00a0${r.foundAt}, not paid`
        : r.outcome === 'paid-fraud'
          ? `Paid to a fraudster on day\u00a0${r.paidAt}${r.foundAt !== null ? `; found on day\u00a0${r.foundAt}` : ''}`
          : 'Still waiting';
  const describe = (r) => {
    const checked = r.reviewStart === null ? 'never checked' : `checked ${by(r)} from day ${r.reviewStart} to day ${r.reviewEnd}`;
    if (!checkFirst) {
      const end = r.outcome === 'paid-fraud' ? (r.foundAt === null ? 'the fraud is never found' : `the fraud is found on day ${r.foundAt}, after the money has gone`) : 'it passes';
      return `Instruction ${r.id}, ${truth(r)}: paid on day ${r.paidAt}, before any check; ${checked}; ${end}.`;
    }
    const waits = r.reviewStart === null ? 'waiting throughout' : r.reviewStart > 0 ? `waits until day ${r.reviewStart}, ` : '';
    return `Instruction ${r.id}, ${truth(r)}: ${waits}${r.reviewStart === null ? '' : `${checked}; `}${outcome(r).toLowerCase()}.`;
  };
  // The reviewer's name sits under the check, kept inside the chart at the edges.
  const whoAt = (r) => {
    const s = by(r);
    const cx = (x(r.reviewStart) + x(r.reviewEnd)) / 2;
    const half = textW(s) / 2;
    if (cx - half < 0) return { s, tx: Math.max(0, x(r.reviewStart) - 6), anchor: 'start' };
    if (cx + half > width) return { s, tx: Math.min(width, x(r.reviewEnd) + 6), anchor: 'end' };
    return { s, tx: cx, anchor: 'middle' };
  };
  const waitEnd = (r) => (r.reviewStart === null ? LAST_DAY : Math.min(r.reviewStart, LAST_DAY));
  // Paying first, any wait for the check comes after the payment.
  const waitFrom = (r) => (!checkFirst && r.paidAt !== null ? r.paidAt : 0);
  const waitLabel = (r) => {
    const space = (waitEnd(r) - waitFrom(r)) * dayW;
    const long = r.checkedBy === 'named' ? 'waiting for the named reviewer' : 'waiting';
    return fits(long, space) ? long : fits('waiting', space) ? 'waiting' : '';
  };
  const bandLabel = (long, short, from, lead) => {
    const space = (LAST_DAY - from) * dayW;
    return fits(long, space, lead, true) ? long : fits(short, space, lead, true) ? short : '';
  };

  const validSub = $derived.by(() => {
    const valid = run.rows.filter((r) => !r.fraud);
    const days = [...new Set(valid.map((r) => r.paidAt))];
    if (days.length === 1) return days[0] === null ? 'not paid yet' : `${valid.map((r) => r.id).join(' and ')} on day ${days[0]}`;
    return valid.map((r) => `${r.id} on day ${r.paidAt ?? '–'}`).join(', ');
  });
  const fraudRow = $derived(run.rows.find((r) => r.fraud));
  const fraudSub = $derived(
    fraudRow.outcome === 'held'
      ? `${fraudRow.id} was held on day ${fraudRow.foundAt}`
      : `${fraudRow.id} was found on day ${fraudRow.foundAt}, after the money had gone`,
  );
</script>

<Chapter
  n={12}
  kicker="Gates"
  title="The gate worth keeping"
  lede="Some checks earn their wait, because the step after them cannot be undone."
  puzzle="gate"
>
  {#snippet setup()}
    <p>
      Most of this story has counted conditions as costs: links that must all hold, and waits for someone to be free.
      Some are worth keeping. The person in the loop of the previous chapter checked work that could be undone; a bad
      draft was dropped and little was lost. Some steps cannot be undone, and money sent to the wrong account is the
      plainest of them.
    </p>
    <p>
      Before a disbursement, a payment instruction sometimes asks for the money to go to a different bank account.
      Most such requests are genuine: a client has changed banks. A few come from fraudsters who have copied a real
      letterhead and timed their letter to the payment. Once that money has landed, it is usually gone.
    </p>
    <p>
      So every change of account is checked before the money moves, by the reviewer named on the loan. This week three
      such instructions arrive at once, and the named reviewer on two of them is away.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="Three payment instructions, day by day"
      sub="Each row is one instruction to change the account the money goes to, from the day it arrives (day 0)."
      {rules}
    >
      <Puzzle id="gate" {...puzzle} predict onshow={showAnswer} />
      <div class="tkc-controls tkc-controls--wide" class:tkc-wait={!live} inert={live ? undefined : true}>
        <Segmented name="g-design" label="The design" bind:value={design} options={DESIGNS.map((d) => ({ value: d.id, label: d.label }))} />
      </div>

      <div class="tkc-chart timeline" bind:clientWidth={width}>
        {#each run.rows as r, k (r.id)}
          {@const ins = INSTRUCTIONS[k]}
          <section class="item" aria-label="Instruction {r.id}">
            <div class="item-head">
              <p class="item-name"><strong>{r.id}</strong> · {truth(r)} · <span>{away(ins)}</span></p>
              <p class="item-out">
                <span class="tkc-swatch mark {r.outcome}" aria-hidden="true"></span>{outcome(r)}
              </p>
            </div>
            <svg {width} height={H} role="img" aria-label={describe(r)}>
              {#each Array(LAST_DAY + 1) as _, d (d)}
                <line class="tkc-grid" x1={x(d)} x2={x(d)} y1={TOP} y2={TOP + TRACK} />
              {/each}
              {#if waitEnd(r) > waitFrom(r)}
                {@const label = waitLabel(r)}
                <rect class="wait" x={x(waitFrom(r)) + 0.5} y={TOP + 0.5} width={x(waitEnd(r)) - x(waitFrom(r)) - 1} height={TRACK - 1} rx="4" />
                {#if label}<text class="in-text" x={x(waitFrom(r)) + 6} y={MID + 4}>{label}</text>{/if}
              {/if}
              {#if r.outcome === 'held'}
                {@const label = bandLabel('held, not paid', 'held', r.reviewEnd, 9)}
                <rect class="held-band" x={x(r.reviewEnd)} y={TOP} width={x(LAST_DAY) - x(r.reviewEnd)} height={TRACK} rx="4" />
                {#if label}<text class="in-text held-text" x={x(r.reviewEnd) + 9} y={MID + 4}>{label}</text>{/if}
              {/if}
              {#if r.outcome === 'paid-fraud' && r.foundAt !== null}
                {@const label = bandLabel('fraud found; money gone', 'money gone', r.foundAt, 6)}
                <rect class="gone-band" x={x(r.foundAt)} y={TOP} width={x(LAST_DAY) - x(r.foundAt)} height={TRACK} rx="4" />
                {#if label}<text class="in-text gone-text" x={x(r.foundAt) + 6} y={MID + 4}>{label}</text>{/if}
              {/if}
              {#if r.reviewStart !== null && r.reviewEnd > r.reviewStart}
                {@const who = whoAt(r)}
                <rect class="check" x={x(r.reviewStart)} y={TOP} width={x(r.reviewEnd) - x(r.reviewStart)} height={TRACK} rx="4" />
                <text class="who" x={who.tx} y={TOP + TRACK + 13} text-anchor={who.anchor}>{who.s}</text>
              {/if}
              {#if r.outcome === 'held'}
                <rect class="held-mark" x={x(r.reviewEnd) - 2} y={TOP - 2} width="4" height={TRACK + 4} rx="1.5" />
              {/if}
              {#if r.paidAt !== null}
                <circle class="dot {r.outcome}" cx={x(r.paidAt)} cy={MID} r="7" />
              {/if}
            </svg>
          </section>
        {/each}
        <svg {width} height="34" role="img" aria-label="Days 0 to {LAST_DAY} after the instructions arrive.">
          {#each Array(LAST_DAY + 1) as _, d (d)}
            <text class="tkc-axis-label" x={x(d)} y="12" text-anchor="middle">{d}</text>
          {/each}
          <text class="tkc-axis-label" x="0" y="29">days after the instructions arrive</text>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw-wait"></span>Waiting</span>
          <span><span class="tkc-swatch sw-check"></span>Check, one day</span>
          <span><span class="tkc-swatch mark paid"></span>Paid</span>
          <span><span class="tkc-swatch mark held"></span>Held, not paid</span>
          <span><span class="tkc-swatch mark paid-fraud"></span>Paid to a fraudster</span>
        </div>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat label="Average days until a valid payment is made" value={dayCount(run.avgValidDays)} sub={validSub} swatch="var(--tkc-options)" />
        <Stat label="Fraudulent payments made" value="{run.fraudPaid} of {run.fraudTotal}" sub={fraudSub} swatch="var(--tkc-conditions)" />
      </div>

      {#snippet model()}
        <p>Each instruction is checked by the first qualified reviewer who is in. With the named reviewer only, A is checked on day 0, and B and C on day {awayUntil}, when their reviewer is back. With any qualified reviewer, the deputy takes B and C on day 0 and the named reviewer keeps A. The deputy works from the same evidence, with the same authority; only who may do the check changes.</p>
        <p>A check takes {words[REVIEW_DAYS]} day and always gets the answer right. A valid instruction is paid the moment it passes; the fraudulent one is flagged and held. Paying first sends all three on day 0 and checks them afterwards, by any qualified reviewer, so the fraud is found on day {foundLate}, after the money has gone. The scenario stipulates that money paid to a fraudster cannot be recovered.</p>
        <p>Delay and loss are kept apart: the model puts no price on a day’s wait against a lost payment. The average counts the valid instructions only, from the day they arrive.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      The check stays where it was, in front of the money, and nothing about it is weaker: the same evidence, the same
      authority, the same day’s work. What changed is who may do it. Instruction B waited {words[waitedB]} days for one
      person to come back, for a check that takes {words[REVIEW_DAYS]}.
    </p>
    <p>
      In the language of this story, the gate is still an <span class="tkc-and">AND</span>: no change of account is paid
      unchecked. Inside it there is now an <span class="tkc-or">OR</span>: any qualified reviewer may open it. These are
      the stand-ins of chapter 1, now in front of a step that cannot be undone. A gate like this is good complexity. It
      does work that nothing else in the chain can do, and its cost was never the check, only the queue for one name.
    </p>
    <p>
      Paying first takes the wait away and keeps the check, which still finds the fraud on day {foundLate}. By then the
      check has become an inquest. It can say what went wrong; it cannot stop it.
    </p>
    <h3>Where a gate earns its wait</h3>
    <p>
      The line runs between what can be undone and what cannot. Where a mistake is small, visible and easy to put right, the
      work can move on and be checked afterwards, as autopilot can in chapter 11. Where it cannot, the check has to come first, and the
      wait is worth paying, as long as it is the check’s own wait and not one person’s diary. Chapter 15 asks the
      same question of a whole loan: which conditions must be met before the money moves, and which can follow it.
    </p>
    <p>
      Real checks are less clean. They miss some frauds and hold up some valid payments while a client is called back;
      the model assumes this one is always right. Neither changes what the deputy does to the wait.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our gates stand in front of something that cannot be undone, and which merely wait for one person?">
      <p>
        A payment, a signature on a binding contract and data sent outside the bank cannot be called back, and a check
        in front of them earns its wait. A sign-off in front of a step that can be corrected afterwards, or one that only a
        single named person may give, is a different kind of gate.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .timeline {
    display: grid;
    gap: 10px;
  }
  .item {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .item-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 0 14px;
    font-size: 0.8125rem;
    line-height: 1.4;
  }
  .item-name {
    margin: 0;
    color: var(--tkc-ink-2);
  }
  .item-name strong {
    color: var(--tkc-ink);
    font-size: 0.9375rem;
  }
  .item-name span {
    color: var(--tkc-muted);
  }
  .item-out {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--tkc-ink);
  }
  .item svg,
  .timeline > svg {
    display: block;
  }
  /* Outcome keys, in the row headings and the legend. */
  .mark.paid,
  .mark.paid-fraud {
    border-radius: 50%;
  }
  .mark.paid {
    background: var(--tkc-options);
  }
  .mark.paid-fraud {
    background: var(--tkc-conditions);
  }
  .mark.held {
    width: 4px;
    border-radius: 1.5px;
    background: var(--tkc-ink);
  }
  .mark.waiting {
    background: var(--tkc-surface);
    border: 1px dashed var(--tkc-muted);
  }
  .sw-wait {
    background: var(--tkc-surface);
    border: 1px dashed var(--tkc-muted);
  }
  .sw-check {
    background: var(--tkc-ink-2);
  }
  /* Chart marks */
  .wait {
    fill: var(--tkc-surface);
    stroke: var(--tkc-muted);
    stroke-width: 1;
    stroke-dasharray: 3 2;
  }
  .check {
    fill: var(--tkc-ink-2);
  }
  .held-band {
    fill: var(--tkc-sunken);
  }
  .held-mark {
    fill: var(--tkc-ink);
  }
  .gone-band {
    fill: var(--tkc-conditions-wash);
    stroke: var(--tkc-conditions);
    stroke-width: 1;
  }
  .dot {
    stroke: var(--tkc-surface);
    stroke-width: 2;
  }
  .dot.paid {
    fill: var(--tkc-options);
  }
  .dot.paid-fraud {
    fill: var(--tkc-conditions);
  }
  .in-text {
    font-size: 11px;
    fill: var(--tkc-ink-2);
  }
  .held-text {
    font-weight: 600;
    fill: var(--tkc-ink);
  }
  .gone-text {
    font-weight: 600;
    fill: var(--tkc-conditions-ink);
  }
  .who {
    font-size: 11px;
    fill: var(--tkc-muted);
  }
</style>
