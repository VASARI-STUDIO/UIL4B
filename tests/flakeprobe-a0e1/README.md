# Flake reproduction harness — `suite-flake-class-unreproduced`

A run-on-demand reproduction of the full-suite flake class described in
`src/data/pipeline.js`. Nothing here runs as part of `npm run test:users`; it is
aimed by hand at a hypothesis.

## The finding

**A rebuild of `dist/` during a run reproduces the whole flake class.**

`vite build` empties `dist/` before refilling it, and `vite preview` serves
`dist/` live. A second `npm run build` — or a second `npm run test:users`, which
begins with one — against the same checkout deletes the content-hashed chunks
the running workers are part-way through fetching. Every asset request during
that window can 404: the entry bundle, `react-dom`, a lazy route chunk,
`index.html` itself.

From inside a worker that is not "the build is broken". It is one arbitrary
assertion in one arbitrary spec failing with `element(s) not found`, on a page
that renders perfectly every other time. The victim is whichever worker was
mid-fetch, so it lands on a different spec each time, passes in isolation, and
passes on a re-run.

Measured, on the six spec files named in the backlog item:

| condition | result |
| --- | --- |
| stable `dist/` | **130 passed, 0 failed** |
| `vite build` loop running underneath | **114 passed, 16 failed** |

The 16 sprayed across `10-home-chaos-to-calm`, `11-typography-tools` and
`24-mobile-overhaul` — three unrelated subsystems, one symptom. That is the
pattern the backlog item describes.

Two failure shapes, both observed:

- `expect(locator).toBeVisible() failed … element(s) not found` on a page that
  `go()` considered ready — a partial load, where the shell mounted and a lazy
  sub-chunk 404'd.
- `the route never got past its lazy-loading fallback in 20000ms —
  mounted=false bodyChars=0` — a blank page, where the entry bundle itself 404'd.

## What was ruled out

Both levers the backlog note prescribed were tried on the Font Gallery `h1`
first, and **neither reproduces it**:

- **CPU throttling** (`Emulation.setCPUThrottlingRate` over CDP) at
  1/2/4/6/8/10/16/20x — the `h1` is present and visible at every rate.
  `fontgallery.spec.js`.
- **Holding the lazy chunk back** with `page.route` at
  0/500/1500/3000/6000/9000ms — `ready()` waits correctly, `readyMs` tracks the
  delay exactly, and the `h1` is present the instant `go()` returns.
  `chunkhold.spec.js`.

So the readiness door in `helpers.js` is sound for this route, and the flake is
not a CPU-scheduling or chunk-latency problem.

## Files

| file | what it does |
| --- | --- |
| `probe.config.js` | Playwright config for the probe specs. Reuses a running preview server. |
| `realspecs.config.js` | Runs the REAL `tests/user-sim` specs against an already-running server, 4 workers, so a rebuild can be aimed underneath them. |
| `fontgallery.spec.js` | CPU-throttle sweep on `/create/font-gallery`. |
| `chunkhold.spec.js` | Lazy-chunk delay sweep on the same route. |
| `distrace.spec.js` | Navigate-and-assert laps; counts failures. The before/after instrument. |
| `rebuild-loop.sh` | Simulates another agent's `npm run build` in a loop. |

## Running it

Pick a `PLAYWRIGHT_PORT` no other agent is using.

```sh
npm run build

# Terminal 1 — a preview server the rebuild loop will not kill.
npx vite preview --host 127.0.0.1 --port 4512 --strictPort

# Terminal 2 — baseline: expect 0 failures.
FLAKE_LAPS=40 PLAYWRIGHT_PORT=4512 \
  npx playwright test --config tests/flakeprobe-a0e1/probe.config.js distrace

# Terminal 3 — then again with dist/ moving underneath it.
bash tests/flakeprobe-a0e1/rebuild-loop.sh 45 &
FLAKE_LAPS=40 PLAYWRIGHT_PORT=4512 \
  npx playwright test --config tests/flakeprobe-a0e1/probe.config.js distrace
```

To watch it hit the real suite instead, swap in `realspecs.config.js` and name
spec files.

## The guard this produced

`tests/user-sim/base.js` now records every `/assets/` 4xx per browser context,
and `global-teardown.js` fails the run if any occurred — **including a green
run**, because a rebuilt `dist/` makes the passes as meaningless as the
failures. `ready()` in `helpers.js` names the same cause inline when a route
never arrives.

A 4xx under `/assets/` is unambiguous: those are content-hashed build outputs,
and nothing in the suite fulfils one with an error status. The only two specs
that interfere with a chunk use `route.abort()` (`10-home`) and a delayed
`route.continue()` (`47-lazy-route-readiness`), neither of which produces an
HTTP response at all. `/api/*` 404s are expected under `vite preview` and are
deliberately not matched.

## What this does NOT establish

That a concurrent rebuild is what happened during the twelve runs the flakes
were originally seen in. That was never instrumented, so it cannot be recovered
after the fact. **None of the six individually named tests was reproduced on
demand** — the mechanism picks its victim by timing, so a specific test is not a
reproducible target. The guard is the instrument that will answer it the next
time it happens.

The standing prevention, unimplemented and worth considering: give each
concurrent runner its own `outDir` keyed on `PLAYWRIGHT_PORT` (`vite build
--outDir`, `vite preview --outDir`, and the `dist` constant in
`scripts/prerender.mjs`), so two agents in one checkout cannot collide at all.
