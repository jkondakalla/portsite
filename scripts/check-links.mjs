// Checks every link and resource reference in site/index.html. Fails on any 404, a missing local
// file, or an in-page #anchor with no matching id. External links are fetched for real.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SITE } from './serve.mjs';

const html = readFileSync(join(SITE, 'index.html'), 'utf8');
const refs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const uniq = [...new Set(refs)];
let bad = 0;
const fail = (u, why) => { bad++; console.error(`  FAIL ${u}  ${why}`); };

async function check(u) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(u, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'portfolio-link-check' }, signal: AbortSignal.timeout(20000) });
      if (r.status === 429 && attempt < 3) { await new Promise((ok) => setTimeout(ok, 3000 * attempt)); continue; }
      return r.status;
    } catch (e) { if (attempt === 3) return `error ${e.cause?.code || e.message}`; }
  }
}

const external = [];
for (const u of uniq) {
  if (u.startsWith('mailto:')) { if (!/^mailto:[^@\s]+@[^@\s]+\.[a-z]+$/i.test(u)) fail(u, 'malformed mailto'); continue; }
  if (u.startsWith('#')) { if (u.length > 1 && !ids.has(u.slice(1))) fail(u, 'no element with this id'); continue; }
  if (/^https?:\/\//.test(u)) { external.push(u); continue; }
  if (!existsSync(join(SITE, u.split('#')[0]))) fail(u, 'local file missing');
}
const results = [];
for (let i = 0; i < external.length; i += 6) {
  results.push(...await Promise.all(external.slice(i, i + 6).map(async (u) => [u, await check(u)])));
}
for (const [u, s] of results) {
  if (typeof s === 'number' && s >= 200 && s < 400) console.log(`  ok   ${s} ${u}`);
  else fail(u, String(s));
}
console.log(`\nlinks: ${uniq.length} checked (${external.length} external), ${bad} failed`);
process.exit(bad ? 1 : 0);
