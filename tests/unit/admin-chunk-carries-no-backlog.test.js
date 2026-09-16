// NO INTERNAL BOARD MAY BE IN ANYTHING THIS APP SERVES.
//
// Two modules under src/data/ describe the PROJECT rather than the product:
//
//   src/data/pipeline.js     the engineering backlog — 185 rows whose `note`
//                            fields are long, candid prose written for us.
//   src/data/moduleBoard.js  the module status board — 20 entries carrying
//                            `summary`, `recentChanges`, `nextSteps`, `health`
//                            and dated owner actions per module.
//
// Both were client modules, so both were served to anyone who asked.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE USED TO CHECK, AND WHY THAT WAS THE WRONG PROPERTY — TWICE
// ═══════════════════════════════════════════════════════════════════════════
//
// ── THE FIRST WRONG AXIS: WHEN, NOT WHO ────────────────────────────────────
// #405 and #406 filed the backlog as a WEIGHT problem: a static import from
// Admin.jsx put all of it inside Admin-*.js, 776,482 bytes raw / 287,073 gzip,
// fetched and parsed before the Admin route could render. #420 answered with
// `import('../data/pipeline')`, and this file was written to hold that down. It
// walked the chunk graph and asserted:
//
//     the Admin chunk reaches src/data/pipeline.js by NO STATIC EDGE,
//     and (as its control) reaches it by SOME DYNAMIC EDGE.
//
// Both halves were true, the four tests were green, and the following was
// simultaneously true of the exact build they passed on — anonymous, no login,
// no cookie, no Authorization header:
//
//     GET /admin                  200   the HTML names the entry chunk
//     GET /assets/index-*.js      200   names Admin-rjGyizH8.js
//     GET /assets/Admin-*.js      200   names pipeline-DUbq1XL3.js
//     GET /assets/pipeline-*.js   200   824,007 bytes / 319,711 gzip
//
// The last file contained the literal string `allow create: if true` — the
// feedback rule that #472 has since closed in firestore.rules. The guard's own
// CONTROL was asserting the leak was present. Static
// edge or dynamic edge decides WHEN a browser fetches the bytes and has nothing
// to say about WHO may fetch them; a static asset is served to everybody.
//
// ── THE SECOND WRONG AXIS: ONE FILE, NOT A CLASS ───────────────────────────
// The rewrite scanned every emitted file for text taken from pipeline.js, and
// it was green on a build whose dist/assets/Admin-*.js carried this, verbatim
// and fetchable with no auth:
//
//     nextSteps: ["Owner: verify aggregate analytics and Feedback reads after
//     the published Firestore rules", "Do not assume the admin custom claim
//     exists; resolve any permission-denied result explicitly", ...]
//
// src/data/moduleBoard.js — a SECOND internal board, a plain static import, so
// its 20,332 bytes were inlined into the Admin chunk rather than given one of
// their own. A guard that names its subject can only ever find its subject, and
// naming `pipeline.js` was itself the bug. A third board will be written one
// day.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT IT CHECKS NOW
// ═══════════════════════════════════════════════════════════════════════════
//
//     NO FILE IN THE BUILD OUTPUT CONTAINS ANY TEXT FROM ANY INTERNAL BOARD,
//     AND "INTERNAL BOARD" IS DERIVED FROM src/data/ RATHER THAN LISTED.
//
// Every module under src/data/ is imported and classified BY SHAPE: each
// exported array-of-objects scores one point per project-status field it
// carries (see INTERNAL_MARKERS). A module scoring three or more is an internal
// board, and every row of every array it exports becomes a needle.
//
// THE THRESHOLD IS A MEASURED GAP, NOT A GUESS. Scored across all 30 importable
// modules in src/data/ on 2026-09-11:
//
//     moduleBoard.js  MODULE_BOARD        7   nextSteps recentChanges health
//                                             status area summary updated
//     pipeline.js     NEXT_TODO           5   note priority effort status area
//     pipeline.js     PIPELINE_PROCESSES  5   progress stage area summary updated
//     learnIndex.js   LEARN_ARTICLES      1   updated
//     pipeline.js     APP_CONDITION       1   status
//     everything else                     0
//
// Nothing scores 2, 3 or 4. The band is empty, and a test below ASSERTS it is
// still empty — so product data drifting towards the threshold is a loud
// failure rather than a near miss nobody sees.
//
// A module the detector finds that is not declared below FAILS THE BUILD with
// instructions, rather than being covered silently or missed silently. That is
// the property the second miss cost: coverage that extends itself, or says it
// cannot.
//
// ── src/data/fontRealWorldUses.js, RECORDED SO IT IS NOT REDISCOVERED ──────
// It matches a "data module reaching the client" grep and it is NOT an internal
// board. It is product content: the per-family slot for photographs of real
// work, rendered by components/FontDossier.jsx on the public Font Gallery. It
// ships DELIBERATELY EMPTY — the founder's own call, 2026-09-05 — and what it
// contains is the SHAPE of an entry plus `isShowable`, the rule that refuses a
// row which cannot name its image, credit, source and licence. It scores 0: no
// status, no owner action, nothing about this project's condition. The general
// distinction, which is the thing worth keeping: A MODULE THAT DESCRIBES THE
// PRODUCT SHIPS; A MODULE THAT DESCRIBES THE PROJECT DOES NOT.
//
// The boards still work: PipelineBoard and ModuleBoard both read
// GET /api/ai?backlog=1 through useInternalBoards(), gated on a verified
// administrator by requireAdmin() in api/_lib/admin.js. That is asserted below
// too — otherwise "no board data in the build" is also what deleting both tabs
// looks like.
//
// ── THE POSITIVE CONTROLS ──────────────────────────────────────────────────
//
// "Nothing found" is what a broken build, an empty output directory, a bad
// needle extractor and a scanner that reads no files all look like. So, before
// any absence is asserted:
//
//   1. THE CLASSIFIER IS PROVEN TO SEE BOTH KNOWN BOARDS, and to see nothing
//      else — in both directions, so it can neither go blind nor swallow the
//      whole of src/data/.
//   2. THE SCANNER IS PROVEN TO WORK, by pointing it at each board's own source
//      and requiring it to find every needle from that board. A needle that no
//      longer matches anything — because minification escaped a character, say
//      — would otherwise make every assertion below pass for free.
//   3. THE BUILD IS PROVEN REAL: more than ten chunks, an Admin-*.js that
//      contains the dashboard's own marker.
//   4. THE BOARDS ARE PROVEN TO STILL HAVE A SOURCE: the client asks the route
//      for both, and the route is behind the admin gate.
//
// ── WHERE IT BUILDS ────────────────────────────────────────────────────────
//
// Not dist/: `vite build` empties it while `vite preview` serves it, so a build
// from a unit test would delete the bundle a concurrent `npm run test:users` is
// being served from. Not anywhere else in the checkout either — see
// tests/unit/test-session-not-in-production.test.js for the 538 lint errors a
// build left in tmp/. The OS temp directory, process-unique so two agents
// running the suite at once cannot collide, removed afterwards.
//
// MUTATION-VERIFIED at the call site, each restored byte-exact:
//   · `import('../data/pipeline')` restored in Admin.jsx  -> red, naming
//     assets/pipeline-*.js and the rows it carries; all controls green.
//   · `import { MODULE_BOARD } from '../data/moduleBoard'` restored -> red,
//     naming assets/Admin-*.js — the leak the previous version of this file was
//     green on; all controls green.
//   · MODULE_BOARD dropped from the /api/ai?backlog=1 payload -> the
//     still-has-a-source control red, which is the half that stops this file
//     being satisfied by deleting the founder's board.
//
// ═══════════════════════════════════════════════════════════════════════════
// SINCE 2026-09-16 THE BOARDS ARE NOT IN EVERY CHECKOUT, AND THAT IS HANDLED
// EXPLICITLY RATHER THAN QUIETLY
// ═══════════════════════════════════════════════════════════════════════════
//
// The repository went public for free GitHub Actions minutes, so the founder
// took both modules out of it and kept them on his own machine; .gitignore
// carries the decision, its date and its cost.
//
// EVERY NEEDLE IN THIS FILE IS DERIVED FROM THOSE MODULES. With them absent the
// classifier finds no internal boards, the extractor produces no needles, and
// "no file in the build output carries any internal board text" becomes true of
// a search for nothing — a green line asserting the absence of an empty set.
// That is the precise failure this file was rewritten twice to stop, so where a
// test cannot be run it is SKIPPED WITH A REASON and says so in the output.
//
// WHAT STILL RUNS WITH THEM ABSENT, and it is not nothing: the threshold band,
// the "every module is classified or declared unreadable" sweep, the build
// being real, the Admin chunk's size ceiling, and — the load-bearing one — the
// control that the founder still HAS both boards, which reads Admin.jsx and
// api/ai.js as source and needs no data at all. A src/ module importing an
// absent board would also fail `vite build` outright in the build control
// below, so the graph-level statement is not lost either, only relocated.
//
// ON THE FOUNDER'S OWN CHECKOUT NOTHING ABOUT THIS FILE CHANGES: the files are
// there, every skip is off, and the guarantee is exactly the one it was.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, 'src', 'data')

// Something only the Admin dashboard has, so a found chunk can be shown to be
// the real one rather than a stub.
const ADMIN_MARKER = 'uil4b-dev-2026'

const outDir = path.join(os.tmpdir(), `uil4b-admin-chunk-${process.pid}-${Date.now()}`)

// ═══════════════════════════════════════════════════════════════════════════
// THE CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════════

// Fields that describe the STATE OF WORK rather than a thing the product shows.
// A product row has a name and a value; a board row has a status, an owner and
// what is left to do.
const INTERNAL_MARKERS = [
  'note', 'nextSteps', 'recentChanges', 'health', 'priority', 'effort',
  'progress', 'stage', 'blockers', 'owner', 'status', 'area', 'summary', 'updated',
]
const INTERNAL_THRESHOLD = 3

// The boards this change knows about. The detector must find exactly these.
const DECLARED_INTERNAL = ['moduleBoard.js', 'pipeline.js']

// ...unless they are not in this checkout at all. Local-only since 2026-09-16 —
// see the block at the top of this file. Any of them missing is enough: a run
// that could see one board and not the other would report partial coverage as
// full, so the skip is all-or-nothing and names what it could not find.
const ABSENT_BOARDS = DECLARED_INTERNAL.filter((rel) => !fs.existsSync(path.join(DATA_DIR, rel)))
const NO_BOARDS = ABSENT_BOARDS.length > 0
  && `the internal boards are not in this checkout (missing: ${ABSENT_BOARDS.map((r) => `src/data/${r}`).join(', ')}). `
  + 'They are local-only, by the founder decision of 2026-09-16 recorded in .gitignore. Every needle '
  + 'in this test is derived from their rows, so with them gone this would search the build output '
  + 'for nothing and pass — which is the exact shape of the two misses this file was rewritten for. '
  + 'Run it on a checkout that has them to get the guarantee.'

// Modules the classifier cannot import, with the reason. `.jsx` is a blanket
// rule rather than nine filenames — Node cannot load JSX without a transform,
// and a JSX module is a component file, not a data board. Anything ELSE that
// fails to import is a hole in the coverage and fails below by name.
const UNREADABLE_EXCEPTIONS = {
  'emojiIndexLoader.js': 'imports emojiIndex.txt, which only Vite can resolve — it is an emoji search index, product content',
}

/** Every module file under src/data/, recursively, relative to src/data. */
function dataModules() {
  const out = []
  ;(function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(p); continue }
      if (/\.jsx?$/.test(entry.name)) out.push(path.relative(DATA_DIR, p).replace(/\\/g, '/'))
    }
  })(DATA_DIR)
  return out.sort()
}

/** Highest internal-marker score across a module's exported arrays of objects. */
function scoreExports(mod) {
  let best = 0
  const rows = []
  for (const value of Object.values(mod)) {
    if (!Array.isArray(value) || !value.length) continue
    const objs = value.filter((v) => v && typeof v === 'object' && !Array.isArray(v))
    if (!objs.length) continue
    const fields = new Set()
    for (const o of objs) for (const k of Object.keys(o)) fields.add(k)
    const score = INTERNAL_MARKERS.filter((m) => fields.has(m)).length
    if (score > best) best = score
    rows.push(...objs)
  }
  return { score: best, rows }
}

let classified = null
async function classify() {
  if (classified) return classified
  const internal = [], product = [], unreadable = [], scores = {}
  for (const rel of dataModules()) {
    if (rel.endsWith('.jsx')) continue // see UNREADABLE_EXCEPTIONS
    let mod
    try {
      mod = await import('file://' + path.join(DATA_DIR, rel).replace(/\\/g, '/'))
    } catch (err) {
      unreadable.push({ rel, why: String(err?.message || err).slice(0, 90) })
      continue
    }
    const { score, rows } = scoreExports(mod)
    scores[rel] = score
    ;(score >= INTERNAL_THRESHOLD ? internal : product).push({ rel, score, rows })
  }
  classified = { internal, product, unreadable, scores }
  return classified
}

// ═══════════════════════════════════════════════════════════════════════════
// THE NEEDLES
// ═══════════════════════════════════════════════════════════════════════════
//
// Taken from the data at test time, never typed here: a hand-written list would
// go stale the moment a row was edited, and a stale needle finds nothing, which
// reads as "clean".
//
// Printable ASCII 0x20-0x7E, minus " (0x22), $ (0x24), ' (0x27), \ (0x5C) and
// ` (0x60). Written as ranges rather than a negated class because a negated one
// has to name the control characters, and `no-control-regex` fails the lint.
// Those five are excluded because they are ESCAPED inside a JavaScript string
// literal, so a needle spanning "the founder's request" would match the runtime
// value and neither the source nor the emitted chunk — the CONTROL below caught
// exactly that, twice, and it is the difference between a scan and the
// appearance of one. Long, because a short phrase would collide with ordinary
// UI copy and fail for the wrong reason.
const ASCII_RUN = /[\x20-\x21\x23\x25-\x26\x28-\x5B\x5D-\x5F\x61-\x7E]{48,}/
const needleFor = (text) => {
  const m = ASCII_RUN.exec(String(text))
  return m ? m[0].slice(0, 64) : null
}

/** Needles from one classified module's rows, including inside string arrays. */
function needlesFrom({ rel, rows }) {
  const out = []
  for (const row of rows) {
    for (const [field, value] of Object.entries(row)) {
      const texts = typeof value === 'string' ? [value]
        : Array.isArray(value) ? value.filter((v) => typeof v === 'string') : []
      for (const text of texts) {
        const needle = needleFor(text)
        if (needle) out.push({ module: rel, id: row.id || row.name || '(unnamed)', field, needle })
      }
    }
  }
  return out
}

let allNeedles = null
async function needles() {
  if (allNeedles) return allNeedles
  const { internal } = await classify()
  allNeedles = internal.flatMap(needlesFrom)
  return allNeedles
}

// ═══════════════════════════════════════════════════════════════════════════
// THE BUILD
// ═══════════════════════════════════════════════════════════════════════════

let built = null
async function build() {
  if (built) return built
  const { build: viteBuild } = await import('vite')
  const result = await viteBuild({
    root: ROOT,
    logLevel: 'silent',
    build: { outDir, emptyOutDir: true },
  })
  const output = (Array.isArray(result) ? result[0] : result).output
  const chunks = output.filter((o) => o.type === 'chunk')

  // Read from DISK, not from the rollup output. The output object lists what
  // the bundler generated; the directory is what gets uploaded — it also holds
  // everything copied verbatim out of public/, which the output object never
  // mentions and which is served from the same origin with the same absence of
  // auth. latin1 so a font or an image is bytes rather than a decode error.
  const files = []
  ;(function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(p); continue }
      files.push({ name: path.relative(outDir, p).replace(/\\/g, '/'), text: fs.readFileSync(p, 'latin1') })
    }
  })(outDir)

  built = { chunks, files }
  return built
}

test.after(() => {
  try { fs.rmSync(outDir, { recursive: true, force: true }) } catch { /* best effort */ }
})

const adminChunk = (all) => all.find((c) => /(^|\/)Admin-[^/]+\.js$/.test(c.fileName))

// ═══════════════════════════════════════════════════════════════════════════
// THE CONTROLS
// ═══════════════════════════════════════════════════════════════════════════

test('CONTROL: the classifier finds every internal board in src/data, and nothing else', { skip: NO_BOARDS }, async () => {
  const { internal, product, scores } = await classify()
  const found = internal.map((m) => m.rel).sort()

  assert.ok(product.length > 15,
    `the classifier read only ${product.length} product modules — it is not reading src/data at all, `
    + 'so "found exactly the two boards" would be true of a walk that found nothing.')

  assert.deepEqual(found, DECLARED_INTERNAL,
    'the set of internal boards under src/data/ is not what this file was written against.\n'
    + `  found:    ${found.join(', ') || '(none)'}\n`
    + `  declared: ${DECLARED_INTERNAL.join(', ')}\n`
    + 'If a NEW module appeared: it exports rows carrying project-status fields, which means it '
    + 'describes the project rather than the product, which means it must NOT ship to the browser. '
    + 'Route it through GET /api/ai?backlog=1 with the other two and add it to DECLARED_INTERNAL. '
    + 'If one DISAPPEARED from the list, say why here rather than deleting the line — a board that '
    + 'stopped scoring is a board this file stopped protecting.\n'
    + `  scores: ${Object.entries(scores).filter(([, s]) => s > 0).map(([k, s]) => `${k}=${s}`).join(' ')}`)
})

test('CONTROL: the threshold still sits in an empty band', async () => {
  // Product data scored 0 or 1 and the boards scored 5 and 7 when this was
  // written. If something legitimate ever scores 2, the gap this classifier
  // relies on has closed and the threshold needs re-deciding by a person —
  // loudly, here, rather than quietly by a near miss.
  const { product } = await classify()
  const creeping = product.filter((m) => m.score >= INTERNAL_THRESHOLD - 1).map((m) => `${m.rel}=${m.score}`)
  assert.deepEqual(creeping, [],
    `these product modules are within one point of being classified as internal boards: ${creeping.join(', ')}. `
    + 'The band between product data (0-1) and an internal board (5+) is no longer empty, so '
    + `INTERNAL_THRESHOLD=${INTERNAL_THRESHOLD} is now a judgement call rather than a measurement. `
    + 'Decide which side each of these is on and say so in this file.')
})

test('CONTROL: every module under src/data is either classified or declared unreadable', async () => {
  // Without this, a module that threw on import would be silently uncovered —
  // which is exactly how a second board gets missed.
  const { unreadable } = await classify()
  const unexpected = unreadable.filter((u) => !UNREADABLE_EXCEPTIONS[u.rel])
  assert.deepEqual(unexpected.map((u) => `${u.rel}: ${u.why}`), [],
    'these modules under src/data/ could not be imported, so the classifier cannot tell whether they '
    + 'are internal boards. Either fix the import or add them to UNREADABLE_EXCEPTIONS with a reason.')

  const stale = Object.keys(UNREADABLE_EXCEPTIONS).filter((rel) => !unreadable.some((u) => u.rel === rel))
  assert.deepEqual(stale, [],
    `these modules are excused from classification but import fine now: ${stale.join(', ')}. `
    + 'Remove the exception so they are actually classified.')
})

test('CONTROL: the scanner finds every needle in the file its needles came from', { skip: NO_BOARDS }, async () => {
  const { internal } = await classify()
  const found = await needles()

  assert.ok(found.length > 150,
    `only ${found.length} needles were extracted from the internal boards — the extractor is not `
    + 'reading the rows, so the searches below are searching for almost nothing.')

  for (const board of internal) {
    const mine = found.filter((n) => n.module === board.rel)
    assert.ok(mine.length > 10, `only ${mine.length} needles came from ${board.rel}, so it is barely covered`)
    const source = fs.readFileSync(path.join(DATA_DIR, board.rel), 'latin1')
    const missing = mine.filter((n) => !source.includes(n.needle))
    assert.deepEqual(missing.map((n) => `${n.id}.${n.field}`), [],
      `a needle taken out of src/data/${board.rel} cannot be found in src/data/${board.rel}, so the `
      + 'scanner does not work and an absence in the build output means nothing.')
  }
})

test('CONTROL: the build is real, and the Admin dashboard is in it', async () => {
  const { chunks, files } = await build()
  assert.ok(chunks.length > 10, `the build emitted only ${chunks.length} chunks — this is not a real bundle`)
  assert.ok(files.length > 50, `the output directory holds only ${files.length} files — nothing was really built`)

  const admin = adminChunk(chunks)
  assert.ok(admin, 'no Admin-*.js chunk was emitted, so nothing below measures the Admin route')
  assert.ok(admin.code.includes(ADMIN_MARKER),
    'the Admin chunk was found but does not contain the dashboard, so it is not the chunk this test means')
})

test('CONTROL: the founder still has both boards, and they are behind the admin gate', () => {
  // "No board data in the build" is ALSO what deleting the Pipeline and Board
  // tabs looks like. These reads are what stop this file being satisfied by the
  // boards simply ceasing to exist.
  const admin = fs.readFileSync(path.join(ROOT, 'src/pages/Admin.jsx'), 'utf8')
  assert.match(admin, /\/api\/ai\?backlog=1/,
    'src/pages/Admin.jsx no longer asks for the boards anywhere, so the founder\'s Pipeline and Board '
    + 'tabs have no source of data at all and the assertions below are passing on a deleted feature.')
  assert.match(admin, /boards\?\.MODULE_BOARD/,
    'the Board tab no longer reads MODULE_BOARD out of the fetched payload, so it renders nothing.')

  const route = fs.readFileSync(path.join(ROOT, 'api/ai.js'), 'utf8')
  assert.match(route, /'backlog' in \(req\.query \|\| \{\}\)/,
    'api/ai.js does not answer ?backlog=1, so the boards the client asks for do not exist.')
  assert.match(route, /async function serveBacklog[\s\S]*?requireAdmin\(req\)/,
    'serveBacklog() in api/ai.js does not call requireAdmin() before it reads the boards — they '
    + 'would be served to anyone who asked, which is the disclosure this file exists for, moved '
    + 'from a static asset to an endpoint.')
  // Both boards, by name, in the payload — a route that quietly stopped
  // returning one would leave that tab empty with everything else green.
  for (const name of ['APP_CONDITION', 'PIPELINE_STAGES', 'PIPELINE_PROCESSES', 'NEXT_TODO', 'MODULE_BOARD']) {
    assert.match(route, new RegExp(`${name}:`),
      `serveBacklog() does not return ${name}, so the tab that renders it shows nothing.`)
  }

  // ── AND THAT A DEPLOYMENT WITHOUT THE MODULES SAYS SO ────────────────────
  // This runs even where the boards themselves are absent, and it is the half
  // that keeps this file honest there. The most convenient way to make every
  // skip above disappear is to answer 200 with `NEXT_TODO: []` — every test in
  // this file would go green while the founder's own board read "Next to do
  // (0)", which is a claim that the work is finished.
  assert.match(route, /ERR_MODULE_NOT_FOUND/,
    'api/ai.js no longer tells "the boards are not in this deployment" apart from a real failure. '
    + 'Since 2026-09-16 the two modules are local-only, so in production the imports throw — and '
    + 'the only two honest answers are the one it gives (501 + localOnly) or a 500. An empty '
    + 'backlog is not one of them.')
  assert.match(route, /localOnly: true/,
    'serveBacklog() does not answer with `localOnly`, which is the flag both Admin tabs branch on '
    + 'to print a sentence instead of an empty board.')
  assert.match(admin, /res\.status === 501 && data\.localOnly/,
    'Admin.jsx no longer recognises the not-deployed answer, so it falls through to the generic '
    + '"could not load" path and tells the founder to check he is signed in — for a state that has '
    + 'nothing to do with his session.')
  assert.match(admin, /function BoardGate\([^)]*localOnly[^)]*\)/,
    'BoardGate no longer takes the not-deployed state, so it cannot render it as its own sentence '
    + 'and the two tabs either spin forever or report a fault that is not there.')
  assert.equal((admin.match(/localOnly=\{localOnly\}/g) || []).length, 2,
    'the not-deployed state is passed to BoardGate by fewer than both tabs. PipelineBoard and '
    + 'ModuleBoard read one payload and must degrade the same way — the module board was the one '
    + 'the first pass missed, and it is the one a second pass will miss again.')
})

// ═══════════════════════════════════════════════════════════════════════════
// THE ASSERTIONS
// ═══════════════════════════════════════════════════════════════════════════

test('THE ONE THAT MATTERS: no file in the build output carries any internal board text', { skip: NO_BOARDS }, async () => {
  const { files } = await build()
  const all = await needles()

  const leaks = []
  for (const file of files) {
    const hits = all.filter((n) => file.text.includes(n.needle))
    if (hits.length) {
      const boards = [...new Set(hits.map((h) => h.module))].join(', ')
      leaks.push(`${file.name} (${file.text.length} bytes) carries ${hits.length} rows from ${boards}, e.g. ${hits[0].id}.${hits[0].field}`)
    }
  }

  assert.deepEqual(leaks, [],
    'an internal board is in the build output, which means it is served to anyone who asks — no '
    + 'login, no cookie, no Authorization header. These modules hold permission-denied diagnostics, '
    + 'unshipped plans, security findings, per-module health and instructions addressed to the '
    + 'owner, including the literal text of an unfixed Firestore rule. They must not be client '
    + 'modules at ALL: not a static import, not a dynamic one. Admin.jsx reads them from '
    + 'GET /api/ai?backlog=1 through useInternalBoards(); if you need the data in the browser, add '
    + 'it to that response.')
})

test('and the bundler was never even told about them', { skip: NO_BOARDS }, async () => {
  // The graph-level statement of the same fact, kept because it names the cause
  // rather than the symptom: a module id is the thing a person greps for when
  // the assertion above goes red and they need to know WHO imported it.
  const { chunks } = await build()
  const { internal } = await classify()
  const ids = internal.map((m) => ({ rel: m.rel, re: new RegExp(`[/\\\\]src[/\\\\]data[/\\\\]${m.rel.replace(/\./g, '\\.')}$`) }))

  const carriers = []
  for (const chunk of chunks) {
    for (const { rel, re } of ids) {
      if ((chunk.moduleIds || []).some((id) => re.test(id))) carriers.push(`${chunk.fileName} (${chunk.code.length} bytes) <- ${rel}`)
    }
  }
  assert.deepEqual(carriers, [],
    'an internal board is in the client module graph. Something under src/ imports it — statically '
    + 'or with import(). Either edge ships it to every visitor; #420 removed only the static edge '
    + 'from pipeline.js and the notes stayed public for it, and moduleBoard.js was a static import '
    + 'nobody had looked at. Find the importer and route it through GET /api/ai?backlog=1 instead.')
})

test('the Admin chunk is back to a size a dashboard justifies', async () => {
  // Not a byte-exact pin, which would fail on any honest change to the panel.
  // A ceiling at roughly twice today's size, so a second large module imported
  // eagerly is caught even though it is not a board and the walk above would
  // say nothing about it. It was 776,482 bytes when this was filed.
  const admin = adminChunk((await build()).chunks)
  assert.ok(admin.code.length < 250_000,
    `the Admin chunk is ${admin.code.length} bytes. It was 776,482 when `
    + '[admin-chunk-is-the-backlog] was filed and 113,900 when it was closed. Something large is '
    + 'being imported eagerly again — find it before raising this ceiling.')
})
