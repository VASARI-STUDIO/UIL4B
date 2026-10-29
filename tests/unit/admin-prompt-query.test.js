// The Admin Prompts tab must not read the whole community-prompts collection.
//
// Any signed-in account can create a pending prompt document of up to ~900 KB,
// with no count limit, and the tab used to read every document in the
// collection with no status clause and no limit. A few thousand spam prompts
// would be pulled into the moderator's browser on every page open.
//
// The filter buttons (pending / approved / rejected / all) are kept: each one
// now asks Firestore for that status only, newest first, capped. Reverting
// either the helper or the query in Admin.jsx fails a test below.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ADMIN_PROMPT_DEFAULT_FILTER,
  ADMIN_PROMPT_FILTERS,
  ADMIN_PROMPT_LIMIT,
  adminPromptQuerySpec,
} from '../../src/utils/adminPromptQuery.js'
import { read, stripComments } from './helpers/source-text.js'

test('the default view is the pending queue, capped at 200', () => {
  assert.equal(ADMIN_PROMPT_DEFAULT_FILTER, 'pending')
  assert.equal(ADMIN_PROMPT_LIMIT, 200)
  assert.deepEqual(adminPromptQuerySpec(), { status: 'pending', max: 200 })
})

test('every moderator filter stays reachable, each one capped', () => {
  assert.deepEqual([...ADMIN_PROMPT_FILTERS], ['pending', 'approved', 'rejected', 'all'])
  assert.deepEqual(adminPromptQuerySpec('approved'), { status: 'approved', max: 200 })
  assert.deepEqual(adminPromptQuerySpec('rejected'), { status: 'rejected', max: 200 })
  // "all" drops the status clause but not the cap.
  assert.deepEqual(adminPromptQuerySpec('all'), { status: null, max: 200 })
})

test('an unknown filter reads as the default rather than as "everything"', () => {
  assert.deepEqual(adminPromptQuerySpec('anything'), { status: 'pending', max: 200 })
  assert.deepEqual(adminPromptQuerySpec(null), { status: 'pending', max: 200 })
})

test('Admin.jsx builds the prompts query with a status filter and a limit', () => {
  const src = stripComments(read('src/pages/Admin.jsx'))
  const start = src.indexOf('const loadPrompts')
  assert.notEqual(start, -1, 'the prompts loader is gone from Admin.jsx')
  const loader = src.slice(start, src.indexOf('const selectPromptFilter', start))

  assert.match(loader, /collection\(db,\s*'community-prompts'\)/)
  assert.match(loader, /where\('status',\s*'==',\s*spec\.status\)/, 'the prompts query lost its status filter')
  assert.match(loader, /orderBy\('createdAt',\s*'desc'\)/)
  assert.match(loader, /limit\(spec\.max\)/, 'the prompts query lost its limit')
})

test('no unbounded read of community-prompts is left in Admin.jsx', () => {
  const src = stripComments(read('src/pages/Admin.jsx'))
  // The old read: the collection, ordered, closed with no limit.
  assert.ok(!/query\(collection\(db,\s*'community-prompts'\),\s*orderBy\('createdAt',\s*'desc'\)\)/.test(src),
    'the unbounded community-prompts read is back in Admin.jsx')
  const reads = src.match(/getDocs\(query\(\s*collection\(db,\s*'community-prompts'\)/g) || []
  assert.equal(reads.length, 1, 'expected exactly one community-prompts list read, through the capped loader')
})

test('the filter buttons and the refresh button both go through the capped loader', () => {
  const src = stripComments(read('src/pages/Admin.jsx'))
  assert.match(src, /onClick=\{\(\) => selectPromptFilter\(f\)\}/, 'the filter buttons no longer reload the list')
  assert.match(src, /await loadPrompts\(promptFilterRef\.current\)/, 'refresh no longer reloads prompts for the active filter')
})

// ── The loader the tab runs: stale reads and failures ────────────────────────
import { createPromptLoader, promptReadErrorText } from '../../src/utils/adminPromptQuery.js'

/** A read the test finishes by hand, so it decides which one is slower. */
function deferredRead() {
  const pending = []
  const read = (spec) => new Promise((resolve, reject) => pending.push({ spec, resolve, reject }))
  return { read, pending }
}

function screen() {
  const s = { list: null, error: '', loading: false, cleared: 0, starts: [] }
  s.hooks = {
    onStart: (spec, { clear }) => { s.loading = true; s.error = ''; s.starts.push(spec.status); if (clear) { s.list = []; s.cleared++ } },
    onList: (list) => { s.list = list; s.loading = false },
    onError: (err) => { s.list = []; s.loading = false; s.error = promptReadErrorText(err) },
  }
  return s
}

test('a slower earlier read cannot overwrite a newer one', async () => {
  const { read, pending } = deferredRead()
  const s = screen()
  const load = createPromptLoader({ read, ...s.hooks })

  const first = load('pending')
  const second = load('approved', { clear: true })
  assert.deepEqual(pending.map((p) => p.spec.status), ['pending', 'approved'])

  pending[1].resolve([{ id: 'a1', status: 'approved' }])
  await second
  pending[0].resolve([{ id: 'p1', status: 'pending' }])
  await first
  assert.deepEqual(s.list, [{ id: 'a1', status: 'approved' }], 'the older read landed on top of the newer filter')
})

test('a slower earlier read that FAILS cannot put its error under the newer filter either', async () => {
  const { read, pending } = deferredRead()
  const s = screen()
  const load = createPromptLoader({ read, ...s.hooks })
  const first = load('pending')
  const second = load('rejected', { clear: true })
  pending[1].resolve([{ id: 'r1' }])
  await second
  pending[0].reject(Object.assign(new Error('offline'), { code: 'unavailable' }))
  await first
  assert.equal(s.error, '')
  assert.deepEqual(s.list, [{ id: 'r1' }])
})

test('a filter switch clears the list at once; a refresh does not', async () => {
  const { read, pending } = deferredRead()
  const s = screen()
  s.list = [{ id: 'old' }]
  const load = createPromptLoader({ read, ...s.hooks })
  const switched = load('approved', { clear: true })
  assert.deepEqual(s.list, [], 'the old filter\'s rows are still on screen while the new read is in flight')
  assert.equal(s.loading, true)
  pending[0].resolve([{ id: 'a' }])
  await switched

  const refreshed = load('approved')
  assert.deepEqual(s.list, [{ id: 'a' }], 'a refresh blanked the list')
  pending[1].resolve([{ id: 'a' }, { id: 'b' }])
  await refreshed
  assert.equal(s.list.length, 2)
})

test('a refused read is reported, with the index hint for failed-precondition, not shown as an empty list', async () => {
  const s = screen()
  const load = createPromptLoader({
    read: async () => { throw Object.assign(new Error('The query requires an index.'), { code: 'failed-precondition' }) },
    ...s.hooks,
  })
  await load('pending', { clear: true })
  assert.match(s.error, /requires an index/)
  assert.match(s.error, /firestore:indexes/, 'the missing-index case does not say how to fix it')
  assert.equal(s.loading, false)
  assert.equal(promptReadErrorText(new Error('boom')), 'boom')
})

test('Admin.jsx shows the read failure instead of "No pending prompts yet"', () => {
  const src = stripComments(read('src/pages/Admin.jsx'))
  assert.match(src, /createPromptLoader\(\{/, 'the tab no longer runs the tested loader')
  assert.match(src, /\{promptsError && \(/, 'the prompts error is no longer rendered')
  assert.match(src, /!promptsError && pendingPrompts\.filter/, 'the empty sentence is shown even when the read failed')
  assert.match(src, /loadPrompts\(next,\s*\{\s*clear:\s*true\s*\}\)/, 'a filter switch no longer clears the list')
})
