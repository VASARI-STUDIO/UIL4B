// A billing account that is not linked to the login cannot be fixed by retrying.
//
// api/create-portal.js refuses with a 403 when the Stripe customer does not
// belong to the signed-in account. That reply carries `code: 'billing-unlinked'`
// (SubscriptionContext copies it onto the error), and Settings words it as a
// message for support rather than "try again". Both are read from source:
// the handler needs Stripe and Firebase, and portalErrorText is not exported, so
// the function is lifted out of the page and run on its own.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

function portalErrorText() {
  const source = read('src/pages/Settings.jsx')
  const match = /\nfunction portalErrorText\(e\) \{\n[\s\S]*?\n\}\n/.exec(source)
  assert.ok(match, 'portalErrorText is no longer a top-level function in Settings.jsx')
  return new Function(`${match[0]}\nreturn portalErrorText`)()
}

test('the portal refuses an unlinked billing account with the billing-unlinked code', () => {
  const handler = read('api/create-portal.js')
  const refusal = /res\.status\(403\)\.json\(\{([^}]*)\}\)/.exec(handler)
  assert.ok(refusal, 'the 403 for a customer that is not this account\'s is gone')
  assert.match(refusal[1], /not linked to your login/)
  assert.match(refusal[1], /code: 'billing-unlinked'/)
})

test('an unlinked billing account is told to email support, not to try again', () => {
  const text = portalErrorText()({ code: 'billing-unlinked', message: 'This billing account is not linked to your login. Please contact support.' })
  assert.equal(
    text,
    "Billing could not be opened because this billing account isn't linked to your login. Nothing about your plan has changed. Email support@uil4b.com and we'll link it.",
  )
  assert.doesNotMatch(text, /try again/i)
})

test('the reference id is kept when the error has one', () => {
  const fromMessage = portalErrorText()({ code: 'billing-unlinked', message: 'Not linked [ref abc123]' })
  assert.match(fromMessage, /abc123/)
  assert.doesNotMatch(fromMessage, /try again/i)
  const fromField = portalErrorText()({ code: 'billing-unlinked', message: 'Not linked', correlationId: 'xyz789' })
  assert.match(fromField, /xyz789/)
})

test('every other portal failure still says it is safe to try again, without the raw message on screen', () => {
  const warn = console.warn
  const logged = []
  console.warn = (...args) => logged.push(args)
  let text
  try {
    text = portalErrorText()({ code: 'something-else', message: 'Boom [ref r1]' })
  } finally {
    console.warn = warn
  }
  assert.equal(text, 'Billing could not be opened, so nothing about your plan has changed. Please try again in a moment.')
  assert.doesNotMatch(text, /Boom|\[ref|Failed to fetch/)
  assert.equal(logged.length, 1, 'the raw error is logged for support instead of shown')
  assert.equal(logged[0][1].message, 'Boom [ref r1]')
})
