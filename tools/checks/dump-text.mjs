// Dumps each chapter's text: before (unsolved) and after "Show me the answer" (explanation open).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [url, out] = process.argv.slice(2);
const ids = ['start','riddle','specialization','systems','queues','async','emergence','ergodicity','contagion','black-swans','extinction','gate','graph','knot','modules','disbursement','covenants','tools','automation','variety','tinkering','redqueen','pace','monday'];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload();
let i = 0;
for (const id of ids) {
  await p.evaluate((id) => { location.hash = id; }, id); await p.waitForTimeout(700);
  const before = await p.locator('main').innerText();
  const show = p.locator('.puzzle button', { hasText: 'Show me the answer' });
  let shown = false;
  if (await show.count()) { await show.first().click().catch(() => {}); await p.waitForTimeout(600); shown = true; }
  const after = await p.locator('main').innerText();
  const n = String(i++).padStart(2, '0');
  fs.writeFileSync(`${out}/${n}-${id}.txt`, after);
  fs.writeFileSync(`${out}/${n}-${id}-before.txt`, before);
  console.log(n, id, 'words', after.split(/\s+/).length, shown ? '' : '(no answer button)');
}
console.log('page errors:', errs.length, errs.slice(0, 3));
await b.close();
