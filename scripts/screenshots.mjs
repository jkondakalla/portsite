// Full-page screenshots at 360, 768 and 1280 px, under dark and light system settings, plus a
// no-JS pair. Written to out/shots/ (gitignored). Usage: node scripts/screenshots.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { start, PAGES } from './serve.mjs';

const { server, url } = await start();
const dir = process.argv[2] || 'out/shots';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const shots = [];
for (const scheme of ['dark', 'light']) for (const width of [360, 768, 1280]) shots.push({ scheme, width, js: true });
shots.push({ scheme: 'dark', width: 360, js: false }, { scheme: 'dark', width: 1280, js: false });
for (const path of PAGES) for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: 900 }, colorScheme: s.scheme, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  if (!s.js) await page.route('**/site.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.goto(new URL(path, url).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const name = `${dir}/${path.replaceAll('/', '') || 'home'}-${s.width}-${s.scheme}${s.js ? '' : '-nojs'}.png`;
  await page.screenshot({ path: name, fullPage: true });
  console.log(name);
  await ctx.close();
}
await browser.close();
server.close();
