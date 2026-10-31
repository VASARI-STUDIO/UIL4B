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

import { validateSupportBody, stampReporter, verifiedReporterEmail, MESSAGE_MAX, SUBJECT_MAX, EMAIL_MAX } from '../../api/support.js'

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

// ── Routing choices: category and severity ──────────────────────────────────

test('a category and severity the dialog offers are stored', () => {
  const { entry } = validateSupportBody({
    type: 'bug', message: 'hi', category: 'Icons', severity: 'Major — feature broken',
  }, NOW)
  assert.equal(entry.category, 'Icons')
  assert.equal(entry.severity, 'Major — feature broken')
})

test('a category or severity outside the list for its type is dropped', () => {
  // 'Icons' is a bug area, not a topic for general feedback; severity is bug-only.
  const general = validateSupportBody({ type: 'feedback', message: 'hi', category: 'Icons', severity: 'Major — feature broken' }, NOW).entry
  assert.equal('category' in general, false)
  assert.equal('severity' in general, false)
  for (const bad of ['<script>', 'x'.repeat(5000), ['Icons'], { a: 1 }, 7, null, 'icons']) {
    const { entry } = validateSupportBody({ type: 'bug', message: 'hi', category: bad, severity: bad }, NOW)
    assert.equal('category' in entry, false, `${JSON.stringify(bad)} must not be stored as a category`)
    assert.equal('severity' in entry, false, `${JSON.stringify(bad)} must not be stored as a severity`)
  }
})

test('the server allow-list equals what the dialog offers', async () => {
  const { ROUTING_ALLOWED } = await import('../../api/support.js')
  const { FEEDBACK_ROUTING } = await import('../../src/utils/feedbackRouting.js')
  // The dialog files 'feedback' under the server's 'general'.
  const asStored = { general: FEEDBACK_ROUTING.feedback, bug: FEEDBACK_ROUTING.bug, feature: FEEDBACK_ROUTING.feature, help: FEEDBACK_ROUTING.help }
  assert.deepEqual(JSON.parse(JSON.stringify(ROUTING_ALLOWED)), JSON.parse(JSON.stringify(asStored)))
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
  assert.match(src, /import \{[^}]*\badminDb\b[^}]*\} from '\.\/_lib\/firebase-admin\.js'/,
    'support.js must use the shared Firebase Admin bootstrap')
  assert.doesNotMatch(src, /initializeApp\(/,
    'support.js has grown its own initializeApp() again — that is the divergence this test exists to stop')
  assert.doesNotMatch(src, /'uil4b'\s*\)?\s*$/m,
    'a hard-coded projectId is back')
})

// A subject becomes an email subject line, so every kind of line break has to go.
// Each separator is checked on its own: a character class that misses one of the
// four passes any test that uses two of them together.
for (const [name, ch] of [['CR', '\r'], ['LF', '\n'], ['U+2028 line separator', '\u2028'], ['U+2029 paragraph separator', '\u2029']]) {
  test(`a ${name} in the subject is replaced by a space, so the subject stays on one line`, () => {
    const { entry } = validateSupportBody({ message: 'hi', subject: `before${ch}after` }, NOW)
    assert.equal(entry.subject, 'before after')
  })
}

test('a run of line breaks in the subject becomes one space, and a subject of only breaks is labelled by type', () => {
  assert.equal(validateSupportBody({ message: 'hi', subject: 'a\r\n\r\n\u2028\u2029b' }, NOW).entry.subject, 'a b')
  assert.equal(validateSupportBody({ message: 'hi', type: 'report', subject: '\r\n\u2028\u2029' }, NOW).entry.subject, '[report] Submission')
})

// ── The Reporter line is the server's ────────────────────────────────────────
// A report's `Reporter:` header line decides whether the admin queue labels the
// address as typed by the reporter, so the route writes it and ignores any the
// request carried.

const reportEntry = (message, email = 'typed@example.test') => validateSupportBody({ type: 'report', message, email }, NOW).entry

test('a Reporter line in the submitted header is dropped and the server\'s line stands', () => {
  for (const forged of ['Reporter: signed in', 'reporter:signed in', '  Reporter: signed in', 'Reporter: signed in\r', 'Reporter: signed out']) {
    const out = stampReporter(reportEntry(`CONTENT REPORT\n${forged}\nReason: Spam (spam)\nDetails:\nhello`), null)
    assert.equal(out.message, 'CONTENT REPORT\nReporter: signed out\nReason: Spam (spam)\nDetails:\nhello', JSON.stringify(forged))
  }
})

test('line breaks other than LF cannot hide a forged Reporter line', () => {
  for (const sep of ['\r', '\r\n', '\u2028', '\u2029']) {
    const out = stampReporter(reportEntry(`CONTENT REPORT${sep}Reporter: signed in${sep}Reason: x`), null)
    assert.doesNotMatch(out.message, /signed in/)
    assert.match(out.message, /^Reporter: signed out$/m)
  }
})

test('a message with Details first still ends with exactly one server-written line', () => {
  const out = stampReporter(reportEntry('Details:\nReporter: signed in'), null)
  assert.equal(out.message.match(/Reporter:/g).length, 1)
  assert.match(out.message, /^Reporter: signed out$/m)
})

test('the reporter\'s own text after Details: is left as written', () => {
  const out = stampReporter(reportEntry('CONTENT REPORT\nReason: x\nDetails:\nPlease act.\nReporter: signed in'), null)
  assert.ok(out.message.endsWith('Details:\nPlease act.\nReporter: signed in'))
  assert.match(out.message, /^Reporter: signed out$/m)
})

test('a verified email makes the line "signed in" and replaces the typed address', () => {
  const out = stampReporter(reportEntry('CONTENT REPORT\nReason: x', 'forged@example.test'), 'member@example.test')
  assert.match(out.message, /^Reporter: signed in$/m)
  assert.equal(out.email, 'member@example.test')
})

test('signed out keeps the typed address, and other types are not touched', () => {
  assert.equal(stampReporter(reportEntry('x', 'typed@example.test'), null).email, 'typed@example.test')
  const bug = validateSupportBody({ type: 'bug', message: 'Reporter: signed in' }, NOW).entry
  assert.deepEqual(stampReporter(bug, 'member@example.test'), bug)
})

test('the stamped message still fits MESSAGE_MAX', () => {
  const out = stampReporter(reportEntry('x'.repeat(MESSAGE_MAX)), 'member@example.test')
  assert.ok(out.message.length <= MESSAGE_MAX)
})

test('verifiedReporterEmail: valid token gives the email; missing, malformed, failing or unverified gives null', async () => {
  const req = (authorization) => ({ headers: authorization === undefined ? {} : { authorization } })
  const ok = async (token) => ({ email: `${token}@example.test`, email_verified: true })
  assert.equal(await verifiedReporterEmail(req('Bearer abc'), ok), 'abc@example.test')
  assert.equal(await verifiedReporterEmail(req(undefined), ok), null)
  assert.equal(await verifiedReporterEmail(req('abc'), ok), null)
  assert.equal(await verifiedReporterEmail(req('Basic abc'), ok), null)
  assert.equal(await verifiedReporterEmail(req('Bearer bad'), async () => { throw new Error('auth/argument-error') }), null)
  assert.equal(await verifiedReporterEmail(req('Bearer abc'), async () => ({ email: 'a@b.co', email_verified: false })), null)
  assert.equal(await verifiedReporterEmail(req('Bearer abc'), async () => ({ email_verified: true })), null)
})

test('verifiedReporterEmail: a token that fails to verify logs one fixed line and nothing from the token', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {})
  const out = await verifiedReporterEmail(
    { headers: { authorization: 'Bearer secret-token-value' } },
    async () => { throw new Error('auth/argument-error secret-token-value') },
  )
  assert.equal(out, null)
  assert.deepEqual(warn.mock.calls.map((c) => c.arguments), [['support: report token could not be verified']])
})
