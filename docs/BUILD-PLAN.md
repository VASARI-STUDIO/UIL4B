# UIL4B — Build Plan

_Read this first. It is the lean current-state hub: product direction, what is
live, and what is genuinely still open. Update it in place — do not create dated
copies or parallel backlogs._

_Last updated: 2026-08-05 · current `main`: `8f4e5ae` · shipped version: v2.8.0._

**This file does not restate facts it does not own.** Gate numbers live in
[`reference/build-and-verify.md`](reference/build-and-verify.md); founder
decisions in [`DECISIONS-NEEDED.md`](DECISIONS-NEEDED.md); owner-only console and
credential work in [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md); the engineering queue
in `src/data/pipeline.js`; shipped history in `CHANGELOG.md`. See the canonical
map at the bottom.

## Direction

UIL4B is the operating workspace for building connected UI systems. Keep the
working product infrastructure (Firebase, Stripe, AI providers and reusable tool
logic), while the interface follows one coherent light-first design language:
clear sales-page structure, continuous Create workbenches, restrained motion and
consistent controls. The three product surfaces remain:

- **Create** — build, validate and export.
- **Discover** — browse community systems and curated resources.
- **Learn** — understand the methods behind the tools.

The homepage is a sales page with a working mini-workspace, not a dashboard.
Users should understand what the product does immediately.

## Current state

**Shipped and healthy on `main`:** production build and the CI gates (#188,
#189); the premium public shell; the connected homepage workbench (#185) with
its Typography extension; Palette, Semantic, Tint, Gradient and Contrast tools;
Icon + Emoji; File Converter; Projects; Plans with one-off/lifetime billing
support and the entitlement security hardening (#184); converter hand-off (#187);
the founder-reported colour-tool defect run (#190–#193); dead-page removal
(#196); per-route canonical/social metadata and `noindex` for Soon routes (#198);
the shared motion-token scale (#199); v2.8 typography activation and UI System
Mode (#200); and the founder bug batch — slider lens, icon-button hover label,
gradient stop drag, mono randomise and gradient submissions (#202).

**v2.8 is released**, not a release candidate. The four approved slices
(typography activation, Palette/Tint consistency, high-fidelity previews, UI
System Mode) all merged in #200.

**Firestore rules:** the founder has confirmed the hardened `firestore.rules`
are published, so the privilege-escalation publication blocker is **closed**.
That confirmation covers the Firestore rules and nothing else — it does not show
that Firebase Storage is enabled, that `storage.rules` is published, that the
admin custom claim is set, or that any production-only Firebase path has been
exercised. Those remain open in [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md).

**Surface truth:** Create is the primary live surface. Discover is intentionally
partial — Gradient Gallery is live and the wider gallery/community build remains.
Learn remains an honest coming-soon surface until scoped content routes ship.

## What is genuinely still open

There is no approved feature batch in flight. Open work falls into three groups,
each owned by the document that tracks it:

1. **Founder-only console, credential and live-service checks** — including the
   four items currently `blocked` on the founder: the production OpenRouter key,
   Stripe retention/cancellation configuration, live Stripe checkout QA, and
   moving Firebase off the public critical path. Canonical list:
   [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md).
2. **One unresolved founder product decision** — the subscription-chargeback
   policy. Canonical: [`DECISIONS-NEEDED.md`](DECISIONS-NEEDED.md).
3. **The engineering queue** — hardening, accessibility, instrumentation and the
   large unbuilt items (Discover galleries, Learn content, the Firebase
   community backend, public-route prerender), plus the two known-unfixed bugs
   recorded there. Canonical: `src/data/pipeline.js` (`NEXT_TODO`).

Read those three sources for detail rather than a fourth copy here.

## Standing release rules

- Every slice passes the gate in
  [`reference/build-and-verify.md`](reference/build-and-verify.md) plus focused
  rendered verification before it is called complete.
- **No document may claim that an unrun check passed.** Production, custom-claim,
  Storage, live-payment and load/concurrency checks have not been run. Silence is
  not a pass; say "not run".
- Anything touching `/api`, auth, Stripe or user-generated content takes the
  security gate every time — see
  [`reference/human-validation-zones.md`](reference/human-validation-zones.md).

## Canonical map

Each fact has exactly one home. Point at it; do not copy it.

| Source | Owns |
|---|---|
| **This file** | current direction, what has shipped, and where open work is tracked |
| [`reference/build-and-verify.md`](reference/build-and-verify.md) | the verify gate **and every gate baseline number** |
| [`DECISIONS-NEEDED.md`](DECISIONS-NEEDED.md) | unresolved founder decisions plus the resolved-decision record |
| [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md) | unresolved founder-only console, credential and live-service checks |
| `src/data/pipeline.js` | execution order, workstream progress, blockers and known-unfixed bugs |
| `src/data/moduleBoard.js` | per-module product status |
| `CHANGELOG.md` | shipped release history |
| [`build-plan/tool-tree.md`](build-plan/tool-tree.md) | stable Create/Discover/Learn structure, routes and reusable-tool inventory |
| [`build-plan/HOMEPAGE-CHAOS-TO-CALM.md`](build-plan/HOMEPAGE-CHAOS-TO-CALM.md) | homepage workbench acceptance contract and remaining field-metrics checks |
| [`reference/architecture.md`](reference/architecture.md) | pages, contexts, components and the `/api` function budget |
| [`reference/positioning.md`](reference/positioning.md) | what UIL4B is and the three surfaces |

Git history is the archive; do not create parallel historical planning docs.
Delivery process and safety boundaries live in
[`reference/project-manager.md`](reference/project-manager.md),
[`reference/build-and-verify.md`](reference/build-and-verify.md),
[`reference/git-workflow.md`](reference/git-workflow.md) and
[`reference/human-validation-zones.md`](reference/human-validation-zones.md).
