# Two Kinds of Chains: plan for a 12-puzzle story

This plan is written for a model that has not seen the earlier conversation. It says what the author asked for, where
the project stands, which twelve puzzles to keep and why, what to change in each, in what order to work, and how to
check the result. Everything needed is in this file or in the repository.

**Start here:** check out the branch `twelve-puzzles`, read sections 1 to 4, then work through section 6 in order.
**Done means:** the live site shows a story of twelve puzzles in five parts, every check in section 7 passes, and the
author has been told what changed and what is still open.

---

## 1. What the author asked for

The author's latest request, verbatim:

> please review all stories again. Check for logic. Let's cut it down to 12 puzzles. try to find the best ones. Try to
> progress learning. Combining concepts. Making it gradually more difficult. Just come up with the plan enabling another
> model to execute.

So there are four goals, in this order of importance:

1. **Twelve puzzles**, chosen as the best of the current twenty-two.
2. **Sound logic** in every one of them.
3. **A learning progression**: each puzzle brings one new idea and reuses the ideas before it, and later puzzles
   combine several.
4. **Rising difficulty** from the first puzzle to the last.

### Standing rules (all still apply)

These come from thirteen rounds of the author's feedback. Breaking one will be noticed.

- **Audience:** executives of a development bank. Cases are designed for them; an analogy to nature is welcome now
  and then, but the cases are theirs.
- **Never name the author's bank, and never name FMO.** Never name a real institution in the prose. People are fine
  (Adam Smith, Herbert Simon). The sources list in the playbook may name institutions as authors.
- **Never make the author's criticism of their own organisation explicit.** The story is general.
- **Observational, never instructional.** Bank notes and playbook patterns describe what tends to happen and end in a
  question ("Which of our…?"). They never tell the reader what to do. Puzzle goals and hints may use imperatives.
- **Voice:** narrative, with some literary flair. Not condescending, not academic, no economic clichés. The author
  likes the existing text. Do not flatten it or make it technical. "Don't overdo it" is the author's most repeated
  instruction.
- **Language:** plain British English with `-ize` spellings as the story already uses them (organization,
  specialization, programme, practise as a verb). Curly quotes. Refer to other chapters by name, never by number.
- **The chain image** (links, AND, OR, chains that break, bend, lock, learn) runs through every chapter. Keep it.
- **Taleb** is named sparingly ("we don't want too many Taleb references. some are ok"): twice at most is a safe
  reading. "Menu" must not come back in the variety chapter. The gate must not offer an option that checks nothing.
- **Cases explain themselves.** The author looks at the case card on the right first, plays with it, and only then
  reads the text. A first-time reader must be able to tell from the card alone what is shown, what each control does
  and what just changed.
- **Build:** one self-contained HTML file (`dist/index.html`), plus a library build for SharePoint (`dist-lib/`).
- **Deploying:** every push to `main` goes live on Vercel. Push only work that has passed section 7.

The house style (word limits, colours, controls) is in appendix A. The named ideas and their markup are in appendix B.

---

## 2. Where things stand

| | |
|---|---|
| Repository | `rrecourt2/two-kinds-of-chains` on GitHub; Svelte 5 (runes), Vite 8, `vite-plugin-singlefile` |
| Live site | `https://two-kinds-of-chains.vercel.app`, built from `main` |
| `main` | commit `4cf890e` plus this plan and `tools/checks/`: the live 22-chapter story |
| Commit `4cf890e` | the 22-chapter story as last published; any cut chapter can be restored from it |
| Branch `twelve-puzzles` | `main` plus one commit (`4220404`) of unfinished work from the round before this one. **Work here.** |
| Private artifact | `https://claude.ai/artifact/3vGzcEE9mLkq2JPv3cDGzs` (version 11, the 22-chapter story) |

### The unfinished work on `twelve-puzzles`

The round before this one was cut off mid-build. Its work is on the branch, uncommitted to `main`. It builds, and the
walk-through solves every puzzle (46 of 46 points, no console errors). One unit-test file fails. Status of each piece:

| Piece | Files | State | What is left |
|---|---|---|---|
| Hover notes on underlined ideas | `src/lib/ideas.js`, `src/lib/ui/IdeaNotes.svelte`, `src/App.svelte`, `src/theme.css` | Works with a mouse | Check touch, keyboard, 320 px, dark theme and the SharePoint build; write `test/ideas.test.js`, which `ideas.js` mentions but does not exist |
| Expected range under the loan animation | `src/lib/ui/Hook.svelte` | Works on desktop | Check phones |
| Fuller explanations (editorial pass) | Riddle, Specialization, Ergodicity, Contagion, Disbursement, Tinkering, Variety and six chapters now cut | Partly done | Continue for Queues and Automation; see section 5 |
| The gate, with shares checked | `Gate.svelte`, `sim/gate.js`, `test/gate.test.js` | Complete, tests pass | Two logic fixes and a trim (section 5, chapter 7) |
| The knot, simplified to nine documents | `Knot.svelte`, `sim/knot.js`, `test/knot.test.js` | Complete, tests pass | One logic fix (section 5, chapter 11) |
| "How fast to forget", new model | `Pace.svelte`, `sim/pace.js` | Chapter and model complete | `test/pace.test.js` still imports the old model's exports and fails; rewrite it |
| "Running to stand still", recast as procurement | `RedQueen.svelte`, `sim/redqueen.js`, test | Complete | Nothing: this chapter is cut. The work stays on the branch's history. |

### Check scripts

The browser checks used in every earlier round are now in `tools/checks/` (they lived outside the repository before).
Section 7 says how to run them. They still list all 24 views and the old storage key; updating them is part of the
work.

### Environment notes

- Playwright and Chromium are installed globally in the cloud environment. Scripts load it with
  `createRequire('/opt/node22/lib/node_modules/')`. Never run `playwright install`.
- The cloud network blocks `vercel.app`. To confirm a deploy, read the commit status from GitHub:
  `curl -s https://api.github.com/repos/rrecourt2/two-kinds-of-chains/commits/<sha>/status`.
- `python3 -m http.server <port> --directory dist` is enough to serve a build. Start servers in the background.
- This environment's git policy accepts pushes of branches and refuses pushes of tags. Refer to commits by hash.

---

## 3. The review: all 22 chapters

Every chapter was re-read in its solved state, and the models behind the numbers were checked in earlier rounds (166
unit tests). The verdicts below weigh four things: how much the author has liked the chapter, how well it serves the
story's argument, how good the puzzle is, and how sound its logic is.

| Chapter (`id`) | Verdict | Why | Logic |
|---|---|---|---|
| A riddle about chains (`riddle`) | **Keep, 1** | The story's foundation: AND, OR, quorum | Sound |
| Why longer chains get cheaper (`specialization`) | **Keep, 2** | The case for good complexity; the author likes Adam Smith and asked for the chips section | Sound. The puzzle is a slider sweep, which suits an early chapter |
| When systems lean on each other (`systems`) | Cut | Never praised; the puzzle is four combinations to try | **Weak.** An approver catches half the problems at each system but 90% at the end. Those two assumed rates produce the result |
| Why full calendars make long queues (`queues`) | **Keep, 3** | The best self-explaining card; introduces the tipping point that five later chapters use | Sound (standard queueing results) |
| Don't wait for each other (`async`) | Cut | Clear and sound, but its one idea (the slowest piece sets the date) returns in the disbursement chapter | Sound |
| The fast track (`emergence`) | Cut, first on the bench | Sound and polished, but the author twice found it unclear, and the committee it uses lives on in the variety chapter | Sound. The slowdown rests on one assumption: one urgent paper in five is deferred |
| When the average lies (`ergodicity`) | **Keep, 5** | The coin game; later chapters lean on it | Sound |
| When links become conditions (`contagion`) | **Keep, 6** | The author likes the capital slider and the play with the biggest banks | Sound |
| How to find a black swan (`black-swans`) | Cut, on the bench | Sound and elegant, but falsification is a side branch of the story | Sound |
| Why species go extinct (`extinction`) | Cut | The only case not set in a bank; its lesson (several sources beat one when the world swings) is the lesson of "Many short chains" | Sound |
| The gate worth keeping (`gate`) | **Keep, 7** | The author has shaped it over several rounds; it now combines four earlier ideas and introduces false positives | Two fixes (L2 below) |
| The shape of the network (`graph`) | Cut | Abstract; its point about hubs is already in the stress test | **Weak.** Every working link costs 2% of both people's time; that number alone produces "sixty people produce nothing" |
| A chain tied in a knot (`knot`) | **Keep, 11** | "I love it… highly relevant" | One real flaw (L1 below) |
| Two watchmakers (`modules`) | Fold into chapter 8 | The author likes the parable. It becomes the opening of "Many short chains", which is named after it | Sound |
| Time to disbursement (`disbursement`) | **Keep, 12, the finale** | The author likes it; it uses every structural idea in the story | Sound |
| A warning light, not a tripwire (`covenants`) | Cut, on the bench | Sound and specific to development finance, but a second false-positive case; the author steered that idea to the gate | Sound |
| A person in the loop (`tools`) | Fold into chapters 8 and 9 | The same idea as "Many short chains" (keep the good, drop the bad). Its erratic AI becomes an example there and the premise of the reliable machine | Sound |
| The irony of the reliable machine (`automation`) | **Keep, 9** | "Highly relevant"; the story's chapter on AI and automation | The puzzle is solved with one click (L3 below) |
| Only variety absorbs variety (`variety`) | **Keep, 4** | "I love Ashby's law"; it reuses the queue and its tipping point | Sound |
| Many short chains (`tinkering`) | **Keep, 8** | "I really like that concept" | Sound |
| Running to stand still (`redqueen`) | Cut, on the bench | The author likes it but doubted its premise. In the model, the unpredictable check lifts the catch only from 14% to 17%, a thin result for the chapter's main claim. Tenders and prior review fit a public-sector lender better than a private-sector one | Thin |
| How fast to forget (`pace`) | **Keep, 10** | Rebuilt on the concept the author chose; carries the author's own line, "enough change to adapt, not so fast that the lesson is forgotten" | One assumption to state plainly (L4 below) |

### Logic fixes in the chapters that stay

- **L1, the knot (a real flaw).** The card says a document "can be signed once everything it waits for is signed",
  but the clauses speak of three different events: signing, taking effect, and disbursing or paying in. With two
  events there is no ring. "The sponsors pay in once the loan is *signed*" and "the loan *disburses* once the equity
  is in" is a plain sequence: sign the loan, pay in the equity, disburse. The tariff ring has the same gap. Give every
  document one state and use one word for it everywhere: **in place** (a document is in place when it binds without
  further conditions; financial close is all nine in place). Then the rings are real, as they are in practice: lenders
  will not commit without the power purchase agreement, the utility cannot commit without a tariff, the regulator
  will not set a tariff before the financing is committed.
- **L2, the gate.** (a) "Each call takes one of three reviewers a day" reads as if a telephone call takes a working
  day. Say what is meant: a reviewer closes about one call-back a day, because the client has to be reached on a
  number already on file. (b) The after-text runs to about 370 words and the setup to about 150; both are over the
  limits in appendix A.
- **L3, the reliable machine.** The puzzle is solved by one click on "A day a month", which is too easy for the ninth
  puzzle. Section 5 gives a fix that makes the answer sit in the middle: too little practice fails one target, too
  much fails the other.
- **L4, how fast to forget.** The rule "lending just after a bad year counts double" is an assumption that shapes part
  of the result. Test whether the best memory still sits in the middle without it. If it does, say so in the model
  note. If it does not, keep the rule and state plainly, in the model note, that the result depends on it.
- **L5, the playbook.** The matrix and several patterns cite chapters that are being cut.

---

## 4. The new story: twelve puzzles in five parts

| # | Part | Chapter (`id`) | Was |
|---|---|---|---|
| | | Opening page: one quick guess (`start`) | same |
| 1 | 1 · Two kinds of chains | A riddle about chains (`riddle`) | 1 |
| 2 | | Why longer chains get cheaper (`specialization`) | 2 |
| 3 | 2 · How a chain grows rigid | Why full calendars make long queues (`queues`) | 4 |
| 4 | | Only variety absorbs variety (`variety`) | 19 |
| 5 | 3 · When the world pulls on the chain | When the average lies (`ergodicity`) | 7 |
| 6 | | When links become conditions (`contagion`) | 8 |
| 7 | | The gate worth keeping (`gate`) | 11 |
| 8 | 4 · Chains that learn | Many short chains (`tinkering`) | 20 |
| 9 | | The irony of the reliable machine (`automation`) | 18 |
| 10 | | How fast to forget (`pace`) | 22 |
| 11 | 5 · One deal, the whole chain | A chain tied in a knot (`knot`) | 13 |
| 12 | | Time to disbursement (`disbursement`) | 15 |
| | | What it means on Monday (`monday`) | same |

Three things change in the shape of the story:

- **The deal is the finale.** The old order was "chains that bend", then "chains that learn". Now the three learning
  chapters come first and the story ends on one deal: untie it (the knot), then pay it out on time (disbursement).
  Those are the two hardest puzzles and the two that combine the most ideas. The story also closes where it opened:
  the opening page asks how many of 100 loans pass six checks before the money can be paid out, and the last puzzle
  is twelve conditions before the money moves.
- **The gate moves to Part 3.** The author's own framing was that it "relates to limiting losses" and "can be
  connected to the coin game". Part 3 then reads as one argument about where protection goes: stake less and pool
  (the coin game), capital where the links meet (the stress test), checks where the loss would be too large (the gate).
- **The variety chapter moves to Part 2**, straight after queues, because its committee is a queue and its lesson
  turns on the tipping point the reader has just met.

### The progression

Each row is one puzzle. "New" is the one idea it introduces. "Returns" are earlier ideas that the puzzle uses again,
on the card or in the text. The last column is what the reader has to do, which gets harder down the table.

| # | Chapter | New | Returns | The reader has to | Level |
|---|---|---|---|---|---|
| 0 | Opening guess | chances multiply along a chain | | guess one number | warm-up |
| 1 | A riddle about chains | AND, OR, quorum | chances multiply | choose between two changes | 1 |
| 2 | Why longer chains get cheaper | scale: every link has to earn its place | OR (a link with no alternative) | move one slider to a target | 1 |
| 3 | Why full calendars make long queues | tipping point; links one after another | OR (a shared line is the stand-in again), AND (a named reviewer) | make one choice, with a slider to explore | 2 |
| 4 | Only variety absorbs variety | requisite variety: what an office may decide | the queue, tipping point, OR | find the smallest setting that meets a target | 2 |
| 5 | When the average lies | chains that multiply over time; typical against average | AND as multiplying, OR as pooling | set two controls for one target | 2 |
| 6 | When links become conditions | IF; hubs; the loop that feeds itself | quorum, tipping point, the limit of pooling | set two controls for two targets | 3 |
| 7 | The gate worth keeping | false positive; a check sized to the loss | IF, the worst year against the average, tipping point, quorum | set two controls for two targets that pull against each other | 3 |
| 8 | Many short chains | the option: keep what works, drop what fails; modules | AND against OR, typical against worst | hit two targets with one slider; the answer is a band | 3 |
| 9 | The irony of the reliable machine | practice: an OR has to be exercised | OR, the loop | set two controls; too little fails one target, too much the other | 3 |
| 10 | How fast to forget | memory against change: a loop that steadies itself | the loop, false positive (a bad year that is only noise), IF (a limit) | search for a minimum, then watch it move | 4 |
| 11 | A chain tied in a knot | the ring; moving a clause after the money | AND, one after another, tipping point | act on the structure: choose which two clauses to move | 4 |
| 12 | Time to disbursement | nothing new: everything returns | AND, OR, side by side, moving a condition after the money, the gate, swings | set two controls under two constraints, where neither works alone | 5 |

Rules for carrying this out:

- **One introduction, light callbacks.** Each named idea is explained once, where the table says "New", in a sentence
  or two of plain prose. Wherever it returns, a phrase is enough. Never explain an idea twice.
- **The combination must show on the card, not only in the text.** For example, the gate's two tiles are the worst
  year (from the coin game) and how busy the reviewers are (from queues); the variety card shows how full the
  committee is. Each chapter's work order in section 5 says what must be visible.
- **No tags, chips or legends for the ideas on the cards.** The author rejected those. The ideas live in the prose
  (underlined, with a hover note) and in what the card measures.
- **Do not turn the puzzles into exercises about operators.** The author: "It should not turn into an operator
  puzzle… It's more important to make recurring concepts clearer."

### What happens to the ten chapters that go

| Cut chapter | Where its best idea lives on |
|---|---|
| Two watchmakers | Simon's parable opens "Many short chains" (three sentences). Tempus stays in the playbook matrix |
| A person in the loop | The erratic AI is one example in "Many short chains" and the premise of "The irony of the reliable machine" |
| When systems lean on each other, Don't wait for each other | One short paragraph in the queues chapter: links one after another add their waits; the same reviews side by side wait only for the slowest |
| The fast track | Its committee is the variety chapter's committee. The loop is now introduced in the stress test |
| The shape of the network | "Hubs inside organizations", already in the stress test |
| How to find a black swan, Why species go extinct, A warning light not a tripwire, Running to stand still | Nothing is moved. They are on the bench (section 8) and can be restored from commit `4cf890e` |

---

## 5. Work orders

Do the shell first (5.1), because it decides the order and the numbering. Then the chapters. Each chapter's order
lists only what changes; everything else in the chapter stays as it is.

### 5.1 The shell

**`src/chapters/index.js`**
- `PARTS`: `['Two kinds of chains', 'How a chain grows rigid', 'When the world pulls on the chain', 'Chains that learn', 'One deal, the whole chain']`.
- `CHAPTERS`: `start`, the twelve in the order of section 4 with their new `part` numbers, then `monday`. Keep every
  `id`, `title` and `short` as it is. Remove the imports of the ten cut chapters.

**Files to delete** (they remain in commit `4cf890e`)
- Chapters: `Systems`, `Async`, `Local`, `BlackSwans`, `Extinction`, `Graph`, `Modules`, `Covenants`, `Tools`,
  `RedQueen` (`.svelte`, in `src/chapters/`).
- Models in `src/lib/sim/`: `systems.js`, `async.js`, `fasttrack.js`, `tollroad.js`, `species.js`, `scale.js`,
  `watchmakers.js`, `covenants.js`, `convexity.js`, `redqueen.js`. Check each with a search before deleting: a kept
  file must not import it.
- Tests: `async`, `covenants`, `fasttrack`, `redqueen`, `tollroad`, `models` (scale and systems only). Prune
  `simplify.test.js`, `sims.test.js` and `tools-coin.test.js` down to the models that stay (`pins`, `presence`,
  `queue`, `coin`, `network`, `rng`).

**`src/App.svelte`**
- Old deep links must not break. Map each removed `id` to a kept chapter when the page opens on it: `systems` and
  `async` to `queues`; `emergence` to `variety`; `black-swans` and `covenants` to `gate`; `extinction`, `modules` and
  `tools` to `tinkering`; `graph` to `contagion`; `redqueen` to `pace`.

**`src/lib/game.svelte.js`**
- Change the storage key to `two-chains-puzzles-v2`, so stale entries for removed puzzles cannot distort the score.

**Opening page (`src/chapters/Intro.svelte`, `src/lib/ui/Hook.svelte`)**
- Eyebrow: "An interactive story in 12 puzzles · every chart is live".
- The quick guess becomes an unscored warm-up (decision D1 in section 8): it still shows the run, the expected 74 and
  the range, but gives no points, and `start` leaves the game's list. The score is then 24 points for 12 puzzles.
- `contents`: one teaser for each of the twelve, in story order. Rewrite the teasers of chapters that changed (gate,
  knot, pace, automation).
- The paragraph that explains how the story works gains one sentence on the progression, for example: "The puzzles
  build on each other: each brings one new idea and uses the ones before it."
- Keep the expected range under the loan animation on desktop. Check it on phones.

**Hover notes (`src/lib/ideas.js`, `IdeaNotes.svelte`)**
- Each note says where the idea is first met. Update that to section 4: AND on the opening page and in the riddle; OR
  and quorum in the riddle; tipping point and "one after another" in queues; IF and loop in the stress test; false
  positive in the gate; "side by side" in queues.
- Every number in a note must come from a model that still exists. Write `test/ideas.test.js` to check them.
- Check: mouse, touch (a tap opens, a tap elsewhere closes), keyboard and screen reader, 320 px, dark theme, and the
  SharePoint build. A note may cover the lines above its word, never the word itself.

**The playbook (`src/chapters/Monday.svelte`)**
- Matrix: keep the design the author approved (a link that adds an option or a condition; a short chain in calm
  weather or a long chain in rough weather; the four verdicts). Replace the two examples that cite cut chapters with
  examples from kept puzzles: "a person in the loop of an erratic AI" becomes an accepted alternative when the
  parties are unpredictable (disbursement); "an autopilot while the AI is steady" becomes twelve conditions when
  every party is prompt (disbursement, predictable parties).
- Patterns: twelve, one per chapter, in story order, each an observation. Rewrite the patterns for the gate, the
  knot, pace and the reliable machine to match the chapters as they now are. The pattern for "Many short chains"
  absorbs "work saved in finished pieces" from the watchmakers.
- Sources: keep only what the twelve chapters cite or lean on. Keep Simon (1962). For "How fast to forget", consider
  adding John Muth, "Optimal properties of exponentially weighted forecasts" (1960), which is the result behind "the
  right memory depends on how often the world changes"; verify it before adding.
- The links under each pattern and the score list follow `CHAPTERS` and need no change.

**`README.md`**: the chapter table shrinks to twelve; the count in the first paragraph changes.

**Cross-references.** After the cut, search the kept chapters, the opening page, the playbook and `ideas.js` for
mentions of cut chapters and fix each one: "fast track", "watchmaker", "toll road", "island", "the covenants",
"person in the loop", "linked-systems", "asynchronous", "networks chapter", "Red Queen", "Running to stand still",
"black swan". Known cases are named in the chapter orders below.

### 5.2 The chapters

**1 · A riddle about chains**
- Stays as it is, with the simplified quorum paragraph already on the branch.
- Last line of the after-text hands over to chapter 2: why the pencil's chain is so long in the first place.

**2 · Why longer chains get cheaper**
- Stays as it is, with the fuller explanation already on the branch.
- It now closes Part 1. Its last line ("Specialization concentrates skill. It does not have to concentrate
  dependence, but here it does.") already sets up Part 2.

**3 · Why full calendars make long queues** (now opens Part 2)
- Opening turn: a specialist whom everyone needs is a busy specialist. One sentence, in the setup.
- Introduce **one after another** by name in the paragraph that begins "In a long chain, the waits add up", and add
  one or two sentences on **side by side**: the same reviews run side by side on one file wait only for the slowest
  of them. This is all that remains of the two cut chapters; keep it short.
- The tipping point is introduced here, as now.
- Editorial pass: this chapter has not had one. Add explanation only where a step is missing.
- Last line hands over to chapter 4: pooling works when any reviewer may take the work; often the decision belongs
  higher up.

**4 · Only variety absorbs variety** (moved from Part 5)
- Rewrite the lede and the first sentence of the setup for the new position. It follows queues now, not the reliable
  machine.
- The card must show how full the committee is (it does: "the committee is 92% full") and the text must call the
  jump from five cases left waiting to seventeen a tipping point (it does).
- Check that nothing refers to the fast track.
- It now closes Part 2. The coin game's setup already opens Part 3 ("So far this story has been about speed…").

**5 · When the average lies**
- Stays as it is. Its bank-note question ("…judged by their worst month rather than their average?") sets up the gate.

**6 · When links become conditions**
- The loop is now introduced here, not called back. Give it one clear sentence where the text says "each round of
  failures sets up the next": a loop is an effect that feeds its own cause.
- Add one sentence to "Hubs inside organizations" for the approver whom every team is routed through, if it is not
  already implied.
- Last line hands over to the gate: capital absorbs a loss after it lands; a check stops it before the money leaves.

**7 · The gate worth keeping** (moved to close Part 3)
- New lede for the new position. The current one ("A chain that bends still keeps a few links rigid…") belonged to
  the old Part 4.
- Fix L2: the call-back wording, and trim the setup to 140 words and the after-text to 330. If something has to go,
  drop the lizard paragraph first.
- Confirm that every figure in the text is bound to the model, in particular "half the payments and nine-tenths of
  the money" above $1m.
- The card must show the combination: the worst year against the board's limit, with the average year beside it (the
  coin game); how busy the three reviewers are (queues); and the count of genuine clients checked (false positives).
  It does all three now.
- False positive is introduced here, once, underlined.
- It closes Part 3. Last line hands over to Part 4: a chain can be protected against the world's swings; some chains
  gain from them.
- Solve steps on the branch: `#tkc-g-small` ArrowLeft twice, `#tkc-g-large` ArrowRight three times.

**8 · Many short chains** (now opens Part 4)
- New setup, at most 140 words, in three moves: the turn (so far the swings have only done harm); Simon's two
  watchmakers in three sentences (Tempus builds a watch of a thousand parts in one go and loses it whenever the phone
  rings; Hora builds modules of ten that hold, and loses only the module in hand); then the pilots as now.
- Keep the two virtues of a short chain apart, because they are different mechanisms: what is finished stays finished
  (Hora), and what fails can be dropped (the pilots).
- Replace "The person in the loop was one…" with the erratic AI as a plain example: a person who checks an erratic
  AI's drafts keeps the brilliant ones and drops the wrong ones.
- One sentence of arithmetic ties the watchmakers to the riddle: with one interruption in a hundred steps, ten steps
  in a row succeed nine times in ten, and a thousand in a row almost never.
- One phrase ties the tiles to the coin game: typical, not average.
- The puzzle and the card stay as they are.

**9 · The irony of the reliable machine**
- First sentence of the setup bridges from chapter 8: checking a machine's work is an option worth holding, and the
  trouble starts when the machine gets good. "A covenant is only as good as the figures it is tested on" can stay as
  the second sentence.
- **Fix L3.** Add a fourth practice option, a day a week, and count practice days as read by hand in the target "the
  system reads at least 90% of the figures" (the analysts' time is what the system was bought to free). Then no
  practice and a day a quarter fail the target on failure days, a day a week fails the 90% target (a fifth of the
  reading goes back to the analysts), and a day a month meets both. Reword the target if that reads more honestly,
  for example as the share of the reading kept off the analysts' desks.
  Update `automation.js`, its tests, the found text and the after-text. Four options must fit one row at 375 px, so
  shorten the labels (for example None, Quarterly, Monthly, Weekly).
- One sentence says what the puzzle shows: practice is a matter of dose.
- The loop is a callback now ("a loop that feeds itself, like the failures in the stress test").
- Its last line already hands over to chapter 10: "A chain that learns also has to remember."

**10 · How fast to forget**
- Rewrite `test/pace.test.js` for the new model.
- Fix L4.
- It is no longer the last puzzle. Replace the closing sentences ("That is the last of the puzzles…") with a
  hand-over to Part 5: lessons become links, and a list of links is what stands between a signed loan and its money.
- Add two callbacks: a bad year that passes is a false alarm about the country (false positive, from the gate), and
  the loop here steadies itself where the stress test's fed itself.
- Check how long the page takes to become interactive. The card averages 1,000 histories; if that costs more than
  about 300 ms on load, precompute the table and test it against a fresh run.
- Solve step on the branch: `#tkc-p-memory` ArrowRight five times (six years).

**11 · A chain tied in a knot** (now opens Part 5)
- **Fix L1** throughout: rules, every clause and its "after the money" wording, the legend, both tiles, the goal, the
  found text, the hints and the after-text. One state, one word: in place.
- New lede or first sentence for the new position: the last two puzzles follow one deal.
- The last paragraph (Kauffman) points forward to the watchmakers, who are now behind the reader. Either shorten it
  to two sentences that point back to Hora's modules in "Many short chains", or cut it. The chapter is dense; cutting
  is acceptable.
- Keep the test that proves exactly one pair of clauses frees the deal.
- Last line hands over to chapter 12: untied, the deal can close; the question left is how long until the money moves.

**12 · Time to disbursement** (the finale)
- One sentence early in the setup says this is where the story's ideas meet, and one echoes the opening page (six
  checks there, twelve conditions here).
- The after-text already names the riddle's arithmetic, side by side, the OR and the gate. Add one phrase for the
  knot: a condition that follows the money is the same move that untied it.
- Replace the last sentence, which points to the cut covenants chapter, with the story's closing line: the last of
  the puzzles, and what follows gathers what the chains have shown.
- The puzzle stays as it is. Its solved page is about 5,100 px on a phone, over the guide; the author accepted that.

---

## 6. Order of work

Work on `twelve-puzzles`. Merge to `main` only at the three milestones, each after the full checks in section 7.
Commit and push to the branch often: earlier rounds were cut off by usage limits, the container does not survive a
long pause, and a push to the branch does not touch the live site.

The author's working preference, from earlier rounds: agents implement and review in parallel, and the lead model
directs the narrative and checks each piece in a clean copy of the repository before it goes to `main`.

**Phase 0: set up.** `npm ci`, `npm test` (expect one failing file, `pace.test.js`), `npm run build`, serve `dist`,
run `node tools/checks/puzzles.mjs http://localhost:8811/` (expect 46 of 46).

**Phase 1: make the branch green.** Rewrite `test/pace.test.js`. All tests pass.

**Phase 2: the cut.** Everything in 5.1, plus the cross-reference fixes, so that no kept chapter mentions a cut one.
Update the check scripts (section 7). **Milestone 1:** twelve chapters in the new order, coherent, all checks green.
Merge to `main`.

**Phase 3: the chapters.** The work orders in 5.2. They touch separate files and can be done in parallel in these
groups: chapters 1 to 4; chapters 5 to 7; chapters 8 to 10; chapters 11 and 12. Shared files (`src/lib/ui/`,
`App.svelte`, `theme.css`, `index.js`, `Intro.svelte`, `Monday.svelte`) belong to one worker only. **Milestone 2:**
merge to `main`.

**Phase 4: review and finish.**
- Two play-throughs the way the author reads: at 1440 px, look only at the case card, play for a minute, try to
  solve it without the text, then read. Report what the card failed to explain.
- One read-through of the whole text for voice, the standing rules, hand-overs between chapters, and that each idea
  is introduced once and called back lightly.
- One fact check: every number in the text against its model, every real-world claim, every source.
- Apply the findings. **Milestone 3:** merge to `main`, confirm the Vercel status, republish the artifact (same URL)
  with `node tools/checks/to-artifact.mjs dist/index.html <out.html>`, and give the author the standalone
  `dist/index.html` and a zip of the source.

Report to the author at the end: what changed, in their terms; anything that does not yet pass; and the open
decisions in section 8.

---

## 7. Verification

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

The scripts need updating as part of Phase 2:
- The lists of views: `start`, the twelve chapter ids in order, `monday`.
- The storage key: `two-chains-puzzles-v2`.
- `puzzles.mjs`: remove the steps for cut chapters; the opening guess no longer scores. Steps for the twelve, as they
  stand on the branch: riddle, choose "qualified stand-in"; specialization, `#tkc-p-market` ArrowRight nine times;
  queues, "One shared line"; variety, `#tkc-v-menu` ArrowRight ten times; coin game, `#tkc-e-stake` ArrowLeft four
  times, then "4 others"; stress test, "12 biggest +4"; gate, as in 5.2; many short chains, `#tkc-tk-pilots`
  ArrowRight eleven times; reliable machine, "A day a month" (the label changes with L3); pace, as in 5.2; knot, open
  "The twelve clauses, as a list" and press the two clauses of the answer; disbursement, as in the script.
- `ux-check.mjs` uses the fast track and the toll road for two of its checks; move those checks to kept chapters.

Acceptance checklist:

- [ ] Twelve puzzles in five parts, in the order of section 4; chapter numbers and the score follow.
- [ ] Every check in the table above passes.
- [ ] No kept chapter mentions a cut chapter. Old deep links land on a kept chapter.
- [ ] Each named idea is introduced once, in the chapter section 4 names, and its hover note agrees.
- [ ] L1 to L5 are fixed.
- [ ] Word limits in appendix A hold. Give a table of counts per chapter in the final report.
- [ ] The standing rules in section 1 hold: no institution named in prose, no instruction to the reader in bank notes
      or patterns, Taleb named twice at most.
- [ ] Light and dark themes, 320, 375 and 1440 px, and the SharePoint build all work.

---

## 8. Decisions taken here that the author may want to reverse

These are judgement calls. The defaults below are what to build; each is cheap to reverse if the author says so.

| | Decision | Default | The alternative |
|---|---|---|---|
| D1 | Does the opening guess score? | No: a warm-up, so "12 puzzles, 24 points" is exact | Keep it scored: 26 points, and the score card says "12 puzzles and the opening guess" |
| D2 | Which part comes last? | The deal (knot, disbursement), after "Chains that learn" | The old order: bend, then learn, ending on "How fast to forget". The difficulty then dips at the end |
| D3 | The false-positive case | The gate | The covenants chapter, which is cleaner and adds Bayes and Ockham, but which the author has never commented on |
| D4 | The chapter on AI | The reliable machine, with the erratic AI as an example in chapter 8 | "A person in the loop" as a chapter, replacing chapter 9 |
| D5 | The watchmakers | Folded into chapter 8 | Their own chapter, third in Part 1 |

**The bench**, in the order I would bring chapters back, and where each would go:

1. **The fast track**: Part 2, between queues and variety. It would again be where the loop is introduced.
2. **A warning light, not a tripwire**: Part 4, before the reliable machine, which already opens on covenants.
3. **Two watchmakers**: Part 1, third.
4. **Running to stand still**: Part 4, after the reliable machine. Its recast version (procurement red flags) is in
   commit `4220404` on the branch; the published version is in `4cf890e`.
5. **How to find a black swan**: Part 3, after the stress test.

To make room for one of these, the chapter I would take out first is "Why longer chains get cheaper" (the weakest
puzzle of the twelve, though the author likes its story), then "The irony of the reliable machine".

Every cut chapter can be restored from the last 22-chapter commit: `git checkout 4cf890e -- src/chapters/<File>.svelte
src/lib/sim/<model>.js test/<name>.test.js`.

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

## Appendix D. Size of the story

The twelve chapters hold about 5,800 words of setup, after-text and bank notes today, against about 20,000 visible
words for the whole 22-chapter site. With the opening page and the playbook, the new story should come to roughly
8,000 words: about 40 minutes of reading and 35 of play.
