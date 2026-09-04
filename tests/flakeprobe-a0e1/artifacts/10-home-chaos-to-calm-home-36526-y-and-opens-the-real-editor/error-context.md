# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 10-home-chaos-to-calm.spec.js >> homepage: eleven tools, five ways of working >> 14–15 · the icon preview is local-only and opens the real editor
- Location: tests\user-sim\10-home-chaos-to-calm.spec.js:1338:3

# Error details

```
Error: /: the route never got past its lazy-loading fallback in 20000ms — mounted=false fallback=false bodyChars=0 ownChars=0
```

# Test source

```ts
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
  217 |  * console error as a finding, but findings are a printed report and the global
  218 |  * teardown gates on One Tap only — so nothing failed.
  219 |  */
  220 | export function renderState(page) {
  221 |   return page.evaluate(() => {
  222 |     const root = document.getElementById('root')
  223 |     const main = document.querySelector('#main, main, .landing')
  224 |     const parts = []
  225 |     if (main) parts.push(main.innerText || '')
  226 |     for (const d of document.querySelectorAll('[role="dialog"], [aria-modal="true"]')) {
  227 |       if (d.offsetParent || getComputedStyle(d).position === 'fixed') parts.push(d.innerText || '')
  228 |     }
  229 |     return {
  230 |       mounted: !!(root && root.firstElementChild),
  231 |       loading: !!document.querySelector('.page-loading'),
  232 |       crashed: !!document.querySelector('.error-boundary'),
  233 |       body: (document.body.innerText || '').trim().length,
  234 |       own: parts.join(' ').trim().length,
  235 |     }
  236 |   })
  237 | }
  238 | 
  239 | /**
  240 |  * Wait until the route on screen is the route, not its loading fallback.
  241 |  *
  242 |  * Call this after any navigation that is followed by a MEASUREMENT — a
  243 |  * `page.evaluate`, a `.count()`, a `.boundingBox()`. Navigations followed only
  244 |  * by `expect(locator)` do not need it: those auto-wait on the thing itself,
  245 |  * which is the same doctrine by another route.
  246 |  */
  247 | /**
  248 |  * If this page's context saw build assets 404, say so — that is a far more
  249 |  * likely explanation for a route that never arrived than anything in the route.
  250 |  *
  251 |  * The ledger is hung on the context by `watchBuildAssets` in base.js and read
  252 |  * through a well-known Symbol rather than an import, because base.js imports
  253 |  * this file and a real import would be a cycle. A context built before that
  254 |  * wrapper was installed simply has nothing there, so this stays silent.
  255 |  */
  256 | const ASSET_TROUBLE = Symbol.for('uil4b.buildAssetTrouble')
  257 | 
  258 | function buildAssetHint(page) {
  259 |   let bad = []
  260 |   try { bad = page.context()[ASSET_TROUBLE] || [] } catch { return '' }
  261 |   if (!bad.length) return ''
  262 |   const uniq = [...new Set(bad)]
  263 |   return `\n\n  ${bad.length} build asset request(s) FAILED in this browser context`
  264 |     + ` (${uniq.slice(0, 3).join(', ')}${uniq.length > 3 ? `, +${uniq.length - 3} more` : ''}).`
  265 |     + ' Files under /assets/ cannot 404 in a healthy run, so dist/ was almost certainly'
  266 |     + ' REBUILT while this suite was running — read the route below as a casualty of that,'
  267 |     + ' not as a defect. The global teardown fails the whole run on this.'
  268 | }
  269 | 
  270 | export async function ready(page, what) {
  271 |   const where = what || page.url()
  272 |   await page.evaluate(() => { window.__uilReadyFrames = 0 }).catch(() => { /* mid-navigation */ })
  273 |   try {
  274 |     await page.waitForFunction((frames) => {
  275 |       const root = document.getElementById('root')
  276 |       const clear = !!(root && root.firstElementChild) && !document.querySelector('.page-loading')
  277 |       window.__uilReadyFrames = clear ? (window.__uilReadyFrames || 0) + 1 : 0
  278 |       return window.__uilReadyFrames >= frames
  279 |     }, READY_FRAMES, { polling: 'raf', timeout: READY_BACKSTOP_MS })
  280 |   } catch {
  281 |     const s = await renderState(page).catch(() => null)
> 282 |     throw new Error(
      |           ^ Error: /: the route never got past its lazy-loading fallback in 20000ms — mounted=false fallback=false bodyChars=0 ownChars=0
  283 |       `${where}: the route never got past its lazy-loading fallback in ${READY_BACKSTOP_MS}ms`
  284 |       + (s ? ` — mounted=${s.mounted} fallback=${s.loading} bodyChars=${s.body} ownChars=${s.own}` : '')
  285 |       + buildAssetHint(page),
  286 |     )
  287 |   }
  288 | }
  289 | 
  290 | /**
  291 |  * ASSERT that the route rendered its own content. Throws; it does not report.
  292 |  *
  293 |  * It used to return a boolean, and of its eleven call sites eight awaited it
  294 |  * without reading the result — so on those it decided nothing in either
  295 |  * direction. The two that did read it compared `document.body.innerText > 40`
  296 |  * against a fallback state that measures 421, so they could not fail either.
  297 |  * Both halves are fixed here rather than at the call sites: the wait is
  298 |  * structural (`ready`), and the count excludes the chrome that made the old
  299 |  * threshold meaningless.
  300 |  *
  301 |  * The floor stays 40 characters, but it now sits in a gap that was measured
  302 |  * rather than guessed: every unarrived route scores exactly 0 on `own`, and the
  303 |  * thinnest real page in the suite is /login's popup at 127.
  304 |  */
  305 | export async function expectRendered(page, what) {
  306 |   const where = what || page.url()
  307 |   await ready(page, where)
  308 |   const s = await renderState(page)
  309 |   // Before the content count, because a crash card passes a content count. Cut
  310 |   // a route's chunk out of a deploy and this is what the visitor gets, and
  311 |   // until this line every readiness check in the suite called it a rendered
  312 |   // page — including the fixed one above.
  313 |   expect(
  314 |     s.crashed,
  315 |     `${where}: the route rendered App.jsx's ErrorBoundary card, not the route.`
  316 |     + ' Something inside it threw during render — the browser console carries the'
  317 |     + ' `ErrorBoundary caught:` line with the actual error.',
  318 |   ).toBe(false)
  319 |   expect(
  320 |     s.own,
  321 |     `${where}: the route rendered ${s.own} characters of its own content`
  322 |     + ` (the page has ${s.body} in total, but that count includes the nav and footer`
  323 |     + ` every route carries) — that is a blank shell, not a rendered page`,
  324 |   ).toBeGreaterThan(40)
  325 | }
  326 | 
  327 | /* ── Reading a scroll position that has stopped moving ───────────────────────
  328 |  *
  329 |  * WHY THIS EXISTS
  330 |  * The app runs Lenis smooth scroll (src/hooks/useSmoothScroll.js), so the
  331 |  * scroll position is an animation, not a value. Every test that reads
  332 |  * `window.scrollY` after causing one is therefore sampling a curve, and every
  333 |  * such test in this suite used to decide WHEN to sample with a wall clock —
  334 |  * `waitForTimeout(600)`, or a poll for two equal readings 100ms apart.
  335 |  *
  336 |  * Both are guesses about someone else's animation, and both have failed CI:
  337 |  * "stayed put (was 467, now 700)" is a baseline captured mid-flight and the
  338 |  * remaining 233px of easing then charged to whatever the test did next.
  339 |  *
  340 |  * The two-equal-samples version looks safer and is not. `window.scrollY` is a
  341 |  * whole-pixel view of a fractional value Lenis keeps damping until
  342 |  * `Math.round(value) === Math.round(target)`, so two equal readings mean only
  343 |  * "it moved less than a pixel between two arbitrary instants" — which is true
  344 |  * at the tail of every ease, and true anywhere on the curve when the sampling
  345 |  * cadence and the frame cadence line up badly. Instrumenting it showed it
  346 |  * exiting with `<html class="lenis-scrolling">` still set, recording 813 for a
  347 |  * page that came to rest at 814, on every single run. Nothing in it bounds how
  348 |  * far off that reading can be; on an idle laptop it is a pixel, and on a loaded
  349 |  * runner it is however much easing is left.
  350 |  *
  351 |  * So: ask the page, not the clock. The moment of the reading is decided by two
  352 |  * things the page can actually answer — the smooth-scroll layer has nothing in
  353 |  * flight, and the position has not changed for several animation frames running
  354 |  * — which is the same move 24-mobile-overhaul.spec.js made for its CTA reveal.
  355 |  */
  356 | 
  357 | // Consecutive unchanged animation frames that count as "stopped". Counted in
  358 | // FRAMES, not milliseconds, because a loaded runner paints fewer of them per
  359 | // second and the whole point here is to stop measuring animation against a clock.
  360 | const STILL_FRAMES = 8
  361 | 
  362 | // A backstop, and ONLY a backstop: it exists so a page whose frames never
  363 | // arrive fails with the message below instead of hanging until the test's own
  364 | // timeout. It never decides when a reading is taken.
  365 | const REST_BACKSTOP_MS = 6000
  366 | 
  367 | /** Resolves with the resting scrollY, or null if the page never stopped moving. */
  368 | const waitForRest = (page) => page.evaluate(({ needed, backstop }) => new Promise((resolve) => {
  369 |   const root = document.documentElement
  370 |   let last = null
  371 |   let still = 0
  372 |   // `done` stops the frame loop rather than merely stopping it from mattering:
  373 |   // a resolved promise silences a stray tick, but the tick itself would go on
  374 |   // costing a frame callback for the life of the page, once per call.
  375 |   let done = false
  376 |   const finish = (value) => { done = true; clearTimeout(timer); resolve(value) }
  377 |   const timer = setTimeout(() => finish(null), backstop)
  378 |   const tick = () => {
  379 |     if (done) return
  380 |     const y = window.scrollY
  381 |     still = y === last ? still + 1 : 0
  382 |     last = y
```