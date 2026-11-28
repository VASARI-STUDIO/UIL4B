// The "what you pay and when" rows on the plan step. Pure: dates come from the
// `now` it is given, amounts from the `money` function it is given, so nothing
// here knows a price or a currency.

// The reminder email goes out this many days before the trial ends.
export const REMINDER_DAYS_BEFORE_TRIAL_END = 3

const addDays = (date, days) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

// One calendar month on, clamped to the last day of that month (31 Jan -> 28 Feb).
export function addMonth(date) {
  const first = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), last))
}

// Short date in the person's locale, for example "2 Dec".
export function shortDate(date, locale) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date)
}

// Rows are { id, when, textKey, amount }. `when` is null for today (the caller
// writes the word), otherwise the formatted date. `amount` is '' for no amount.
// `cancelDate` is the last day to cancel for nothing (yearly only), else ''.
export function buildLedger({ months, trialDays, total, now, locale, money }) {
  const date = (d) => shortDate(d, locale)
  const price = money(total)
  if (months === 12 && trialDays > 0) {
    const reminder = Math.max(trialDays - REMINDER_DAYS_BEFORE_TRIAL_END, 0)
    const firstCharge = date(addDays(now, trialDays))
    return {
      kind: 'yearly',
      rows: [
        { id: 'start', when: null, textKey: 'ledgerTrialStarts', amount: money(0) },
        { id: 'reminder', when: date(addDays(now, reminder)), textKey: 'ledgerReminder', amount: '' },
        { id: 'charge', when: firstCharge, textKey: 'ledgerFirstCharge', amount: price },
      ],
      cancelDate: firstCharge,
    }
  }
  return {
    kind: 'monthly',
    rows: [
      { id: 'start', when: null, textKey: 'ledgerProStarts', amount: price },
      { id: 'charge', when: date(addMonth(now)), textKey: 'ledgerNextCharge', amount: price },
    ],
    cancelDate: '',
  }
}
