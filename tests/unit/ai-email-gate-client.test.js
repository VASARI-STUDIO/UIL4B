// The client half of the verified-email gate: what the AI tools do with a 403
// `email-unverified`. The mapping and the copy are pure (src/utils/aiEmailGate.js)
// and run for real here. The .jsx files cannot be loaded by node, so what is
// asserted about them is WIRING: every place that POSTs a task to /api/ai asks
// the mapping about the reply before it treats a non-OK reply as an error.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  EMAIL_UNVERIFIED_CODE,
  VERIFY_PROMPT_TITLE,
  VERIFY_NOT_YET,
  VERIFY_CHECK_FAILED,
  isEmailUnverifiedReply,
  verifyPromptSent,
  verifyCheckOutcome,
  resendLabel,
  checkVerified,
  verifyPromptNote,
  verifiedWhileOpen,
  focusAfterVerified,
  beginVerifyRun,
  refuseForVerify,
  verifyRetryTarget,
} from '../../src/utils/aiEmailGate.js'
import { reloadVerified, VERIFY_RESEND_COOLDOWN_S } from '../../src/utils/emailVerification.js'
import { createResendStore } from '../../src/utils/verifyResendStore.js'
import { EMAIL_UNVERIFIED_CODE as SERVER_CODE } from '../../api/_lib/emailGate.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

test('the client matches the code the server sends', () => {
  assert.equal(EMAIL_UNVERIFIED_CODE, SERVER_CODE)
})

test('only a 403 carrying the email-unverified code is the verify prompt', () => {
  assert.equal(isEmailUnverifiedReply(403, { code: 'email-unverified', error: 'x' }), true)
  // Every other refusal keeps its own handling.
  assert.equal(isEmailUnverifiedReply(403, { error: 'Forbidden' }), false)
  assert.equal(isEmailUnverifiedReply(403, { code: 'other' }), false)
  assert.equal(isEmailUnverifiedReply(429, { code: 'email-unverified' }), false)
  assert.equal(isEmailUnverifiedReply(200, { code: 'email-unverified' }), false)
  assert.equal(isEmailUnverifiedReply(403, undefined), false)
  assert.equal(isEmailUnverifiedReply(403, null), false)
  assert.equal(isEmailUnverifiedReply(403, {}), false)
})

test('the prompt reads as the agreed sentence with the address in it', () => {
  assert.equal(`${VERIFY_PROMPT_TITLE} ${verifyPromptSent('sam@example.com')}`,
    'Verify your email to use AI tools. We sent a link to sam@example.com.')
  assert.equal(verifyPromptSent(''), 'We sent a link to your email.')
  assert.equal(verifyPromptSent(undefined), 'We sent a link to your email.')
})

test("I've verified retries only when the re-read shows the address verified", () => {
  assert.deepEqual(verifyCheckOutcome(true), { retry: true, message: '' })
  assert.deepEqual(verifyCheckOutcome(false), { retry: false, message: VERIFY_NOT_YET })
  // The account changed mid-read: nothing to retry and nothing to say.
  assert.deepEqual(verifyCheckOutcome(null), { retry: false, message: '' })
  assert.deepEqual(verifyCheckOutcome(undefined), { retry: false, message: '' })
})

test('the resend label goes Resend link, Sending, Sent with the seconds left, then Resend link', () => {
  assert.equal(resendLabel('idle', 0), 'Resend link')
  assert.equal(resendLabel('sending', 0), 'Sending…')
  assert.equal(resendLabel('sent', 30), 'Sent · 30s')
  assert.equal(resendLabel('sent', 1), 'Sent · 1s')
  assert.equal(resendLabel('sent', 0), 'Resend link')
  assert.equal(resendLabel('failed', 0), 'Resend link')
})

test('the copy is sentence case with no em dashes', () => {
  for (const text of [VERIFY_PROMPT_TITLE, VERIFY_NOT_YET, VERIFY_CHECK_FAILED, verifyPromptSent('a@b.co')]) {
    assert.ok(!/[—–]/.test(text), `dash in: ${text}`)
  }
  const prompt = read('src/components/VerifyEmailPrompt.jsx')
  assert.ok(!prompt.includes('—'), 'em dash in the prompt component')
})

// ── Wiring ──────────────────────────────────────────────────────────────────

const TOOL_PAGES = [
  ['src/pages/AltTextGenerator.jsx', 1],
  ['src/pages/AiPromptGenerator.jsx', 2], // generate and photo scan
  ['src/pages/BrandStarter.jsx', 1],
]

for (const [file, sites] of TOOL_PAGES) {
  test(`${file} asks about the verify refusal at each of its ${sites} /api/ai call(s)`, () => {
    const src = read(file)
    const posts = src.match(/fetch\('\/api\/ai'/g) || []
    assert.equal(posts.length, sites, 'the number of /api/ai POST sites changed: wire the new one and update this table')
    const asks = src.match(/isEmailUnverifiedReply\(r\.status, data\)/g) || []
    assert.equal(asks.length, sites, 'a call site does not check for the verify refusal')
    assert.match(src, /<VerifyEmailPrompt onVerified=/, 'the page never renders the prompt')
  })

  test(`${file} checks the refusal before it turns a non-OK reply into an error`, () => {
    const src = read(file)
    const sections = src.split(/fetch\('\/api\/ai'/).slice(1)
    for (const section of sections) {
      const asked = section.indexOf('isEmailUnverifiedReply(')
      const thrown = section.search(/if \(!r\.ok\)/)
      assert.ok(asked > -1 && thrown > -1 && asked < thrown,
        'the verify check must come before `if (!r.ok) throw`, or the refusal shows as a plain error')
    }
  })
}

test('the prompt checks through checkVerified, shares the resend state and acts once', () => {
  const src = read('src/components/VerifyEmailPrompt.jsx')
  assert.match(src, /checkVerified\(refreshEmailVerified\)/, "I've verified no longer re-reads the account")
  assert.match(src, /useVerifyResend\(/, 'Resend link has its own state again, apart from the reminder bar')
  assert.match(src, /verifiedWhileOpen\(/, 'the prompt no longer reacts to a verification it did not start')
  assert.match(src, /focusAfterVerified\(/, 'focus is no longer moved before the prompt leaves')
  // Both routes to "verified" go through finish(), and finish() runs onVerified once.
  assert.equal((src.match(/onVerified\?\.\(\)/g) || []).length, 1, 'onVerified is called from more than one place')
  assert.match(src, /if \(done\.current\) return/)
  // The bar and the prompt read one store, so one cooldown.
  const stack = read('src/components/NoticeStack.jsx')
  assert.match(stack, /useVerifyResend\(/)
})

// ── The token refresh ───────────────────────────────────────────────────────

/** A stand-in auth SDK and user: `reload` flips the flag the way Firebase does. */
function fakeAuth({ verifiedAfterReload, mintFails = false, reloadFails = false, swapUser = false }) {
  const calls = []
  const user = {
    emailVerified: false,
    async getIdToken(force) {
      calls.push(['getIdToken', force])
      if (mintFails) throw Object.assign(new Error('network'), { code: 'auth/network-request-failed' })
      return 'token'
    },
  }
  const A = {
    auth: { currentUser: user },
    async reload(u) {
      calls.push(['reload'])
      if (reloadFails) throw new Error('reload failed')
      u.emailVerified = verifiedAfterReload
      if (swapUser) A.auth.currentUser = { other: true }
    },
  }
  return { A, user, calls }
}

test('a verified account gets a fresh ID token, and the answer is true', async () => {
  const { A, user, calls } = fakeAuth({ verifiedAfterReload: true })
  assert.equal(await reloadVerified(A, user), true)
  assert.deepEqual(calls, [['reload'], ['getIdToken', true]])
})

test('an unverified account is read and answers false without minting a token', async () => {
  const { A, user, calls } = fakeAuth({ verifiedAfterReload: false })
  assert.equal(await reloadVerified(A, user), false)
  assert.deepEqual(calls, [['reload']])
})

test('a failed forced token refresh rejects rather than answering verified on a stale token', async () => {
  const { A, user } = fakeAuth({ verifiedAfterReload: true, mintFails: true })
  await assert.rejects(() => reloadVerified(A, user), /network/)
})

test('a failed reload rejects', async () => {
  const { A, user } = fakeAuth({ verifiedAfterReload: true, reloadFails: true })
  await assert.rejects(() => reloadVerified(A, user), /reload failed/)
})

test('an account that changed mid-read answers null', async () => {
  const { A, user } = fakeAuth({ verifiedAfterReload: true, swapUser: true })
  assert.equal(await reloadVerified(A, user), null)
})

test("I've verified: a rejected refresh shows the could-not-check note and never retries", async () => {
  const failed = await checkVerified(async () => { throw new Error('token refresh failed') })
  assert.deepEqual(failed, { retry: false, message: VERIFY_CHECK_FAILED })
  assert.deepEqual(await checkVerified(async () => true), { retry: true, message: '' })
  assert.deepEqual(await checkVerified(async () => false), { retry: false, message: VERIFY_NOT_YET })
  assert.deepEqual(await checkVerified(async () => null), { retry: false, message: '' })
})

test('the prompt through the real chain: a failed token mint ends as the could-not-check note', async () => {
  const { A, user } = fakeAuth({ verifiedAfterReload: true, mintFails: true })
  const outcome = await checkVerified(() => reloadVerified(A, user))
  assert.equal(outcome.retry, false)
  assert.equal(outcome.message, VERIFY_CHECK_FAILED)
})

// ── The prompt reacting to a verification it did not start ────────────────

test('the prompt fires only when the same account stops owing verification while it is open', () => {
  const open = { wasOwed: true, owed: true, openedFor: 'u1', uid: 'u1' }
  assert.equal(verifiedWhileOpen(open), false, 'still owing')
  assert.equal(verifiedWhileOpen({ ...open, owed: false }), true)
  // Opened on an account that never owed it: verifying cannot be the cause.
  assert.equal(verifiedWhileOpen({ ...open, wasOwed: false, owed: false }), false)
  // Signing out also ends the debt, and is not a verification.
  assert.equal(verifiedWhileOpen({ ...open, owed: false, uid: undefined }), false)
  // Another account signed in.
  assert.equal(verifiedWhileOpen({ ...open, owed: false, uid: 'u2' }), false)
})

// ── Focus when the prompt leaves ───────────────────────────────────────────

test('focus goes to the tool-supplied target, else to <main>, so it never drops to <body>', () => {
  const focused = []
  const el = (name) => ({ focus: () => focused.push(name) })
  const doc = { getElementById: (id) => (id === 'main' ? el('main') : null) }
  focusAfterVerified(doc)
  focusAfterVerified(doc, () => el('generate'))
  focusAfterVerified(doc, () => null)
  assert.deepEqual(focused, ['main', 'generate', 'main'])
  assert.equal(focusAfterVerified({ getElementById: () => null }), null, 'no target is not a crash')
})

// ── The AltText run state ──────────────────────────────────────────────────

function runState() {
  const needed = []
  return {
    needed,
    state: { setNeeded: (v) => needed.push(v), stop: { current: true }, retryRef: { current: { id: 'stale', batch: false } } },
  }
}

test('starting a run clears an earlier refusal: prompt hidden, stop released, retry reset', () => {
  const one = runState()
  beginVerifyRun(one.state, null)
  assert.deepEqual(one.needed, [false])
  assert.equal(one.state.stop.current, false)
  assert.equal(one.state.retryRef.current, null)

  const batch = runState()
  beginVerifyRun(batch.state, { id: null, batch: true })
  assert.deepEqual(batch.needed, [false])
  assert.deepEqual(batch.state.retryRef.current, { id: null, batch: true })
})

test('a refusal stops the run, shows the prompt, and the first refusal fixes the retry target', () => {
  const run = runState()
  run.state.retryRef.current = null
  refuseForVerify(run.state, 'card-3')
  assert.deepEqual(run.needed, [true])
  assert.equal(run.state.stop.current, true)
  assert.deepEqual(run.state.retryRef.current, { id: 'card-3', batch: false })
  // A second refusal in the same run does not move the target.
  refuseForVerify(run.state, 'card-4')
  assert.deepEqual(run.state.retryRef.current, { id: 'card-3', batch: false })
  // A batch keeps its batch target.
  const batch = runState()
  batch.state.retryRef.current = { id: null, batch: true }
  refuseForVerify(batch.state, 'card-1')
  assert.deepEqual(batch.state.retryRef.current, { id: null, batch: true })
})

test('what to repeat once verified: the batch, the one card, or nothing', () => {
  const items = [{ id: 'a' }, { id: 'b' }]
  assert.deepEqual(verifyRetryTarget({ id: null, batch: true }, items), { kind: 'batch' })
  assert.deepEqual(verifyRetryTarget({ id: 'b', batch: false }, items), { kind: 'one', item: items[1] })
  assert.deepEqual(verifyRetryTarget({ id: 'gone', batch: false }, items), { kind: 'none' })
  assert.deepEqual(verifyRetryTarget(null, items), { kind: 'none' })
})

test('the AltText page resets the refusal at the top of generateOne and generateAll', () => {
  const src = read('src/pages/AltTextGenerator.jsx')
  for (const [name, retry] of [['generateOne', 'null'], ['generateAll', '\\{ id: null, batch: true \\}']]) {
    const start = src.indexOf(`const ${name} = async`)
    assert.ok(start > -1, `${name} not found`)
    const rest = src.slice(start)
    const end = rest.search(/\r?\n {2}\}\r?\n/)
    assert.ok(end > 0, `${name} has no closing brace at function indent`)
    const body = rest.slice(0, end)
    assert.match(body, new RegExp(`beginVerifyRun\\(verifyRun, ${retry}\\)`), `${name} does not reset the verify prompt`)
  }
  assert.match(src, /refuseForVerify\(verifyRun, item\.id\)/)
})

// ── The note after Resend ──────────────────────────────────────────────────

test('after a resend the note says New link sent. and does not repeat the address', () => {
  assert.equal(verifyPromptNote({ checkNote: '', sendState: 'sent' }), 'New link sent.')
  assert.ok(!/@/.test(verifyPromptNote({ checkNote: '', sendState: 'sent' })))
  assert.equal(verifyPromptNote({ checkNote: '', sendState: 'idle' }), '')
  assert.equal(verifyPromptNote({ checkNote: '', sendState: 'failed' }), '')
  // A check's answer outranks the send note.
  assert.equal(verifyPromptNote({ checkNote: VERIFY_NOT_YET, sendState: 'sent' }), VERIFY_NOT_YET)
})

// ── One resend state for the bar and the prompt ────────────────────────────

/** A store on a fake clock and a fake interval the test steps by hand. */
function steppedStore() {
  let t = 1_000_000
  let tickFn = null
  const store = createResendStore({
    now: () => t,
    every: (fn) => { tickFn = fn; return 1 },
    stop: () => { tickFn = null },
  })
  const advance = (seconds) => { t += seconds * 1000; tickFn?.() }
  return { store, advance, running: () => tickFn !== null }
}

test('a send from one surface puts the same cooldown on the other', async () => {
  const { store, advance } = steppedStore()
  let sends = 0
  await store.resend('u1', async () => { sends += 1 })
  // The bar and the prompt both read view('u1'): one state, one count.
  const bar = store.view('u1')
  const prompt = store.view('u1')
  assert.equal(bar.state, 'sent')
  assert.equal(bar.left, VERIFY_RESEND_COOLDOWN_S)
  assert.equal(prompt.left, bar.left)
  // The other surface cannot send a second link inside the cooldown.
  await store.resend('u1', async () => { sends += 1 })
  assert.equal(sends, 1)
  advance(10)
  assert.equal(store.view('u1').left, VERIFY_RESEND_COOLDOWN_S - 10)
  advance(VERIFY_RESEND_COOLDOWN_S)
  assert.equal(store.view('u1').left, 0)
  await store.resend('u1', async () => { sends += 1 })
  assert.equal(sends, 2, 'resend is offered again once the cooldown ends')
})

test('the cooldown timer stops when it reaches zero', async () => {
  const { store, advance, running } = steppedStore()
  await store.resend('u1', async () => {})
  assert.equal(running(), true)
  advance(VERIFY_RESEND_COOLDOWN_S)
  assert.equal(running(), false)
})

test('a send in flight blocks a second press, and a failure shows its wording and no cooldown', async () => {
  const { store } = steppedStore()
  let release
  const pending = store.resend('u1', () => new Promise((resolve) => { release = resolve }))
  assert.equal(store.view('u1').state, 'sending')
  let second = 0
  await store.resend('u1', async () => { second += 1 })
  assert.equal(second, 0)
  release()
  await pending
  const failing = steppedStore()
  await failing.store.resend('u1', async () => { throw { code: 'auth/too-many-requests' } })
  const view = failing.store.view('u1')
  assert.equal(view.state, 'failed')
  assert.equal(view.error, 'Too many links sent. Wait a few minutes.')
  assert.equal(view.left, 0)
})

test("another account never inherits this account's cooldown", async () => {
  const { store } = steppedStore()
  await store.resend('u1', async () => {})
  assert.equal(store.view('u2').state, 'idle')
  assert.equal(store.view('u2').left, 0)
  assert.equal(store.view(undefined).state, 'idle')
})

test('the store tells subscribers when it changes', async () => {
  const { store } = steppedStore()
  let heard = 0
  const off = store.subscribe(() => { heard += 1 })
  await store.resend('u1', async () => {})
  assert.ok(heard >= 2, 'sending and sent are both announced')
  off()
  const before = heard
  store.reset()
  assert.equal(heard, before)
})
