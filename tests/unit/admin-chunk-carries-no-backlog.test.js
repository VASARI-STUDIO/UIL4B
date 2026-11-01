// NO INTERNAL BOARD MAY BE IN ANYTHING THIS APP SERVES.
//
// Two modules under src/data/ describe the project rather than the product:
//
//   src/data/pipeline.js     the engineering backlog, with long free-text `note`
//                            fields.
//   src/data/moduleBoard.js  the module status board: per module, `summary`,
//                            `recentChanges`, `nextSteps`, `health` and owner
//                            actions.
//
// A static asset is served to everybody, so a board imported by client code is
// readable without logging in. Whether the import is static or dynamic decides
// WHEN a browser fetches the bytes and says nothing about WHO may fetch them, so
// this file looks at what is in the build output, not at how it got there. It
// also never names a board as its subject: a guard that names one file can only
// ever find that file, so "internal board" is DERIVED from src/data/ rather
// than listed.
//
// WHAT IT CHECKS
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
// modules in src/data/:
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
// still empty, so product data drifting towards the threshold is a loud
// failure rather than a near miss nobody sees.
//
// A module the detector finds that is not declared below FAILS THE BUILD with
// instructions, rather than being covered silently or missed silently:
// coverage that extends itself, or says it cannot.
//
// ── src/data/fontRealWorldUses.js IS NOT AN INTERNAL BOARD ─────────────────
// It matches a "data module reaching the client" grep, but it is product
// content: the per-family slot for photographs of real work, rendered by
// components/FontDossier.jsx on the public Font Gallery. It ships empty, and
// what it contains is the SHAPE of an entry plus `isShowable`, the rule that
// refuses a row which cannot name its image, credit, source and licence. It
// scores 0: no status, no owner action, nothing about the project's condition.
// The general distinction: A MODULE THAT DESCRIBES THE PRODUCT SHIPS; A MODULE
// THAT DESCRIBES THE PROJECT DOES NOT.
//
// ── THE DASHBOARD HAS NO PATH TO THE BOARDS ────────────────────────────────
//
// "No board data in the build" is also exactly what deleting the Pipeline tab
// looks like, so the Admin page is checked directly: it must not request
// GET /api/ai?backlog=1, read a board's exports, or import a board module. No
// code path from that page reaches the boards, so the absence measured in the
// build output is structural.
//
// The SERVER half is asserted too. api/ai.js still answers ?backlog=1 behind
// requireAdmin(), and nothing in the browser calls it, so nothing in the
// browser would notice that route losing its gate.
//
// ── THE POSITIVE CONTROLS ──────────────────────────────────────────────────
//
// "Nothing found" is what a broken build, an empty output directory, a bad
// needle extractor and a scanner that reads no files all look like. So, before
// any absence is asserted:
//
//   1. THE CLASSIFIER IS PROVEN TO SEE BOTH KNOWN BOARDS, and to see nothing
//      else, in both directions, so it can neither go blind nor swallow the
//      whole of src/data/.
//   2. THE SCANNER IS PROVEN TO WORK, by pointing it at each board's own source
//      and requiring it to find every needle from that board. A needle that no
//      longer matches anything (minification escaped a character, say) would
//      otherwise make every assertion below pass for free.
//   3. THE BUILD IS PROVEN REAL: more than ten chunks, an Admin-*.js that
//      contains the dashboard's own marker.
//   4. THE ROUTE IS PROVEN TO STILL BE GATED, and the dashboard is proven to
//      have no path to it.
//
// ── WHERE IT BUILDS ────────────────────────────────────────────────────────
//
// Not dist/: `vite build` empties it while `vite preview` serves it, so a build
// from a unit test would delete the bundle a concurrent `npm run test:users` is
// being served from. Not anywhere else in the checkout either; see
// tests/unit/test-session-not-in-production.test.js for the lint errors a
// build left in tmp/. The OS temp directory, process-unique so two runs of the
// suite at once cannot collide, removed afterwards.
//
// ── THE BOARDS ARE NOT IN EVERY CHECKOUT ───────────────────────────────────
//
// Both modules are kept out of the public repository (.gitignore says so), so
// a clone does not have them.
//
// EVERY NEEDLE IN THIS FILE IS DERIVED FROM THOSE MODULES. With them absent the
// classifier finds no internal boards, the extractor produces no needles, and
// "no file in the build output carries any internal board text" becomes true of
// a search for nothing. So where a test cannot be run it is SKIPPED WITH A
// REASON, and says so in the output.
//
// What still runs with them absent: the threshold band, the "every module is
// classified or declared unreadable" sweep, the build being real, the Admin
// chunk's size ceiling, and the controls that read Admin.jsx and api/ai.js as
// source, which need no data. A src/ module importing an absent board would
// also fail `vite build` outright in the build control below.
//
// On a checkout that has the files every skip is off and the full check runs.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, 'src', 'data')

// Something only the Admin dashboard has, so a found chunk can be shown to be
// the real one rather than a stub. This was the admin unlock code until that
// was removed from the bundle; the lock screen's heading is just
// as unique to the page and is not a secret.
const ADMIN_MARKER = 'Developer Dashboard'

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

// ...unless they are not in this checkout at all (see the block at the top of
// this file). Any of them missing is enough: a run
// that could see one board and not the other would report partial coverage as
// full, so the skip is all-or-nothing and names what it could not find.
const ABSENT_BOARDS = DECLARED_INTERNAL.filter((rel) => !fs.existsSync(path.join(DATA_DIR, rel)))
const NO_BOARDS = ABSENT_BOARDS.length > 0
  && `the internal boards are not in this checkout (missing: ${ABSENT_BOARDS.map((r) => `src/data/${r}`).join(', ')}). `
  + 'They are kept out of the public repository (see .gitignore). Every needle '
  + 'in this test is derived from their rows, so with them gone this would search the build output '
  + 'for nothing and pass — which is the exact shape of the two misses this file was rewritten for. '
  + 'Run it on a checkout that has them to get the guarantee.'

// Modules the classifier cannot import, with the reason. `.jsx` is a blanket
// rule rather than nine filenames — Node cannot load JSX without a transform,
// and a JSX module is a component file, not a data board. Anything ELSE that
// fails to import is a hole in the coverage and fails below by name.
const UNREADABLE_EXCEPTIONS = {
  'emojiIndexLoader.js': 'imports emojiIndex.txt, which only Vite can resolve — it is an emoji search index, product content',
  'nearest/urls.js': 'imports five ?url JSON assets, which only Vite can resolve - they are the nearest-colour-system data (Tailwind, CSS, Material, Munsell, ISCC-NBS), product content',
  'iconHeads.js': 'uses import.meta.glob, which only Vite provides — it loads the per-pack icon name lists in iconHeads/*.json, product content',
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
// literal, so a needle spanning "the user's request" would match the runtime
// value and neither the source nor the emitted chunk; the CONTROL below catches
// exactly that, and it is the difference between a scan and the
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

test('CONTROL: the dashboard asks for no internal board, by any route', () => {
  // See the note at the top of this file. The dashboard is proven to have no
  // path to the boards, rather than a gated one: a fetch that does not exist
  // cannot be reintroduced by accident, and if somebody reintroduces it on
  // purpose this goes red and they have to say why here.
  //
  // COMMENTS ARE STRIPPED FIRST, and that is load-bearing rather than tidy.
  // Admin.jsx carries a paragraph explaining that the boards are gone, and it
  // names both modules and the endpoint to do so. A raw substring search would
  // read that explanation as the thing it is explaining the absence of, and
  // the only way to make it pass would be to delete the explanation.
  const raw = fs.readFileSync(path.join(ROOT, 'src/pages/Admin.jsx'), 'utf8')
  const admin = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  assert.ok(admin.length > 20_000,
    `Admin.jsx stripped to ${admin.length} bytes of code — the comment stripper ate the file and every `
    + 'absence below is passing on an empty string')

  assert.ok(!/backlog=1/.test(admin),
    'src/pages/Admin.jsx asks GET /api/ai?backlog=1 again. That endpoint answers the two internal '
    + 'boards, whose notes are free text written for the team, and the dashboard no longer shows '
    + 'either. Bringing the request back puts the rows in the browser again, behind the admin '
    + 'gate but in the browser.')

  for (const symbol of ['MODULE_BOARD', 'NEXT_TODO', 'PIPELINE_STAGES', 'PIPELINE_PROCESSES', 'APP_CONDITION']) {
    assert.ok(!admin.includes(symbol),
      `Admin.jsx reads ${symbol}, so one of the internal boards is being rendered again.`)
  }
  for (const mod of ['data/pipeline', 'data/moduleBoard']) {
    assert.ok(!admin.includes(mod),
      `Admin.jsx names ${mod} in code — as an import, static or dynamic, it is the exact edge this `
      + 'whole file exists to keep out of the bundle.')
  }
  // And neither tab is back in the bar. The components could be gone while a
  // tab that renders nothing stays in the nav.
  const tabs = admin.match(/const TABS = \[([\s\S]*?)\n\]/)
  assert.ok(tabs, 'the TABS array is unreadable, so this assertion is checking nothing')
  for (const dead of ['pipeline', 'board']) {
    assert.ok(!new RegExp(`id:\\s*'${dead}'`).test(tabs[1]), `the "${dead}" tab is back in the admin nav`)
  }

  // ── THE SERVER HALF ──────────────────────────────────────────────────────
  // Nothing in the browser calls this route, so nothing in the browser would
  // notice it losing its gate. On a checkout that has the two modules,
  // serveBacklog() reads them, so an ungated version of the route would serve
  // the backlog to anyone who found the query string.
  const route = fs.readFileSync(path.join(ROOT, 'api/ai.js'), 'utf8')
  assert.match(route, /'backlog' in \(req\.query \|\| \{\}\)/,
    'api/ai.js no longer answers ?backlog=1 — which may be correct now that no client calls it, but '
    + 'it is a deliberate change: delete this assertion and the two below in the same commit, and say '
    + 'so, rather than letting them be satisfied by a route that quietly stopped existing.')
  assert.match(route, /async function serveBacklog[\s\S]*?requireAdmin\(req\)/,
    'serveBacklog() in api/ai.js does not call requireAdmin() before it reads the boards — they '
    + 'would be served to anyone who asked, which is the disclosure this file exists for, moved '
    + 'from a static asset to an endpoint.')
  assert.match(route, /ERR_MODULE_NOT_FOUND/,
    'api/ai.js no longer tells "the boards are not in this deployment" apart from a real failure. '
    + 'The two modules are not deployed, so in production the imports throw, and the only two '
    + 'honest answers are the one it gives (501 + localOnly) or a 500. An empty backlog is not '
    + 'one of them.')
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
    + 'owner, including the literal text of a Firestore rule as it stood before it was closed. They must not be client '
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
    + 'or with import(). Either edge ships it to every visitor: a dynamic import still emits a '
    + 'public chunk. Find the importer and route it through GET /api/ai?backlog=1 instead.')
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
