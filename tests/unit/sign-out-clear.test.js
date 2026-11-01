// What sign-out leaves behind on a shared machine (src/utils/signOutClear.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearAtSignOut, SIGN_OUT_LOCAL_KEYS, SIGN_OUT_SESSION_KEYS, PROFILE_CACHE_KEY, ACCOUNTS_KEY,
  isRememberDevice, setRememberDevice, requestDiscardOnSignOut, takeDiscardRequest,
  cancelDiscardRequest, DISCARD_REQUEST_TTL_MS,
} from '../../src/utils/signOutClear.js'
import { STORAGE_INVENTORY, releaseCache, emptyMeta } from '../../src/utils/accountSync.js'
import { CLEAR_EXCEPTIONS, keysToClear } from '../../src/utils/dataExport.js'

function store(seed = {}) {
  const m = new Map(Object.entries(seed))
  return {
    get length() { return m.size },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    has: (k) => m.has(k),
    keys: () => [...m.keys()],
  }
}

const PROFILES = JSON.stringify({ A: { email: 'a@x.test', bio: 'secret' }, B: { email: 'b@x.test' } })
const ACCOUNTS = JSON.stringify([{ uid: 'A', email: 'a@x.test' }, { uid: 'B', email: 'b@x.test' }])

test('every account-bound key in the registry is cleared once work is safe to lose', () => {
  const bound = Object.entries(STORAGE_INVENTORY)
    .filter(([, s]) => ['account', 'account-other', 'account-mirror'].includes(s.scope))
    .map(([k]) => k)
    .filter((k) => k !== PROFILE_CACHE_KEY)
  assert.ok(bound.length > 20, 'the registry lists the account-bound keys')
  const local = store(Object.fromEntries(bound.map((k) => [k, 'x'])))
  clearAtSignOut({ local, uid: 'A', workIsSafeToLose: true })
  assert.deepEqual(local.keys(), [], 'nothing account-bound survives')
  for (const key of ['vs-projects', 'vs-project-tombstones', 'vs-prompts', 'vs-current-design', 'vs-onboarded']) {
    assert.ok(SIGN_OUT_LOCAL_KEYS.includes(key), key)
  }
})

test('device preferences and public caches stay', () => {
  const kept = ['vs-settings-section', 'vs-prompt-tab', 'vs-icon-ground', 'vs-icon-copy-day', 'vs-gf-catalog',
    'vs-google-returning', 'vs-session', 'vs-chunk-reload', 'vs-sync-meta', 'vs-gradient-submissions', 'vs-usage']
  const local = store(Object.fromEntries(kept.map((k) => [k, '1'])))
  clearAtSignOut({ local, uid: 'A', workIsSafeToLose: true })
  for (const key of kept) assert.equal(local.has(key), true, `${key} is a device key and stays`)
  for (const key of kept) assert.equal(SIGN_OUT_LOCAL_KEYS.includes(key), false, key)
})

test('saved work stays while it has not reached the account', () => {
  const local = store({ 'vs-projects': '{"a@x.test":[{"id":1}]}', [PROFILE_CACHE_KEY]: PROFILES, [ACCOUNTS_KEY]: ACCOUNTS })
  const removed = clearAtSignOut({ local, uid: 'A', workIsSafeToLose: false })
  assert.equal(local.has('vs-projects'), true, 'unsent projects are kept for the next sign-in')
  assert.equal(local.has(ACCOUNTS_KEY), false, 'the other people still go')
  assert.equal(local.has(PROFILE_CACHE_KEY), false)
  assert.ok(removed.includes(ACCOUNTS_KEY))
})

test('the profile cache entry for the signed-out uid is removed; others only when nobody is remembered', () => {
  const remembered = store({ [PROFILE_CACHE_KEY]: PROFILES, 'vs-remember-device': '1' })
  clearAtSignOut({ local: remembered, uid: 'A' })
  assert.deepEqual(Object.keys(JSON.parse(remembered.getItem(PROFILE_CACHE_KEY))), ['B'])
  const forgotten = store({ [PROFILE_CACHE_KEY]: PROFILES })
  clearAtSignOut({ local: forgotten, uid: 'A' })
  assert.equal(forgotten.has(PROFILE_CACHE_KEY), false)
})

test('vs-accounts is opt-in: forgotten at sign-out unless remembering is on', () => {
  const off = store({ [ACCOUNTS_KEY]: ACCOUNTS })
  clearAtSignOut({ local: off, uid: 'A' })
  assert.equal(off.has(ACCOUNTS_KEY), false)
  const on = store({ [ACCOUNTS_KEY]: ACCOUNTS })
  assert.equal(setRememberDevice(on, true), true)
  assert.equal(isRememberDevice(on), true)
  clearAtSignOut({ local: on, uid: 'A', workIsSafeToLose: true })
  assert.equal(on.has(ACCOUNTS_KEY), true, 'kept because the person asked')
  assert.equal(on.has('vs-remember-device'), true, 'the choice itself is a device preference')
  assert.equal(setRememberDevice(on, false), true)
  assert.equal(isRememberDevice(on), false)
})

test('Clear local data now removes vs-accounts', () => {
  assert.equal(CLEAR_EXCEPTIONS.includes('vs-accounts'), false)
  const s = store({ 'vs-accounts': ACCOUNTS, 'vs-admin-unlocked': 'true', 'vs-lang': '"en"' })
  assert.deepEqual(keysToClear(s).sort(), ['vs-accounts', 'vs-lang'])
})

test('per-visit keys in sessionStorage go, including the uid-suffixed ones', () => {
  const session = store({
    'vs-verify-dismissed:A': '1', 'vs-billing-dismissed:pay:9': '1', 'vs-gradient-keep-dismissed:A': '1',
    'vs-pending-save': '{}', 'vs-icon-draft': '{}', 'vs-gradient-locks': 'keep', 'vs-chunk-reload': '1', 'other': 'x',
  })
  clearAtSignOut({ local: store(), session, uid: 'A' })
  assert.deepEqual(session.keys().sort(), ['other', 'vs-chunk-reload', 'vs-gradient-locks'])
  assert.ok(SIGN_OUT_SESSION_KEYS.length >= 6)
})

test('discard releases the account keys that releaseCache would keep', () => {
  const pending = () => ({ ...emptyMeta(), owner: 'A', stamps: { 'vs-t': 9 }, pushed: { 'vs-t': 5 } })
  const kept = store({ 'vs-t': 'dark' })
  assert.equal(releaseCache(kept, pending()).released, false)
  assert.equal(kept.has('vs-t'), true)
  const discarded = store({ 'vs-t': 'dark' })
  assert.equal(releaseCache(discarded, pending(), { discard: true }).released, true)
  assert.equal(discarded.has('vs-t'), false)
})

test('a discard request is single-use and expires', () => {
  requestDiscardOnSignOut(1000)
  assert.equal(takeDiscardRequest(1500), true)
  assert.equal(takeDiscardRequest(1600), false, 'used once')
  requestDiscardOnSignOut(1000)
  assert.equal(takeDiscardRequest(1000 + DISCARD_REQUEST_TTL_MS + 1), false, 'a stale request is ignored')
  requestDiscardOnSignOut(1000)
  cancelDiscardRequest()
  assert.equal(takeDiscardRequest(1001), false)
})

test('blocked storage does not throw', () => {
  const broken = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') }, length: 0, key: () => null }
  assert.deepEqual(clearAtSignOut({ local: broken, session: broken, uid: 'A', workIsSafeToLose: true }), [])
  assert.equal(isRememberDevice(broken), false)
  assert.equal(setRememberDevice(broken, true), false)
})
