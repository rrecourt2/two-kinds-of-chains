<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';

  const game = getContext('tkc-game');
  const done = $derived(!game.isOpen('black-swans'));

  // Four project files. The cover shows one side; the other is inside the file.
  const FILES = [
    { value: 'a', cover: 'Category A', note: 'Significant, possibly irreversible impacts', hidden: 'the ESAP status', inside: 'ESAP on file', verdict: 'Agrees with the claim', kind: 'test' },
    { value: 'c', cover: 'Category C', note: 'Minimal or no adverse impacts', hidden: 'the ESAP status', inside: 'No ESAP', verdict: 'Says nothing about the claim', kind: 'idle' },
    { value: 'plan', cover: 'ESAP on file', hidden: 'the category', inside: 'Category B', verdict: 'Could only ever agree', kind: 'idle' },
    { value: 'none', cover: 'No ESAP', hidden: 'the category', inside: 'Category A · Hydropower dam', verdict: 'Breaks the claim', kind: 'swan' },
  ];

  // The file that turns up once the puzzle is done: no test of the claim would have opened it.
  const FIFTH = {
    cover: 'Category B · Solar plant',
    note: 'Limited, site-specific impacts',
    inside: 'Polysilicon in the panels traced to suppliers linked to forced labour, thousands of kilometres from the site.',
    verdict: 'Right about the site, blind to the risk.',
  };

  let picked = $state([]);
  const toggle = (v, on) => {
    if (!done) picked = on ? [...picked, v] : picked.filter((p) => p !== v);
  };

  const puzzle = {
    goal: 'Which files must be opened to test the claim, and no more?',
    choices: FILES.map((f) => ({ value: f.value, label: f.cover })),
    answer: ['a', 'none'],
    multi: true,
    wrong: (v) =>
      v.includes('plan')
        ? 'A file with an ESAP cannot break the claim, whatever its category. Which files could?'
        : v.includes('c')
          ? 'The claim says nothing about Category C projects.'
          : 'Half right. One more file could hide a problem.',
    hints: ['Look for the files that could prove the claim wrong, not the ones that could agree with it.', 'The claim is false only if some Category A project has no ESAP. Which covers could hide one?'],
    found: 'Category A and No ESAP. And the claim is wrong: the file without an ESAP belongs to a Category A project.',
  };
</script>

<!-- The four files are the puzzle's choices: real checkboxes while it is open, opened files once it is done,
     with a fifth file that no test of the claim would have opened. -->
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
    <div class="extra">
      <p class="extra-head">A fifth file, the one nobody planned to open</p>
      <div class="file other">
        <span class="cover">{FIFTH.cover}</span>
        <span class="note">{FIFTH.note}</span>
        <span class="inside">
          <span class="inside-label">Inside</span>
          <strong>{FIFTH.inside}</strong>
          <span class="verdict">{FIFTH.verdict}</span>
        </span>
      </div>
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
  n={9}
  kicker="Black swans"
  title="How to find a black swan"
  lede="A claim with years of evidence behind it can still be false. Four project files and one claim: which would you open?"
  puzzle="black-swans"
>
  {#snippet setup()}
    <p>
      Before 2008, the claim that links between banks spread risk thinly had years of evidence behind it. Claims like
      that are hard to test, because the cases that could break them are rare.
    </p>
    <p>
      Many development lenders assess projects against IFC’s Performance Standards and sort them by environmental and
      social risk into IFC’s categories: A for significant impacts that may be irreversible, such as a large dam that
      resettles whole villages; B for limited, site-specific ones; C for minimal ones.
    </p>
    <p>
      Take a claim a portfolio report might make: every Category A project has an agreed Environmental and Social Action
      Plan (ESAP) on file. It has held
      for years, and every audit sample so far has agreed with it. Four files lie on the desk. Opening one takes time,
      so the question is which ones matter.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title={done ? 'Four project files, and a fifth' : 'Four project files'}
      sub={done ? 'The four files opened, and one that no test of the claim would open.' : 'Tick the files you would open, then check.'}
      rules={[
        'The claim: every Category A project has an ESAP on file.',
        'Each file shows its category on one side and its ESAP status on the other.',
        'Four files lie one side up; opening one shows the other side.',
      ]}
    >
      <Puzzle id="black-swans" {...puzzle} bind:picked picker={files} onshow={() => (picked = ['a', 'none'])} />

      {#snippet model()}
        <p>
          The categories come from IFC’s Sustainability Policy (2012). Category A: “potential significant adverse
          environmental or social risks and/or impacts that are diverse, irreversible, or unprecedented”. Category B:
          potential limited adverse risks and/or impacts, “few in number, generally site-specific, largely reversible,
          and readily addressed through mitigation measures”. Category C: “minimal or no adverse environmental or social
          risks and/or impacts”.
        </p>
        <p>
          The eight Performance Standards (2012) cover environmental and social risk, from labour (Performance Standard
          2) to resettlement (5) and cultural heritage (8). The Equator Principles, which many commercial banks apply to
          project finance, build on them. The files, the claim and the fifth file are invented for this puzzle.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Only the files that could prove the claim wrong are worth opening. The file with an ESAP can only agree, and
      Category C says nothing either way. The psychologist Peter Wason set this puzzle with cards in 1966; fewer than one
      person in ten chose the right two, and most chose the one that could only agree.
    </p>
    <p>
      For centuries Europeans took it as settled that all swans are white, until Dutch explorers found black ones in
      Western Australia in 1697. Karl Popper built his view of science on that asymmetry: no number of white swans
      proves that all swans are white, and one black swan proves that they are not.
    </p>
    <h3>Long chains rest on untested claims</h3>
    <p>
      A long, rigid chain rests on many claims like the one in the files: the backup works, the stand-in knows the case,
      the model holds in a crisis. Each has years of agreeing evidence, which is to say a count of white swans. A system
      with alternatives survives one of them being wrong; a rigid chain stops at the first. A reverse stress test, a
      fire drill that switches a system off, a near miss looked at closely: each is a way of opening the other file.
    </p>
    <h3>The box nobody drew</h3>
    <p>
      The puzzle’s logic was sound, and it would never have opened the solar plant’s file: its category described the
      site, and the risk arrived through a purchase order. The standards’ supply-chain duties are written for suppliers
      who deliver “on an ongoing basis”; panels bought once, through a contractor, sat at the edge of those words.
    </p>
    <p>
      The boxes have moved before: lending through banks and funds fitted none of A, B or C, so by the late 1990s a
      fourth box, FI, had been added. The standards themselves set outcomes and leave room for judgment, rather than a
      checklist.
    </p>
    <p>
      A rulebook that must foresee every case answers each surprise with a new box, one more condition that every later
      case is checked against. However long the list grows, it still needs an “other”: people with the expertise and the
      room to judge, who can see that a case fits nowhere and say so. That is good complexity; a chain of conditions that
      works only if every case was foreseen is the bad kind.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Where would a risk that fits none of our categories first be noticed, and by whom?">
      <p>
        A clean track record and a tested one look the same in a report. So do a portfolio whose risks all fit its
        categories and one whose largest risk fits none of them.
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
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
    gap: 6px;
    min-height: 140px;
    min-width: 0;
    padding: 14px 10px 12px;
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
    font-size: 0.9375rem;
    line-height: 1.25;
  }
  @container fig (max-width: 300px) {
    .file {
      padding: 12px 8px 10px;
    }
    .pickable .cover {
      padding-right: 14px;
      font-size: 0.875rem;
    }
    .box {
      top: 8px;
      right: 6px;
    }
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

  /* The fifth file: set apart from the four, in the ink colour, arriving after they open. */
  .extra {
    display: grid;
    gap: 16px;
    margin-top: 6px;
    padding-top: 12px;
    border-top: 1px solid var(--tkc-hair);
    animation: arrive 420ms ease 600ms both;
  }
  .extra-head {
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tkc-ink-2);
  }
  .file.other {
    min-height: 0;
    border: 2px solid var(--tkc-ink);
    box-shadow: var(--tkc-shadow);
  }
  .file.other::before {
    top: -10px;
    left: -2px;
    width: min(42%, 180px);
    height: 10px;
    border: 2px solid var(--tkc-ink);
    border-bottom: 0;
  }
  .file.other strong {
    font-size: 0.9375rem;
    line-height: 1.4;
  }
  .file.other .verdict {
    color: var(--tkc-ink);
    font-weight: 700;
  }
  .file.other .inside {
    animation: none;
  }
  @keyframes open {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
  }
  @keyframes arrive {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .inside,
    .extra {
      animation: none;
    }
    .file {
      transition: none;
    }
  }
</style>
