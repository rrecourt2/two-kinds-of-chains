<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { linear, line } from '../lib/scales.js';

  const game = getContext('tkc-game');
  const done = $derived(!game.isOpen('black-swans'));

  // Four project files. The cover shows one side; the other is inside the file.
  const FILES = [
    { value: 'a', cover: 'Category A', note: 'Highest environmental and social risk', hidden: 'the plan status', inside: 'Action plan on file', verdict: 'Agrees with the claim', kind: 'test' },
    { value: 'c', cover: 'Category C', note: 'Minimal environmental and social risk', hidden: 'the plan status', inside: 'No action plan', verdict: 'Says nothing about the claim', kind: 'idle' },
    { value: 'plan', cover: 'Action plan on file', hidden: 'the category', inside: 'Category B', verdict: 'Could only ever agree', kind: 'idle' },
    { value: 'none', cover: 'No action plan', hidden: 'the category', inside: 'Category A', verdict: 'Breaks the claim', kind: 'swan' },
  ];

  let picked = $state([]);
  const toggle = (v, on) => {
    if (!done) picked = on ? [...picked, v] : picked.filter((p) => p !== v);
  };

  const puzzle = {
    goal: 'The claim: every Category A project has an action plan on file. Each file shows its category or its plan status on the cover, and the other inside. Which files must you open to test the claim, and no more?',
    choices: FILES.map((f) => ({ value: f.value, label: f.cover })),
    answer: ['a', 'none'],
    multi: true,
    wrong: (v) =>
      v.includes('plan')
        ? 'A file with a plan cannot break the claim, whatever its category. Which files could?'
        : v.includes('c')
          ? 'The claim says nothing about Category C projects.'
          : 'Half right. One more file could hide a problem.',
    hints: ['Look for the files that could prove the claim wrong, not the ones that could agree with it.', 'The claim is false only if some Category A project has no plan. Which covers could hide one?'],
    found: 'Category A and No action plan. And the claim is wrong: the file without a plan belongs to a Category A project.',
  };

  // The turkey: its confidence that tomorrow will be fine, after n good days (Laplace's rule).
  let turkeyW = $state(360);
  const confidence = (goodDays) => (goodDays + 1) / (goodDays + 2);
  const TH = 120;
  const tm = { top: 12, right: 10, bottom: 24, left: 38 };
  const tx = $derived(linear(0, 1001, tm.left, turkeyW - tm.right));
  const ty = linear(0, 1, TH - tm.bottom, tm.top);
  const turkeyPath = $derived(line([...Array.from({ length: 101 }, (_, i) => [tx(i * 10), ty(confidence(i * 10))]), [tx(1001), ty(0)]]));
</script>

<!-- The four files are the puzzle's choices: real checkboxes while it is open, opened files once it is done. -->
{#snippet files()}
  {#if done}
    <div class="files">
      {#each FILES as f (f.value)}
        <div class="file {f.kind}">
          <span class="cover">{f.cover}</span>
          {#if f.note}<span class="note">{f.note}</span>{/if}
          <span class="inside">
            <span class="inside-label">Inside</span>
            <strong>{f.inside}</strong>
            <span class="verdict">{f.verdict}</span>
          </span>
        </div>
      {/each}
    </div>
  {:else}
    <fieldset class="files">
      <legend class="tkc-sr">Choose the files to open</legend>
      {#each FILES as f (f.value)}
        {@const on = picked.includes(f.value)}
        <label class="file pickable" class:on>
          <input type="checkbox" class="box" checked={on} onchange={(ev) => toggle(f.value, ev.currentTarget.checked)} />
          <span class="cover">{f.cover}</span>
          {#if f.note}<span class="note">{f.note}</span>{/if}
          <span class="inside closed">
            <span class="inside-label">Inside: {f.hidden}</span>
            <span class="pick">{on ? 'Open this one' : ''}</span>
          </span>
        </label>
      {/each}
    </fieldset>
  {/if}
{/snippet}

<Chapter
  n={10}
  kicker="Black swans"
  title="How to find a black swan"
  lede="A claim with years of evidence behind it can still be false. Four files and one claim: which would you open?"
  puzzle="black-swans"
>
  {#snippet setup()}
    <p>
      Take a claim of the kind any portfolio report might make: every Category A project, the kind with the highest
      environmental and social risk, has an action plan on file. It has held for years, and every audit sample so far
      has agreed with it.
    </p>
    <p>
      Each project file has its category on one side and its action-plan status on the other. Four files lie on the
      desk, one side up. Opening a file takes time, so you want to open only the ones that matter.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Four project files" sub="Tick the files you would open, then check.">
      <Puzzle id="black-swans" {...puzzle} bind:picked picker={files} onshow={() => (picked = ['a', 'none'])} />
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      The two files to open are the ones that could prove the claim wrong. A Category A file might have no plan inside.
      A file without a plan might belong to a Category A project, and here it does. The file with a plan can only
      agree, whatever its category, and Category C says nothing either way.
    </p>
    <p>
      The psychologist Peter Wason designed this puzzle in 1966. In his experiments fewer than one person in ten chose
      the right two cards; most turned over the one that could only agree. We look for evidence that we are right.
    </p>
    <p>
      For centuries Europeans took it as settled that all swans are white, because every swan anyone had seen was
      white. In 1697 Dutch explorers in Western Australia found black swans. The philosopher Karl Popper built his view
      of science on that asymmetry: no number of white swans proves that all swans are white, and one black swan proves
      that they are not. A claim earns trust only by surviving tests that could have broken it.
    </p>
    <p>
      Bertrand Russell told a darker version about a chicken; it is better known with a turkey. Fed every day for a
      thousand days, the turkey grows surer with every meal that people are kind, and is surest on the day before
      Christmas. A thousand confirmations, and not one test.
    </p>
    <figure class="turkey" bind:clientWidth={turkeyW}>
      <svg width={turkeyW} height={TH} role="img" aria-label="The turkey's confidence rises towards 100% over 1,000 days, then collapses on day 1,001.">
        {#each [0, 0.5, 1] as t}
          <line class="tkc-grid" x1={tm.left} x2={turkeyW - tm.right} y1={ty(t)} y2={ty(t)} />
          <text class="tkc-axis-label" x={tm.left - 6} y={ty(t) + 4} text-anchor="end">{t * 100}%</text>
        {/each}
        <path d={turkeyPath} class="turkey-line" />
        <circle cx={tx(1000)} cy={ty(confidence(1000))} r="4" class="peak" />
        <text class="tkc-axis-label" x={tx(0)} y={TH - 6}>Day 1</text>
        <text class="tkc-axis-label" x={tx(1001)} y={TH - 6} text-anchor="end">Day 1,001</text>
      </svg>
      <figcaption class="tkc-caption">The turkey’s confidence that tomorrow will be fine, updated after every good day.</figcaption>
    </figure>
    <h3>Long chains rest on untested claims</h3>
    <p>
      A long, rigid chain rests on many claims like this one: the backup works, the stand-in knows the file, the
      supplier can always deliver, the model holds in a crisis. Each has years of agreeing evidence, which is to say a
      count of white swans. A system with alternatives survives one of them being wrong. A rigid chain fails at its
      weakest untested link, and often all at once.
    </p>
    <p>So go looking for the black swan before it finds you.</p>
    <ul>
      <li><strong>Fire drills.</strong> Switch off a system, or send the key person on holiday, and see what stops.</li>
      <li><strong>Reverse stress tests.</strong> Instead of asking whether the bank survives the expected scenario, ask which scenario would break it, and how far away it is.</li>
      <li><strong>Pre-mortems.</strong> Before a big decision, imagine it has failed a year from now, and ask why.</li>
      <li><strong>Keep the counterexamples.</strong> A near miss, a complaint or a deal that went wrong carries more information than a thousand files that agree.</li>
    </ul>
    <p>
      There is a second asymmetry, and it is how chains grow long. An incident gets an investigation, a report and a
      new control. The client who gave up waiting, or the project that was never started, leaves no trace. So every
      control has a visible reason to exist, while its cost stays out of sight.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our safest-looking assumptions have we never tried to disprove?">
      <p>
        For each critical assumption, write down what would prove it wrong, then go and look for it. Treat a clean track
        record as a hypothesis, not as proof.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .files {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px 12px;
    margin: 0;
    padding: 10px 0 0;
    border: 0;
    min-width: 0;
  }
  @container fig (max-width: 560px) {
    .files {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .file {
    position: relative;
    display: grid;
    align-content: start;
    gap: 6px;
    min-height: 140px;
    padding: 14px 12px 12px;
    border-radius: 2px 10px 10px 10px;
    border: 1.5px solid var(--tkc-rule);
    background: var(--tkc-surface);
    color: var(--tkc-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
      border-color 200ms ease,
      background 200ms ease;
  }
  .file::before {
    content: '';
    position: absolute;
    top: -9px;
    left: -1.5px;
    width: 42%;
    height: 9px;
    border: 1.5px solid var(--tkc-rule);
    border-bottom: 0;
    border-radius: 6px 6px 0 0;
    background: var(--tkc-surface);
  }
  .file.on,
  .file.on::before {
    border-color: var(--tkc-options);
    background: var(--tkc-options-wash);
  }
  div.file {
    cursor: default;
  }
  .box {
    position: absolute;
    top: 10px;
    right: 10px;
    margin: 0;
    accent-color: var(--tkc-options);
  }
  .box:focus-visible {
    outline: none;
  }
  .file.pickable:has(.box:focus-visible) {
    outline: 2px solid var(--tkc-focus);
    outline-offset: 2px;
  }
  .pickable .cover {
    padding-right: 20px;
  }
  .cover {
    font-weight: 700;
    font-size: 1rem;
    line-height: 1.25;
  }
  .note,
  .pick,
  .inside-label,
  .verdict {
    font-size: 0.8125rem;
    color: var(--tkc-muted);
    line-height: 1.35;
  }
  .pick {
    color: var(--tkc-options-ink);
    font-weight: 600;
  }
  .inside {
    display: grid;
    gap: 2px;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px dashed var(--tkc-rule);
    animation: open 360ms ease both;
  }
  .inside.closed {
    animation: none;
  }
  .file.test,
  .file.test::before {
    border-color: var(--tkc-options);
  }
  .file.swan,
  .file.swan::before {
    border-color: var(--tkc-conditions);
    background: var(--tkc-conditions-wash, var(--tkc-surface));
  }
  .file.swan .verdict {
    color: var(--tkc-conditions-ink);
    font-weight: 700;
  }
  .file.idle,
  .file.idle::before {
    border-style: dashed;
    background: var(--tkc-sunken);
  }
  .file.idle::before {
    border-bottom: 0;
  }
  @keyframes open {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .inside {
      animation: none;
    }
    .file {
      transition: none;
    }
  }
  .turkey {
    margin: 0;
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .turkey-line {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .peak {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 2;
  }
</style>
