# Build & Verify

> Reference doc for UIL4B. Linked from `CLAUDE.md`. This is the quality gate —
> nothing ships without it.

## The canonical gate

**This file is the single source of truth for what the gate requires.** No other
document, comment or commit message should restate it — link here instead.

Every row below is a **property**, not a measurement. Run the command; the run
either has the property or it does not. There is deliberately no expected test
count in this table — see *Why there are no test counts here*, below.

| Gate | Command | Pass condition |
|---|---|---|
| Lint | `npx eslint .` | **0 errors.** The advisory warnings are pre-existing and capped at **25** — work may not raise that ceiling. This is the only number in the table, and it is a bound rather than a tally. |
| Build | `npm run build` | passes **and prints its prerender line**: `prerender: wrote N route shells + a noindex 404 shell` |
| Unit | `npm run test:unit` | **0 failures, 0 skipped** |
| Firestore rules | `npm run test:rules` | **0 failures.** Needs a JDK 21 on `PATH` — see below |
| Browser acceptance | `npm run test:users` | **0 failures.** The only skips are the whole of `12-ui-system-builder.spec.js` — see below |

**The prerender line is load-bearing; `N` is not.** That line is the only signal
that `scripts/prerender.mjs` ran at all — a bare `npx vite build` writes `dist/`
and prints nothing, so a build that skipped the prerender, or a prerender that
silently stopped emitting shells, would ship green. **Look for the line.** Do
not check `N` against a number written here: which routes get a shell is decided
by the sitemap, and `tests/unit/prerender-routes.test.js` goes red the moment
the sitemap, `routeMetaMap.js` and `vercel.json`'s rewrites stop agreeing. That
test is the feedback loop. A number in this table never was one.

### Why there are no test counts here

This table used to carry exact totals — unit tests, browser tests, spec files,
Firestore rules tests. **They drifted four times, and every drift was found by
accident rather than by anything failing.**

| The table said | It actually was | How that surfaced |
|---|---|---|
| 269 unit / 25 spec files | already stale the day it was written — `#274` merged between the measurement and the commit that recorded it | an engineer's branch measured differently and **said so** instead of assuming its own base was at fault |
| "520 unit, 240 browser once the whole stack merges" | 571 / 291 — a projection, and wrong in both columns | when the 2026-08-20 queue finished draining |
| 571 unit / 291 browser | 659 / 355 | during `#303`, eighty-eight unit and sixty-four browser tests later |
| 24 rules tests (9 standalone + 5 × 3 parameterised) | 37 — sixteen standalone, plus 5 × 3 entitlement fields and 2 × 3 submission kinds | while writing this section; nobody had noticed |

Each time the response was to re-measure and hand-correct, and each correction
went stale again. **A number that must be updated by hand on every PR that adds
a test will always go stale, because nothing fails when it does.** There is no
feedback loop here, only a convention, and a convention loses across dozens of
PRs and many agents.

So the counts are deleted rather than corrected a fourth time. The exact total
carried no information a reader ever acted on — nobody decides anything
differently on 659 than on 682 — while its one observed effect was to make a
clean suite read as a catastrophic regression to whoever checked against it.
**A gate doc that can manufacture a false NO-GO is worse than one that says
less.**

Generating the counts from a script, or asserting them in a unit test so that a
stale number fails CI rather than misleading a reader, would also have stopped
the drift. That was considered and not chosen: it buys ongoing maintenance for a
figure nobody uses. The property is what the gate actually is; the count was
only ever a proxy for it.

**The rule this leaves behind: a number belongs in this table only if it is a
bound that work is not supposed to move.** A test count grows with every PR that
adds a test, so it can never qualify. The lint-warning ceiling does qualify —
new code may not raise it, and a run that comes in *under* it is good news worth
recording rather than a false alarm. The `/api` function budget qualifies too:
a hard platform cap, with `tests/unit/account-deletion.test.js` failing the
build if it is exceeded. Note what both have that a test count does not — an
asymmetry, so that being out of date cannot cry wolf.

`tests/unit/gate-doc.test.js` holds this shape in place: it fails if the gate
table starts declaring expected test totals again, and if the prerender line
stops being named here or stops being printed by `scripts/prerender.mjs`.

> **Check your own base before concluding you caused a regression.** A branch
> that adds tests runs more tests than `main`; a branch cut before a merge runs
> fewer. That confusion cost time three times while this table had numbers in
> it. Compare your run against the properties above — never your total against
> someone else's total.

> **A zero skip count on the unit run is part of the bar.** If `npm run
> test:unit` reports skips, a bare `npx vite build` ran somewhere instead of
> `npm run build` — see the warning below.

The skips are the whole of `12-ui-system-builder.spec.js`, and nothing
else. UI System mode is **unwired — for admins as well**: the founder removed
both entry points from the Palette Builder on 2026-09-05, and nothing imports
`components/UiSystemBuilder.jsx`, so it is in no chunk of any build. This
paragraph said "went admin-only … and this suite runs signed out" until
2026-09-07; that was two wrong reasons at once, since #407 gave the suite an
auth harness and the door is not locked but missing. Skipped is the honest
state; do not "fix" the count by deleting the file, and do not go looking for
an auth gate to satisfy — there isn't one. Re-entering the tool means giving
it its own route.

The 25 lint warnings are pre-existing and advisory
(`react-hooks/set-state-in-effect`, `react-refresh/only-export-components`,
`react-hooks/preserve-manual-memoization`, `react-hooks/exhaustive-deps`).
**Match the ceiling, don't add new ones, and don't "fix" the existing ones as
a side effect of unrelated work.** CI fails on lint **errors** only. If you
retire one legitimately, say so in the PR and lower the number here — that
direction is a real improvement and the only reason this figure should ever
move.

## What a green gate does NOT prove

Absorbed from `RELEASE-READINESS.md` §4 when that file was retired on
2026-09-14. These are boundaries of the suite, not defects. They are here
because a green run is read as "everything works", and each of the following is
a thing a green run has never checked.

- **A community submission is not followed into the moderation queue.** Both
  ends are covered — the submit form renders and states that nothing appears
  publicly until reviewed, and `/admin` → Submissions renders the queue — but
  the write between them goes to Firestore, and the test session answers from
  memory rather than from a server. "Submitted, therefore it arrives" is checked
  by reading the code, not by rendering it.

- **Resuming a half-finished submission after sign-up has no rendered test.**
  `setSubmitIntent()` exists to reopen the form when a new account detours
  through onboarding. Deleting that call leaves the whole flow-6 spec green,
  which was verified deliberately. The sign-in gate's "Where you left off"
  sentence comes from a different source, so the two promises read as one and
  only the first is guarded.

- **The browser suite has a known flake class under runner contention**, and it
  announces itself: `base.js` asserts every `/assets/` request arrived and
  prints *"Every result in this run is void — the passes as much as the
  failures"* when one did not. **A void run is not a gate result.** Re-run it
  before treating a single red job as a regression, and say in the pull request
  which failures were void and which were real. Measured cause, 2026-09-13:
  TIME_WAIT socket exhaustion against a 16384-port ephemeral range — one suite
  opens thousands of short-lived connections and Windows holds each ~120s, so
  back-to-back runs starve the preview server. Let the count drain before
  re-running, and drop to `--workers=2`.

- **Anything that needs a live service is unverifiable from a local run**, and
  an agent auditing `vite preview` will report its absence as a product defect.
  Two confirmed false positives on 2026-09-14: the Icon Library rendering blank
  (every `api.iconify.design` request fails — the app correctly falls back to
  120 built-in icons and says so), and `/plans` showing "Live pricing is
  unreachable" (`vite preview` serves no serverless functions, so
  `/api/get-prices` returns HTML). Check a network-dependent finding against a
  real deployment before acting on it.

- **`AiPromptGenerator.jsx` exists and no route reaches it, deliberately.** A
  page file existing is not evidence a route reaches it — the trap
  `doc-authority-map.md` documents. It is the only caller of the OpenRouter
  path; deleting it would settle a question by default rather than by decision.

---

## History

Everything below this line is a **dated record of a past change or a past
fault**, not a baseline. The deltas in it ("moved unit 457 → 484") describe the
tree at that commit and cannot go stale, which is exactly why they are safe to
keep and why nothing above restates them. Do not check a run against anything
in this section.

**The lint ceiling came down 31 → 25 (2026-09-06).** Measured, not estimated:
`npm run lint` on `5c6603a` reports `25 problems (0 errors, 25 warnings)`. The
six retired over the preceding fortnight went with the code that carried them —
`Landing.jsx`, `TopBar.jsx`, `Sidebar.jsx` and `UIPreviewModal.jsx` were deleted
in #348 and #396, and three of `ColorStudio.jsx`'s four sections went with them.
Nobody "fixed" a warning; the files stopped existing. That is the only direction
this figure is allowed to move, and it is why the row above now reads 25.

Founder batch 4 (2026-08-11) added no lint warnings; it moved unit
(+7 tests: the per-point snap radius, the centre detent, the cross-axis slider
tracks and the ±180→±50 hue migration) and browser acceptance (+1 test: the
rendered proof that moving one adjust slider repaints the other three tracks).

Alt-text truncation + SEO brief (2026-08-15) moved unit 457 → **484** (+27: the
Gemini `finishReason` decision table, the auto-growing result field and its CSS
backstop, the prompt's structure/WCAG-floor/anti-stuffing contract, and the
context sanitiser). Lint and browser acceptance unchanged (0 errors / 31
warnings; 213 pass / 13 skipped) — the tool sits behind an `AuthGate` the
acceptance suite cannot pass, so the rendered proof was taken directly in a
browser instead (see the PR).

**The measurement that mattered, since two of the three faults presented as the
same symptom.** The founder reported "the longer version generation seems to get
cut off". There was a real silent-truncation bug — `runAltText` never read
`finishReason`, so a `MAX_TOKENS` response was returned as a finished answer —
but that is NOT what was being seen. At the narrowest card (320px) a 299-character
'detailed' result needs **157px** and the `rows={3}` box showed **79px**, hiding
**78px — half the answer** behind a scrollbar. Both are fixed; only the second
one was visible. Measure which fault the report actually describes before
assuming the interesting bug is the one the user hit.

A third, smaller clip was found the same way: setting `height = scrollHeight`
under this stylesheet's global `border-box` leaves the content area **2px** short
and shaves the last line's descenders. The autosize adds the border back.

Hero entrance (2026-08-15) moved unit 447 → **457** (+10: the entrance not
waiting on the GSAP chunk, compositor-only properties, the clip container, both
reduced-motion directions, and the self-hosted variable font). Browser acceptance
unchanged at 213 — `10-home-chaos-to-calm.spec.js:219` was rewritten rather than
added to: it polled for the absence of a `.motion-armed` class, and that class no
longer exists, so it now asserts the thing that actually mattered (every hero
element computes to opacity 1 even when the motion chunk is blocked).

**Measure the hero, don't theorise about it.** Two rounds of guessing got this
wrong. Removing the `filter: blur(12px)` tween — the obvious suspect, and a real
improvement — changed dropped frames from 21 to 22, i.e. nothing. A CPU profile
then showed 66% idle, which ruled out script entirely, and a devtools trace found
the actual cost: **363ms of Layout across 31 events, one of them a 248ms
full-document relayout of all 851 boxes at 673ms**, landing mid-entrance. The
decisive experiment was a warm-cache run — same page, same DOM, **27ms** of total
layout — which proved the cost was resource arrival time and not the page.

Note the near-miss in that sequence: a run with the font blocked was *worse*
(346ms), so the font swap was not the whole story either, and single cold loads
vary enough (192 / 209 / 346) that one run proves nothing. Take ten.

Useful negative result: blocking `accounts.google.com` changed layout not at all
(397ms vs 407ms). Google One Tap still costs a 247ms background parse and five
requests on a signed-out homepage — worth revisiting on its own merits, but it is
not a hero-smoothness fix, and shipping it as one would have been a false claim.

Feedback form + swatch focus rings (2026-08-13) moved browser acceptance
219 → **226** (+7). Unit unchanged: both fixes are rendered behaviour, and the
things worth asserting — an accessible name, a resolving `aria-describedby`, a
ring's contrast against a live swatch — only exist once a browser has computed
them.

Reflow at 320px (2026-08-13) moved browser acceptance 208 → **219** (+11: an
unreachability sweep across eight routes, plus the three specific guarantees —
specimens that truncate without shrinking, palette tools that stay ≥24px, and a
visible submit CTA).

**Running `test:users` beside another run: set `PLAYWRIGHT_PORT`.** Several
agents run the suite at once. The variable picks the `vite preview` port (default
4174, `--strictPort`) AND, since 2026-09-08, the report directory: with it set the
run writes to `tests/user-sim/report/<port>/` (artifacts, `results.json`,
`findings.jsonl` and the two audit ledgers); without it, to `tests/user-sim/report/`
exactly as before, which is what CI uploads. Pick a port nothing is listening on
in the same command (`netstat -ano | grep LISTENING | grep ":$P "`), run
`PLAYWRIGHT_PORT=$P npm run test:users`, and set the same variable for
`npm run test:users:report` or it summarises the default directory. The port
keeps the preview servers and the reports apart; it does NOT give each run its own
`dist/` — two runs in one checkout still rebuild under each other, and `base.js`
fails the run when that happens — so concurrent runs also need their own
checkout. `tests/unit/per-runner-report-dir.test.js` imports the config under
different ports and fails if two resolve to one directory or the default moves.

**`test:users` now prerenders too.** It ran `vite build --mode test` alone,
which overwrote dist/ WITHOUT the prerender step — so running it before the unit
suite silently skipped every test that asserts against the built shells, and the
acceptance suite walked a different artefact from the one production serves.

Soft-404 fix (2026-08-13) moved unit 330 → **357** (+27: what counts as a
missing route, what gets indexed, the served shells, and the rewrites that
serve them).

**CI now runs `npm run build`, not `npx vite build`.** Only the npm script runs
`scripts/prerender.mjs`, so the build step production deploys had NO coverage —
a prerender that crashed or silently stopped matching index.html's tags would
have shipped green. This also means `dist/` exists when the unit suite runs, so
the tests that assert against the built shells actually execute rather than
skipping.

Raster style-guide export (2026-08-12) moved unit 313 → **330** (+17: the sheet
layout — nothing off-page, printed sizes matching the real ladder, readable ink
on every swatch, and determinism). Browser acceptance unchanged: the Export
panel is behind auth, so the built chunk was exercised directly in a browser
instead — see the PR.

Data export (2026-08-12) moved unit 294 → **313** (+19: prefix ownership, the
collection and clearing rules, disclosure of undescribed keys, and the crash
below). Lint 32 → **31**: the export page's inline `style={}` objects moved to
global.css, which retired one `react-refresh/only-export-components` warning.

**A crash found while verifying that slice, worth knowing about.** Seeding
`vs-analytics` with a valid-JSON *object* where an array was expected
white-screened the whole app with `push is not a function` on every page view.
`analytics.js`'s `load()` used `JSON.parse(...) || fallback`, which only
catches null — the wrong SHAPE passed straight through and failed on the next
write. Reachable by a stale schema or by someone hand-restoring their own data
export. Now shape-checked against the fallback, with a regression test.

AI quota warnings (2026-08-12) moved unit 273 → **294** (+21: which ceiling
binds, the low threshold, server-vs-local reconciliation, reset times, and the
wiring the audit found missing). Browser acceptance unchanged — both AI tools
sit behind an AuthGate this suite cannot pass.

Account deletion (2026-08-12) moved unit 251 → **273** (+22: the reauth freshness
window, Stripe customer ownership verdicts, which subscription statuses still
bill, the stage ordering, and the 12-function budget). Browser acceptance
unchanged — the deletion dialog only renders signed in, and this suite has no
way to create a signed-in user.

**The API is now at exactly 12 of 12 Vercel functions.** `api/delete-account.js`
took the last slot. The next endpoint has to replace one;
`tests/unit/account-deletion.test.js` fails the build if the count goes over.

The billing-signals slice (2026-08-12) moved unit 229 → **251** (+22: the
seven-day grace window, its boundary conditions, alert precedence and the
webhook wiring) and browser acceptance 205 → **208** (+3: the banner's layout
against the feedback FAB, target size, and contrast/focus ring). Lint unchanged
at 32.

**A flake worth knowing about.** On the first full `test:users` run of that
slice, `18-signup-intent.spec.js:41` ("Log in" still opens sign-in) failed on a
click timeout at `/plans`. It did not reproduce on a clean re-run of the whole
suite. Note the trap: re-running the failing spec ALONE also changes the worker
count, so a pass there proves nothing on its own — re-run the FULL suite, which
is what actually distinguishes a load flake from a regression.

The plans overhaul took lint from 33 to **32**. Not a drive-by fix: exporting
the new `AI_LIMITS` table from `SubscriptionContext.jsx` would have ADDED a
34th `react-refresh/only-export-components` warning, so the plan tables moved
to `src/config/plans.js` — the counterpart `api/_lib/plans.js` had always named
and which had never existed. That removed the pre-existing warning on
`FREE_SAVE_LIMITS` at the same time, because it was the same fault.

**FIXED — the One Tap guard was failing whole runs at random.** The suite-wide
`assertOneTapNeverLeft()` check fails the run if any request reaches
`accounts.google.com`. It classified a failed request as an escape when the
`context.route` handler had never taken charge of it — the reasoning being that
an un-intercepted request must have been dispatched.

That reasoning has a race in it. Interception and the handler running are not
the same instant, so a request raised and then cancelled by a closing context
was never in the bookkeeping — and was reported as having reached Google. It
went red on branches that had touched nothing near it, with a different spec
implicated each time, and cost two separate investigations before the pattern
was visible.

The classification now comes from the failure's own error text: DNS, connection,
proxy, TLS and timeout errors mean the request left; everything else —
`ERR_ABORTED` above all — means it was cancelled in the browser.
`classifyOneTapFailure` in `tests/user-sim/base.js`, with the case table in
`tests/unit/one-tap-stub.test.js`. This is also **stricter** where it counts: a
network-class failure on a request the handler *had* taken charge of used to be
counted as an abort and hidden.

**A guard that cries wolf gets ignored, which is worse than not having one.** If
one of these starts failing intermittently, fix the guard — do not raise its
threshold and do not delete it.

**FIXED — a test that sampled a random source.** `30-founder-requests-0808`
asserted "Random reaches linear most often" over 60 presses of the gradient
randomiser. At the shipped 50/25/25 weighting the expected counts are 30/15/15;
CI drew **24 linear, 24 radial** and went red on a tie. Nothing was broken.

**A build gate may not depend on "probably".** Sampling a random source is
probably-right by construction, and no draw count makes that a property — it
only moves the failure rate. The distribution is now asserted exactly, over a
100,000-point grid of the roll space, in `tests/unit/gradient-random.test.js`,
which also pins that the page calls the weighted pickers rather than rolling its
own. The browser keeps the one claim no draw can flip: every type is still
reachable.

**FIXED — a baseline captured mid-animation.** `17-founder-batch-3` → *Start
for Free keeps the Palette Library underneath* wheels down the page until
`scrollY` reads over 400, records that number, opens and closes the auth popup,
and asserts the position survived. The wheel loop exits on the first sample over
400 — but Lenis is still easing toward the full 700 of that gesture, so the
recorded baseline was a mid-flight position and the final comparison measured
the REST OF THE EASING CURVE. CI failed with `was 467, now 700` and
`was 489, now 700` on two branches that touched nothing near it.

It now polls for two identical samples before recording. **Anywhere this suite
reads a scroll position on a Lenis page, read it twice** — one sample during a
smooth scroll is a number in transit, not a position.

**Known browser-suite flake:** under runner contention a small number of
specs can fail once and pass on rerun. Re-run before treating a single red
browser job as a real regression, and say in the PR which failures were flake
and which were real.

**FIXED, not just named:** `07-public-shell-library-palette.spec.js` → *Icon and
Emoji modes switch from the keyboard* failed CI twice in one session at ~23s
against a 2.1s local run. The cause was an unbounded
`waitForLoadState('networkidle')` in a spec that reaches the **Iconify API** —
so a slow third party ate the whole test budget, and the offline poll after it
then timed out with a misleading message about the banner. It looked like a
regression in code nobody had touched, twice.

The wait is now bounded to 5s and non-fatal; the real precondition is the
`Live library connected` assertion that follows it. **Do not reintroduce a bare
`networkidle` in any spec that touches a third-party API** — Playwright's own
docs discourage it, and this is why.

Named instance (batch 4): `10-home-chaos-to-calm.spec.js` → *11a · a hand-off
lands looking at the uploaded images*. Lenis owns the scroll position on that
path, and under four parallel workers the settle poll can return before the
smooth scroll finishes, leaving the card ~38px below the fold. It passes
single-worker and passes on a clean suite rerun. **Verify a flake the right
way:** rerun the same spec at the same worker count. Stashing your changes and
rerunning it alone proves nothing — that changes two variables at once, and it
will "pass on main" whether or not your work is the cause.

## CI

`.github/workflows/ci.yml` runs on every pull request targeting `main` and on
every push to `main`. It is the automated version of the same gate documented
below — same commands, same order, no secrets required (everything runs
offline against a throwaway `demo-uil4b` Firebase project and a local preview
server):

1. `npm ci`
2. `npx eslint .` — fails the job on errors; the pre-existing advisory
   warnings (see the gate table above) do not fail it.
3. `npm run build` — vite build **plus** `scripts/prerender.mjs`; the
   workflow step is named "Build (vite + prerender)".
4. `npm run test:unit`
5. `npm run test:rules` (Firestore emulator, via `actions/setup-java` pinned
   to Temurin 21 — see the JDK note below)

A second job, `browser-acceptance`, builds the app, installs Playwright's
Chromium via `npx playwright install --with-deps chromium`, and runs
`npm run test:users` (the user-simulation acceptance suite — see
`tests/user-sim/README.md`) the same way — no secrets, no external services.

If a gate goes red in CI, treat it exactly like a red local build: NO-GO, fix
the root cause, don't route around it.

### First check that it RAN

**A red or amber check is evidence only once you have confirmed the job started.**
Since 2026-09-04 no Actions run in this repository has started at all — the
annotation is *“The job was not started because recent account payments have
failed or your spending limit needs to be increased.”* Both jobs die in 1–3
seconds, and `gh pr view` then reports the pull request as **`UNSTABLE`**.

`UNSTABLE` reads as “the code is broken”. It means **the gate never ran.** Anyone
triaging by check status draws the wrong conclusion about every open PR at once.

While that is true, **the only evidence a change is green is a local run of the
four commands above, pasted into the PR body** — and the reviewer has to be told
to look there, because the honest signal is invisible on the PR itself. The live
state is on the App condition board (`ci` and `deploy` in `src/data/pipeline.js`);
clearing it is §1 of `docs/OWNER-ACTIONS.md` and needs the account owner.

## Commands

```bash
npm run build           # MUST pass before any commit (vite + prerender)
npx vite --port 5173    # dev server
npx eslint .            # MUST be clean (0 errors) before shipping
npm run test:unit       # pure logic (auth switching, billing guards)
npm run test:rules      # Firestore security rules, on the local emulator
```

**`test:rules` needs a JDK 21+ on `PATH`** (the Firestore emulator jar is
compiled for Java 11+, and firebase-tools 15 requires 21+). It runs against a
throwaway `demo-uil4b` project, so it never touches production data. Any edit to
`firestore.rules` MUST pass it before the rules are published in the Firebase
console — the console publish, not a deploy, is what makes rules live.

CI sets this explicitly with `actions/setup-java` (Temurin 21) rather than
relying on the runner's default JDK — that implicit-dependency failure mode is
exactly what this doc exists to prevent. Locally, the default JDK on the
founder's machine is 1.8, which fails with `UnsupportedClassVersionError`
unless a JRE 21 is prefixed onto `PATH` for the command, e.g.:

```bash
export PATH="/c/Users/dylan/.lunarclient/jre/d093c370fc8eaa3e6743d7f61fb633adac4344f2/zulu21.48.17-ca-jre21.0.10-win_x64/bin:$PATH"
npm run test:rules
```

If that JRE path is missing (moved, reinstalled, different machine), install
any Temurin/Zulu **JDK 21+** and point `PATH` at its `bin` directory the same
way.

## Verify-First Workflow

Before starting any implementation:

1. **State how you will verify** the change works — build, visual check, or a
   specific test. Decide this *before* writing code.
2. **After finishing**, run that verification and report the result with
   evidence.
3. **Never claim success without evidence.** Minimum bar = a passing
   `npm run build` + a visual/behavioural confirmation. "It compiles" is not
   "it works."

## Build-gate rules

- **Verify-first build gate.** A change is not "done" until `npm run build`
  passes and `npx eslint .` reports 0 errors. Agents never claim success
  without that evidence.
- **Red build = NO-GO.** A failing build is a hard stop at the release gate, no
  overrides.
- **Run it before marking complete.** See Core Behaviors in `CLAUDE.md`:
  "Never mark work complete without running it."

## Batched gate — simple per change, full per cluster

Founder rule (2026-06-30): **don't over-route.** The build/lint gate is cheap
(local, zero model cost); the multi-agent review gate is not. So:

- **After each change** → run the **simple check**: `npm run build` +
  `npx eslint .`, against the pass conditions at the top of this file.
- **After a cluster of related changes** → run **one combined code-review + qa**
  over the whole batch, then merge. Not a fresh review per micro-edit.
- **Security-sensitive code is never batched away.** Anything touching `/api`,
  auth, Stripe, or user-generated content gets a **`reviewer` pass before
  merge**, every time — no matter how small. `reviewer` scans for secrets and
  weighs security on every diff, so there is no separate step to forget.

Rule of thumb: *simple check after completing a new thing; a bigger scan/test
after several changes have landed.*

## What "verified" looks like by task type

| Task | Minimum verification |
|---|---|
| UI / component change | Build passes + visual check (the affected screen/state). |
| Logic / util change | Build passes + the specific behaviour exercised. |
| API route change | Build passes + the route's happy path + one failure path. |
| CSS-only change | Build passes + visual check at the widths `css-conventions.md` names — do not carry a copy of them here. |
| Copy / content | Build passes + the rendered text checked in context. |

## Murphy's-law states

Every shipped feature must handle loading / empty / error / offline states.
See `murphys-law.md` for the full checklist — QA treats missing UX states as a
failure.
