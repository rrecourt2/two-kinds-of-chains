// Turn the standalone build (a full HTML document) into the fragment the artifact host wraps itself.
import { readFileSync, writeFileSync } from 'fs';
const [src, out] = process.argv.slice(2);
const html = readFileSync(src, 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const styles = pick(/<style[^>]*>[\s\S]*?<\/style>/g);
const scripts = pick(/<script type="module"[^>]*>[\s\S]*?<\/script>/g);
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '').trim();
const fragment = [title, '<meta name="claude:viewport-fit-sides" content="cover">', ...styles, body, ...scripts].join('\n');
writeFileSync(out, fragment);
console.log({ bytes: fragment.length, styles: styles.length, scripts: scripts.length, titleAt: fragment.indexOf('<title>'), body });
