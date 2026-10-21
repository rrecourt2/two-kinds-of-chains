# Two Kinds of Chains

An interactive learning story about good complexity (specialization), bad complexity (dependence) and how scale
amplifies both, and about how a long, rigid chain of conditions tips into failure. Fourteen short chapters, each
built around a puzzle with a live model the reader can change. Built with Svelte 5 and Vite. Everything ships as
one file, with no external requests, so it can run inside a locked-down bank intranet.

| # | Chapter | Puzzle and live model |
|---|---------|------------------------|
| 0 | Two Kinds of Chains | Guess how many of 100 loans clear six checks, then watch them flow |
| 1 | A riddle about chains | Better attendance or a stand-in per role? A month calendar of people or systems (AND vs OR) |
| 2 | Why longer chains get cheaper | The smallest market in which twelve specialists pay off; the chip industry; splitting firms at the right level |
| 3 | When systems lean on each other | Make a request faster and safer without dropping a system: copies vs one shared record, approvals at every system or once |
| 4 | Why full calendars make long queues | Get the wait under an hour with reviewers at least 80% busy: named lines vs one shared line |
| 5 | Don't wait for each other | Which two speed-ups help most when the work runs in parallel; bad inputs caught early or late |
| 6 | When every part does its best | Braess's paradox: get every journey under 70 minutes without building anything |
| 7 | Tool, rule or gate? | What a more erratic AI does to a tool, a rule and a gate |
| 8 | When the average lies | Ole Peters' coin game: get the typical player growing at 2.5% a round |
| 9 | 2008: when links became conditions | A stress test on a 48-bank network: the lowest capital that contains five failures at once |
| 10 | How to find a black swan | Wason's selection task with four project files; Popper, the turkey, fire drills and reverse stress tests |
| 11 | Why species go extinct | Where the generalist overtakes the specialist as the years get more volatile |
| 12 | Why the winner takes most | Where a better product most often wins, among twenty equal firms |
| 13 | The shape of the network | What sixty fully linked people produce; mesh, hub and modules; Simon's watchmakers; Gall's law |
| 14 | What to do on Monday | A final challenge on the check-up tool, nine moves, and the reader's score |

### Puzzles and score

Every chapter opens with one puzzle. Solving it unaided earns two points, solving it after a hint or a wrong try
earns one, and "Show me the answer" sets the figure and earns none. The explanation below each figure opens once
its puzzle is solved or shown. Scores are kept in the reader's own browser (`localStorage`, key
`two-chains-puzzles-v1`); nothing is sent anywhere. The playbook shows the total and a button to start again.

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
| `dist/index.html` | The whole story in one self-contained file (about 350 KB, 140 KB compressed, fonts included). Open it from disk, host it on any static web server, embed it in an iframe, or wrap it as a SCORM package. |
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
test/sims.test.js         sanity checks: simulations match analytic results
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
