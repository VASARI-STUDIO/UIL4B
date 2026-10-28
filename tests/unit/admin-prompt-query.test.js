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
