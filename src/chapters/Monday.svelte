<script>
  import { getContext, untrack, tick } from 'svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import { diagnose } from '../lib/sim/diagnose.js';
  import { HORIZON } from '../lib/sim/systems.js';
  import { CHAPTERS } from './index.js';
  import { linear, barRight } from '../lib/scales.js';
  import { pct, shortDays } from '../lib/format.js';

  const go = getContext('tkc-go');
  const game = getContext('tkc-game');
  const prefix = getContext('tkc-id') ?? 'tkc';
  const total = getContext('tkc-total') ?? 12;
  const numberOf = (id) => CHAPTERS.findIndex((c) => c.id === id);

  let systems = $state(6);
  let problems = $state(10);
  let info = $state('copies');
  let approvals = $state('each');
  let availability = $state(85);
  let busy = $state(85);
  let standIns = $state(0);
  let width = $state(560);

  // Each change re-runs eight simulations, so wait until a slider rests for a moment.
  const read = () => ({ systems, problems: problems / 100, info, approvals, availability: availability / 100, busy: busy / 100, standIns });
  let inputs = $state(read());
  $effect(() => {
    const next = read();
    if (JSON.stringify(next) === JSON.stringify(untrack(() => inputs))) return;
    const id = setTimeout(() => (inputs = next), 150);
    return () => clearTimeout(id);
  });
  const d = $derived(diagnose(inputs));

  // The final challenge: the example process, made fast and safe without removing anything.
  const fair = $derived(inputs.systems >= 6 && inputs.problems >= 0.1 && inputs.availability <= 0.85);
  const fast = $derived(d.now.median <= 5);
  const safe = $derived(d.now.slipped < 0.02);
  const puzzle = $derived({
    goal: 'Final challenge: make the example process fast and safe without removing anything.',
    met: fair && fast && safe,
    checks: [
      { label: 'All six systems, a problem in one form in ten, approvers in on no more than 85% of days', ok: fair },
      { label: `Typical request five working days or fewer (now ${shortDays(d.now.median, HORIZON)})`, ok: fast },
      { label: `Problems slip through on fewer than 2% of requests (now ${pct(d.now.slipped, 1)})`, ok: safe },
    ],
    hints: ['Three earlier chapters each hold part of the answer: the riddle, linked systems and queues.', 'Start with how the systems get their data. Then ask who covers for an approver who is away, and how full their days are.'],
    found: 'One shared record, every approval kept and run side by side, and a stand-in for every approver, with a little spare capacity. The same six systems and the same checks: four working days instead of 24.',
  });
  const showAnswer = () => ((systems = 6), (problems = 10), (availability = 85), (info = 'shared'), (approvals = 'each'), (standIns = 1), (busy = 70));

  // The reader's score across every puzzle in the story.
  const entries = $derived(game.ids.map((id) => ({ id, ...game.entry(id) })));
  const unaided = $derived(entries.filter((e) => e.status === 'solved' && e.points === 2).length);
  const nameOf = (id) => (id === 'start' ? 'The opening' : `${numberOf(id)}. ${CHAPTERS[numberOf(id)].short}`);
  const standing = (e) => (e.status === 'solved' ? `${e.points} point${e.points === 1 ? '' : 's'}` : e.status === 'shown' ? 'answer shown' : 'open');
  let confirming = $state(false);
  let keepEl = $state();
  let againEl = $state();
  async function confirmFirst(on) {
    confirming = on;
    await tick();
    (on ? keepEl : againEl)?.focus();
  }
  function startAgain() {
    confirming = false;
    game.reset();
    go('start');
  }
  const rows = $derived([...d.options, { id: 'together', label: d.together.label, median: d.together.median, p90: d.together.p90, slipped: d.together.slipped, together: true }]);

  // Lever chart: horizontal bars of the typical lead time. On a phone each label sits above its bar.
  const stacked = $derived(width < 520);
  const rowH = $derived(stacked ? 44 : 34);
  const labelW = $derived(stacked ? 0 : Math.min(230, width * 0.46));
  const H = $derived(rows.length * rowH + 30);
  const xMax = $derived(Math.max(d.now.median, ...rows.map((r) => r.median)) * 1.15 || 1);
  const x = $derived(linear(0, xMax, labelW, width - 44));

  const moves = [
    { title: 'Alternatives everywhere', text: 'Every approval can be given by more than one qualified person, and every critical system has a tested fallback. No link depends on one name.', ch: 'riddle' },
    { title: 'Data entered once, at its source', text: 'Each piece of data has one home, close to the people who create it. Every system reads it from there, and checks run as it is typed, so a problem is caught before anything is built on it.', ch: 'systems' },
    { title: 'Spare capacity', text: 'Key reviewers and key systems run below about 80% of capacity, and share one queue.', ch: 'queues' },
    { title: 'Work in parallel', text: 'Every piece that can start, starts. Reviews run side by side on the same record, not one after another.', ch: 'async' },
    { title: 'Measure the whole', text: 'Every team shares one measure of the whole journey, from request to answer, and each measure comes with its counterpart: speed with errors, volume with quality.', ch: 'emergence' },
    { title: 'Tools before gates', text: 'AI and automation carry complexity for people as tools, not as extra steps. Their value lies in the steps and waits they remove.', ch: 'tools' },
    { title: 'Care in proportion to the risk', text: 'Small, reversible decisions get light checks, or a sample checked while the work flows on. Decisions that cannot be undone get several reviewers working at the same time.', ch: 'ergodicity' },
    { title: 'Hubs with a second route', text: 'The people, committees and systems that everything passes through each have a deputy or a fallback, and enough slack to absorb a busy week.', ch: 'contagion' },
    { title: 'Claims that have met a test', text: 'Fire drills, reverse stress tests and near misses test the safest-looking assumptions. Waiting, rework and abandoned requests are counted alongside incidents, so the cost of a control is as visible as its reason.', ch: 'black-swans' },
    { title: 'Work in modules', text: 'Work is saved in finished pieces, each with a clear owner and a clear interface, so an interruption costs only the piece in hand and trouble in one part stays there.', ch: 'modules' },
  ];

  const sources = [
    ['Adam Smith', '1776', 'The Wealth of Nations, Book I, chapters 1 and 3', 'The pin workshop; the division of labour is limited by the extent of the market.'],
    ['Leonard E. Read', '1958', '“I, Pencil”', 'No single person knows how to make a pencil.'],
    ['OECD', '', 'Global value chains and trade', 'About 70% of international trade involves global value chains.'],
    ['Chris Miller', '2022', 'Chip War', 'How the semiconductor industry split into a long chain of specialists.'],
    ['George Labovitz and Yu Sang Chang', '1992', 'The 1-10-100 rule', 'A data error costs far more to fix the longer it survives. The rule is commonly attributed to them; we found no primary publication.'],
    ['J. F. C. Kingman', '1961', '“The single server queue in heavy traffic”, Proceedings of the Cambridge Philosophical Society', 'Why waiting explodes near full utilization.'],
    ['Adrian Bagust, Michael Place and John Posnett', '1999', '“Dynamics of bed use in accommodating emergency admissions”, BMJ', 'Why hospitals run into bed crises above about 85% occupancy.'],
    ['Donald Reinertsen', '2009', 'The Principles of Product Development Flow', 'Queues, utilization and batch size in knowledge work.'],
    ['Andrew S. Grove', '1983', 'High Output Management', 'The breakfast factory: the limiting step, catching problems at the lowest-value stage, gates and monitors, paired indicators.'],
    ['Yuki Sugiyama and colleagues', '2008', '“Traffic jams without bottlenecks”, New Journal of Physics', 'A jam that emerges on a circular track with no cause but the drivers themselves.'],
    ['Dietrich Braess', '1968', '“Über ein Paradoxon aus der Verkehrsplanung”, Unternehmensforschung', 'Adding a road can make every journey slower.'],
    ['Gina Kolata', '1990', '“What if they closed 42d Street and nobody noticed?”, The New York Times, 25 December', 'Braess’s paradox in Manhattan.'],
    ['Ole Peters', '2019', '“The ergodicity problem in economics”, Nature Physics', 'The coin game, and time averages versus ensemble averages.'],
    ['Ole Peters and Alexander Adamou', '2015', '“An evolutionary advantage of cooperation”', 'Pooling raises the growth rate a typical member experiences.'],
    ['Duncan J. Watts', '2002', '“A simple model of global cascades on random networks”, PNAS', 'Cascade windows and robust-yet-fragile networks.'],
    ['Prasanna Gai and Sujit Kapadia', '2010', '“Contagion in financial networks”, Proceedings of the Royal Society A', 'The interbank model behind chapter 9.'],
    ['Andrew Haldane', '2009', '“Rethinking the financial network”, speech, Amsterdam', 'The financial system as robust yet fragile.'],
    ['Andrew Haldane and Robert May', '2011', '“Systemic risk in banking ecosystems”, Nature', 'A central banker and an ecologist on banks as an ecosystem.'],
    ['Karl Popper', '1959', 'The Logic of Scientific Discovery', 'Theories can be falsified, never proven by examples.'],
    ['Peter C. Wason', '1966', '“Reasoning”, in New Horizons in Psychology', 'The selection task: most people test a rule by looking for cases that agree with it.'],
    ['Bertrand Russell', '1912', 'The Problems of Philosophy, chapter 6', 'The chicken fed every day of its life.'],
    ['Gary Klein', '2007', '“Performing a project premortem”, Harvard Business Review', 'Imagine the project has failed, then ask why.'],
    ['Nassim Nicholas Taleb', '2012, 2018', 'Antifragile; Skin in the Game', 'Convexity, and one person at the casino a hundred times.'],
    ['David Weston, Microsoft', '2024', '“Helping our customers through the CrowdStrike outage”, Official Microsoft Blog, 20 July', 'About 8.5 million Windows devices affected.'],
    ['Lian Pin Koh and colleagues', '2004', '“Species coextinctions and the biodiversity crisis”, Science', 'Species that disappear with the species they depend on.'],
    ['Herbert A. Simon', '1962', '“The Architecture of Complexity”, Proceedings of the American Philosophical Society', 'The watchmakers Hora and Tempus, and why modular systems survive.'],
    ['John Gall', '1975', 'General Systemantics', 'A complex system that works has evolved from a simple system that worked.'],
    ['Frederick P. Brooks', '1975', 'The Mythical Man-Month', 'Adding people to a late project makes it later.'],
    ['Luís Bettencourt and colleagues', '2007', '“Growth, innovation, scaling, and the pace of life in cities”, PNAS', 'Why bigger cities produce more per person.'],
    ['W. Brian Arthur', '1989', '“Competing Technologies, Increasing Returns, and Lock-In by Historical Events”, Economic Journal', 'Markets that tip to a winner decided by early luck.'],
    ['William Jack and Tavneet Suri', '2014', '“Risk Sharing and Transactions Costs: Evidence from Kenya’s Mobile Money Revolution”, American Economic Review', 'How fast M-Pesa spread, and what it did for households.'],
    ['David Autor and colleagues', '2020', '“The Fall of the Labor Share and the Rise of Superstar Firms”, Quarterly Journal of Economics', 'Sales concentrating in fewer, larger firms.'],
    ['Réka Albert, Hawoong Jeong and Albert-László Barabási', '2000', '“Error and attack tolerance of complex networks”, Nature', 'Hub networks shrug off random failures and collapse when a hub fails.'],
  ];
</script>

<article class="monday" aria-labelledby="{prefix}-chapter-title">
  <header class="head">
    <div class="tkc-eyebrow">Chapter {total} of {total} · Playbook</div>
    <h2 class="tkc-display tkc-chapter-title" id="{prefix}-chapter-title" tabindex="-1">What it means on Monday</h2>
    <p class="tkc-lede">The controls can stay. What changes is their shape. Two questions sort any step in a process: does it do the work or check it, and is there an alternative when it is unavailable?</p>
  </header>

  <div class="matrix" role="table" aria-label="Two-question test for a step in a process">
    <div class="corner" role="presentation"></div>
    <div class="colhead" role="columnheader">There is an alternative</div>
    <div class="colhead" role="columnheader">Only one person or system can do it</div>

    <div class="rowhead" role="rowheader">It does the work</div>
    <div class="cell good" role="cell">
      <span class="cell-tag" aria-hidden="true">There is an alternative</span>
      <span class="cell-name">Specialization</span>
      <span>Good complexity. Protect it and give it volume. <em>Examples: a pool of credit analysts; a platform any team can use.</em></span>
    </div>
    <div class="cell" role="cell">
      <span class="cell-tag" aria-hidden="true">Only one person or system can do it</span>
      <span class="cell-name">Key-person risk</span>
      <span>Valuable but fragile. Train a second person, add a fallback. <em>Example: the one person who can fix a legacy system.</em></span>
    </div>

    <div class="rowhead" role="rowheader">It checks the work</div>
    <div class="cell" role="cell">
      <span class="cell-tag" aria-hidden="true">There is an alternative</span>
      <span class="cell-name">Light control</span>
      <span>Keep it fast and automatic where you can. <em>Examples: a check as data is typed; a four-eyes check by any qualified colleague.</em></span>
    </div>
    <div class="cell bad" role="cell">
      <span class="cell-tag" aria-hidden="true">Only one person or system can do it</span>
      <span class="cell-name">Bad complexity</span>
      <span>Redesign this first: keep the check and give it a second route. <em>Examples: a named sign-off everything waits for; a form that re-keys data another system already has.</em></span>
    </div>
  </div>

  <div class="grid">
    <section class="moves" aria-labelledby="{prefix}-moves">
      <h3 class="tkc-display moves-title" id="{prefix}-moves">Ten patterns</h3>
      <ol>
        {#each moves as move (move.title)}
          <li>
            <span class="move-title">{move.title}</span>
            <span class="move-text">{move.text}</span>
            <button type="button" class="see" onclick={() => go(move.ch)}>See chapter {numberOf(move.ch)}</button>
          </li>
        {/each}
      </ol>
    </section>

    <div class="tool">
      <Instrument title="Check a process you know" sub="Example values are filled in. Solve the challenge with them, then set them to match a real request.">
        <Puzzle id="monday" {...puzzle} onshow={showAnswer} />
        <div class="tkc-controls">
          <Slider id="m-n" label="Systems the request passes through" bind:value={systems} min={2} max={8} />
          <Slider id="m-p" label="Chance a form has a problem" bind:value={problems} min={0} max={30} format={(v) => `${v}%`} />
          <Segmented
            name="m-info"
            label="How systems get their data"
            bind:value={info}
            options={[
              { value: 'copies', label: 'Each copies the last' },
              { value: 'shared', label: 'One shared record' },
            ]}
          />
          <Segmented
            name="m-appr"
            label="Approvals"
            bind:value={approvals}
            options={[
              { value: 'each', label: 'At every system' },
              { value: 'end', label: 'Once, at the end' },
            ]}
          />
          <Slider id="m-avail" label="Approvers are in" bind:value={availability} min={60} max={99} format={(v) => `${v}% of days`} />
          <Slider id="m-busy" label="Approvers are busy" bind:value={busy} min={50} max={95} format={(v) => `${v}% of their time`} />
          <Slider id="m-stand" label="Stand-ins per approver" bind:value={standIns} min={0} max={3} />
        </div>

        <div class="tkc-stats tkc-stats--4" use:announce>
          <Stat label="Typical request" value="{shortDays(d.now.median, HORIZON)} days" sub="median, working days" />
          <Stat label="1 in 10 takes more than" value="{shortDays(d.now.p90, HORIZON)} days" />
          <Stat label="Problems that slip through" value={pct(d.now.slipped, d.now.slipped < 0.1 ? 1 : 0)} />
          <Stat label="Time actually worked" value={pct(d.now.workShare)} sub="of the elapsed working hours" />
        </div>

        <div class="tkc-chart" bind:clientWidth={width}>
          <div class="tkc-fig-title small">What would help most?</div>
          <p class="tkc-small">Typical lead time after each single change, from the same simulated requests.</p>
          <svg {width} height={H} role="img" aria-label="Typical lead time after each change.">
            <line class="today" x1={x(d.now.median)} x2={x(d.now.median)} y1="4" y2={H - 22} />
            <text class="tkc-axis-label" x={x(d.now.median)} y={H - 6} text-anchor="middle">As set: {shortDays(d.now.median, HORIZON)} days</text>
            {#each rows as r, i (r.id)}
              {@const yy = 8 + i * rowH}
              {@const by = stacked ? yy + 18 : yy + 4}
              <text class="tkc-label-2" x="0" y={stacked ? yy + 12 : yy + 15}>{r.label}</text>
              <path d={barRight(labelW, by, Math.max(2, x(r.median) - labelW), 16)} class="lever" class:together={r.together} />
              <text class="tkc-label tkc-halo" x={x(r.median) + 6} y={by + 12}>{shortDays(r.median, HORIZON)}</text>
            {/each}
          </svg>
          <details class="tkc-note">
            <summary>Numbers behind this chart</summary>
            <div class="tkc-scroll-x">
              <table class="tkc-table">
                <thead><tr><th>Change</th><th>Typical (days)</th><th>1 in 10 longer than (days)</th><th>Problems slip through</th></tr></thead>
                <tbody>
                  <tr><td>As set</td><td>{shortDays(d.now.median, HORIZON)}</td><td>{shortDays(d.now.p90, HORIZON)}</td><td>{pct(d.now.slipped, 1)}</td></tr>
                  {#each rows as r (r.id)}
                    <tr><td>{r.label}</td><td>{shortDays(r.median, HORIZON)}</td><td>{shortDays(r.p90, HORIZON)}</td><td>{pct(r.slipped, 1)}</td></tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </details>
        </div>

        {#snippet model()}
          <p>The linked-systems model from chapter 3, with approver absences of four days on average, plus busy approvers from chapter 4: a request waits in each approver’s queue behind other work, and stand-ins share that queue.</p>
          <p>Each bar applies one change and re-runs the same 1,000 requests. “Check data as it is typed” halves the chance that a form has a problem. The last bar applies every change except removing a system: every system stays{#if d.parallel}, but the approvals become one at the end. Keeping parallel approvals instead gives {shortDays(d.parallel.median, HORIZON)} days for a typical request, with {pct(d.parallel.slipped, 1)} of problems slipping through{/if}.</p>
        {/snippet}
      </Instrument>
    </div>
  </div>

  <section class="close" aria-label="Summary">
    <p class="tkc-display closing">
      <span class="tkc-or">Good complexity</span> multiplies options. <span class="tkc-and">Bad complexity</span> multiplies
      conditions. Scale multiplies whichever you have.
    </p>
    <p class="tkc-lede">
      A bank needs its checks. Simplicity is not fewer controls; it is fewer conditions.
    </p>
  </section>

  <section class="score-card" aria-labelledby="{prefix}-score">
    <h3 class="tkc-eyebrow" id="{prefix}-score">Your score</h3>
    <p class="score-big tkc-num">{game.score} <span>of {game.max} points</span></p>
    <p class="tkc-small">{game.solved} of {game.ids.length} puzzles solved{unaided ? `, ${unaided} of them without help` : ''}.</p>
    <ol class="all">
      {#each entries as e (e.id)}
        <li class:open={e.status === 'open'} class:full={e.status === 'solved' && e.points === 2}>
          {#if e.id === 'monday'}
            <span class="all-name">{nameOf(e.id)}</span>
          {:else}
            <button type="button" class="see all-name" onclick={() => go(e.id)}>{nameOf(e.id)}</button>
          {/if}
          <span class="all-pts">{standing(e)}</span>
        </li>
      {/each}
    </ol>
    <div class="tkc-row">
      {#if confirming}
        <p class="tkc-small confirm">This clears your {game.score} points and returns to the opening.</p>
        <button type="button" class="tkc-btn tkc-btn--small danger" onclick={startAgain}>Clear my score</button>
        <button type="button" class="see" bind:this={keepEl} onclick={() => confirmFirst(false)}>Keep it</button>
      {:else}
        <button type="button" class="tkc-btn tkc-btn--small" bind:this={againEl} onclick={() => confirmFirst(true)}>Start again</button>
      {/if}
    </div>
  </section>

  <section class="sources" aria-labelledby="{prefix}-sources">
    <h3 class="tkc-eyebrow" id="{prefix}-sources">Sources and further reading</h3>
    <ul>
      {#each sources as [who, year, what, why] (what)}
        <li><span class="src-who">{who}{year ? ` (${year})` : ''}.</span> <span class="src-what">{what}.</span> <span class="src-why">{why}</span></li>
      {/each}
    </ul>
    <p class="tkc-caption">
      All models in this story are deliberately simple, so their assumptions can be read in each “How this model
      works” note. They show the shape of each effect, not a forecast for any particular process.
    </p>
  </section>
</article>

<style>
  .monday {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: clamp(28px, 4.5cqi, 48px);
  }
  .head {
    display: grid;
    gap: 12px;
    max-width: 48rem;
  }
  .matrix {
    display: grid;
    grid-template-columns: minmax(80px, 0.5fr) 1fr 1fr;
    gap: 8px;
    max-width: 920px;
  }
  .colhead,
  .rowhead {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--tkc-ink-2);
    line-height: 1.3;
  }
  .colhead {
    align-self: end;
    padding: 0 4px 2px;
  }
  .rowhead {
    align-self: center;
  }
  .cell {
    display: grid;
    gap: 4px;
    align-content: start;
    padding: 14px 16px;
    border-radius: 12px;
    background: var(--tkc-surface);
    border: 1px solid var(--tkc-hair);
    font-size: 0.9375rem;
    line-height: 1.45;
    color: var(--tkc-ink-2);
  }
  .cell em {
    color: var(--tkc-muted);
    font-style: normal;
    display: block;
    margin-top: 4px;
    font-size: 0.875rem;
  }
  .cell-name {
    font-family: var(--tkc-font-display);
    font-weight: 600;
    font-size: 1.125rem;
    color: var(--tkc-ink);
  }
  .cell.good {
    background: var(--tkc-options-wash);
    border-color: var(--tkc-options);
  }
  .cell.bad {
    background: var(--tkc-conditions-wash);
    border-color: var(--tkc-conditions);
  }
  .cell-tag {
    display: none;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--tkc-muted);
  }
  @container tkc (max-width: 560px) {
    .matrix {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
    .corner {
      display: none;
    }
    .rowhead {
      grid-column: 1 / -1;
      padding-top: 6px;
    }
  }
  @container tkc (max-width: 420px) {
    .matrix {
      grid-template-columns: minmax(0, 1fr);
    }
    .colhead {
      display: none;
    }
    .cell-tag {
      display: block;
    }
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }
  @container tkc (min-width: 1000px) {
    .grid {
      grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
      column-gap: clamp(32px, 4cqi, 56px);
      align-items: start;
    }
  }
  .moves {
    display: grid;
    gap: 16px;
  }
  .moves-title {
    font-size: 1.375rem;
    line-height: 1.2;
  }
  .moves ol {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 14px;
    counter-reset: move;
  }
  .moves li {
    counter-increment: move;
    display: grid;
    gap: 2px;
    padding-left: 40px;
    position: relative;
  }
  .moves li::before {
    content: counter(move);
    position: absolute;
    left: 0;
    top: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1.5px solid var(--tkc-rule);
    display: grid;
    place-items: center;
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--tkc-ink-2);
  }
  .move-title {
    font-weight: 700;
  }
  .move-text {
    color: var(--tkc-ink-2);
    font-size: 0.9375rem;
    line-height: 1.5;
  }
  .see {
    justify-self: start;
    min-height: 32px;
    padding: 2px 0;
    border: 0;
    background: none;
    color: var(--tkc-options-ink);
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .small {
    font-size: 0.9375rem;
  }
  .today {
    stroke: var(--tkc-ink);
    stroke-width: 1;
  }
  .lever {
    fill: var(--tkc-ink-2);
    opacity: 0.75;
  }
  .lever.together {
    fill: var(--tkc-options);
    opacity: 1;
  }
  .close {
    display: grid;
    gap: 14px;
    max-width: 52rem;
    padding-top: 8px;
  }
  .closing {
    font-size: clamp(1.5rem, 1rem + 2.2cqi, 2.3rem);
    line-height: 1.22;
  }
  .closing .tkc-or,
  .closing .tkc-and {
    font-weight: 600;
    text-decoration-thickness: 4px;
    text-underline-offset: 6px;
  }
  .score-card {
    display: grid;
    gap: 8px;
    justify-items: start;
    max-width: 40rem;
    padding: 20px 22px;
    border-radius: 14px;
    border: 1px solid var(--tkc-hair);
    border-left: 4px solid var(--tkc-options);
    background: var(--tkc-surface);
  }
  .score-big {
    font-family: var(--tkc-font-display);
    font-size: 2.25rem;
    font-weight: 600;
    line-height: 1.1;
    color: var(--tkc-ink);
  }
  .score-big span {
    font-size: 1rem;
    font-weight: 500;
    color: var(--tkc-muted);
  }
  .all {
    margin: 4px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
    gap: 0 20px;
    width: 100%;
  }
  .all li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--tkc-hair);
  }
  .all-name {
    font-size: 0.875rem;
    min-height: 32px;
    display: inline-flex;
    align-items: center;
  }
  .all-pts {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--tkc-ink-2);
    white-space: nowrap;
  }
  .all li.full .all-pts {
    color: var(--tkc-options-ink);
  }
  .all li.open .all-pts {
    color: var(--tkc-muted);
    font-weight: 500;
  }
  .confirm {
    flex-basis: 100%;
  }
  .danger {
    color: var(--tkc-conditions-ink);
    border-color: var(--tkc-conditions);
  }
  .sources {
    display: grid;
    gap: 12px;
    border-top: 1px solid var(--tkc-hair);
    padding-top: 20px;
  }
  .sources ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px 32px;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
    font-size: 0.875rem;
    line-height: 1.45;
  }
  .src-who {
    font-weight: 600;
  }
  .src-what {
    color: var(--tkc-ink-2);
  }
  .src-why {
    color: var(--tkc-muted);
  }
</style>
