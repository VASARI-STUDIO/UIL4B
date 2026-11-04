// The browser half of the Pro libraries, run for real: src/utils/proLibrary.js
// with a stubbed fetch and a stubbed Firebase auth, plus the prompt repair that
// waits on it (src/utils/accountSync.js). The server half is
// library-endpoint.test.js; the page wording is locked-library-tease.test.js.
//
// Each test builds its own copy with createProLibrary, so no state carries over.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createProLibrary, libraryKey, deriveLibraryStatus } from '../../src/utils/proLibrary.js'
import { stripJs as stripComments } from '../helpers/strip-comments.js'
import { repairAfterSettle } from '../../src/utils/accountSync.js'
import { getPrompts } from '../../src/utils/promptStore.js'

const FREE_PROMPT = { id: 'c-1', title: 'Free one', text: 'Free text.', tags: 'a' }
const PRO_PROMPT = { id: 'c-pro', title: 'Pro one', text: 'Pro text.', tags: 'b' }
const ITEMS = { prompts: [FREE_PROMPT, PRO_PROMPT], palettes: [{ id: 'p-1', colors: ['#111111'] }] }

/** A fetch whose responses the test releases by hand. */
function fetchStub(respond) {
  const stub = {
    calls: [],
    pending: [],
    impl: (url, init) => {
      stub.calls.push({ url, init })
      return new Promise((resolve, reject) => {
        stub.pending.push(() => {
          try { resolve(respond(url, init)) } catch (error) { reject(error) }
        })
      })
    },
    release: () => { while (stub.pending.length) stub.pending.shift()() },
  }
  return stub
}
const answer = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body })
const okFor = (url) => {
  const kind = new URL(url, 'http://x').searchParams.get('library')
  return answer(200, { kind, total: ITEMS[kind].length, items: ITEMS[kind] })
}

/** Stubbed Firebase auth: `signInAs(uid)` / `signOut()` move currentUser and tell the listeners. */
function authStub(initialUid) {
  const state = { listeners: [], tokenCalls: 0 }
  const make = (uid) => (uid ? { uid, getIdToken: async () => { state.tokenCalls += 1; return `token-of-${uid}` } } : null)
  const sdk = {
    auth: { currentUser: make(initialUid) },
    onAuthStateChanged: (auth, cb) => { state.listeners.push(cb); return () => {} },
  }
  state.loadAuth = async () => sdk
  state.signInAs = (uid) => { sdk.auth.currentUser = make(uid); state.listeners.forEach((cb) => cb(sdk.auth.currentUser)) }
  state.signOut = () => state.signInAs(null)
  return state
}

function setup({ uid = 'u1', respond = okFor } = {}) {
  const auth = authStub(uid)
  const stub = fetchStub(respond)
  const library = createProLibrary({ loadAuth: auth.loadAuth, fetchImpl: stub.impl })
  return { auth, stub, library }
}
const tick = () => new Promise((resolve) => { setImmediate(resolve) })

/** Start a load, let the request go out, answer it, and return the outcome. */
async function loadAndAnswer({ library, stub }, kind, uid) {
  const run = library.loadProLibrary(kind, uid)
  await tick()
  stub.release()
  return run
}

test('concurrent loads of one uid + kind share a single fetch, and it carries that account\'s token', async () => {
  const { library, stub } = setup()
  const a = library.loadProLibrary('prompts', 'u1')
  const b = library.loadProLibrary('prompts', 'u1')
  await tick()
  stub.release()
  assert.deepEqual(await Promise.all([a, b]), ['ready', 'ready'])
  assert.equal(stub.calls.length, 1, 'one network request for two callers')
  assert.equal(stub.calls[0].url, '/api/ai?library=prompts')
  assert.equal(stub.calls[0].init.headers.Authorization, 'Bearer token-of-u1')
})

test('a loaded library is cached per uid + kind and not fetched again', async () => {
  const ctx = setup()
  const { library, stub, auth } = ctx
  assert.equal(await loadAndAnswer(ctx, 'prompts', 'u1'), 'ready')
  assert.deepEqual(library.cachedLibrary(libraryKey('u1', 'prompts')), ITEMS.prompts)
  assert.equal(library.hasCachedLibrary(libraryKey('u1', 'prompts')), true)

  assert.equal(await library.loadProLibrary('prompts', 'u1'), 'ready')
  assert.equal(stub.calls.length, 1, 'the second load is answered from memory')

  // A different kind is a different entry.
  assert.equal(await loadAndAnswer(ctx, 'palettes', 'u1'), 'ready')
  assert.equal(stub.calls.length, 2)
  assert.equal(library.hasCachedLibrary(libraryKey('u1', 'gradients')), false)

  // So is a different account.
  auth.signInAs('u2')
  assert.equal(await loadAndAnswer(ctx, 'prompts', 'u2'), 'ready')
  assert.equal(stub.calls.length, 3)
  assert.equal(stub.calls[2].init.headers.Authorization, 'Bearer token-of-u2')
})

test('a 403 is "not Pro": denied, nothing cached, and not asked again until cleared', async () => {
  const ctx = setup({ respond: () => answer(403, { error: 'Pro plan required' }) })
  const { library, stub } = ctx
  assert.equal(await loadAndAnswer(ctx, 'prompts', 'u1'), 'denied')
  const key = libraryKey('u1', 'prompts')
  assert.equal(library.isLibraryDenied(key), true)
  assert.equal(library.hasCachedLibrary(key), false)
  assert.equal(library.cachedLibraryOfKind('prompts', 'u1'), null)

  assert.equal(await library.loadProLibrary('prompts', 'u1'), 'denied')
  assert.equal(stub.calls.length, 1, 'a denied account is not asked again')

  library.clearLibraryDenied(key)
  assert.equal(library.isLibraryDenied(key), false)
})

test('a 5xx, a network failure and a malformed body are errors, never cached, and a retry asks again', async () => {
  for (const respond of [
    () => answer(503, {}),
    () => { throw new TypeError('Failed to fetch') },
    () => answer(200, { kind: 'palettes', items: [] }), // the wrong kind
    () => answer(200, { kind: 'prompts' }), // no items
    () => ({ status: 200, ok: true, json: async () => { throw new SyntaxError('bad json') } }),
  ]) {
    const ctx = setup({ respond })
    const { library, stub } = ctx
    assert.equal(await loadAndAnswer(ctx, 'prompts', 'u1'), 'error')
    assert.equal(library.hasCachedLibrary(libraryKey('u1', 'prompts')), false)
    assert.equal(library.isLibraryDenied(libraryKey('u1', 'prompts')), false)

    assert.equal(await loadAndAnswer(ctx, 'prompts', 'u1'), 'error')
    assert.equal(stub.calls.length, 2, 'the failure was not remembered')
  }
})

test('no signed-in user, or a different one than the load was keyed on, sends nothing', async () => {
  const signedOut = setup({ uid: null })
  assert.equal(await signedOut.library.loadProLibrary('prompts', 'u1'), 'error')
  assert.equal(signedOut.stub.calls.length, 0)

  const other = setup({ uid: 'u2' })
  assert.equal(await other.library.loadProLibrary('prompts', 'u1'), 'error')
  assert.equal(other.stub.calls.length, 0, 'u1\'s request never goes out under u2\'s token')
  assert.equal(other.auth.tokenCalls, 0)
})

test('the cache answers only for the uid it was fetched for', async () => {
  const ctx = setup()
  const { library } = ctx
  await loadAndAnswer(ctx, 'prompts', 'u1')
  assert.deepEqual(library.cachedLibraryOfKind('prompts', 'u1'), ITEMS.prompts)
  assert.equal(library.cachedLibraryOfKind('prompts', 'u2'), null, 'another account reads nothing')
  assert.equal(library.cachedLibraryOfKind('prompts', null), null)
  assert.equal(library.cachedLibraryOfKind('prompts'), null)
  assert.equal(library.cachedLibraryOfKind('palettes', 'u1'), null)
})

test('an account switch or a sign-out empties the cache with no hook mounted', async () => {
  const ctx = setup()
  const { library, stub, auth } = ctx
  await loadAndAnswer(ctx, 'prompts', 'u1')
  assert.deepEqual(library.cachedLibraryOfKind('prompts', 'u1'), ITEMS.prompts)

  auth.signInAs('u2')
  assert.equal(library.cachedLibraryOfKind('prompts', 'u1'), null, 'u1\'s rows are gone once u2 is signed in')
  assert.equal(library.cachedLibraryOfKind('prompts', 'u2'), null)

  // Back to u1, load again, then sign out.
  auth.signInAs('u1')
  await loadAndAnswer(ctx, 'prompts', 'u1')
  assert.equal(stub.calls.length, 2, 'u1 was refetched, not remembered')
  auth.signOut()
  assert.equal(library.cachedLibraryOfKind('prompts', 'u1'), null)
})

test('the same account staying signed in keeps its cache through an auth event', async () => {
  const ctx = setup()
  await loadAndAnswer(ctx, 'prompts', 'u1')
  ctx.auth.signInAs('u1') // a token refresh reports the same user
  assert.deepEqual(ctx.library.cachedLibraryOfKind('prompts', 'u1'), ITEMS.prompts)
})

test('a response that lands after sign-out is discarded and not cached', async () => {
  const { library, stub, auth } = setup()
  const run = library.loadProLibrary('prompts', 'u1')
  await tick() // the request is in flight
  assert.equal(stub.calls.length, 1)
  auth.signOut()
  stub.release()
  assert.equal(await run, 'discarded')
  assert.equal(library.hasCachedLibrary(libraryKey('u1', 'prompts')), false)
  assert.equal(library.cachedLibraryOfKind('prompts', 'u1'), null)
})

test('a late 403 after sign-out does not mark the account as denied', async () => {
  const { library, stub, auth } = setup({ respond: () => answer(403, {}) })
  const run = library.loadProLibrary('prompts', 'u1')
  await tick()
  auth.signOut()
  stub.release()
  assert.equal(await run, 'discarded')
  assert.equal(library.isLibraryDenied(libraryKey('u1', 'prompts')), false)
})

test('a response that lands after an account switch is discarded for the old account', async () => {
  const { library, stub, auth } = setup()
  const run = library.loadProLibrary('prompts', 'u1')
  await tick()
  auth.signInAs('u2')
  stub.release()
  assert.equal(await run, 'discarded')
  assert.equal(library.cachedLibraryOfKind('prompts', 'u1'), null)
  assert.equal(library.cachedLibraryOfKind('prompts', 'u2'), null)
})

test('an account that is no longer Pro can be dropped on its own', async () => {
  const ctx = setup()
  const { library } = ctx
  await loadAndAnswer(ctx, 'prompts', 'u1')
  library.forgetLibrariesOf('u2')
  assert.deepEqual(library.cachedLibraryOfKind('prompts', 'u1'), ITEMS.prompts, 'another uid is untouched')
  library.forgetLibrariesOf('u1')
  assert.equal(library.cachedLibraryOfKind('prompts', 'u1'), null)
})

test('listeners hear a library arrive, once per fetch, and never a failure', async () => {
  const ctx = setup()
  const { library } = ctx
  const heard = []
  const off = library.onLibraryReady((kind, uid) => heard.push([kind, uid]))
  await loadAndAnswer(ctx, 'prompts', 'u1')
  assert.deepEqual(heard, [['prompts', 'u1']])
  await library.loadProLibrary('prompts', 'u1') // cached: no second event
  assert.equal(heard.length, 1)
  off()
  await loadAndAnswer(ctx, 'palettes', 'u1')
  assert.equal(heard.length, 1, 'an unsubscribed listener hears nothing')

  const failing = setup({ respond: () => answer(500, {}) })
  const failed = []
  failing.library.onLibraryReady((kind, uid) => failed.push([kind, uid]))
  await loadAndAnswer(failing, 'prompts', 'u1')
  assert.deepEqual(failed, [])
})

// ── The prompt repair that waits for the Pro prompts ────────────────────────

function memoryStorage(init) {
  const m = new Map(Object.entries(init))
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)) },
    removeItem: (k) => { m.delete(k) },
  }
}
const savedProPrompt = () => memoryStorage({
  'vs-prompts': JSON.stringify([]),
  'vs-saved-prompt-ids': JSON.stringify([{ id: 'c-pro', saved: true, at: 1000 }]),
})

test('a saved Pro prompt with no copy is healed once the Pro prompts arrive for that account', async () => {
  const storage = savedProPrompt()
  const ctx = setup()
  const { library } = ctx
  // What loadCommunityPrompts does: the account's own fetched rows, else the free ones.
  const loadCatalog = async (uid) => library.cachedLibraryOfKind('prompts', uid) || [FREE_PROMPT]
  const announced = []
  const opts = {
    uid: 'u1', loadCatalog, now: 9000, announce: (keys) => announced.push(keys),
    onProLibrary: async (listener) => library.onLibraryReady(listener),
  }

  await repairAfterSettle({ data: {} }, storage, opts)
  assert.deepEqual(getPrompts(storage), [], 'the free catalog cannot supply a Pro prompt')

  await loadAndAnswer(ctx, 'prompts', 'u1')
  await tick()

  assert.equal(getPrompts(storage).filter((p) => p.sourceId === 'c-pro').length, 1, 'the copy was added from the fetched library')
  assert.deepEqual(announced, [['vs-prompts']])
})

test('the heal runs once, only for the settled account, and a later settle replaces a waiting one', async () => {
  const storage = savedProPrompt()
  const ctx = setup()
  const { library, auth } = ctx
  let waiting = 0
  let repairs = 0
  const opts = {
    uid: 'u1', now: 9000,
    loadCatalog: async (uid) => { repairs += 1; return library.cachedLibraryOfKind('prompts', uid) || [FREE_PROMPT] },
    onProLibrary: async (listener) => {
      waiting += 1
      const off = library.onLibraryReady(listener)
      return () => { waiting -= 1; off() }
    },
  }
  await repairAfterSettle({ data: {} }, storage, opts)
  await repairAfterSettle({ data: {} }, storage, opts) // replaces the first waiting repair
  assert.equal(repairs, 2)
  assert.equal(waiting, 1, 'one waiting repair, not two')

  // Another account's prompts arriving does not wake it.
  auth.signInAs('u2')
  await loadAndAnswer(ctx, 'prompts', 'u2')
  await tick()
  assert.equal(repairs, 2)
  assert.deepEqual(getPrompts(storage), [])

  // The settled account's do, and only once.
  auth.signInAs('u1')
  await loadAndAnswer(ctx, 'prompts', 'u1')
  await tick()
  assert.equal(repairs, 3)
  assert.equal(waiting, 0)
  assert.equal(getPrompts(storage).filter((p) => p.sourceId === 'c-pro').length, 1)
  await loadAndAnswer(ctx, 'palettes', 'u1')
  await tick()
  assert.equal(repairs, 3, 'a second library arriving does not run it again')
})

test('with no uid, or when no saved id is missing a copy, nothing waits for the Pro prompts', async () => {
  let subscribed = 0
  const onProLibrary = async () => { subscribed += 1; return () => {} }
  await repairAfterSettle({ data: {} }, savedProPrompt(), { loadCatalog: async () => [FREE_PROMPT], onProLibrary })
  assert.equal(subscribed, 0, 'no uid, no wait')

  const complete = memoryStorage({
    'vs-prompts': JSON.stringify([{ id: 5000, sourceId: 'c-1', savedAt: 5000, title: 'Free one', text: 'Free text.', tags: 'a', img: '', date: '1/1/2026' }]),
    'vs-saved-prompt-ids': JSON.stringify([{ id: 'c-1', saved: true, at: 1000 }]),
  })
  await repairAfterSettle({ data: {} }, complete, { uid: 'u1', loadCatalog: async () => [FREE_PROMPT], onProLibrary })
  assert.equal(subscribed, 0, 'nothing missing, no wait')
})

// ── The status the pages branch on ───────────────────────────────────────────
// deriveLibraryStatus is the pure half of src/hooks/useProLibrary.js.

test('a signed-in account whose plan is unresolved is resolving, never idle, so no wall shows', () => {
  assert.equal(deriveLibraryStatus({ wanted: true, enabled: false, resolving: true }), 'resolving')
})

test('a cold anonymous visitor, or an account that resolved to free, is idle and sees the wall at once', () => {
  assert.equal(deriveLibraryStatus({ wanted: true, enabled: false, resolving: false }), 'idle')
  assert.equal(deriveLibraryStatus({}), 'idle')
})

test('a caller that has not asked for the library is idle even while the plan resolves', () => {
  assert.equal(deriveLibraryStatus({ wanted: false, enabled: false, resolving: true }), 'idle')
  assert.equal(deriveLibraryStatus({ wanted: false, enabled: true, cached: true }), 'idle')
})

test('an enabled library walks loading, ready, error and refused in that precedence', () => {
  const base = { wanted: true, enabled: true }
  assert.equal(deriveLibraryStatus({ ...base }), 'loading')
  assert.equal(deriveLibraryStatus({ ...base, cached: true }), 'ready')
  assert.equal(deriveLibraryStatus({ ...base, failed: true }), 'error')
  assert.equal(deriveLibraryStatus({ ...base, denied: true }), 'refused')
  assert.equal(deriveLibraryStatus({ ...base, cached: true, denied: true }), 'ready', 'a library in hand wins')
})

test('a 403 shows as refused, and Retry (clear the denial, ask again) recovers', async () => {
  let code = 403
  const ctx = setup({ respond: (url) => (code === 403 ? answer(403, { error: 'Pro plan required' }) : okFor(url)) })
  const { library } = ctx
  const key = libraryKey('u1', 'prompts')
  assert.equal(await loadAndAnswer(ctx, 'prompts', 'u1'), 'denied')
  const statusNow = () => deriveLibraryStatus({
    wanted: true, enabled: true, cached: library.hasCachedLibrary(key), denied: library.isLibraryDenied(key),
  })
  assert.equal(statusNow(), 'refused')

  // What the hook's retry does: forget the denial, then load again.
  code = 200
  library.clearLibraryDenied(key)
  assert.equal(statusNow(), 'loading')
  assert.equal(await loadAndAnswer(ctx, 'prompts', 'u1'), 'ready')
  assert.equal(statusNow(), 'ready')
})

test('the hook derives resolving from the session hint and the plan, and retry clears the denial', () => {
  const src = stripComments(fs.readFileSync(path.join(process.cwd(), 'src/hooks/useProLibrary.js'), 'utf8'))
  assert.ok(/authLoading === true && readSessionHint\(\)/.test(src), 'a returning session must read as resolving while auth loads')
  assert.ok(/uid != null && planKnown !== true/.test(src), 'a signed-in account with an unknown plan must read as resolving')
  assert.ok(/const retry = useCallback\(\(\) => \{[\s\S]*?clearLibraryDenied\(key\)[\s\S]*?setAttempt/.test(src), 'retry must clear the denial and bump the attempt')
  assert.ok(/\[enabled, kind, uid, key, failedKey, attempt\]/.test(src), 'the fetch effect must depend on the attempt')
})
