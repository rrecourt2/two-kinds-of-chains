# Two Kinds of Chains

An interactive learning story about good complexity (specialization), bad complexity (dependence) and how scale
amplifies both. Nine short chapters, each with a live model the reader can change. Built with Svelte 5 and Vite.
Everything ships as one file, with no external requests, so it can run inside a locked-down bank intranet.

| # | Chapter | Live model |
|---|---------|------------|
| 0 | Two Kinds of Chains | Same four steps staffed two ways: named people vs interchangeable people |
| 1 | A riddle about chains | A month calendar: how often everyone a decision needs is in (AND vs OR) |
| 2 | Why longer chains get cheaper | Adam Smith's pin workshop: the best number of specialists grows with the market |
| 3 | Waiting for people who aren't there | The approval relay: sign-offs, stand-ins, parallel review, send-backs |
| 4 | Why full calendars make long queues | Four approvers, named lines vs one shared line, waiting vs utilization |
| 5 | When the average lies | Ole Peters' coin game: ergodicity, staking less, pooling |
| 6 | 2008: when links became conditions | A 48-bank interbank network you can push into contagion |
| 7 | Why species go extinct | Specialist vs generalist on 40 islands, in calm and volatile worlds |
| 8 | Scale amplifies what you build | Mesh vs single approver vs small teams as the organization grows |
| 9 | What to do on Monday | Two-question test, seven moves, and a tool to check a real process |

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
| `dist/index.html` | The whole story in one self-contained file (about 250 KB, 107 KB compressed, fonts included). Open it from disk, host it on any static web server, embed it in an iframe, or wrap it as a SCORM package. |
| `dist-lib/two-chains.js` | An ES module exporting `mountStory(element, options)`. Used by the SharePoint Framework web part in `sharepoint/spfx/`. Styles travel inside the bundle. |

`mountStory(el, { theme, syncHash, startAt })`

- `theme`: `'light'` (default in the library build, to match SharePoint), `'dark'` or `'auto'` (follow the operating system).
- `syncHash`: `false` by default in the library build, so the host page's URL is left alone. The standalone page uses `#riddle`, `#dependence` and so on as deep links.
- `startAt`: a chapter id to open first.
- Returns `{ destroy() }`.

## Where things live

```
src/
  App.svelte              story shell: chain-link navigation, chapter switching, keyboard arrows
  chapters/*.svelte       one file per chapter: the text and the interactive figure
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
- **Accessibility.** Native range inputs and radio groups, visible focus, keyboard navigation (← →), live regions
  for key results, colour never the only signal, `prefers-reduced-motion` respected (animations become static).
- **Deterministic.** Simulations use seeded random numbers, so everyone in a workshop sees the same month, network
  or century until they press the button for a new one.
