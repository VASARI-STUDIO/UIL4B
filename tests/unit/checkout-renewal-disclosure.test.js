// Checkout tells the buyer how the plan renews, and what is charged after any
// trial only when that price is confirmed live, and that subscribing means
// agreeing to the Terms. The sentence is built from the plan's period and the
// price the page shows, so these tests pin the wording for each shape and for
// the "price not confirmed" case.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments, assertStripperWorks } from './helpers/source-text.js'
import { renewalDisclosure, periodWords, quotableAmount } from '../../src/utils/renewalDisclosure.js'

test('yearly: trial, then the yearly amount until cancelled', () => {
  assert.equal(
    renewalDisclosure({ trialDays: 7, months: 12, amount: 'A$96' }),
    '7-day free trial, then A$96 every year until you cancel. Cancel any time in Settings → Plan and billing.',
  )
})

test('monthly (no trial): the monthly amount until cancelled', () => {
  assert.equal(
    renewalDisclosure({ trialDays: 0, months: 1, amount: '$7' }),
    '$7 every month until you cancel. Cancel any time in Settings → Plan and billing.',
  )
})

test('a 3-month period reads "every 3 months"', () => {
  assert.equal(
    renewalDisclosure({ trialDays: 7, months: 3, amount: '$18' }),
    '7-day free trial, then $18 every 3 months until you cancel. Cancel any time in Settings → Plan and billing.',
  )
  assert.equal(periodWords(3), '3 months')
})

test('no confirmed amount: a figure-free sentence that still says how often it renews', () => {
  for (const amount of [null, undefined, '']) {
    // A trial on any offered period names the period, never just "automatically".
    for (const [months, word] of [[1, 'month'], [3, '3 months'], [12, 'year']]) {
      assert.equal(
        renewalDisclosure({ trialDays: 7, months, amount }),
        `7-day free trial, then renews every ${word} until you cancel. Cancel any time in Settings → Plan and billing.`,
      )
    }
    assert.equal(
      renewalDisclosure({ trialDays: 0, months: 1, amount }),
      'Renews every month until you cancel. Cancel any time in Settings → Plan and billing.',
    )
    assert.equal(
      renewalDisclosure({ trialDays: 0, months: 12, amount }),
      'Renews every year until you cancel. Cancel any time in Settings → Plan and billing.',
    )
  }
  assert.equal(renewalDisclosure({ trialDays: 0, months: 0, amount: '$7' }), null, 'an unknown period must not print')
})

test('quotableAmount: the figure is shown only when the session currency matches the displayed one', () => {
  const base = { amount: 'A$96', live: true, displayCurrency: 'aud', sessionCurrency: 'aud' }
  assert.equal(quotableAmount(base), 'A$96', 'same currency, live: quoted')
  assert.equal(quotableAmount({ ...base, sessionCurrency: 'AUD' }), 'A$96', 'case does not matter')
  assert.equal(quotableAmount({ ...base, sessionCurrency: 'usd' }), null, 'a locked-currency session in USD must not carry an A$ figure')
  assert.equal(quotableAmount({ ...base, sessionCurrency: null }), null, 'no reported currency: omitted')
  assert.equal(quotableAmount({ ...base, sessionCurrency: undefined }), null, 'session not created yet: omitted')
  assert.equal(quotableAmount({ ...base, live: false }), null, 'a fallback price is never quoted, even on a match')
  assert.equal(quotableAmount({ ...base, amount: null }), null)
})

test('a mismatched currency reads as the figure-free sentence end to end', () => {
  const sentence = (sessionCurrency) => renewalDisclosure({
    trialDays: 7,
    months: 12,
    amount: quotableAmount({ amount: 'A$96', live: true, displayCurrency: 'aud', sessionCurrency }),
  })
  assert.match(sentence('aud'), /then A\$96 every year/)
  assert.equal(sentence('usd'), '7-day free trial, then renews every year until you cancel. Cancel any time in Settings → Plan and billing.')
})

test('the trial length is an input, not typed into the sentence builder', () => {
  const text = renewalDisclosure({ trialDays: 14, months: 12, amount: '$48' })
  assert.match(text, /^14-day free trial, then \$48 every year/)
  assert.equal(periodWords(1), 'month')
  assert.equal(periodWords(12), 'year')
})

test('Checkout.jsx quotes the amount only when it is live, and renders the terms above the payment form', () => {
  // Read as-is: the JSX text holds apostrophes that the comment stripper would
  // mistake for string delimiters, and these patterns are specific enough that
  // a comment cannot satisfy them.
  const src = read('src/pages/Checkout.jsx')
  assert.match(src, /proPrice\.source\[planKey\] === 'live'/, 'the amount is not gated on a live price')
  assert.match(src, /renewalDisclosure\(\{[\s\S]*?trialDays: ladderEntry\?\.trialDays[\s\S]*?amount: quotableAmount\(\{[^}]*live: amountLive[^}]*displayCurrency: proPrice\.currency[^}]*sessionCurrency: sessionCurrencies\[planKey\]/, 'the page no longer derives the sentence from the ladder, the live amount and the session currency')
  assert.match(src, /createCheckoutSession\(sessionInterval, \(session\) => \{[\s\S]*?session\?\.currency/, 'the page does not read the currency the session was created in')
  const renewalAt = src.indexOf('className="checkout-renewal"')
  const termsAt = src.indexOf('className="checkout-terms"')
  const embedAt = src.indexOf('<CheckoutEmbed fetch')
  assert.ok(renewalAt > 0 && termsAt > renewalAt && embedAt > termsAt, 'the renewal line and Terms line must sit above the Stripe embed')
  assert.match(src, /className="checkout-renewal" aria-live="polite"/, 'a period change is not announced')
  assert.equal(src.split('className="checkout-renewal"').length, 2, 'the renewal line is rendered once')
  assert.match(src, /<Link to="\/terms" target="_blank" rel="noopener noreferrer">Terms<\/Link> and <Link to="\/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy<\/Link>/)
  assert.doesNotMatch(src, /cancel anytime/i, 'say "any time" everywhere')
  // The routes the links point at must exist in the router.
  assertStripperWorks(assert)
  const app = stripComments(read('src/App.jsx'))
  assert.match(app, /<Route path="\/terms"/)
  assert.match(app, /<Route path="\/privacy"/)
})
