// Browser checks for site/index.html, using Playwright's Chromium:
//   - no console errors, page errors, CSP violations or failed requests
//   - no horizontal page overflow at 360, 768 and 1280 px
//   - axe-core: no violations, with and without JavaScript, and under light and dark system settings
//   - the no-JS fallbacks are visible when scripts are off
//   - keyboard: the skip link comes first, and every focused element shows a visible focus ring
//   - reduced motion turns animations off
//   - the diagrams do what the copy says (attacker revokes fam_7; user 3 sees only their rows)
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { start } from './serve.mjs';

const { server, url } = await start();
const browser = await chromium.launch();
let failures = 0;
const fail = (msg) => { failures++; console.error(`  FAIL ${msg}`); };
const pass = (msg) => console.log(`  ok   ${msg}`);

async function open({ width = 1280, js = true, scheme = 'dark', motion = 'no-preference' } = {}) {
  // "No JS" means the site's script never runs. The browser keeps JS on so axe can run in the page.
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, reducedMotion: motion });
  const page = await ctx.newPage();
  if (!js) await page.route('**/site.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, errors };
}

async function overflow(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, out = [];
    const scrollsX = (n) => { for (let p = n.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && p !== document.body && p !== document.documentElement) return true; } return false; };
    for (const n of document.querySelectorAll('body *')) {
      const r = n.getBoundingClientRect();
      if (!r.width || getComputedStyle(n).visibility === 'hidden' || n.closest('[hidden]')) continue;
      if (n.closest('.vh') || n.classList.contains('skip')) continue;
      if ((r.right > W + 1 || r.left < -1) && !scrollsX(n)) out.push(`${n.tagName.toLowerCase()}.${[...n.classList].join('.')} [${Math.round(r.left)}..${Math.round(r.right)}] > ${W}`);
    }
    return { W, sw: document.documentElement.scrollWidth, out: out.slice(0, 8) };
  });
}

async function axe(page, label) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  if (r.violations.length) {
    for (const v of r.violations) fail(`${label} axe ${v.id} (${v.impact}): ${v.help} :: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  } else pass(`${label} axe: 0 violations (${r.passes.length} rules passed, ${r.incomplete.length} need review)`);
}

// 1. widths x schemes, with JS
for (const scheme of ['dark', 'light']) {
  for (const width of [360, 768, 1280]) {
    const label = `${width}px ${scheme}`;
    const { ctx, page, errors } = await open({ width, scheme });
    const o = await overflow(page);
    if (o.sw > o.W || o.out.length) fail(`${label} horizontal overflow: scrollWidth ${o.sw} > ${o.W}; ${o.out.join('; ')}`);
    else pass(`${label} no horizontal overflow`);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    if (bg !== 'rgb(12, 18, 20)') fail(`${label} body background is ${bg}`); else pass(`${label} dark background holds`);
    await axe(page, label);
    if (errors.length) errors.forEach((e) => fail(`${label} ${e}`)); else pass(`${label} no console errors or failed requests`);
    await ctx.close();
  }
}

// 2. no JavaScript: fallbacks visible, still accessible, no overflow
for (const width of [360, 1280]) {
  const label = `${width}px no-JS`;
  const { ctx, page, errors } = await open({ width, js: false });
  const vis = await page.evaluate(() => [...document.querySelectorAll('ol.fb')].map((o) => o.offsetHeight > 0));
  if (vis.length !== 5 || vis.some((v) => !v)) fail(`${label} fallbacks visible: ${JSON.stringify(vis)}`); else pass(`${label} all 5 diagram fallbacks visible`);
  const ctl = await page.locator('ol.ctl > li:visible').count();
  if (ctl !== 22) fail(`${label} controls listed: ${ctl}`); else pass(`${label} all 22 controls listed`);
  const o = await overflow(page);
  if (o.sw > o.W || o.out.length) fail(`${label} overflow: ${o.out.join('; ')}`); else pass(`${label} no horizontal overflow`);
  await axe(page, label);
  if (errors.length) errors.forEach((e) => fail(`${label} ${e}`));
  await ctx.close();
}

// 3. keyboard
{
  const { ctx, page } = await open({ width: 1280 });
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement.className);
  if (first !== 'skip') fail(`first Tab lands on "${first}", expected the skip link`); else pass('first Tab is the skip link');
  const skipShown = await page.evaluate(() => document.activeElement.getBoundingClientRect().top >= 0);
  if (!skipShown) fail('skip link is off screen when focused'); else pass('skip link appears on focus');
  let n = 0, noRing = [];
  const seen = new Set();
  for (let i = 0; i < 160; i++) {
    const info = await page.evaluate(() => {
      const a = document.activeElement, s = getComputedStyle(a);
      return { key: a.outerHTML.slice(0, 80), ring: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2, tag: a.tagName };
    });
    if (info.tag === 'BODY') break;
    if (seen.has(info.key)) { /* wrapped */ }
    seen.add(info.key); n++;
    if (!info.ring) noRing.push(info.key);
    await page.keyboard.press('Tab');
  }
  if (noRing.length) fail(`focus ring missing on: ${noRing.slice(0, 5).join(' | ')}`); else pass(`visible focus ring on all ${n} tab stops checked`);
  // keyboard operation of the SSO diagram
  await page.focus('[data-widget="sso"] .ctrl .btn:last-child');
  await page.keyboard.press('Enter');
  const reason = await page.textContent('tr[data-family="fam_7"] [data-col="reason"]');
  if (reason !== 'null') fail(`fam_7 revoked too early: ${reason}`);
  await page.click('[data-widget="sso"] .pills .pill:nth-child(8)');
  const after = await page.textContent('tr[data-family="fam_7"] [data-col="reason"]');
  if (after !== 'reuse') fail(`after step 08 fam_7 reason is "${after}", expected reuse`); else pass('attacker toggle + step 08 revokes fam_7 with reason reuse');
  await page.click('[data-view="3"]');
  const rows = await page.locator('#log tbody tr:visible').count();
  if (rows !== 2) fail(`user 3 view shows ${rows} rows, expected 2`); else pass('user 3 view shows only user 3\'s 2 rows');
  await page.click('.chip:has-text("CM-3")');
  const shown = await page.locator('ol.ctl > li:visible').getAttribute('data-id');
  if (shown !== 'CM-3') fail(`control picker shows ${shown}`); else pass('control picker shows the chosen control');
  await ctx.close();
}

// 4. reduced motion
{
  const { ctx, page } = await open({ width: 1280, motion: 'reduce' });
  const anims = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  if (anims) fail(`reduced motion: ${anims} animations running`); else pass('reduced motion: no running animations');
  const smooth = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  if (smooth !== 'auto') fail(`reduced motion: scroll-behavior ${smooth}`); else pass('reduced motion: scroll-behavior auto');
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\npage checks: ${failures} failed`);
process.exit(failures ? 1 : 0);
