// Reporting a piece of community content.
//
// A report travels the same road as every other message: POST /api/support, a
// `feedback` document, an email to whoever reads the queue. It is a `report`
// type with `source: 'inline'`, and everything specific to it - which item, why,
// the reporter's good-faith statement - is folded into `message`, because the
// endpoint's contract is exactly five fields and the feedback modal already
// leaves it that way (see tests/unit/report-context.test.js).
//
// Pure on purpose, so the rules are testable under `node --test` without a
// browser. The only function that touches `window` is requestContentReport.
import { CONTACT_EMAIL_MAX, isContactEmail } from './contactEmail.js'

/** Dispatched by a Report control; ContentReportDialog (mounted app-wide) answers it. */
export const REPORT_CONTENT_EVENT = 'uil4b:report-content'

/** The address for reporting without the form, or without an account. */
export const REPORT_EMAIL = 'support@uil4b.com'

export const REPORT_KINDS = Object.freeze(['design', 'prompt', 'icon', 'gradient', 'palette'])

/**
 * Why someone is reporting. The ids are what a reviewer reads in the queue, so
 * they are stable; the labels are what the reporter reads.
 * `needsDetails`: a notice of illegal content or infringement has to say what
 * the problem is, so these (and "something else") cannot be sent bare.
 */
export const REPORT_REASONS = Object.freeze([
  { id: 'illegal', label: 'Illegal content', hint: 'It breaks the law where you live or where we operate.', needsDetails: true },
  { id: 'harassment', label: 'Harassment or hate', hint: 'It targets, threatens or demeans a person or group.', needsDetails: false },
  { id: 'ip', label: 'Infringes intellectual property', hint: 'It copies work you or someone else owns.', needsDetails: true },
  { id: 'spam', label: 'Spam or a scam', hint: 'It is an advert, a scam or a link to somewhere harmful.', needsDetails: false },
  { id: 'other', label: 'Something else', hint: 'It breaks our rules in a way not listed here.', needsDetails: true },
])

export const REPORT_DETAILS_MAX = 2000
export const REPORT_DETAILS_MIN = 10
const NAME_MAX = 120
const ID_MAX = 120
const URL_MAX = 300

const oneLine = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

export function reasonById(id) {
  return REPORT_REASONS.find(r => r.id === id) || null
}

/**
 * The thing being reported, reduced to what a reviewer needs to find it.
 * Returns null when it cannot identify an item (no known kind, no id) - a
 * report that points at nothing must never be offered.
 *
 * `page` is the address of the page the item is on, with no query string or
 * hash: the colour tools carry whole palettes in `?c=`, which is someone's
 * work and not part of a notice. `link` is the item's own outbound link, when
 * it has one.
 */
export function buildReportTarget({ kind, id, name, page, link } = {}) {
  if (!REPORT_KINDS.includes(kind)) return null
  const cleanId = oneLine(id == null ? '' : String(id), ID_MAX)
  if (!cleanId) return null
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  return {
    kind,
    id: cleanId,
    name: oneLine(name, NAME_MAX) || `this ${kind}`,
    page: oneLine(page || `${origin}${path}`, URL_MAX).split(/[?#]/)[0],
    link: /^https?:\/\//i.test(link || '') ? oneLine(link, URL_MAX) : '',
  }
}

export function reportSubject(target) {
  return `Content report: ${target.name}`.slice(0, 200)
}

/** The mailto for reporting without the form. Carries the same identifiers. */
export function reportMailto(target = null) {
  const subject = target ? reportSubject(target) : 'Content report'
  const body = target
    ? `Item: ${target.name} (${target.kind}, id ${target.id})\nPage: ${target.page}\nWhy I am reporting it:\n`
    : 'Link to the content:\nWhy I am reporting it:\n'
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/**
 * Whether the form may be sent, and what is wrong when it may not.
 * Errors are keyed by field so the dialog can attach each one to its control.
 *
 * The reporter's address is needed to tell them the outcome, and a notice of
 * illegal content under the EU Digital Services Act (Art. 16) has to carry
 * one - except for child sexual abuse material, where it may be left out so
 * nobody is put off reporting it. That one exception is why "Illegal content"
 * is the single reason that does not demand an address from a signed-out
 * reporter. Signed in, the account's address is used and nothing is asked.
 */
export function validateReport({ target, reasonId, details, email, signedIn, goodFaith } = {}) {
  const errors = {}
  const reason = reasonById(reasonId)
  const text = typeof details === 'string' ? details.trim() : ''
  if (!target) errors.target = 'We could not tell which item this is. Use the email address below instead.'
  if (!reason) errors.reason = 'Choose why you are reporting this.'
  if (text.length > REPORT_DETAILS_MAX) errors.details = `Keep the details under ${REPORT_DETAILS_MAX} characters.`
  else if (reason?.needsDetails && text.length < REPORT_DETAILS_MIN) {
    errors.details = reason.id === 'other'
      ? 'Tell us what is wrong so we can look at it.'
      : 'Explain what the problem is so we can look at it.'
  }
  if (!signedIn) {
    const address = typeof email === 'string' ? email.trim() : ''
    if (address && !isContactEmail(address)) errors.email = 'That email address does not look right.'
    else if (!address && reason && reason.id !== 'illegal') errors.email = 'Add your email so we can tell you what we decide.'
  }
  if (!goodFaith) errors.goodFaith = 'Confirm the report is accurate before sending it.'
  return { ok: Object.keys(errors).length === 0, errors }
}

/**
 * The message body: the same lines every time, so a reviewer scanning the
 * queue reads the reason and the item first and the free text last.
 */
export function buildReportMessage({ target, reasonId, details }) {
  const reason = reasonById(reasonId)
  const lines = [
    'CONTENT REPORT',
    `Reason: ${reason ? `${reason.label} (${reason.id})` : 'not given'}`,
    `Item: ${target.name}`,
    `Kind: ${target.kind}`,
    `Item id: ${target.id}`,
    `Page: ${target.page}`,
  ]
  if (target.link) lines.push(`Link: ${target.link}`)
  lines.push('Good-faith statement: the reporter confirmed this report is accurate and complete.')
  const text = typeof details === 'string' ? details.trim() : ''
  if (text) lines.push('', 'Details:', text)
  return lines.join('\n').slice(0, 5000)
}

/**
 * The body POSTed to /api/support, or null when the form is not valid.
 * `accountEmail` wins over a typed address, as it does on /feedback.
 */
export function buildReportPayload({ target, reasonId, details, email, accountEmail, goodFaith }) {
  const check = validateReport({ target, reasonId, details, email, signedIn: !!accountEmail, goodFaith })
  if (!check.ok) return null
  return {
    type: 'report',
    subject: reportSubject(target),
    message: buildReportMessage({ target, reasonId, details }),
    email: (accountEmail || (typeof email === 'string' ? email.trim() : '')).slice(0, CONTACT_EMAIL_MAX),
    source: 'inline',
  }
}

/**
 * Ask the app-wide dialog to open for `target`. Resolves true when something
 * answered; false means no dialog is mounted and the caller should fall back
 * to the /feedback page.
 */
export function requestContentReport(target) {
  if (!target || typeof window === 'undefined') return false
  const event = new CustomEvent(REPORT_CONTENT_EVENT, { cancelable: true, detail: { target } })
  return !window.dispatchEvent(event)
}
