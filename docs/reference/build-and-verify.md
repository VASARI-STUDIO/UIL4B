# Build & Verify

> Reference doc for UIL4B. Linked from `CLAUDE.md`. This is the quality gate —
> nothing ships without it.

## Commands

```bash
npx vite build          # MUST pass before any commit
npx vite --port 5173    # dev server
npx eslint .            # MUST be clean (0 errors) before shipping
```

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
  `npx eslint .`. Baseline: **0 errors**; the only warnings are pre-existing
  `set-state-in-effect` hints (~30) — match the current count, don't add new ones
  and don't "fix" the existing ones.
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
