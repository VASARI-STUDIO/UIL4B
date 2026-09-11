// `src/utils/contactEmail.js` restates /api/support's email rule so the form can
// refuse a typo before the request instead of reporting the server's 400 as a
// dropped connection. A restated rule is only safe while it still agrees with
// the one it restates, and a comment cannot check that.
//
// So this file runs ONE table of addresses through both: `isContactEmail` from
// the browser module, and the real `validateSupportBody` from api/support.js.
// A disagreement on any row fails, naming the address and both verdicts. If
// api/support.js ever tightens or loosens its EMAIL_RE, this goes red until
// src/utils/contactEmail.js follows it.
import test from 'node:test'
import assert from 'node:assert/strict'

import { validateSupportBody, EMAIL_MAX } from '../../api/support.js'
import { CONTACT_EMAIL_MAX, isContactEmail } from '../../src/utils/contactEmail.js'

// Both ends, and the awkward middle. The last two are the ones that matter to
// the page: `bob@` is what a person types when they are interrupted, and the
// over-length address is the only refusal a maxLength attribute cannot express
// on a pasted value.
const ADDRESSES = [
  '',
  '   ',
  'maya@example.com',
  'maya.chen+feedback@studio.example.co.uk',
  'MAYA@EXAMPLE.COM',
  'bob@',
  '@example.com',
  'bob@example',
  'bob example@test.com',
  'bob@@example.com',
  'bob@exa mple.com',
  'a@b.c',
  `${'a'.repeat(EMAIL_MAX)}@example.com`,
]

/** What the server would do with this value in the `email` field. */
const serverAccepts = (email) => {
  const { error } = validateSupportBody({ type: 'general', message: 'x', email, source: 'feedback-form' })
  return !error
}

/**
 * What Feedback.jsx actually puts in the payload: `contact.trim()`.
 *
 * THE TRIM IS PART OF THE CONTRACT, and this test is the reason that is known
 * rather than assumed. The first run of the table below failed on `"   "`:
 * api/support.js exempts the empty string by identity (`email !== ''`), so a
 * field holding three spaces is not empty to it, goes through EMAIL_RE and
 * comes back a 400 — which the page would have reported as "check your
 * connection". The browser rule judges the value that will be SENT, so the page
 * must send that same value. `whitespace is not an address` below is the
 * standing proof that the trim is load-bearing.
 */
const sendAs = (raw) => raw.trim()

test('the browser rule and the server rule agree on every address', () => {
  for (const address of ADDRESSES) {
    const client = isContactEmail(address)
    const server = serverAccepts(sendAs(address))
    assert.equal(
      client, server,
      `disagreement on ${JSON.stringify(address)}: contactEmail.js says ${client}, api/support.js says ${server}`,
    )
  }
})

test('whitespace is not an address, and the trim is what makes that true', () => {
  // Accepted by the browser rule…
  assert.equal(isContactEmail('   '), true)
  // …only because what goes up is the trimmed value. Untrimmed, this is a 400.
  assert.equal(serverAccepts(sendAs('   ')), true)
  assert.equal(serverAccepts('   '), false)
})

test('the two caps are the same number', () => {
  assert.equal(CONTACT_EMAIL_MAX, EMAIL_MAX)
})

// The table above is only evidence while it contains both verdicts. A table of
// thirteen valid addresses would pass the agreement test and prove nothing.
test('the table exercises both outcomes', () => {
  const accepted = ADDRESSES.filter(isContactEmail)
  const refused = ADDRESSES.filter((a) => !isContactEmail(a))
  assert.ok(accepted.length >= 5, `only ${accepted.length} accepted addresses in the table`)
  assert.ok(refused.length >= 5, `only ${refused.length} refused addresses in the table`)
})

// The optional-field contract, stated on its own rather than inferred from the
// table: blank is accepted, and it is accepted because the field is optional —
// not because the regex happens to let it through.
test('an empty field is accepted, a blank-looking one too', () => {
  assert.equal(isContactEmail(''), true)
  assert.equal(isContactEmail('  \t '), true)
})

test('a non-string is refused rather than thrown on', () => {
  for (const value of [null, undefined, 42, ['a@b.c'], { email: 'a@b.c' }]) {
    assert.equal(isContactEmail(value), false, `${JSON.stringify(value)} should be refused`)
  }
})
