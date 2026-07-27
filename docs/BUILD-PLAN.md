# UIL4B — Build Plan (hub)

_The **read-first** doc: current direction + a live status snapshot, with the
detail split out so a session reads only the slice it needs. Update the snapshot
**in place** — no dated copies, no parallel backlog._

_Last updated: 2026-07-28 · current `main`: `1e7fbdd`._

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

## Status snapshot (2026-07-28)

**Release-branch health:** production build green · ESLint 0 errors. Advisory
warnings remain a separately tracked baseline; do not add new ones.

**Live on `main` (`1e7fbdd`):** **v2.7 is shipped.** It includes the premium
public shell; refined Palette, Gradient, Tint and Semantic workflows; the
resilient Icon + Emoji library command surface; shared CTA/footer patterns; the
retired UI Colour redirect; and the founder's accessible public owner treatment.
The homepage bridge in `1e7fbdd` connects the hero controls to the real living
workspace preview rather than presenting a detached mock-up.

The broader rebuild remains live: Create/Discover/Learn mega-menus, public
`/plans`, visual `/sitemap`, live Stripe-backed price display, Settings, account
and Admin surfaces. `/color` is the colour-system landing; its five live tools
remain scoped to `/color/*`. Discover is intentionally partial: Gradient Gallery
is live and the wider gallery workstream is queued at 20%. Learn remains a
coming-soon shell; dormant article files are not treated as published content.

**Next queue:** canonical public-route, metadata and sitemap truth is P0, followed
by the static OG card, account-menu keyboard completion and global 404/offline
states. Discover and Learn remain separate queued workstreams. Font Gallery FOUT
and accessibility are deferred until that route is activated. Owner/HVZ blocks
(OpenRouter key, Stripe retention and live checkout QA, Firebase critical-path
changes) stay explicit in the pipeline and owner list.

**Known bugs & deferred backlog** → [`build-plan/roadmap.md`](build-plan/roadmap.md).

---

## The map (read only what you need)

| Read this | When |
|---|---|
| **this hub** | every session — direction + what's live + what's next |
| [`build-plan/tool-tree.md`](build-plan/tool-tree.md) | building/placing a tool or touching nav — the CREATE/DISCOVER/LEARN tree, site structure, reusable-code inventory, the 12-function cap |
| [`build-plan/roadmap.md`](build-plan/roadmap.md) | needing history/what's-next — rebuild detail, phases, the cluster A–G log, known bugs, deferred backlog |
| [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md) | anything the founder must do (Stripe prices, keys, infra) |
| [`DECISIONS-NEEDED.md`](DECISIONS-NEEDED.md) | genuinely open founder calls: free caps, community architecture, SEO prerender and lifetime tier direction |

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
