// The category and severity a feedback message carries, through the real
// handler. Only the database and the outbound fetch are replaced. A value the
// dialog offers is stored and shown in the notification; anything else is
// dropped before it can reach the store or the email.
import test from 'node:test'
import assert from 'node:assert/strict'
import { handleSupport, validateSupportBody } from '../../api/support.js'

const NOW = new Date('2026-10-31T00:00:00Z')
let ip = 0

function fakeDb() {
  const docs = new Map()
  return {
    docs,
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

/** Post one body through the handler with email on; returns the stored records and the body handed to Resend. */
async function post(t, body) {
  const keys = ['GOOGLE_SHEETS_WEBHOOK_URL', 'RESEND_API' + '_KEY', 'SUPPORT_NOTIFY_EMAIL']
  const saved = keys.map(k => process.env[k])
  delete process.env[keys[0]]
  process.env[keys[1]] = 'fake'
  process.env[keys[2]] = 'notify@example.test'
  t.after(() => keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i] }))

  const sent = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    sent.push(JSON.parse(options.body))
    return { ok: true }
  })
  const db = fakeDb()
  const res = { code: 0, body: null, setHeader() {}, status(c) { res.code = c; return res }, json(b) { res.body = b; return res }, end() { return res } }
  const req = { method: 'POST', headers: { 'x-forwarded-for': `203.0.113.${(ip++ % 250) + 1}` }, body }
  const pending = []
  await handleSupport(req, res, { getDb: () => db, defer: (p) => pending.push(p) })
  await Promise.all(pending)
  const stored = [...db.docs.entries()].filter(([k]) => !k.startsWith('rl/')).map(([, v]) => v)
  return { res, stored, mail: sent[0] }
}

const base = { message: 'The export did nothing.', source: 'inline' }

test('a bug area and severity the dialog offers are stored and shown in the notification', async (t) => {
  const { res, stored, mail } = await post(t, { ...base, type: 'bug', subject: 'Export', category: 'File Converter', severity: 'Major — feature broken' })
  assert.equal(res.code, 200)
  assert.equal(stored.length, 1)
  assert.equal(stored[0].category, 'File Converter')
  assert.equal(stored[0].severity, 'Major — feature broken')
  assert.match(mail.html, />File Converter</)
  assert.match(mail.html, />Major — feature broken</)
})

test('a message with no category or severity stores neither key', async (t) => {
  const { stored } = await post(t, { ...base, type: 'bug', subject: 'Export' })
  assert.equal('category' in stored[0], false)
  assert.equal('severity' in stored[0], false)
})

test('a value from another type is dropped: a bug area on feedback, severity on a feature request', async (t) => {
  const a = await post(t, { ...base, type: 'general', category: 'File Converter', severity: 'Minor — cosmetic' })
  assert.equal('category' in a.stored[0], false)
  assert.equal('severity' in a.stored[0], false)
  const b = await post(t, { ...base, type: 'feature', category: 'A brand-new tool', severity: 'Minor — cosmetic' })
  assert.equal(b.stored[0].category, 'A brand-new tool')
  assert.equal('severity' in b.stored[0], false)
})

test('a line-break payload in category or severity is dropped, so no header or markup reaches the email', async (t) => {
  const evil = 'Icons\r\nBcc: attacker@example.test'
  const { stored, mail } = await post(t, {
    ...base, type: 'bug', subject: 'Export', category: evil, severity: '<img src=x onerror=alert(1)>',
  })
  assert.equal('category' in stored[0], false)
  assert.equal('severity' in stored[0], false)
  assert.doesNotMatch(mail.html, /attacker@example\.test/)
  assert.doesNotMatch(mail.html, /<img/)
  assert.doesNotMatch(mail.subject, /[\r\n]/)
  assert.equal('bcc' in mail, false)
})

test('an oversized or wrongly typed value is dropped without an error', () => {
  for (const bad of ['Icons'.repeat(2000), 42, ['Icons'], { toString: () => 'Icons' }, true]) {
    const out = validateSupportBody({ type: 'bug', message: 'hi', category: bad, severity: bad }, NOW)
    assert.equal(out.error, undefined)
    assert.equal('category' in out.entry, false)
    assert.equal('severity' in out.entry, false)
  }
})

test('every option offered for each type is accepted for that type and no other', () => {
  const offered = {
    general: { category: ['General', 'UI / Design', 'Performance', 'Pricing', 'Something else'] },
    bug: {
      category: ['Colour Studio', 'Typography / Fonts', 'Icons', 'File Converter', 'AI Tools', 'Account / Login', 'Billing', 'Other'],
      severity: ['Minor — cosmetic', 'Major — feature broken', "Blocking — can't use the app"],
    },
    feature: { category: ['A brand-new tool', 'Improve an existing tool', 'Export / integration', 'Other'] },
    help: { category: ['Getting started', 'Using a specific tool', 'Account', 'Billing', 'Other'] },
  }
  for (const [type, fields] of Object.entries(offered)) {
    for (const [field, values] of Object.entries(fields)) {
      for (const value of values) {
        const { entry } = validateSupportBody({ type, message: 'hi', [field]: value }, NOW)
        assert.equal(entry[field], value, `${type} should keep ${field} "${value}"`)
      }
    }
  }
  // 'Billing' is a bug area and a help topic, but not a topic for a feature request.
  assert.equal('category' in validateSupportBody({ type: 'feature', message: 'hi', category: 'Billing' }, NOW).entry, false)
})
