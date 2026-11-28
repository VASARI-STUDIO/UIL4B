// The email a customer gets a few days before a free trial turns into a paid
// subscription: when the first charge happens, how much it is, how to cancel.
//
// Files in /api/_lib are underscore-prefixed and NOT deployed as routes, so this
// adds nothing to the 12-function budget.
//
// The builders are pure. `sendTrialReminder` takes its collaborators (database,
// fetch, env, Stripe, a lookup for the account email) so tests run without a
// network. It never throws: a mail problem must not fail the Stripe webhook that
// triggered it.

import { cleanKey } from './env.js'
import { mailFrom, REPLY_TO } from './mail.js'
import { adminAuth } from './firebase-admin.js'

export const CANCEL_URL = 'https://uil4b.com/settings?section=support'

const OUTBOUND_TIMEOUT_MS = 5000
const INTERVAL_WORD = { year: 'a year', month: 'a month', week: 'a week', day: 'a day' }

// en-CA writes AUD as "A$48.00" and USD as "US$48.00", so the currency is clear
// without spelling out the code.
const DEFAULT_LOCALE = 'en-CA'
const DEFAULT_TIME_ZONE = 'Australia/Sydney'

function dateParts(trialEnd, timeZone) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone,
  }).formatToParts(new Date(trialEnd * 1000))
  const pick = (type) => parts.find((p) => p.type === type)?.value || ''
  return { weekday: pick('weekday'), day: pick('day'), month: pick('month'), year: pick('year') }
}

function money(amount, currency, locale) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !currency) return ''
  try {
    // Stripe amounts are in the currency's smallest unit; the formatter knows
    // how many decimals the currency has.
    const digits = new Intl.NumberFormat(locale, { style: 'currency', currency: currency.toUpperCase() })
      .resolvedOptions().maximumFractionDigits
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency.toUpperCase() })
      .format(amount / 10 ** digits)
  } catch {
    return ''
  }
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Build the reminder. `trialEnd` is Stripe's `trial_end` (seconds), `amount` the
 * price's `unit_amount` (smallest currency unit). With no usable amount the
 * amount sentence is left out rather than guessed.
 */
export function buildTrialReminder({ trialEnd, amount, currency, interval, locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE }) {
  const d = dateParts(trialEnd, timeZone)
  const longDate = `${d.weekday} ${d.day} ${d.month} ${d.year}`
  const price = money(amount, currency, locale)
  const per = INTERVAL_WORD[interval]
  const amountLine = price && per ? `The amount is ${price} ${per}.` : ''

  const subject = `Your UIL4B trial ends on ${d.day} ${d.month}`
  const chargeLine = `Your free UIL4B trial ends on ${longDate}. That is when your first charge happens.`
  const keepLine = 'If you want to keep Pro, you do not need to do anything.'
  const cancelLine = 'If you would rather not continue, you can cancel in your settings:'
  const cancelNote = 'If you cancel before the trial ends, you keep Pro until the trial ends and nothing is charged.'
  const helpLine = 'Questions? Reply to this email.'

  const text = [
    'Hi,',
    '',
    [chargeLine, amountLine].filter(Boolean).join(' '),
    '',
    keepLine,
    '',
    cancelLine,
    CANCEL_URL,
    '',
    cancelNote,
    '',
    helpLine,
    '',
    'UIL4B',
  ].join('\n')

  const p = 'margin:0 0 16px;font-size:16px;line-height:1.5;color:#1f2328;'
  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;">',
    `<p style="${p}">Hi,</p>`,
    `<p style="${p}">${escapeHtml([chargeLine, amountLine].filter(Boolean).join(' '))}</p>`,
    `<p style="${p}">${escapeHtml(keepLine)}</p>`,
    `<p style="${p}">${escapeHtml(cancelLine)} <a href="${escapeHtml(CANCEL_URL)}" style="color:#1f2328;">${escapeHtml(CANCEL_URL)}</a></p>`,
    `<p style="${p}">${escapeHtml(cancelNote)}</p>`,
    `<p style="${p}">${escapeHtml(helpLine)}</p>`,
    `<p style="${p}">UIL4B</p>`,
    '</div>',
  ].join('\n')

  return { subject, html, text }
}

const defaultAuthEmail = async (uid) => (await adminAuth().getUser(uid))?.email || ''

async function recipientFor({ subscription, uid, db, stripe, authEmail }) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId)
    if (customer && !customer.deleted && customer.email) return customer.email
  }
  const saved = (await db.collection('users').doc(uid).get()).data?.()
  if (saved?.email) return saved.email
  try {
    return (await authEmail(uid)) || ''
  } catch {
    return ''
  }
}

// Claim the reminder for this trial inside a transaction. True when this call
// took it; false when it was already sent (or claimed) for the same trial end.
async function claim(db, uid, trialEnd) {
  const ref = db.collection('users').doc(uid)
  return db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data?.()?.subscription?.trialReminderSentFor
    if (current === trialEnd) return false
    tx.set(ref, { subscription: { trialReminderSentFor: trialEnd } }, { merge: true })
    return true
  })
}

async function release(db, uid, trialEnd) {
  const ref = db.collection('users').doc(uid)
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data?.()?.subscription?.trialReminderSentFor
    if (current === trialEnd) tx.set(ref, { subscription: { trialReminderSentFor: null } }, { merge: true })
  })
}

/**
 * Email the customer once for this trial. Resolves a short outcome string and
 * never rejects: 'sent', 'already_sent', 'skipped_<why>', 'failed', or 'retry'
 * when the send hit a temporary failure and a later delivery could succeed.
 */
export async function sendTrialReminder(subscription, uid, {
  db,
  stripe,
  fetch: doFetch = globalThis.fetch,
  env = process.env,
  authEmail = defaultAuthEmail,
} = {}) {
  let claimed = false
  const trialEnd = subscription?.trial_end
  try {
    if (!uid || !trialEnd) return 'skipped_no_trial'
    if (subscription.status !== 'trialing') return 'skipped_not_trialing'
    if (subscription.cancel_at_period_end || subscription.cancel_at) return 'skipped_cancelled'

    const resendKey = cleanKey(env.RESEND_API_KEY)
    if (!resendKey) {
      console.warn('trial-reminder: RESEND_API_KEY is not set, no reminder sent')
      return 'skipped_no_key'
    }

    const to = await recipientFor({ subscription, uid, db, stripe, authEmail })
    if (!to) return 'skipped_no_email'

    if (!(await claim(db, uid, trialEnd))) return 'already_sent'
    claimed = true

    const price = subscription.items?.data?.[0]?.price
    const { subject, html, text } = buildTrialReminder({
      trialEnd,
      amount: price?.unit_amount,
      currency: price?.currency,
      interval: price?.recurring?.interval,
    })
    const res = await doFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
      body: JSON.stringify({ from: mailFrom(env), reply_to: REPLY_TO, to: [to], subject, html, text }),
    })
    if (!res.ok) {
      console.error('trial-reminder: email was refused by the provider', res.status)
      await release(db, uid, trialEnd)
      // A busy or failing provider may take it later; a refusal of the message itself will not.
      return res.status >= 500 || res.status === 429 ? 'retry' : 'failed'
    }
    return 'sent'
  } catch (err) {
    console.error('trial-reminder: could not send', err?.message)
    if (claimed) {
      try { await release(db, uid, trialEnd) } catch { /* the claim lapses with the next trial */ }
      // The send itself broke (network, timeout): worth another delivery.
      return 'retry'
    }
    return 'failed'
  }
}
