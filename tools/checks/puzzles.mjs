// Solves every puzzle the intended way and checks: each starts open, ends "Solved: 2 points",
// and unlocks its explanation. Also reports console errors.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const url = process.argv[2] ?? 'http://localhost:8811/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.reload();

const keys = async (sel, key, n) => { const el = page.locator(sel); await el.focus(); for (let i = 0; i < n; i++) await el.press(key); await page.waitForTimeout(60); };
const radio = async (text) => { await page.locator('main label', { hasText: text }).first().click(); await page.waitForTimeout(120); };
const choose = async (texts) => { for (const t of texts) await page.locator('.puzzle label', { hasText: t }).first().click(); await page.locator('.puzzle button', { hasText: 'Check' }).click(); await page.waitForTimeout(150); };
const chip = async (text) => { await page.locator('button.chip', { hasText: text }).click(); await page.waitForTimeout(100); };
const state = async () => (await page.locator('.puzzle .state').first().textContent())?.trim();

const steps = {
  riddle: () => choose(['qualified stand-in']),
  specialization: () => keys('#tkc-p-market', 'ArrowRight', 9),
  modules: () => choose(['Thousands']),
  queues: () => radio('One shared line'),
  variety: () => keys('#tkc-v-menu', 'ArrowRight', 10),
  ergodicity: async () => { await keys('#tkc-e-stake', 'ArrowLeft', 4); await radio('4 others'); },
  contagion: () => radio('12 biggest +4'),
  gate: async () => { await keys('#tkc-g-small', 'ArrowLeft', 2); await keys('#tkc-g-large', 'ArrowRight', 3); },
  tools: () => choose(['The person in the loop']),
  tinkering: () => keys('#tkc-tk-pilots', 'ArrowRight', 11),
  pace: () => keys('#tkc-p-memory', 'ArrowRight', 5),
  disbursement: async () => { await keys('#tkc-d-before', 'ArrowLeft', 4); await page.locator('label:has(#tkc-d-late-1)').click(); await page.waitForTimeout(200); },
};

// The opening hook: guess 74, send the loans, wait for the result.
await keys('#tkc-guess', 'ArrowRight', 24);
await page.locator('button', { hasText: 'Send 100 loans' }).click();
await page.waitForSelector('text=Start the story', { timeout: 20000 });
console.log('start'.padEnd(15), 'warm-up, no points:', (await page.locator('.hook').getByText(/Puzzle:/).count()) === 0 ? 'ok' : 'STILL SHOWS POINTS');

for (const [id, solve] of Object.entries(steps)) {
  const before = errors.length;
  await page.evaluate((id) => { location.hash = id; }, id);
  await page.waitForTimeout(700);
  const s0 = await state();
  const lockedBefore = await page.locator('.after .locked').count();
  await solve();
  await page.waitForTimeout(1200);
  const s1 = await state();
  const lockedAfter = await page.locator('.after .locked').count();
  const found = (await page.locator('.puzzle .found').first().textContent().catch(() => ''))?.trim().slice(0, 70);
  console.log(id.padEnd(15), `before: ${s0} (locked ${lockedBefore})`.padEnd(36), `after: ${s1} (locked ${lockedAfter})`.padEnd(36), found, errors.length - before ? `ERRORS ${errors.length - before}` : '');
}
console.log('header score:', await page.locator('.score').first().textContent());
await page.evaluate(() => { location.hash = 'monday'; });
await page.waitForTimeout(500);
console.log('score card:', (await page.locator('.score-card').textContent())?.replace(/\s+/g, ' ').trim());
console.log(errors.length ? errors.slice(0, 10).join('\n') : 'no console errors');
await browser.close();
