import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [base, ids, ...widths] = process.argv.slice(2);
const browser = await chromium.launch();
for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: +w, height: 844 } });
  if (process.env.SOLVED === '1') await page.addInitScript((ids) => { try { localStorage.setItem('two-chains-puzzles-v2', JSON.stringify(Object.fromEntries(ids.map((id) => [id, { status: 'solved', help: 0, points: 2 }])))); } catch {} }, ids.split(','));
  for (const id of ids.split(',')) {
    await page.goto(`${base}#${id}`);
    await page.waitForTimeout(800);
    const res = await page.evaluate(() => {
      const out = [];
      for (const t of document.querySelectorAll('svg text')) {
        const svg = t.ownerSVGElement.getBoundingClientRect();
        const r = t.getBoundingClientRect();
        if (r.width > 0 && (r.right > svg.right + 0.5 || r.left < svg.left - 0.5)) out.push(`"${t.textContent.trim()}" text[${Math.round(r.left)},${Math.round(r.right)}] svg[${Math.round(svg.left)},${Math.round(svg.right)}] class=${t.getAttribute('class')}`);
      }
      return out;
    });
    console.log(w, id, res.length ? res : 'ok');
  }
  await page.close();
}
await browser.close();
