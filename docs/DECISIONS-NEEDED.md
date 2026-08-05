# UIL4B — Decisions Needed

**This is the canonical record of founder product/security decisions** — both the
open one and the resolved ones. No other document should carry its own copy of
the resolved table; link here. Console and credential work lives in
[`OWNER-ACTIONS.md`](OWNER-ACTIONS.md); execution lives in `src/data/pipeline.js`.

_Last reviewed: 2026-08-05._

A row only belongs in **Resolved** when the decision is actually recorded — in
this table, a commit message, or a PR. Do not add a decision you cannot point at.

## Open — subscription chargeback policy

The current refund/dispute revocation path in `api/stripe-webhook.js` is keyed to
the one-off `lifetimeEntitlement.paymentIntentId`. A reversed subscription charge
does not use that lifetime record, so it can leave the yearly subscription
entitlement active.

Choose one:

- **Fix** — approve an HVZ engineering slice that gives subscription payments a
  reliable user link and revokes/cancels access when a subscription payment is
  refunded or charged back.
- **Accept** — explicitly accept the exposure for V1 and monitor it operationally.

## Resolved

| Date | Decision | Resolution |
|---|---|---|
| 2026-07-31 | Free-tier caps | **Keep** 3 saved projects / 8 custom icons. |
| 2026-07-31 | Community publishing architecture | **Firebase**: Firestore + Storage, transactional lowercased handle registry and moderation state. |
| 2026-07-31 | Public SEO rendering | **Prerender yes**: prerender eligible public routes; exclude Soon, auth and admin routes. |
| 2026-07-31 | Homepage typography | Add Typography as the fifth mini-workspace tab and activate Font Gallery, Font Pair Finder and Type Scale. |
| 2026-07-31 | UI System Mode | Build the functional premium mode now; free users may preview generated output while editing/export stays Pro initially. |
| 2026-07-28 | Lifetime tier | Build and ship one-off billing support; owner still controls creation/activation of the live Stripe price. |
