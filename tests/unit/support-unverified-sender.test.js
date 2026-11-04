// The founder's notification email says whose address a message came with, and
// whether the server could vouch for it.
//
//   - a feedback, bug or help message carries whatever address the form sent, so
//     the line reads "From (unverified): <address>";
//   - a content report from a signed-in, email-verified account has its address
//     replaced by the verified one from the sign-in token, so the line reads
//     "From: <address>" with no label;
//   - a report with no token, a token that fails, or an unverified account is
//     treated like any other sender: "(unverified)".
//
// Runs the real handler (`handleSupport`). Only what is outside our code is
// replaced: the database, `fetch` (the Resend call is read, nothing is sent), the
// after-response scheduler, and the token check.
import test from 'node:test'
import assert from 'node:assert/strict'
import { handleSupport } from '../../api/support.js'

/** Fake Firestore: every write works, every rate-limit transaction is allowed. */
function fakeDb() {
  const docs = new Map()
  return {
    collection: (name) => ({
      doc: (id) => ({ id, create: async (value) => { docs.set(`${name}/${id}`, value) } }),
      add: async (value) => { docs.set(`${name}/auto-${docs.size}`, value) },
    }),
    runTransaction: async (fn) => fn({
      get: async ({ id }) => ({ exists: docs.has(`rl/${id}`), data: () => docs.get(`rl/${id}`) }),
      set: ({ id }, value) => docs.set(`rl/${id}`, value),
    }),
  }
}

function withNotifications(t) {
  const keys = ['GOOGLE_SHEETS_WEBHOOK_URL', 'RESEND_API' + '_KEY', 'SUPPORT_NOTIFY_EMAIL']
  const saved = keys.map((k) => process.env[k])
  for (const k of keys) delete process.env[k]
  process.env[keys[1]] = 'fake'
  process.env.SUPPORT_NOTIFY_EMAIL = 'notify@example.test'
  t.after(() => keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i] }))
}

let ipCounter = 0

/** Send one message and return the HTML of the notification email it produced. */
async function emailFor(t, body, { token, verifyToken } = {}) {
  withNotifications(t)
  const sent = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    sent.push({ url: String(url), body: JSON.parse(init.body) })
    return { ok: true }
  })
  const deferred = []
  const res = { code: 0, body: null, setHeader() {}, status(c) { res.code = c; return res }, json(b) { res.body = b; return res }, end() { return res } }
  const headers = { 'x-forwarded-for': `198.51.100.${(ipCounter++ % 250) + 1}` }
  if (token) headers.authorization = `Bearer ${token}`
  await handleSupport({ method: 'POST', headers, body }, res, { getDb: () => fakeDb(), defer: (p) => deferred.push(p), verifyToken })
  await Promise.all(deferred)
  assert.equal(res.code, 200, 'the message was accepted')
  const mail = sent.find((s) => s.url.includes('resend'))
  assert.ok(mail, 'a notification email went out')
  return mail.body.html
}

const FEEDBACK = { type: 'feedback', subject: 'Palette', message: 'The palette tool is good.', email: 'sender@example.com', source: 'inline' }
const REPORT = { type: 'report', subject: 'Spam', message: 'CONTENT REPORT\nReason: Spam (spam)\nDetails:\nx', email: 'typed@example.com', source: 'inline' }

test('a signed-out feedback message is labelled "From (unverified)" with its address', async (t) => {
  const html = await emailFor(t, FEEDBACK)
  assert.match(html, /From \(unverified\): <strong>sender@example\.com<\/strong>/)
})

test('a feedback message sent with a token is still "(unverified)": only reports are checked', async (t) => {
  const html = await emailFor(t, FEEDBACK, {
    token: 'a-token',
    verifyToken: async () => ({ email: 'sender@example.com', email_verified: true }),
  })
  assert.match(html, /From \(unverified\): <strong>sender@example\.com<\/strong>/)
})

test('a report from a verified account says "From" with the token\'s address, not the typed one', async (t) => {
  const html = await emailFor(t, REPORT, {
    token: 'a-token',
    verifyToken: async () => ({ email: 'member@example.com', email_verified: true }),
  })
  assert.match(html, /From: <strong>member@example\.com<\/strong>/)
  assert.doesNotMatch(html, /unverified/)
  assert.doesNotMatch(html, /typed@example\.com/)
})

test('a report with no token is "(unverified)", with the address typed', async (t) => {
  const html = await emailFor(t, REPORT)
  assert.match(html, /From \(unverified\): <strong>typed@example\.com<\/strong>/)
})

test('a report whose account email is not verified is "(unverified)"', async (t) => {
  const html = await emailFor(t, REPORT, {
    token: 'a-token',
    verifyToken: async () => ({ email: 'member@example.com', email_verified: false }),
  })
  assert.match(html, /From \(unverified\): <strong>typed@example\.com<\/strong>/)
  assert.doesNotMatch(html, /member@example\.com/)
})

test('a message with no address has no From line at all', async (t) => {
  const html = await emailFor(t, { ...FEEDBACK, email: '' })
  assert.doesNotMatch(html, /From/)
})
