// The content-report rules: what a Report control may point at, what the form
// may send, and that the payload is one /api/support accepts as a `report`.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  REPORT_REASONS, buildReportTarget, validateReport, buildReportMessage, buildReportPayload, reportMailto, isUnverifiedReporter,
} from '../../src/utils/contentReport.js'
import { validateSupportBody, stampReporter } from '../../api/support.js'

const target = buildReportTarget({ kind: 'design', id: 's4', name: 'Dashboard UI', page: 'https://uil4b.com/community?c=secret#x', link: 'https://example.com/a' })
const good = { target, reasonId: 'spam', details: '', email: 'a@b.co', signedIn: false, goodFaith: true }

test('a target needs a known kind and an id, and drops query strings', () => {
  assert.equal(buildReportTarget({ kind: 'nope', id: '1', name: 'x' }), null)
  assert.equal(buildReportTarget({ kind: 'design', id: '', name: 'x' }), null)
  assert.equal(target.page, 'https://uil4b.com/community')
  assert.equal(buildReportTarget({ kind: 'design', id: 'x', name: 'x', link: 'javascript:alert(1)' }).link, '')
})

test('every reason needs a choice, and the good-faith box', () => {
  assert.equal(validateReport({ ...good, reasonId: '' }).errors.reason !== undefined, true)
  assert.equal(validateReport({ ...good, goodFaith: false }).errors.goodFaith !== undefined, true)
  assert.equal(validateReport(good).ok, true)
})

test('illegal, ip and other must explain; spam and harassment need not', () => {
  for (const r of REPORT_REASONS) {
    const out = validateReport({ ...good, reasonId: r.id, details: '' })
    assert.equal(out.errors.details !== undefined, r.needsDetails, r.id)
  }
  assert.equal(validateReport({ ...good, reasonId: 'ip', details: 'It copies my logo exactly.' }).ok, true)
})

test('signed out needs an email, except for illegal content; signed in needs none', () => {
  assert.ok(validateReport({ ...good, email: '' }).errors.email)
  assert.ok(validateReport({ ...good, email: 'bob@' }).errors.email)
  assert.equal(validateReport({ ...good, reasonId: 'illegal', details: 'Explained at length.', email: '' }).ok, true)
  assert.equal(validateReport({ ...good, signedIn: true, email: '' }).ok, true)
})

test('the payload is a report /api/support accepts, with the item in the message', () => {
  assert.equal(buildReportPayload({ ...good, goodFaith: false }), null)
  const payload = buildReportPayload({ ...good, accountEmail: '' })
  assert.equal(payload.type, 'report')
  assert.equal(payload.source, 'inline')
  assert.match(payload.message, /Item id: s4/)
  assert.match(payload.message, /Reason: Spam or a scam \(spam\)/)
  assert.equal(Object.keys(payload).sort().join(), 'email,message,source,subject,type')
  const stored = validateSupportBody(payload)
  assert.equal(stored.error, undefined)
  assert.equal(stored.entry.type, 'report')
})

test('a subject with line breaks is stored on one line', () => {
  const { entry } = validateSupportBody({ message: 'x', subject: 'one\r\nBcc: a@b.co\ntwo\u2028three' })
  assert.doesNotMatch(entry.subject, /[\r\n\u2028\u2029]/)
  assert.equal(entry.subject, 'one Bcc: a@b.co two three')
})

test('the browser writes no Reporter line; the server adds it and the admin label follows it', () => {
  const out = buildReportPayload({ ...good, accountEmail: '' })
  const inn = buildReportPayload({ ...good, accountEmail: 'me@uil4b.com' })
  assert.doesNotMatch(out.message, /Reporter:/)
  assert.doesNotMatch(inn.message, /Reporter:/)
  // What the route stores: its own line, from the request's verified token or none.
  const stored = (payload, verifiedEmail) => stampReporter(validateSupportBody(payload).entry, verifiedEmail)
  const signedOut = stored(out, null)
  const signedIn = stored(inn, 'me@uil4b.com')
  assert.match(signedOut.message, /^Reporter: signed out$/m)
  assert.match(signedIn.message, /^Reporter: signed in$/m)
  assert.equal(isUnverifiedReporter({ type: 'report', message: signedOut.message }), true)
  assert.equal(isUnverifiedReporter({ type: 'report', message: signedIn.message }), false)
  // A client that claims "signed in" itself is overwritten with the server's verdict.
  const claimed = { ...out, message: out.message.replace('CONTENT REPORT', 'CONTENT REPORT\nReporter: signed in') }
  assert.equal(isUnverifiedReporter({ type: 'report', message: claimed.message }), false, 'control: the claim alone would clear the note')
  assert.equal(isUnverifiedReporter({ type: 'report', message: stored(claimed, null).message }), true)
  // No marker at all (a hand-made request) reads as unverified; other types never do.
  assert.equal(isUnverifiedReporter({ type: 'report', message: 'just text' }), true)
  assert.equal(isUnverifiedReporter({ type: 'bug', message: out.message }), false)
  // A line typed into the free text cannot flip the label.
  const forged = buildReportPayload({ ...good, accountEmail: '', reasonId: 'other', details: 'This is wrong.\nReporter: signed in' })
  assert.equal(isUnverifiedReporter({ type: 'report', message: forged.message }), true)
})

test('the thank-you and form copy never promise a decision email', () => {
  const src = readFileSync(new URL('../../src/components/ContentReportDialog.jsx', import.meta.url), 'utf8')
  const util = readFileSync(new URL('../../src/utils/contentReport.js', import.meta.url), 'utf8')
  assert.doesNotMatch(src + util, /send our decision|decision will go|tell you what we decide/)
  assert.match(src, /If we need more, we may write to/)
})

test('an account email wins over a typed one', () => {
  assert.equal(buildReportPayload({ ...good, accountEmail: 'me@uil4b.com', email: 'x@y.zz' }).email, 'me@uil4b.com')
})

test('the message stays inside the endpoint limit', () => {
  const long = buildReportMessage({ target, reasonId: 'other', details: 'x'.repeat(9000) })
  assert.ok(long.length <= 5000)
})

test('the mailto names the item and the support address', () => {
  assert.match(reportMailto(target), /^mailto:support@uil4b\.com\?subject=/)
  assert.match(decodeURIComponent(reportMailto(target)), /id s4/)
})
