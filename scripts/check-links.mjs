// Checks every link and resource reference on every page in site/. Fails on any 404, a missing local
// file, or an in-page #anchor with no matching id. External links are fetched for real.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SITE, PAGES } from './serve.mjs';

const ORIGIN = 'https://jaaggruthkondakalla.com';
const pageFile = (path) => join(SITE, path, 'index.html');
const pages = PAGES.map((path) => {
  const html = readFileSync(pageFile(path), 'utf8');
  return { path, refs: [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]), ids: new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])) };
});
const uniq = [...new Set(pages.flatMap((pg) => pg.refs.filter((u) => /^(https?:|mailto:)/.test(u))))];
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

// Same-site references: the file must exist, and a #fragment must exist on the page it points at.
function local(pg, u) {
  const [path, frag] = u.split('#');
  const target = path || pg.path;
  if (target.endsWith('/')) {
    const dest = pages.find((x) => x.path === target);
    if (!dest) return fail(u, `no page at ${target} (linked from ${pg.path})`);
    if (frag && !dest.ids.has(frag)) fail(u, `no element with this id (linked from ${pg.path})`);
  } else if (!existsSync(join(SITE, target))) fail(u, `local file missing (linked from ${pg.path})`);
}
let localCount = 0;
for (const pg of pages) for (const u of new Set(pg.refs)) if (!/^(https?:|mailto:)/.test(u)) { localCount++; local(pg, u); }

const external = [];
for (const u of uniq) {
  if (u.startsWith('mailto:')) { if (!/^mailto:[^@\s]+@[^@\s]+\.[a-z]+$/i.test(u)) fail(u, 'malformed mailto'); continue; }
  if (u.startsWith(ORIGIN)) { // our own canonical URLs: the page must exist here, whether or not it's published yet
    if (!pages.some((x) => ORIGIN + x.path === u)) fail(u, 'no such page');
    continue;
  }
  external.push(u);
}
const results = [];
for (let i = 0; i < external.length; i += 6) {
  results.push(...await Promise.all(external.slice(i, i + 6).map(async (u) => [u, await check(u)])));
}
for (const [u, s] of results) {
  if (typeof s === 'number' && s >= 200 && s < 400) console.log(`  ok   ${s} ${u}`);
  else fail(u, String(s));
}
console.log(`\nlinks: ${localCount} local across ${pages.length} pages, ${external.length} external, ${bad} failed`);
process.exit(bad ? 1 : 0);
