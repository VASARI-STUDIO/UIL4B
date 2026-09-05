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
 * Navigate WITHOUT waiting for the route to arrive.
 *
 * This is the ONE documented hole in the door below, and it has exactly two
 * callers, both of which exist to read the page in a moment that `go()` is
 * defined to wait past:
 *
 *   47-lazy-route-readiness.spec.js — reads a route while its chunk is still
 *     in flight, to state the old contract's vacuity as two numbers from one
 *     instant (body 421 passes, the route's own 0 does not).
 *   04-premium-home.spec.js — reads `#boot-shell`, the static markup
 *     `scripts/prerender.mjs` writes into the shell, BEFORE React replaces it.
 *     It needs `waitUntil: 'commit'` rather than the default: module scripts
 *     run before DOMContentLoaded fires, so by 'domcontentloaded' the shell it
 *     is asserting on can already be gone. That is why `opts` exists here — the
 *     alternative was leaving a bare `page.goto()` in the suite, which is the
 *     thing the unit guard is for.
 *
 * Not waiting for the full 'load' event is separate and applies to all of them:
 * the blocked external hosts (fonts, Firebase, iconify) can hold 'load', and
 * 'networkidle' never settles at all inside the sandboxed runner.
 */
export function goRaw(page, url, opts) {
  return page.goto(url, { waitUntil: 'domcontentloaded', ...opts })
}

/**
 * Navigate, and come back when the ROUTE is on screen rather than when its
 * loading fallback is.
 *
 * This used to be `goRaw` above, and closing the gap here rather than at the
 * call sites is deliberate — see the long note below. Nineteen routes are
 * `lazy()`, the fallback keeps the nav, the footer and a visible `main` on
 * screen, and every readiness check the suite owned was satisfied by it. A
 * spec that navigated and then measured did not time out on a slow chunk: it
 * measured the chrome and reported a confident number about a page that was
 * not there. Fixing that per-spec left the next spec exposed, and expressed
 * the failure as a false claim about the app rather than as a wait that ran
 * out.
 *
 * Navigations followed only by `expect(locator)` did not strictly need this —
 * those auto-wait on the thing itself — but they are not harmed by it, and
 * one door is worth more here than a rule about which door to use when.
 */
export async function go(page, url) {
  const res = await goRaw(page, url)
  await ready(page, url)
  return res
}

/* ── Waiting for a LAZY ROUTE to have actually ARRIVED ───────────────────────
 *
 * WHY THIS EXISTS
 * Nineteen of this app's routes are `lazy()`, and App.jsx answers a pending
 * chunk with `<div className="page-loading">` rendered INSIDE `<main id="main">`
 * — so while the chunk is in flight the page still has the pill nav, the
 * footer, a visible `main`, and a non-empty `#root`. `src/pages/CreateTool.jsx`
 * does the same one level down for every live Create tool.
 *
 * Every readiness check this suite owned was satisfied by that state.
 * 43-state-token-contrast used `main, .landing, #root > *`, and all three parts
 * match the fallback. `expectRendered()` used `document.body.innerText > 40`,
 * and the fallback measures 421 characters of chrome. So a spec that navigates
 * and then MEASURES does not time out when a chunk is slow — it measures the
 * chrome and reports a confident number about a page that is not on screen.
 * That is how 43-state-token-contrast failed CI and blamed the branch under
 * test: throttled to 16x CPU, /privacy and /sitemap each counted ZERO
 * state-coloured nodes and the light total fell from 52 to 13.
 *
 * MEASURED, on this build, at `domcontentloaded` and again once settled
 * (every route the suite walks; `body` / `main` are innerText lengths):
 *
 *     route                fallback up          arrived
 *     /privacy             body 421  main 0     body 6537  main 6114
 *     /sitemap             body 421  main 0     body 4124  main 3702
 *     /plans               body 405  main 0     body 2779  main 2372
 *     /create/palette      body 412  main 0     body  737  main  323
 *
 * `main` is EMPTY in the fallback state on every one of them, and `body` never
 * is. That is the whole finding: the check was reading the shared chrome.
 *
 * WHY "the fallback is gone" IS NOT ENOUGH BY ITSELF
 * `waitFor({ state: 'detached' })` on `.page-loading` is satisfied by an
 * element that has not been ATTACHED yet — the entire pre-hydration window, in
 * which `#root` still holds only what `scripts/prerender.mjs` wrote (it clones
 * index.html's shell and rewrites the head; it does not render React). A wait
 * that accepts "not yet" as "already finished" is the same can't-fail shape one
 * level down.
 *
 * AND "#root HAS A CHILD" IS NOT ENOUGH EITHER, which is the half #391 found.
 * What prerender clones is not an empty div: index.html ships
 * `<div id="root"><div class="boot-shell" id="boot-shell">` — a skeleton nav,
 * a skeleton hero and a `role="status"` reading "Loading UIL4B" — into all 33
 * route shells. So in the pre-hydration window `root.firstElementChild` is
 * TRUE, of markup the server wrote. See BOOT_SHELL_HINT below.
 *
 * So all three are required, and required TOGETHER: React has committed
 * something into `#root`, the boot shell it replaces is gone, AND no fallback
 * is on screen — in the same frame.
 *
 * Held for several FRAMES, not milliseconds, for the reason the scroll helpers
 * below give at length — and because the nested case (`/create/*`, where the
 * static CreateTool shell mounts first and its inner Suspense raises a second
 * fallback in the same commit) needs the conditions to be true at the same
 * instant rather than at instants a test happened to sample.
 */

// Consecutive animation frames on which the route must be mounted, past the
// boot shell AND free of a Suspense fallback. `waitForFunction` polls on rAF,
// so this is literally a frame count.
const READY_FRAMES = 3

// A backstop, and only a backstop: it exists so a chunk that never arrives
// fails with the diagnostic in `ready()` instead of hanging to the test's own
// timeout. It never decides when a route is ready.
const READY_BACKSTOP_MS = 20000

/**
 * What the page is currently showing, as numbers rather than as a verdict.
 *
 * `own` is the route's OWN content — `main` plus any open modal — with the
 * shared chrome excluded, which is the measurement `expectRendered` used to get
 * wrong. The modal half is not a special case for one route: /login (and every
 * RequireAuth redirect into it) is a launcher for the app-wide login popup and
 * renders a spinner in `main` on purpose, so its content genuinely lives in a
 * `[role="dialog"]` outside the shell.
 *
 * `crashed` is App.jsx's ErrorBoundary card. It is reported because a crashed
 * route LOOKS rendered by every other measure here — the fallback is gone and
 * `main` holds "Something went wrong / Reloading usually fixes it", which is
 * comfortably over any content threshold. Nothing under tests/ referenced
 * `.error-boundary` before this, so no spec in the suite could tell a crashed
 * route from a working one. `watch()` does record the `ErrorBoundary caught:`
 * console error as a finding, but findings are a printed report and the global
 * teardown gates on One Tap only — so nothing failed.
 */
export function renderState(page) {
  return page.evaluate(() => {
    const root = document.getElementById('root')
    // `.landing` was a third branch here until src/pages/Landing.jsx was
    // deleted (`landing-page-orphaned`). That page was the only thing in the
    // app that ever rendered `class="landing"`, so the branch now matches
    // nothing on any route and is dropped rather than left to read as a
    // surface this helper still supports.
    const main = document.querySelector('#main, main')
    const parts = []
    if (main) parts.push(main.innerText || '')
    for (const d of document.querySelectorAll('[role="dialog"], [aria-modal="true"]')) {
      if (d.offsetParent || getComputedStyle(d).position === 'fixed') parts.push(d.innerText || '')
    }
    return {
      mounted: !!(root && root.firstElementChild),
      // `booting` is the STATIC BOOT SHELL, and it is reported for the same
      // reason `crashed` is: it looks mounted by every other measure here.
      // index.html ships `<div id="root"><div class="boot-shell" id="boot-shell">`
      // and scripts/prerender.mjs clones that into all 33 route shells, so
      // `root.firstElementChild` is satisfied by markup the SERVER wrote, before
      // React has run a single line. `.page-loading` is absent in that state too
      // — App.jsx has never rendered, so there is no Suspense fallback to find.
      booting: !!document.getElementById('boot-shell'),
      loading: !!document.querySelector('.page-loading'),
      crashed: !!document.querySelector('.error-boundary'),
      body: (document.body.innerText || '').trim().length,
      own: parts.join(' ').trim().length,
    }
  })
}

/**
 * Wait until the route on screen is the route, not its loading fallback.
 *
 * Call this after any navigation that is followed by a MEASUREMENT — a
 * `page.evaluate`, a `.count()`, a `.boundingBox()`. Navigations followed only
 * by `expect(locator)` do not need it: those auto-wait on the thing itself,
 * which is the same doctrine by another route.
 */
/**
 * If this page's context saw build assets 404, say so — that is a far more
 * likely explanation for a route that never arrived than anything in the route.
 *
 * The ledger is hung on the context by `watchBuildAssets` in base.js and read
 * through a well-known Symbol rather than an import, because base.js imports
 * this file and a real import would be a cycle. A context built before that
 * wrapper was installed simply has nothing there, so this stays silent.
 */
const ASSET_TROUBLE = Symbol.for('uil4b.buildAssetTrouble')

function buildAssetHint(page) {
  let bad = []
  try { bad = page.context()[ASSET_TROUBLE] || [] } catch { return '' }
  if (!bad.length) return ''
  const uniq = [...new Set(bad)]
  return `\n\n  ${bad.length} build asset request(s) NEVER ARRIVED in this browser context`
    + ` (${uniq.slice(0, 3).join(', ')}${uniq.length > 3 ? `, +${uniq.length - 3} more` : ''}).`
    + ' Files under /assets/ are content-hashed build outputs and cannot 404 or fail to be'
    + ' delivered in a healthy run. A 4xx means dist/ was REBUILT under the run; a net:: error'
    + ' means the machine could not deliver the file (ERR_NO_BUFFER_SPACE and'
    + ' ERR_INSUFFICIENT_RESOURCES are resource exhaustion, seen with several suites running at'
    + ' once). Read the route above as a casualty of that, not as a defect. The test and the'
    + ' whole run both fail on this.'
}

/**
 * The state where `#root` HAS a child and React has still never run.
 *
 * index.html ships a static skeleton — `<div id="root"><div class="boot-shell"
 * id="boot-shell">` — and scripts/prerender.mjs clones it into every one of the
 * 33 route shells. So the two conditions this function used to wait for were
 * BOTH satisfied by markup the server wrote: `#root` has a child (the shell),
 * and there is no `.page-loading` (App.jsx has not rendered, so there is no
 * Suspense fallback to find yet). The pre-hydration window the long note above
 * says `waitFor({ state: 'detached' })` cannot see was therefore still open on
 * the OTHER half as well.
 *
 * #391 caught /create/semantic-color in exactly that state once under four
 * parallel workers — h1 not found, and the accessibility snapshot reading
 * `status: Loading UIL4B`, which is the boot shell's own live region. It worked
 * around it locally in 55-header-sweep.spec.js; this is the fix in the door.
 *
 * The shell going away is a POSITIVE fact about React rather than another
 * absence: `createRoot(...).render()` clears its container on the first commit,
 * so `#boot-shell` is gone exactly when React has committed something. That is
 * why this is checked alongside `root.firstElementChild` and not instead of it
 * — a commit that rendered nothing would empty `#root` and must not count.
 */
const BOOT_SHELL_HINT = '\n\n  The page is STILL SHOWING THE STATIC BOOT SHELL that index.html ships'
  + ' into every prerendered route shell, so React has NOT RUN AT ALL. This is not a slow route'
  + ' chunk and waiting longer will not help: the app never started. The usual cause is the ENTRY'
  + ' bundle (/assets/index-*.js) never arriving — check the build-asset line below, if there is one.'

export async function ready(page, what) {
  const where = what || page.url()
  await page.evaluate(() => {
    window.__uilReadyFrames = 0
    // Counted so a readiness wait that examined NOTHING is visible in its own
    // failure message. A guard that reports no violations because it never
    // looked is the shape this suite keeps paying for.
    window.__uilReadyPolls = 0
  }).catch(() => { /* mid-navigation */ })
  try {
    await page.waitForFunction((frames) => {
      window.__uilReadyPolls = (window.__uilReadyPolls || 0) + 1
      const root = document.getElementById('root')
      // ONE presence and TWO absences, and all three in the same frame. The
      // presence is what stops the two absences being trivially true on a page
      // that has rendered nothing; the boot-shell absence is what stops the
      // presence being true of markup the server wrote. See the note above.
      const clear = !!(root && root.firstElementChild)
        && !document.getElementById('boot-shell')
        && !document.querySelector('.page-loading')
      window.__uilReadyFrames = clear ? (window.__uilReadyFrames || 0) + 1 : 0
      return window.__uilReadyFrames >= frames
    }, READY_FRAMES, { polling: 'raf', timeout: READY_BACKSTOP_MS })
  } catch {
    const s = await renderState(page).catch(() => null)
    const polls = await page.evaluate(() => window.__uilReadyPolls || 0).catch(() => 0)
    throw new Error(
      `${where}: ${s && s.booting
        ? 'the app never replaced the static boot shell'
        : 'the route never got past its lazy-loading fallback'} in ${READY_BACKSTOP_MS}ms`
      + (s ? ` — mounted=${s.mounted} booting=${s.booting} fallback=${s.loading} bodyChars=${s.body} ownChars=${s.own}` : '')
      + ` (readiness examined ${polls} frame(s))`
      + (s && s.booting ? BOOT_SHELL_HINT : '')
      + buildAssetHint(page),
    )
  }
}

/**
 * ASSERT that the route rendered its own content. Throws; it does not report.
 *
 * It used to return a boolean, and of its eleven call sites eight awaited it
 * without reading the result — so on those it decided nothing in either
 * direction. The two that did read it compared `document.body.innerText > 40`
 * against a fallback state that measures 421, so they could not fail either.
 * Both halves are fixed here rather than at the call sites: the wait is
 * structural (`ready`), and the count excludes the chrome that made the old
 * threshold meaningless.
 *
 * The floor stays 40 characters, but it now sits in a gap that was measured
 * rather than guessed: every unarrived route scores exactly 0 on `own`, and the
 * thinnest real page in the suite is /login's popup at 127.
 */
export async function expectRendered(page, what) {
  const where = what || page.url()
  await ready(page, where)
  const s = await renderState(page)
  // Before the content count, because a crash card passes a content count. Cut
  // a route's chunk out of a deploy and this is what the visitor gets, and
  // until this line every readiness check in the suite called it a rendered
  // page — including the fixed one above.
  expect(
    s.crashed,
    `${where}: the route rendered App.jsx's ErrorBoundary card, not the route.`
    + ' Something inside it threw during render — the browser console carries the'
    + ' `ErrorBoundary caught:` line with the actual error.',
  ).toBe(false)
  expect(
    s.own,
    `${where}: the route rendered ${s.own} characters of its own content`
    + ` (the page has ${s.body} in total, but that count includes the nav and footer`
    + ` every route carries) — that is a blank shell, not a rendered page`,
  ).toBeGreaterThan(40)
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

/* ── Waiting for a gesture to be TAKEN UP ────────────────────────────────────
 *
 * The wait for a gesture to be taken up is not decoration, and it is the half
 * of this file that #297 wrote into wheelToRest's own body. Dispatching an
 * input and finding the scroll layer idle a few frames later has two readings —
 * "the gesture is finished" and "the gesture has not started" — and a helper
 * that cannot tell them apart returns the pre-gesture position for the second.
 * That is the same unsoundness as sampling mid-flight, pointing the other way:
 * it charges a real scroll to the position before it and reports no scroll.
 *
 * It is shared now because keyboard input needs exactly the same half, and the
 * budget is counted in FRAMES for the same reason stillness is: a contended
 * runner paints fewer of them per second, so a frame budget buys proportionally
 * more wall-clock time in precisely the conditions that need more. That
 * replaces the 2000ms `waitForFunction` this used to carry — the last wall
 * clock left deciding one of this file's measurements. The ms figure below is a
 * backstop against a page that has stopped painting altogether, and decides
 * nothing on a page that is still painting.
 *
 * A gesture that is never taken up is NOT an error here. The page may already
 * be at the bottom, and 28-account-menu-keyboard.spec.js deliberately sends a
 * key that a correct build ignores. The caller's own assertion on the resting
 * position is what judges the result — which is why this returns a boolean
 * nobody is obliged to look at rather than throwing.
 */
const TAKE_UP_FRAMES = 60
const TAKE_UP_BACKSTOP_MS = 8000

const waitForTakeUp = (page, from) => page.evaluate(({ start, frames, backstop }) => new Promise((resolve) => {
  const root = document.documentElement
  let left = frames
  let done = false
  const finish = (value) => { done = true; clearTimeout(timer); resolve(value) }
  const timer = setTimeout(() => finish(false), backstop)
  const tick = () => {
    if (done) return
    // Either half is enough. A changed position is take-up that has already
    // landed; `lenis-scrolling` is take-up the scroll layer has accepted but
    // has not yet painted a pixel of, which is the case a bare
    // `scrollY !== start` misses on the one frame where it matters.
    if (window.scrollY !== start || root.classList.contains('lenis-scrolling')) { finish(true); return }
    if (--left <= 0) { finish(false); return }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}), { start: from, frames: TAKE_UP_FRAMES, backstop: TAKE_UP_BACKSTOP_MS })

/**
 * The resting position after something the test has already done should have
 * moved the page, given where it was before that thing happened.
 *
 * For the cases where the cause is not an input the test can send — a route
 * hand-off scrolling its own destination into view, say — and there is
 * therefore nothing to press here.
 */
export async function restAfterMove(page, from, what = 'the page') {
  await waitForTakeUp(page, from)
  return restingScrollY(page, what)
}

/** One wheel gesture, and then the position it comes to rest at. */
export async function wheelToRest(page, dy, what = 'the page') {
  const before = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, dy)
  return restAfterMove(page, before, what)
}

/**
 * One key press, and then the position the page comes to rest at.
 *
 * Keyboard scrolling needed its own because the assertion that goes with it is
 * shaped the other way round from the wheel ones. A test that presses a key and
 * polls for `scrollY > before` is waiting for the movement to BEGIN, and its
 * deadline is a guess about someone else's take-up: on a loaded runner the
 * guess expires first and a real scroll is recorded as none. Waiting for
 * take-up and then for rest takes the guess out of both ends of the reading.
 *
 * NO CALLER AS OF 2026-09-03, and that is a deliberate state rather than an
 * oversight — read it before reaching for this. Its one caller was
 * 28-account-menu-keyboard.spec.js, which used it to prove a popover had left
 * an arrow key alone by watching the page scroll. That assertion failed CI
 * twice on 2026-09-03 (runs 33715948705 attempt 1 and 33713466234) reporting no
 * movement from a page with 7422px of room below it: this helper measured
 * correctly and the browser simply produced no default scroll. The spec now
 * asserts the contract — `defaultPrevented` and where focus landed — and keeps
 * the scroll only as corroboration behind a control press.
 *
 * So: sound for measuring a keyboard scroll that HAS happened, and the wrong
 * instrument for proving that a key was left alone. Nothing here needs fixing;
 * it is kept because the measurement is still the right one for the first job.
 */
export async function keyToRest(page, key, what = 'the page') {
  const before = await page.evaluate(() => window.scrollY)
  await page.keyboard.press(key)
  return restAfterMove(page, before, what)
}
