<script>
  import { getContext, onMount, untrack } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { watchmakers, PARTS, MODULE, HORA_ASSEMBLIES } from '../lib/sim/watchmakers.js';
  import { makeRng } from '../lib/sim/rng.js';
  import { linear, barRight } from '../lib/scales.js';
  import { int } from '../lib/format.js';
  import { prefersReducedMotion, watchVisibility } from '../lib/motion.js';

  const game = getContext('tkc-game');
  // A prediction: the slider and the monthly totals open after the first answer or a hint.
  const live = $derived(game.engaged('modules'));

  let interrupt = $state(10); // tenths of a percent per part
  // Before the first answer the slider runs from quiet up to the asked case, 1.0%; busier settings open after it.
  const ASKED = 10;
  const p = $derived(interrupt / 1000);
  const w = $derived(watchmakers(p));

  // The workshop. Each step, both watchmakers place one part, or are interrupted and lose the work in hand.
  const RATE = 120; // steps per second of animation
  const MODULES = 100; // Hora's first ten-part modules; then ten assemblies of ten modules; then the watch
  let tempus = $state({ parts: 0, best: 0, watches: 0, flashAt: -1e9 });
  let hora = $state({ assembly: 0, progress: 0, watches: 0, flashAt: -1e9 });
  let steps = $state(0);
  let clock = $state(0);
  let paused = $state(false);
  let rngT = makeRng(11);
  let rngH = makeRng(23);
  let panel = $state();
  let width = $state(560);
  const still = prefersReducedMotion();

  function restart() {
    tempus = { parts: 0, best: 0, watches: 0, flashAt: -1e9 };
    hora = { assembly: 0, progress: 0, watches: 0, flashAt: -1e9 };
    steps = 0;
    rngT = makeRng(11);
    rngH = makeRng(23);
  }
  // A new interruption rate starts both workshops afresh.
  $effect(() => {
    p;
    untrack(restart);
  });

  function step(now) {
    steps += 1;
    if (rngT() < p) {
      tempus.parts = 0;
      tempus.flashAt = now;
    } else {
      tempus.parts += 1;
      if (tempus.parts > tempus.best) tempus.best = tempus.parts;
      if (tempus.parts >= PARTS) {
        tempus.watches += 1;
        tempus.parts = 0;
      }
    }
    if (rngH() < p) {
      hora.progress = 0;
      hora.flashAt = now;
    } else {
      hora.progress += 1;
      if (hora.progress >= MODULE) {
        hora.progress = 0;
        hora.assembly += 1;
        if (hora.assembly >= HORA_ASSEMBLIES) {
          hora.assembly = 0;
          hora.watches += 1;
        }
      }
    }
  }

  onMount(() => {
    if (still) return;
    let raf = 0;
    let last = 0;
    let carry = 0;
    const loop = (t) => {
      if (last && !paused) {
        carry += Math.min(0.1, (t - last) / 1000) * RATE;
        while (carry >= 1) {
          step(t);
          carry -= 1;
        }
      }
      last = t;
      clock = t;
      raf = requestAnimationFrame(loop);
    };
    const stop = watchVisibility(panel, (visible) => {
      cancelAnimationFrame(raf);
      last = 0;
      if (visible) raf = requestAnimationFrame(loop);
    });
    return () => {
      stop();
      cancelAnimationFrame(raf);
    };
  });

  const tFlash = $derived(clock - tempus.flashAt < 220);
  const hFlash = $derived(clock - hora.flashAt < 220);
  const fill = (k) => (hora.assembly > k ? 1 : hora.assembly === k ? hora.progress / MODULE : 0);
  const cells = $derived(Array.from({ length: MODULES }, (_, i) => fill(i)));
  const rows = $derived(Array.from({ length: 10 }, (_, r) => fill(MODULES + r)));
  const final = $derived(fill(HORA_ASSEMBLIES - 1));

  // Geometry: a long bar for Tempus's single run, a ten-by-ten grid for Hora's modules.
  const cs = $derived(Math.max(9, Math.min(16, (width - 27) / 10)));
  const gap = 3;
  const gridW = $derived(10 * cs + 9 * gap);
  const TY = 40;
  const GY = 128;
  const H = $derived(GY + 10 * (cs + gap) + 6);

  // The long run: watches a month at one part a minute, 160 hours. The scale stops short of the
  // right edge, so that a value label always fits beside its bar ("9.6 a month" at the most).
  const wx = $derived(linear(0, 10, 76, Math.max(140, width - 84)));
  const every = (perMonth) => {
    if (perMonth >= 1) return `${perMonth.toFixed(1)} a month`;
    const months = 1 / perMonth;
    if (months < 24) return `one every ${Math.round(months)} months`;
    const years = months / 12;
    return years > 1000 ? 'almost never' : `one every ${Math.round(years)} years`;
  };

  const puzzle = {
    goal: 'Both watchmakers are interrupted, on average, once every hundred parts. How many watches does Hora finish for every one that Tempus finishes?',
    choices: [
      { value: '2', label: 'About two' },
      { value: '10', label: 'About ten' },
      { value: '100', label: 'About a hundred' },
      { value: 'thousands', label: 'Thousands' },
    ],
    answer: 'thousands',
    wrong: (v) => `${v === '100' ? 'More than that.' : 'Far more than that.'} Watch how far Tempus gets before each interruption.`,
    hints: ['Tempus has to place 1,000 parts in a row without an interruption. How often does that happen at one in a hundred?', 'Hora only ever needs ten in a row, which happens nine times in ten.'],
    found: 'Thousands: about 2,000 here, because Tempus gets through 1,000 parts in a row less than once in 20,000 tries.',
  };
</script>

<Chapter
  n={14}
  kicker="Modules"
  title="Two watchmakers"
  lede="Two watchmakers, equally skilled, make the same watch. One prospers, and the other loses his shop. The difference is the shape of the work."
  puzzle="modules"
>
  {#snippet setup()}
    <p>
      Kauffman’s teams escaped their dead ends by working inside modules. Herbert Simon, a Nobel economist and one of the
      founders of artificial intelligence, had shown why in a parable of 1962. Tempus and Hora both make fine watches of
      1,000 parts, and both are often interrupted by customers calling.
    </p>
    <p>
      Tempus builds each watch in one go. When he puts it down to answer the phone, it falls apart and he starts again.
      Hora builds modules of ten parts that hold together, then joins ten modules into a larger one, and ten of those into
      the watch. An interruption costs Hora only the module in hand.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument rules={['A watch has 1,000 parts; each minute a watchmaker places one, unless interrupted.', 'An interruption undoes all of Tempus’s unfinished watch.', 'Hora builds in modules of ten; an interruption undoes only the module in hand.']} title="The two workshops" sub="Both watchmakers at work, one part a minute.">
      <Puzzle id="modules" {...puzzle} predict onshow={() => (interrupt = ASKED)} />

      <div class="tkc-controls tkc-controls--wide">
        <Slider
          id="w-int"
          label="Interruptions"
          bind:value={interrupt}
          min={0}
          max={20}
          format={(v) => `${(v / 10).toFixed(1)}% a part`}
          ends={['Quiet', 'Busy']}
          limit={live ? null : ASKED}
          limitNote="Busier workshops, and the long-run totals, open after your first answer."
        />
      </div>

      <div class="race" bind:this={panel} bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label="Tempus has finished {tempus.watches} watches; his longest run is {tempus.best} parts. Hora has finished {hora.watches}.">
          <text class="tkc-label" x="0" y="14">Tempus</text>
          <text class="tkc-axis-label" x="0" y="30">one piece of 1,000 parts</text>
          <text class="tkc-label" x={width} y="14" text-anchor="end">{tempus.watches} {tempus.watches === 1 ? 'watch' : 'watches'}</text>
          <text class="tkc-axis-label" x={width} y="30" text-anchor="end">longest run: {int(tempus.best)} parts</text>
          <rect x="0" y={TY} width={width} height="14" rx="7" class="track" class:flash={tFlash} />
          <path d={barRight(0, TY, (tempus.parts / PARTS) * width, 14, 7)} class="tbar" />
          {#if tempus.best > 0}
            {@const bx = (tempus.best / PARTS) * width}
            <line x1={bx} x2={bx} y1={TY - 4} y2={TY + 18} class="best" />
            <text class="tkc-axis-label" x={bx} y={TY + 31} text-anchor={bx < 40 ? 'start' : bx > width - 40 ? 'end' : 'middle'}>longest run</text>
          {/if}

          <text class="tkc-label" x="0" y="96">Hora</text>
          <text class="tkc-axis-label" x="0" y="112">each square is a module of ten parts</text>
          <text class="tkc-label" x={width} y="96" text-anchor="end">{hora.watches} {hora.watches === 1 ? 'watch' : 'watches'}</text>
          {#each cells as f, i (i)}
            {@const x = (i % 10) * (cs + gap)}
            {@const y = GY + Math.floor(i / 10) * (cs + gap)}
            <rect {x} {y} width={cs} height={cs} rx="2" class="cell" class:flash={hFlash && hora.assembly === i} />
            {#if f > 0}<rect {x} y={y + cs * (1 - f)} width={cs} height={cs * f} rx="2" class="cell-fill" class:part={f < 1} />{/if}
          {/each}
          {#each rows as f, r (r)}
            {#if f > 0}
              <rect x="-2" y={GY + r * (cs + gap) - 2} width={(gridW + 4) * f} height={cs + 4} rx="4" class="joined" class:flash={hFlash && hora.assembly === MODULES + r} />
            {/if}
          {/each}
          {#if final > 0}
            <rect x="-5" y={GY - 5} width={(gridW + 10) * final} height={10 * (cs + gap) + 7} rx="6" class="whole" />
          {/if}
        </svg>
        <p class="tkc-caption">A row of ten modules is a larger module; ten rows make the watch.</p>
        <p class="tkc-caption">
          {#if still}
            The animation is off because this device asks for reduced motion.
          {:else}
            {int(steps / 60)} working hours so far, at one part a minute.
            <button type="button" class="tkc-btn tkc-btn--small inline" onclick={() => (paused = !paused)}>{paused ? 'Resume' : 'Pause'}</button>
          {/if}
        </p>
      </div>

      {#if live}
        <div class="monthly" use:announce>
          <span class="tkc-fig-title small">In the long run</span>
          <svg {width} height="76" role="img" aria-label="Watches finished per month: Tempus {every(w.tempus.perMonth)}, Hora {every(w.hora.perMonth)}.">
            {#each [{ name: 'Tempus', v: w.tempus.perMonth }, { name: 'Hora', v: w.hora.perMonth }] as row, i (row.name)}
              {@const yy = 4 + i * 36}
              <text class="tkc-label" x="0" y={yy + 15}>{row.name}</text>
              {@const ahead = row.v >= Math.max(w.tempus.perMonth, w.hora.perMonth)}
              <path d={barRight(wx(0), yy + 2, Math.max(2, wx(Math.min(10, row.v)) - wx(0)), 18)} class="wbar" class:win={ahead && row.name === 'Hora'} class:lose={!ahead && row.name === 'Tempus'} />
              <text class="tkc-label-2" x={wx(Math.min(10, row.v)) + 6} y={yy + 15}>{every(row.v)}</text>
            {/each}
          </svg>
          <p class="tkc-caption">
            Watches finished a month, at one part a minute for 160 working hours. With no interruptions Tempus is
            slightly faster, because modules cost a little extra assembly.
            {#if interrupt > 0}At {(interrupt / 10).toFixed(1)}% Hora is {w.ratio < 10 ? `${w.ratio.toFixed(1)} times` : w.ratio < 1e6 ? `about ${int(Number(w.ratio.toPrecision(2)))} times` : 'more than a million times'} as productive.{/if}
          </p>
        </div>
      {/if}

      {#snippet model()}
        <p>Each watch has 1,000 parts. At every step a watchmaker either places one part or is interrupted, with the chance you set. An interruption makes Tempus’s whole unfinished watch fall apart.</p>
        <p>Hora builds 100 modules of ten parts, then 10 assemblies of ten modules, then the watch: 111 assemblies of ten steps each, and an interruption undoes only the assembly in hand. The monthly figures are exact long-run averages.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Tempus is no worse at making watches than Hora. His work is one chain of a thousand steps, and every interruption
      sends him back to the start. Hora’s is a hundred and eleven short chains, each of which ends in something that
      holds. At one interruption in a hundred, ten steps in a row happen nine times in ten; a thousand in a row almost
      never happen. Simon’s own, rougher arithmetic gave Hora about 4,000 watches for each of Tempus’s.
    </p>
    <p>
      The links inside Hora’s modules are still <span class="tkc-and">ANDs</span>: every part must be in place. What
      changes is how far a break travels. At one in a hundred, an interruption costs Hora at most ten minutes of work, and
      costs Tempus more than an hour and a half on average.
    </p>
    <p>
      Simon’s point was that complex systems which survive and adapt are almost always built like Hora’s watches, from
      stable parts with few links between them: cells, organs, firms, cities. It is also why AI agents work best when a
      big task is broken into small steps whose results are saved, and why regulators ring-fence parts of banks, so that
      trouble in one part stays there.
    </p>
    <p>
      John Gall, a doctor who wrote about why systems fail, put the same idea as a law in 1975: a complex system that
      works is invariably found to have evolved from a simple system that worked. A complex system designed from scratch,
      he added, never works and cannot be patched up to make it work.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our long processes lose their progress when someone is interrupted?">
      <p>
        A request that has to be finished in one sitting, by one person, is built like Tempus’s watch. One that is saved
        in finished pieces, each with a clear owner, is built like Hora’s. So is a credit paper whose sections can be
        reviewed as each is finished, rather than only once the whole is done.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .race {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 6px;
  }
  .track {
    fill: var(--tkc-sunken);
    stroke: var(--tkc-hair);
    transition: fill 120ms ease;
  }
  .track.flash {
    fill: var(--tkc-conditions-wash);
    stroke: var(--tkc-conditions);
  }
  /* Tempus's one long chain, the one that breaks: orange. Hora's finished modules: blue. */
  .tbar {
    fill: var(--tkc-conditions);
  }
  .best {
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
  }
  .cell {
    fill: var(--tkc-sunken);
  }
  .cell.flash {
    fill: var(--tkc-conditions);
  }
  .cell-fill {
    fill: var(--tkc-options);
  }
  .cell-fill.part {
    opacity: 0.6;
  }
  .joined {
    fill: none;
    stroke: var(--tkc-options);
    stroke-width: 1.5;
  }
  .joined.flash {
    stroke: var(--tkc-conditions);
  }
  .whole {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
  }
  .inline {
    margin-left: 8px;
  }
  .monthly {
    display: grid;
    gap: 6px;
    min-width: 0;
    padding-top: 10px;
    border-top: 1px solid var(--tkc-hair);
  }
  .small {
    font-size: 0.9375rem;
  }
  .wbar {
    fill: var(--tkc-ink-2);
  }
  .wbar.win {
    fill: var(--tkc-options);
  }
  .wbar.lose {
    fill: var(--tkc-conditions);
  }
</style>
