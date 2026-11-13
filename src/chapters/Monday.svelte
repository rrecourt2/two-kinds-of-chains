<script>
  import { getContext, tick } from 'svelte';
  import { CHAPTERS, PARTS } from './index.js';

  const go = getContext('tkc-go');
  const game = getContext('tkc-game');
  const prefix = getContext('tkc-id') ?? 'tkc';
  const total = getContext('tkc-total') ?? 12;
  const numberOf = (id) => CHAPTERS.findIndex((c) => c.id === id);

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

  const moves = [
    { title: 'Alternatives everywhere', text: 'Every approval can be given by more than one qualified person: a standing deputy, or any of a pool. No link depends on one name.', ch: 'riddle' },
    { title: 'Specialists where the volume carries them', text: 'A specialist role pays where there is enough work to keep it busy; below that volume, the extra link is mostly idle time.', ch: 'specialization' },
    { title: 'Work in pieces that hold', text: 'Long work is agreed in finished pieces, each with a clear owner, so a late objection or a lapsed approval costs only the piece in hand.', ch: 'modules' },
    { title: 'Slack and one shared line', text: 'The people that everything waits for are kept well short of full, and work waits in one line that any qualified colleague can take from.', ch: 'queues' },
    { title: 'Delegations as varied as the world', text: 'Offices may decide the kinds of request they actually meet, and hold principles for the ones nobody listed, so what reaches head office is the truly new rather than the merely unlisted.', ch: 'variety' },
    { title: 'Bets sized to survive a bad run', text: 'Each risk is sized so that a bad run cannot end the game, and risks are pooled across units whose luck is independent of each other.', ch: 'ergodicity' },
    { title: 'Buffers where the links meet', text: 'Spare capacity sits with the people, committees and counterparties that everything passes through, and it is big enough to cover what would hit them.', ch: 'contagion' },
    { title: 'Gates sized to the loss', text: 'Where fraud is rare, most checks fall on genuine clients; a check earns its wait where one loss would be too large to survive, and is sampled lightly where losses can be borne.', ch: 'gate' },
    { title: 'A person where the AI swings', text: 'Where AI or automation is erratic, a person keeps the good results and drops the bad ones before they move on; autopilot is kept for work that is steady, or whose mistakes are small, visible and easy to undo.', ch: 'tools' },
    { title: 'Pilots that can be stopped', text: 'Where nobody can tell in advance what will work, several small pilots go first, each cheap to stop, and the money follows the one that works.', ch: 'tinkering' },
    { title: 'Limits that remember at the world’s pace', text: 'A limit set from last year alone swings with every bad year; one set from twenty years misses a country that has changed. The memory that serves best lengthens and shortens with how often the world changes.', ch: 'pace' },
    { title: 'Conditions that bend', text: 'Every condition stays on the list; a late document can be met another way where one exists, and a condition that need not come first follows the money as an undertaking with a deadline.', ch: 'disbursement' },
  ];
  // The patterns under the story's five parts, each with what the part was about in a bank's terms.
  const ABOUT = ['what makes a long chain work', 'where the time goes', 'where the losses come from', 'how a bank gets better at both', 'both at once'];
  const groups = PARTS.map((part, k) => ({ part, about: ABOUT[k], moves: moves.filter((m) => CHAPTERS[numberOf(m.ch)].part === k + 1) }));

  const sources = [
    ['Amos Tversky and Daniel Kahneman', '1974', '“Judgment under uncertainty: heuristics and biases”, Science', 'People overestimate the chance that every link in a chain of likely events holds.'],
    ['Leonard E. Read', '1958', '“I, Pencil”', 'No single person knows how to make a pencil.'],
    ['Adam Smith', '1776', 'The Wealth of Nations, Book I, chapters 1 and 3', 'The pin workshop; the division of labour is limited by the extent of the market.'],
    ['OECD', '2020', '“Trade policy implications of global value chains”, Trade Policy Brief', 'About 70% of international trade involves global value chains.'],
    ['Chris Miller', '2022', 'Chip War', 'How the semiconductor industry split into a long chain of specialists.'],
    ['Herbert A. Simon', '1962', '“The Architecture of Complexity”, Proceedings of the American Philosophical Society', 'The watchmakers Hora and Tempus, and why modular systems survive.'],
    ['John Gall', '1975', 'General Systemantics', 'A complex system that works has evolved from a simple system that worked.'],
    ['J. F. C. Kingman', '1961', '“The single server queue in heavy traffic”, Proceedings of the Cambridge Philosophical Society', 'Why waiting explodes near full utilization.'],
    ['Adrian Bagust, Michael Place and John Posnett', '1999', '“Dynamics of bed use in accommodating emergency admissions”, BMJ', 'Why hospitals run into bed crises above about 85% occupancy.'],
    ['Donald Reinertsen', '2009', 'The Principles of Product Development Flow', 'Queues, utilization and batch size in knowledge work.'],
    ['W. Ross Ashby', '1956', 'An Introduction to Cybernetics, chapter 11, “Requisite variety”', 'Only variety can destroy variety: a regulator copes only with as many kinds of disturbance as it has kinds of response.'],
    ['W. Ross Ashby', '1952', 'Design for a Brain', 'The homeostat, a machine that searched for its own stability.'],
    ['Ole Peters', '2019', '“The ergodicity problem in economics”, Nature Physics', 'The coin game, and time averages versus ensemble averages.'],
    ['Ole Peters and Alexander Adamou', '2015', '“An evolutionary advantage of cooperation”', 'Pooling raises the growth rate a typical member experiences.'],
    ['Nassim Nicholas Taleb', '2012, 2018', 'Antifragile; Skin in the Game', 'Antifragility and convex tinkering, and one person at the casino a hundred times.'],
    ['Duncan J. Watts', '2002', '“A simple model of global cascades on random networks”, PNAS', 'Cascade windows and robust-yet-fragile networks.'],
    ['Prasanna Gai and Sujit Kapadia', '2010', '“Contagion in financial networks”, Proceedings of the Royal Society A', 'The interbank model behind the stress test.'],
    ['Andrew Haldane', '2009', '“Rethinking the financial network”, speech, Amsterdam', 'The financial system as robust yet fragile.'],
    ['Andrew Haldane and Robert May', '2011', '“Systemic risk in banking ecosystems”, Nature', 'A central banker and an ecologist on banks as an ecosystem.'],
    ['Albert-László Barabási and Réka Albert', '1999', '“Emergence of scaling in random networks”, Science', 'Preferential attachment: how hubs grow.'],
    ['Réka Albert, Hawoong Jeong and Albert-László Barabási', '2000', '“Error and attack tolerance of complex networks”, Nature', 'Hub networks shrug off random failures and collapse when a hub fails.'],
    ['Basel Committee on Banking Supervision', '2011', '“Global systemically important banks: assessment methodology and the additional loss absorbency requirement”', 'Capital surcharges of 1 to 3.5 percentage points for the most systemic banks.'],
    ['Basel Committee on Banking Supervision', '2012', '“A framework for dealing with domestic systemically important banks”', 'National surcharges for banks that matter at home.'],
    ['Basel Committee on Banking Supervision', '2006', 'International Convergence of Capital Measurement and Capital Standards (Basel II), paragraphs 463, 472 and 667', 'Operational-risk capital for the worst year in a thousand; at least five years of data for default rates, and seven for losses on loans to firms, banks and governments.'],
    ['Lisanne Bainbridge', '1983', '“Ironies of automation”, Automatica', 'Automation leaves people the hardest tasks and the least practice.'],
    ['Bent Flyvbjerg and Alexander Budzier', '2011', '“Why your IT project may be riskier than you think”, Harvard Business Review, September', '1,471 IT projects: an average cost overrun of 27%, and one in six overran by about 200%.'],
    ['Jack M. Guttentag and Richard J. Herring', '1986', '“Disaster myopia in international banking”, Essays in International Finance 164, Princeton University', 'The longer since the last shock, the less likely the next one seems, and the thinner the cushion held against it.'],
  ];
</script>

<article class="monday" aria-labelledby="{prefix}-chapter-title">
  <header class="head">
    <div class="tkc-eyebrow">Chapter {total} of {total} · Patterns</div>
    <h2 class="tkc-display tkc-chapter-title" id="{prefix}-chapter-title" tabindex="-1">What it means on Monday</h2>
    <p class="tkc-lede">Every link in this story added an option or a condition. What it cost depended on how long the chain was, and on the weather.</p>
  </header>

  <div class="matrix" role="table" aria-label="Options and conditions, in a short chain and a long one">
    <div class="corner" role="presentation"></div>
    <div class="colhead" role="columnheader">A short chain, calm weather</div>
    <div class="colhead" role="columnheader">A long chain, rough weather</div>

    <div class="rowhead" role="rowheader">A link that adds an option</div>
    <div class="cell" role="cell">
      <span class="cell-tag" aria-hidden="true">A short chain, calm weather</span>
      <span class="cell-name">Looks like waste</span>
      <span>Paid for every day, needed on few of them. <em>A stand-in who never stands in; a reviewer with time to spare; a person checking a steady AI; pilots when results are predictable.</em></span>
    </div>
    <div class="cell good" role="cell">
      <span class="cell-tag" aria-hidden="true">A long chain, rough weather</span>
      <span class="cell-name">Grows stronger</span>
      <span>The swings become choices. <em>The pencil’s thousands of suppliers; one shared line; pilots when nobody can tell what will work; a person in the loop of an erratic AI.</em></span>
    </div>

    <div class="rowhead" role="rowheader">A link that adds a condition</div>
    <div class="cell" role="cell">
      <span class="cell-tag" aria-hidden="true">A short chain, calm weather</span>
      <span class="cell-name">Barely felt</span>
      <span>Each link nearly always holds, and so, mostly, does the chain. <em>Hora’s ten parts in a row; twelve conditions when every party is prompt; an autopilot while the AI is steady.</em></span>
    </div>
    <div class="cell bad" role="cell">
      <span class="cell-tag" aria-hidden="true">A long chain, rough weather</span>
      <span class="cell-name">Stalls all at once</span>
      <span>Past the tipping point, each extra link costs more than the last. <em>Reviewers at 95%; a committee one kind of request past its room; the hubs of the stress test; Tempus at his bench.</em></span>
    </div>
  </div>

  <div class="grid">
    <section class="moves" aria-labelledby="{prefix}-moves">
      <h3 class="tkc-display moves-title" id="{prefix}-moves">The patterns, puzzle by puzzle</h3>
      {#each groups as group, k (group.part)}
        <h4 class="group"><span class="group-part">{group.part}</span><span class="group-about">{group.about}</span></h4>
        <ol aria-label="Part {k + 1}: {group.part}" start={numberOf(group.moves[0].ch)}>
          {#each group.moves as move (move.title)}
            <li>
              <span class="move-title">{move.title}</span>
              <span class="move-text">{move.text}</span>
              <button type="button" class="see" onclick={() => go(move.ch)}>See “{CHAPTERS[numberOf(move.ch)].short}”</button>
            </li>
          {/each}
        </ol>
      {/each}
    </section>
  </div>

  <section class="close" aria-label="Summary">
    <p class="tkc-display closing">
      <span class="tkc-or">Good complexity</span> multiplies options. <span class="tkc-and">Bad complexity</span> multiplies
      conditions. Scale multiplies whichever you have.
    </p>
    <p class="tkc-lede">
      The pencil’s chain is long and strong because each of its links has another way round. A bank needs its checks. Simplicity is not fewer controls; it is fewer things that must all hold at once.
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
    <details class="src-list">
      <summary>{sources.length} sources, chapter by chapter</summary>
    <ul>
      {#each sources as [who, year, what, why] (what)}
        <li><span class="src-who">{who}{year ? ` (${year})` : ''}.</span> <span class="src-what">{what}.</span> <span class="src-why">{why}</span></li>
      {/each}
    </ul>
    </details>
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
  @container tkc (min-width: 900px) {
    .moves ol {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: clamp(28px, 4cqi, 48px);
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
  }
  .moves {
    counter-reset: move;
  }
  .group {
    margin: 22px 0 10px;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--tkc-rule);
    font-size: 0.9375rem;
  }
  .group-part {
    font-weight: 700;
  }
  .group-about {
    color: var(--tkc-muted);
    font-weight: 400;
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
  .src-list summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--tkc-ink-2);
    padding: 4px 0;
  }
  .src-list summary:focus-visible {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 2px;
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
