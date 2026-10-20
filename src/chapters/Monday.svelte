<script>
  import { getContext, untrack } from 'svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import { diagnose } from '../lib/sim/diagnose.js';
  import { HORIZON } from '../lib/sim/systems.js';
  import { CHAPTERS } from './index.js';
  import { linear, barRight } from '../lib/scales.js';
  import { pct, shortDays } from '../lib/format.js';

  const go = getContext('tkc-go');
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
  const rows = $derived([...d.options, { id: 'together', label: d.together.label, median: d.together.median, p90: d.together.p90, slipped: d.together.slipped, together: true }]);

  // Lever chart: horizontal bars of the typical lead time. On a phone each label sits above its bar.
  const stacked = $derived(width < 520);
  const rowH = $derived(stacked ? 44 : 34);
  const labelW = $derived(stacked ? 0 : Math.min(230, width * 0.46));
  const H = $derived(rows.length * rowH + 30);
  const xMax = $derived(Math.max(d.now.median, ...rows.map((r) => r.median)) * 1.15 || 1);
  const x = $derived(linear(0, xMax, labelW, width - 44));

  const moves = [
    { title: 'Alternatives everywhere', text: 'Every approval can be given by more than one person with the right delegated authority, and every critical system has a tested fallback. No link depends on one name.', ch: 'riddle' },
    { title: 'Enter it once', text: 'One shared record that every system reads, instead of copies that each need re-keying, checking and correcting. Run it as a protected hub with a tested fallback.', ch: 'systems' },
    { title: 'Check data as it is typed', text: 'Automatic checks at entry stop a problem before it spreads into other systems. That is where Grove was right.', ch: 'breakfast' },
    { title: 'Approve in parallel, or once at the end', text: 'No approval waits for another. Standard requests get one approval when the picture is complete; requests that cannot be undone get several reviewers working at the same time.', ch: 'systems' },
    { title: 'Spare capacity', text: 'Keep key reviewers and key systems below about 80% loaded, and give them one shared queue.', ch: 'queues' },
    { title: 'Care in proportion to the risk', text: 'Small, reversible decisions get light, fast checks. The most care goes where mistakes cannot be undone.', ch: 'ergodicity' },
    { title: 'Tools before gates', text: 'Bring in AI and automation as tools that work the screens for people. Judge them by the screens and steps they remove.', ch: 'tools' },
    { title: 'Count the silent costs', text: 'Measure waiting, re-keying and abandoned requests alongside incidents, and track one number: the share of a request’s time that is actual work.', ch: 'black-swans' },
  ];

  const sources = [
    ['Adam Smith', '1776', 'The Wealth of Nations, Book I, chapters 1 and 3', 'The pin workshop; the division of labour is limited by the extent of the market.'],
    ['Leonard E. Read', '1958', '“I, Pencil”', 'No single person knows how to make a pencil.'],
    ['OECD', '', 'Global value chains and trade', 'About 70% of international trade involves global value chains.'],
    ['Michael Kremer', '1993', '“The O-Ring Theory of Economic Development”, Quarterly Journal of Economics', 'When every task must succeed, small differences in reliability multiply.'],
    ['George Labovitz and Yu Sang Chang', '1992', 'The 1-10-100 rule', 'A data error costs far more to fix the longer it survives. The rule is commonly attributed to them; we found no primary publication.'],
    ['J. F. C. Kingman', '1961', '“The single server queue in heavy traffic”, Proceedings of the Cambridge Philosophical Society', 'Why waiting explodes near full utilization.'],
    ['Donald Reinertsen', '2009', 'The Principles of Product Development Flow', 'Queues, utilization and batch size in knowledge work.'],
    ['Andrew S. Grove', '1983', 'High Output Management', 'The breakfast factory and the limiting step.'],
    ['Ole Peters', '2019', '“The ergodicity problem in economics”, Nature Physics', 'The coin game, and time averages versus ensemble averages.'],
    ['Ole Peters and Alexander Adamou', '2015', '“An evolutionary advantage of cooperation”', 'Pooling raises the growth rate a typical member experiences.'],
    ['Duncan J. Watts', '2002', '“A simple model of global cascades on random networks”, PNAS', 'Cascade windows and robust-yet-fragile networks.'],
    ['Prasanna Gai and Sujit Kapadia', '2010', '“Contagion in financial networks”, Proceedings of the Royal Society A', 'The interbank model behind chapter 8.'],
    ['Andrew Haldane', '2009', '“Rethinking the financial network”, speech, Amsterdam', 'The financial system as robust yet fragile.'],
    ['Andrew Haldane and Robert May', '2011', '“Systemic risk in banking ecosystems”, Nature', 'A central banker and an ecologist on banks as an ecosystem.'],
    ['Karl Popper', '1959', 'The Logic of Scientific Discovery', 'Theories can be falsified, never proven by examples.'],
    ['Nassim Nicholas Taleb', '2007, 2012, 2018', 'The Black Swan; Antifragile; Skin in the Game', 'Rare events, convexity, and one person at the casino a hundred times.'],
    ['Microsoft', '2024', 'Statement on the CrowdStrike incident, 20 July', 'About 8.5 million Windows devices affected.'],
    ['Richard Lewontin and Dan Cohen', '1969', '“On population growth in a randomly varying environment”, PNAS', 'A population can grow on average and still go extinct.'],
    ['Lian Pin Koh and colleagues', '2004', '“Species coextinctions and the biodiversity crisis”, Science', 'Species that disappear with the species they depend on.'],
    ['Herbert A. Simon', '1962', '“The Architecture of Complexity”, Proceedings of the American Philosophical Society', 'The watchmakers Hora and Tempus, and why modular systems survive.'],
    ['Melvin Conway', '1968', '“How Do Committees Invent?”', 'Organizations design systems that copy their communication structure.'],
    ['Frederick P. Brooks', '1975', 'The Mythical Man-Month', 'Adding people to a late project makes it later.'],
    ['Luís Bettencourt and colleagues', '2007', '“Growth, innovation, scaling, and the pace of life in cities”, PNAS', 'Why bigger cities produce more per person.'],
    ['Réka Albert, Hawoong Jeong and Albert-László Barabási', '2000', '“Error and attack tolerance of complex networks”, Nature', 'Hub networks shrug off random failures and collapse when a hub fails.'],
  ];
</script>

<article class="monday" aria-labelledby="{prefix}-chapter-title">
  <header class="head">
    <div class="tkc-eyebrow">Chapter {total} of {total} · Playbook</div>
    <h2 class="tkc-display tkc-chapter-title" id="{prefix}-chapter-title" tabindex="-1">What to do on Monday</h2>
    <p class="tkc-lede">Keep the controls. Change their shape. For each step in a process, ask two questions: does it do the work or check it, and is there an alternative when it is unavailable?</p>
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
      <h3 class="tkc-display moves-title" id="{prefix}-moves">Eight moves that keep the controls and lose the waiting</h3>
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
      <Instrument title="Check a process you know" sub="Example values are filled in. Set them to match a real request.">
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
            <text class="tkc-axis-label" x={x(d.now.median)} y={H - 6} text-anchor="middle">Today: {shortDays(d.now.median, HORIZON)} days</text>
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
                  <tr><td>Today</td><td>{shortDays(d.now.median, HORIZON)}</td><td>{shortDays(d.now.p90, HORIZON)}</td><td>{pct(d.now.slipped, 1)}</td></tr>
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
      A bank needs its checks. Give them the shape of options: alternatives at every link, data entered once, approvals
      that run in parallel or once at the end, spare capacity, and tools that take screens away instead of adding them.
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
