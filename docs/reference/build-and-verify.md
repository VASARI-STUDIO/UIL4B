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
| Build | `npx vite build` | passes |
| Unit | `npm run test:unit` | **313 tests, 313 pass** |
| Firestore rules | `npm run test:rules` | **24 tests** (9 standalone + 5 × 3 parameterised entitlement fields) — count read from `tests/rules/firestore-rules.test.js`; the suite itself needs a JDK 21 (see below) |
| Browser acceptance | `npm run test:users` | **208 tests across 21 spec files**; **195 pass, 13 skipped** (`npx playwright test --list`) |

The 13 skipped are the whole of `12-ui-system-builder.spec.js`. UI System mode
went admin-only in founder batch 4 and this suite runs signed out, so the
surface is unreachable rather than broken — the file carries the reason and the
one-word change that re-enables it. Skipped is the honest state; do not "fix"
the count by deleting the file.

The 32 lint warnings are pre-existing and advisory
(`react-hooks/set-state-in-effect`, `react-refresh/only-export-components`,
`react-hooks/preserve-manual-memoization`, `react-hooks/exhaustive-deps`).
The previous figures in this table (33 / 185 / 191) were measured at 2026-08-09.
Founder batch 4 (2026-08-11) added no lint warnings; it moved unit
(+7 tests: the per-point snap radius, the centre detent, the cross-axis slider
tracks and the ±180→±50 hue migration) and browser acceptance (+1 test: the
rendered proof that moving one adjust slider repaints the other three tracks).
Match the count, don't add new ones, and don't "fix" the existing ones as a
side effect of unrelated work. CI fails on lint **errors** only.

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
  auth, Stripe, or user-generated content gets **secret-scanner +
  security-reviewer before merge**, every time — no matter how small.

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
