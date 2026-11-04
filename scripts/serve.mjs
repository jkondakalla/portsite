// Minimal static server for site/. Sends the headers from site/_headers so local checks see the
// same Content-Security-Policy as production. Usage: node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png' };

function headerRules() {
  const rules = []; let cur = null;
  for (const line of readFileSync(join(SITE, '_headers'), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) { cur = { pat: line.trim(), h: {} }; rules.push(cur); continue; }
    const i = line.indexOf(':'); cur.h[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return rules;
}

export function start(port = 0) {
  const rules = headerRules();
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(SITE, p));
    if (!file.startsWith(SITE) || p.includes('_headers')) { res.writeHead(404); return res.end(); }
    try {
      if (!(await stat(file)).isFile()) throw 0;
      const h = { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' };
      for (const r of rules) {
        const re = new RegExp('^' + r.pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
        if (re.test(p)) Object.assign(h, r.h);
      }
      res.writeHead(200, h); res.end(await readFile(file));
    } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); }
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { url } = await start(+(process.argv[2] || 8080));
  console.log(`serving site/ at ${url}`);
}
