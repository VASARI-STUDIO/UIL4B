// THE ENGINEERING BACKLOG: VISIBLE TO THE FOUNDER, UNREACHABLE BY ANYONE ELSE.
//
// src/data/pipeline.js is the internal backlog — 184 queued items and 23
// processes whose note, title and summary fields are candid prose written for
// us. It was a client module, so `vite build` emitted it and the deploy served
// it from /assets. Walked anonymously against a real build, no login, no
// cookie, no Authorization header:
//
//   GET /admin                  200   the HTML names the entry chunk
//   GET /assets/index-*.js      200   names Admin-rjGyizH8.js
//   GET /assets/Admin-*.js      200   names pipeline-DUbq1XL3.js
//   GET /assets/pipeline-*.js   200   824,007 bytes / 319,711 gzip
//
// It carried the literal string `allow create: if true` — the unfixed Firestore
// rule docs/OWNER-ACTIONS.md is still asking the founder to close — 23 mentions
// of firestore.rules and 3 permission-denied diagnostics. #420 put it behind a
// dynamic import, which changed WHEN a browser fetched it and nothing about WHO
// could. The board now reads GET /api/ai?backlog=1 behind requireAdmin().
//
// ── WHAT EACH HALF IS FOR ──────────────────────────────────────────────────
//
// tests/unit/admin-chunk-carries-no-backlog.test.js proves the ABSENCE, over a
// real production build, by reading every emitted file for row text. It cannot
// prove the founder can still read the board — a fix that deleted the Pipeline
// tab would pass it perfectly.
//
// This file drives the browser for both halves:
//   · the founder opens the tab and gets rows, notes and statuses;
//   · the board says so out loud when the endpoint refuses it;
//   · a SIGNED-OUT visitor walks the real chunk graph over the real preview
//     server and reaches no note text anywhere.
//
// ── WHY THE ENDPOINT IS STUBBED ────────────────────────────────────────────
//
// `vite preview` serves dist/ as static files and runs no Vercel functions, so
// every request under /api answers 404 in this suite — helpers.js says so where it
// that as expected noise, and 57-brand-starter.spec.js stubs /api/ai for the
// same reason. The stub answers with the REAL exports of src/data/pipeline.js,
// read here in Node, so what the board renders is the founder's actual backlog
// and not a fixture that could drift away from it. What the stub cannot prove —
// that the server refuses a non-admin — is proved by
// tests/unit/admin-chunk-carries-no-backlog.test.js reading requireAdmin() into
// serveBacklog(), and by the Authorization assertion in
// 57-signed-in-session.spec.js.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { APP_CONDITION, PIPELINE_STAGES, PIPELINE_PROCESSES, NEXT_TODO } from '../../src/data/pipeline.js'
import { MODULE_BOARD } from '../../src/data/moduleBoard.js'

// Exactly the payload api/ai.js builds in serveBacklog(). BOTH internal boards:
// the module board was the one the first pass missed, because it was a plain
// static import that landed inside Admin-*.js rather than a chunk of its own.
const BOARD = { APP_CONDITION, PIPELINE_STAGES, PIPELINE_PROCESSES, NEXT_TODO, MODULE_BOARD }

// The endpoint, matched on the URL object rather than a glob: a glob has to
// spell the query string, and `?` is a wildcard in Playwright's matcher, so
// a query-string glob would silently also claim /api/aiXbacklog=1.
const isBacklogEndpoint = (url) => url.pathname === '/api/ai' && url.searchParams.has('backlog')

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

// The board's own status vocabulary, read out of Admin.jsx rather than restated
// here — exactly as tests/unit/pipeline-board-renderable.test.js reads it, and
// for the same reason: a copy in this file would be one more list to keep in
// step. The component renders `TODO_STATUS_LABEL[t.status] || t.status`, and
// that fallback is mirrored below, so a status with no label is expected to
// print as its own raw lowercase string. Flagging THAT is the unit guard's job;
// this file only checks the board printed what the queue it was handed calls for.
const TODO_STATUS_LABEL = (() => {
  const src = fs.readFileSync(path.join('src', 'pages', 'Admin.jsx'), 'utf8')
  const m = src.match(/TODO_STATUS_LABEL\s*=\s*\{([^}]*)\}/)
  if (!m) throw new Error('could not find the TODO_STATUS_LABEL map in Admin.jsx — this spec is reading the wrong file')
  return Object.fromEntries([...m[1].matchAll(/(\w[\w-]*)\s*:\s*'([^']*)'/g)].map((x) => [x[1], x[2]]))
})()

// One row of each board, chosen deterministically, whose prose is long enough
// to be unmistakable on screen. Used by the render tests and nothing else.
const SAMPLE = NEXT_TODO.find((t) => typeof t.note === 'string' && t.note.length > 120)
const SAMPLE_MODULE = MODULE_BOARD.find((m) => m.nextSteps?.some((s) => s.length > 48))

test('the founder opens the Pipeline tab and gets the whole board — rows, notes and statuses', async ({ page }) => {
  watch(page, 'the founder reading the backlog')

  let sawAuthorization = null
  await page.route(isBacklogEndpoint, (route) => {
    sawAuthorization = route.request().headers()['authorization'] || null
    return route.fulfill({ json: BOARD })
  })

  await signIn(page, { admin: true })
  await go(page, '/admin')
  // CONTROL: this session must really be the founder, or everything below is
  // measuring a page that was never admitted.
  await expect(page.getByText(/ADMIN MODE/i).first()).toBeVisible()

  await page.getByRole('tab', { name: 'Pipeline' }).click()

  // The three bands the board is made of.
  await expect(page.getByText('App condition')).toBeVisible()
  await expect(page.getByText(`Pipeline (${PIPELINE_PROCESSES.length} processes)`)).toBeVisible()
  await expect(page.getByText(`Next to do (${NEXT_TODO.length})`)).toBeVisible()

  // Every queued item is on screen — not "some rows rendered", which is also
  // true of a board that dropped nine tenths of the backlog on the way through
  // JSON.
  await expect(page.locator('.adm-pipe-todo').first()).toBeVisible()
  expect(
    await page.locator('.adm-pipe-todo').count(),
    'the queue rendered a different number of rows than the endpoint returned, so something is being '
    + 'lost between the route and the board',
  ).toBe(NEXT_TODO.length)

  // THE NOTES, which are the whole reason this board is worth keeping. A row
  // with ids and a status and no note would pass every count above.
  const sampleRow = page.locator('.adm-pipe-todo').filter({ hasText: SAMPLE.title }).first()
  await expect(sampleRow).toBeVisible()
  expect(
    (await sampleRow.innerText()).replace(/\s+/g, ' '),
    `the row for ${SAMPLE.id} is on the board without its note, so the founder has a list of titles `
    + 'rather than the record — which is what stripping the notes at build time would have given them',
  ).toContain(SAMPLE.note.replace(/\s+/g, ' ').slice(0, 80))

  // THE STATUSES, read back as the labels the board prints rather than the raw
  // values, because an unmapped status renders as its own lowercase string and
  // that is the defect pipeline-board-renderable.test.js exists for.
  //
  // DERIVED FROM THE DATA, NOT NAMED HERE. This used to anchor on the literal
  // 'Done' — never the property being guarded, only a value that happened to be
  // present in every queue anyone had seen. Archiving the 172 finished rows to
  // docs/backlog/ emptied that status out of the live queue, and the assertion
  // went red while the board was perfectly correct: five distinct labels, every
  // one of them right. A stale anchor, not a defect. Naming any other status
  // instead would re-encode the same assumption and break on the next archive
  // pass, so the expected set is computed from the same NEXT_TODO the stub
  // served. That is also strictly stronger than the anchor was: it fails on a
  // status collapsing to one value, on one being dropped in transit, AND on one
  // being printed as something the data does not say.
  const expectedLabels = [...new Set(NEXT_TODO.map((t) => TODO_STATUS_LABEL[t.status] || t.status))].sort()
  const labels = new Set(await page.locator('.adm-pipe-status').allInnerTexts())
  expect(
    [...labels].sort(),
    'the labels on the board are not the ones the queue it was handed calls for — a status has '
    + 'collapsed to a single value, been dropped on the way through JSON, or is being printed as '
    + 'something src/data/pipeline.js does not say',
  ).toEqual(expectedLabels)
  // One label per distinct status, so two statuses cannot quietly share a word
  // and still satisfy the set above — `deferred` reading as `Blocked` is the
  // exact confusion TODO_STATUS_LABEL was split to prevent.
  expect(
    labels.size,
    'the board printed fewer distinct labels than the queue has distinct statuses, so two statuses '
    + 'render as the same word and cannot be told apart on the one board the founder reads',
  ).toBe(new Set(NEXT_TODO.map((t) => t.status)).size)
  expect(labels.size, 'only one distinct status label rendered across the whole queue').toBeGreaterThan(2)

  // And it asked as somebody — a request without this is refused in production.
  expect(
    sawAuthorization,
    'the board fetched the backlog with no Authorization header, so the real endpoint would answer it 404',
  ).toMatch(/^Bearer .+/)
})

test('the Board tab renders the module board from the same one request', async ({ page }) => {
  // THE SECOND BOARD, and the one the first pass missed. src/data/moduleBoard.js
  // was a plain STATIC import in Admin.jsx, so its 20,332 bytes were inlined
  // into Admin-*.js — no chunk of its own, nothing for a pipeline-shaped guard
  // to notice — and dist/assets/Admin-*.js carried, fetchable with no auth:
  //   nextSteps: ["Owner: verify aggregate analytics and Feedback reads after
  //   the published Firestore rules", ...]
  //
  // It now comes from the SAME payload as the backlog, so this also proves the
  // shared cache: one request serves both tabs.
  watch(page, 'the founder reading the module board')

  const requests = []
  await page.route(isBacklogEndpoint, (route) => { requests.push(route.request().url()); return route.fulfill({ json: BOARD }) })

  await signIn(page, { admin: true })
  await go(page, '/admin')
  await expect(page.getByText(/ADMIN MODE/i).first()).toBeVisible()

  await page.getByRole('tab', { name: 'Pipeline' }).click()
  await expect(page.getByText('App condition')).toBeVisible()

  await page.getByRole('tab', { name: 'Board' }).click()
  await expect(page.getByText(`Module Board (${MODULE_BOARD.length})`)).toBeVisible()

  // The owner-facing prose, on screen, in its own card — the exact class of
  // string that was public. A card with a name and a status would pass a count.
  const card = page.locator('.adm-section').filter({ hasText: SAMPLE_MODULE.name }).first()
  const step = SAMPLE_MODULE.nextSteps.find((s) => s.length > 48)
  expect(
    (await card.innerText()).replace(/\s+/g, ' '),
    `the card for ${SAMPLE_MODULE.id} rendered without its next steps, so the founder has a kanban of `
    + 'names rather than the board',
  ).toContain(step.replace(/\s+/g, ' ').slice(0, 60))

  // ONE request for both tabs. Two would mean the cache is per-component and
  // the founder pays for 800 KB again on every tab switch.
  expect(
    requests.length,
    `the endpoint was called ${requests.length} times for two tabs — the shared cache in `
    + 'loadInternalBoards() is not shared, so moving between Pipeline and Board refetches everything',
  ).toBe(1)
})

test('when the endpoint refuses, the board says so instead of showing an empty backlog', async ({ page }) => {
  // A board that silently rendered zero rows would read as "there is nothing in
  // the backlog", which is the most misleading thing this surface could say —
  // and 404 is exactly what requireAdmin answers a caller it does not recognise,
  // so this is the state a session with a stale token actually lands in.
  watch(page, 'the founder whose session no longer proves it')

  await page.route(isBacklogEndpoint, (route) => route.fulfill({ status: 404, json: { error: 'Not found' } }))

  await signIn(page, { admin: true })
  await go(page, '/admin')
  await expect(page.getByText(/ADMIN MODE/i).first()).toBeVisible()

  await page.getByRole('tab', { name: 'Pipeline' }).click()

  await expect(page.getByText(/Could not load the backlog/i)).toBeVisible()
  expect(
    await page.locator('.adm-pipe-todo').count(),
    'the board rendered rows on a refused request, so this failure state is not the one that ships',
  ).toBe(0)

  // BOTH tabs degrade, not just the one that was fixed first. The module board
  // shared the static import and now shares the gate, so it has to share the
  // honest failure too.
  await page.getByRole('tab', { name: 'Board' }).click()
  await expect(page.getByText(/Could not load the module board/i)).toBeVisible()
})

test('a signed-out visitor walking the real chunk graph reaches no backlog text at all', async ({ page }) => {
  // THE ACCEPTANCE TEST, in a browser, against the real preview server: the
  // same walk that found 824,007 bytes of notes before this change. Nothing is
  // signed in and page.request carries no credentials, so these are the exact
  // requests a stranger with the URL can make.
  watch(page, 'a stranger reading /admin')

  const fetched = []
  async function grab(path) {
    const res = await page.request.get(path)
    const body = await res.text()
    fetched.push({ path, status: res.status(), bytes: body.length })
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
    if (chunk.body.includes('uil4b-dev-2026')) sawTheDashboard = true
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
    + 'unshipped plans, security findings and founder decisions, including the literal text of an '
    + 'unfixed Firestore rule.',
  ).toEqual([])

  // And the chunk that used to hold them is not on disk under any name.
  const anyPipelineChunk = fetched.filter((f) => /pipeline-[A-Za-z0-9_-]+\.js/.test(f.path) && f.status === 200)
  expect(anyPipelineChunk.map((f) => f.path), 'a pipeline-*.js asset is still being served').toEqual([])
})
