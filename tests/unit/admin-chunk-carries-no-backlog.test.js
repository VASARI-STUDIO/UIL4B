// THE ENGINEERING BACKLOG MUST NOT BE IN ANYTHING THIS APP SERVES.
//
// src/data/pipeline.js is the backlog: 184 queued items and 23 processes whose
// `note`, `title` and `summary` fields are long, candid prose written for us.
// It is 832 KB of source and it grows every time anybody records what they did.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE USED TO CHECK, AND WHY THAT WAS THE WRONG PROPERTY
// ═══════════════════════════════════════════════════════════════════════════
// #405 and #406 filed the backlog as a WEIGHT problem: a static import from
// Admin.jsx put all of it inside Admin-*.js, 776,482 bytes raw / 287,073 gzip,
// fetched and parsed before the Admin route could render. #420 answered that
// with `import('../data/pipeline')`, and THIS FILE was written to hold the fix
// down. It walked the chunk graph and asserted:
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
// unfixed Firestore rule docs/OWNER-ACTIONS.md is still asking the founder to
// close — 23 mentions of firestore.rules, 3 permission-denied diagnostics and
// 246 of "founder". The guard's own CONTROL was asserting the leak was present.
//
// The property it measured — static edge or dynamic edge — decides WHEN a
// visitor's browser fetches the bytes. It has nothing whatever to say about
// WHO may fetch them, and a static asset is served to everybody either way.
// A guard aimed one axis away from the defect is worse than no guard, because
// it is read as coverage.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT IT CHECKS NOW
// ═══════════════════════════════════════════════════════════════════════════
// The property that actually matters, stated so that no chunk name, route
// move, re-import or bundler change can dodge it:
//
//     NO FILE IN THE BUILD OUTPUT CONTAINS ANY TEXT FROM ANY PIPELINE ROW.
//
// Not "the Admin chunk". Not "chunks". Every file on disk in the emitted
// directory — JS, CSS, HTML, copied public assets — read as bytes, searched
// for strings taken out of src/data/pipeline.js at test time. The day someone
// re-adds `import('../data/pipeline')` anywhere in src/, this goes red, and it
// stays red whichever chunk the bundler decides to put it in.
//
// The board still works: PipelineBoard fetches GET /api/ai?backlog=1, gated on
// a verified administrator by requireAdmin() in api/_lib/admin.js. That is
// asserted below too — otherwise "no notes in the build" is also what deleting
// the founder's board entirely looks like.
//
// ── THE POSITIVE CONTROLS ──────────────────────────────────────────────────
//
// "Nothing found" is what a broken build, an empty output directory, a bad
// needle extractor and a scanner that reads no files all look like. So, before
// any absence is asserted:
//
//   1. THE SCANNER IS PROVEN TO WORK, by pointing it at src/data/pipeline.js
//      itself and requiring it to find EVERY needle. This is the control the
//      old file did not have — a needle that no longer matches anything, e.g.
//      because minification escaped a character, would otherwise make every
//      assertion below pass for free.
//   2. THE BUILD IS PROVEN REAL: more than ten chunks, an Admin-*.js that
//      contains the dashboard's own marker, and a non-trivial number of files.
//   3. THE BOARD IS PROVEN TO STILL HAVE A SOURCE: the client asks the route,
//      and the route is behind the admin gate.
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
// MUTATION-VERIFIED: restoring `import('../data/pipeline')` in PipelineBoard —
// the shipped state this file was green against for the whole of the
// disclosure above — turns 'THE ONE THAT MATTERS' red with 381 needles found in
// dist/assets/pipeline-*.js, while all three controls stay green. Restored
// byte-exact afterwards and proved with `git diff`.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import { NEXT_TODO, PIPELINE_PROCESSES } from '../../src/data/pipeline.js'

const ROOT = process.cwd()

// The module whose bytes are the whole point, matched on its path in the
// bundle's own module ids rather than on a string it contains.
const BACKLOG = /[/\\]src[/\\]data[/\\]pipeline\.js$/

// Something only the Admin dashboard has, so a found chunk can be shown to be
// the real one rather than a stub.
const ADMIN_MARKER = 'uil4b-dev-2026'

const outDir = path.join(os.tmpdir(), `uil4b-admin-chunk-${process.pid}-${Date.now()}`)

// ── THE NEEDLES ────────────────────────────────────────────────────────────
//
// Taken from the data at test time, never typed here: a hand-written list would
// go stale the moment a row was edited, and a stale needle finds nothing, which
// reads as "clean". ASCII-only runs, because pipeline.js is full of curly
// apostrophes and en dashes and a minifier is free to emit those as ’
// escapes — a needle spanning one could miss a leak that is plainly there.
// Long, because a short phrase would collide with ordinary UI copy and fail
// for the wrong reason. Quotes, backticks, backslashes and dollars are excluded
// as well: those are ESCAPED inside a JavaScript string literal, so a needle
// spanning "the founder's request" matches the runtime value and not the source
// or the emitted chunk — the CONTROL below caught exactly that, twice, and it
// is the difference between a scan and the appearance of one.
// Printable ASCII 0x20-0x7E, minus " (0x22), $ (0x24), ' (0x27), \ (0x5C) and
// ` (0x60). Written as ranges rather than a negated class because a negated one
// has to name the control characters, and `no-control-regex` fails the lint.
const ASCII_RUN = /[\x20-\x21\x23\x25-\x26\x28-\x5B\x5D-\x5F\x61-\x7E]{48,}/
function needleFor(text) {
  const m = ASCII_RUN.exec(String(text))
  return m ? m[0].slice(0, 64) : null
}

const NEEDLES = []
for (const row of [...NEXT_TODO, ...PIPELINE_PROCESSES]) {
  for (const field of ['note', 'title', 'summary', 'name']) {
    const needle = typeof row[field] === 'string' ? needleFor(row[field]) : null
    if (needle) NEEDLES.push({ id: row.id, field, needle })
  }
}

/** Every needle that appears in `text`. */
const found = (text) => NEEDLES.filter((n) => text.includes(n.needle))

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

test('CONTROL: the scanner finds every needle in the file the needles came from', () => {
  // Without this, a needle extractor that produced nothing usable — or a
  // matcher that never matched — would make every assertion in this file pass
  // on an empty search. The old version of this file had no equivalent, which
  // is part of why it could be green through a live disclosure.
  assert.ok(NEEDLES.length > 100,
    `only ${NEEDLES.length} needles were extracted from ${NEXT_TODO.length} todos and `
    + `${PIPELINE_PROCESSES.length} processes — the extractor is not reading the rows, so the `
    + 'searches below are searching for almost nothing.')

  const source = fs.readFileSync(path.join(ROOT, 'src/data/pipeline.js'), 'latin1')
  const missing = NEEDLES.filter((n) => !source.includes(n.needle))
  assert.deepEqual(missing.map((n) => `${n.id}.${n.field}`), [],
    'a needle taken out of src/data/pipeline.js cannot be found in src/data/pipeline.js, so the '
    + 'scanner does not work and an absence in the build output means nothing.')
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

test('CONTROL: the founder still has a board, and it is behind the admin gate', () => {
  // "No notes in the build" is ALSO what deleting the Pipeline tab looks like.
  // These two reads are what stop this file being satisfied by the board simply
  // ceasing to exist.
  const admin = fs.readFileSync(path.join(ROOT, 'src/pages/Admin.jsx'), 'utf8')
  assert.match(admin, /\/api\/ai\?backlog=1/,
    'src/pages/Admin.jsx no longer asks for the backlog anywhere, so the founder\'s Pipeline tab has '
    + 'no source of data at all and the assertions below are passing on a deleted feature.')

  const route = fs.readFileSync(path.join(ROOT, 'api/ai.js'), 'utf8')
  assert.match(route, /'backlog' in \(req\.query \|\| \{\}\)/,
    'api/ai.js does not answer ?backlog=1, so the board the client asks for does not exist.')
  assert.match(route, /async function serveBacklog[\s\S]*?requireAdmin\(req\)/,
    'serveBacklog() in api/ai.js does not call requireAdmin() before it reads the backlog — the '
    + 'notes would be served to anyone who asked, which is the disclosure this file exists for, '
    + 'moved from a static asset to an endpoint.')
})

test('THE ONE THAT MATTERS: no file in the build output carries any pipeline row text', async () => {
  const { files } = await build()

  const leaks = []
  for (const file of files) {
    const hits = found(file.text)
    if (hits.length) leaks.push(`${file.name} (${file.text.length} bytes) carries ${hits.length} rows, e.g. ${hits[0].id}.${hits[0].field}`)
  }

  assert.deepEqual(leaks, [],
    'the engineering backlog is in the build output, which means it is served to anyone who asks — '
    + 'no login, no cookie, no Authorization header. src/data/pipeline.js holds permission-denied '
    + 'diagnostics, unshipped plans, security findings and founder decisions, including the literal '
    + 'text of an unfixed Firestore rule. It must not be a client module at ALL: not a static import, '
    + 'not a dynamic one. PipelineBoard in src/pages/Admin.jsx reads GET /api/ai?backlog=1 behind '
    + 'requireAdmin(); if you need the data in the browser, add it to that response.')
})

test('and the bundler was never even told about the backlog', async () => {
  // The graph-level statement of the same fact, kept because it names the cause
  // rather than the symptom: a module id is the thing a person greps for when
  // the assertion above goes red and they need to know WHO imported it.
  const { chunks } = await build()
  const carriers = chunks.filter((c) => (c.moduleIds || []).some((id) => BACKLOG.test(id)))
  assert.deepEqual(carriers.map((c) => `${c.fileName} (${c.code.length} bytes)`), [],
    'src/data/pipeline.js is in the client module graph. Something under src/ imports it — statically '
    + 'or with import(). Either edge ships the notes to every visitor; #420 removed only the static '
    + 'one and the notes stayed public for it. Find the importer and route it through '
    + 'GET /api/ai?backlog=1 instead.')
})

test('the Admin chunk is back to a size a dashboard justifies', async () => {
  // Not a byte-exact pin, which would fail on any honest change to the panel.
  // A ceiling at roughly twice today's size, so a second large module imported
  // eagerly is caught even though it is not the backlog and the walk above
  // would say nothing about it. It was 776,482 bytes when this was filed.
  const admin = adminChunk((await build()).chunks)
  assert.ok(admin.code.length < 250_000,
    `the Admin chunk is ${admin.code.length} bytes. It was 776,482 when `
    + '[admin-chunk-is-the-backlog] was filed and 113,900 when it was closed. Something large is '
    + 'being imported eagerly again — find it before raising this ceiling.')
})
