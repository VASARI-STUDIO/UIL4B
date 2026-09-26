// THE ENGINEERING BACKLOG: UNREACHABLE BY ANYONE, FROM ANYWHERE IN THE APP.
//
// src/data/pipeline.js is the internal backlog — queued items and processes
// whose note, title and summary fields are candid prose written for us. It was
// a client module, so `vite build` emitted it and the deploy served it from
// /assets. Walked anonymously against a real build, no login, no cookie, no
// Authorization header:
//
//   GET /admin                  200   the HTML names the entry chunk
//   GET /assets/index-*.js      200   names Admin-rjGyizH8.js
//   GET /assets/Admin-*.js      200   names pipeline-DUbq1XL3.js
//   GET /assets/pipeline-*.js   200   824,007 bytes / 319,711 gzip
//
// It carried the literal string `allow create: if true` — the feedback rule
// that #472 has since closed in firestore.rules — 23 mentions of
// firestore.rules and 3 permission-denied diagnostics. #420 put it behind a
// dynamic import, which changed WHEN a browser fetched it and nothing about WHO
// could. The board then read GET /api/ai?backlog=1 behind requireAdmin().
//
// ── 2026-09-16: THE BOARDS LEFT THE DASHBOARD ──────────────────────────────
//
// The repository went public to use free GitHub Actions minutes, which made
// this backlog world-readable, so the founder took both modules out of it and
// kept them on his machine (.gitignore carries the decision and its date).
// From that moment /api/ai?backlog=1 answered 501 `localOnly` in every
// deployment and the Pipeline and Board tabs rendered a paragraph explaining
// why they were empty. He then asked for the pipeline to go, and it went, with
// the module board beside it: no tab, no request, no component.
//
// This file used to drive those two tabs — rows, notes, statuses, the refusal
// state and the not-deployed state. Every one of those tests had a subject
// that no longer exists, so they are not here any more. What IS here is the
// half that outlives the tabs:
//
//   · the founder's dashboard, toured tab by tab, makes no request for the
//     boards at all — the property the tabs' removal was supposed to buy;
//   · a SIGNED-OUT visitor walks the real chunk graph over the real preview
//     server and reaches no note text anywhere — the acceptance test that
//     found the 824,007 bytes, unchanged.
//
// tests/unit/admin-chunk-carries-no-backlog.test.js proves the same absence
// over every emitted file of a real build, and its CONTROL now asserts the
// dashboard has no code path to the boards — the source-level twin of the tour
// below.
//
// ── WHY THE ANONYMOUS WALK NEEDS THE BOARDS PRESENT ────────────────────────
//
// Its needles are long printable runs taken from the REAL rows of both boards,
// read here in Node, so what is searched for is the founder's actual backlog
// and not a fixture that could drift away from it. Without the rows it has
// nothing to search for and it SKIPS WITH A REASON, loudly, rather than
// walking the chunk graph for nothing and reporting that as proof. The tour
// needs no rows and runs everywhere.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const HAS_BOARDS = ['pipeline.js', 'moduleBoard.js']
  .every((f) => fs.existsSync(path.join('src', 'data', f)))
const NO_BOARDS = !HAS_BOARDS
  && 'src/data/pipeline.js and src/data/moduleBoard.js are not in this checkout — they are '
  + 'local-only, by the founder decision of 2026-09-16 recorded in .gitignore — so there are no '
  + 'real rows to take needles from and the anonymous walk would be searching for nothing.'
if (NO_BOARDS) console.warn(`\n[78-admin-tabs-local-data] SKIPPING the anonymous walk: ${NO_BOARDS}\n`)

// Imported conditionally rather than at the top of the file, because a static
// import of an absent module fails the WHOLE spec file at collection time —
// including the tour below, which never touches the data.
const { PIPELINE_PROCESSES = [], NEXT_TODO = [] } = HAS_BOARDS
  ? await import('../../src/data/pipeline.js')
  : {}
const { MODULE_BOARD = [] } = HAS_BOARDS ? await import('../../src/data/moduleBoard.js') : {}

// Declared as a skip rather than calling test.skip() inside the body: the body
// form boots a browser only to throw it away. The reason is printed once at
// collection, above.
const boardTest = NO_BOARDS ? test.skip : test

// Long printable-ASCII runs out of the real rows of BOTH boards, used as
// needles for the anonymous walk. Quotes, backticks, backslashes and dollars
// are excluded because those are escaped inside a JavaScript string literal, so
// a needle spanning one would miss a leak that is plainly there — the unit
// guard's control caught exactly that. `nextSteps` and `recentChanges` are
// arrays of strings, and they are where the module board's owner instructions
// live, so they are read element by element rather than skipped.
const ASCII_RUN = /[\x20-\x21\x23\x25-\x26\x28-\x5B\x5D-\x5F\x61-\x7E]{48,}/
const needles = []
for (const [board, rows] of [['pipeline', [...NEXT_TODO, ...PIPELINE_PROCESSES]], ['moduleBoard', MODULE_BOARD]]) {
  for (const row of rows) {
    for (const field of ['note', 'title', 'summary', 'name', 'nextSteps', 'recentChanges']) {
      const value = row[field]
      const texts = typeof value === 'string' ? [value]
        : Array.isArray(value) ? value.filter((v) => typeof v === 'string') : []
      for (const text of texts) {
        const m = ASCII_RUN.exec(text)
        if (m) needles.push({ board, id: row.id, field, text: m[0].slice(0, 64) })
      }
    }
  }
}

test('the founder tours every admin tab and nothing asks for the boards', async ({ page }) => {
  // THE CONTROL IS THE TOUR. "No backlog request" is also what a dashboard
  // that never rendered looks like, and what an empty tab bar looks like. So
  // every tab is clicked and proven to take the selection, and the bar is
  // proven to have a real number of tabs, before either absence counts.
  watch(page, 'the founder touring the admin dashboard')

  const boardRequests = []
  const boardChunks = []
  page.on('request', (r) => {
    const url = r.url()
    if (url.includes('backlog=1')) boardRequests.push(url)
    if (/\/assets\/(pipeline|moduleBoard)-[^/]*\.js/.test(url)) boardChunks.push(url)
  })

  await signIn(page, { admin: true, claims: { admin: true } })
  await go(page, '/admin')
  await expect(page.getByText(/ADMIN MODE/i).first()).toBeVisible()

  const tabs = page.getByRole('tab')
  const names = await tabs.allInnerTexts()
  expect(names.length, 'the tab bar is empty, so touring it proves nothing').toBeGreaterThanOrEqual(5)
  expect(names.join(' | '), 'a Pipeline tab is back in the admin nav').not.toMatch(/Pipeline/i)
  expect(names.join(' | '), 'a Board tab is back in the admin nav').not.toMatch(/\bBoard\b/)

  for (let i = 0; i < names.length; i++) {
    await tabs.nth(i).click()
    await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true')
  }

  // Nothing that reads "the boards are not deployed" or "Next to do" either —
  // the two sentences the removed tabs used to print. A component can outlive
  // its tab if a branch still renders it.
  const text = (await page.locator('.adm').innerText()).replace(/\s+/g, ' ')
  expect(text, 'the not-deployed paragraph is still being rendered somewhere on the dashboard').not.toMatch(/is not deployed/i)
  expect(text, 'the backlog queue heading is still being rendered somewhere on the dashboard').not.toMatch(/Next to do \(/)

  expect(
    boardRequests,
    'a tab on the dashboard asked /api/ai?backlog=1 — the founder removed both tabs that did, and '
    + 'nothing left on this page has a reason to',
  ).toEqual([])
  expect(
    boardChunks,
    'a board module is a client chunk again and is being served to anyone who asks — see '
    + 'tests/unit/admin-chunk-carries-no-backlog.test.js',
  ).toEqual([])
})

boardTest('a signed-out visitor walking the real chunk graph reaches no backlog text at all', async ({ page }) => {
  // THE ACCEPTANCE TEST, in a browser, against the real preview server: the
  // same walk that found 824,007 bytes of notes before this change. Nothing is
  // signed in and page.request carries no credentials, so these are the exact
  // requests a stranger with the URL can make.
  watch(page, 'a stranger reading /admin')

  const fetched = []
  async function grab(p) {
    const res = await page.request.get(p)
    const body = await res.text()
    fetched.push({ path: p, status: res.status(), bytes: body.length })
    return { status: res.status(), body }
  }

  const html = await grab('/admin')
  expect(html.status, 'the preview server did not serve /admin, so this walk proves nothing').toBe(200)

  const entry = [...new Set([...html.body.matchAll(/\/assets\/index-[A-Za-z0-9_-]+\.js/g)].map((m) => m[0]))]
  expect(entry.length, 'the /admin shell names no entry chunk, so the walk stops before it starts').toBeGreaterThan(0)

  const adminNames = new Set()
  for (const src of entry) {
    const chunk = await grab(src)
    expect(chunk.status, `the entry chunk ${src} did not serve`).toBe(200)
    for (const m of chunk.body.matchAll(/Admin-[A-Za-z0-9_-]+\.js/g)) adminNames.add(m[0])
  }
  // CONTROL: the walk has to actually arrive at the Admin route's code. "No
  // notes" is also what a walk that never got past the entry chunk looks like.
  expect(
    [...adminNames],
    'the entry chunk names no Admin-*.js, so this walk never reached the admin code and every '
    + 'assertion below passes for free',
  ).not.toHaveLength(0)

  let sawTheDashboard = false
  for (const name of adminNames) {
    const chunk = await grab('/assets/' + name)
    expect(chunk.status, `the Admin chunk ${name} did not serve`).toBe(200)
    // The lock screen's heading, which only Admin.jsx renders. (This was the
    // admin unlock code, until that was taken out of the bundle.)
    if (chunk.body.includes('Developer Dashboard')) sawTheDashboard = true
    // Anything the Admin chunk names is fetched too — this is the edge that
    // used to lead straight to pipeline-*.js.
    for (const m of chunk.body.matchAll(/[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9_-]{8}\.js/g)) {
      if (!fetched.some((f) => f.path.endsWith(m[0]))) await grab('/assets/' + m[0])
    }
  }
  expect(
    sawTheDashboard,
    'no fetched Admin chunk contained the dashboard marker, so the walk did not reach the real thing',
  ).toBe(true)

  // CONTROL: real bytes were really read.
  expect(needles.length, 'no needles were extracted from the backlog, so nothing was searched for').toBeGreaterThan(100)
  const total = fetched.reduce((a, f) => a + f.bytes, 0)
  expect(total, `only ${total} bytes were fetched across ${fetched.length} requests — this is not a real walk`).toBeGreaterThan(200_000)

  const leaks = []
  for (const { path: p } of fetched) {
    const res = await page.request.get(p)
    const body = await res.text()
    const hit = needles.find((n) => body.includes(n.text))
    if (hit) leaks.push(`${p} carries ${hit.id}.${hit.field}`)
  }
  expect(
    leaks,
    'a file an anonymous visitor can fetch contains text from the engineering backlog — notes, '
    + 'titles or process summaries. src/data/pipeline.js holds permission-denied diagnostics, '
    + 'unshipped plans, security findings and founder decisions, including the literal text of a '
    + 'Firestore rule as it stood before it was closed.',
  ).toEqual([])

  // And the chunk that used to hold them is not on disk under any name.
  const anyPipelineChunk = fetched.filter((f) => /pipeline-[A-Za-z0-9_-]+\.js/.test(f.path) && f.status === 200)
  expect(anyPipelineChunk.map((f) => f.path), 'a pipeline-*.js asset is still being served').toEqual([])
})
