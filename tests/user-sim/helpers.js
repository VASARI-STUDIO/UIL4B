// Shared feedback-loop plumbing for the user-simulation suite.
//
// Every persona test calls watch(page, persona) once. From then on any
// uncaught page exception or unexpected console error is recorded as a
// finding, and tests can add their own UX observations with note(). Findings
// from all workers append to report/findings.jsonl; the global teardown (and
// summarize.js) turn that into the human-readable feedback report.
import fs from 'node:fs'
import path from 'node:path'
import { expect } from '@playwright/test'

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

/* ── Reading a scroll position that has stopped moving ───────────────────────
 *
 * WHY THIS EXISTS
 * The app runs Lenis smooth scroll (src/hooks/useSmoothScroll.js), so the
 * scroll position is an animation, not a value. Every test that reads
 * `window.scrollY` after causing one is therefore sampling a curve, and every
 * such test in this suite used to decide WHEN to sample with a wall clock —
 * `waitForTimeout(600)`, or a poll for two equal readings 100ms apart.
 *
 * Both are guesses about someone else's animation, and both have failed CI:
 * "stayed put (was 467, now 700)" is a baseline captured mid-flight and the
 * remaining 233px of easing then charged to whatever the test did next.
 *
 * The two-equal-samples version looks safer and is not. `window.scrollY` is a
 * whole-pixel view of a fractional value Lenis keeps damping until
 * `Math.round(value) === Math.round(target)`, so two equal readings mean only
 * "it moved less than a pixel between two arbitrary instants" — which is true
 * at the tail of every ease, and true anywhere on the curve when the sampling
 * cadence and the frame cadence line up badly. Instrumenting it showed it
 * exiting with `<html class="lenis-scrolling">` still set, recording 813 for a
 * page that came to rest at 814, on every single run. Nothing in it bounds how
 * far off that reading can be; on an idle laptop it is a pixel, and on a loaded
 * runner it is however much easing is left.
 *
 * So: ask the page, not the clock. The moment of the reading is decided by two
 * things the page can actually answer — the smooth-scroll layer has nothing in
 * flight, and the position has not changed for several animation frames running
 * — which is the same move 24-mobile-overhaul.spec.js made for its CTA reveal.
 */

// Consecutive unchanged animation frames that count as "stopped". Counted in
// FRAMES, not milliseconds, because a loaded runner paints fewer of them per
// second and the whole point here is to stop measuring animation against a clock.
const STILL_FRAMES = 8

// A backstop, and ONLY a backstop: it exists so a page whose frames never
// arrive fails with the message below instead of hanging until the test's own
// timeout. It never decides when a reading is taken.
const REST_BACKSTOP_MS = 6000

/** Resolves with the resting scrollY, or null if the page never stopped moving. */
const waitForRest = (page) => page.evaluate(({ needed, backstop }) => new Promise((resolve) => {
  const root = document.documentElement
  let last = null
  let still = 0
  // `done` stops the frame loop rather than merely stopping it from mattering:
  // a resolved promise silences a stray tick, but the tick itself would go on
  // costing a frame callback for the life of the page, once per call.
  let done = false
  const finish = (value) => { done = true; clearTimeout(timer); resolve(value) }
  const timer = setTimeout(() => finish(null), backstop)
  const tick = () => {
    if (done) return
    const y = window.scrollY
    still = y === last ? still + 1 : 0
    last = y
    // Lenis stamps `lenis-scrolling` on <html> for exactly as long as it has an
    // animation in flight and takes it off when that animation lands. Without
    // this half, "the number has not changed for eight frames" is only evidence
    // that the number has not changed for eight frames. With it, the scroll
    // layer itself is the one saying it has finished. When Lenis is absent
    // (reduced motion never instantiates it) the class is never there and
    // stillness alone is the right answer for a native scroll.
    if (still >= needed && !root.classList.contains('lenis-scrolling')) { finish(y); return }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}), { needed: STILL_FRAMES, backstop: REST_BACKSTOP_MS })

/**
 * `window.scrollY`, read only once the page has actually come to rest.
 *
 * `what` names the moment for the failure message — this throws rather than
 * returning a half-measured number, because a scroll that never settles is a
 * finding, not something to average over.
 */
export async function restingScrollY(page, what = 'the page') {
  let resting = null
  await expect.poll(async () => {
    resting = await waitForRest(page)
    return resting
  }, {
    timeout: REST_BACKSTOP_MS * 3,
    intervals: [100],
    message: `${what}: the scroll position never stopped moving, so there is nothing honest to measure`,
  }).not.toBeNull()
  return resting
}

/**
 * One wheel gesture, and then the position it comes to rest at.
 *
 * The wait for the gesture to be TAKEN UP is not decoration. Dispatching a
 * wheel event and finding the scroll layer idle a few frames later has two
 * readings — "the gesture is finished" and "the gesture has not started" — and
 * this helper would otherwise return the pre-gesture position for the second.
 * A gesture that is never taken up is not an error here (the page may already
 * be at the bottom); callers send another one, and their own assertion on the
 * final position is what judges the result.
 */
export async function wheelToRest(page, dy, what = 'the page') {
  const before = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, dy)
  await page.waitForFunction(
    (from) => window.scrollY !== from || document.documentElement.classList.contains('lenis-scrolling'),
    before,
    { timeout: 2000 },
  ).catch(() => { /* not taken up; see above */ })
  return restingScrollY(page, what)
}
