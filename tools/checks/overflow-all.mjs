import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [base, ...widths] = process.argv.slice(2);
const IDS = ['start','riddle','specialization','systems','queues','async','emergence','ergodicity','contagion','black-swans','extinction','gate','graph','knot','modules','disbursement','covenants','tools','automation','variety','tinkering','redqueen','pace','monday'];
const browser = await chromium.launch();
let bad = 0;
for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: +w, height: 844 } });
  if (process.env.SOLVED === '1') await page.addInitScript((ids) => { try { localStorage.setItem('two-chains-puzzles-v1', JSON.stringify(Object.fromEntries(ids.map((id) => [id, { status: 'solved', help: 0, points: 2 }])))); } catch {} }, IDS);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  for (const id of IDS) {
    await page.goto(`${base}#${id}`);
    await page.waitForTimeout(700);
    const res = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && r.width > 0) out.push(`${el.tagName.toLowerCase()}.${typeof el.className === 'string' ? el.className : ''} right=${Math.round(r.right)}`);
      }
      return { vw, sw: document.documentElement.scrollWidth, out: out.slice(0, 5) };
    });
    if (res.sw > res.vw || res.out.length) { bad++; console.log(w, id, JSON.stringify(res)); }
  }
  if (errors.length) { bad++; console.log(w, 'errors', errors); }
  await page.close();
}
console.log(bad ? `PROBLEMS: ${bad}` : `OK: no overflow or errors at ${widths.join(', ')}px across ${IDS.length} views`);
await browser.close();
