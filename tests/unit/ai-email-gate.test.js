// Free use of the paid AI tasks needs a verified email.
//
// Every /api/ai task spends provider money and is metered per uid, so a
// throwaway email/password account used to bring its own free allowance. The
// handler now answers 403 { code: 'email-unverified' } to an unverified account
// on a free plan, before any meter is reserved and before any provider is
// reached. Google (which arrives verified), a verified password account and a
// paying account all pass.
//
// The handler cannot be imported here (it pulls in firebase-admin), so the
// module body is EXECUTED under node:vm with its imports replaced by stubs, the
// same way ai-provider-path.test.js drives it. The token verifier, the user
// document and the metering are stubs the test controls; the plan table
// (planForUser, generationBucket) is the real one, so "pro" means what the
// server means by it. No Firebase, Gemini or OpenRouter is ever reached: fetch
// throws, and every task's runner is replaced by a recorder.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto'

import { cleanKey } from '../../api/_lib/env.js'
import { planForUser, dailyLimitFor, monthlyLimitFor, modelFor } from '../../api/_lib/plans.js'
import { usageDayKey, usageMonthKey } from '../../api/_lib/aiUsage.js'
import {
  BRAND_STARTER_TOOL_ID, MAX_PROMPT_CHARS, MIN_PROMPT_CHARS, PALETTE_MIN_ROLES, PALETTE_MAX_ROLES,
  BASE_MIN, BASE_MAX, RATIO_MIN, RATIO_MAX, fontChoiceList, generationBucket, exhaustedError,
  parseStarterJson, sanitizeBrandStarter,
} from '../../api/_lib/aiGeneration.js'
import {
  altTextGenerationConfig, altTextOutcome, altTextCutoffReply, ALT_TEXT_CUTOFF_REFUND_CAP,
} from '../../api/_lib/altText.js'
import { classifyGeminiFinish, emptyReplyError, MAX_TOKENS_EMPTY_MESSAGE } from '../../api/_lib/geminiFinish.js'
import { mailFrom, REPLY_TO, sendingDomainConfigured } from '../../api/_lib/mail.js'
import { emailGateBody, EMAIL_UNVERIFIED_CODE } from '../../api/_lib/emailGate.js'

const AI_PATH = 'api/ai.js'
const aiSource = fs.readFileSync(path.join(process.cwd(), AI_PATH), 'utf8')

// The four tasks the handler serves; each spends provider money.
const PAID_TASKS = ['alt-text', 'scan-photo', 'generate-prompt', 'brand-starter']

const ACTIVE_PRO = { status: 'active', currentPeriodEnd: Date.now() + 20 * 86_400_000 }

const PASSWORD_UNVERIFIED = { uid: 'pw-1', email: 'pw@example.com', email_verified: false, firebase: { sign_in_provider: 'password' } }
const PASSWORD_VERIFIED = { uid: 'pw-2', email: 'pw2@example.com', email_verified: true, firebase: { sign_in_provider: 'password' } }
const GOOGLE = { uid: 'g-1', email: 'g@example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } }

/**
 * Execute api/ai.js against stubs. `decoded` is what the token verifier hands
 * back; `user` is the account's Firestore document. Returns the handler, a
 * `call(task)` that POSTs as that account, and the ledgers of what was reached.
 */
function loadAi({ decoded, user = {} }) {
  let out = aiSource
  const IMPORT = /^import\s[\s\S]*?\sfrom\s+'[^']+'\r?\n/m
  while (IMPORT.test(out)) out = out.replace(IMPORT, '')
  assert.ok(!/^\s*import\s/m.test(out), `${AI_PATH} still has an import the harness did not strip`)
  assert.match(out, /^export default async function handler/m, 'the harness could not find the default export')
  out = out.replace(/^export default async function handler/m, 'async function handler')
  while (/^export (const|function) /m.test(out)) out = out.replace(/^export (const|function) /m, '$1 ')

  const ledger = { metered: 0, ran: [], usageServed: 0 }

  const db = {
    doc: (p) => ({
      path: p,
      async get() { return { exists: p === `users/${decoded.uid}`, data: () => (p === `users/${decoded.uid}` ? user : undefined) } },
    }),
  }
  const sandbox = {
    console: { error() {}, log() {}, warn() {} },
    process: { env: { OPENROUTER_API_KEY: 'sk-or-v1-test0000', GEMINI_API_KEY: 'AIza-test0000' }, version: process.version },
    fetch: async (url) => { throw new Error(`the gate test reached the network: ${url}`) },
    setTimeout, clearTimeout, AbortController, Buffer,
    cleanKey, nodeTimingSafeEqual,
    mailFrom: () => mailFrom({}), sendingDomainConfigured: () => sendingDomainConfigured({}), REPLY_TO,
    adminDb: () => db,
    adminAuth: () => ({ verifyIdToken: async () => decoded }),
    credentialProblem: () => null,
    FieldValueIncrement: async () => 1,
    requireAdmin: async () => ({ ok: false, status: 401 }),
    emailGateBody,
    serveUsage: async (req, res) => { ledger.usageServed += 1; return res.status(200).json({ served: true }) },
    usageDayKey, usageMonthKey,
    planForUser, dailyLimitFor, monthlyLimitFor, modelFor,
    classifyGeminiFinish, emptyReplyError, MAX_TOKENS_EMPTY_MESSAGE,
    BRAND_STARTER_TOOL_ID, MAX_PROMPT_CHARS, MIN_PROMPT_CHARS, PALETTE_MIN_ROLES, PALETTE_MAX_ROLES,
    BASE_MIN, BASE_MAX, RATIO_MIN, RATIO_MAX, fontChoiceList, generationBucket, exhaustedError,
    parseStarterJson, sanitizeBrandStarter,
    // A meter that always has room: it calls the runner the way the real one
    // does and hands back what it returned, so a task that was reached is a
    // task that ran.
    runMeteredTask: async ({ meters, run }) => {
      ledger.metered += 1
      const result = await run(meters.map(() => 0), { refundCapped: () => {} })
      return { ok: true, result, counts: meters.map(() => 0) }
    },
    altTextGenerationConfig, altTextOutcome, altTextCutoffReply, ALT_TEXT_CUTOFF_REFUND_CAP,
    // The attempt limits and image check sit after this gate and are covered by
    // ai-attempt-limits.test.js; here they let everything through.
    aiAccountRefusal: async () => null,
    aiSharedRefusal: async () => null,
    imagePayloadProblem: () => null,
  }
  const api = vm.runInNewContext(`(function(){\n${out}\n;return { handler, TASKS };\n})()`, sandbox, { filename: AI_PATH })

  // The provider-facing runners are replaced by recorders; the registry, the
  // auth, the plan lookup and the gate are the real code.
  for (const [name, task] of Object.entries(api.TASKS)) {
    task.configured = () => true
    task.validate = undefined
    task.run = async () => { ledger.ran.push(name); return { ok: true, task: name } }
  }

  const response = () => ({
    statusCode: 200, body: undefined, headers: {},
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    setHeader(k, v) { this.headers[k] = v },
  })
  const call = async (task, { authorization = 'Bearer test-token' } = {}) => {
    const res = response()
    await api.handler({ method: 'POST', headers: { authorization }, body: { task }, query: {} }, res)
    return res
  }
  const get = async (query) => {
    const res = response()
    await api.handler({ method: 'GET', headers: { authorization: 'Bearer test-token' }, query }, res)
    return res
  }
  return { ...api, ledger, call, get }
}

// ── The harness runs the real file ──────────────────────────────────────────

test('the harness runs the real handler, so the refusals below are not vacuous', async () => {
  // Positive control: a verified account gets a 200 and the recorder runs. A
  // harness that refused everything would pass every "refused" test below.
  const ai = loadAi({ decoded: PASSWORD_VERIFIED })
  const res = await ai.call('alt-text')
  assert.equal(res.statusCode, 200)
  assert.deepEqual(ai.ledger.ran, ['alt-text'])
})

test('the paid task set is exactly the four the gate covers', () => {
  // A fifth task added without thinking about this gate fails here, and says so.
  const ai = loadAi({ decoded: PASSWORD_VERIFIED })
  assert.deepEqual(Object.keys(ai.TASKS).sort(), [...PAID_TASKS].sort(),
    'the task registry changed: decide whether the new task spends provider money, then update PAID_TASKS')
})

// ── The refusal ─────────────────────────────────────────────────────────────

for (const task of PAID_TASKS) {
  test(`an unverified password account is refused ${task} with 403 email-unverified`, async () => {
    const ai = loadAi({ decoded: PASSWORD_UNVERIFIED })
    const res = await ai.call(task)
    assert.equal(res.statusCode, 403)
    assert.equal(res.body.code, 'email-unverified')
    assert.match(res.body.error, /verify your email/i)
    assert.equal(ai.ledger.metered, 0, 'a refused request reserved quota')
    assert.deepEqual(ai.ledger.ran, [], 'a refused request reached the provider')
  })
}

test('the refusal body carries the code the client matches on', () => {
  assert.equal(EMAIL_UNVERIFIED_CODE, 'email-unverified')
  assert.deepEqual(emailGateBody({ emailVerified: false }), {
    error: 'Verify your email to use AI tools.',
    code: 'email-unverified',
  })
})

test('a token with no email_verified claim, or a non-boolean one, is treated as unverified', async () => {
  for (const claim of [undefined, null, 'true', 1]) {
    const decoded = { uid: 'odd-1', email: 'odd@example.com', ...(claim === undefined ? {} : { email_verified: claim }) }
    const ai = loadAi({ decoded })
    const res = await ai.call('generate-prompt')
    assert.equal(res.statusCode, 403, `email_verified=${String(claim)} was let through`)
  }
})

test('an unverified account cannot borrow an admin entitlement through its address', async () => {
  // email is read from the token only when verified, so the admin allowlist
  // never matches an unverified signup.
  const prior = process.env.ADMIN_EMAILS
  process.env.ADMIN_EMAILS = 'boss@example.com'
  try {
    const ai = loadAi({ decoded: { uid: 'imp-1', email: 'boss@example.com', email_verified: false } })
    const res = await ai.call('alt-text')
    assert.equal(res.statusCode, 403)
  } finally {
    if (prior === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = prior
  }
})

// ── Who passes ──────────────────────────────────────────────────────────────

for (const task of PAID_TASKS) {
  test(`a verified password account runs ${task}`, async () => {
    const ai = loadAi({ decoded: PASSWORD_VERIFIED })
    const res = await ai.call(task)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(ai.ledger.ran, [task])
  })
}

test('a Google account (email_verified from the provider) runs a paid task untouched', async () => {
  for (const task of PAID_TASKS) {
    const ai = loadAi({ decoded: GOOGLE })
    const res = await ai.call(task)
    assert.equal(res.statusCode, 200, `${task} refused a Google account`)
    assert.deepEqual(ai.ledger.ran, [task])
  }
})

// ── The paying-subscriber rule ──────────────────────────────────────────────
// Checkout does not require a verified address, so a subscriber can be
// unverified. They have paid for the capacity and are not locked out; only free
// use is gated.

test('an unverified account with an active Pro subscription still runs paid tasks', async () => {
  for (const task of PAID_TASKS) {
    const ai = loadAi({ decoded: PASSWORD_UNVERIFIED, user: { subscription: ACTIVE_PRO } })
    const res = await ai.call(task)
    assert.equal(res.statusCode, 200, `${task} locked out a paying account`)
    assert.deepEqual(ai.ledger.ran, [task])
  }
})

test('an unverified account holding a lifetime entitlement still runs paid tasks', async () => {
  const ai = loadAi({ decoded: PASSWORD_UNVERIFIED, user: { lifetimeEntitlement: { active: true } } })
  const res = await ai.call('generate-prompt')
  assert.equal(res.statusCode, 200)
})

test('a lapsed or revoked subscription is free use, so an unverified holder is refused', async () => {
  const expired = { status: 'active', currentPeriodEnd: Date.now() - 5 * 86_400_000 }
  const revoked = { ...ACTIVE_PRO, accessRevoked: true }
  const canceled = { status: 'canceled', currentPeriodEnd: Date.now() + 20 * 86_400_000 }
  for (const subscription of [expired, revoked, canceled]) {
    const ai = loadAi({ decoded: PASSWORD_UNVERIFIED, user: { subscription } })
    const res = await ai.call('alt-text')
    assert.equal(res.statusCode, 403, `a ${subscription.status} subscription counted as paid`)
  }
})

test('a trial or a past-due grace window is not paid capacity, so an unverified holder is refused', async () => {
  // Both resolve to the Pro plan (planForSubscription), so a gate keyed on the
  // plan id would have let them through. The exemption is active/lifetime only.
  const trialing = { status: 'trialing', currentPeriodEnd: Date.now() + 5 * 86_400_000 }
  const pastDue = { status: 'past_due', paymentFailedAt: Date.now() - 86_400_000, currentPeriodEnd: Date.now() + 20 * 86_400_000 }
  for (const subscription of [trialing, pastDue]) {
    assert.equal(planForUser({ subscription }).id, 'pro', `${subscription.status} no longer resolves to pro: the premise of this test moved`)
    for (const task of PAID_TASKS) {
      const ai = loadAi({ decoded: PASSWORD_UNVERIFIED, user: { subscription } })
      const res = await ai.call(task)
      assert.equal(res.statusCode, 403, `${task}: a ${subscription.status} subscription counted as paid`)
      assert.equal(ai.ledger.metered, 0)
    }
  }
})

test('a verified account on a trial still runs paid tasks', async () => {
  const trialing = { status: 'trialing', currentPeriodEnd: Date.now() + 5 * 86_400_000 }
  const ai = loadAi({ decoded: PASSWORD_VERIFIED, user: { subscription: trialing } })
  assert.equal((await ai.call('alt-text')).statusCode, 200)
})

test('emailGateBody: verified passes, active or lifetime passes, everything else is refused', () => {
  const active = ACTIVE_PRO
  assert.equal(emailGateBody({ emailVerified: true }), null)
  assert.equal(emailGateBody({ emailVerified: false, subscription: active }), null)
  assert.equal(emailGateBody({ emailVerified: false, lifetimeEntitlement: { active: true } }), null)
  assert.ok(emailGateBody({ emailVerified: false, lifetimeEntitlement: { active: true, revokedAt: 1 } }), 'a revoked lifetime entitlement is free use')
  assert.ok(emailGateBody({ emailVerified: false, subscription: { ...active, status: 'trialing' } }))
  assert.ok(emailGateBody({ emailVerified: false, subscription: { ...active, status: 'past_due', paymentFailedAt: Date.now() } }))
  assert.ok(emailGateBody({ emailVerified: false, subscription: { status: 'active', currentPeriodEnd: Date.now() - 5 * 86_400_000 } }), 'a lapsed period is free use')
  assert.ok(emailGateBody({ emailVerified: false }), 'nothing known must fail closed')
  assert.ok(emailGateBody({ emailVerified: undefined, subscription: null }))
  assert.ok(emailGateBody({ emailVerified: 'true' }), 'only a literal true is verified')
  assert.ok(emailGateBody({ emailVerified: false, planId: 'pro' }), 'a plan id alone no longer exempts anyone')
})

// ── What is not gated ───────────────────────────────────────────────────────

test('the usage read and the pre-task checks are not behind the gate', async () => {
  // GET ?usage=1 is a read of the account's own counts: no provider, no spend.
  const ai = loadAi({ decoded: PASSWORD_UNVERIFIED })
  const usage = await ai.get({ usage: '1' })
  assert.equal(usage.statusCode, 200)
  assert.equal(ai.ledger.usageServed, 1)
})

test('the order of refusals is unchanged: no token is 401, an unknown task is 400', async () => {
  const ai = loadAi({ decoded: PASSWORD_UNVERIFIED })
  const anonymous = await ai.call('alt-text', { authorization: '' })
  assert.equal(anonymous.statusCode, 401)
  const unknown = await ai.call('no-such-task')
  assert.equal(unknown.statusCode, 400)
})
