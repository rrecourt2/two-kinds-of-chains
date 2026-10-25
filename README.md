# Two Kinds of Chains

An interactive learning story about good complexity (specialization), bad complexity (dependence) and how scale
amplifies both, and about how a long, rigid chain of conditions tips into failure. Twenty-two short chapters in five
parts, each built around a puzzle with a live model the reader can change, and a closing playbook. Built with Svelte 5 and Vite. Everything
ships as one file, with no external requests, so it can run inside a locked-down bank intranet.

| # | Chapter | Puzzle and live model |
|---|---------|------------------------|
| 0 | Two Kinds of Chains | Guess how many of 100 loans clear six checks the first time, then watch them flow |
| | **Part 1 · Two kinds of chains** | |
| 1 | A riddle about chains | Better attendance or a stand-in per role? A month calendar (AND vs OR) |
| 2 | Why longer chains get cheaper | The smallest market in which twelve specialists pay off |
| | **Part 2 · How a chain grows rigid** | |
| 3 | When systems lean on each other | Faster and safer without dropping a system: copies vs one shared record |
| 4 | Why full calendars make long queues | Named lines vs one shared line for four busy reviewers |
| 5 | Don't wait for each other | Which two speed-ups help most when a client request runs in parallel |
| 6 | The fast track | One committee with five places a week and an urgent lane: once every deal is marked urgent, the average wait grows from 3.9 to about 19 days |
| | **Part 3 · When the world pulls on the chain** | |
| 7 | When the average lies | Ole Peters' coin game: the paper value against the typical player; staking less and pooling |
| 8 | When links become conditions | The stress test: 48 banks around a few hubs; a capital slider and its cliff, extra capital for the biggest hubs so no landing brings down more than five; then many similar banks |
| 9 | How to find a black swan | A dollar loan repaid from local-currency tolls, 96 good months: find the year that breaks the claim (both falls at once); Russell's chicken, Popper's swans |
| 10 | Why species go extinct | Where the generalist overtakes the specialist as the years get more volatile; why islands |
| | **Part 4 · Chains that bend** | |
| 11 | The gate worth keeping | A thousand simulated years of payments: check every change of account above an amount, so that no year loses more than $5m and payments stay on time |
| 12 | The shape of the network | What sixty fully linked people produce; mesh, hub and small teams |
| 13 | A chain tied in a knot | Forty named conditions of one power programme waiting for each other: how many can be met at 80 links (about 8); joint closings; Kauffman's complexity catastrophe |
| 14 | Two watchmakers | Herbert Simon's parable as a live race: one long chain against modules |
| 15 | Time to disbursement | Twelve conditions precedent, 2,000 loans: keeping a three-month promise for nine clients in ten |
| 16 | A warning light, not a tripwire | 200 borrowers, 10 in real trouble: two to four strong covenants, not twelve; Bayes in natural frequencies; Occam's razor |
| | **Part 5 · Chains that learn** | |
| 17 | A person in the loop | One AI, twenty requests, with a person in the loop or on autopilot; a steady or an erratic AI |
| 18 | The irony of the reliable machine | A system reads 99% of borrowers' accounts; on the day it fails, analysts out of practice misread the figures; a day by hand each month |
| 19 | Only variety absorbs variety | Ashby's law of requisite variety: the smallest menu of answers that keeps exceptions waiting under two weeks; then a more varied world |
| 20 | Many short chains | Convex tinkering: one big programme or pilots first, in a world nobody can predict |
| 21 | Running to stand still | Fraud learns round the checks: what monthly-reviewed checks catch in year three (about one in four); one check at random; never dropping a check |
| 22 | How fast to forget | A country cushion sized to the worst year remembered: the memory that keeps losses and idle lending in bounds |
| 23 | What it means on Monday | Options and conditions in short and long chains, a pattern for every chapter, and the reader's score |

### Puzzles and score

Every chapter except the closing playbook opens with one puzzle. Solving it unaided earns two points, solving it after a hint or a wrong try
earns one, and "Show me the answer" sets the figure and earns none. The explanation below each figure opens once
its puzzle is solved or shown.

- Choice puzzles are predictions, like the opening guess: the figure's controls open after the first answer or a
  hint, so the reader commits before testing.
- Target puzzles count once the figure has rested on the goal for a moment, so sweeping a slider past the answer
  does not solve them. Goals with several conditions show a live checklist.
- Every figure has a "Reset" that puts its controls back as they started. The score in the header opens a small
  panel with "Reset score", which asks before clearing anything.

Scores are kept in the reader's own browser (`localStorage`, key `two-chains-puzzles-v1`); nothing is sent anywhere.
On the standalone page, chapters change with a short slide (the View Transitions API, where the browser supports it,
and never when the reader prefers reduced motion); inside SharePoint the host page is left alone.

## Run it

```bash
npm install
npm run dev        # live-reloading preview at http://localhost:5173
npm test           # checks the simulation models against their textbook formulas
npm run build      # writes both outputs below
```

Node 20.19+ or 22.12+ is required (Vite 8).

## Outputs

| File | Use it for |
|------|------------|
| `dist/index.html` | The whole story in one self-contained file (about 450 KB, 170 KB compressed, fonts included). Open it from disk, host it on any static web server, embed it in an iframe, or wrap it as a SCORM package. |
| `dist-lib/two-chains.js` | An ES module exporting `mountStory(element, options)`. Used by the SharePoint Framework web part in `sharepoint/spfx/`. Styles travel inside the bundle. |

`mountStory(el, { theme, syncHash, startAt })`

- `theme`: `'light'` (default in the library build, to match SharePoint), `'dark'` or `'auto'` (follow the operating system).
- `syncHash`: `false` by default in the library build, so the host page's URL is left alone. The standalone page uses `#riddle`, `#systems` and so on as deep links.
- `startAt`: a chapter id to open first.
- Returns `{ destroy() }`.

## Deploy on Vercel

The repository is set up for Vercel's GitHub import, with no settings to change:

1. In Vercel, choose **Add New → Project** and import this GitHub repository.
2. Vercel reads `vercel.json`: install with `npm ci`, build with `npm run build:page`, serve `dist/`.
3. Every push to `main` deploys again. Pull requests get preview links.

Production deployments on Vercel are public by default. If the story should stay inside the bank, turn on
Vercel Authentication or password protection for the project, or host `dist/index.html` internally instead
(see `sharepoint/README.md`).

## Where things live

```
src/
  App.svelte              story shell: chain-link navigation, chapter switching, keyboard arrows
  chapters/*.svelte       one file per chapter: the text and the interactive figure
  lib/ui/Hook.svelte      the opening guess-and-reveal
  chapters/index.js       chapter order, titles and URL ids
  lib/sim/*.js            the models (pure JavaScript, seeded random numbers, unit-tested)
  lib/ui/*.svelte         slider, segmented control, stat tile, chapter layout, "Back at the bank" box
  theme.css               colour tokens for light and dark, type, shared styles
test/*.test.js            sanity checks: simulations match analytic results
sharepoint/               hosting guide, SPFx web part, iframe snippet
```

To change the text, edit the chapter's `.svelte` file: the prose is plain HTML inside `{#snippet setup()}`,
`{#snippet after()}` and the `<BankNote>`. Every model's assumptions are spelled out in its "How this model works"
note, so readers can check them.

## Design notes

- **No network requests.** No CDNs, no web fonts from Google, no analytics. The Besley display face (SIL Open Font
  License, `src/assets/fonts/BESLEY-OFL.txt`) is inlined; body text uses the system font, which is Segoe UI on
  Windows, the same as SharePoint.
- **Container queries, not media queries.** Inside a SharePoint page the web part's width is not the window's
  width, so layouts respond to the story's own container.
- **Chapter navigation instead of scroll-driven animation.** It works the same in an iframe of fixed height, in a
  SharePoint scroll region, on a phone and in a workshop where someone clicks through on a projector.
- **Accessibility.** Native range inputs and radio groups, visible focus, keyboard navigation (← →), a skip button,
  focus moved to each new chapter's heading, one spoken summary of the results after a change rather than a stream
  of updates, colour never the only signal, `prefers-reduced-motion` respected (animations become static).
- **Deterministic.** Simulations use seeded random numbers, so everyone in a workshop sees the same month, network
  or century until they press the button for a new one.
