// THE HOMEPAGE BYTE BUDGETS, WHICH ARE THE HALF A MACHINE CAN CHECK.
//
// `homepage-field-metrics` carries several budgets. The timings among them
// (LCP, CLS, interaction response) depend on the machine they are taken on, so
// they belong to scripts/home-field-metrics.mjs and to the measurement recorded
// on the item — asserting them here would fail the build at random on a busy
// laptop, and a guard that cries wolf is one people start ignoring.
//
// The BYTE budgets are different: they are properties of the repository, they
// are exact, and they are the ones that regress silently. Somebody swaps a
// reference thumbnail for a nicer photo, the file triples, and nothing says so
// until a phone on a slow link pays for it. That is what this file catches.
//
// Measured on 2026-09-06, on the throttled profile named on the pipeline item:
// none of these three images is fetched on a cold homepage load at all — they
// belong to the converter tab. The budget is still real, because the moment the
// visitor opens that tab they are fetched together.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8')

const THUMB_DIR = 'public/previews/home-image-converter'
// 180 KB, the figure the retired homepage acceptance contract set. Decimal KB,
// as file sizes are quoted everywhere else in this repo.
const THUMB_BUDGET_BYTES = 180_000

test('the bundled reference thumbnails exist and are still three', () => {
  // Positive control. The size assertion below is trivially satisfied by an
  // empty directory, which is exactly how a budget check quietly stops
  // checking anything.
  const files = fs.readdirSync(path.join(ROOT, THUMB_DIR)).filter(f => f.endsWith('.webp'))
  assert.equal(files.length, 3, `expected three reference thumbnails, found ${files.length}: ${files.join(', ')}`)
  for (const f of files) {
    assert.ok(fs.statSync(path.join(ROOT, THUMB_DIR, f)).size > 1000, `${f} is suspiciously small — is it a placeholder?`)
  }
})

test('the three reference thumbnails stay within 180 KB encoded, in total', () => {
  const files = fs.readdirSync(path.join(ROOT, THUMB_DIR)).filter(f => f.endsWith('.webp'))
  const sizes = files.map(f => ({ f, bytes: fs.statSync(path.join(ROOT, THUMB_DIR, f)).size }))
  const total = sizes.reduce((n, s) => n + s.bytes, 0)
  assert.ok(
    total <= THUMB_BUDGET_BYTES,
    `the reference thumbnails total ${total} bytes, over the ${THUMB_BUDGET_BYTES}-byte budget:\n  `
    + sizes.map(s => `${s.bytes} ${s.f}`).join('\n  '),
  )
})

test('the homepage still names those thumbnails, so the budget guards something live', () => {
  // A budget on files nothing references is not a budget. If the workbench
  // stops using these, this test should be deleted along with them rather than
  // left passing on dead weight.
  const workbench = read('src/components/HomeWorkbench.jsx')
  for (const name of ['architecture', 'people', 'nature']) {
    assert.match(workbench, new RegExp(`/previews/home-image-converter/${name}\\.webp`), `the workbench no longer references ${name}.webp`)
  }
})

test('every declared face is served from /fonts, never from a catalogue', () => {
  // One of the budgets that is already MET and must stay met: "the homepage
  // must make no remote image/icon/font-catalogue call". Two sequential
  // third-party round trips (fonts.googleapis.com for the CSS, which only then
  // revealed the fonts.gstatic.com URL to fetch) were replaced by self-hosted
  // subsets under /fonts. The rendered half is measured by
  // scripts/home-field-metrics.mjs, which counts catalogue calls per run; this
  // is the static half.
  //
  // Comments are stripped first: global.css EXPLAINS the googleapis/gstatic
  // round trips it removed, and a naive search for those hostnames matches the
  // explanation. A guard that fails on its own documentation gets deleted.
  const css = read('src/styles/global.css').replace(/\/\*[\s\S]*?\*\//g, ' ')

  const faces = [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map(m => m[0])
  assert.ok(faces.length >= 2, `expected self-hosted @font-face rules, found ${faces.length}`)
  for (const face of faces) {
    const urls = [...face.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(m => m[1])
    assert.ok(urls.length, 'a @font-face with no src tells us nothing')
    for (const u of urls) {
      assert.ok(u.startsWith('/fonts/'), `@font-face src must be self-hosted, got ${u}`)
      assert.ok(
        fs.existsSync(path.join(ROOT, 'public', u.replace(/^\//, ''))),
        `${u} is declared but not present in public/ — the face would 404`,
      )
    }
  }

  assert.doesNotMatch(css, /@import[^;]*(googleapis|gstatic)/, 'no remote font-catalogue import')
})

// ═══════════════════════════════════════════════════════════════════════════
// THE RENDER-BLOCKING STYLESHEET
// ═══════════════════════════════════════════════════════════════════════════
//
// The other byte budget that regresses silently, and the one that was costing
// the homepage the most. `src/styles/global.css` compiled to a single
// 593,650-byte stylesheet in the <head> of every route, of which the homepage
// used 38,739 bytes — 6.5%. It was split on 2026-09-13 into a critical sheet
// plus src/styles/deferred/*.css, each imported by the lazy chunks that can
// reach it, and the emitted critical sheet went to 281,262 raw / 48,719 gzip.
//
// Two ways that comes back, and this guards both:
//
//   1. RULES GROW BACK INTO global.css. A budget on the emitted file catches
//      it whatever the source looks like.
//   2. A DEFERRED SHEET IS IMPORTED FROM THE ENTRY GRAPH. One
//      `import './styles/deferred/colour.css'` in an eagerly reached module
//      puts 80 KB back in the first request wave, and the file it came from
//      still looks split. So the static import graph from src/main.jsx is
//      walked and must not reach src/styles/deferred at all.
//
// IT MEASURES A REAL BUILD, not the source. The emitted size is what the
// browser pays for, and it is not a function anyone can compute by reading CSS
// — minification, deduplication and the chunk graph all sit in between.
//
// WHERE IT BUILDS: the OS temp directory, process-unique, removed afterwards —
// for the reasons tests/unit/admin-chunk-carries-no-backlog.test.js and
// tests/unit/test-session-not-in-production.test.js record at length. Never
// dist/ (a concurrent `npm run test:users` is being served from it) and never
// anywhere inside the checkout (a build left in tmp/ once turned `npm run lint`
// from 0 errors into 538).
//
// MUTATION-VERIFIED at the call site: `import './styles/deferred/colour.css'`
// added to src/main.jsx — the emitted critical sheet went 281,262 -> 362,148
// raw and 48,719 -> 61,979 gzip, both over budget, and the entry-graph test
// named the import. Restored byte-exact; green again.
import os from 'node:os'
import zlib from 'node:zlib'

// Headroom over the measured 281,262 / 48,719, enough for ordinary work on the
// shell and not enough for a family to come back.
const CRITICAL_CSS_RAW_BUDGET = 300_000
const CRITICAL_CSS_GZIP_BUDGET = 52_000

const outDir = path.join(os.tmpdir(), `uil4b-critical-css-${process.pid}-${Date.now()}`)
let built = null

// ONE cleanup for the whole file, not one per test. Both budget tests share the
// single build above, and a per-test t.after meant the first one to finish
// deleted the directory the second was about to read - which failed as ENOENT
// on a cached path rather than as anything about a byte budget.
after(() => fs.rmSync(outDir, { recursive: true, force: true }))

async function buildOnce() {
  if (built) return built
  const { build: viteBuild } = await import('vite')
  await viteBuild({ root: ROOT, logLevel: 'silent', build: { outDir, emptyOutDir: true } })
  const assets = path.join(outDir, 'assets')
  const files = fs.readdirSync(assets)
  built = { assets, files }
  return built
}

test('the render-blocking stylesheet stays inside its byte budget', async () => {
  const { assets, files } = await buildOnce()

  // Positive controls first. Every assertion below is satisfied for free by a
  // build that emitted nothing, or by a stylesheet that is not the one under
  // test.
  assert.ok(files.filter((f) => f.endsWith('.js')).length > 10, `a real build emits many chunks, found ${files.length} assets`)
  const entrySheets = files.filter((f) => /^index-[\w-]+\.css$/.test(f))
  assert.equal(entrySheets.length, 1, `expected exactly one entry stylesheet, found: ${entrySheets.join(', ')}`)

  const css = fs.readFileSync(path.join(assets, entrySheets[0]), 'utf8')
  // It is the app's sheet: the design tokens and the homepage hero are in it.
  assert.match(css, /--bg-0:/, 'the entry stylesheet carries no design tokens — is this the right file?')
  assert.match(css, /\.home-hero-h1/, 'the entry stylesheet does not style the homepage headline')

  const raw = Buffer.byteLength(css)
  const gzip = zlib.gzipSync(Buffer.from(css), { level: 9 }).length
  assert.ok(
    raw <= CRITICAL_CSS_RAW_BUDGET,
    `the render-blocking stylesheet is ${raw} bytes, over the ${CRITICAL_CSS_RAW_BUDGET}-byte budget. `
    + 'Rules that only one route can reach belong in src/styles/deferred/, imported by that route.',
  )
  assert.ok(
    gzip <= CRITICAL_CSS_GZIP_BUDGET,
    `the render-blocking stylesheet is ${gzip} bytes gzipped, over the ${CRITICAL_CSS_GZIP_BUDGET}-byte budget.`,
  )
})

test('no eagerly loaded module imports a deferred stylesheet', () => {
  // The budget above is a number; this is the shape that keeps it true. A
  // deferred sheet reached by a STATIC import from the entry is in the first
  // request wave no matter which file it is stored in.
  const seen = new Set()
  const offenders = []
  const resolve = (from, spec) => {
    if (!spec.startsWith('.')) return null
    const base = path.posix.join(path.posix.dirname(from), spec)
    for (const cand of [base, `${base}.jsx`, `${base}.js`, `${base}/index.jsx`, `${base}/index.js`]) {
      if (fs.existsSync(path.join(ROOT, cand))) return cand
    }
    return null
  }
  const queue = ['src/main.jsx']
  while (queue.length) {
    const file = queue.shift()
    if (!file || seen.has(file)) continue
    seen.add(file)
    if (!/\.(jsx?)$/.test(file)) continue
    const src = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    for (const m of src.matchAll(/^\s*import\s+(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/gm)) {
      if (/styles\/deferred\//.test(m[1])) offenders.push(`${file} imports ${m[1]}`)
      const next = resolve(file, m[1])
      if (next) queue.push(next)
    }
  }
  // Positive control: the walk reached the app, not just its entry point.
  assert.ok(seen.size > 50, `the import walk only reached ${seen.size} modules — it is not seeing the app`)
  assert.ok(seen.has('src/pages/Home.jsx'), 'the import walk never reached the homepage')
  assert.deepEqual(offenders, [], 'a deferred stylesheet is reachable from the entry chunk by static import')
})

test('the deferred stylesheets exist, are substantial, and are imported by lazy routes', () => {
  const dir = path.join(ROOT, 'src', 'styles', 'deferred')
  const sheets = fs.readdirSync(dir).filter((f) => f.endsWith('.css'))
  assert.ok(sheets.length >= 5, `expected the deferred families, found ${sheets.length}`)
  const pages = fs.readdirSync(path.join(ROOT, 'src', 'pages')).filter((f) => f.endsWith('.jsx'))
  const components = fs.readdirSync(path.join(ROOT, 'src', 'components')).filter((f) => f.endsWith('.jsx'))
  const importers = [
    ...pages.map((f) => read(path.join('src', 'pages', f))),
    ...components.map((f) => read(path.join('src', 'components', f))),
  ].join('\n')
  for (const sheet of sheets) {
    const bytes = fs.statSync(path.join(dir, sheet)).size
    assert.ok(bytes > 5000, `src/styles/deferred/${sheet} is ${bytes} bytes — has it been emptied back into global.css?`)
    assert.ok(
      importers.includes(`styles/deferred/${sheet}`),
      `src/styles/deferred/${sheet} is imported by no page or component, so it ships to nobody`,
    )
  }
})
// ── THE ENTRY JAVASCRIPT, which had no budget at all until 2026-09-15 ───────
//
// The stylesheet above has one and the JavaScript beside it did not, which is
// precisely how src/data/communityPrompts.js came to sit in index-*.js: 20
// prompts, 27,756 bytes of source, in the chunk every visitor downloads on
// every route including /privacy and /terms — to render one card on /discover
// showing a count and three titles.
//
// It got there without anyone deciding to put it there. SurfaceLanding is one
// of the five pages App.jsx loads EAGERLY ("small or always-visited pages"),
// so a single ordinary-looking `import { COMMUNITY_PROMPTS }` at the top of it
// pulled the whole module into the first request wave. Nothing failed. Removing
// it took the entry chunk down 24,618 raw / 9,934 gzip in a test-mode build.
//
// THAT IS THE CLASS THIS GUARDS, not that one module. src/data holds a 999 KB
// backlog, a 38 KB tool tree, a 29 KB search index and a dozen galleries; any
// of them is one eager import away from the same place, and the import will look
// exactly as reasonable as that one did. A number on the emitted chunk catches
// it whatever the source looks like — the same argument the stylesheet budget
// above makes for itself.
//
// PRODUCTION, NOT `--mode test`. The two builds differ a lot here: the same
// commit emits 195,213 raw in test mode and 421,071 in production, because the
// test build swaps in the session double and chunks differently. The budget has
// to be set on the bytes that actually ship, and buildOnce() above is already a
// production build.
//
// Headroom is deliberately tight — about 4.5% on each — because the regression
// being guarded is roughly 10 KB gzipped and a generous budget would not see
// it. Ordinary work on the shell fits; a data module does not.
const ENTRY_JS_RAW_BUDGET = 440_000
const ENTRY_JS_GZIP_BUDGET = 133_000

test('the entry JavaScript stays inside its byte budget', async () => {
  const { assets, files } = await buildOnce()

  // Positive controls, for the same reason the stylesheet test carries them: a
  // build that emitted nothing satisfies every size assertion for free.
  const entries = files.filter((f) => /^index-[\w-]+\.js$/.test(f))
  assert.equal(entries.length, 1, `expected exactly one entry chunk, found: ${entries.join(', ')}`)

  const js = fs.readFileSync(path.join(assets, entries[0]))
  assert.ok(js.length > 50_000,
    `the entry chunk is only ${js.length} bytes — that is not this app, and every budget `
    + 'assertion below would pass on it')

  const raw = js.length
  const gzip = zlib.gzipSync(js, { level: 9 }).length
  assert.ok(
    raw <= ENTRY_JS_RAW_BUDGET,
    `the entry chunk is ${raw} bytes, over the ${ENTRY_JS_RAW_BUDGET}-byte budget. Something `
    + 'eagerly reached from src/main.jsx grew — most often a data module imported by one of '
    + 'the five pages App.jsx loads statically. Import the three facts you need, not the array.',
  )
  assert.ok(
    gzip <= ENTRY_JS_GZIP_BUDGET,
    `the entry chunk is ${gzip} bytes gzipped, over the ${ENTRY_JS_GZIP_BUDGET}-byte budget.`,
  )
})

test('no eagerly loaded module imports a bulk data table', () => {
  // The budget above is a number; this is the shape that keeps it true, and it
  // is the JavaScript twin of the deferred-stylesheet walk below. A module in
  // src/data over a size threshold has no business in the first request wave,
  // and naming the offending import is far more useful than a byte count when
  // the build goes over.
  //
  // The threshold is on the SOURCE file because that is what a reviewer edits.
  // communityPrompts.js at 27.7 KB was the case that prompted this; the
  // allowlist below is what the shell legitimately needs.
  const BULK_BYTES = 20_000

  // Modules the app shell genuinely needs on every route, each with its reason.
  // Adding to this list is a decision, which is the point of it being here.
  const ALLOWED = new Map([
    // The nav renders its own search field, mega menus and category pills on
    // every route; the index is what fills them.
    ['src/data/toolIndex.js', 'the nav search and mega menus need it on every route'],
    // The route tree itself — it decides what renders at all.
    ['src/data/toolTree.js', 'the router and the nav are built from it'],
  ])

  const dataDir = path.join(ROOT, 'src', 'data')
  const bulk = new Set(
    fs.readdirSync(dataDir)
      .filter((f) => f.endsWith('.js'))
      .filter((f) => fs.statSync(path.join(dataDir, f)).size > BULK_BYTES)
      .map((f) => `src/data/${f}`),
  )
  // POSITIVE CONTROL: if nothing is over the threshold the walk below cannot
  // find anything, and the test would be green on an app that imports the lot.
  assert.ok(bulk.size >= 3,
    `only ${bulk.size} modules in src/data are over ${BULK_BYTES} bytes, so this test is `
    + 'guarding almost nothing — has the threshold drifted past the data?')

  const seen = new Set()
  const offenders = []
  const resolve = (from, spec) => {
    if (!spec.startsWith('.')) return null
    const base = path.posix.join(path.posix.dirname(from), spec)
    for (const cand of [base, `${base}.jsx`, `${base}.js`, `${base}/index.jsx`, `${base}/index.js`]) {
      if (fs.existsSync(path.join(ROOT, cand))) return cand
    }
    return null
  }
  const queue = ['src/main.jsx']
  while (queue.length) {
    const file = queue.shift()
    if (!file || seen.has(file)) continue
    seen.add(file)
    if (!/\.(jsx?)$/.test(file)) continue
    // Comments quote imports they are explaining — communityPromptsPreview.js
    // names the import it exists to avoid — so a raw scan finds the prose.
    const src = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    // STATIC imports only. `import(...)` is a lazy chunk and is the fix, not
    // the defect, so the pattern requires `from` on the same statement.
    const re = /import\s+[^;]*?from\s*['"]([^'"]+)['"]/g
    let m
    while ((m = re.exec(src)) !== null) {
      const next = resolve(file, m[1])
      if (!next) continue
      if (bulk.has(next) && !ALLOWED.has(next)) {
        offenders.push(`${file} statically imports ${next} (`
          + `${fs.statSync(path.join(ROOT, next)).size} bytes)`)
      }
      queue.push(next)
    }
  }

  assert.ok(seen.size > 50, `the import walk only reached ${seen.size} modules — it is not seeing the app`)
  assert.deepEqual(offenders, [],
    'a bulk data module is reachable from the entry chunk by static import, so every visitor '
    + 'downloads it on every route. Either import only the values needed (see '
    + 'src/data/communityPromptsPreview.js), load the page lazily, or add it to ALLOWED above '
    + 'with the reason it belongs in the shell.')
})
