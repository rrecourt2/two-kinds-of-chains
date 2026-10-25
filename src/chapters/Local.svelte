<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { agendaViews, MONDAYS, ROOM, LONE_URGENT } from '../lib/sim/fasttrack.js';

  // A prediction: before the first answer (or a hint) the slider goes up to 20%, the first marks, and the
  // average wait is held back; the rest opens after it.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('emergence'));

  // All eleven slider positions, computed once: the long run for the tiles, one quarter for the figure.
  const VIEWS = agendaViews();
  const NONE = VIEWS[0].long;

  let marked = $state(10); // a fast track already in use: the first state shows an urgent mark and a deferral
  let width = $state(560);
  const view = $derived(VIEWS[Math.round(marked / 10)]);

  // One decimal below 20 days, whole days above.
  const num = (v) => (v < 20 ? v.toFixed(1) : String(Math.round(v)));
  const days = (v) => `${num(v)} days`;

  // The agenda: one row per Monday, five places, then a dot for each paper still waiting.
  const wide = $derived(width >= 480);
  const S = $derived(wide ? 17 : 15);
  const GAP = 4;
  const ROW = $derived(S + 5);
  const HEAD = 24;
  const LABEL = 58; // room for the row header, Monday
  const placesEnd = $derived(LABEL + ROOM * S + (ROOM - 1) * GAP);
  const dotsX = $derived(placesEnd + (wide ? 22 : 14));
  // The dots keep one spacing across the slider, set by the longest queue at any position.
  const MOST = Math.max(...VIEWS.flatMap((v) => v.mondays.map((m) => m.waiting.urgent + m.waiting.ordinary)));
  const pitch = $derived(Math.max(4, Math.min(10, (width - dotsX - 2) / MOST)));
  const dotR = $derived(Math.min(3.4, pitch * 0.38));
  const H = $derived(HEAD + MONDAYS * ROW);

  const rows = $derived(
    view.mondays.map((m, k) => ({
      y: HEAD + k * ROW,
      places: Array.from({ length: ROOM }, (_, j) => m.places[j] ?? 'empty'),
      dots: [...Array(m.waiting.urgent).fill('urgent'), ...Array(m.waiting.ordinary).fill('ordinary')],
    })),
  );

  const share = $derived(marked === 0 ? 'no deal' : marked === 100 ? 'every deal' : `${marked}% of deals`);
  const ariaLabel = $derived.by(() => {
    const ms = view.mondays;
    const count = (kind) => ms.reduce((a, m) => a + m.places.filter((p) => p === kind).length, 0);
    const empty = ms.reduce((a, m) => a + ROOM - m.places.length, 0);
    const waiting = ms.map((m) => m.waiting.urgent + m.waiting.ordinary);
    return (
      `Thirteen Mondays with ${share} marked urgent: ${count('urgent')} urgent and ${count('ordinary')} ordinary papers decided, ` +
      `${count('deferred')} deferred unread, ${empty} places empty. After each meeting, between ${Math.min(...waiting)} and ` +
      `${Math.max(...waiting)} papers are still waiting.`
    );
  });

  // The tiles: the long run at this position.
  const saves = $derived(view.saving);
  const saveSub = $derived(
    saves === null ? 'every deal is marked; it passes no one' : `${num(view.long.urgent ?? LONE_URGENT)} days if marked, ${num(view.long.ordinary)} if not`,
  );

  // What the orange places cost this quarter, counted from the figure itself.
  const placesOf = (v, kind) => v.mondays.reduce((a, m) => a + m.places.filter((p) => kind === undefined || p === kind).length, 0);
  const lost = $derived(placesOf(view, 'deferred'));
  const used = $derived(placesOf(view));
  const usedNone = placesOf(VIEWS[0]);

  const puzzle = {
    goal: 'Each team marks its deal urgent whenever that is quicker for it. Once every team has chosen, what happens to the average wait?',
    choices: [
      { value: 'shorter', label: 'Shorter: urgent deals go first' },
      { value: 'same', label: 'The same: the line is only reordered' },
      { value: 'longer', label: 'Longer' },
    ],
    answer: 'longer',
    wrong: (v) =>
      v === 'shorter'
        ? 'That is what the first deals to be marked find. Watch the agenda as more teams mark theirs.'
        : 'Moving up the line alone would keep the average where it is. Watch the orange places as more teams mark their deals.',
    hints: [
      'Is marking still quicker for a team once most deals carry the mark?',
      'With every deal marked, nobody passes anybody. What is left of the fast track then?',
    ],
    found: 'Longer: with every deal marked urgent, the average wait grows almost fivefold, to about 19 working days.',
  };
</script>

<Chapter
  kicker="Shortcuts"
  title="The fast track"
  lede="When every team does what is best for its own deal, what happens to all the deals?"
  puzzle="emergence"
>
  {#snippet setup()}
    <p>
      Every deal’s chain of approvals passes through one shared link: the investment committee. It meets on Mondays and
      has room for five papers. About four deals are ready in a typical week, some weeks more, so most are heard the next
      Monday and the rest a week or two later.
    </p>
    <p>
      Then the bank opens a fast track: a deal marked urgent goes to the top of the agenda. Nothing else changes, except
      that an urgent paper reaches the committee before anyone has had time to read it, and now and then the committee
      defers it to the following Monday.
    </p>
    <p>Every team can mark its own deal urgent, and every team wants its deal decided soon.</p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="The committee’s agenda, Monday by Monday"
      sub="One quarter of Mondays: five places on each agenda, and the papers still waiting after the meeting."
      rules={[
        'Each Monday’s agenda has room for five papers; about four deals are ready a week.',
        'Urgent papers go to the top of the agenda, in the order they are ready.',
        'Read unprepared, one urgent paper in five is deferred a week.',
      ]}
    >
      <Puzzle id="emergence" {...puzzle} predict onshow={() => (marked = 100)} />
      <div class="tkc-controls">
        <Slider id="ft-urgent" label="Deals marked urgent" bind:value={marked} min={0} max={100} step={10} format={(v) => `${v}%`} ends={['None', 'All']} limit={live ? null : 20} limitNote="Above 20%: opens after your first answer." />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label={ariaLabel}>
          <text class="tkc-axis-title" x={LABEL - 8} y="13" text-anchor="end">Monday</text>
          <text class="tkc-axis-title" x={LABEL} y="13">Agenda</text>
          <text class="tkc-axis-title" x={dotsX} y="13">Still waiting</text>
          <line class="tkc-grid" x1={(placesEnd + dotsX) / 2} x2={(placesEnd + dotsX) / 2} y1={HEAD - 2} y2={H} />
          {#each rows as r, k (k)}
            {@const mid = r.y + ROW / 2}
            <text class="tkc-axis-label" x={LABEL - 8} y={mid + 4} text-anchor="end">{k + 1}</text>
            {#each r.places as kind, j (j)}
              {@const inset = kind === 'deferred' ? 1 : kind === 'empty' ? 0.5 : 0}
              <rect class="place {kind}" x={LABEL + j * (S + GAP) + inset} y={mid - S / 2 + inset} width={S - 2 * inset} height={S - 2 * inset} rx="3" />
            {/each}
            {#each r.dots as kind, i (i)}
              <circle class="dot {kind}" cx={dotsX + pitch / 2 + i * pitch} cy={mid} r={dotR} />
            {/each}
          {/each}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch sw ordinary"></span>Ordinary paper</span>
          <span><span class="tkc-swatch sw urgent"></span>Marked urgent</span>
          <span><span class="tkc-swatch sw deferred"></span>Deferred unread</span>
          <span><span class="tkc-swatch sw empty"></span>Empty place</span>
        </div>
        <p class="tkc-caption ft-caption">
          Orange: an urgent paper read unprepared and deferred. Its place is used, nothing is decided, and it comes back
          the next Monday. This quarter: {lost === 0 ? 'no places' : `${lost} place${lost === 1 ? '' : 's'}`} lost to
          deferrals; {used} of {ROOM * MONDAYS} places used{marked === 0 ? '' : ` (${usedNone} with no marks)`}.
        </p>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat label="Marking urgent saves" value={saves === null ? 'Nothing' : days(saves)} sub={saveSub} />
        <Stat
          label="Average wait, every deal"
          value={live ? days(view.long.average) : '—'}
          sub={!live ? 'Shown after your first answer' : marked === 0 ? 'with no urgent marks' : `${num(NONE.average)} days with no urgent marks`}
        />
      </div>
      <p class="tkc-caption ft-loop">
        {saves === null
          ? 'Every deal is marked: nobody passes anybody now, and the loop has nothing left to feed on.'
          : 'Each mark pushes the unmarked deals back, so the next mark saves more: a loop that feeds itself.'}
      </p>

      {#snippet model()}
        <p>
          Deals become ready at random, about four a week (a Poisson count), each at a random moment in the week, and are
          heard from the next Monday on. Each Monday the committee hears up to five papers: urgent ones first, then
          ordinary ones, each in the order they became ready. At its first hearing an urgent paper is deferred with a
          chance of one in five; it keeps its place at the top and is decided the next Monday. A wait runs from the day a
          deal is ready to its decision, in working days. Every deal has a fixed rank, so each slider position marks the
          same deals. The tiles average 4,000 simulated years after a year’s warm-up; the figure shows the quarter whose
          waits come closest to those averages.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      What decided the wait was not where a deal stood in the line, but how full the agenda was, and the agenda was
      shared. The committee is the one link every deal’s chain passes through, so a paper that moves up the agenda moves
      another down.
    </p>
    <p>
      That is why the marks spread. The first ones save little: with one deal in ten marked, under a day. But each mark
      pushes the unmarked deals further back, so the next mark saves more: 6.6 days with half the deals marked, 78 with
      nine in ten. It is a loop, of the kind that feeds itself: every mark makes the next one more worth having, until
      nobody can afford to be the last deal without one.
    </p>
    <p>
      Going first, on its own, only reorders the line: one deal’s gain is another’s wait, and the average stays where it
      was. The deferrals are what stretch it. With every deal marked, they take 0.8 places a week, and the agenda goes
      from 80% to 96% full, past the tipping point on the queues chapter’s curve. The curve does the rest: the share of
      deals decided at their first Monday falls from 75% to 17%.
    </p>
    <p>
      A shortcut is judged by its first users, and its cost shows only when every deal takes it. The mathematician
      Dietrich Braess found the same on roads in 1968: a new road can slow every journey once every driver takes it.
      Here no step was added to any chain. One shared link became busier, and every chain that passes through it slowed.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our shortcuts would still save time if every deal took it?">
      <p>
        Most lenders have ways to move a deal up: an urgent flag, a paper tabled late with the chair’s consent, a waiver
        of the reading period. Each is easy to grant one deal at a time. The cost appears in the agenda as a whole: the
        share of papers marked urgent, and how often those are deferred unread.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .ft-caption,
  .ft-loop {
    text-wrap: pretty;
  }
  .ft-caption {
    margin-top: 6px;
  }
  .place {
    transition:
      fill 180ms ease,
      stroke 180ms ease;
  }
  .place.ordinary {
    fill: color-mix(in srgb, var(--tkc-ink-2) 34%, var(--tkc-surface));
  }
  .place.urgent {
    fill: var(--tkc-ink);
  }
  .place.deferred {
    fill: var(--tkc-surface);
    stroke: var(--tkc-conditions);
    stroke-width: 2;
  }
  .place.empty {
    fill: none;
    stroke: var(--tkc-rule);
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }
  .dot.ordinary {
    fill: color-mix(in srgb, var(--tkc-ink-2) 50%, var(--tkc-surface));
  }
  .dot.urgent {
    fill: var(--tkc-ink);
  }
  .sw.ordinary {
    background: color-mix(in srgb, var(--tkc-ink-2) 34%, var(--tkc-surface));
  }
  .sw.urgent {
    background: var(--tkc-ink);
  }
  .sw.deferred {
    background: var(--tkc-surface);
    box-shadow: inset 0 0 0 2px var(--tkc-conditions);
  }
  .sw.empty {
    box-sizing: border-box;
    border: 1px dashed var(--tkc-rule);
  }
  @media (prefers-reduced-motion: reduce) {
    .place {
      transition: none;
    }
  }
</style>
