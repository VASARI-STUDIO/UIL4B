# UIL4B — Owner Actions

Only actions that require the founder's dashboard access, credentials, real
accounts/cards or explicit Human Validation Zone authority belong here.
Engineering work belongs in `src/data/pipeline.js`; product calls belong in
[`DECISIONS-NEEDED.md`](DECISIONS-NEEDED.md).

_Last reviewed: 2026-07-31._

## Confirmed complete

- **`firestore.rules` published** — founder-confirmed 2026-07-31. Do not re-open
  the old publication blocker.

This confirms only the Firestore rules publication. It does **not** confirm
Storage activation/rules, custom claims, analytics accuracy or production
payment/auth flows.

## Unresolved actions

| Priority | Check before changing | Action / done condition |
|---|---|---|
| P0 | Stripe webhook endpoint event list | Subscribe `/api/stripe-webhook` to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, all three `charge.dispute.*` events, subscription create/update/delete, invoice paid/failed and trial-will-end. Send representative test events and confirm HTTP 200 before creating a lifetime price. |
| P0 | Admin → Feedback after the Firestore rules publish | Verify the panel can read feedback. The rules require `request.auth.token.admin == true`; do not assume the custom claim exists. If it returns `permission-denied`, either set the claim through a controlled Admin SDK action or approve moving the read behind a server-admin route. |
| P0 | Firebase Console → Storage | Enable Storage and publish `storage.rules` for the approved Firebase community architecture. Verify an authenticated user can write only under `community-media/{uid}/` and public reads behave as intended. |
| P1 | `https://uil4b.com/api/ai?diag=uil4b-dev-2026` | Add `OPENROUTER_API_KEY` to Production if it still reports missing, redeploy and confirm OpenRouter is available while Gemini remains the fallback. |
| P1 | Stripe customer metadata | For each legacy paying customer, confirm `metadata.firebaseUid` exists. Back-fill only genuinely missing metadata; investigate—do not overwrite—a mismatched uid. |
| P1 | Firebase login email | Confirm `dylanjacob1100@gmail.com` is the founder login used by the admin/server allowlists. If it is wrong, authorize one coordinated HVZ change rather than editing a single copy. |
| P1 | Live Stripe product/prices and Vercel price env vars | Confirm the intended monthly/yearly ladder and whether the lifetime price should now be created. One-off billing code is shipped; create/advertise the lifetime price only after the webhook pre-flight above passes. |
| P1 | Stripe Customer Portal | Create/confirm the `RETAIN50` coupon (50% for 3 months), enable cancellation and select the retention offer. |
| P2 | Vercel feedback/support environment variables | If email notification is wanted, set both `RESEND_API_KEY` and `SUPPORT_NOTIFY_EMAIL`, redeploy, submit test feedback and confirm one notification arrives. This integration is for feedback/support submissions—not billing events. |
| P2 | Google Cloud credential restrictions | Restrict the public Google Fonts key to the UIL4B/preview referrers and the Web Fonts API. |

## Manual release checks

These require real external accounts or production dashboards:

- Switch between two real Google accounts and confirm the old session remains
  intact until the new credential commits.
- With live Firebase, exercise fresh email/Google signup, returning login,
  onboarding abandon then `/home` and a deep link, resume-target consumption,
  and every finish/skip exit. These paths have not received a complete live pass.
- Complete, abandon, return to and retry a live Stripe checkout; confirm UIL4B
  and Stripe converge in each case.
- Inspect Google Search Console for real indexation after #198, then repeat after
  prerendering ships.
- Exercise the Admin Feedback panel and aggregate analytics with the published
  Firestore rules; record whether the custom claim and totals are correct.

## Current environment reference

**Client/public:** `VITE_FIREBASE_*`, `VITE_GOOGLE_CLIENT_ID`,
`VITE_STRIPE_PUBLISHABLE_KEY`, optional `VITE_GOOGLE_FONTS_API_KEY`.

**Server/private:** `FIREBASE_SERVICE_ACCOUNT_KEY`, `GEMINI_API_KEY`,
`OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, price ids, and optional retention/support integration
variables. Never paste secret values into this repository.
