# Build & Verify

> Reference doc for UIL4B. Linked from `CLAUDE.md`. This is the quality gate —
> nothing ships without it.

## Canonical gate baselines

**This table is the single source of truth for the gate numbers.** No other
document, comment or commit message should restate them — link here instead.
Every figure below was produced by running the command in this repository on
the `fix/nav-login-slider-panel` branch on 2026-08-08; if you change a
number here, you must have re-run it.

| Gate | Command | Current baseline |
|---|---|---|
| Lint | `npx eslint .` | **0 errors, 31 advisory warnings** |
| Build | `npm run build` | passes (vite + prerender) |
| Unit | `npm run test:unit` | **489 tests, 489 pass** |
| Firestore rules | `npm run test:rules` | **24 tests** (9 standalone + 5 × 3 parameterised entitlement fields) — count read from `tests/rules/firestore-rules.test.js`; the suite itself needs a JDK 21 (see below) |
| Browser acceptance | `npm run test:users` | **229 tests across 23 spec files**; **216 pass, 13 skipped** (`npx playwright test --list`) |

Price-ladder drift guard (2026-08-20) moved unit 484 → **489** (+5: the client
`approvedTotal` and the server `DEFAULT_PRICES` agreeing in USD, quarterly being
fully described on the server, every subscription row pricing every supported
currency, per-month rates falling as commitment lengthens, and the tripwire that
quarterly is described but not sellable). Lint unchanged at 0 errors / 31
warnings.

**Browser acceptance was already 229 before that slice, not the 226 written
here.** The +3 came from `4c077ca` *test(home): move the homepage contract onto
the V2 surface* (2026-08-17), which this table was never updated for — so the
figure had been stale for three days and the next slice to run the suite would
have had to decide whether it had caused a regression. It had not. Corrected
from a measured run rather than inferred: **216 pass, 13 skipped, 0 fail.**

> **Run `npm run build`, never bare `npx vite build`.** They are not
> interchangeable: `build` is `vite build && node scripts/prerender.mjs`, and
> `npx vite build` does not prerender. Four soft-404 shell tests then self-skip
> with `# run \`npm run build\` first`, the suite reports **485 pass / 4
> skipped**, and it looks green while the shell assertions never execute.
> A gate that passes by skipping is exactly the "silence is not a pass" failure
> this document exists to prevent.

## Open-stack test deltas — 2026-08-20

**`main` is 484 unit / 229 browser.** Seven PRs are open and most add tests, so
the "current baseline" differs per branch. Check your own base before concluding
you caused a regression — that confusion has already cost time twice.

| PR | Adds | Unit on its branch | Browser on its branch |
|---|---|---|---|
| #257 workspace copy | +2 unit | 486 | 229 |
| #261 price ladder | +5 unit | 489 | 229 |
| #262 homepage motion | +1 unit | 485 | 229 |
| #263 responsive | +7 browser | 484 | 236 (223 pass) |
| #264 homepage copy | +11 unit, +4 browser | 497 | 233 (220 pass) |
| #266 route migration | +17 unit | 501 | 229 |

**Projected once the whole stack merges: 520 unit, 240 browser** (13 skipped
throughout — the admin-gated UI System suite). That projection is arithmetic on
reported deltas, **not a measured number**; re-measure after the merges and
replace this section with the real figure.

The 13 skipped are the whole of `12-ui-system-builder.spec.js`. UI System mode
went admin-only in founder batch 4 and this suite runs signed out, so the
surface is unreachable rather than broken — the file carries the reason and the
one-word change that re-enables it. Skipped is the honest state; do not "fix"
the count by deleting the file.

The 31 lint warnings are pre-existing and advisory
(`react-hooks/set-state-in-effect`, `react-refresh/only-export-components`,
`react-hooks/preserve-manual-memoization`, `react-hooks/exhaustive-deps`).
The previous figures in this table (33 / 185 / 191) were measured at 2026-08-09.
Founder batch 4 (2026-08-11) added no lint warnings; it moved unit
(+7 tests: the per-point snap radius, the centre detent, the cross-axis slider
tracks and the ±180→±50 hue migration) and browser acceptance (+1 test: the
rendered proof that moving one adjust slider repaints the other three tracks).
Match the count, don't add new ones, and don't "fix" the existing ones as a
side effect of unrelated work. CI fails on lint **errors** only.

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
   warnings (see the baseline table above) do not fail it.
3. `npx vite build`
4. `npm run test:unit`
5. `npm run test:rules` (Firestore emulator, via `actions/setup-java` pinned
   to Temurin 21 — see the JDK note below)

A second job, `browser-acceptance`, builds the app, installs Playwright's
Chromium via `npx playwright install --with-deps chromium`, and runs
`npm run test:users` (the user-simulation acceptance suite — see the baseline
table for its current size) the same way — no secrets, no external services.

If a gate goes red in CI, treat it exactly like a red local build: NO-GO, fix
the root cause, don't route around it.

## Commands

```bash
npx vite build          # MUST pass before any commit
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
   `npx vite build` + a visual/behavioural confirmation. "It compiles" is not
   "it works."

## Build-gate rules

- **Verify-first build gate.** A change is not "done" until `npx vite build`
  passes and `npx eslint .` reports 0 errors. Agents never claim success
  without that evidence.
- **Red build = NO-GO.** A failing build is a hard stop at the release gate, no
  overrides.
- **Run it before marking complete.** See Core Behaviors in `CLAUDE.md`:
  "Never mark work complete without running it."

## Batched gate — simple per change, full per cluster

Founder rule (2026-06-30): **don't over-route.** The build/lint gate is cheap
(local, zero model cost); the multi-agent review gate is not. So:

- **After each change** → run the **simple check**: `npx vite build` +
  `npx eslint .`, against the baselines at the top of this file.
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
| CSS-only change | Build passes + visual check at relevant breakpoints (768 / 480 / 380). |
| Copy / content | Build passes + the rendered text checked in context. |

## Murphy's-law states

Every shipped feature must handle loading / empty / error / offline states.
See `murphys-law.md` for the full checklist — QA treats missing UX states as a
failure.
