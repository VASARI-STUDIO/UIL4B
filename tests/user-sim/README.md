# User-simulation acceptance suite (the feedback loop)

Playwright tests that walk the **production build** the way real people do.
Each spec file is a persona; each test is a concrete goal ("what size is an
Instagram post?"), and the pass condition is *the user got their answer*.

## Specs

The first three files are the original personas. Everything after them is a
surface or regression suite added alongside the feature that needed it — the
persona framing still applies (assert the user's goal, not the implementation),
but the file name says which surface it covers.

| File | What it probes |
| --- | --- |
| `01-first-time-visitor.spec.js` | Never seen the product: landing comprehension, nav discovery, pricing findability, blank/broken pages, mistyped URLs |
| `02-goal-driven-user.spec.js` | Knows exactly what they need: real answer-seeking flows on `/ratio` and the other live tools |
| `03-fresh-user-edges.spec.js` | On a phone, impatient, error-prone: mobile usability, keyboard access, garbage input (Murphy's-law), full public-route sweep |
| `04-premium-home.spec.js` | The premium public home shell |
| `05-tint-scale-workflows.spec.js` | Tint scale workflows |
| `06-colour-tool-workbenches.spec.js` | The colour tool workbenches |
| `07-public-shell-library-palette.spec.js` | Public shell, library and palette surfaces |
| `08-public-route-contract.spec.js` | The public route contract |
| `09-auth-modal-accessibility.spec.js` | Auth modal accessibility |
| `10-home-chaos-to-calm.spec.js` | The homepage chaos-to-calm workbench contract |
| `11-palette-recovery.spec.js` | Palette recovery paths |
| `11-typography-tools.spec.js` | The three typography tools |
| `12-ui-system-builder.spec.js` | UI System builder |
| `13-ui-system-pro.spec.js` | UI System Pro gating |
| `14-founder-batch-regressions.spec.js` | The #202 founder-batch regressions |

Two files share the `11-` prefix. That is untidy but harmless — Playwright keys
on the path, not the number. Use the next free number (`15-`) for a new file.

The current test count is recorded in
`docs/reference/build-and-verify.md`, not here — one place, so it can't drift.

## Run it

```bash
npm run test:users          # runs `vite build --mode test` first, then Playwright
npm run test:users:report   # re-print the last run's feedback summary
```

`test:users` builds the app itself — you do **not** need a separate
`npm run build`. The suite then starts `vite preview` on port 4174 by itself
(and reuses one that is already running).

## The feedback loop

Beyond hard pass/fail, every test streams *findings* into
`report/findings.jsonl` via `helpers.js`:

- **critical** — uncaught page exception or a blank surface
- **error** — unexpected console error, viewport overflow, NaN in the UI
- **improve** — soft UX observations (weak hero copy, missing CTA, keyboard gaps)

`summarize.js` (auto-run on teardown) dedupes them across personas and prints
a severity-ranked to-do list. Fix what it reports, re-run, repeat — that is
the loop.

## No third party is on the critical path

Google One Tap is live on every signed-out page (`src/components/GoogleOneTap.jsx`,
with a hardcoded fallback client ID in `src/utils/firebase.js`), so before
`base.js` existed this suite made a real round trip to `accounts.google.com` on
**every page load** — 335 of them in one run — and filled CI logs with
`[GSI_LOGGER]` FedCM errors. `base.js` serves that script empty for every
browser context in the run, `26-one-tap-stub.spec.js` proves it by observation,
and the global teardown **fails the run** if a single request gets out. Empty,
not aborted: an abort raises a console error the feedback loop then reports on
every viewport.

That is why specs import `test` from `./base.js` and never from
`@playwright/test` — `tests/unit/one-tap-stub.test.js` enforces it.

## Adding a persona / goal

1. Create a `NN-name.spec.js` file, taking the next free number, and start it
   `import { test, expect } from './base.js'` (never `@playwright/test`).
2. `const fb = watch(page, 'persona name')` at the top of each test —
   crashes and console errors are then recorded automatically.
3. Assert the user's *goal*, not implementation details, and use
   `fb.note(severity, message)` for observations that shouldn't fail the run.

Notes for sandboxed runners: external hosts (fonts, Firebase, iconify) are
blocked and are whitelisted as expected noise in `helpers.js`; the pinned
Chromium at `/opt/pw-browsers/chromium` is used automatically when present.
