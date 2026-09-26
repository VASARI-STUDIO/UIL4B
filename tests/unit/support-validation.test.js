// /api/support takes an unauthenticated body from a public form. Two things
// about it were found on the 2026-09-06 engineering review and fixed together:
//
//   1. Its validation ran `.length` and `.trim()` on whatever arrived, so a
//      non-string `message` (an array passes `!message`) threw a TypeError out
//      of the handler — a crash on demand from the one endpoint with no session.
//   2. It bootstrapped Firebase Admin with its OWN copy of initializeApp():
//      a bare JSON.parse and a hard-coded projectId of 'uil4b'. Measured with a
//      generated service account: under the base64 encoding that
//      api/_lib/firebase-admin.js documents as the safer one, this route came
//      up on ApplicationDefaultCredential with no service account, and its
//      projectId overrode the key's own project_id.
//
// The validation is now a pure function, tested here against the real module.
// The bootstrap is asserted at the call site: there must be exactly one.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { validateSupportBody, MESSAGE_MAX, SUBJECT_MAX, EMAIL_MAX } from '../../api/support.js'

const NOW = new Date('2026-09-06T10:00:00Z')

// ── Type guards: a malformed body is a 400, never an exception ──────────────

test('a non-string message is refused, not thrown on', () => {
  // Each of these passed the old `!message` truthiness check and then crashed
  // on `.trim()` or `.length`.
  for (const bad of [['x'], { text: 'x' }, 42, true, () => 'x']) {
    let out
    assert.doesNotThrow(() => { out = validateSupportBody({ message: bad }, NOW) },
      `${typeof bad} message must not throw`)
    assert.equal(out.error, 'Message is required', `${typeof bad} message must be refused`)
  }
})

test('a missing, empty or whitespace message is refused', () => {
  assert.equal(validateSupportBody({}, NOW).error, 'Message is required')
  assert.equal(validateSupportBody(null, NOW).error, 'Message is required')
  assert.equal(validateSupportBody('not an object', NOW).error, 'Message is required')
  assert.equal(validateSupportBody({ message: '' }, NOW).error, 'Message is required')
  assert.equal(validateSupportBody({ message: '   \n ' }, NOW).error, 'Message is required')
})

test('a non-string subject or email is refused rather than crashing the handler', () => {
  // `{ length: 5 }` passed the old `subject.length > 200` test and then threw
  // on `(subject || '').trim()`.
  for (const bad of [{ length: 5 }, ['hi'], 7]) {
    const out = validateSupportBody({ message: 'hello', subject: bad }, NOW)
    assert.equal(out.error, 'Subject must be text', `${JSON.stringify(bad)} subject must be refused`)
  }
  for (const bad of [{ length: 5 }, ['a@b.test'], 7]) {
    const out = validateSupportBody({ message: 'hello', email: bad }, NOW)
    assert.equal(out.error, 'Invalid email format', `${JSON.stringify(bad)} email must be refused`)
  }
})

// ── The limits the old code enforced, unchanged ─────────────────────────────

test('the size limits are the ones the form has always had', () => {
  assert.equal(MESSAGE_MAX, 5000)
  assert.equal(SUBJECT_MAX, 200)
  assert.equal(EMAIL_MAX, 254)
  assert.equal(validateSupportBody({ message: 'x'.repeat(5001) }, NOW).error, 'Message must be under 5000 characters')
  assert.equal(validateSupportBody({ message: 'ok', subject: 's'.repeat(201) }, NOW).error, 'Subject must be under 200 characters')
  assert.equal(validateSupportBody({ message: 'ok', email: 'a@' + 'b'.repeat(260) + '.co' }, NOW).error, 'Invalid email format')
  assert.equal(validateSupportBody({ message: 'ok', email: 'not-an-email' }, NOW).error, 'Invalid email format')
})

test('a message at exactly the limit is accepted', () => {
  assert.equal(validateSupportBody({ message: 'x'.repeat(5000) }, NOW).error, undefined)
})

// ── The document shape ──────────────────────────────────────────────────────

test('a valid body becomes exactly the document the admin queue expects', () => {
  // The email is validated as typed (the regex admits no whitespace), which is
  // what the old inline code did too — only the stored copy is trimmed.
  const { entry, error } = validateSupportBody({
    type: 'bug', subject: '  Broken export  ', message: '  It fails.  ', email: 'me@example.com', source: 'inline',
  }, NOW)
  assert.equal(error, undefined)
  assert.deepEqual(entry, {
    type: 'bug',
    subject: 'Broken export',
    message: 'It fails.',
    email: 'me@example.com',
    source: 'inline',
    status: 'new',
    adminNotes: '',
    createdAt: '2026-09-06T10:00:00.000Z',
    updatedAt: '2026-09-06T10:00:00.000Z',
  })
})

test('unknown type and source fall back rather than being stored verbatim', () => {
  const { entry } = validateSupportBody({ message: 'hi', type: 'exploit', source: 'curl' }, NOW)
  assert.equal(entry.type, 'general')
  assert.equal(entry.source, 'feedback-form')
  assert.equal(entry.subject, '[general] Submission', 'a missing subject is labelled by type')
})

test('an empty email is allowed — the form does not require one', () => {
  assert.equal(validateSupportBody({ message: 'hi', email: '' }, NOW).entry.email, '')
  assert.equal(validateSupportBody({ message: 'hi', email: null }, NOW).entry.email, '')
})

// ── The call site ───────────────────────────────────────────────────────────

test('the handler validates through the pure function and boots through the shared bootstrap', () => {
  // Written against the CODE: the file's own comments name the old bootstrap
  // in order to explain why it went, and an assertion that matched the prose
  // would fail on the explanation rather than on a regression.
  const src = fs.readFileSync(path.join(process.cwd(), 'api/support.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  assert.match(src, /const validated = validateSupportBody\(\{ type, subject, message, email, source \}\)/,
    'the handler no longer validates through validateSupportBody')
  assert.match(src, /import \{ adminDb \} from '\.\/_lib\/firebase-admin\.js'/,
    'support.js must use the shared Firebase Admin bootstrap')
  assert.doesNotMatch(src, /initializeApp\(/,
    'support.js has grown its own initializeApp() again — that is the divergence this test exists to stop')
  assert.doesNotMatch(src, /'uil4b'\s*\)?\s*$/m,
    'a hard-coded projectId is back')
})
