// Crash reports: what a runtime error becomes on its way to the admin
// feedback queue.
//
// THE SAME PLACE AS EVERY OTHER REPORT. A crash is posted to /api/support as a
// `bug` with `source: 'inline'`, exactly the payload shape the feedback modal
// sends, so it lands in Admin → Submissions next to what people wrote. There
// is no new serverless function (all 12 slots are used) and no new store.
//
// NO PII. The report carries the error's message, the route WITHOUT its query
// string or hash, and the top of the stack reduced to file names. Nothing from
// the account: no email, no uid, no display name. Anything shaped like an
// email address in the message is replaced, because error messages sometimes
// quote the input that caused them.
//
// RATE-LIMITED ON BOTH ENDS. /api/support allows 3 messages a minute per
// connection, and a crash report must never be the reason a person's own
// "Report this" is refused. So this sends at most TWO automatic reports per
// browser session, never the same error twice, and at least 30 s apart.
//
// PRODUCTION ONLY. On localhost, previews and the test build the report is
// written to the console instead of posted, so a local crash never lands in the
// admin queue and the acceptance suite never makes a request it did not
// plan for.

import { canWriteSharedAnalytics } from './environment.js'

export const SESSION_LIMIT = 2
export const MIN_INTERVAL_MS = 30 * 1000
const STORE_KEY = 'uil4b-error-reports'
const EMAIL_RE = /[^\s@<>()"'`]+@[^\s@<>()"'`]+\.[a-z]{2,}/gi

/** The route with no query string and no hash — `?session_id=` and friends
 *  are exactly the kind of thing that should never be sent anywhere. */
export function cleanRoute(pathname) {
  return String(pathname || '/').split('?')[0].split('#')[0] || '/'
}

function scrub(text) {
  return String(text || '').replace(EMAIL_RE, '[email]')
}

/** Stack frames reduced to `function (file:line:col)`, with every URL cut to
 *  its last path segment and its query string dropped. */
export function topFrames(stack, max = 5) {
  return String(stack || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /:\d+:\d+\)?$/.test(l))
    .slice(0, max)
    .map((l) => l.replace(/(?:https?|blob|file):\/\/[^\s)]*\/([^/\s)?#]+)(?:[?#][^\s):]*)?/g, (_, file) => file))
    .map(scrub)
}

function messageOf(error) {
  if (error instanceof Error) return error.message || error.name || 'Error'
  if (typeof error === 'string') return error
  try { return JSON.stringify(error) } catch { return String(error) }
}

/**
 * The report for one error, as the {subject, message} pair /api/support takes.
 * `kind` says where it was caught: 'render' (an error boundary), 'error' (a
 * window error event) or 'rejection' (an unhandled promise rejection).
 */
export function describeError(error, { pathname = '/', kind = 'error' } = {}) {
  const route = cleanRoute(pathname)
  const text = scrub(messageOf(error)).slice(0, 300)
  const frames = topFrames(error && error.stack)
  const lines = [
    `Automatic report (${kind}) — nobody typed this.`,
    `Route: ${route}`,
    `Error: ${text}`,
  ]
  if (frames.length) lines.push('Stack:', ...frames.map((f) => `  ${f}`))
  return {
    subject: `Crash on ${route}: ${text}`.slice(0, 200),
    message: lines.join('\n').slice(0, 4000),
  }
}

/** Errors that are not ours to report: a cross-origin script's opaque
 *  "Script error.", and the ResizeObserver loop warning every browser raises. */
export function isNoise(message) {
  const m = String(message || '')
  return m === 'Script error.' || m === 'Script error' || /ResizeObserver loop/.test(m)
}

function readLog(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * A reporter that decides whether to send, and remembers what it sent in
 * sessionStorage. Every collaborator is injected, so the rules are testable
 * under `node --test` with no browser.
 */
export function createErrorReporter({ send, storage, now = () => Date.now() }) {
  return function report(error, context) {
    const { subject, message } = describeError(error, context)
    if (isNoise(messageOf(error))) return false
    const key = subject
    const log = readLog(storage)
    if (log.length >= SESSION_LIMIT) return false
    if (log.some((e) => e.key === key)) return false
    const last = log.length ? log[log.length - 1].at : 0
    if (now() - last < MIN_INTERVAL_MS) return false
    try {
      storage?.setItem(STORE_KEY, JSON.stringify([...log, { key, at: now() }]))
    } catch {
      // Storage refused (private mode, quota). Sending anyway could repeat on
      // every error, so the safe answer is not to send.
      return false
    }
    send({ type: 'bug', subject, message, email: '', source: 'inline' })
    return true
  }
}

function postToSupport(body) {
  fetch('/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => { /* a crash report that cannot be sent is not a second crash */ })
}

function consoleOnly(body) {
  console.info('[crash report, not sent outside production]', body.subject)
}

let reporter = null

function getReporter() {
  if (!reporter) {
    let storage = null
    try { storage = window.sessionStorage } catch { storage = null }
    reporter = createErrorReporter({
      send: canWriteSharedAnalytics() ? postToSupport : consoleOnly,
      storage,
    })
  }
  return reporter
}

/** Record one error. Safe to call from anywhere, including a boundary. */
export function reportError(error, kind = 'error') {
  try {
    return getReporter()(error, { pathname: window.location.pathname, kind })
  } catch {
    return false
  }
}

/** Listen for errors nothing else caught. Called once, from main.jsx. */
export function installGlobalErrorCapture(target = window) {
  target.addEventListener('error', (event) => {
    // A failed <img>/<script> load also fires `error` on window during
    // capture, with no `error` object — that is a missing asset, not a crash.
    if (!event || (!event.error && !event.message)) return
    reportError(event.error || event.message, 'error')
  })
  target.addEventListener('unhandledrejection', (event) => {
    reportError(event?.reason, 'rejection')
  })
}

/**
 * Open the feedback dialog prefilled with this crash. FeedbackButton listens
 * for the event and cancels it; if nothing cancelled it (the crash took the
 * listener down with it) the caller falls back to the /feedback page.
 */
export const REPORT_PROBLEM_EVENT = 'uil4b:report-problem'

export function openProblemReport(error, pathname) {
  const { subject, message } = describeError(error, { pathname, kind: 'render' })
  const event = new CustomEvent(REPORT_PROBLEM_EVENT, {
    cancelable: true,
    detail: {
      typeId: 'bug',
      subject,
      message: `${message}\n\nWhat were you doing when this happened?\n`,
    },
  })
  const unhandled = window.dispatchEvent(event)
  if (unhandled) window.location.assign('/feedback')
}
