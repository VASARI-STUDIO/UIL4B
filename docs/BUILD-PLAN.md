# UIL4B — Build Plan (hub)

_The **read-first** doc: current direction + a live status snapshot, with the
detail split out so a session reads only the slice it needs. Update the snapshot
**in place** — no dated copies, no parallel backlog._

_Last updated: 2026-07-29 · current `main`: `4add069`._

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

## Status snapshot (2026-07-29)

**Release-branch health:** production build green · ESLint 0 errors. Advisory
warnings remain a separately tracked baseline; do not add new ones.

**Live on `main`:** **v2.7 shipped at `1e7fbdd`.** It includes the premium
public shell; refined Palette, Gradient, Tint and Semantic workflows; the
resilient Icon + Emoji library command surface; shared CTA/footer patterns; the
retired UI Colour redirect; and the founder's accessible public owner treatment.
The homepage bridge in `1e7fbdd` connects the hero controls to the real living
workspace preview rather than presenting a detached mock-up.

`d210a0d` also shipped the reconciled public router/navigation/metadata/sitemap
contract and the static social-share card. Their release verification passed
**79/79**; neither remains an active backlog item.

**Since then, on `main`:** the homepage chaos → calm hero and live mini-workbench
(#185) with its converter hand-off fix (#187); **CI quality gates on every pull
request** (#188, flake removed in #189) running lint, build, unit, Firestore
rules and the Playwright user-simulation suite; and the founder-reported colour
defect run — non-compounding adjust sliders and correct antipode warming (#190),
the height-capped gradient inspector (#191), a Saturation slider that responds
across its whole range (#192) and right-click-to-insert-N-colours on the
between-colours plus (#193).

The broader rebuild remains live: Create/Discover/Learn mega-menus, public
`/plans`, visual `/sitemap`, live Stripe-backed price display, Settings, account
and Admin surfaces. `/color` is the colour-system landing; its five live tools
remain scoped to `/color/*`. Discover is intentionally partial: Gradient Gallery
is live and the wider gallery workstream is queued at 20%. Learn remains a
coming-soon shell; dormant article files are not treated as published content.

**Active approved batch: V1 readiness.** Polish first, then review. In flight:
one **page-gutter scale** and one **z-index ladder** replacing ad-hoc padding and
stacking values (which fixed the toolbar shifting on hover), plus the Palette
Builder popover-stacking and 961–999px toolbar-break fixes. Queued behind it: a
**motion pass** (canonical easing/duration tokens; icon-button reveals move off
`max-width` onto `grid-template-columns`), **Palette Builder preview mockups**
(six realistic scenes per tab, extras Pro-gated and visibly locked), and
**Typography** — `FontGallery`, `FontMatcher` and `TypeScale` rebuilt on the
current design system as three standalone tools and routed. Then the readiness
review: QA, code, security, SEO and analytics passes, a rewritten owner checklist
and an honest go/no-go per surface.

The homepage [chaos → calm experience](build-plan/HOMEPAGE-CHAOS-TO-CALM.md)
shipped in #185 and is no longer an active batch; its remaining open item is the
throttled field-metrics trace (LCP/CLS/INP, 200% zoom, forced colours).

**Still open from earlier batches:** account-switch reliability shipped in #183
but still needs one manual founder pass against the real Google OAuth popup, and
the Plans/lifetime-billing build (#184) remains inside its human-validation zone
— **not** claimed complete: the entitlement fix only takes effect once the
founder **publishes** `firestore.rules`. The remaining queue starts with
account-menu keyboard completion, global 404/offline states and the server-side
account-deletion cascade. Discover
and Learn remain separate queued workstreams. Font Gallery FOUT and
accessibility are deferred until that route is activated. Owner/HVZ blocks
(OpenRouter key, Stripe retention and live checkout QA, Firebase critical-path
changes) stay explicit in the pipeline and owner list.

**Known bugs & deferred backlog** → [`build-plan/roadmap.md`](build-plan/roadmap.md).

---

## The map (read only what you need)

| Read this | When |
|---|---|
| **this hub** | every session — direction + what's live + what's next |
| [`build-plan/HOMEPAGE-CHAOS-TO-CALM.md`](build-plan/HOMEPAGE-CHAOS-TO-CALM.md) | touching the homepage hero/workbench — the shipped acceptance contract |
| [`build-plan/tool-tree.md`](build-plan/tool-tree.md) | building/placing a tool or touching nav — the CREATE/DISCOVER/LEARN tree, site structure, reusable-code inventory, the 12-function cap |
| [`build-plan/roadmap.md`](build-plan/roadmap.md) | needing history/what's-next — rebuild detail, phases, the cluster A–G log, known bugs, deferred backlog |
| [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md) | anything the founder must do (Stripe prices, keys, infra) |
| [`DECISIONS-NEEDED.md`](DECISIONS-NEEDED.md) | founder calls not already in an active HVZ build: free caps, community architecture and SEO prerender |

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
