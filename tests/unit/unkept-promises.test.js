// Sentences that promised something nothing delivers, deleted rather than
// reworded (replacement copy is written separately, not generated).
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'
import { FOUNDER_NOTE } from '../../src/data/founderNote.js'

// Feedback is stored (api/support.js -> the `feedback` collection) and read
// in Admin -> Submissions; the note promises nothing about email delivery.
test('the founder note does not say feedback comes straight to him', () => {
  assert.ok(!/straight to me/i.test(FOUNDER_NOTE.help), FOUNDER_NOTE.help)
  assert.match(FOUNDER_NOTE.help, /feedback link in the footer of every page\.$/)
})

// Nothing grants AI generations when a prompt is approved: approval only
// writes `status`, and no code reads an approved prompt back to credit anyone.
test('submitting a prompt promises no bonus generations', () => {
  const src = stripComments(read('src/components/prompt/SubmitPromptPanel.jsx'))
  assert.ok(!/\+\s*25|bonus AI generations|AI generations if approved/i.test(src))
  assert.match(src, /Submissions are reviewed before appearing in the community library\./)
})

// Whether Stripe emails a receipt is a dashboard setting (Settings -> Customer
// emails) that nothing in this repository can see or turn on.
test('the checkout return page does not claim a confirmation email was sent', () => {
  const src = stripComments(read('src/pages/CheckoutReturn.jsx'))
  assert.ok(!/confirmation has been sent/i.test(src))
})
