// The renewal sentence shown on the checkout page: how often the plan renews and
// that it continues until cancelled, with the amount only when it is confirmed.
// Pure, so the wording is testable without rendering the page.

// "month", "3 months", "year": the billing period as a buyer reads it.
export function periodWords(months) {
  if (months === 1) return 'month'
  if (months === 12) return 'year'
  if (Number.isInteger(months) && months > 1) return `${months} months`
  return null
}

const TAIL = 'until you cancel. Cancel any time in Settings → Plan and billing.'

/**
 * @param {{ trialDays: number, amount: string|null, months: number }} plan
 *   `amount` is the already-formatted price the page shows ("$48", "A$96"), or
 *   null when that price is not confirmed live.
 * @returns {string|null} A sentence that names the amount only when one is
 *   given; without it, a figure-free sentence, so a missing or fallback price
 *   is never quoted. null only for an unknown period.
 */
export function renewalDisclosure({ trialDays, amount, months }) {
  const period = periodWords(months)
  if (!period) return null
  const trial = trialDays > 0
  if (amount) {
    return trial
      ? `${trialDays}-day free trial, then ${amount} every ${period} ${TAIL}`
      : `${amount} every ${period} ${TAIL}`
  }
  return trial
    ? `${trialDays}-day free trial, then renews every ${period} ${TAIL}`
    : `Renews every ${period} ${TAIL}`
}

/**
 * The figure the renewal sentence may quote, or null when it must stay figure-free.
 * It needs both a price the service confirmed live and a payment session known to
 * be created in the currency that figure is shown in: the server falls back to a
 * returning customer's locked currency, and quoting A$ while charging US$ is
 * worse than quoting nothing. A currency the server did not report counts as a
 * mismatch.
 *
 * @param {{ amount: string|null, live: boolean, displayCurrency: string, sessionCurrency: string|null|undefined }} input
 * @returns {string|null}
 */
export function quotableAmount({ amount, live, displayCurrency, sessionCurrency }) {
  if (!amount || !live) return null
  if (typeof displayCurrency !== 'string' || typeof sessionCurrency !== 'string') return null
  if (!displayCurrency || displayCurrency.toLowerCase() !== sessionCurrency.toLowerCase()) return null
  return amount
}
