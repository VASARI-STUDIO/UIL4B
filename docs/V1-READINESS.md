# UIL4B — V1 Readiness Assessment

_Assessed 2026-07-29 against `main` @ `549c6c6`. Written by the PM from five
specialist review passes (security, code, SEO, analytics, QA) plus direct
verification of the claims below._

**Headline verdict: NO-GO for V1 today. One hard blocker, three soft ones.**
The application itself is in good shape — the build is green, the tools work,
the shell is coherent. What is not ready is the layer around it: the security
rules that gate paid entitlements are **written but not published**, and the
product currently cannot measure whether anyone activates or upgrades. Neither
is a code defect. Both are founder actions.

---

## How to read this

Every claim below is tagged with how it was established. This matters — an
earlier pass in this project produced false positives by trusting a naive grep,
so the standard here is deliberately strict.

| Tag | Meaning |
|---|---|
| **[verified]** | Run, measured, or read at a specific `file:line` in this assessment |
| **[reported]** | Found by a specialist agent with file:line evidence, not independently re-run by the PM |
| **[unverified]** | Believed true, but nobody has actually checked — treat as an open question |

---

## Verdict per surface

| Surface | Verdict | Why |
|---|---|---|
| **Workspace (Create)** | **GO once entitlements are live** | Tools are functional and the shell is consistent. Gated by the rules publish, not by its own quality. |
| **Billing / entitlements** | **NO-GO** | `firestore.rules` is hardened in the repository but **not published**. Until it is, the server-side entitlement check is not enforced. |
| **Discover** | **PARTIAL — ship as partial, label it** | Gradient Gallery is live; the wider gallery workstream is ~20%. Honest as a partial surface, dishonest as a finished one. |
| **Learn** | **NOT READY — keep the coming-soon shell** | No published content. Dormant article files are not content. |
| **Marketing / acquisition** | **NO-GO as a growth channel** | No measurable organic footprint, and a canonical bug that tells crawlers all ~30 public routes are the homepage. |
| **Measurement** | **NO-GO** | No activation funnel, no upgrade attribution, no retention concept. Launching without this means launching blind. |

---

## Blockers, in the order they should be cleared

### B1 — Publish `firestore.rules` · founder-only · **hard blocker**

The entitlement hardening from #183–#185 is intact in the repository:
`git diff 0b11624..HEAD -- api/ firestore.rules src/contexts/` returns **empty**,
proving nothing regressed byte-for-byte **[verified]**. But rules only take
effect when published from the Firebase console. Until then the paid tier is
enforced client-side only.

This is the single reason the security pass returns FAIL. It is not a code fix —
no PR can clear it. Ordered steps are in [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md).

### B2 — Ship the dev/preview analytics guard **before or with** B1 · **soft blocker, time-sensitive**

`src/utils/firebase.js:14-21` hardcodes one Firebase project (`uil4b-357c5`) for
dev, preview and production, and `bumpAggregate` (`src/utils/analytics.js:59-69`)
has **no environment check** — verified by reading it; the only guard present is
`if (!auth?.currentUser) return` **[verified]**.

Consequence: every local dev session and every Vercel preview deploy signed in
with a real account writes into the same `analytics-daily/{date}` document the
founder reads as "All users · server totals". This is harmless *today* only
because the aggregate is empty while the rules are unpublished. **It starts
being wrong the day B1 lands.** The two must ship together, or the guard first.

### B3 — Per-route canonical and social tags · **soft blocker**

`index.html:21` ships a static `<link rel="canonical" href="https://www.uil4b.com">`.
`src/App.jsx:271-272` updates `document.title` and the description meta on
navigation but **never** touches canonical, `og:*` or `twitter:*` — verified by
reading both files **[verified]**.

Every public route therefore tells crawlers its canonical URL is the homepage,
and every social unfurl shows the same generic card. This is a small,
non-HVZ engineering slice touching only `index.html` and `src/App.jsx`.

Related and equally cheap: **37 routes carry `soon: true`** in
`src/data/toolTree.js` **[verified]** and currently ship `index,follow` with
near-identical thin content. They should emit `noindex,follow`, driven off the
existing flag rather than a `robots.txt` disallow.

### B4 — Instrument the upgrade gate · **soft blocker**

`openProModal` (`src/contexts/ProModalContext.jsx:14`) is the single canonical
upgrade gate and fires with **zero tracking** at 9+ call sites **[reported]**.
Downstream is equally blind: the checkout return page has no tracking at all.

The fix is deliberately small: instrument `openProModal` **itself, once**, with a
`gate` property (aggregate field `gate__<id>`, matching the existing `tool__` /
`view__` convention). Every existing and future call site is covered without
touching a single page. No HVZ file is involved.

---

## Findings by area

### Security — **FAIL, for one reason only**

Beyond B1, the pass was clean. No real hits for `sk_live_`, `whsec_` or
`BEGIN PRIVATE KEY`. The Firebase web `apiKey`, the Stripe publishable key and
the Google client ID are **public by design** and correctly not treated as
secrets **[reported]**.

One open founder decision, unrelated to code: **F2 — subscription chargeback.**
There is no revocation path when a payment is reversed after entitlement is
granted. This needs either a fix or an accepted-in-writing decision. It was
notified separately.

### Measurement — **the largest gap, and the least visible**

The instrumentation measures traffic and a handful of design-tool micro-actions.
Three things are missing **structurally**, not merely absent from the dashboard:

- **Activation.** Reaching a tool is tracked via generic page views. *Producing
  something* is not — the three AI generators have zero `track*` calls, and
  `saveProject()` has none either **[reported]**. Tellingly,
  `trackToolAction(toolId)` exists at `src/utils/analytics.js:269` as the
  intended generic activation primitive and has **zero call sites** — verified
  by grep across `src/` **[verified]**. It was built for exactly this and never
  wired up.
- **Upgrade.** See B4.
- **Retention.** `analytics-daily/{date}` sums *events* per day, never *distinct
  users*; there is no per-user key of any kind **[reported]**. DAU/WAU/MAU and
  day-1/7/30 retention cannot be computed **even in principle** from what is
  stored. A minimal fix exists (write `user__<uid>: true` once per session per
  day so field count becomes a de facto unique-user set) but it needs a short
  design pass on field-count growth — it is not a one-line patch.

Two smaller items worth fixing while in there: the **"Registered Users" card**
(`src/pages/Admin.jsx:1581-1585`) reads a *per-device* cache and reads as a
global claim despite its honest sub-heading — rename or drop it. And two
dead-end caps that should be upsells: the 40/day AI cap and the free
project-save cap both terminate in a dismissible toast rather than
`openProModal`. **The save cap is arguably the highest-intent upgrade signal in
the product and currently produces nothing.** Routing them is a founder UX call.

Privacy is clean — no raw content or emails in the analytics layer **[reported]**.

### Organic growth — **no footprint, with a code-verified cause**

Beyond B3: the app is a client-rendered SPA, `vercel.json` rewrites everything to
`/index.html`, and `vite.config.js` has no prerender step **[reported]**. Bing,
the AI crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot) and every social
unfurler see only the shell. Whether to invest in prerendering is a founder call
already logged in [`DECISIONS-NEEDED.md`](DECISIONS-NEEDED.md).

`sitemap.xml` and `robots.txt` both pass. Free schema wins are available
(FAQPage off the existing `HelpCentre.jsx` array, per-tool `SoftwareApplication`,
`BreadcrumbList`, `Organization`) **[reported]**.

**Founder decision, not fixable on-page: the name collides.** "UIL4B" returns the
University Interscholastic League (uiltexas.org) for essentially every brand
query **[reported]**. Every pound spent on brand search fights that.

> Caveat recorded deliberately: the SEO agent's direct fetches returned 403 from
> the **sandbox proxy**. That is a policy block on this environment, not evidence
> about the live site. "No organic footprint" is inferred from the on-page causes
> above, **not** from a confirmed index check. Verifying actual indexation in
> Search Console is a founder action.

### Code health — **good, and improved this cycle**

The dead-code sweep landed as #196: 13 files, **3,284 deletions, zero
insertions**, all four gates green **[verified]**. Every file was confirmed
unreferenced by grep across `src/` and `tests/` before deletion, and the
lazily-imported tool pages (imported from `CreateTool.jsx` as `'./Name'`, which
a naive grep misses) were explicitly checked and **kept**.

ESLint sits at **0 errors, 32 warnings** — down from 34, the two having left with
the deleted files **[verified]**. The warning baseline is tracked; do not add to it.

### Verification pipeline — **trustworthy, with one resolved scare**

CI runs lint, build, unit tests, Firestore rules tests and the Playwright
acceptance suite on every PR. On #196 all three checks concluded **success**,
including Playwright **[verified]**.

Worth recording because it nearly caused a wrong call: the same Playwright suite
showed **6 failures locally** on the deletion branch. Rather than assume the diff
caused them, the same specs were run on a clean main-equivalent tree — which
produced the **same five failures plus a different sixth** **[verified]**. The
five were pre-existing under local conditions and the sixth was flaky; CI then
came back fully green. **Conclusion: the local failures were environmental
(concurrent agents contending for CPU producing timeout-shaped failures), not
real.** CI is the authority. The discrepancy is explained, not an open risk.

### QA — **pass in flight at time of writing**

The full responsive / theme / keyboard / contrast / Murphy's-law pass across
320–3840px was still running when this document was written. **This section is
the one genuine hole in the assessment and must be filled before any go
decision.** Do not read its absence as a pass.

---

## Risks worth stating plainly

1. **Launching blind.** If V1 ships before B4, there is no way to tell whether
   the product activates anyone or why they upgrade. Traffic will be visible;
   nothing that matters will be.
2. **The aggregate is polluted the moment the rules land.** B2 before B1, or the
   first "real" numbers the founder ever sees are already wrong.
3. **Brand search is contested from day one.** Not a bug and not fixable in code.
   It is a positioning decision that gets more expensive the longer it is left.
4. **Chargeback exposure (F2).** Small in volume, real in principle.
5. **Discover and Learn read as finished if labelled as finished.** Shipping them
   partial is fine. Shipping them *presented* as complete is the risk.

---

## What was NOT assessed

Stated so nobody mistakes silence for a pass:

- **Live payment flows.** No real Stripe transaction was exercised. The Stripe
  MCP integration requires an interactive OAuth grant unavailable to automated
  sessions.
- **Real Google OAuth popup behaviour.** The account-switch fix from #183 still
  needs one manual founder pass.
- **Actual search indexation.** See the SEO caveat above.
- **Field performance metrics.** LCP/CLS/INP on throttled Slow-4G + 4× CPU, plus
  200% zoom and forced-colours passes, remain outstanding from the homepage batch.
- **Load and concurrency.** No multi-user or sustained-traffic testing has been
  done at any point.

---

## The shortest honest path to GO

1. Publish `firestore.rules` **(founder, B1)** — with the analytics env guard
   already merged or in the same window **(B2)**.
2. Land the per-route canonical/OG fix and `noindex` for `soon` routes **(B3)** —
   one small engineering slice.
3. Land the single-point `openProModal` instrumentation **(B4)** — one small
   engineering slice.
4. Complete the QA pass and fold its verdict into this document.
5. Decide F2 (chargeback) and the Discover/Learn labelling, in writing.

Items 2 and 3 are hours of work between them and touch no human-validation zone.
Item 1 is minutes in a console. The gap between here and a defensible V1 is
narrow — it is just not empty, and none of it is invisible.

---

_Update this document in place as items clear. It is the honest counterweight to
[`BUILD-PLAN.md`](BUILD-PLAN.md), which tracks what is being built; this tracks
what is actually true._
