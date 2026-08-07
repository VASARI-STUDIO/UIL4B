# Build & Verify

> Reference doc for UIL4B. Linked from `CLAUDE.md`. This is the quality gate —
> nothing ships without it.

## Canonical gate baselines

**This table is the single source of truth for the gate numbers.** No other
document, comment or commit message should restate them — link here instead.
Every figure below was produced by running the command in this repository on
the `fix/palette-builder-founder-batch-2` branch on 2026-08-07; if you change a
number here, you must have re-run it.

| Gate | Command | Current baseline |
|---|---|---|
| Lint | `npx eslint .` | **0 errors, 33 advisory warnings** |
| Build | `npx vite build` | passes |
| Unit | `npm run test:unit` | **176 tests, 176 pass** |
| Firestore rules | `npm run test:rules` | **24 tests** (9 standalone + 5 × 3 parameterised entitlement fields) — count read from `tests/rules/firestore-rules.test.js`; the suite itself needs a JDK 21 (see below) |
| Browser acceptance | `npm run test:users` | **179 tests across 17 spec files** (`npx playwright test --list`) |

The 33 lint warnings are pre-existing and advisory
(`react-hooks/set-state-in-effect`, `react-refresh/only-export-components`,
`react-hooks/preserve-manual-memoization`, `react-hooks/exhaustive-deps`).
The previous figures in this table (33 / 141 / 167) were measured on
`feat/discover-library-parity` at 2026-08-06. This branch added no lint
warnings; it moved unit (+35 tests, +3 files: `slider-keys`, `palette-names`,
`board-handoff`) and browser acceptance (+12 tests, +1 spec file,
`16-founder-batch-2.spec.js`).
Match the count, don't add new ones, and don't "fix" the existing ones as a
side effect of unrelated work. CI fails on lint **errors** only.

**Known browser-suite flake:** under runner contention a small number of
specs can fail once and pass on rerun. Re-run before treating a single red
browser job as a real regression, and say in the PR which failures were flake
and which were real.

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
