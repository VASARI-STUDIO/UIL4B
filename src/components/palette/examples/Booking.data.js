// Booking: a physio clinic's booking page. The month is the artefact: the
// chosen day is the primary, days with room are the subtle, today carries the
// accent dot and the held-time line is the success. Everything else is neutral.
//
// Plain data, no React: the calendar and the slot grid are built from the lists
// below, so the "2 left" note, the struck days and the slot grid cannot disagree
// with one another. Tests read ROLES and the copy without a DOM.

export const ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'warning', 'error', 'neutral']

// Every text colour the scene sets and what it reads against.
export const TEXT_RECIPE = [
  { el: 'headings, prices, labels, day numbers', ink: 'text', ground: 'canvas' },
  { el: 'weekday letters, notes, minutes, taken times, past days', ink: 'muted', ground: 'canvas' },
  { el: 'book button, chosen day', ink: 'fieldInks:--fi-ink', ground: 'primary' },
  { el: 'available day', ink: 'fieldInks:--fi-sub-ink', ground: 'subtle' },
  { el: 'change clinic link', ink: 'brandAsText:secondary', ground: 'canvas' },
  { el: 'held line', ink: 'success-ink', ground: 'canvas' },
  { el: 'full day, error line', ink: 'error-ink', ground: 'canvas' },
]

export const STATES = ['pick', 'held', 'full']

export const COPY = {
  brand: 'Bellbird Physio',
  nav: ['Clinics', 'Treatments', 'Book'],
  heading: 'Book an appointment',
  service: 'Initial consult',
  price: '$98',
  length: '45 minutes',
  clinician: 'Dr Anika Rowe',
  clinic: 'Paddington clinic',
  changeClinic: 'Change clinic',
  month: 'November 2026',
  date: 'Wednesday 18 November',
  time: '9:30 am',
  note: 'Thursday 19: 2 left',
  slotsHeading: 'Available times',
  held: 'Held for 10 minutes. Add your details to confirm.',
  full: 'Fully booked. Try Thursday 19 November.',
  ctaPick: 'Book 9:30 am',
  ctaHeld: 'Add your details',
  ctaFull: 'See Thursday 19 November',
}

export const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// November 2026 starts on a Sunday, so a Sunday-first grid is five rows. Day 11
// is today; days 1 to 10 have passed.
const DAYS = 30
const TODAY = 11
const OPEN = [11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27, 30]
const FULL = [17, 18]
const CHOSEN = 18

// Slots run in 45-minute steps, so the last of twelve is 4:15 pm.
export const SLOTS = ['8:00 am', '8:45 am', '9:30 am', '10:15 am', '11:00 am', '11:45 am', '12:30 pm', '1:15 pm', '2:00 pm', '2:45 pm', '3:30 pm', '4:15 pm']
const TAKEN = ['8:45 am', '11:00 am', '2:45 pm']
const CHOSEN_SLOT = '9:30 am'

/** The 35 grid cells for a state: a day, or an empty cell after the 30th. */
export function calendarCells(state) {
  const cells = []
  for (let i = 0; i < 35; i++) {
    const n = i + 1
    if (n > DAYS) {
      cells.push({ n: null })
      continue
    }
    const today = n === TODAY
    if (state === 'full' && FULL.includes(n)) cells.push({ n, today, cls: n === CHOSEN ? 'is-full is-ring' : 'is-full', role: 'error' })
    else if (n === CHOSEN) cells.push({ n, today, cls: 'is-sel', role: 'primary' })
    else if (OPEN.includes(n)) cells.push({ n, today, cls: 'is-av', role: 'subtle' })
    else cells.push({ n, today, cls: 'is-off', role: 'neutral' })
  }
  return cells
}

/** The slot list for a state; the held state marks the chosen slot. */
export const slotList = (state) =>
  SLOTS.map((t) => ({
    t,
    cls: TAKEN.includes(t) ? 'is-taken' : t === CHOSEN_SLOT ? 'is-sel' : '',
    hold: state === 'held' && t === CHOSEN_SLOT,
  }))

export const ctaFor = (state) => (state === 'full' ? COPY.ctaFull : state === 'held' ? COPY.ctaHeld : COPY.ctaPick)

export const calendarLabel = (state) =>
  `${COPY.month} calendar. Wednesday 18 is selected. ${state === 'full' ? 'Tuesday 17 and Wednesday 18 are fully booked.' : 'Thursday 19 has 2 times left.'}`
