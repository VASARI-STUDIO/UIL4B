# UIL4B — Build Plan (hub)

_The **read-first** doc: current direction + a live status snapshot, with the
detail split out so a session reads only the slice it needs. Update the snapshot
**in place** — no dated copies, no parallel backlog._

_Last updated: 2026-07-25._

---

## The direction (founder, 2026-07-02)

Full ground-up rebuild in a fresh design direction. We **keep the work
environment** (APIs, Auth, Stripe, Firebase — all already wired) and **reuse tool
components**, but **remove all prior design styling** and start from a clean
canvas. Look inherited from the **Mobbin** homepage (sales-page structure) + a
**Coolors-style** tools footer (mega-menu pattern), light mode, Awwwards-grade
micro-animations throughout. **Three surfaces, three nav dropdowns:** **Create**
(build) · **Discover** (browse) · **Learn** (understand). Dashboard is removed;
Home is a sales page. Product principle throughout: **users must understand what
the app is ASAP — confused shoppers have empty carts.**

Full rebuild detail (the two "not-ready" systems, phases, cluster-by-cluster log)
→ [`build-plan/roadmap.md`](build-plan/roadmap.md).

---

## Status snapshot (2026-07-25)

**Release-branch health:** production build green · ESLint 0 errors. Advisory
warnings remain a separately tracked baseline; do not add new ones.

**Live on `main`:** the rebuild is shipped. Mega-menu nav (Create/Discover/Learn,
"Soon" badges), Mobbin-style **living-preview** home, unified **Icon + Emoji**
library, reused Colour / Typography / Imagery / AI tool shells, **Discover +
Learn** sales pages (with the Brisbane world-map marker), **Settings** restyled
(Accessibility section, initials-on-gradient default avatar, city/country
autocomplete). That covers **Clusters A–C, E, F, G** and **Cluster D's safe
slice** (PRs #134–#145). Colour→Color first-paint flash fixed (#141). Curated
agent skills vendored + dead preview images removed (#142). Every price surface
(Landing, Settings, Onboarding, Checkout, HelpCentre) now reads live Stripe data
via `src/hooks/usePrices.js`, so the founder's price flip propagates to the whole
UI with zero code change (#145).

**July backlog — fully shipped to production (direct-to-`main`):** OpenRouter AI
migration; nav mega-menu column redesign; public **`/plans`** pricing page with
upgrade-CTA routing; three live Create tools wired (**Colour Studio** at `/color`,
**File Converter** + **Aspect Ratio** under Imagery); Icon/Emoji perf overhaul
(keep-alive tabs, collection cache, **My Icons** page); the nav-pill rework
(3-dots at rest, merged profile+settings popover, cog-on-hover avatar, wider
expanded state); and the full visual **`/sitemap`** page — every destination laid
out by surface, Create/Discover/Learn derived from `toolTree.js` so it can't drift
(distinct from the crawler-facing `public/sitemap.xml`). All build+lint+QA-gated.

**Active release — public UI quality (`release/premium-public-ui-refresh`):**

- Premium public shell: a connected-system home hero, task-led editorial
  mega-menus, distinct Icon Library glyph, shared beams-style closing CTA and a
  clearer public footer.
- Colour workflows: Gradient, Tint, Semantic and Palette refinements, including
  Palette Reset + Undo. The standalone **UI Colour** destination is removed from
  public IA; `/color/ui` safely redirects to `/color`.
- Library workflow: Icon + Emoji share one resilient command header with
  keyboard navigation, mobile composition, loading and offline feedback.
- Community identity: the founder's public handle is **Dylan Coleman 👑**, with a
  gold owner treatment that retains text/crown semantics.
- Release gate: build, lint, focused interaction tests, then desktop/mobile,
  keyboard, reduced-motion and slow-network review across all public pages.

**Next:** Discover-page build-out remains intentionally deferred until this
release is complete. Learn content, the Font Gallery FOUT and the owner-gated
Stripe/community-backend work stay in the live pipeline rather than duplicated
here.

**Known bugs & deferred backlog** → [`build-plan/roadmap.md`](build-plan/roadmap.md).

---

## The map (read only what you need)

| Read this | When |
|---|---|
| **this hub** | every session — direction + what's live + what's next |
| [`build-plan/tool-tree.md`](build-plan/tool-tree.md) | building/placing a tool or touching nav — the CREATE/DISCOVER/LEARN tree, site structure, reusable-code inventory, the 12-function cap |
| [`build-plan/roadmap.md`](build-plan/roadmap.md) | needing history/what's-next — rebuild detail, phases, the cluster A–G log, known bugs, deferred backlog |
| [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md) | anything the founder must do (Stripe prices, keys, infra) |
| [`DECISIONS-NEEDED.md`](DECISIONS-NEEDED.md) | founder-gated calls I reached but stopped before executing (free-tier number, typeface, auth/Stripe HVZ) — one-line answers unblock each |

**How work ships:** `research → design → engineer → code-review + security-review →
secret-scan → qa → ship`. One PR per slice → squash-merge to `main` → realign the
branch. The PM (main thread) never writes product code — it routes, runs the
verify gate, reads diffs, writes docs, and merges. Detail lives in the reference
docs, not here: [`project-manager.md`](reference/project-manager.md) ·
[`build-and-verify.md`](reference/build-and-verify.md) ·
[`git-workflow.md`](reference/git-workflow.md) ·
[`human-validation-zones.md`](reference/human-validation-zones.md).

_When state changes, update the snapshot above in place — it is the contract with
the next PM._
