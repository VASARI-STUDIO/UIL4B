// THE DEV COMPONENT SHEET (/dev/components) MUST NOT EXIST IN A PRODUCTION BUILD.
//
// The page is a gallery of every shared control for screenshots. It is wired in
// App.jsx behind `DEV_SHEET = import.meta.env.DEV || import.meta.env.MODE ===
// 'test'`, which Vite resolves to a literal at build time, so the bundler drops
// the dynamic import and the <Route> in a production build.
//
// Three halves, as in test-session-not-in-production.test.js:
//   STATIC.     App.jsx gates both the import and the route, and no published
//               list (vercel.json, sitemap, llms.txt, route data, nav) names it.
//   EMPIRICAL.  A real production build is scanned for the page's fingerprint,
//               and a --mode test build is scanned for the same one first, so a
//               scanner that cannot see the page cannot report a clean build.
//   MIRRORS.    The sheet's forced hover/focus rules repeat their source rules'
//               declarations; each pair is compared so a drift fails here.
//
// MUTATION-VERIFIED BY DESIGN: dropping the gate (DEV_SHEET = true) fails the
// static test and the empirical production scan.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { stripJs, stripCss } from '../helpers/strip-comments.js'

const ROOT = process.cwd()
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const ROUTE = '/dev/components'
// A string literal the page renders, so it survives minification.
const FINGERPRINT = 'data-dev-sheet'

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

test('App.jsx gates the dev sheet on dev or test mode, for the import and the route', () => {
  const app = stripJs(read('src/App.jsx'))
  assert.match(app, /const DEV_SHEET = import\.meta\.env\.DEV \|\| import\.meta\.env\.MODE === 'test'/,
    'DEV_SHEET must be written with the two expressions Vite replaces at build time')
  const imports = app.match(/import\(\s*['"]\.\/pages\/DevComponents['"]\s*\)/g) || []
  assert.equal(imports.length, 1, 'the page is imported once')
  assert.match(app, /DEV_SHEET \? lazy\(\(\) => import\('\.\/pages\/DevComponents'\)\) : null/,
    'the lazy import must sit behind DEV_SHEET so production drops it')
  assert.match(app, /\{DEV_SHEET && <Route path="\/dev\/components"/, 'the route must sit behind DEV_SHEET')
  assert.equal((app.match(/path="\/dev\/components"/g) || []).length, 1)
  assert.ok(!/^import .*DevComponents/m.test(app), 'a static import would put the page in every bundle')
})

test('no published list or navigation names the dev sheet', () => {
  const offenders = []
  const check = (file) => {
    if (fs.readFileSync(file, 'utf8').includes(ROUTE)) offenders.push(path.relative(ROOT, file))
  }
  for (const f of ['vercel.json', 'public/sitemap.xml', 'public/llms.txt', 'public/robots.txt']) {
    if (fs.existsSync(path.join(ROOT, f))) check(path.join(ROOT, f))
  }
  for (const dir of ['src/data', 'src/components', 'scripts', 'api']) {
    for (const f of walk(path.join(ROOT, dir))) if (/\.(jsx?|mjs|json|txt|xml)$/.test(f)) check(f)
  }
  assert.deepEqual(offenders, [], `${ROUTE} must be in no sitemap, nav, route-meta table or llms.txt`)
})

// ── EMPIRICAL ──────────────────────────────────────────────────────────────
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
const stamp = `${process.pid}-${Date.now()}`
// Inside the repo, under the git-ignored `dist-*` pattern, so a build never
// lands in the default dist or outside the checkout, and a crash leaves
// nothing that could be committed.
const prodDir = path.join(ROOT, `dist-devsheet-proof-prod-${stamp}`)
const testDir = path.join(ROOT, `dist-devsheet-proof-test-${stamp}`)
let built = false
function ensureBuilt() {
  if (built) return
  for (const [dir, mode] of [[prodDir, null], [testDir, 'test']]) {
    const args = [VITE_BIN, 'build', '--outDir', dir, '--emptyOutDir']
    if (mode) args.push('--mode', mode)
    execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe', env: { ...process.env, VITE_STRIPE_PUBLISHABLE_KEY: process.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_unit' } })
  }
  built = true
}
test.after(() => {
  for (const d of [prodDir, testDir]) {
    try { fs.rmSync(d, { recursive: true, force: true }) } catch { /* best effort */ }
  }
})
const filesWith = (dir, needle) => walk(dir).filter((f) => fs.readFileSync(f, 'latin1').includes(needle)).map((f) => path.relative(dir, f))

test('the scanner can see the sheet in a --mode test build (positive control)', () => {
  ensureBuilt()
  assert.ok(filesWith(testDir, FINGERPRINT).length > 0,
    `"${FINGERPRINT}" was not found in a --mode test build: the fingerprint no longer survives, or the test build lost the route`)
})

test('a production build contains no trace of the dev sheet', () => {
  ensureBuilt()
  const scripts = walk(prodDir).filter((f) => f.endsWith('.js'))
  assert.ok(scripts.length > 10, 'the production build emitted too few scripts to be a real bundle')
  assert.deepEqual(filesWith(prodDir, FINGERPRINT), [], 'THE DEV COMPONENT SHEET LEAKED INTO THE PRODUCTION BUNDLE')
  assert.deepEqual(filesWith(prodDir, 'dev-components'), [], 'the sheet stylesheet or chunk leaked into the production build')
})

// ── MIRRORS ────────────────────────────────────────────────────────────────
const SHEET_CSS = stripCss(read('src/styles/pages/dev-components.css'))
const SOURCE_CSS = stripCss(
  [read('src/styles/global.css'),
    ...fs.readdirSync(path.join(ROOT, 'src/styles/deferred')).map((f) => read(`src/styles/deferred/${f}`)),
    ...fs.readdirSync(path.join(ROOT, 'src/styles/pages')).filter((f) => f !== 'dev-components.css').map((f) => read(`src/styles/pages/${f}`))].join('\n'),
)
const squash = (s) => s.replace(/\s+/g, '')
function decls(css, selector) {
  const sel = squash(selector).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const flat = squash(css)
  const re = new RegExp(`(?:^|[};{])${sel}\\{([^}]*)\\}`, 'g')
  return [...flat.matchAll(re)].map((m) => m[1].split(';').filter(Boolean).sort().join(';'))
}
const MIRRORS = [
  ['.btn:hover', '.btn.dcs-hover'],
  ['.btn-accent:hover,.btn-primary:hover', '.btn-accent.dcs-hover'],
  ['.btn.btn-inverse:hover', '.btn.btn-inverse.dcs-hover'],
  ['.btn.btn-ghost:hover', '.btn.btn-ghost.dcs-hover'],
  ['.ui-pill-ink:hover', '.ui-pill-ink.dcs-hover'],
  ['.ui-pill-out:hover', '.ui-pill-out.dcs-hover'],
  ['.ui-pill-accent:hover', '.ui-pill-accent.dcs-hover'],
  ['.ui-pill-ghost:hover', '.ui-pill-ghost.dcs-hover'],
  [':focus-visible', '.dcs-focus, input.dcs-field-focus, textarea.dcs-field-focus'],
  ['input:focus,select:focus,textarea:focus', '.dcs-field-focus'],
  ['.lib-surface .lbry-search:focus-within', '.lib-surface .lbry-search.dcs-focus-within'],
]
for (const [source, mirror] of MIRRORS) {
  test(`the forced state "${mirror}" still repeats "${source}"`, () => {
    const want = decls(SOURCE_CSS, source)
    const got = decls(SHEET_CSS, mirror)
    assert.ok(want.length > 0, `the source rule "${source}" is gone from the app's stylesheets; update the sheet`)
    assert.equal(got.length, 1, `the sheet must carry exactly one "${mirror}" rule`)
    assert.ok(want.includes(got[0]), `"${mirror}" no longer matches "${source}":\n  sheet:  ${got[0]}\n  source: ${want.join(' | ')}`)
  })
}
