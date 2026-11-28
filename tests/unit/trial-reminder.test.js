// The trial reminder email: its words, who it skips, and that it goes out once
// per trial. Resend, Stripe and the database are in-memory fakes; expected
// values are written out by hand.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTrialReminder, escapeHtml, sendTrialReminder, CANCEL_URL } from '../../api/_lib/trialReminder.js'
import { memoryDb } from './helpers/memory-firestore.js'

const TRIAL_END = 1796169600 // Wednesday 2 December 2026, 11:00 in Sydney

const quiet = (t) => {
  t.mock.method(console, 'warn', () => {})
  t.mock.method(console, 'error', () => {})
}

const subscription = (over = {}) => ({
  id: 'sub_1',
  status: 'trialing',
  customer: 'cus_1',
  trial_end: TRIAL_END,
  cancel_at_period_end: false,
  cancel_at: null,
  items: { data: [{ price: { unit_amount: 4800, currency: 'aud', recurring: { interval: 'year' } } }] },
  ...over,
})

const stripeWith = (customer) => ({ customers: { retrieve: async () => customer } })

function setup({ customer = { id: 'cus_1', email: 'sam@example.com' }, ok = true, key = 're_test', seed = {} } = {}) {
  const db = memoryDb({ 'users/uid_1': { stripeCustomerId: 'cus_1' }, ...seed })
  const calls = []
  const fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) })
    return { ok, status: ok ? 200 : 500 }
  }
  const deps = { db, stripe: stripeWith(customer), fetch, env: key ? { RESEND_API_KEY: key } : {}, authEmail: async () => '' }
  return { db, calls, deps }
}

test('copy: date, amount, currency, interval, cancel link', () => {
  const { subject, text, html } = buildTrialReminder({ trialEnd: TRIAL_END, amount: 4800, currency: 'aud', interval: 'year' })
  assert.equal(subject, 'Your UIL4B trial ends on 2 December')
  assert.match(text, /ends on Wednesday 2 December 2026/)
  assert.match(text, /A\$48\.00 a year/)
  assert.ok(text.includes(CANCEL_URL))
  assert.equal(CANCEL_URL, 'https://uil4b.com/settings?section=support')
  assert.match(text, /you keep Pro until the trial ends and nothing is charged/)
  assert.ok(html.includes(`href="${CANCEL_URL}"`))
  assert.match(html, /A\$48\.00 a year/)
})

test('copy: US dollars and monthly', () => {
  const { text } = buildTrialReminder({ trialEnd: TRIAL_END, amount: 1200, currency: 'usd', interval: 'month' })
  assert.match(text, /US\$12\.00 a month/)
})

test('copy: no amount leaves the amount sentence out', () => {
  const { text } = buildTrialReminder({ trialEnd: TRIAL_END, amount: undefined, currency: 'aud', interval: 'year' })
  assert.doesNotMatch(text, /amount is/)
  assert.match(text, /first charge happens/)
})

test('copy: no em or en dashes in subject, text or html', () => {
  const { subject, text, html } = buildTrialReminder({ trialEnd: TRIAL_END, amount: 4800, currency: 'aud', interval: 'year' })
  for (const s of [subject, text, html]) assert.doesNotMatch(s, /[–—]/)
})

test('escapeHtml escapes the characters that break out of text and attributes', () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;')
})

test('sends once through Resend with the right headers and body', async (t) => {
  quiet(t)
  const { calls, deps } = setup()
  assert.equal(await sendTrialReminder(subscription(), 'uid_1', deps), 'sent')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.resend.com/emails')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer re_test')
  assert.deepEqual(calls[0].body.to, ['sam@example.com'])
  assert.equal(calls[0].body.reply_to, 'support@uil4b.com')
  assert.ok(calls[0].body.html && calls[0].body.text && calls[0].body.subject)
})

test('skips when already cancelling, cancelled at a date, or not trialing', async (t) => {
  quiet(t)
  for (const over of [{ cancel_at_period_end: true }, { cancel_at: 1800000000 }, { status: 'active' }, { status: 'canceled' }]) {
    const { calls, deps } = setup()
    const outcome = await sendTrialReminder(subscription(over), 'uid_1', deps)
    assert.match(outcome, /^skipped_/)
    assert.equal(calls.length, 0)
  }
})

test('skips without an email anywhere, and without a key', async (t) => {
  quiet(t)
  const noEmail = setup({ customer: { id: 'cus_1', email: null } })
  assert.equal(await sendTrialReminder(subscription(), 'uid_1', noEmail.deps), 'skipped_no_email')
  assert.equal(noEmail.calls.length, 0)

  const deleted = setup({ customer: { id: 'cus_1', deleted: true } })
  assert.equal(await sendTrialReminder(subscription(), 'uid_1', deleted.deps), 'skipped_no_email')

  const noKey = setup({ key: '' })
  assert.equal(await sendTrialReminder(subscription(), 'uid_1', noKey.deps), 'skipped_no_key')
  assert.equal(noKey.calls.length, 0)
})

test('falls back to the account email', async (t) => {
  quiet(t)
  const { calls, deps } = setup({ customer: { id: 'cus_1', email: null } })
  deps.authEmail = async () => 'acct@example.com'
  assert.equal(await sendTrialReminder(subscription(), 'uid_1', deps), 'sent')
  assert.deepEqual(calls[0].body.to, ['acct@example.com'])
})

test('at most once per trial, but a new trial end sends again', async (t) => {
  quiet(t)
  const { db, calls, deps } = setup()
  assert.equal(await sendTrialReminder(subscription(), 'uid_1', deps), 'sent')
  assert.equal(await sendTrialReminder(subscription(), 'uid_1', deps), 'already_sent')
  assert.equal(calls.length, 1)
  assert.equal(db.doc('users/uid_1').subscription.trialReminderSentFor, TRIAL_END)

  assert.equal(await sendTrialReminder(subscription({ trial_end: TRIAL_END + 86400 * 30 }), 'uid_1', deps), 'sent')
  assert.equal(calls.length, 2)
})

test('a provider outage asks for a retry, a refusal does not', async (t) => {
  quiet(t)
  for (const [status, want] of [[500, 'retry'], [503, 'retry'], [429, 'retry'], [422, 'failed'], [403, 'failed']]) {
    const { deps } = setup()
    const run = { ...deps, fetch: async () => ({ ok: false, status }) }
    assert.equal(await sendTrialReminder(subscription(), 'uid_1', run), want, `status ${status}`)
  }
})

test('a refused send does not throw and can be retried', async (t) => {
  quiet(t)
  const failing = setup({ ok: false })
  assert.match(await sendTrialReminder(subscription(), 'uid_1', failing.deps), /^(failed|retry)$/)
  assert.notEqual(failing.db.doc('users/uid_1').subscription?.trialReminderSentFor, TRIAL_END)

  const retry = { ...failing.deps, fetch: async () => ({ ok: true, status: 200 }) }
  assert.equal(await sendTrialReminder(subscription(), 'uid_1', retry), 'sent')
})

test('a network error does not throw and can be retried', async (t) => {
  quiet(t)
  const { db, deps } = setup()
  const broken = { ...deps, fetch: async () => { throw new Error('network down') } }
  assert.equal(await sendTrialReminder(subscription(), 'uid_1', broken), 'retry')
  assert.notEqual(db.doc('users/uid_1').subscription?.trialReminderSentFor, TRIAL_END)
  assert.equal(await sendTrialReminder(subscription(), 'uid_1', deps), 'sent')
})
