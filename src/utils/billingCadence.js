// How often a subscription bills, in words — the one place that decides.
// Settings, Admin, /plans and the upgrade surfaces all read their cadence
// wording from here (config/planFacts.js imports it).
//
// Stripe stores a quarterly price as `interval: 'month', interval_count: 3`,
// so `interval` alone cannot tell quarterly from monthly. The subscription
// document carries `intervalCount` (api/_lib/billing.js), and every label is
// derived here. A document with no stored count is read as a count of 1.

const COUNT_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

/** 'monthly', 'yearly', 'every three months', 'every two years' … */
export function everyWords(interval, intervalCount = 1) {
  if (!interval) return ''
  const count = Number(intervalCount) > 1 ? Number(intervalCount) : 1
  const unit = { day: 'day', week: 'week', month: 'month', year: 'year' }[interval] || interval
  if (count === 1) return unit === 'day' ? 'daily' : `${unit}ly`
  return `every ${COUNT_WORDS[count] || count} ${unit}s`
}

/** How often each buyable cadence bills: { monthly, quarterly, yearly }. */
export const BILLED_EVERY = Object.freeze({
  monthly: everyWords('month', 1),
  quarterly: everyWords('month', 3),
  yearly: everyWords('year', 1),
})

/** 'monthly' | 'every three months' | 'yearly' | 'every two years' | '' */
export function cadenceOf(subscription) {
  return everyWords(subscription?.interval, subscription?.intervalCount)
}

/** The Settings line: "Billed monthly", "Billed every three months", "Billed yearly". */
export function billedLabel(subscription) {
  const cadence = cadenceOf(subscription)
  return cadence ? `Billed ${cadence}` : ''
}
