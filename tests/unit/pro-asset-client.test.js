// The browser side of the Pro previews (src/utils/proAsset.js): one fetch per
// key, the right token, blob URLs revoked when the account changes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createProAsset, proAssetKey } from '../../src/utils/proAsset.js'

function harness({ status = 200, uid = 'pro-1' } = {}) {
  const state = { uid, status, calls: [], created: [], revoked: [], listener: null }
  const auth = {
    get currentUser() {
      return state.uid ? { uid: state.uid, getIdToken: async () => `tok-${state.uid}` } : null
    },
  }
  const sdk = { auth, onAuthStateChanged: (_a, fn) => { state.listener = fn } }
  let n = 0
  const api = createProAsset({
    loadAuth: async () => sdk,
    fetchImpl: async (url, init) => {
      state.calls.push({ url, auth: init?.headers?.Authorization })
      if (state.hold) await state.hold
      const s = typeof state.status === 'function' ? state.status() : state.status
      return { status: s, ok: s >= 200 && s < 300, blob: async () => ({ blob: url }) }
    },
    createURL: () => { const u = `blob:${++n}`; state.created.push(u); return u },
    revokeURL: (u) => state.revoked.push(u),
  })
  return { api, state }
}

test('a 200 is ready, cached as a blob URL and sent with the uid\'s token', async () => {
  const { api, state } = harness()
  assert.equal(await api.loadProAsset('poster', 'c-4', 'pro-1'), 'ready')
  assert.equal(api.cachedAsset(proAssetKey('pro-1', 'poster', 'c-4')), 'blob:1')
  assert.deepEqual(state.calls, [{ url: '/api/ai?proAsset=poster&id=c-4', auth: 'Bearer tok-pro-1' }])
  assert.equal(await api.loadProAsset('poster', 'c-4', 'pro-1'), 'ready')
  assert.equal(state.calls.length, 1, 'a cached preview is not fetched again')
})

test('concurrent loads of one key share one fetch', async () => {
  const { api, state } = harness()
  const [a, b] = await Promise.all([
    api.loadProAsset('anim', 'c-5', 'pro-1'),
    api.loadProAsset('anim', 'c-5', 'pro-1'),
  ])
  assert.equal(a, 'ready')
  assert.equal(b, 'ready')
  assert.equal(state.calls.length, 1)
})

test('403 is denied and not remembered', async () => {
  const { api, state } = harness({ status: 403 })
  assert.equal(await api.loadProAsset('poster', 'c-4', 'pro-1'), 'denied')
  assert.equal(api.cachedAsset(proAssetKey('pro-1', 'poster', 'c-4')), null)
  state.status = 200
  assert.equal(await api.loadProAsset('poster', 'c-4', 'pro-1'), 'ready')
})

for (const status of [404, 503]) {
  test(`${status} is unavailable and remembered`, async () => {
    const { api, state } = harness({ status })
    assert.equal(await api.loadProAsset('page', 'c-4', 'pro-1'), 'unavailable')
    assert.equal(api.isAssetUnavailable(proAssetKey('pro-1', 'page', 'c-4')), true)
    assert.equal(await api.loadProAsset('page', 'c-4', 'pro-1'), 'unavailable')
    assert.equal(state.calls.length, 1)
  })
}

test('500 and a thrown fetch are errors, and a retry asks again', async () => {
  const { api, state } = harness({ status: 500 })
  assert.equal(await api.loadProAsset('poster', 'c-4', 'pro-1'), 'error')
  state.status = () => { throw new Error('offline') }
  assert.equal(await api.loadProAsset('poster', 'c-4', 'pro-1'), 'error')
  state.status = 200
  assert.equal(await api.loadProAsset('poster', 'c-4', 'pro-1'), 'ready')
  assert.equal(state.calls.length, 3)
})

test('a request keyed on another uid than the signed-in one is not sent', async () => {
  const { api, state } = harness({ uid: 'pro-2' })
  assert.equal(await api.loadProAsset('poster', 'c-4', 'pro-1'), 'error')
  assert.equal(state.calls.length, 0)
})

test('signed out, nothing is sent', async () => {
  const { api, state } = harness({ uid: null })
  assert.equal(await api.loadProAsset('poster', 'c-4', 'pro-1'), 'error')
  assert.equal(state.calls.length, 0)
})

test('a change of account drops the other account\'s previews and revokes their URLs', async () => {
  const { api, state } = harness()
  await api.loadProAsset('poster', 'c-4', 'pro-1')
  await api.loadProAsset('poster', 'c-5', 'pro-1')
  assert.equal(typeof state.listener, 'function')
  state.uid = 'pro-2'
  state.listener({ uid: 'pro-2' })
  assert.equal(api.cachedAsset(proAssetKey('pro-1', 'poster', 'c-4')), null)
  assert.deepEqual(state.revoked.sort(), ['blob:1', 'blob:2'])
})

test('sign-out drops everything', async () => {
  const { api, state } = harness()
  await api.loadProAsset('poster', 'c-4', 'pro-1')
  state.listener(null)
  assert.equal(api.cachedAsset(proAssetKey('pro-1', 'poster', 'c-4')), null)
  assert.deepEqual(state.revoked, ['blob:1'])
})

test('forgetAssetsExcept keeps the named account', async () => {
  const { api, state } = harness()
  await api.loadProAsset('poster', 'c-4', 'pro-1')
  api.forgetAssetsExcept('pro-1')
  assert.equal(api.cachedAsset(proAssetKey('pro-1', 'poster', 'c-4')), 'blob:1')
  assert.deepEqual(state.revoked, [])
})

test('a load in flight when the account changes resolves discarded and caches nothing', async () => {
  const { api, state } = harness()
  let release
  state.hold = new Promise((r) => { release = r })
  const pending = api.loadProAsset('poster', 'c-6', 'pro-1')
  // Let the request reach the fetch, then switch accounts before it answers.
  while (state.calls.length === 0) await new Promise((r) => setImmediate(r))
  api.forgetAssetsExcept('pro-2')
  release()
  assert.equal(await pending, 'discarded')
  assert.equal(api.cachedAsset(proAssetKey('pro-1', 'poster', 'c-6')), null)
  assert.deepEqual(state.created, [])
})
