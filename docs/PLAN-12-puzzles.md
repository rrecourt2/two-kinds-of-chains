# Two Kinds of Chains: plan for a 12-puzzle story

This plan says what the author asked for, where the project stands, which twelve puzzles stay and why, what changes
in each, in what order to work, and how to check the result. It is self-contained: the model that wrote it is carrying
it out, and if that work is interrupted, another model or a later session can pick it up from the progress log in
section 7.

**To resume:** check out the branch `twelve-puzzles`, read sections 1 to 5, then continue from the first unfinished
line of the progress log.
**Done means:** the live site shows a story of twelve puzzles in five parts, every check in section 8 passes, and the
author has been told what changed and what is still open.

---

## 1. What the author asked for

First, the request to cut:

> please review all stories again. Check for logic. Let's cut it down to 12 puzzles. try to find the best ones. Try to
> progress learning. Combining concepts. Making it gradually more difficult. Just come up with the plan enabling another
> model to execute.

Then, after seeing the first version of this plan:

> I like the watchmakers. Also a person in the loop. More than the reliability machine. Fine if the opening guess stops
> scoreing. Good to take the knot out. I really really like the average lies. Good it remains. I am fine if you
> implement it all actually. A chain tied in a knot never really. Try to ensure that after this is completed, banking
> executives really understand how complexity theory can help with efficiency through learning, and help with risk
> management. Taleb like ideas through puzzles. But dont make all of this too explicite. It is really learning by
> doing. It needs to really really align with a Bank executives normal work, or actually DFI work. Like make sense
> from a work perspective. Practical. Please update the plan as such.

### What the story is for

After the twelve puzzles, an executive of a development bank should have found out for themselves, by making the
decisions, two things:

- **Work gets faster through options and learning**, not through pressure or extra steps: a stand-in, a shared line,
  work built in pieces, decisions taken where the work arrives, a person checking where a machine swings, small trials
  before a big commitment.
- **Risk is managed by looking past the average**: the path a bank actually lives, the worst year, the place where
  the links meet, the check that is sized to the loss, the memory that matches how fast the world changes.

These are ideas from complexity theory, and several are ones Nassim Taleb made popular. The reader should never be
told so in those words. Each puzzle is a decision from a bank's working week; the idea is what the reader notices
after making it. Section 3 turns this into rules.

### Goals, in order of importance

1. **Twelve puzzles**, the best of the current twenty-two, with the author's choices above.
2. **Every case makes sense as work** to a development-bank executive.
3. **Learning by doing**: the reader decides first and reads second, and the ideas stay light.
4. **Sound logic** in every case.
5. **A progression**: each puzzle brings one new idea and reuses the ones before it; later puzzles combine several;
   what the reader has to do gets harder.

### Standing rules (all still apply)

These come from thirteen rounds of the author's feedback. Breaking one will be noticed.

- **Audience:** executives of a development bank. Cases are designed for them.
- **Never name the author's bank, and never name FMO.** Never name a real institution in the prose. People are fine
  (Adam Smith, Herbert Simon). The sources list in the playbook may name institutions as authors.
- **Never make the author's criticism of their own organisation explicit.** The story is general.
- **Observational, never instructional.** Bank notes and playbook patterns describe what tends to happen and end in a
  question ("Which of our…?"). They never tell the reader what to do. Puzzle goals and hints may use imperatives.
- **Voice:** narrative, with some literary flair. Not condescending, not academic, no economic clichés. The author
  likes the existing text. Do not flatten it or make it technical. "Don't overdo it" is the author's most repeated
  instruction.
- **Language:** plain British English with `-ize` spellings as the story already uses them (organization,
  specialization, programme). Curly quotes. Refer to other chapters by name, never by number.
- **The chain image** (links, AND, OR, chains that break, bend, learn) runs through every chapter. Keep it.
- **Taleb** is named sparingly ("we don't want too many Taleb references. some are ok"): twice at most is a safe
  reading. "Menu" must not come back in the variety chapter. The gate must not offer an option that checks nothing.
- **Cases explain themselves.** The author looks at the case card on the right first, plays with it, and only then
  reads the text. A first-time reader must be able to tell from the card alone what is shown, what each control does
  and what just changed.
- **Build:** one self-contained HTML file (`dist/index.html`), plus a library build for SharePoint (`dist-lib/`).
- **Deploying:** every push to `main` goes live on Vercel. Push only work that has passed section 8.
- **Working method:** the author prefers agents to implement and review in parallel, with the lead model directing
  the narrative and checking each piece before it goes to `main`.

The house style (word limits, colours, controls) is in appendix A. The named ideas and their markup are in appendix B.

---

## 2. Where things stand

| | |
|---|---|
| Repository | `rrecourt2/two-kinds-of-chains` on GitHub; Svelte 5 (runes), Vite 8, `vite-plugin-singlefile` |
| Live site | `https://two-kinds-of-chains.vercel.app`, built from `main` |
| `main` | the live 22-chapter story (commit `4cf890e`) plus this plan and `tools/checks/` |
| Commit `4cf890e` | the 22-chapter story as last published; any cut chapter can be restored from it |
| Branch `twelve-puzzles` | `main` plus commit `4220404`, the unfinished work of the round before. **Work here.** |
| Private artifact | `https://claude.ai/artifact/3vGzcEE9mLkq2JPv3cDGzs` (version 11, the 22-chapter story) |

### The unfinished work on `twelve-puzzles`

The round before this one was cut off mid-build. Its work builds, and the walk-through solves every puzzle. One
unit-test file fails. What each piece is, and what happens to it now:

| Piece | Files | State | Now |
|---|---|---|---|
| Hover notes on underlined ideas | `src/lib/ideas.js`, `src/lib/ui/IdeaNotes.svelte`, `src/App.svelte`, `src/theme.css` | Works with a mouse | Keep. Check touch, keyboard, 320 px, dark theme, SharePoint; write `test/ideas.test.js` |
| Expected range under the loan animation | `src/lib/ui/Hook.svelte` | Works on desktop | Keep. Check phones |
| Fuller explanations | Riddle, Specialization, Modules, Ergodicity, Contagion, Disbursement, Tinkering, Variety | Partly done | Keep; continue for Queues |
| The gate, with shares checked | `Gate.svelte`, `sim/gate.js`, test | Complete, tests pass | Keep, with fix L1 |
| "How fast to forget", new model | `Pace.svelte`, `sim/pace.js` | Chapter and model complete | Keep. `test/pace.test.js` still targets the old model and fails: rewrite it |
| The knot, simplified | `Knot.svelte`, `sim/knot.js`, test | Complete | Cut with the chapter |
| "Running to stand still", recast | `RedQueen.svelte`, `sim/redqueen.js`, test | Complete | Cut with the chapter |

### Check scripts

The browser checks used in every earlier round are in `tools/checks/`. Section 8 says how to run them. They still
list all 24 views and the old storage key; updating them is part of the work.

### Environment notes

- Playwright and Chromium are installed globally in the cloud environment. Scripts load it with
  `createRequire('/opt/node22/lib/node_modules/')`. Never run `playwright install`.
- The cloud network blocks `vercel.app`. To confirm a deploy, read the commit status from GitHub:
  `curl -s https://api.github.com/repos/rrecourt2/two-kinds-of-chains/commits/<sha>/status`.
- `python3 -m http.server <port> --directory dist` is enough to serve a build. Start servers in the background.
- This environment's git policy accepts pushes of branches and refuses pushes of tags. Refer to commits by hash.
- Earlier rounds were cut off by usage limits. Commit and push to the branch often; that does not touch the live site.

---

## 3. Learning by doing, at work

These rules turn the author's latest brief into things that can be checked.

### The work test

Every puzzle has to pass three questions:

1. **Setting:** has a development-bank executive sat in this room or read this report? (A credit committee, a
   review queue, a country office asking for an exception, a payment waiting for a call-back, a conditions list.)
2. **Decision:** is the control a choice that they, or their bank, actually make?
3. **Measure:** is the result a number they already track? (Days to a decision, cases waiting for committee, share of
   payments late, the loss in the worst year, hours saved, clients paid on time.)

Nine of the twelve cases pass as they are. Three are stories from outside the bank that the author likes and wants
kept: the pin workshop, the two watchmakers and the coin game. Each of those gets a **work twin**: one line under its
chart, shown once the puzzle is solved, in the form the story already uses elsewhere ("Read the stake as…"), and a
bank note that restates the same decision in the bank. Do not rebuild those three cases.

### Do first, name after

- The card comes before the explanation. The reader makes the decision, sees it fail or succeed in a number, and only
  then reads why.
- The intuitive first move should be available and should fail informatively. (In the gate, checking half of
  everything keeps the average year under the limit and the worst year far over it, and the card says so.)
- The name of an idea, where it is given at all, comes after the reader has felt it, in a sentence. No chapter opens
  with a theory.
- The labels above the chapter titles are words from work, not from theory: "Delegations", not "Requisite variety";
  "Pilots", not "Convex tinkering"; "Country limits", not "Antifragility"; "Payment checks", not "Gates". The titles
  themselves stay; the author likes them.
- The story never says "complexity theory". The two uses, speed and safety, become visible in the playbook, where the
  twelve patterns are grouped by part.

### What each puzzle lets the reader find out

The last two columns are for whoever builds and reviews the chapters. They are not text for the page.

| # | Puzzle | The decision, in work terms | What the reader finds out by making it | The idea underneath | Use |
|---|---|---|---|---|---|
| 1 | A riddle about chains | How a committee gets enough people in the room: better attendance, or a stand-in for each role | One stand-in per role beats near-perfect attendance | Chances multiply along a chain; a spare is cheap insurance | Speed |
| 2 | Why longer chains get cheaper | When a team of specialists pays for itself | Only above a certain volume; below it the specialists sit idle | The division of labour is limited by the size of the market; efficiency can concentrate dependence | Speed |
| 3 | Two watchmakers | Building long work in one go, or in pieces that hold | Interruptions cost the single piece thousands of times more | Modules; large and brittle against small and sturdy | Speed |
| 4 | Why full calendars make long queues | How full to run the reviewers, and whether work waits for a named person or a pool | Waiting explodes past about 90% busy; one shared line fixes it without hiring | Harm that accelerates; slack is not waste | Speed |
| 5 | Only variety absorbs variety | What a country office may decide on its own | Too few delegations jam head office; one more kind tips it back | Decisions belong where the variety arrives | Speed |
| 6 | When the average lies | How much to stake on a good bet, and whether to pool | A bet that wins on average ruins the typical player; a smaller stake and a pool repair it | The average over many is not the path of one | Safety |
| 7 | When links become conditions | Where extra capital goes in a banking system | Spread evenly it changes nothing; placed at the hubs it stops the collapse | Robust yet fragile; a loss travels along links | Safety |
| 8 | The gate worth keeping | Which disbursements get a call-back | Checking half of everything fails; all the large ones and a tenth of the small ones works; most checks are false alarms | The worst year, not the average, sizes the check; rare events drown in false alarms | Safety |
| 9 | A person in the loop | Where a person checks a machine's drafts | Checking pays once the machine swings: the swings become gains | An option: a small known cost, an open upside | Speed |
| 10 | Many short chains | One big programme, or pilots first | A handful of pilots doubles the typical result and lifts the worst one | Trial and error with small losses; unpredictability as raw material | Both |
| 11 | How fast to forget | How many years of losses set a country limit | Too short a memory reacts to noise; too long misses real change; the best matches how often countries change | Telling noise from change; learning in the right dose | Safety |
| 12 | Time to disbursement | Which conditions truly need the money to wait | One accepted alternative and two conditions moved after the money keep the promise, with every condition still on the list | Fewer conditions, not fewer controls | Both |

---

## 4. The review: all 22 chapters

Every chapter was re-read in its solved state. The verdicts weigh how much the author likes the chapter, how well it
passes the work test, how good the puzzle is, and how sound its logic is. Verdicts marked "author" were decided by
the author's second message.

| Chapter (`id`) | Verdict | Why | Logic |
|---|---|---|---|
| A riddle about chains (`riddle`) | **Keep, 1** | The foundation: AND, OR, quorum; a committee and its stand-ins | Sound |
| Why longer chains get cheaper (`specialization`) | **Keep, 2** | The case for good complexity; the author likes Adam Smith and asked for the chips section | Sound |
| When systems lean on each other (`systems`) | Cut | Never praised; the puzzle is four combinations to try | **Weak.** An approver catches half the problems at each system but 90% at the end; those assumed rates produce the result |
| Why full calendars make long queues (`queues`) | **Keep, 4** | The best self-explaining card; introduces the tipping point | Sound |
| Don't wait for each other (`async`) | Cut | Its one idea (the slowest piece sets the date) returns in the disbursement chapter | Sound |
| The fast track (`emergence`) | Cut, on the bench | Polished, but the author twice found it unclear, and its committee lives on in the variety chapter | Sound; rests on one assumed deferral rate |
| When the average lies (`ergodicity`) | **Keep, 6** (author: "really really like") | The coin game; later chapters lean on it | Sound |
| When links become conditions (`contagion`) | **Keep, 7** | The author likes the capital slider and the play with the biggest banks | Sound |
| How to find a black swan (`black-swans`) | Cut, first on the bench | Sound, and a real case from project finance; if the author wants one more puzzle on risk, this is it | Sound |
| Why species go extinct (`extinction`) | Cut | The only case set in nature; fails the work test; its lesson is the lesson of "Many short chains" | Sound |
| The gate worth keeping (`gate`) | **Keep, 8** | Shaped by the author over several rounds; passes the work test; introduces false positives | One fix (L1) |
| The shape of the network (`graph`) | Cut | Abstract; fails the work test; its point about hubs is in the stress test | **Weak.** Every link costs 2% of both people's time; that number alone produces the answer |
| A chain tied in a knot (`knot`) | **Cut (author)** | "Never really" worked for the author | Its clauses mixed signing, taking effect and paying, so its rings were not rings |
| Two watchmakers (`modules`) | **Keep, 3 (author)** | The author likes it | Sound |
| Time to disbursement (`disbursement`) | **Keep, 12, the finale** | The author likes it; it uses every earlier idea and is the bank's own chain | Sound |
| A warning light, not a tripwire (`covenants`) | Cut, on the bench | Sound and specific to development finance, but a second false-positive case | Sound |
| A person in the loop (`tools`) | **Keep, 9 (author)** | The author likes it more than the reliable machine | Sound |
| The irony of the reliable machine (`automation`) | **Cut (author)** | Its one lasting point (a person who is rarely needed gets out of practice) becomes a sentence in "A person in the loop" | Its puzzle was solved with one click |
| Only variety absorbs variety (`variety`) | **Keep, 5** | "I love Ashby's law"; reuses the queue and its tipping point; a real question about delegations | Sound |
| Many short chains (`tinkering`) | **Keep, 10** | "I really like that concept" | Sound |
| Running to stand still (`redqueen`) | Cut, on the bench | The author doubted its premise; the model's main effect is thin (14% against 17%) | Thin |
| How fast to forget (`pace`) | **Keep, 11** | Rebuilt on the concept the author chose; carries the author's own line about adapting without forgetting | One assumption to state (L2) |

### Logic fixes in the chapters that stay

- **L1, the gate.** (a) "Each call takes one of three reviewers a day" reads as if a telephone call takes a working
  day. Say what is meant: a reviewer closes about one call-back a day, because the client has to be reached on a
  number already on file. (b) The after-text runs to about 370 words and the setup to about 150; both are over the
  limits in appendix A.
- **L2, how fast to forget.** The rule "lending just after a bad year counts double" is an assumption that shapes
  part of the result. Test whether the best memory still sits in the middle without it. If it does, say so in the
  model note. If it does not, keep the rule and state plainly, in the model note, that the result depends on it.
- **L3, the playbook.** The matrix and several patterns cite chapters that are being cut.

---

## 5. The new story: twelve puzzles in five parts

| # | Part | Chapter (`id`) | Was |
|---|---|---|---|
| | | Opening page: one quick guess, no points (`start`) | scored |
| 1 | 1 · Two kinds of chains | A riddle about chains (`riddle`) | 1 |
| 2 | | Why longer chains get cheaper (`specialization`) | 2 |
| 3 | | Two watchmakers (`modules`) | 14 |
| 4 | 2 · How a chain grows rigid | Why full calendars make long queues (`queues`) | 4 |
| 5 | | Only variety absorbs variety (`variety`) | 19 |
| 6 | 3 · When the world pulls on the chain | When the average lies (`ergodicity`) | 7 |
| 7 | | When links become conditions (`contagion`) | 8 |
| 8 | | The gate worth keeping (`gate`) | 11 |
| 9 | 4 · Chains that learn | A person in the loop (`tools`) | 17 |
| 10 | | Many short chains (`tinkering`) | 20 |
| 11 | | How fast to forget (`pace`) | 22 |
| 12 | 5 · One loan, the whole chain | Time to disbursement (`disbursement`) | 15 |
| | | What it means on Monday (`monday`) | same |

How the parts line up with the two uses in section 1: Parts 1 and 2 are about where time goes (speed). Part 3 is
about where losses come from (safety). Part 4 is about how a bank gets better at both by learning. Part 5 is one
loan in which both meet.

Changes in the shape of the story:

- **Part 1 is now the three things that make a long chain work:** options (the riddle), specialization, and pieces
  that hold (the watchmakers).
- **The variety chapter moves to Part 2**, straight after queues: its committee is a queue, and its lesson turns on
  the tipping point the reader has just met.
- **The gate moves to Part 3.** The author's own framing was that it "relates to limiting losses" and "can be
  connected to the coin game". Part 3 then reads as one argument about where protection goes: a smaller stake and a
  pool (the coin game), capital where the links meet (the stress test), checks where the loss would be too large (the
  gate).
- **The finale is one loan.** "Time to disbursement" stands alone as the last puzzle. It is the hardest, it uses
  every earlier idea, and it closes the story where it opened: the opening page asks how many of 100 loans pass six
  checks before the money can be paid out; the last puzzle is twelve conditions before the money moves.

### The progression

"New" is the one idea a puzzle introduces. "Returns" are earlier ideas it uses again, on the card or in the text.

| # | Chapter | New | Returns | The reader has to | Level |
|---|---|---|---|---|---|
| 0 | Opening guess | chances multiply along a chain | | guess one number | warm-up |
| 1 | A riddle about chains | AND, OR, quorum | chances multiply | choose between two changes | 1 |
| 2 | Why longer chains get cheaper | scale: every link has to earn its place | OR (a link with no alternative) | move one slider to a target | 1 |
| 3 | Two watchmakers | pieces that hold: what is finished stays finished | AND (a thousand steps in a row) | predict a size, then watch it | 1 |
| 4 | Why full calendars make long queues | tipping point; links one after another, or side by side | OR (a shared line is the stand-in again), AND (a named reviewer) | make one choice, with a slider to explore | 2 |
| 5 | Only variety absorbs variety | what an office may decide on its own | the queue, tipping point, OR | find the smallest setting that meets a target | 2 |
| 6 | When the average lies | chains that multiply over time; typical against average | AND as multiplying, OR as pooling | set two controls for one target | 2 |
| 7 | When links become conditions | IF; hubs; the loop that feeds itself | quorum, tipping point, the limit of pooling | set two controls for two targets | 3 |
| 8 | The gate worth keeping | false positive; a check sized to the loss | IF, the worst year against the average, the queue, quorum | set two controls for two targets that pull against each other | 3 |
| 9 | A person in the loop | the option: keep the good, drop the bad | OR against AND, swings (the coin game) | predict a reversal, then test it | 3 |
| 10 | Many short chains | options made on purpose | the option, pieces that hold, typical against worst | hit two targets with one slider; the answer is a band | 3 |
| 11 | How fast to forget | memory against change: a loop that steadies itself | the loop, false positive (a bad year that is only noise), IF (a limit) | search for a minimum, then watch it move | 4 |
| 12 | Time to disbursement | moving a condition after the money | AND, OR, side by side, the gate, swings, typical against the slowest | set two controls under two constraints, where neither works alone | 5 |

Rules for carrying this out:

- **One introduction, light callbacks.** Each named idea is explained once, where the table says "New", in a sentence
  or two of plain prose. Wherever it returns, a phrase is enough. Never explain an idea twice.
- **The combination must show on the card, not only in the text.** For example, the gate's tiles give the worst year
  beside the average one (from the coin game) and the late payments with how busy the reviewers are (from queues);
  the variety card shows how full the committee is.
- **No tags, chips or legends for the ideas on the cards.** The author rejected those.
- **Do not turn the puzzles into exercises about operators.** The author: "It should not turn into an operator
  puzzle… It's more important to make recurring concepts clearer."

### What happens to the ten chapters that go

| Cut chapter | Where its best idea lives on |
|---|---|
| The irony of the reliable machine | One sentence in "A person in the loop": a person who is rarely needed gets out of practice, so the steadier the machine, the less the check is worth on the day it turns |
| When systems lean on each other, Don't wait for each other | One short paragraph in the queues chapter: links one after another add their waits; the same reviews side by side wait only for the slowest |
| The fast track | Its committee is the variety chapter's committee. The loop is now introduced in the stress test |
| The shape of the network | "Hubs inside organizations", already in the stress test |
| A chain tied in a knot | Nothing. The author does not want it |
| How to find a black swan, Why species go extinct, A warning light not a tripwire, Running to stand still | Nothing is moved. Three of them are on the bench (section 9) |

---

## 6. Work orders

Do the shell first (6.1): it decides the order and the numbering. Then the chapters. Each order lists only what
changes; everything else in the chapter stays as it is.

### 6.1 The shell

**`src/chapters/index.js`**
- `PARTS`: `['Two kinds of chains', 'How a chain grows rigid', 'When the world pulls on the chain', 'Chains that learn', 'One loan, the whole chain']`.
- `CHAPTERS`: `start`, the twelve in the order of section 5 with their new `part` numbers, then `monday`. Keep every
  `id` and `title`. Change the `short` of `variety` from "Requisite variety" to "Delegations".

**Files to delete** (they remain in commit `4cf890e`)
- Chapters: `Systems`, `Async`, `Local`, `BlackSwans`, `Extinction`, `Graph`, `Knot`, `Covenants`, `Automation`,
  `RedQueen` (`.svelte`, in `src/chapters/`).
- Models in `src/lib/sim/`: `systems.js`, `async.js`, `fasttrack.js`, `tollroad.js`, `species.js`, `scale.js`,
  `knot.js`, `covenants.js`, `automation.js`, `redqueen.js`. Check each with a search before deleting: a kept file
  must not import it.
- Tests: `async`, `automation`, `covenants`, `fasttrack`, `knot`, `redqueen`, `tollroad`, `models`. Prune
  `simplify.test.js` and `sims.test.js` down to the models that stay.

**`src/App.svelte`**
- Old deep links must not break. Map each removed `id` to a kept chapter: `systems` and `async` to `queues`;
  `emergence` to `variety`; `black-swans` and `covenants` to `gate`; `extinction` to `tinkering`; `graph` to
  `contagion`; `knot` to `disbursement`; `automation` to `tools`; `redqueen` to `pace`.

**`src/lib/game.svelte.js`**
- Change the storage key to `two-chains-puzzles-v2`, so stale entries for removed puzzles cannot distort the score.

**Opening page (`src/chapters/Intro.svelte`, `src/lib/ui/Hook.svelte`)**
- Label above the title: "An interactive story in 12 puzzles · every chart is live".
- The quick guess gives no points (the author agreed). It still shows the run, the expected 74 and the range. `start`
  leaves the game's list, so the score is 24 points for 12 puzzles.
- `contents`: one teaser for each of the twelve, in story order, each phrased as the work decision it is.
- The paragraph that explains how the story works says, in the story's voice, that each puzzle is a decision from a
  bank's working week and that the puzzles build on each other.
- Keep the expected range under the loan animation on desktop. Check it on phones.

**Hover notes (`src/lib/ideas.js`, `IdeaNotes.svelte`)**
- Each note says where the idea is first met. Update that to section 5: AND on the opening page and in the riddle; OR
  and quorum in the riddle; tipping point, "one after another" and "side by side" in queues; IF and loop in the
  stress test; false positive in the gate.
- Every number in a note must come from a model that still exists. Write `test/ideas.test.js` to check them.
- Check: mouse, touch (a tap opens, a tap elsewhere closes), keyboard and screen reader, 320 px, dark theme, and the
  SharePoint build. A note may cover the lines above its word, never the word itself.

**The playbook (`src/chapters/Monday.svelte`)**
- Matrix: keep the design the author approved. Replace examples that cite cut chapters with examples from kept
  puzzles: "a day by hand while the system works" becomes a person checking a steady AI's drafts; "a deal tied in a
  knot" becomes a committee one kind of request past its room (the variety chapter).
- Patterns: twelve, one per chapter, in story order, each an observation, grouped under the five part titles so that
  the two uses show without being announced.
- Sources: keep only what the twelve chapters cite or lean on. Keep Simon (1962) and Bainbridge (1983). For "How
  fast to forget", consider John Muth, "Optimal properties of exponentially weighted forecasts" (1960), the result
  behind "the right memory depends on how often the world changes"; verify it before adding.

**`README.md`**: the chapter table shrinks to twelve; the count in the first paragraph changes.

**Cross-references.** After the cut, search the kept chapters, the opening page, the playbook and `ideas.js` for
mentions of cut chapters and fix each one: "fast track", "toll road", "island", "the covenants", "linked-systems",
"asynchronous", "networks chapter", "reliable machine", "knot", "Red Queen", "Running to stand still", "black swan".

### 6.2 The chapters

**1 · A riddle about chains**
- Stays as it is, with the simplified quorum paragraph already on the branch.

**2 · Why longer chains get cheaper**
- Stays as it is, with the fuller explanation already on the branch.
- Work twin, shown once solved, under the chart: read a pin as a deal. A desk of specialists pays in a head office
  with hundreds of deals a year; a country office of five keeps generalists.
- Its last line hands over to the watchmakers: a long chain has a second weakness, which is that the more links it
  has, the more often something interrupts it.

**3 · Two watchmakers** (moved up from the old Part 4; now closes Part 1)
- Check the opening still reads well in its new place, after specialization.
- Work twin, shown once solved: read a watch as a credit paper. Tempus's is reviewed only when it is complete; Hora's
  section by section, and each approved section holds.
- Its last line hands over to Part 2: most work in a bank is not interrupted; it waits.

**4 · Why full calendars make long queues** (now opens Part 2)
- Introduce **one after another** by name in the paragraph that begins "In a long chain, the waits add up", and add
  one or two sentences on **side by side**: the same reviews run side by side on one file wait only for the slowest.
  This is all that remains of two cut chapters; keep it short.
- Fuller explanation: this chapter has not had that pass. Add only where a step is missing.
- Last line hands over to chapter 5: pooling works when any reviewer may take the work; often the decision belongs
  higher up.

**5 · Only variety absorbs variety** (moved from the old Part 5)
- Label above the title: "Delegations".
- Rewrite the lede and the first sentence of the setup for the new position: it follows queues now.
- Check that nothing refers to the fast track.
- It closes Part 2. The coin game's setup already opens Part 3 ("So far this story has been about speed…").

**6 · When the average lies**
- The author likes it very much. Change nothing but this: a work twin under the chart, shown once solved. Read the
  stake as the share of capital riding on one borrower or one country, and the pool as a portfolio whose bad years
  fall at different times.

**7 · When links become conditions**
- The loop is now introduced here. Give it one clear sentence where the text says "each round of failures sets up
  the next": a loop is an effect that feeds its own cause.
- Last line hands over to the gate: capital absorbs a loss after it lands; a check stops it before the money leaves.

**8 · The gate worth keeping** (moved to close Part 3)
- Label above the title: "Payment checks".
- New lede for the new position. The current one ("A chain that bends still keeps a few links rigid…") belonged to
  the old Part 4.
- Fix L1. If something has to go to meet the word limit, drop the lizard paragraph first.
- Confirm that every figure in the text is bound to the model, in particular "half the payments and nine-tenths of
  the money" above $1m.
- False positive is introduced here, once, underlined.
- Last line hands over to Part 4: a chain can be protected against the swings; some chains gain from them.
- Solve steps on the branch: `#tkc-g-small` ArrowLeft twice, `#tkc-g-large` ArrowRight three times.

**9 · A person in the loop** (now opens Part 4)
- Rewrite the first paragraph of the setup. It names "the islands" and says the chains "have learned to bend" and
  that this is "the last part"; none of that is true any more.
- Make the AI's work a development bank's: drafting the reply to a client's request, a section of a credit paper, a
  summary of a borrower's accounts.
- Replace the last sentence, which points to the cut chapter, with that chapter's one lasting point in a sentence: a
  person who is rarely needed gets out of practice, so the steadier the machine, the less the check is worth on the
  day it turns. Lisanne Bainbridge may be named for it; she stays in the sources.
- The puzzle and the card stay as they are.

**10 · Many short chains**
- Label above the title: "Pilots".
- Its setup already opens from "A person in the loop"; keep that.
- One sentence calls back to the watchmakers and keeps the two virtues of a short chain apart: Hora's pieces held
  what was finished; a pilot can also be dropped.
- Last line hands over to chapter 11: trying is half of learning; remembering is the other half.

**11 · How fast to forget**
- Label above the title: "Country limits".
- Rewrite `test/pace.test.js` for the new model. Fix L2.
- It is no longer the last puzzle. Replace the closing sentences with a hand-over to the finale: lessons become
  links, and a list of links is what stands between a signed loan and its money.
- Two callbacks: a bad year that passes is a false alarm about the country (false positive, from the gate); the loop
  here steadies itself where the stress test's fed itself.
- Check how long the page takes to become interactive; if the 1,000 histories cost more than about 300 ms on load,
  precompute the table and test it against a fresh run.
- Solve step on the branch: `#tkc-p-memory` ArrowRight five times (six years).

**12 · Time to disbursement** (the finale, alone in Part 5)
- One sentence early in the setup echoes the opening page (six checks there, twelve conditions here).
- The after-text already names the riddle's arithmetic, side by side, the OR and the gate. Check that each is a
  phrase, not a second explanation.
- Replace the last sentence, which points to the cut covenants chapter, with the story's closing line: the last of
  the puzzles, and what follows gathers what the chains have shown.
- The puzzle stays as it is. Its solved page is about 5,100 px on a phone, over the guide; the author accepted that.

---

## 7. Order of work, and progress

Work on `twelve-puzzles`. Merge to `main` only at the milestones, each after the full checks in section 8.

1. **Set up.** `npm ci`, `npm test`, `npm run build`, serve, run the walk-through.
2. **The cut.** Everything in 6.1 except the hover notes, plus the cross-reference fixes, so that no kept chapter
   mentions a cut one. Update the check scripts.
3. **The chapters.** The work orders in 6.2, and the hover notes. Chapters touch separate files and can be done in
   parallel; shared files (`src/lib/ui/`, `App.svelte`, `theme.css`, `index.js`, `Intro.svelte`, `Monday.svelte`)
   belong to one worker at a time.
4. **Milestone 1:** all checks green; merge to `main`; confirm the Vercel status.
5. **Review.** Two play-throughs the way the author reads (card first, at 1440 px, then the text), applying the work
   test of section 3 to every puzzle. One read-through for voice, the standing rules, hand-overs, and that each idea
   is introduced once. One fact check: every number against its model, every real-world claim, every source.
6. **Milestone 2:** apply the findings; all checks green; merge to `main`; republish the artifact (same URL) with
   `node tools/checks/to-artifact.mjs dist/index.html <out.html>`; give the author the standalone `dist/index.html`
   and a zip of the source.

### Progress log

Update this list as work lands, so that an interrupted session can be resumed.

- [x] Plan written and revised with the author's choices
- [x] 2. The cut (commit `f16ba5d` on `twelve-puzzles`)
- [x] 3. The chapters and the hover notes (all checks in section 8 pass: 96 tests, 24 of 24 on the walk-through)
- [x] 4. Milestone 1 on `main` (merge commit `97bd359`; deployed)
- [ ] 5. Review
- [ ] 6. Milestone 2 on `main`, artifact and files delivered

---

## 8. Verification

Build both outputs and serve them:

```
npm test
npm run build                      # dist/index.html and dist-lib/two-chains.js
python3 -m http.server 8811 --directory dist &
cp dist-lib/two-chains.js tools/checks/sp-mock/ && python3 -m http.server 8765 --directory tools/checks/sp-mock &
```

Then run the checks (`U=http://localhost:8811/`):

| Script | What it proves | Pass |
|---|---|---|
| `node tools/checks/puzzles.mjs $U` | every puzzle starts open and the intended answer scores 2 points | "24 of 24 points", "no console errors" |
| `node tools/checks/ux-check.mjs $U` | hints, wrong answers, show-the-answer, focus, reset, score panel | every line PASS |
| `node tools/checks/smoke.mjs $U` | every control and button in every chapter | "new errors: 0" for each |
| `node tools/checks/overflow-all.mjs $U 320 375 1280` and again with `SOLVED=1` | no sideways scroll | "OK" |
| `node tools/checks/cliptext.mjs $U <ids, comma-separated> 320 375 1280` | no clipped chart labels | every line "ok" |
| `node tools/checks/sharepoint.mjs <shot.png>` | the library build inside a mock SharePoint page | `"errors": []`, `"overflowPx": 0` |
| `node tools/checks/dump-text.mjs $U <dir>` | writes each chapter's visible text, for reading and word counts | |

The scripts need updating as part of the cut:
- The lists of views: `start`, the twelve chapter ids in order, `monday`.
- The storage key: `two-chains-puzzles-v2`.
- `puzzles.mjs`: remove the steps for cut chapters; the opening guess no longer scores.
- `ux-check.mjs` uses the fast track and the toll road for two of its checks; move those checks to kept chapters.

Acceptance checklist:

- [ ] Twelve puzzles in five parts, in the order of section 5; chapter numbers and the score follow.
- [ ] Every check in the table above passes.
- [ ] Every puzzle passes the work test of section 3; the three stories from outside the bank carry their work twin.
- [ ] No chapter opens with a theory, and the page never says "complexity theory".
- [ ] No kept chapter mentions a cut chapter. Old deep links land on a kept chapter.
- [ ] Each named idea is introduced once, in the chapter section 5 names, and its hover note agrees.
- [ ] L1 to L3 are fixed.
- [ ] Word limits in appendix A hold.
- [ ] The standing rules in section 1 hold: no institution named in prose, no instruction to the reader in bank notes
      or patterns, Taleb named twice at most.
- [ ] Light and dark themes, 320, 375 and 1440 px, and the SharePoint build all work.

---

## 9. Decisions and the bench

Settled by the author: the opening guess does not score; the watchmakers and "A person in the loop" are chapters; the
knot and the reliable machine go; the coin game stays.

Still a judgement call of this plan, and cheap to reverse:

| | Decision | Default | The alternative |
|---|---|---|---|
| D1 | The last puzzle | "Time to disbursement", alone in Part 5 | End on "How fast to forget", with disbursement before Part 4. The difficulty then dips at the end |
| D2 | The false-positive case | The gate | The covenants chapter, which adds Bayes and Ockham |
| D3 | Balance between speed and safety | Seven puzzles on speed and learning, four on safety, one on both | Bring back the toll road for a fifth puzzle on safety |

**The bench**, in the order I would bring chapters back, and where each would go:

1. **How to find a black swan** (the toll road): Part 3, after the stress test. A track record against the one year
   that would break it; a real project-finance case.
2. **A warning light, not a tripwire** (covenants): Part 3, after the gate.
3. **The fast track**: Part 2, between queues and variety.
4. **Running to stand still**: Part 4. Its recast version is in commit `4220404`; the published one in `4cf890e`.

To make room for one of these, the chapter I would take out first is "Why longer chains get cheaper": the weakest
puzzle of the twelve, though the author likes its story.

Every cut chapter can be restored: `git checkout 4cf890e -- src/chapters/<File>.svelte src/lib/sim/<model>.js
test/<name>.test.js`.

---

## Appendix A. House style for a chapter

| Part of a chapter | Limit |
|---|---|
| Lede (under the title) | 25 words |
| Setup (left column, before the puzzle) | 90 to 140 words |
| Card caption | 20 words |
| "In this model" rules | exactly 3, each 15 words or fewer |
| Puzzle goal | 25 words |
| Found text (shown when solved) | one sentence, 25 words |
| After-text (unlocked by solving) | 220 to 330 words, at most one sub-heading |
| Bank note | 40 to 60 words, plus a question of 20 words or fewer |
| "How this model works" note | 150 words |
| Controls | at most 2; a third may appear only after solving; labels of 3 words or fewer |
| Charts | one main chart, 200 to 320 px tall, plus 0 or 2 tiles |
| Colour | orange for a binding condition or a failure, blue for an alternative |
| Phone (375 px) | puzzle starts within about 1.6 screens; solved page about 4,600 px or less |

A prediction puzzle may lock part of its card until the first answer. The reader must still be able to play the part
that does not give the answer away, and the locked part must say what opens it (`Slider` takes `limit` and
`limitNote`; `Segmented` options take `locked`, with `lockNote`).

Every number in the text comes from the model at the stated settings: bind it or compute it, and test it.

## Appendix B. The named ideas and their markup

Used in body text only (setup, after-text, bank note), at most once per idea per paragraph. Never in captions, rules,
goals, found texts or headings.

| Idea | Markup |
|---|---|
| AND | `<span class="tkc-and">AND</span>` |
| OR | `<span class="tkc-or">OR</span>` |
| IF | `<span class="tkc-if">IF</span>` |
| quorum, tipping point, loop, one after another, side by side, false positive | `<span class="tkc-idea">…</span>` |

`IdeaNotes.svelte` finds the idea from the span's text, so chapter files need no extra markup for the hover notes.
Do not add more named ideas.

## Appendix C. How a chapter is built

Read these files before editing; they are short.

- `src/chapters/<Name>.svelte`: one chapter. It uses `Chapter` (title, eyebrow, lede, and the `setup`, `after` and
  `bank` snippets), `Instrument` (the case card: title, caption, `rules`, reset), `Puzzle` (goal, choices or checks,
  found text, hints), and `Slider`, `Segmented`, `Stat`, `BankNote` from `src/lib/ui/`.
- `src/lib/sim/<model>.js`: the model behind the card, with its tests in `test/`.
- `src/chapters/index.js`: the order, titles and parts. Chapter numbers follow from it.
- `src/lib/game.svelte.js`: the score, kept in `localStorage`. 2 points unaided, 1 after a hint or a wrong try, 0 if
  the answer is shown.
- `src/chapters/Intro.svelte` and `src/lib/ui/Hook.svelte`: the opening page and its quick guess.
- `src/chapters/Monday.svelte`: the playbook (matrix, patterns, sources, score).
