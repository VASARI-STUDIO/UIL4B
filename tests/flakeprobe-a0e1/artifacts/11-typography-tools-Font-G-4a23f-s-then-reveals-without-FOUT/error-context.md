# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 11-typography-tools.spec.js >> Font Gallery >> a held stylesheet keeps skeletons visible until the face registers, then reveals without FOUT
- Location: tests\user-sim\11-typography-tools.spec.js:604:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4512/create/font-gallery
Call log:
  - navigating to "http://127.0.0.1:4512/create/font-gallery", waiting until "domcontentloaded"

```

# Test source

```ts
  16  | // hosts are blocked; the Vercel insights script only exists in production).
  17  | // Anything else that errors is a real finding.
  18  | const EXPECTED_NOISE = [
  19  |   /_vercel\/insights/,
  20  |   /fonts\.googleapis\.com/, /fonts\.gstatic\.com/,
  21  |   /googleapis\.com/, /firebaseinstallations/, /identitytoolkit/,
  22  |   /api\.iconify\.design/,
  23  |   // `vite preview` serves dist/ as static files and runs no Vercel functions,
  24  |   // so EVERY /api/* request 404s here regardless of whether it is correct.
  25  |   // 22-feedback-and-focus.spec.js relies on that to exercise the failed-send
  26  |   // path — the property that matters is that the form never claims success on
  27  |   // a request that did not land, and this is the only way to test it without a
  28  |   // live backend.
  29  |   /\/api\/[a-z-]+/,
  30  |   /ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_TUNNEL/,
  31  | ]
  32  | 
  33  | // Everything this used to special-case for Google One Tap — the [GSI_LOGGER]
  34  | // FedCM AbortError/NetworkError pairs, and the document-level "Error retrieving
  35  | // a token." / "Provider's accounts list is empty" noise — is gone, because One
  36  | // Tap no longer loads at all: base.js stubs accounts.google.com for every
  37  | // browser context in the suite. Leaving the suppression in place would mean a
  38  | // stub that quietly stopped covering a spec produced no visible symptom, which
  39  | // is the exact failure this file is meant to surface. If GSI_LOGGER errors ever
  40  | // come back, they are findings again — and the run fails outright in
  41  | // assertOneTapNeverLeft().
  42  | function isExpectedNoise(text, url) {
  43  |   const hay = `${text} ${url || ''}`
  44  |   return EXPECTED_NOISE.some((re) => re.test(hay))
  45  | }
  46  | 
  47  | export function record(finding) {
  48  |   fs.mkdirSync(REPORT_DIR, { recursive: true })
  49  |   fs.appendFileSync(FINDINGS_FILE, JSON.stringify({ at: new Date().toISOString(), ...finding }) + '\n')
  50  | }
  51  | 
  52  | /**
  53  |  * Attach crash/console watchdogs to a page for one persona.
  54  |  * Returns { note } for recording soft UX observations mid-flow.
  55  |  */
  56  | export function watch(page, persona) {
  57  |   page.on('pageerror', (err) => {
  58  |     record({
  59  |       persona,
  60  |       severity: 'critical',
  61  |       kind: 'uncaught-exception',
  62  |       where: page.url(),
  63  |       message: String(err && err.message ? err.message : err).slice(0, 500),
  64  |     })
  65  |   })
  66  |   page.on('console', (msg) => {
  67  |     if (msg.type() !== 'error') return
  68  |     const location = msg.location() || {}
  69  |     const url = location.url || ''
  70  |     const deliberateMotionAbort = persona === 'visitor whose motion chunk never arrives'
  71  |       && /ERR_FAILED/.test(msg.text())
  72  |       && /assets\/(?:gsap|ScrollTrigger)-/.test(url)
  73  |     if (deliberateMotionAbort) return
  74  |     if (isExpectedNoise(msg.text(), url)) return
  75  |     const source = url
  76  |       ? ` (${url}${location.lineNumber != null ? `:${location.lineNumber}:${location.columnNumber || 0}` : ''})`
  77  |       : ''
  78  |     record({
  79  |       persona,
  80  |       severity: 'error',
  81  |       kind: 'console-error',
  82  |       where: page.url(),
  83  |       message: `${msg.text().slice(0, 300)}${source}`,
  84  |     })
  85  |   })
  86  |   return {
  87  |     note(severity, message, where) {
  88  |       record({ persona, severity, kind: 'ux-observation', where: where || page.url(), message })
  89  |     },
  90  |   }
  91  | }
  92  | 
  93  | /**
  94  |  * Navigate WITHOUT waiting for the route to arrive.
  95  |  *
  96  |  * This is the ONE documented hole in the door below, and it has exactly two
  97  |  * callers, both of which exist to read the page in a moment that `go()` is
  98  |  * defined to wait past:
  99  |  *
  100 |  *   47-lazy-route-readiness.spec.js — reads a route while its chunk is still
  101 |  *     in flight, to state the old contract's vacuity as two numbers from one
  102 |  *     instant (body 421 passes, the route's own 0 does not).
  103 |  *   04-premium-home.spec.js — reads `#boot-shell`, the static markup
  104 |  *     `scripts/prerender.mjs` writes into the shell, BEFORE React replaces it.
  105 |  *     It needs `waitUntil: 'commit'` rather than the default: module scripts
  106 |  *     run before DOMContentLoaded fires, so by 'domcontentloaded' the shell it
  107 |  *     is asserting on can already be gone. That is why `opts` exists here — the
  108 |  *     alternative was leaving a bare `page.goto()` in the suite, which is the
  109 |  *     thing the unit guard is for.
  110 |  *
  111 |  * Not waiting for the full 'load' event is separate and applies to all of them:
  112 |  * the blocked external hosts (fonts, Firebase, iconify) can hold 'load', and
  113 |  * 'networkidle' never settles at all inside the sandboxed runner.
  114 |  */
  115 | export function goRaw(page, url, opts) {
> 116 |   return page.goto(url, { waitUntil: 'domcontentloaded', ...opts })
      |               ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4512/create/font-gallery
  117 | }
  118 | 
  119 | /**
  120 |  * Navigate, and come back when the ROUTE is on screen rather than when its
  121 |  * loading fallback is.
  122 |  *
  123 |  * This used to be `goRaw` above, and closing the gap here rather than at the
  124 |  * call sites is deliberate — see the long note below. Nineteen routes are
  125 |  * `lazy()`, the fallback keeps the nav, the footer and a visible `main` on
  126 |  * screen, and every readiness check the suite owned was satisfied by it. A
  127 |  * spec that navigated and then measured did not time out on a slow chunk: it
  128 |  * measured the chrome and reported a confident number about a page that was
  129 |  * not there. Fixing that per-spec left the next spec exposed, and expressed
  130 |  * the failure as a false claim about the app rather than as a wait that ran
  131 |  * out.
  132 |  *
  133 |  * Navigations followed only by `expect(locator)` did not strictly need this —
  134 |  * those auto-wait on the thing itself — but they are not harmed by it, and
  135 |  * one door is worth more here than a rule about which door to use when.
  136 |  */
  137 | export async function go(page, url) {
  138 |   const res = await goRaw(page, url)
  139 |   await ready(page, url)
  140 |   return res
  141 | }
  142 | 
  143 | /* ── Waiting for a LAZY ROUTE to have actually ARRIVED ───────────────────────
  144 |  *
  145 |  * WHY THIS EXISTS
  146 |  * Nineteen of this app's routes are `lazy()`, and App.jsx answers a pending
  147 |  * chunk with `<div className="page-loading">` rendered INSIDE `<main id="main">`
  148 |  * — so while the chunk is in flight the page still has the pill nav, the
  149 |  * footer, a visible `main`, and a non-empty `#root`. `src/pages/CreateTool.jsx`
  150 |  * does the same one level down for every live Create tool.
  151 |  *
  152 |  * Every readiness check this suite owned was satisfied by that state.
  153 |  * 43-state-token-contrast used `main, .landing, #root > *`, and all three parts
  154 |  * match the fallback. `expectRendered()` used `document.body.innerText > 40`,
  155 |  * and the fallback measures 421 characters of chrome. So a spec that navigates
  156 |  * and then MEASURES does not time out when a chunk is slow — it measures the
  157 |  * chrome and reports a confident number about a page that is not on screen.
  158 |  * That is how 43-state-token-contrast failed CI and blamed the branch under
  159 |  * test: throttled to 16x CPU, /privacy and /sitemap each counted ZERO
  160 |  * state-coloured nodes and the light total fell from 52 to 13.
  161 |  *
  162 |  * MEASURED, on this build, at `domcontentloaded` and again once settled
  163 |  * (every route the suite walks; `body` / `main` are innerText lengths):
  164 |  *
  165 |  *     route                fallback up          arrived
  166 |  *     /privacy             body 421  main 0     body 6537  main 6114
  167 |  *     /sitemap             body 421  main 0     body 4124  main 3702
  168 |  *     /plans               body 405  main 0     body 2779  main 2372
  169 |  *     /create/palette      body 412  main 0     body  737  main  323
  170 |  *
  171 |  * `main` is EMPTY in the fallback state on every one of them, and `body` never
  172 |  * is. That is the whole finding: the check was reading the shared chrome.
  173 |  *
  174 |  * WHY "the fallback is gone" IS NOT ENOUGH BY ITSELF
  175 |  * `waitFor({ state: 'detached' })` on `.page-loading` is satisfied by an
  176 |  * element that has not been ATTACHED yet — the entire pre-hydration window, in
  177 |  * which `#root` is still the empty div `scripts/prerender.mjs` wrote (it clones
  178 |  * the shell and rewrites the head; it does not render React). A wait that
  179 |  * accepts "not yet" as "already finished" is the same can't-fail shape one
  180 |  * level down. So both halves are required, and required TOGETHER: React has
  181 |  * committed something into `#root`, AND no fallback is on screen in the same
  182 |  * frame.
  183 |  *
  184 |  * Held for several FRAMES, not milliseconds, for the reason the scroll helpers
  185 |  * below give at length — and because the nested case (`/create/*`, where the
  186 |  * static CreateTool shell mounts first and its inner Suspense raises a second
  187 |  * fallback in the same commit) needs the two conditions to be true at the same
  188 |  * instant rather than at two instants a test happened to sample.
  189 |  */
  190 | 
  191 | // Consecutive animation frames on which the route must be mounted AND free of a
  192 | // Suspense fallback. `waitForFunction` polls on rAF, so this is literally a
  193 | // frame count.
  194 | const READY_FRAMES = 3
  195 | 
  196 | // A backstop, and only a backstop: it exists so a chunk that never arrives
  197 | // fails with the diagnostic in `ready()` instead of hanging to the test's own
  198 | // timeout. It never decides when a route is ready.
  199 | const READY_BACKSTOP_MS = 20000
  200 | 
  201 | /**
  202 |  * What the page is currently showing, as numbers rather than as a verdict.
  203 |  *
  204 |  * `own` is the route's OWN content — `main` plus any open modal — with the
  205 |  * shared chrome excluded, which is the measurement `expectRendered` used to get
  206 |  * wrong. The modal half is not a special case for one route: /login (and every
  207 |  * RequireAuth redirect into it) is a launcher for the app-wide login popup and
  208 |  * renders a spinner in `main` on purpose, so its content genuinely lives in a
  209 |  * `[role="dialog"]` outside the shell.
  210 |  *
  211 |  * `crashed` is App.jsx's ErrorBoundary card. It is reported because a crashed
  212 |  * route LOOKS rendered by every other measure here — the fallback is gone and
  213 |  * `main` holds "Something went wrong / Reloading usually fixes it", which is
  214 |  * comfortably over any content threshold. Nothing under tests/ referenced
  215 |  * `.error-boundary` before this, so no spec in the suite could tell a crashed
  216 |  * route from a working one. `watch()` does record the `ErrorBoundary caught:`
```