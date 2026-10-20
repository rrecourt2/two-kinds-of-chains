<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import TryThis from '../lib/ui/TryThis.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { STRUCTURES, structure, outputCurve, TEAM_SIZE } from '../lib/sim/scale.js';
  import { linear, line, ticks } from '../lib/scales.js';
  import { int, pct } from '../lib/format.js';

  const MAX = 60;
  let people = $state(24);
  let kind = $state('mesh');
  let diagramW = $state(320);
  let width = $state(560);
  let hover = $state(null);

  const now = $derived(structure(kind, people));
  const COLORS = { mesh: 'var(--tkc-conditions)', hub: 'var(--tkc-ink-2)', teams: 'var(--tkc-options)' };
  const curves = STRUCTURES.map((s) => ({ ...s, values: outputCurve(s.id, MAX) }));

  // Diagram of mandatory relationships for the structure on show.
  const size = $derived(Math.min(360, diagramW));
  const graph = $derived.by(() => {
    const c = size / 2;
    const R = size / 2 - 14;
    const nodes = [];
    const edges = [];
    if (kind === 'mesh' || kind === 'hub') {
      const ring = kind === 'hub' ? people - 1 : people;
      for (let i = 0; i < ring; i++) {
        const a = (2 * Math.PI * i) / ring - Math.PI / 2;
        nodes.push({ x: c + R * Math.cos(a), y: c + R * Math.sin(a), lead: false });
      }
      if (kind === 'hub') {
        nodes.push({ x: c, y: c, lead: true });
        for (let i = 0; i < ring; i++) edges.push([i, ring]);
      } else {
        for (let i = 0; i < ring; i++) for (let j = i + 1; j < ring; j++) edges.push([i, j]);
      }
    } else {
      const sizes = now.sizes;
      const T = sizes.length;
      const big = T === 1 ? 0 : R * 0.68;
      const small = T === 1 ? R * 0.6 : Math.min(R * 0.3, (Math.PI * big) / T - 6);
      const leads = [];
      sizes.forEach((s, t) => {
        const a = (2 * Math.PI * t) / T - Math.PI / 2;
        const tx = c + big * Math.cos(a);
        const ty = c + big * Math.sin(a);
        const first = nodes.length;
        for (let k = 0; k < s; k++) {
          const b = a + Math.PI + (2 * Math.PI * k) / s;
          nodes.push({ x: tx + small * Math.cos(b), y: ty + small * Math.sin(b), lead: k === 0 && T > 1 });
        }
        for (let i = 0; i < s; i++) for (let j = i + 1; j < s; j++) edges.push([first + i, first + j]);
        leads.push(first);
      });
      for (let i = 0; i < leads.length; i++) for (let j = i + 1; j < leads.length; j++) edges.push([leads[i], leads[j]]);
    }
    return { nodes, edges };
  });

  // Output curves.
  const H = 230;
  const m = { top: 16, right: 18, bottom: 38, left: 40 };
  const x = $derived(linear(1, MAX, m.left, width - m.right));
  const y = linear(0, 55, H - m.bottom, m.top);
  const paths = $derived(curves.map((c) => ({ ...c, d: line(c.values.map((v, i) => [x(i + 1), y(v)])) })));

  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    hover = Math.max(1, Math.min(MAX, Math.round(x.invert(e.clientX - box.left + m.left))));
  }

  const tries = [
    { label: 'Everyone depends on everyone, 50 people', apply: () => ((kind = 'mesh'), (people = 50)) },
    { label: 'One approver, 40 people', apply: () => ((kind = 'hub'), (people = 40)) },
    { label: 'Small teams, 60 people', apply: () => ((kind = 'teams'), (people = 60)) },
  ];
</script>

<Chapter n={8} kicker="Scale" title="Scale amplifies what you build">
  {#snippet setup()}
    <p>
      Scale has appeared in every chapter so far. A big market pays for specialists. A big pool turns a losing gamble
      into a winning one. A big, diverse population survives bad luck.
    </p>
    <p>
      Scale also multiplies dependencies. If every person on a team must coordinate with every other, the number of
      working relationships grows far faster than the team: 10 people have 45 pairs, and 50 people have 1,225.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Grow the organization" sub="Each required working relationship costs both people 2% of their time.">
      <div class="tkc-controls">
        <Slider id="s-people" label="People" bind:value={people} min={2} max={MAX} />
        <Segmented
          name="s-kind"
          label="How the work is organized"
          bind:value={kind}
          options={STRUCTURES.map((s) => ({ value: s.id, label: s.label }))}
        />
      </div>

      <div class="split">
        <div class="diagram" bind:clientWidth={diagramW}>
          <svg width={size} height={size} role="img" aria-label="{int(now.links)} required working relationships among {people} people.">
            {#each graph.edges as [a, b]}
              <line x1={graph.nodes[a].x} y1={graph.nodes[a].y} x2={graph.nodes[b].x} y2={graph.nodes[b].y} class="rel" style:stroke={COLORS[kind]} style:opacity={kind === 'mesh' ? Math.max(0.08, 0.6 - people / 110) : 0.55} />
            {/each}
            {#each graph.nodes as n}
              <circle cx={n.x} cy={n.y} r={n.lead ? 6 : 4} class="person" class:lead={n.lead} />
            {/each}
          </svg>
        </div>
        <div class="tkc-stats tkc-stats--3 side-stats" aria-live="polite">
          <Stat label="Required relationships" value={int(now.links)} sub={kind === 'mesh' ? 'every pair of people' : kind === 'hub' ? 'everyone to the approver' : `within teams of about ${TEAM_SIZE}, plus between team leads`} />
          <Stat label="Time spent coordinating" value={pct(now.overhead)} sub="average per person" />
          <Stat label="Useful output" value={now.output.toFixed(1)} sub={now.overloaded ? 'people’s worth: the approver is the limit' : 'people’s worth of work'} swatch={COLORS[kind]} />
        </div>
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label="Useful output against number of people for three ways of organizing.">
          {#each ticks(0, 50, 5) as t}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={m.left - 6} y={y(t) + 4} text-anchor="end">{t}</text>
          {/each}
          {#each [1, 10, 20, 30, 40, 50, 60] as t}
            <text class="tkc-axis-label" x={x(t)} y={H - m.bottom + 16} text-anchor="middle">{t}</text>
          {/each}
          {#each paths as p (p.id)}
            <path d={p.d} class="cv" style:stroke={COLORS[p.id]} style:opacity={p.id === kind ? 1 : 0.55} />
          {/each}
          <line class="now" x1={x(people)} x2={x(people)} y1={m.top} y2={y(0)} />
          {#each paths as p (p.id)}
            <circle cx={x(people)} cy={y(p.values[people - 1])} r={p.id === kind ? 5.5 : 4} class="pt" style:fill={COLORS[p.id]} />
          {/each}
          {#if hover !== null}
            <line class="cross" x1={x(hover)} x2={x(hover)} y1={m.top} y2={y(0)} />
          {/if}
          <text class="tkc-axis-title" x={m.left + (width - m.left - m.right) / 2} y={H - 4} text-anchor="middle">People</text>
          <text class="tkc-axis-title" x={m.left - 34} y={m.top - 4}>Useful output (people’s worth)</text>
          <rect x={m.left} y={m.top} width={Math.max(0, width - m.left - m.right)} height={H - m.top - m.bottom} fill="transparent" role="presentation" onpointermove={onMove} onpointerleave={() => (hover = null)} />
        </svg>
        {#if hover !== null}
          <div class="tkc-tip" style:left="{Math.min(width - 230, Math.max(0, x(hover) + 10))}px" style:top="24px">
            <div>{hover} people</div>
            {#each paths as p (p.id)}
              <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background={COLORS[p.id]}></span><strong>{p.values[hover - 1].toFixed(1)}</strong> {p.label.toLowerCase()}</div>
            {/each}
          </div>
        {/if}
        <div class="tkc-legend">
          {#each STRUCTURES as s (s.id)}
            <span><span class="tkc-swatch tkc-swatch--line" style:background={COLORS[s.id]}></span>{s.label}</span>
          {/each}
        </div>
      </div>

      <TryThis items={tries} />

      {#snippet model()}
        <p>Every required working relationship costs each side 2% of their time. “Everyone depends on everyone” links every pair. “One approver” links each person to a single approver, who can sign off the work of about 12 people. “Small teams” groups people into teams of about {TEAM_SIZE} that work closely together, while one lead per team links to the other leads.</p>
        <p>Useful output is everyone’s time minus coordination, capped by what the approver can sign off.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      When everyone depends on everyone, output peaks at around 25 people and then falls, because each newcomer adds
      more coordination than work. Fred Brooks saw this in software in 1975: adding people to a late project makes it
      later.
    </p>
    <p>
      Routing everything through one approver keeps coordination low, but output stops growing at whatever that one
      person can sign off. Small teams with clear interfaces keep growing almost in proportion, because each person
      depends on a handful of colleagues and each team on the others through one interface.
    </p>
    <h3>Optional links and required links</h3>
    <p>
      Cities show the upside of scale. Wages, patents and economic output grow faster than population: a city twice as
      big produces roughly 2.2 times as much (Bettencourt and colleagues, 2007). In a city you can work with almost
      anyone and have to coordinate with almost no one. The same formula that counts the required relationships in a
      team counts the possible collaborations in a city. Possible connections are options. Required connections are
      conditions.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Over the last year, which new roles, committees or reviews added an option, and which added a condition?">
      <p>
        Before adding a role, a committee or a reviewer, ask whether it adds an option or a condition. Growth through
        options makes the bank smarter. Growth through conditions makes it slower with every hire.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .split {
    display: grid;
    gap: 16px;
    align-items: center;
  }
  @container tkc (min-width: 1000px) {
    .split {
      grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
    }
    .side-stats {
      grid-template-columns: 1fr;
    }
  }
  .diagram {
    display: flex;
    justify-content: center;
    min-width: 0;
  }
  .rel {
    stroke-width: 1;
  }
  .person {
    fill: var(--tkc-surface);
    stroke: var(--tkc-ink-2);
    stroke-width: 1.5;
  }
  .person.lead {
    fill: var(--tkc-ink-2);
  }
  .cv {
    fill: none;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .now {
    stroke: var(--tkc-ink);
    stroke-width: 1;
  }
  .cross {
    stroke: var(--tkc-muted);
    stroke-width: 1;
  }
  .pt {
    stroke: var(--tkc-surface);
    stroke-width: 2;
  }
</style>
