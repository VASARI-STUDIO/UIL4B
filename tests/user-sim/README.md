# User-simulation acceptance suite (the feedback loop)

Playwright tests that walk the **production build** the way real people do.
Each spec file is a persona; each test is a concrete goal ("what size is an
Instagram post?"), and the pass condition is *the user got their answer*.

## Personas

| File | Persona | What it probes |
| --- | --- | --- |
| `01-first-time-visitor.spec.js` | Never seen the product | Landing comprehension, nav discovery, pricing findability, blank/broken pages, mistyped URLs |
| `02-goal-driven-user.spec.js` | Knows exactly what they need | Real answer-seeking flows on `/ratio` + the other live tools |
| `03-fresh-user-edges.spec.js` | On a phone, impatient, error-prone | Mobile usability, keyboard access, garbage input (Murphy's-law), full public-route sweep |

## Run it

```bash
npm run test:users          # builds nothing — run `npm run build` first
npm run test:users:report   # re-print the last run's feedback summary
```

The suite starts `vite preview` on port 4174 by itself (and reuses one that is
already running).

## The feedback loop

Beyond hard pass/fail, every test streams *findings* into
`report/findings.jsonl` via `helpers.js`:

- **critical** — uncaught page exception or a blank surface
- **error** — unexpected console error, viewport overflow, NaN in the UI
- **improve** — soft UX observations (weak hero copy, missing CTA, keyboard gaps)

`summarize.js` (auto-run on teardown) dedupes them across personas and prints
a severity-ranked to-do list. Fix what it reports, re-run, repeat — that is
the loop.

## Adding a persona / goal

1. Create `NN-persona-name.spec.js`.
2. `const fb = watch(page, 'persona name')` at the top of each test —
   crashes and console errors are then recorded automatically.
3. Assert the user's *goal*, not implementation details, and use
   `fb.note(severity, message)` for observations that shouldn't fail the run.

Notes for sandboxed runners: external hosts (fonts, Firebase, iconify) are
blocked and are whitelisted as expected noise in `helpers.js`; the pinned
Chromium at `/opt/pw-browsers/chromium` is used automatically when present.
