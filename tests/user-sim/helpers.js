// Shared feedback-loop plumbing for the user-simulation suite.
//
// Every persona test calls watch(page, persona) once. From then on any
// uncaught page exception or unexpected console error is recorded as a
// finding, and tests can add their own UX observations with note(). Findings
// from all workers append to report/findings.jsonl; the global teardown (and
// summarize.js) turn that into the human-readable feedback report.
import fs from 'node:fs'
import path from 'node:path'

export const REPORT_DIR = path.join(process.cwd(), 'tests', 'user-sim', 'report')
export const FINDINGS_FILE = path.join(REPORT_DIR, 'findings.jsonl')

// Network noise that is expected inside the sandboxed test runner (external
// hosts are blocked; the Vercel insights script only exists in production).
// Anything else that errors is a real finding.
const EXPECTED_NOISE = [
  /_vercel\/insights/,
  /fonts\.googleapis\.com/, /fonts\.gstatic\.com/,
  /googleapis\.com/, /firebaseinstallations/, /identitytoolkit/,
  /api\.iconify\.design/,
  // `vite preview` serves dist/ as static files and runs no Vercel functions,
  // so EVERY /api/* request 404s here regardless of whether it is correct.
  // 22-feedback-and-focus.spec.js relies on that to exercise the failed-send
  // path — the property that matters is that the form never claims success on
  // a request that did not land, and this is the only way to test it without a
  // live backend.
  /\/api\/[a-z-]+/,
  /ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_TUNNEL/,
]

// Everything this used to special-case for Google One Tap — the [GSI_LOGGER]
// FedCM AbortError/NetworkError pairs, and the document-level "Error retrieving
// a token." / "Provider's accounts list is empty" noise — is gone, because One
// Tap no longer loads at all: base.js stubs accounts.google.com for every
// browser context in the suite. Leaving the suppression in place would mean a
// stub that quietly stopped covering a spec produced no visible symptom, which
// is the exact failure this file is meant to surface. If GSI_LOGGER errors ever
// come back, they are findings again — and the run fails outright in
// assertOneTapNeverLeft().
function isExpectedNoise(text, url) {
  const hay = `${text} ${url || ''}`
  return EXPECTED_NOISE.some((re) => re.test(hay))
}

export function record(finding) {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.appendFileSync(FINDINGS_FILE, JSON.stringify({ at: new Date().toISOString(), ...finding }) + '\n')
}

/**
 * Attach crash/console watchdogs to a page for one persona.
 * Returns { note } for recording soft UX observations mid-flow.
 */
export function watch(page, persona) {
  page.on('pageerror', (err) => {
    record({
      persona,
      severity: 'critical',
      kind: 'uncaught-exception',
      where: page.url(),
      message: String(err && err.message ? err.message : err).slice(0, 500),
    })
  })
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const location = msg.location() || {}
    const url = location.url || ''
    const deliberateMotionAbort = persona === 'visitor whose motion chunk never arrives'
      && /ERR_FAILED/.test(msg.text())
      && /assets\/(?:gsap|ScrollTrigger)-/.test(url)
    if (deliberateMotionAbort) return
    if (isExpectedNoise(msg.text(), url)) return
    const source = url
      ? ` (${url}${location.lineNumber != null ? `:${location.lineNumber}:${location.columnNumber || 0}` : ''})`
      : ''
    record({
      persona,
      severity: 'error',
      kind: 'console-error',
      where: page.url(),
      message: `${msg.text().slice(0, 300)}${source}`,
    })
  })
  return {
    note(severity, message, where) {
      record({ persona, severity, kind: 'ux-observation', where: where || page.url(), message })
    },
  }
}

/**
 * Navigate without waiting for the full 'load' event: blocked external hosts
 * (fonts, Firebase, iconify) can hold 'load' — and 'networkidle' never settles
 * — inside the sandboxed runner. DOM-ready is enough for an SPA shell; tests
 * then wait on real UI via locators.
 */
export function go(page, url) {
  return page.goto(url, { waitUntil: 'domcontentloaded' })
}

/** Assert-and-record helper: the page rendered real content (not a blank shell). */
export async function expectRendered(page) {
  const textLen = await page.evaluate(() => (document.body.innerText || '').trim().length)
  return textLen > 40
}
