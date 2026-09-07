# Deferring Firebase off the public critical path

> The design `firebase-critical-path` is blocked on. Written to be approved on
> evidence rather than on argument: every number below was taken with
> `scripts/home-field-metrics.mjs`, the instrument #402 used, on the profile
> #402 used, so before and after are comparable.
>
> **Status: awaiting founder approval of one patch.** Everything that could be
> built without touching a founder-gated file is built and merged behind a flag
> that is off by default. The remainder is
> `docs/design/firebase-deferral-gated.patch` — exact, unapplied, and verified
> to apply cleanly on every `npm run test:unit`.

---

## 1. What is in the 116 KB chunk, and what the homepage needs

Measured by import graph, not by reading: each row is a real rolldown build of
exactly the symbols `src/` imports from that entrypoint, gzipped at level 9.

| Import set | raw | gzip |
|---|---:|---:|
| `app` + `auth` + `firestore` + `storage` — what ships today | 468,019 | 125,898 |
| `app` + `auth` + `firestore` | 441,358 | 118,068 |
| `app` + `auth` | 144,554 | 39,148 |
| `app` + `firestore` | 330,535 | 89,061 |
| `app` + `storage` | 61,362 | 18,510 |
| `app` only | 28,397 | 8,276 |
| nothing (build floor) | 133 | 115 |

Marginal cost of each, gzip: **Firestore 80,785 (69%)**, Auth 30,872 (26%),
Storage 10,234 (9%), the app core itself 8,161 (7%). The marginals sum to about
3.5 KB more than the whole, which is shared SDK code counted twice.

**What the public homepage needs before interaction: none of it.**

- **Auth**'s only job on a signed-out page load is to conclude "signed out".
  Nothing on the sales page waits for that: `rootDestination` already answers
  from the synchronous `localStorage` hint (#385), and `useSessionHint` refuses
  to write while `loading` is true.
- **Firestore** is touched only behind a resolved `uid` — the profile hydrate,
  the subscription snapshot, project sync, and the analytics aggregate (which
  returns early on `!auth.currentUser` before it does anything).
- **Storage** is community media upload, reachable only from lazy routes.

`src/utils/firebase.js` calls `getFirestore()` and `getStorage()` at module
scope, so 78% of the chunk is constructed on every page load for work no
public visitor ever does.

---

## 2. The design

**Two implementation modules per seam, swapped by a build flag.**

```
src/utils/firebaseAccess.js          eager broker — the default, static imports
src/utils/firebaseAccess.lazy.js     deferred broker — dynamic import() + the gate
src/components/oneTapMount.jsx       static re-export of GoogleOneTap
src/components/oneTapMount.lazy.jsx  held back until the gate opens
```

`VITE_DEFER_FIREBASE=1` makes `vite.config.js` alias the `.lazy` half in. With
the flag unset there is no alias at all, so an unflagged build resolves the
eager modules normally — in Node, in ESLint and in the unit tests too.

### Why a build flag and not a query param

The thing being changed is **which chunk `firebase-*.js` belongs to**, and
rolldown decides that at build time from the shape of the import graph: a chunk
reached by a static import is emitted into the entry graph and listed in
`index.html`'s `modulepreload`; one reached only by `import()` is not. No
runtime switch can move those bytes out of the first wave — the browser has
already requested them before any of our code runs.

`?firebase=eager` is the runtime dial that does exist: within a deferred build
it opens the gate immediately, so the founder can compare the two schedules
without a rebuild. It cannot undo the chunk split.

### The gate — the part that is not just "load it later"

Deferring the fetch is trivial. Deferring it without making a signed-in visitor
wait longer is the design, and it turns on telling two callers apart:

- **PATIENT** — the auth bootstrap listener, and only it. It runs on every page
  load including the many that never sign in, and on a public page nothing is
  waiting on its answer. It waits for the gate.
- **URGENT** — `RequireAuth` rendering its spinner, any sign-in action, a
  Firestore read for a page someone is looking at. These **open** the gate
  rather than queue behind it.

The gate opens on the earliest of: the session hint saying this browser had a
session; any urgent caller; the `largest-contentful-paint` entry plus a frame;
`requestIdleCallback`; the **first `pointerdown` or `keydown`**; a 2500 ms
backstop (LCP never fires in a background tab); or `?firebase=eager`.

The first-touch listener is what makes "nobody ever waits on the optimisation"
true by construction rather than by remembering to call an urgent loader at
every sign-in affordance.

### What was converted, and what could not be

| Module | Status |
|---|---|
| `src/utils/analytics.js` | converted — already guarded on `auth.currentUser` and already fire-and-forget |
| `src/hooks/useFirestoreSync.js` | converted — every path is behind a truthy `uid` |
| `src/contexts/ProjectContext.jsx` | converted — same |
| `src/App.jsx` | converted — One Tap now mounts through the seam |
| `src/hooks/useModerationRole.js` | **no change needed** — #390 already used `await import('../utils/firebase')` |
| `src/utils/firebase.js` | **gated**, and unchanged: it is the module being deferred, so it is meant to import the SDK |
| `src/components/GoogleOneTap.jsx` | **gated**, and unchanged: reached only through `oneTapMount`, so its import is held back with it |
| `src/contexts/AuthContext.jsx` | **gated** — in the patch |
| `src/contexts/SubscriptionContext.jsx` | **gated** — in the patch |

### The flag cannot report success and change nothing

With `VITE_DEFER_FIREBASE=1` the build walks the static import graph from the
entry chunks and **fails** if the SDK is still reachable without an `import()`
(`assertFirebaseIsDeferred`, `vite.config.js`). Against today's tree it fails,
deliberately — see §4.

---

## 3. The founder-gated patch

`docs/design/firebase-deferral-gated.patch` — 373 lines, two files, unapplied.

It removes the static `firebase/auth`, `firebase/firestore` and
`../utils/firebase` imports from `AuthContext.jsx` and `SubscriptionContext.jsx`
and routes them through the broker. Nothing about the session machinery changes.
The three shapes of edit:

1. **The bootstrap listener becomes asynchronous.** `whenAuthSdk().then(A => …)`
   with a `cancelled` guard and a deferred `unsub`, because a provider unmounted
   before the SDK lands would otherwise leak a listener nothing could detach. A
   rejected import resolves as signed out rather than holding every `RequireAuth`
   spinner forever.
2. **Every user-initiated action awaits `loadAuthSdk()` (urgent) first.** Sign
   in, sign up, sign out, reset, Google, credential, switch, reauthenticate,
   update email/password, delete account.
3. **`firebaseAuth.currentUser` becomes `authNow()?.auth?.currentUser`.** Every
   one of those call sites is an identity guard that already treats a missing
   user as "not this session" — the same answer they give today before auth
   resolves.

In an unflagged build the broker is the eager one, every promise is already
resolved and `authNow()` is never null, so the patched files behave exactly as
they do now.

**Blast radius, as `docs/reference/human-validation-zones.md` requires.** What
could break: session resolution, and therefore every gate that hangs off it —
`RequireAuth`, `RequireAdmin`, the project cap, billing, the export gate,
`useModerationRole`. Who is affected: every signed-in user. Reversible: yes,
completely — `git apply -R`, or simply do not build with the flag, since the
patched files are inert without it.

`scripts/firebase-deferral-trial.mjs` builds the design **as specified, patch
and all**, by applying the patch to temporary copies beside the gated originals
and aliasing those in for one build. The gated files are read, never written.
Every number in §5 was taken from a build it produced.

---

## 4. Half a deferral is worse than none

Turning the flag on **without** the patch splits the SDK across two preloaded
chunks — the auth half stays in `firebase-*.js` (34,093 gzip) and Firestore
moves to its own preloaded `index.esm-*.js` (115,301), duplicating shared core
between them.

| First-wave bytes over the wire | resources | total |
|---|---:|---:|
| flag off (today) | 33 | **521,019** |
| flag on, patch **not** applied | 34 | **553,193** (+32,174) |
| flag on, patch applied | 32 | **405,993** (−115,026, −22.1%) |

"First wave" here is every resource `index.html` asks for before any of our code
runs: the entry script, the stylesheet, all 28 `modulepreload` links, the two
preloaded fonts and `icons-data.js`. Gzip for text, raw for fonts.

These are the exact builds §5 timed. Rebuilding the committed tree reproduces
them to within 9 bytes (521,010 and 405,994) — gzip is not bit-identical across
runs when a chunk’s content hash moves. The structure is what matters and it is
identical: `firebase-*.js` is in the `modulepreload` list in one and absent from
the other.

This is why the build **fails** when the flag is on and the patch is not applied,
rather than quietly producing a slower page.

---

## 5. What LCP becomes

Same harness as #402 — `scripts/home-field-metrics.mjs`, Pixel 5 (393×851, DSF
2.75, isMobile), CDP `Network.emulateNetworkConditions` at 150 ms latency /
204800 B/s down / 96000 B/s up, `Emulation.setCPUThrottlingRate` 4, HTTP cache
disabled, **a new browser context per run, 10 cold runs**, production build
served by `vite preview`. Settled on the animation layer and the layout-shift
stream. The harness refuses to report a run whose hero rendered nothing.

| 10 cold runs | flag off | flag on + patch | change |
|---|---:|---:|---:|
| FCP mean | 2823.6 ms | **2444.8 ms** | −378.8 |
| FCP worst | 2844 ms | 2500 ms | −344 |
| **LCP mean** | **3546.8 ms** | **3106.8 ms** | **−440.0** |
| LCP median | 3532 ms | 3028 ms | −504 |
| LCP best | 3492 ms | 2952 ms | −540 |
| LCP worst | 3668 ms | 3640 ms | −28 |
| CLS worst | 0.0000 | 0.0000 | — |
| Interaction mean | 73.6 ms | 100 ms | +26.4 |
| Interaction worst | 88 ms | 152 ms | +64 |

The LCP element was `SPAN.home-hero-line-in` in all twenty runs.

### It still misses the 2500 ms budget, and here is why

**3106.8 ms mean against a 2500 ms budget — MISSED, by ~607 ms.** The deferral
recovers 440 ms of a 1047 ms gap; it does not close it, and nothing about
Firebase can.

Removing 115,026 bytes frees 562 ms of pipe at 204,800 B/s, and the measured
LCP saving is 440 ms — the difference is the CSS and the fonts expanding into
the freed bandwidth and finishing sooner, which is the FCP gain rather than an
extra LCP gain.

What remains in the first wave, after Firebase is gone:

| | gzip | share |
|---|---:|---:|
| entry JS `index-*.js` | 134,436 | 33% |
| `index-*.css` | 110,535 | 27% |
| `jetbrains-mono-latin.woff2` | 40,404 | 10% |
| `manrope-latin.woff2` | 24,836 | 6% |
| `icons-data.js` | 14,602 | 4% |
| `chunk-UVKPFVEO` | 14,203 | 3% |
| `en` + `en-US` locale chunks | 15,694 | 4% |
| 25 smaller preloads | 51,283 | 13% |

405,993 bytes is still ~1.98 s of transfer, and the LCP element is
**React-rendered** — the prerendered route shell does not contain the hero — so
it cannot paint until the 134 KB entry chunk has downloaded, parsed and executed
at 4× CPU. **Firebase was the largest single removable item, not the only one.**
The next two levers are the entry chunk and the stylesheet, 60% of what is left,
and neither can be moved without splitting the app shell or the design-system
CSS. Those are separate items, and neither is this one.

### The interaction cost, reported rather than buried

Interaction response rose from 88 ms worst to 152 ms worst. The deferred chunk
is now fetched around LCP instead of before it, so its parse can overlap a click
that arrives immediately afterwards. Still inside the 200 ms budget, on the
worst of ten runs, and it is the direct consequence of moving work later — but
it is a real cost and the flag lets it be re-measured.

---

## 6. What a signed-in visitor pays

Five runs per row, same profile. "SDK ready" is the `responseEnd` of the last
chunk carrying the SDK — the earliest moment `onAuthStateChanged` could fire.

| | requested at | SDK ready, mean | worst |
|---|---:|---:|---:|
| flag off, signed-out | 213 ms | 3076 ms | 3087 ms |
| flag off, session hint set | 206 ms | 3073 ms | 3083 ms |
| **flag on, session hint set** | 2651 ms | **3364 ms** | **3386 ms** |
| flag on, no hint (signed-out) | 3261 ms | 3881 ms | 4240 ms |

**A returning signed-in visitor's session resolves 291 ms later on average, 303
ms later at worst.** The chunk is requested 2.4 s later and arrives only 0.3 s
later, because in the baseline it is requested at 213 ms and then spends 2.8 s
contending with seven other resources on the same pipe. Being early in a queue
is not the same as being fast.

Set against the ~1 s the `onAuthStateChanged` round trip itself already costs
(measured in `tests/user-sim/20-billing-banner.spec.js`), 0.3 s is a third of a
cost already being paid — and thanks to #385 that visitor is looking at their
own User Home the whole time, not a spinner. **Positive control:** with the hint
set, `/projects` rendered 1363 characters of real content in every run, before
Firebase existed on the page.

The signed-out row is 805 ms slower and matters to nobody: it is the visitor for
whom the answer is "signed out", which nothing on the page is waiting for.

---

## 7. How to turn it on

```bash
# today, unchanged — the default
npm run build

# deferred (fails until the gated patch is applied — by design, see §4)
VITE_DEFER_FIREBASE=1 npm run build

# build the design as specified, patch and all, without writing to a gated file
node scripts/firebase-deferral-trial.mjs

# then measure it the way §5 was measured
npx vite preview --host 127.0.0.1 --port 4599 --strictPort &
node scripts/home-field-metrics.mjs http://127.0.0.1:4599 10 out.json
# and kill the preview server
```

Within a deferred build, `?firebase=eager` opens the gate at page load.

## 8. What this cannot change

- **It does not close the LCP budget.** 3106.8 ms against 2500 ms. §5 says why.
- **It does not ship on its own.** Without the gated patch the flag refuses to
  build; with it unapplied the default build is byte-for-byte today's.
- **It cannot be exercised by `npm run test:users`,** which builds unflagged.
  The suite guards the seams on the default path; the deferred path is measured
  by the two scripts, and its structure is guarded by
  `tests/unit/firebase-deferral.test.js` and by the build.
- **It does not touch what Firebase is allowed to do.** No rule, no route, no
  entitlement, no token handling changes. Only when the SDK is fetched.
