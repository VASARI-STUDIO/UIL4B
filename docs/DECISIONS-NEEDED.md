# UIL4B — Decisions Needed (founder-gated)

Only genuinely open product or architecture calls belong here. Owner-only
dashboard/configuration work lives in [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md);
execution order lives in `src/data/pipeline.js`.

_Last reviewed: 2026-07-28._

Resolved 2026-07-12 HVZ decisions and their security-review provenance are
preserved in
[`audit/HVZ-DECISIONS-2026-07-12.md`](audit/HVZ-DECISIONS-2026-07-12.md).

---

## 1. Confirm the free-tier cap numbers

Free currently enforces **3 saved projects / 8 custom icons** through
`FREE_SAVE_LIMITS`; `/plans` reads the same source.

**Reply:** `keep` · or `caps <projects>/<icons>`.

## 2. Choose the community publishing architecture

The local-first Community surface works, but durable media, moderation,
cross-device submissions and palette-handle uniqueness need one backend
decision. Choose:

- `local-first` — keep public seed/local submissions and defer durable publishing;
- `firebase` — Firestore + Storage, with a transactional lowercased handle
  registry and moderation state;
- `separate-backend` — define the service before more Community features ship.

**Reply:** `community local-first` · `community firebase` · or
`community separate-backend`.

## 3. Decide whether to prerender public SEO routes

UIL4B remains a client-rendered Vite SPA. Prerendering improves crawlable route
content but changes the build/deploy architecture and must define which public
tool, Discover and Learn routes are eligible.

**Reply:** `prerender yes` · `prerender defer` · or `prerender no`.

## 4. Set the lifetime tier direction

No lifetime price or entitlement exists. Shipping it requires one-time Stripe
checkout, webhook persistence and plan resolution; creating a dashboard price
before that work would let a customer pay without receiving Pro.

**Reply:** `lifetime build` · `lifetime defer` · or `lifetime remove`.
