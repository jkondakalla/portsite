# jaaggruthkondakalla.com

Jag Kondakalla's portfolio. A static site of five pages: plain HTML, CSS and JavaScript, self-hosted
fonts, no build step, no backend, no cookies, no analytics.

## Layout

| Path | What it is |
|---|---|
| `site/` | The site. Publish this folder as is. |
| `site/index.html`, `site/*/index.html` | The pages: home, jkOS, projects, experience, contact. Each diagram is written as a plain list, which is the no-JavaScript fallback. The nav is repeated in each page, so a new page means editing all of them and `PAGES` in `scripts/serve.mjs`. |
| `site/site.js` | Builds the interactive diagrams from those lists. |
| `site/styles.css` | All styles. Dark only. |
| `site/_headers` | Security headers (CSP and others). The local server reads this file; in production the same headers live in jkOS's nginx block, so change both. |
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

## Changing the site

1. `npm run serve`, open http://127.0.0.1:8080/, edit `site/`, refresh. Nothing is public yet.
2. `npm run check:links && npm run check:page`
3. `git add -A && git commit -m "what changed" && git push`
4. Press **Redeploy Portfolio** at https://staging.jkos.net/deploy/.

The button publishes the latest commit on `main`, so a pushed commit is the release. Anything not
committed and pushed doesn't go out.
