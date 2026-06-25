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
