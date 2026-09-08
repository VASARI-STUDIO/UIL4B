// THE APP'S CSS, all of it.
//
// `src/styles/global.css` stopped being the whole stylesheet on 2026-09-08:
// thirteen single-page selector families were lifted into
// `src/styles/pages/*.css`, each imported by the lazy page module that owns it
// so it ships as that route's chunk stylesheet instead of on every route.
//
// A test that reads global.css alone still COMPILES and still PASSES after a
// lift like that — it just stops looking at the rules it was written about.
// `design-tokens` scans for custom properties that are used but never defined,
// and `alt-text-quality` asserts that `.alt-card-text` carries no `min-height`;
// both would have gone quietly vacuous rather than red, which is the exact
// failure mode this suite keeps paying for. Two of them DID go red, on
// `.adm-tabs` and `.alt-card-text` — that is the only reason the narrowing was
// noticed at all.
//
// So: read `ALL_CSS` for anything about what the app's rules SAY, and
// `GLOBAL_CSS` only when the assertion is genuinely about which FILE a rule
// lives in. Page stylesheets are discovered from the directory rather than
// listed, so the next lift needs no edit here.
import fs from 'node:fs'
import path from 'node:path'

const STYLES = path.join(process.cwd(), 'src', 'styles')
const PAGES = path.join(STYLES, 'pages')

export const GLOBAL_CSS = fs.readFileSync(path.join(STYLES, 'global.css'), 'utf8')

export const PAGE_STYLESHEETS = fs.existsSync(PAGES)
  ? fs.readdirSync(PAGES).filter((f) => f.endsWith('.css')).sort()
  : []

/** global.css followed by every page stylesheet, in filename order. */
export const ALL_CSS = [GLOBAL_CSS, ...PAGE_STYLESHEETS.map(
  (f) => fs.readFileSync(path.join(PAGES, f), 'utf8'),
)].join('\n')
