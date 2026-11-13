// Interaction smoke test: every chapter, every control, every button; reports console errors.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const url = process.argv[2];
const ids = ['start','riddle','specialization','systems','queues','async','emergence','ergodicity','contagion','black-swans','extinction','gate','graph','knot','modules','disbursement','covenants','tools','automation','variety','tinkering','redqueen','pace','monday'];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(url);
for (const id of ids) {
  const before = errors.length;
  await page.evaluate((id) => { location.hash = id; }, id);
  await page.waitForTimeout(500);
  const title = await page.locator('h1, h2').first().textContent();
  // A hint opens the controls of a prediction puzzle.
  const hint = page.locator('.puzzle button', { hasText: 'Hint' });
  if (await hint.count()) { await hint.first().click(); await page.waitForTimeout(150); }
  // Try-this buttons
  const tries = page.locator('.tkc-try button');
  for (let i = 0; i < await tries.count(); i++) { await tries.nth(i).click(); await page.waitForTimeout(150); }
  // Sliders: jump to both ends and back
  const ranges = page.locator('main input[type=range]');
  for (let i = 0; i < await ranges.count(); i++) {
    const r = ranges.nth(i);
    await r.focus();
    await page.keyboard.press('End'); await page.waitForTimeout(80);
    await page.keyboard.press('Home'); await page.waitForTimeout(80);
    for (let k = 0; k < 3; k++) await page.keyboard.press('ArrowRight');
  }
  // Radios
  const radios = page.locator('main fieldset label');
  for (let i = 0; i < await radios.count(); i++) { await radios.nth(i).click(); await page.waitForTimeout(80); }
  // Figure buttons (not the pager)
  const btns = page.locator('main figure button:not([disabled])');
  for (let i = 0; i < await btns.count(); i++) { const b = btns.nth(i); if (await b.isVisible()) { await b.click(); await page.waitForTimeout(120); } }
  // Click a few banks in the network
  if (id === 'contagion') { const banks = page.locator('circle.bank'); for (let i = 0; i < 3; i++) { await banks.nth(i * 7).click({ force: true }); await page.waitForTimeout(300); } }
  // Hover charts
  const hits = page.locator('main svg rect[role=presentation]');
  for (let i = 0; i < await hits.count(); i++) { const h = hits.nth(i); const box = await h.boundingBox(); if (box) { await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5); await page.waitForTimeout(60); } }
  // Open details
  const det = page.locator('main details summary');
  for (let i = 0; i < await det.count(); i++) await det.nth(i).click();
  console.log(`${id.padEnd(15)} ${title?.trim().slice(0, 40).padEnd(42)} new errors: ${errors.length - before}`);
}
// Keyboard navigation between chapters
await page.evaluate(() => { location.hash = 'riddle'; document.activeElement?.blur(); });
await page.waitForTimeout(300);
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400);
console.log('after ArrowRight hash =', await page.evaluate(() => location.hash));
console.log(errors.length ? errors.slice(0, 10).join('\n') : 'no console errors');
await browser.close();
