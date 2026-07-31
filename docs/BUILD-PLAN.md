# UIL4B — Build Plan

_Read this first. It is the lean current-state hub: product direction, what is
live, what is being built, and what still blocks a confident release. Update it
in place—do not create dated copies or parallel backlogs._

_Last updated: 2026-07-31 · current `main`: `fe29f77`._

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

**Healthy on `main`:** production build and CI gates; the premium public shell;
the connected homepage workbench; Palette, Semantic, Tint, Gradient and Contrast
tools; Icon + Emoji; File Converter; Projects; Plans and one-off billing support;
per-route canonical/social metadata and `noindex` for Soon routes (#198); and the
shared motion-token pass (#199).

**Firestore rules:** the founder confirmed on 2026-07-31 that the hardened
`firestore.rules` are published. The former publication release blocker is
closed. This confirmation does **not** prove that Firebase Storage is enabled,
`storage.rules` is published, the admin custom claim is set, or every
production-only Firebase path has been exercised.

**Surface truth:** Create is the primary live surface. Discover is intentionally
partial—Gradient Gallery is live and the wider gallery/community build remains.
Learn remains an honest coming-soon surface until scoped content routes ship.

## Active approved batch

Work is sequenced as four connected slices:

1. **Typography activation + homepage integration**
   - Activate Font Gallery, Font Pair Finder and Type Scale on the current design
     system.
   - Add Typography as the fifth homepage mini-workspace tab.
   - Give the floating tabs meaningful icons, merge them into the workbench, then
     reveal the mini-workspace with a restrained splash animation.
   - Preserve loading/fallback font behaviour, keyboard operation and reduced
     motion.

2. **Palette/Tint consistency and defect pass**
   - Close the nav/toolbar/footer gutter gaps and keep toolbar height stable.
   - Make hover reveals smooth without layout shifts.
   - Ensure the initial random seed, HEX input and first swatch always match.
   - Unify swatch, input and button sizing; align Temperature with the other
     sliders and make slider tracks communicate their operation/default.
   - Repair HCT editing and explain HCT in-context.
   - Add directional swap choice, multi-insert context menu, Palette ↔ Tint
     navigation and consistent shells across every colour tool.
   - Move Contrast out of the command bar and into accessible swatch hover/focus
     actions.

3. **High-fidelity colour-system previews**
   - Replace placeholder preview tiles with realistic light/dark interface scenes.
   - Show buttons, alerts, forms, cards, text and backgrounds using the active
     system; extra scenes may be visibly Pro-gated.

4. **UI System Mode (premium)**
   - Generate Brand, Success, Warning, Error, Information and brand-tinted Neutral
     scales from 100–900, with the selected brand colour as 500.
   - Use a perceptual colour model (OKLCH/HCT/HSL—not direct HEX arithmetic) and
     keep lightness progression even.
   - Provide per-shade editing/copy, reset/regenerate, export, light/dark component
     previews, WCAG AA/AAA results and black/white text recommendations.
   - Free users may preview the generated system; editing/export remains the
     initial premium boundary. The boundary can move later without redesigning
     the feature.

Each slice must pass the build/lint gate and focused rendered verification before
it is called complete. `src/data/pipeline.js` owns the detailed execution queue;
`src/data/moduleBoard.js` owns per-module status.

## Founder decisions now resolved

| Decision | Current direction |
|---|---|
| Free save caps | **Keep 3 saved projects / 8 custom icons.** |
| Community architecture | **Firebase:** Firestore + Storage, transactional lowercased handle registry and moderation state. |
| Public SEO rendering | **Prerender public routes.** Define an explicit eligible-route matrix; Soon/auth/admin routes must not be emitted as public content. |
| Homepage typography | Add Typography as the fifth mini-workspace tab and activate its three tools. |
| UI System Mode | Build the functional premium mode now; allow a free generated preview with Pro editing/export. |

The only unresolved founder call is the subscription-chargeback policy in
[`DECISIONS-NEEDED.md`](DECISIONS-NEEDED.md).

## Release gaps and durable backlog

The published Firestore rules and #198 remove two former blockers. A final GO
still requires the current UI batch and a fresh combined QA/review pass. Keep
these gaps visible:

- add a dev/preview guard around Firestore aggregate analytics;
- instrument the canonical upgrade gate and activation events;
- reconcile onboarding completion truth: the one-shot in-memory new-account flag
  routes a fresh sign-up, but a user who abandons onboarding and later returns
  directly to `/home` or a deep link is not re-routed; `/` checks localStorage
  while profile hydration separately checks Firestore. Fresh/returning signup,
  resume-target and finish/skip exits still need live Firebase QA;
- complete account-menu arrow navigation, branded 404 and global offline states;
- move account deletion to a server-side cascade;
- make Stripe webhook processing idempotent and order-aware. Signatures are
  verified, but processed `event.id` values and event ordering are not persisted,
  so retries and older subscription events are not explicitly rejected;
- protect unauthenticated `/api/support` from automated cost abuse. It currently
  has no authentication, rate limit or bot challenge and one request can attempt
  a Firestore write, optional Sheets append and optional Resend email;
- build the Firebase community backend and publish/verify its Storage rules;
- implement the approved public-route prerender matrix;
- measure homepage LCP/CLS/INP on a throttled profile and test 200% zoom,
  forced colours and screen-reader flow;
- manually verify real Google account switching, live Stripe
  checkout/abandon/return/retry and actual Search Console indexation;
- complete Discover galleries and the Learn content library.

No document should claim that unrun production, custom-claim, Storage, payment or
load/concurrency checks passed.

## Canonical map

| Source | Owns |
|---|---|
| **This file** | current direction, active batch, resolved product calls and release gaps |
| [`build-plan/tool-tree.md`](build-plan/tool-tree.md) | stable Create/Discover/Learn structure, routes and reusable-tool inventory |
| [`build-plan/HOMEPAGE-CHAOS-TO-CALM.md`](build-plan/HOMEPAGE-CHAOS-TO-CALM.md) | homepage workbench acceptance contract and remaining field-metrics checks |
| [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md) | unresolved founder-only console, credential and live-service checks |
| [`DECISIONS-NEEDED.md`](DECISIONS-NEEDED.md) | unresolved founder decisions plus the compact resolved-decision record |
| `src/data/pipeline.js` | execution order, workstream progress and blockers |
| `src/data/moduleBoard.js` | per-module product status |

Delivery process and safety boundaries live in
[`reference/project-manager.md`](reference/project-manager.md),
[`reference/build-and-verify.md`](reference/build-and-verify.md),
[`reference/git-workflow.md`](reference/git-workflow.md) and
[`reference/human-validation-zones.md`](reference/human-validation-zones.md).
