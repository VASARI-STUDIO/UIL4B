# User-simulation acceptance suite (the feedback loop)

Playwright tests that walk the **production build** the way real people do.
Each spec file is a persona; each test is a concrete goal ("what size is an
Instagram post?"), and the pass condition is *the user got their answer*.

## Specs

`ls tests/user-sim/*.spec.js` is the list. There is deliberately no table of
files here.

The naming carries the meaning, so the directory listing is the index:

- **`01-` … `03-`** are the three original personas — never seen the product,
  knows exactly what they need, and on a phone being impatient and error-prone.
  Read these first; they are what the suite is *for*.
- **Everything after them** is a surface or a regression suite, added alongside
  the feature that needed it, and named for the surface it covers
  (`21-reflow-320`, `26-one-tap-stub`, `33-offline-state`). The persona framing
  still applies — assert the user's goal, not the implementation — but the file
  name says which surface, so a table restating it adds nothing.

**This used to be a table, and it went stale badly.** It described fourteen
files and stopped being touched; by the time anyone noticed there were
thirty-seven, so the "complete" list was missing twenty-three suites and its
sign-off line — *use the next free number, `15-`* — pointed at a number that had
been taken for months. A hand-maintained inventory of a directory has no
feedback loop: nothing fails when a file is added and the list is not, so
eventually nothing matches. Same fault, and the same fix, as the test counts
that used to be in `docs/reference/build-and-verify.md`.

Two files share the `11-` prefix. That is untidy but harmless — Playwright keys
on the path, not the number. **For a new file, take the next number after the
highest one already present** (`ls tests/user-sim/*.spec.js | tail -1`), which
is a rule that stays true rather than a number that goes stale.

There is no test count recorded anywhere, here or in the gate doc. The gate is
**0 failures**, and the only skips are `12-ui-system-builder.spec.js` — see
`docs/reference/build-and-verify.md`.

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
**every page load** — 461 of them in one measured run — and filled CI logs with
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
