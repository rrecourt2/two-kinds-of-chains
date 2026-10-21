<script>
  import { tick } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import TryThis from '../lib/ui/TryThis.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { simulateRaid, VIEW, ENGINES, SHAPES, ZONES } from '../lib/sim/planes.js';
  import { linear, barRight } from '../lib/scales.js';
  import { pct } from '../lib/format.js';

  let vital = $state(60);
  let seed = $state(7);
  let show = $state('returned');
  let guess = $state(null);
  let width = $state(520);
  let answerEl = $state();

  const raid = $derived(simulateRaid({ vital: vital / 100, seed }));
  const all = $derived(show === 'all');
  const right = $derived(guess === 'engines' || guess === 'cockpit');
  const fewest = $derived(ZONES.reduce((a, z) => (raid.density[z.id].returned < raid.density[a.id].returned ? z : a)).label.toLowerCase());
  const guessLabel = $derived(ZONES.find((z) => z.id === guess)?.label.toLowerCase());

  async function choose(id) {
    guess = id;
    show = 'all';
    await tick();
    answerEl?.focus({ preventScroll: true });
  }

  // The plane, scaled to the figure.
  const planeW = $derived(Math.min(width, 520));
  const s = $derived(planeW / VIEW.w);
  const planeH = $derived(VIEW.h * s);

  // Holes per unit of area on each part.
  const BH = 26;
  const bm = { left: 74, right: 40 };
  const maxDensity = $derived(Math.max(1, ...ZONES.map((z) => Math.max(raid.density[z.id].returned, all ? raid.density[z.id].lost : 0))));
  const bx = $derived(linear(0, maxDensity, bm.left, width - bm.right));

  const tries = [
    { label: 'Make vital hits harmless', apply: () => (vital = 0) },
    { label: 'Make them deadly', apply: () => (vital = 90) },
    { label: 'Fly another mission', apply: () => (seed += 1) },
    { label: 'Only the planes that came back', apply: () => (show = 'returned') },
  ];
</script>

<Chapter
  n={11}
  kicker="Survivorship bias"
  title="The planes that came back"
  lede="The data you can see has already been filtered, often by the very outcome you are studying."
>
  {#snippet setup()}
    <p>
      The story, as it is usually told, goes like this. During the Second World War, American analysts studied the
      bombers that came back from missions full of bullet holes, and asked where to add armour. Armour is heavy, so it
      had to go where it would do the most good.
    </p>
    <p>
      Before reading on, decide where you would put the armour.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Where would you add armour?" sub="Each dot is a bullet hole. Hits land anywhere on the plane at random; only some are deadly.">
      <div class="choose" role="group" aria-label="Where would you add armour?">
        {#each ZONES as z (z.id)}
          <button type="button" class="tkc-btn tkc-btn--small" aria-pressed={guess === z.id} onclick={() => choose(z.id)}>{z.label}</button>
        {/each}
      </div>
      {#if guess}
        <p class="answer" tabindex="-1" bind:this={answerEl}>
          {#if vital < 30}
            With vital hits this mild, holes are spread fairly evenly and nearly every plane comes back. Raise the chance
            that an engine or cockpit hit is fatal and watch those parts go quiet.
          {:else if right}
            Right. The {guessLabel} of the planes that came back have few holes, because planes hit there mostly did not
            come back. The cleanest part this mission: the {fewest}.
          {:else}
            The {guessLabel} of the planes that came back are full of holes, and those planes came back anyway. Now look at
            the planes that were lost.
          {/if}
        </p>
      {/if}

      <div class="tkc-controls">
        <Segmented
          name="s-show"
          label="Show"
          bind:value={show}
          options={[
            { value: 'returned', label: 'Planes that came back' },
            { value: 'all', label: 'All planes' },
          ]}
        />
        <Slider id="s-vital" label="Chance a hit on an engine or the cockpit brings a plane down" bind:value={vital} min={0} max={90} step={10} format={(v) => `${v}%`} />
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg class="plane" width={planeW} height={planeH} role="img" aria-label="Bullet holes on {all ? 'all planes' : 'the planes that came back'}. {raid.returned} of {raid.planes} planes came back.">
          <g transform="scale({s})">
            <rect x={SHAPES.wings.x} y={SHAPES.wings.y} width={SHAPES.wings.w} height={SHAPES.wings.h} rx="12" class="part" />
            <rect x={SHAPES.tail.x} y={SHAPES.tail.y} width={SHAPES.tail.w} height={SHAPES.tail.h} rx="8" class="part" />
            <rect x={SHAPES.fuselage.x} y={SHAPES.fuselage.y} width={SHAPES.fuselage.w} height={SHAPES.fuselage.h} rx="14" class="part" />
            {#each ENGINES as e (e.cx)}
              <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} class="part engine" />
            {/each}
            <line x1={SHAPES.fuselage.x + 2} x2={SHAPES.fuselage.x + SHAPES.fuselage.w - 2} y1="64" y2="64" class="seam" />
            {#each raid.hits as h, i (i)}
              {#if h.returned || all}
                <circle cx={h.x} cy={h.y} r={2.6 / Math.max(0.6, s)} class="hole" class:lost={!h.returned} />
              {/if}
            {/each}
          </g>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch" style:background="var(--tkc-ink-2)"></span>Hole in a plane that came back</span>
          {#if all}<span><span class="tkc-swatch" style:background="var(--tkc-conditions)"></span>Hole in a plane that was lost</span>{/if}
        </div>
      </div>

      <div class="tkc-chart">
        <div class="tkc-fig-title small">How densely each part was hit</div>
        <svg {width} height={ZONES.length * BH + 6} role="img" aria-label="Holes per area on each part of the plane, planes that came back{all ? ' and planes lost' : ''}: {ZONES.map((z) => `${z.label} ${Math.round(raid.density[z.id].returned)}${all ? ` and ${Math.round(raid.density[z.id].lost)}` : ''}`).join(', ')}.">
          {#each ZONES as z, i (z.id)}
            {@const y = 4 + i * BH}
            {@const d = raid.density[z.id]}
            <text class="tkc-label-2" x="0" y={y + 15}>{z.label}</text>
            <path d={barRight(bm.left, y + 3, Math.max(1, bx(d.returned) - bm.left), all ? 8 : 14)} class="dbar" />
            {#if all}<path d={barRight(bm.left, y + 12, Math.max(1, bx(d.lost) - bm.left), 8)} class="dbar lost" />{/if}
          {/each}
        </svg>
      </div>

      <div class="tkc-stats" use:announce>
        <Stat label="Planes that came back" value="{raid.returned} of {raid.planes}" sub="after one mission" />
        <Stat
          label="Came back after a hit to an engine or the cockpit"
          value={pct(raid.vitalHit.returned / Math.max(1, raid.vitalHit.planes))}
          sub="after hits elsewhere only: {pct(raid.otherOnly.returned / Math.max(1, raid.otherOnly.planes))}"
          swatch="var(--tkc-conditions)"
        />
      </div>

      <TryThis items={tries} />

      {#snippet model()}
        <p>{raid.planes} planes fly a mission. Each takes one or more hits, on average two and a half, landing anywhere on the plane with equal chance. A hit on an engine or the cockpit brings the plane down with the chance you set; a hit on the body or wings with 5%, on the tail with 12%.</p>
        <p>Counting holes per area treats big and small parts fairly. It relies on the same assumption Wald made: that gunners could not aim at particular parts.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      The statistician Abraham Wald, of the Statistical Research Group at Columbia University, saw what the data could
      not show: the planes that came back were hit everywhere except where a hit was deadly. Their holes show where a plane can be
      hit and still fly home. The clean areas show where the lost planes were hit. The armour belongs where the holes are
      not. Wald’s real analysis was more technical than the story, but the lesson holds: the sample had been filtered by
      the very thing being studied.
    </p>
    <h3>Organizations learn from survivors too</h3>
    <ul>
      <li>
        <strong>Success stories.</strong> Studies of successful companies find the habits that made them great, but rarely check whether companies that failed had the same habits. Two of the “great” companies in a bestselling business book from
        2001, Circuit City and Fannie Mae, were in deep trouble by 2008.
      </li>
      <li>
        <strong>Track records.</strong> Databases of investment funds used to drop the funds that closed, so the average
        fund looked better than what investors actually earned.
      </li>
      <li><strong>Feedback.</strong> Surveys reach the clients who stayed and the colleagues who stayed. Those who left are not in the sample.</li>
    </ul>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Whose experience is missing from the data we decide with?">
      <p>
        Before copying a success, ask how many tried the same and failed. And talk to the clients who left and the
        colleagues who moved on: they hold the holes that are not on the plane.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .plane {
    display: block;
    margin-inline: auto;
  }
  .choose {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .choose button[aria-pressed='true'] {
    background: var(--tkc-ink);
    border-color: var(--tkc-ink);
    color: var(--tkc-page);
  }
  .answer {
    font-weight: 600;
    color: var(--tkc-ink);
    max-width: 40rem;
  }
  .answer:focus {
    outline: none;
  }
  .part {
    fill: var(--tkc-sunken);
    stroke: var(--tkc-muted);
    stroke-width: 1.5;
  }
  .engine {
    fill: var(--tkc-surface);
  }
  .seam {
    stroke: var(--tkc-rule);
    stroke-width: 1.5;
  }
  .hole {
    fill: var(--tkc-ink-2);
  }
  .hole.lost {
    fill: var(--tkc-conditions);
  }
  .dbar {
    fill: var(--tkc-ink-2);
  }
  .dbar.lost {
    fill: var(--tkc-conditions);
  }
</style>
