# jaaggruthkondakalla.com

Jag Kondakalla's portfolio. A static one-page site: plain HTML, CSS and JavaScript, self-hosted
fonts, no build step, no backend, no cookies, no analytics.

## Layout

| Path | What it is |
|---|---|
| `site/` | The site. Publish this folder as is. |
| `site/index.html` | The page. Each diagram is written as a plain list, which is the no-JavaScript fallback. |
| `site/site.js` | Builds the interactive diagrams from those lists. |
| `site/styles.css` | All styles. Dark only. |
| `site/_headers` | Security headers (CSP and others) in Cloudflare Pages format. |
| `site/fonts/` | Libre Caslon Text, Archivo, JetBrains Mono, Mrs Saint Delafield (latin subsets, SIL OFL; licenses alongside). |
| `scripts/` | Verification only. Not published. |

## Sources

Every jkOS claim links to its file in `github.com/jkondakalla/jkOS` on the `staging` branch. The
22 control rows in the Controls matrix card were generated from that repo's
`Documentation/CONTROLS.md`. When CONTROLS.md changes, regenerate them.

## Checks

```bash
npm install                 # dev tools only: Playwright, axe-core, Lighthouse (exact versions)
npx playwright install chromium
npm run check:links         # every link and file reference; fails on any 404
npm run check:page          # axe, console errors, overflow at 360/768/1280, no-JS, keyboard, reduced motion
npm run check:lighthouse    # fails below 95 on performance, accessibility, best practices or SEO
npm run screenshots         # full-page PNGs into out/shots/
npm run serve               # local preview at http://127.0.0.1:8080/
```

## Deploying

Not deployed yet. For Cloudflare Pages: no build command, output directory `site`.
