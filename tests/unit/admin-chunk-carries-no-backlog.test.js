// THE ADMIN ROUTE MUST NOT PULL THE ENGINEERING LOG IN BY A STATIC IMPORT.
//
// src/data/pipeline.js is the backlog: every note every agent has left, as
// prose, inside the row objects the Pipeline tab renders. It is 672 KB of
// source and it grows by a few KB every time anybody records what they did.
// A static `import` from src/pages/Admin.jsx put all of it into Admin-*.js —
// 776,482 bytes raw, 287,073 gzip, the largest chunk this app ships, 84% of it
// this one file. Filed twice, by #405 and #406.
//
// PipelineBoard now reaches it with `import('../data/pipeline')`, and mounts
// only when the Pipeline tab is open. This file is what stops that coming
// undone.
//
// ── THE FIRST DRAFT OF THIS TEST WAS WRONG, AND ITS MUTATION RUN SAID SO ───
//
// It scanned the emitted Admin-*.js for a backlog marker and asserted the
// string was absent. That test passed. It also passed with the static import
// PUT BACK — because rolldown emits pipeline.js as its own chunk either way,
// and a re-added static import does not move the bytes INTO Admin-*.js, it
// adds a static EDGE to the chunk holding them. Same 663 KB, fetched and parsed
// before the Admin route can render, and a file-content scan cannot see the
// difference. That is the exact failure vite.config.js records for the Firebase
// deferral: "the code looked deferred, the build stayed green, and the bytes
// were still in the first wave."
//
// So this measures the CHUNK GRAPH, which is the only thing that decides the
// question. Vite's JS API returns the bundle, so the edges are read from
// `chunk.imports` (static) and `chunk.dynamicImports` — no regex over minified
// output, which is the other way this could quietly stop working.
//
// ── THE POSITIVE CONTROL ───────────────────────────────────────────────────
//
// "Not reachable" is also what a wrong module id, a renamed chunk and a failed
// build all look like. So the same walk over the same bundle, differing only in
// that it follows dynamic edges too, must REACH the backlog — and the Admin
// chunk must be found and must contain the dashboard. A walk that cannot reach
// the thing it is looking for fails here before it can report anything.
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
// MUTATION-VERIFIED: restoring `import { NEXT_TODO } from '../data/pipeline'`
// in Admin.jsx and reading from it turns 'the Admin route reaches the backlog
// only through a dynamic import' red, while both positive controls stay green.
// The green no-op control is the unmutated tree, run first.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = process.cwd()

// The module whose bytes are the whole point, matched on its path in the
// bundle's own module ids rather than on a string it contains.
const BACKLOG = /[/\\]src[/\\]data[/\\]pipeline\.js$/

// Something only the Admin dashboard has, so a found chunk can be shown to be
// the real one rather than a stub.
const ADMIN_MARKER = 'uil4b-dev-2026'

const outDir = path.join(os.tmpdir(), `uil4b-admin-chunk-${process.pid}-${Date.now()}`)

let bundle = null
async function chunks() {
  if (bundle) return bundle
  const { build } = await import('vite')
  const result = await build({
    root: ROOT,
    logLevel: 'silent',
    build: { outDir, emptyOutDir: true },
  })
  const output = (Array.isArray(result) ? result[0] : result).output
  bundle = output.filter((o) => o.type === 'chunk')
  return bundle
}

test.after(() => {
  try { fs.rmSync(outDir, { recursive: true, force: true }) } catch { /* best effort */ }
})

const adminChunk = (all) => all.find((c) => /(^|\/)Admin-[^/]+\.js$/.test(c.fileName))
const carries = (c) => (c.moduleIds || []).some((id) => BACKLOG.test(id))

/** Chunks reachable from `start`, following the named edge kinds only. */
function reach(all, start, kinds) {
  const byName = new Map(all.map((c) => [c.fileName, c]))
  const seen = new Set()
  const queue = [start.fileName]
  while (queue.length) {
    const name = queue.shift()
    if (seen.has(name)) continue
    seen.add(name)
    const chunk = byName.get(name)
    if (!chunk) continue
    for (const kind of kinds) for (const next of chunk[kind] || []) queue.push(next)
  }
  return [...seen].map((n) => byName.get(n)).filter(Boolean)
}

test('the walk sees a real bundle, and can reach the backlog when it follows dynamic edges', async () => {
  const all = await chunks()
  assert.ok(all.length > 10, `the build emitted only ${all.length} chunks — this is not a real bundle`)

  const admin = adminChunk(all)
  assert.ok(admin, 'no Admin-*.js chunk was emitted, so nothing below measures the Admin route')
  assert.ok(admin.code.includes(ADMIN_MARKER),
    'the Admin chunk was found but does not contain the dashboard, so it is not the chunk this test means')

  // THE CONTROL. The same walk, following dynamic edges as well, must find it —
  // otherwise the assertion below would pass because the backlog is nowhere,
  // which would mean the Pipeline tab renders nothing.
  const anyEdge = reach(all, admin, ['imports', 'dynamicImports'])
  assert.ok(anyEdge.some(carries),
    'the Admin route cannot reach src/data/pipeline.js by ANY edge, static or dynamic. The '
    + 'Pipeline tab would render nothing, and the assertion below would pass for free.')
})

test('THE ONE THAT MATTERS: the Admin route reaches the backlog only through a dynamic import', async () => {
  const all = await chunks()
  const admin = adminChunk(all)

  // STATIC edges only. `dynamicImports` is exactly the edge we want to exclude:
  // a chunk behind one is fetched when the code asks for it, not before the
  // route can render.
  const eager = reach(all, admin, ['imports'])
  const offenders = eager.filter(carries)

  assert.deepEqual(
    offenders.map((c) => `${c.fileName} (${c.code.length} bytes)`), [],
    'src/data/pipeline.js is reachable from the Admin chunk by STATIC import, so it is fetched and '
    + 'parsed before the Admin route can render — which is the whole of [admin-chunk-is-the-backlog] '
    + 'coming back. The log is 672 KB of prose that grows every time an agent writes a note. '
    + "PipelineBoard in src/pages/Admin.jsx must reach it with `import('../data/pipeline')`, and "
    + 'nothing Admin imports eagerly may import it either — note that a re-added static import does '
    + 'NOT put the bytes inside Admin-*.js, which is why this walks the graph and does not grep the '
    + 'chunk.',
  )
})

test('the backlog did not simply move somewhere worse', async () => {
  const all = await chunks()
  const entries = all.filter((c) => c.isEntry)
  for (const entry of entries) {
    const eager = reach(all, entry, ['imports']).filter(carries)
    assert.deepEqual(eager.map((c) => c.fileName), [],
      `the backlog is reachable from the entry chunk ${entry.fileName} by static import, which is `
      + 'worse than where it started: every visitor would pay for it, not only an admin.')
  }
})

test('the Admin chunk is back to a size a dashboard justifies', async () => {
  // Not a byte-exact pin, which would fail on any honest change to the panel.
  // A ceiling at roughly twice today's size, so a second large module imported
  // eagerly is caught even though it is not the backlog and the walk above
  // would say nothing about it. It was 776,482 bytes when this was filed.
  const admin = adminChunk(await chunks())
  assert.ok(admin.code.length < 250_000,
    `the Admin chunk is ${admin.code.length} bytes. It was 776,482 when `
    + '[admin-chunk-is-the-backlog] was filed and 113,900 when it was closed. Something large is '
    + 'being imported eagerly again — find it before raising this ceiling.')
})
