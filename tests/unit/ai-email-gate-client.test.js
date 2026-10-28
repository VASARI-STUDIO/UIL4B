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
} from '../../src/utils/aiEmailGate.js'
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

test('the prompt re-reads the account and mints a fresh token before it retries', () => {
  const src = read('src/components/VerifyEmailPrompt.jsx')
  assert.match(src, /refreshEmailVerified\(\)/, 'I\'ve verified no longer re-reads the account')
  assert.match(src, /verifyCheckOutcome\(await refreshEmailVerified\(\)\)/)
  assert.match(src, /sendVerificationEmail\(\)/, 'Resend link no longer sends a link')
  assert.match(src, /VERIFY_RESEND_COOLDOWN_S/, 'the resend cooldown is gone')
  // The token refresh itself lives in the shared auth context: reload() and then
  // getIdToken(true), so the next request carries email_verified.
  const auth = read('src/contexts/AuthContext.jsx')
  assert.match(auth, /A\.reload\(firebaseUser\)/)
  assert.match(auth, /getIdToken\(true\)/)
})
