// Lighthouse (mobile and desktop) on every page, against the local server. Fails if any category scores below 95.
// Reports go to out/lighthouse-*.html (gitignored).
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { start, PAGES } from './serve.mjs';

const { server, url } = await start();
mkdirSync('out', { recursive: true });
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
let bad = 0;
const GATED = ['performance', 'accessibility', 'best-practices', 'seo'];
for (const path of PAGES) for (const preset of ['mobile', 'desktop']) {
  const slug = path.replaceAll('/', '') || 'home';
  const config = preset === 'desktop' ? (await import('lighthouse/core/config/desktop-config.js')).default : undefined;
  const r = await lighthouse(new URL(path, url).href, { port: chrome.port, output: 'html', logLevel: 'error', onlyCategories: GATED }, config);
  writeFileSync(`out/lighthouse-${slug}-${preset}.html`, r.report);
  const cats = r.lhr.categories;
  const line = Object.values(cats).map((c) => `${c.title} ${Math.round(c.score * 100)}`).join(' · ');
  console.log(`${path} ${preset}: ${line}`);
  for (const c of Object.values(cats)) if (c.score < 0.95) { bad++; console.error(`  FAIL ${path} ${preset} ${c.title} ${Math.round(c.score * 100)}`); }
  for (const a of Object.values(r.lhr.audits)) if (a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual') console.log(`    note ${a.id}: ${a.title} ${a.displayValue || ''}`);
  const m = r.lhr.audits;
  console.log(`    LCP ${m['largest-contentful-paint'].displayValue} · CLS ${m['cumulative-layout-shift'].displayValue} · TBT ${m['total-blocking-time'].displayValue}`);
}
await chrome.kill();
server.close();
process.exit(bad ? 1 : 0);
