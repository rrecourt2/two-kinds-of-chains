import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:8811/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(base);
await page.evaluate(() => localStorage.clear());
const state = async () => (await page.locator('.puzzle .state').first().textContent())?.trim();
const active = () => page.evaluate(() => { const a = document.activeElement; return `${a?.tagName.toLowerCase()}.${a?.className?.toString().split(' ')[0] ?? ''} "${(a?.textContent || '').trim().slice(0, 40)}"`; });
const goto = async (id) => { await page.evaluate((id) => { location.hash = id; }, id); await page.waitForTimeout(700); };
const out = [];

// 1. A wrong choice leaves the target open; the right one solves it.
await goto('contagion');
await page.locator('main label', { hasText: '3 biggest +16' }).click();
await page.waitForTimeout(1200);
out.push(['a wrong share leaves the stress test open', (await state()) === 'Worth 2 points', await state()]);
await page.locator('main label', { hasText: '12 biggest +4' }).click();
await page.waitForTimeout(1200);
out.push(['the right share solves it', (await state())?.includes('Solved'), await state()]);
out.push(['"Why it works" button shown', (await page.locator('.puzzle button', { hasText: 'Why it works' }).count()) === 1, '']);
await page.locator('.puzzle button', { hasText: 'Why it works' }).click();
await page.waitForTimeout(300);
out.push(['focus moves to the explanation', (await active()).startsWith('div.after'), await active()]);

// 2. Prediction lock, focus after a correct check, arrow keys inside a figure.
await goto('riddle');
const inert = await page.locator('.tkc-controls .tkc-wait').first().evaluate((el) => el.inert);
out.push(['riddle stand-ins locked before answering', inert === true, String(inert)]);
await page.locator('.puzzle button', { hasText: 'Hint' }).click();
await page.waitForTimeout(200);
const inert2 = (await page.locator('.tkc-controls .tkc-wait[inert]').count()) > 0;
out.push(['a hint opens them', inert2 === false, String(inert2)]);
await page.locator('.puzzle button', { hasText: 'Another hint' }).click();
await page.waitForTimeout(300);
out.push(['after the last hint, focus on that hint', (await active()).startsWith('li'), await active()]);
await page.locator('.puzzle label', { hasText: 'qualified stand-in' }).click();
await page.locator('.puzzle button', { hasText: 'Check' }).click();
await page.waitForTimeout(300);
out.push(['after a correct check, focus on the answer', (await active()).startsWith('p.found'), await active()]);
out.push(['points after a hint', (await state())?.includes('1 point'), await state()]);
await page.locator('main button', { hasText: 'Reset' }).first().focus();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(500);
out.push(['ArrowRight on a figure button stays in the chapter', (await page.evaluate(() => location.hash)) === '#riddle', await page.evaluate(() => location.hash)]);

// 3. Wrong answer feedback and show-answer focus.
await goto('emergence');
await page.locator('.puzzle label', { hasText: 'shorter' }).first().click();
await page.locator('.puzzle button', { hasText: 'Check' }).click();
await page.waitForTimeout(200);
out.push(['wrong answer says so', ((await page.locator('.puzzle .feedback').textContent()) || '').startsWith('Not quite.'), (await page.locator('.puzzle .feedback').textContent())?.slice(0, 60)]);
out.push(['wrong answer opens the controls', (await page.locator('.tkc-controls').first().evaluate((el) => el.inert)) === false, '']);
await page.locator('.puzzle button', { hasText: 'Show me the answer' }).click();
await page.waitForTimeout(300);
out.push(['show answer: 0 points, focus on the answer', (await state()) === 'Answer shown' && (await active()).startsWith('p.found'), `${await state()} / ${await active()}`]);

// 4. Black swans: one fall beyond the record does not count; both falls within it do.
await goto('black-swans');
const tr = page.locator('#tkc-bs-traffic');
await tr.focus();
for (let i = 0; i < 20; i++) await tr.press('ArrowRight');
await page.waitForTimeout(1200);
out.push(['one fall beyond the record leaves it open', (await state()) === 'Worth 2 points', await state()]);
for (let i = 0; i < 8; i++) await tr.press('ArrowLeft');
const cu = page.locator('#tkc-bs-currency');
await cu.focus();
for (let i = 0; i < 15; i++) await cu.press('ArrowRight');
await page.waitForTimeout(1200);
out.push(['both falls within the record solve it', (await state())?.includes('Solved'), await state()]);

// 5. Monday: start again asks first and keeps focus sensible.
await goto('monday');
await page.locator('button', { hasText: 'Start again' }).click();
await page.waitForTimeout(200);
out.push(['confirm focuses "Keep it"', (await active()).includes('Keep it'), await active()]);
out.push(['confirm explains what is lost', (await page.locator('.confirm').textContent())?.includes('clears your'), (await page.locator('.confirm').textContent())?.trim()]);
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
out.push(['"Keep it" returns focus to "Start again"', (await active()).includes('Start again'), await active()]);

// 6. A figure's reset puts its controls back, and keeps focus on the reset button.
await goto('queues');
await page.locator('main label', { hasText: 'One shared line' }).click();
const busy = page.locator('#tkc-q-busy');
await busy.focus();
for (let i = 0; i < 3; i++) await busy.press('ArrowLeft');
await page.waitForTimeout(200);
const before = await busy.inputValue();
await page.locator('button', { hasText: 'Reset' }).first().click();
await page.waitForTimeout(400);
const after = await page.locator('#tkc-q-busy').inputValue();
const named = await page.locator('main input[type=radio]').first().isChecked();
out.push(['figure reset restores the controls', before !== '80' && after === '80' && named, `busy ${before} → ${after}, named ${named}`]);
out.push(['focus stays on the reset button', (await active()).includes('Reset'), await active()]);

// 7. The header score opens a panel with a confirmed reset.
const scoreBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('two-chains-puzzles-v1') || '{}'));
await page.locator('button.score').click();
await page.waitForTimeout(150);
out.push(['score panel opens', (await page.locator('.score-panel').count()) === 1, (await page.locator('.score-line').textContent())?.trim()]);
await page.locator('.score-panel button', { hasText: 'Reset score' }).click();
await page.locator('.score-panel button', { hasText: 'Clear my score' }).click();
await page.waitForTimeout(800);
const scoreAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('two-chains-puzzles-v1') || '{}'));
out.push(['score cleared after confirming', Object.keys(scoreBefore).length > 0 && Object.keys(scoreAfter).length === 0, `${Object.keys(scoreBefore).length} → ${Object.keys(scoreAfter).length} entries`]);
out.push(['header shows zero, panel closed, focus on score', (await page.locator('button.score').textContent())?.includes('★ 0/') && (await page.locator('.score-panel').count()) === 0 && (await active()).includes('★'), (await page.locator('button.score').textContent())?.trim()]);

for (const [name, ok, detail] of out) console.log(ok ? 'PASS' : 'FAIL', name.padEnd(48), detail ?? '');
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
