<script>
  import { getContext } from 'svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { diagnose } from '../lib/sim/diagnose.js';
  import { HORIZON } from '../lib/sim/relay.js';
  import { linear, barRight } from '../lib/scales.js';
  import { pct, shortDays } from '../lib/format.js';

  const go = getContext('tkc-go');
  const prefix = getContext('tkc-id') ?? 'tkc';

  let gates = $state(6);
  let standIns = $state(0);
  let parallel = $state(false);
  let availability = $state(85);
  let busy = $state(85);
  let sendBack = $state(15);
  let width = $state(560);

  const d = $derived(
    diagnose({ gates, standIns, parallel, availability: availability / 100, busy: busy / 100, sendBack: sendBack / 100 }),
  );
  const rows = $derived([...d.options, { id: 'together', label: d.together.label, median: d.together.median, p90: d.together.p90, together: true }]);

  // Lever chart: horizontal bars of median lead time.
  const rowH = 34;
  const labelW = $derived(Math.min(230, width * 0.46));
  const H = $derived(rows.length * rowH + 30);
  const xMax = $derived(Math.max(d.now.median, ...rows.map((r) => r.median)) * 1.15 || 1);
  const x = $derived(linear(0, xMax, labelW, width - 44));

  const moves = [
    { title: 'Roles, not names', text: 'Any qualified person can sign. A named approver becomes a pool.', ch: 'riddle', n: 1 },
    { title: 'Automatic delegation', text: 'Out of office means a named stand-in takes over, without anyone asking.', ch: 'dependence', n: 3 },
    { title: 'Parallel by default', text: 'Reviews that do not need each other’s output start at the same time.', ch: 'dependence', n: 3 },
    { title: 'Spare capacity for reviewers', text: 'Keep key reviewers below about 80% loaded, and give them one shared queue.', ch: 'queues', n: 4 },
    { title: 'Gates in proportion to the risk', text: 'Small, reversible decisions get fewer, faster gates. Irreversible ones get the most care.', ch: 'ergodicity', n: 5 },
    { title: 'No single hub', text: 'Every person or system that everything passes through gets a stand-in.', ch: 'contagion', n: 6 },
    { title: 'Measure flow', text: 'Track lead time and the share of time actually worked, not how busy people are.', ch: 'dependence', n: 3 },
  ];

  const sources = [
    ['Adam Smith', '1776', 'The Wealth of Nations, Book I, chapters 1 and 3', 'The pin workshop; the division of labour is limited by the extent of the market.'],
    ['Leonard E. Read', '1958', '“I, Pencil”', 'No single person knows how to make a pencil.'],
    ['OECD', '', 'Global value chains and trade', 'About 70% of international trade involves global value chains.'],
    ['Michael Kremer', '1993', '“The O-Ring Theory of Economic Development”, Quarterly Journal of Economics', 'When every task must succeed, small differences in reliability multiply.'],
    ['J. F. C. Kingman', '1961', '“The single server queue in heavy traffic”, Proceedings of the Cambridge Philosophical Society', 'Why waiting explodes near full utilization.'],
    ['Donald Reinertsen', '2009', 'The Principles of Product Development Flow', 'Queues, utilization and batch size in knowledge work.'],
    ['Ole Peters', '2019', '“The ergodicity problem in economics”, Nature Physics', 'The coin game, and time averages versus ensemble averages.'],
    ['Ole Peters and Alexander Adamou', '2015', '“An evolutionary advantage of cooperation”', 'Pooling raises the growth rate a typical member experiences.'],
    ['Nassim Nicholas Taleb', '2018', 'Skin in the Game', 'One person at the casino a hundred times is not a hundred people once.'],
    ['Duncan J. Watts', '2002', '“A simple model of global cascades on random networks”, PNAS', 'Cascade windows and robust-yet-fragile networks.'],
    ['Prasanna Gai and Sujit Kapadia', '2010', '“Contagion in financial networks”, Proceedings of the Royal Society A', 'The interbank model behind chapter 6.'],
    ['Andrew Haldane', '2009', '“Rethinking the financial network”, speech, Amsterdam', 'The financial system as robust yet fragile.'],
    ['Andrew Haldane and Robert May', '2011', '“Systemic risk in banking ecosystems”, Nature', 'A central banker and an ecologist on banks as an ecosystem.'],
    ['Réka Albert, Hawoong Jeong and Albert-László Barabási', '2000', '“Error and attack tolerance of complex networks”, Nature', 'Hub networks shrug off random failures and collapse when a hub fails.'],
    ['Richard Lewontin and Dan Cohen', '1969', '“On population growth in a randomly varying environment”, PNAS', 'A population can grow on average and still go extinct.'],
    ['Lian Pin Koh and colleagues', '2004', '“Species coextinctions and the biodiversity crisis”, Science', 'Species that disappear with the species they depend on.'],
    ['Frederick P. Brooks', '1975', 'The Mythical Man-Month', 'Adding people to a late project makes it later.'],
    ['Luís Bettencourt and colleagues', '2007', '“Growth, innovation, scaling, and the pace of life in cities”, PNAS', 'Why bigger cities produce more per person.'],
  ];
</script>

<article class="monday" aria-labelledby="{prefix}-chapter-title">
  <header class="head">
    <div class="tkc-eyebrow">Chapter 9 of 9 · Playbook</div>
    <h2 class="tkc-display tkc-chapter-title" id="{prefix}-chapter-title">What to do on Monday</h2>
    <p class="tkc-lede">Every chapter points to the same test. For each step in a process, ask two questions: does it add value, and can more than one person do it?</p>
  </header>

  <div class="matrix" role="table" aria-label="Two-question test for a step in a process">
    <div class="corner" role="presentation"></div>
    <div class="colhead" role="columnheader">More than one person can do it</div>
    <div class="colhead" role="columnheader">Only one person can do it</div>

    <div class="rowhead" role="rowheader">It adds value</div>
    <div class="cell good" role="cell">
      <span class="cell-name">Specialization</span>
      <span>Good complexity. Protect it and feed it volume. <em>Example: a pool of credit analysts.</em></span>
    </div>
    <div class="cell" role="cell">
      <span class="cell-name">Key-person risk</span>
      <span>Valuable but fragile. Train a second person. <em>Example: the only person who understands a legacy system.</em></span>
    </div>

    <div class="rowhead" role="rowheader">It only checks</div>
    <div class="cell" role="cell">
      <span class="cell-name">Light control</span>
      <span>Keep it fast and in proportion to the risk. <em>Example: a four-eyes check by any qualified colleague.</em></span>
    </div>
    <div class="cell bad" role="cell">
      <span class="cell-name">Bad complexity</span>
      <span>Redesign this first. <em>Example: a named sign-off that everything waits for.</em></span>
    </div>
  </div>

  <div class="grid">
    <section class="moves" aria-labelledby="{prefix}-moves">
      <h3 class="tkc-display moves-title" id="{prefix}-moves">Seven moves that keep the controls and lose the waiting</h3>
      <ol>
        {#each moves as move (move.title)}
          <li>
            <span class="move-title">{move.title}</span>
            <span class="move-text">{move.text}</span>
            <button type="button" class="see" onclick={() => go(move.ch)}>See chapter {move.n}</button>
          </li>
        {/each}
      </ol>
    </section>

    <div class="tool">
      <Instrument title="Check a process you know" sub="Example values are filled in. Set them to match a real process.">
        <div class="tkc-controls">
          <Slider id="m-gates" label="Sign-offs" bind:value={gates} min={1} max={10} />
          <Slider id="m-stand" label="Stand-ins per sign-off" bind:value={standIns} min={0} max={3} />
          <Segmented
            name="m-order"
            label="Order"
            bind:value={parallel}
            options={[
              { value: false, label: 'One after another' },
              { value: true, label: 'All at once' },
            ]}
          />
          <Slider id="m-avail" label="Approvers are in" bind:value={availability} min={60} max={99} format={(v) => `${v}% of days`} />
          <Slider id="m-busy" label="Approvers are busy" bind:value={busy} min={50} max={95} format={(v) => `${v}% of their time`} />
          <Slider id="m-back" label="Chance each gate sends it back" bind:value={sendBack} min={0} max={25} format={(v) => `${v}%`} />
        </div>

        <div class="tkc-stats tkc-stats--4" aria-live="polite">
          <Stat label="Typical request" value="{shortDays(d.now.median, HORIZON)} days" sub="median, working days" />
          <Stat label="1 in 10 takes more than" value="{shortDays(d.now.p90, HORIZON)} days" />
          <Stat label="Within two weeks" value={pct(d.now.withinDeadline)} />
          <Stat label="Time actually worked" value={pct(d.now.workShare, d.now.workShare < 0.1 ? 1 : 0)} />
        </div>

        <div class="tkc-chart" bind:clientWidth={width}>
          <div class="tkc-fig-title small">What would help most?</div>
          <p class="tkc-small">Typical lead time after each single change, from the same simulated requests.</p>
          <svg {width} height={H} role="img" aria-label="Typical lead time after each change.">
            <line class="today" x1={x(d.now.median)} x2={x(d.now.median)} y1="4" y2={H - 22} />
            <text class="tkc-axis-label" x={x(d.now.median)} y={H - 6} text-anchor="middle">Today: {shortDays(d.now.median, HORIZON)} days</text>
            {#each rows as r, i (r.id)}
              {@const yy = 8 + i * rowH}
              <text class="tkc-label-2" x="0" y={yy + 15}>{r.label}</text>
              <path d={barRight(labelW, yy + 4, Math.max(2, x(r.median) - labelW), 16)} class="lever" class:together={r.together} />
              <text class="tkc-label" x={x(r.median) + 6} y={yy + 16}>{shortDays(r.median, HORIZON)}</text>
            {/each}
          </svg>
          <details class="tkc-note">
            <summary>Numbers behind this chart</summary>
            <div class="tkc-scroll-x">
              <table class="tkc-table">
                <thead><tr><th>Change</th><th>Typical (days)</th><th>1 in 10 longer than (days)</th></tr></thead>
                <tbody>
                  <tr><td>Today</td><td>{shortDays(d.now.median, HORIZON)}</td><td>{shortDays(d.now.p90, HORIZON)}</td></tr>
                  {#each rows as r (r.id)}
                    <tr><td>{r.label}</td><td>{shortDays(r.median, HORIZON)}</td><td>{shortDays(r.p90, HORIZON)}</td></tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </details>
        </div>

        {#snippet model()}
          <p>The approval relay from chapter 3, with absences that last four days on average, plus busy approvers from chapter 4: a request waits in each approver’s queue behind other work averaging two hours, and stand-ins share that queue.</p>
          <p>Each bar applies one change and re-runs the same 1,200 requests. The last bar applies every change except dropping a sign-off, so every control stays in place.</p>
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
      None of this argues for fewer controls. A bank needs its checks. It argues for controls shaped like options: any
      qualified signer, in parallel, with slack, in proportion to the risk.
    </p>
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
  @container tkc (max-width: 560px) {
    .matrix {
      grid-template-columns: 1fr 1fr;
    }
    .corner {
      display: none;
    }
    .rowhead {
      grid-column: 1 / -1;
      padding-top: 6px;
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
