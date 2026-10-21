<script>
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import TryThis from '../lib/ui/TryThis.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { equilibrium, bestForAll, BYPASS } from '../lib/sim/braess.js';
  import { int } from '../lib/format.js';

  let cars = $state(4000);
  let link = $state('closed');
  let width = $state(560);

  const open = $derived(link === 'open');
  const before = $derived(equilibrium(cars, false));
  const now = $derived(equilibrium(cars, open));
  const best = $derived(bestForAll(cars));
  const mins = (v) => `${Math.round(v)} min`;

  // The road network: Start on the left, End on the right, two junctions between.
  const H = 290;
  const pad = $derived(width < 420 ? 34 : 56);
  const S = $derived({ x: pad, y: H / 2 });
  const E = $derived({ x: width - pad, y: H / 2 });
  const N = $derived({ x: width / 2, y: 50 });
  const So = $derived({ x: width / 2, y: H - 56 });
  const maxCars = 6000;
  const thick = (n) => 2 + (10 * n) / maxCars;
  const roads = $derived([
    { id: 'sn', a: S, b: N, kind: 'main', carsOn: now.top + now.link, minutes: now.mainMinutes, name: 'Main road' },
    { id: 'ne', a: N, b: E, kind: 'bypass', carsOn: now.top, minutes: BYPASS, name: 'Bypass' },
    { id: 'ss', a: S, b: So, kind: 'bypass', carsOn: now.bottom, minutes: BYPASS, name: 'Bypass' },
    { id: 'se', a: So, b: E, kind: 'main', carsOn: now.bottom + now.link, minutes: now.mainMinutes, name: 'Main road' },
  ]);
  const mid = (r) => ({ x: (r.a.x + r.b.x) / 2, y: (r.a.y + r.b.y) / 2 });

  const tries = [
    { label: 'Open the new link', apply: () => ((link = 'open'), (cars = 4000)) },
    { label: 'Fewer cars: 2,000', apply: () => ((link = 'open'), (cars = 2000)) },
    { label: 'Rush hour: 5,000', apply: () => ((link = 'open'), (cars = 5000)) },
    { label: 'Close it again', apply: () => (link = 'closed') },
  ];
</script>

<Chapter
  n={6}
  kicker="Emergence"
  title="When every part does its best"
  lede="In a complex system, the whole is not the sum of its parts. Each part can do what is best for itself, and the whole can get worse."
>
  {#snippet setup()}
    <p>
      Complexity science studies emergence: patterns of the whole that no part intends. Nobody plans a traffic jam. In
      2008, Japanese physicists asked 22 drivers to circle a 230-metre track at a steady 30 km/h. Soon a jam formed and
      rolled backwards around the track, with no accident and no bottleneck. Small, sensible adjustments by each driver
      added up to a stop-start wave.
    </p>
    <p>
      Emergence has a costly cousin. In 1968 the mathematician Dietrich Braess showed that adding a road to a busy
      network can make every journey slower, even when every driver picks the fastest route for themselves.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="A road that makes everyone slower" sub="Main roads slow down with traffic: a minute for every 100 cars. Bypasses always take 45 minutes. The new link takes no time at all.">
      <div class="tkc-controls">
        <Segmented
          name="l-link"
          label="The new link"
          bind:value={link}
          options={[
            { value: 'closed', label: 'Closed' },
            { value: 'open', label: 'Open' },
          ]}
        />
        <Slider id="l-cars" label="Cars on the road" bind:value={cars} min={1000} max={6000} step={500} format={(v) => int(v)} />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label="Road network with {int(cars)} cars. The new link is {link}. Every journey takes {mins(now.time)}.">
          <line x1={N.x} y1={N.y} x2={So.x} y2={So.y} class="link" class:open style:stroke-width={open ? thick(now.link) : 2} />
          {#each roads as r (r.id)}
            <line x1={r.a.x} y1={r.a.y} x2={r.b.x} y2={r.b.y} class="road {r.kind}" style:stroke-width={thick(r.carsOn)} />
          {/each}
          {#each roads as r (r.id)}
            {@const m = mid(r)}
            {@const up = r.id === 'sn' || r.id === 'ne'}
            {@const dx = (r.id === 'sn' || r.id === 'ss' ? -1 : 1) * Math.min(40, width * 0.06)}
            <text class="tkc-label-2 tkc-halo" x={m.x + dx} y={up ? m.y - 30 : m.y + 28} text-anchor="middle">{r.name}</text>
            <text class="tkc-axis-label tkc-halo" x={m.x + dx} y={up ? m.y - 16 : m.y + 42} text-anchor="middle">{int(r.carsOn)} cars · {mins(r.minutes)}</text>
          {/each}
          <text class="tkc-axis-label tkc-halo" x={width < 460 ? N.x - 8 : N.x + 8} y={H / 2 + 4} text-anchor={width < 460 ? 'end' : 'start'}>
            <tspan>New link</tspan>
            <tspan x={width < 460 ? N.x - 8 : N.x + 8} dy="14">{open ? `${int(now.link)} cars` : 'closed'}</tspan>
          </text>
          {#each [{ p: S, t: 'Start' }, { p: E, t: 'End' }] as node (node.t)}
            <circle cx={node.p.x} cy={node.p.y} r="7" class="node" />
            <text class="tkc-label" x={node.p.x} y={node.p.y + 24} text-anchor="middle">{node.t}</text>
          {/each}
          <circle cx={N.x} cy={N.y} r="5" class="junction" />
          <circle cx={So.x} cy={So.y} r="5" class="junction" />
        </svg>
      </div>

      <div class="tkc-stats tkc-stats--3" use:announce>
        <Stat label="Every driver’s journey" value={mins(now.time)} sub={open ? `${now.time > before.time ? 'up' : now.time < before.time ? 'down' : 'no change'} from ${mins(before.time)} without the link` : 'each takes the fastest route'} swatch={open && now.time > before.time ? 'var(--tkc-conditions)' : 'var(--tkc-ink-2)'} />
        <Stat label="If routes were planned for everyone" value={mins(open ? best : before.time)} sub="the best the roads can do" />
        <Stat label="Cars on the new link" value={open ? int(now.link) : '0'} sub={open ? 'each saving time, at first' : 'the link is closed'} />
      </div>

      <TryThis items={tries} />

      {#snippet model()}
        <p>{int(cars)} cars travel from Start to End. Each main road takes one minute per 100 cars on it; each bypass takes 45 minutes whatever the traffic. Every driver chooses the route that is fastest for them, so the traffic settles where nobody can save time by switching alone (a Nash equilibrium).</p>
        <p>“Planned for everyone” assigns routes to give the shortest average journey. The ratio of the two is what game theorists call the price of anarchy.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Open the link with 4,000 cars. Each driver does the smart thing and takes it. Once everyone does, both main roads
      are packed, and every journey is 15 minutes longer than before the link existed. Nobody can do better by switching
      back alone, so the jam is stable. With fewer cars the link helps; in rush hour it hurts.
    </p>
    <p>It happens in real cities. When New York closed 42nd Street for Earth Day in 1990, traffic in the area flowed better, not worse.</p>
    <h3>Local best, global worse</h3>
    <p>
      This is the risk of optimizing locally. A team that makes its own part faster, safer or cheaper does not always
      make the whole better. A new system that serves one team well can add a step for everyone else. A control that
      removes one risk can push another somewhere out of sight. Each decision is sensible on its own; the result
      belongs to no one. Climate change is the largest example: every single choice to emit makes sense to the one who
      makes it, and the sum does not.
    </p>
    <p>
      The remedy is not to ask every part to be selfless. It is to measure the whole.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our measures can improve while the whole gets worse?">
      <p>
        For each team, ask which number it is judged on, and whether that number can look better while a client waits
        longer or a risk moves elsewhere. Add one shared measure for the whole journey, from request to answer, and
        judge every change by it.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .road {
    stroke-linecap: round;
  }
  .road.main {
    stroke: var(--tkc-conditions);
  }
  .road.bypass {
    stroke: var(--tkc-ink-2);
    opacity: 0.7;
  }
  .link {
    stroke: var(--tkc-rule);
    stroke-dasharray: 5 5;
    stroke-linecap: round;
  }
  .link.open {
    stroke: var(--tkc-conditions);
    stroke-dasharray: none;
  }
  .node {
    fill: var(--tkc-ink);
  }
  .junction {
    fill: var(--tkc-surface);
    stroke: var(--tkc-ink-2);
    stroke-width: 2;
  }
</style>
