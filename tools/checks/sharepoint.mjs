// Mock SharePoint checks for the library build: host styles, arrow keys, theme, narrow column, destroy.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, colorScheme: 'dark' });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:8765/');
await page.waitForTimeout(1200);
const host = await page.evaluate(() => ({
  htmlColorScheme: getComputedStyle(document.documentElement).colorScheme,
  inputBg: getComputedStyle(document.getElementById('hostinput')).backgroundColor,
  bodyBg: getComputedStyle(document.body).backgroundColor,
  partTheme: document.querySelector('.tkc')?.getAttribute('data-theme'),
  partBg: getComputedStyle(document.querySelector('.tkc')).backgroundColor,
  partColorScheme: getComputedStyle(document.querySelector('.tkc')).colorScheme,
}));
// Arrow keys with focus in the host page must not move the story.
await page.focus('#hostlink');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(500);
const afterHostArrow = await page.evaluate(() => document.querySelector('.tkc h1, .tkc h2')?.textContent.trim());
// Inside the story they still work.
await page.getByRole('button', { name: 'Start the story →' }).click();
await page.waitForTimeout(900);
const inStory = await page.evaluate(() => ({ heading: document.activeElement?.textContent.trim(), hash: location.hash, scrollTop: document.getElementById('scroll').scrollTop }));
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(700);
const afterStoryArrow = await page.evaluate(() => document.querySelector('.tkc h2')?.textContent.trim());
// A narrow one-third column.
await page.evaluate(() => { document.getElementById('canvas').style.gridTemplateColumns = '320px 1fr'; });
await page.waitForTimeout(500);
const narrow = await page.evaluate(() => {
  const part = document.getElementById('webpart').getBoundingClientRect();
  let worst = 0;
  for (const el of document.querySelectorAll('#webpart *')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.right > part.right + 1) worst = Math.max(worst, r.right - part.right);
  }
  return { partWidth: part.width, overflowPx: Math.round(worst) };
});
await page.screenshot({ path: `${out}/sp-narrow.png` });
await page.evaluate(() => window.story.destroy());
const leftover = await page.evaluate(() => document.getElementById('webpart').children.length);
console.log(JSON.stringify({ host, afterHostArrow, inStory, afterStoryArrow, narrow, leftover, errors }, null, 1));
await browser.close();
