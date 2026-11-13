import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [id, out] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto('http://localhost:8811/#' + id); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
await p.locator('main figure.tkc-fig').first().screenshot({ path: out });
await b.close();
