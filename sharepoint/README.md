# Hosting Two Kinds of Chains on SharePoint

Svelte compiles to plain JavaScript, so it runs anywhere SharePoint lets JavaScript run. The catch is that
SharePoint Online is strict about *where* JavaScript may run. Four routes, best first:

| Route | Who has to approve | Effort | Reader experience |
|-------|--------------------|--------|-------------------|
| 1. SharePoint Framework (SPFx) web part | SharePoint admin deploys an app package | A day, plus your IT review | Native: a web part on a normal page, single sign-on, no other servers |
| 2. Embed web part with an iframe | Site owner allows the host domain; someone hosts one file | An hour, once a host exists | Good: an embedded panel of fixed height |
| 3. Learning platform (SCORM) | Learning & Development team | An hour | Good, with completion tracking |
| 4. File in a document library | Nobody | Minutes | Fallback: readers download the file and open it in their browser |

## What does not work

- **Uploading `index.html` and clicking it.** SharePoint Online downloads HTML files from document libraries
  instead of showing them. Renaming the file to `.aspx` used to work on sites with custom script enabled, but
  Microsoft now resets custom script to blocked within 24 hours of it being enabled, so treat that as a dead end.
- **Pasting the code into the Embed web part.** The Embed web part strips `<script>` tags. It only shows iframes,
  and only from allowed domains.

## 1. SPFx web part (recommended for a bank)

The SharePoint Framework is Microsoft's supported way to run custom code on modern pages. Its project generator
offers a **No framework** template, which is all this needs: the web part hands its element to the Svelte bundle.

1. Build the library: `npm run build` → `dist-lib/two-chains.js`.
2. Create a web part project with the SharePoint generator (`yo @microsoft/sharepoint`, or the newer SPFx CLI),
   choosing **WebPart** and **No framework**. Name it `TwoChains`.
3. Copy `dist-lib/two-chains.js` and `spfx/two-chains.d.ts` into `src/webparts/twoChains/story/`.
4. Replace the generated `TwoChainsWebPart.ts` with `spfx/TwoChainsWebPart.ts`.
5. In `TwoChainsWebPart.manifest.json`, add `"supportsFullBleed": true` so the story can fill a full-width section.
6. Bundle and package (`heft` or `gulp bundle --ship && gulp package-solution --ship`, depending on your SPFx
   version). Keep `"includeClientSideAssets": true` in `config/package-solution.json`, so the JavaScript is served
   from SharePoint itself and no CDN is involved.
7. Your SharePoint admin uploads the `.sppkg` to the app catalog. Then any page editor can add the web part.

Notes for the review:

- The bundle makes no network requests and loads nothing from outside. It writes one `<style>` element (id
  `two-chains-theme`) whose rules are scoped to the story's own elements or to `--tkc-*` custom properties.
- It does not touch the page URL (`syncHash: false`) and renders in light mode by default to match SharePoint.
- Modern SharePoint pages scroll inside a container, not the window. The story never listens to window scrolling,
  and chapter changes call `scrollIntoView`, which works inside SharePoint's scroll region.

## 2. Embed web part with an iframe

1. Put `dist/index.html` on a static host your bank already trusts, for example an Azure Static Web App or an
   internal web server. Use HTTPS.
2. A site collection administrator adds that domain under **Site settings → HTML Field Security** (allow iframes
   from this domain).
3. On the page, add an **Embed** web part and paste the snippet from `embed-snippet.html`.

The iframe has a fixed height. The story is built as one chapter at a time, so a height of 900–1000 px works well;
anything taller scrolls inside the frame. Deep links work: add `#dependence`, `#contagion` and so on to the URL.

## 3. Learning platform (SCORM)

If Learning & Development wants completion tracking, `dist/index.html` can be wrapped as a SCORM 1.2 package (an
`imsmanifest.xml` plus the file, zipped). Most learning platforms and authoring tools can do this for a single
HTML file. Completion can be reported when a reader reaches chapter 9.

## 4. File in a document library (zero-approval fallback)

Upload `dist/index.html` to a library and share it. Readers click it, it downloads, and they open it in Edge or
Chrome. Everything is inside the file, so it works offline. Check that your endpoint security allows opening
downloaded HTML files before relying on this for a large audience.

## Checklist before going live

- Try it in Edge on a bank laptop at 100% and 150% display scaling.
- Try it in a two-column section (about 600–800 px wide) and in a full-width section.
- Turn on **Reduce motion** in Windows (Settings → Accessibility → Visual effects → Animation effects off) and
  check that the animations become static.
- Ask one person from Risk to read the "How this model works" notes. The models are deliberately simple and should
  be presented as illustrations of a shape, not as forecasts.
