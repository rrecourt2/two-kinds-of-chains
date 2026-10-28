<script>
  import { getContext, tick } from 'svelte';
  import { CHAPTERS } from './index.js';

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
    { title: 'Alternatives everywhere', text: 'Every approval can be given by more than one qualified person, and every critical system has a tested fallback. No link depends on one name.', ch: 'riddle' },
    { title: 'Specialists where the volume carries them', text: 'A specialist role pays where there is enough work to keep it busy; below that volume, the extra link is mostly idle time.', ch: 'specialization' },
    { title: 'Data entered once, at its source', text: 'Each piece of data has one home, close to the people who create it, and every system reads it from there, so a problem is fixed in one place and every approver sees the same record.', ch: 'systems' },
    { title: 'Slack and one shared line', text: 'The people that everything waits for run below about 80% of their time, and work waits in one line that any qualified colleague can take from.', ch: 'queues' },
    { title: 'Parallel work', text: 'Every piece that can start, starts, and a bad input is stopped as it comes in. The slowest piece then sets the date; speeding up any other changes nothing.', ch: 'async' },
    { title: 'A shortcut judged by its last user', text: 'A shortcut that saves time for the first deals that take it can cost time for all of them once every deal does.', ch: 'emergence' },
    { title: 'Bets sized to survive a bad run', text: 'Each risk is sized so that a bad run cannot end the game, and risks are pooled across units whose luck is independent of each other.', ch: 'ergodicity' },
    { title: 'Buffers where the links meet', text: 'Spare capacity sits with the people, committees and systems that everything passes through, and it is big enough to cover what would hit them.', ch: 'contagion' },
    { title: 'Claims tested by what would break them', text: 'A track record counts the years a claim survived; a reverse stress test starts from the missed payment and looks for the years that would cause it, shocks that arrive together included.', ch: 'black-swans' },
    { title: 'Several sources, not one', text: 'A unit that draws on several sources grows a little more slowly in good years and survives the years when one source fails.', ch: 'extinction' },
    { title: 'Gates sized to the loss', text: 'Where fraud is rare, most flags are false positives; a check earns its wait where one loss would be too large to survive, and stays light where losses can be borne.', ch: 'gate' },
    { title: 'Small teams, light links', text: 'Work sits in small teams that are fully linked inside and lightly linked to each other, so required links grow with the team, not with the whole organization.', ch: 'graph' },
    { title: 'Conditions read together', text: 'Clauses in different documents can wait for each other in rings that no document can go first in. Read side by side, the rings show before closing, and a clause on several rings, moved after the money, cuts them all.', ch: 'knot' },
    { title: 'Modular work', text: 'Work is saved in finished pieces, each with a clear owner and a clear interface, so an interruption costs only the piece in hand and trouble in one part stays there.', ch: 'modules' },
    { title: 'Conditions that bend', text: 'Every condition stays on the list; a late document can be met another way where one exists, and a condition that need not come first follows the money as an undertaking with a deadline.', ch: 'disbursement' },
    { title: 'Warning lights read against the base rate', text: 'What a covenant breach says depends on how many healthy borrowers trip the same covenant; past a few strong covenants, each new one adds mostly noise, and every false alarm becomes a waiver.', ch: 'covenants' },
    { title: 'A person where the AI swings', text: 'Where AI or automation is erratic, a person keeps the good results and drops the bad ones before they move on; autopilot is kept for work that is steady, or whose mistakes are small, visible and easy to undo.', ch: 'tools' },
    { title: 'A backup kept in practice', text: 'The more reliably a system does the work, the longer its people go without doing it; a day by hand now and then, with the system checking behind them, keeps the day it fails from finding them out of practice.', ch: 'automation' },
    { title: 'Delegations as varied as the world', text: 'Offices may decide the kinds of request they actually meet, and hold principles for the ones nobody listed, so what reaches head office is the truly new rather than the merely unlisted.', ch: 'variety' },
    { title: 'Pilots that can be stopped', text: 'Where nobody can tell in advance what will work, several small pilots go first, each cheap to stop, and the money follows the one that works.', ch: 'tinkering' },
    { title: 'Checks that stand still are learned', text: 'Against someone who tests every link, a check that stands still is soon walked round, and one moved after last month’s attempts runs to stand still; a check nobody can predict keeps more of what it catches.', ch: 'redqueen' },
    { title: 'Lessons that fade at a measured pace', text: 'Links added after a crisis come off a little with each calm year, neither all at once nor never, at a pace set by what an idle cushion costs.', ch: 'pace' },
  ];

  const sources = [
    ['Amos Tversky and Daniel Kahneman', '1974', '“Judgment under uncertainty: heuristics and biases”, Science', 'People overestimate the chance that every link in a chain of likely events holds.'],
    ['Leonard E. Read', '1958', '“I, Pencil”', 'No single person knows how to make a pencil.'],
    ['Adam Smith', '1776', 'The Wealth of Nations, Book I, chapters 1 and 3', 'The pin workshop; the division of labour is limited by the extent of the market.'],
    ['OECD', '2020', '“Trade policy implications of global value chains”, Trade Policy Brief', 'About 70% of international trade involves global value chains.'],
    ['Chris Miller', '2022', 'Chip War', 'How the semiconductor industry split into a long chain of specialists.'],
    ['George Labovitz and Yu Sang Chang', '1992', 'The 1-10-100 rule', 'A data error costs far more to fix the longer it survives. The rule is commonly attributed to them; we found no primary publication.'],
    ['J. F. C. Kingman', '1961', '“The single server queue in heavy traffic”, Proceedings of the Cambridge Philosophical Society', 'Why waiting explodes near full utilization.'],
    ['Adrian Bagust, Michael Place and John Posnett', '1999', '“Dynamics of bed use in accommodating emergency admissions”, BMJ', 'Why hospitals run into bed crises above about 85% occupancy.'],
    ['Donald Reinertsen', '2009', 'The Principles of Product Development Flow', 'Queues, utilization and batch size in knowledge work.'],
    ['Andrew S. Grove', '1983', 'High Output Management', 'The limiting step, and catching problems at the lowest-value stage.'],
    ['Dietrich Braess', '1968', '“Über ein Paradoxon aus der Verkehrsplanung”, Unternehmensforschung', 'A new road, or a shortcut, can make every journey slower.'],
    ['Ole Peters', '2019', '“The ergodicity problem in economics”, Nature Physics', 'The coin game, and time averages versus ensemble averages.'],
    ['Ole Peters and Alexander Adamou', '2015', '“An evolutionary advantage of cooperation”', 'Pooling raises the growth rate a typical member experiences.'],
    ['Duncan J. Watts', '2002', '“A simple model of global cascades on random networks”, PNAS', 'Cascade windows and robust-yet-fragile networks.'],
    ['Prasanna Gai and Sujit Kapadia', '2010', '“Contagion in financial networks”, Proceedings of the Royal Society A', 'The interbank model behind the stress test.'],
    ['Andrew Haldane', '2009', '“Rethinking the financial network”, speech, Amsterdam', 'The financial system as robust yet fragile.'],
    ['Andrew Haldane and Robert May', '2011', '“Systemic risk in banking ecosystems”, Nature', 'A central banker and an ecologist on banks as an ecosystem.'],
    ['Albert-László Barabási and Réka Albert', '1999', '“Emergence of scaling in random networks”, Science', 'Preferential attachment: how hubs grow.'],
    ['Réka Albert, Hawoong Jeong and Albert-László Barabási', '2000', '“Error and attack tolerance of complex networks”, Nature', 'Hub networks shrug off random failures and collapse when a hub fails.'],
    ['Basel Committee on Banking Supervision', '2011', '“Global systemically important banks: assessment methodology and the additional loss absorbency requirement”', 'Capital surcharges of 1 to 3.5 percentage points for the most systemic banks.'],
    ['Basel Committee on Banking Supervision', '2012', '“A framework for dealing with domestic systemically important banks”', 'National surcharges for banks that matter at home.'],
    ['Bertrand Russell', '1912', 'The Problems of Philosophy, chapter 6, “On Induction”', 'The chicken fed every day of its life, until the day its neck is wrung.'],
    ['Karl Popper', '1959', 'The Logic of Scientific Discovery', 'Theories can be falsified, never proven by examples.'],
    ['Basel Committee on Banking Supervision', '2009', 'Principles for sound stress testing practices and supervision', 'Reverse stress tests: start from the loss that would break the bank and look for what could cause it.'],
    ['Nassim Nicholas Taleb', '2012, 2018', 'Antifragile; Skin in the Game', 'Antifragility and convex tinkering, and one person at the casino a hundred times.'],
    ['Lian Pin Koh and colleagues', '2004', '“Species coextinctions and the biodiversity crisis”, Science', 'Species that disappear with the species they depend on.'],
    ['Olof Arrhenius', '1921', '“Species and area”, Journal of Ecology', 'A larger area holds more species, but fewer per square metre.'],
    ['Robert H. MacArthur and Edward O. Wilson', '1967', 'The Theory of Island Biogeography', 'How an island’s area and isolation set the number of species it holds.'],
    ['Michael L. McKinney and Julie L. Lockwood', '1999', '“Biotic homogenization: a few winners replacing many losers in the next mass extinction”, Trends in Ecology & Evolution', 'Where people join up separate places, a few widespread species replace many local ones.'],
    ['Nassim Nicholas Taleb', '2010', '“On Robustness and Fragility”, in The Black Swan, second edition', 'Species density: the larger and more connected the space, the more a few winners spread at the expense of the rest.'],
    ['Basel Committee on Banking Supervision', '2006', 'International Convergence of Capital Measurement and Capital Standards (Basel II), paragraphs 463, 472 and 667', 'Operational-risk capital for the worst year in a thousand; at least five years of data for default rates, and seven for losses on loans to firms, banks and governments.'],
    ['Frederick P. Brooks', '1975', 'The Mythical Man-Month', 'Adding people to a late project makes it later.'],
    ['Richard M. Karp', '1990', '“The transitive closure of a random digraph”, Random Structures & Algorithms', 'Below one link each, knots of waiting stay small; above it, one giant knot forms.'],
    ['Tomasz Łuczak', '1990', '“The phase transition in the evolution of random digraphs”, Journal of Graph Theory', 'The same threshold, from the other side.'],
    ['Edward G. Coffman, Michael J. Elphick and Arie Shoshani', '1971', '“System deadlocks”, ACM Computing Surveys', 'A circular wait: the condition under which nothing can move first.'],
    ['Stuart Kauffman and Simon Levin', '1987', '“Towards a general theory of adaptive walks on rugged landscapes”, Journal of Theoretical Biology', 'The complexity catastrophe: interlocking parts stop improvement one step at a time.'],
    ['Daniel A. Levinthal', '1997', '“Adaptation on rugged landscapes”, Management Science', 'Kauffman’s landscapes applied to organizations.'],
    ['Herbert A. Simon', '1962', '“The Architecture of Complexity”, Proceedings of the American Philosophical Society', 'The watchmakers Hora and Tempus, and why modular systems survive.'],
    ['John Gall', '1975', 'General Systemantics', 'A complex system that works has evolved from a simple system that worked.'],
    ['Thomas Bayes', '1763', '“An essay towards solving a problem in the doctrine of chances”, Philosophical Transactions of the Royal Society', 'Prior, evidence, updated belief: the arithmetic behind what a breach means. Published after his death by Richard Price.'],
    ['William of Ockham', '14th century', 'Ockham’s razor', '“Plurality should never be posited without necessity”; the familiar wording, “entities must not be multiplied beyond necessity”, is John Punch’s, from 1639.'],
    ['Ilia D. Dichev and Douglas J. Skinner', '2002', '“Large-sample evidence on the debt covenant hypothesis”, Journal of Accounting Research', 'Private lenders set covenants tightly, as tripwires; a breach is not necessarily a sign of distress.'],
    ['Lisanne Bainbridge', '1983', '“Ironies of automation”, Automatica', 'Automation leaves people the hardest tasks and the least practice.'],
    ['Bureau d’Enquêtes et d’Analyses', '2012', 'Final report on the accident of 1 June 2009 over the Atlantic', 'Pilots who rarely flew by hand, on the night the automation handed back control.'],
    ['Basel Committee on Banking Supervision', '2021', 'Principles for operational resilience', 'Delivering critical operations through severe but plausible disruption.'],
    ['W. Ross Ashby', '1956', 'An Introduction to Cybernetics, chapter 11, “Requisite variety”', 'Only variety can destroy variety: a regulator copes only with as many kinds of disturbance as it has kinds of response.'],
    ['W. Ross Ashby', '1952', 'Design for a Brain', 'The homeostat, a machine that searched for its own stability.'],
    ['Bent Flyvbjerg and Alexander Budzier', '2011', '“Why your IT project may be riskier than you think”, Harvard Business Review, September', '1,471 IT projects: an average cost overrun of 27%, and one in six overran by about 200%.'],
    ['Lewis Carroll', '1871', 'Through the Looking-Glass, and What Alice Found There', 'The Red Queen: “it takes all the running you can do, to keep in the same place”.'],
    ['Leigh Van Valen', '1973', '“A new evolutionary law”, Evolutionary Theory', 'The Red Queen hypothesis: each species must keep evolving to keep up with its rivals.'],
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
      <span>Paid for every day, needed on few of them. <em>A stand-in who never stands in; a reviewer with time to spare; a day by hand while the system works; pilots when results are predictable.</em></span>
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
      <span>Each link nearly always holds, and so, mostly, does the chain. <em>Six checks at 95%; a few conditions that wait on one another; an autopilot while the AI is steady.</em></span>
    </div>
    <div class="cell bad" role="cell">
      <span class="cell-tag" aria-hidden="true">A long chain, rough weather</span>
      <span class="cell-name">Stalls all at once</span>
      <span>Past the tipping point, each extra link costs more than the last. <em>Reviewers at 95%; a deal tied in a knot; the hubs of the stress test; Tempus at his bench.</em></span>
    </div>
  </div>

  <div class="grid">
    <section class="moves" aria-labelledby="{prefix}-moves">
      <h3 class="tkc-display moves-title" id="{prefix}-moves">The patterns, chapter by chapter</h3>
      <ol>
        {#each moves as move (move.title)}
          <li>
            <span class="move-title">{move.title}</span>
            <span class="move-text">{move.text}</span>
            <button type="button" class="see" onclick={() => go(move.ch)}>See “{CHAPTERS[numberOf(move.ch)].short}”</button>
          </li>
        {/each}
      </ol>
    </section>
  </div>

  <section class="close" aria-label="Summary">
    <p class="tkc-display closing">
      <span class="tkc-or">Good complexity</span> multiplies options. <span class="tkc-and">Bad complexity</span> multiplies
      conditions. Scale multiplies whichever you have.
    </p>
    <p class="tkc-lede">
      The pencil’s chain is long and strong because each of its links has another way round. A bank needs its checks. Simplicity is not fewer controls; it is fewer conditions.
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
