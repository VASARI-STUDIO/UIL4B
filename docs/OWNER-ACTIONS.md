# UIL4B — Owner Actions

Only actions that require the founder's dashboard access, credentials, real
accounts/cards or explicit Human Validation Zone authority belong here.
Engineering work belongs in `src/data/pipeline.js`; ideas awaiting a founder
verdict belong in [`PROPOSALS.md`](PROPOSALS.md), and decisions already made are
recorded in [`CHANGELOG.md`](../CHANGELOG.md).

_Last reviewed: 2026-08-07._

## Confirmed complete

- **`firestore.rules` published** — the founder has confirmed this. The
  privilege-escalation publication blocker is **closed**; do not re-open it.
- **Production OpenRouter key set and redeployed** — founder statement in
  conversation with the Director, 2026-08-07: "openrouter key is updated and
  redeployed". The owner action is closed. This records the **key**, not the
  route: no production request has been verified through the OpenRouter path,
  and a wrong or rate-limited key fails over to Gemini silently, so the app
  would look healthy while the primary provider is dead. That verification is
  queued as `openrouter-path-verification` in `src/data/pipeline.js`, and the
  P1 row below is the procedure — **note that the AI diagnostic cannot close
  it**, because it reports key presence, which is the fact already recorded
  here. Only the `provider` field on a real generation can.

Those confirmations cover the Firestore rules publication and the OpenRouter
credential, and nothing else. They do **not** confirm Storage activation or
`storage.rules`, the admin custom claim, analytics accuracy, a working OpenRouter
generation, or any production payment/auth flow. Those are all still open below.

## The three actions currently blocking engineering

These are the items the engineering queue (`src/data/pipeline.js`) records as
`blocked` on the founder — nothing can move on them without dashboard access:

1. **Stripe retention / cancellation configuration** — the `RETAIN50` coupon and
   the portal cancellation flow (P1 row below).
2. **Live Stripe checkout QA** — complete, abandon, return and retry against
   production (Manual release checks below).
3. **Firebase off the public critical path** — needs an approved auth-loading
   design and owner validation before Firebase initialisation or authenticated
   routing changes.

## Unresolved actions

| Priority | Check before changing | Action / done condition |
|---|---|---|
| P0 | Stripe webhook endpoint event list | Subscribe `/api/stripe-webhook` to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, all three `charge.dispute.*` events, subscription create/update/delete, invoice paid/failed and trial-will-end. Send representative test events and confirm HTTP 200 before creating a lifetime price. |
| P0 | Admin → Feedback now that the Firestore rules are published | Verify the panel can read feedback. The rules require `request.auth.token.admin == true`; no code in `api/` or `src/` sets that custom claim, so do not assume it exists. If it returns `permission-denied`, either set the claim through a controlled Admin SDK action or approve moving the read behind a server-admin route. |
| P0 | Firebase Console → Storage | Enable Storage and publish `storage.rules` for the approved Firebase community architecture. Verify an authenticated user can write only under `community-media/{uid}/` and public reads behave as intended. |
| P1 | `https://uil4b.com/api/ai` — the OpenRouter path | **READ THIS BEFORE RUNNING IT: `?diag=1` still cannot tell you OpenRouter is *available*, and an older version of this row asked you to confirm exactly that.** The key rows report PRESENCE and length — `openrouterKey: "set (73 chars)"` — which is the fact already confirmed on 2026-08-07, and which is also what a wrong, revoked or rate-limited key looks like. **What proves the route is what the key DID.** There are now three ways to see that, and you no longer need devtools for any of them. **(1) Fastest — generate one prompt.** Sign in, open the AI Image Prompt Generator, generate a prompt, and read the badge on the result card. **OpenRouter** = PASS, the primary provider is live; record the date here and close the item. **Gemini · fallback** = FAIL, and note that the prompt you are looking at is perfectly good — that is the defect, not a glitch. Same badge on the AI Landing Page Prompts tool. **(2) Across all users — Admin → Overview → AI provider health.** Seven days of counts and a plain verdict: how many generations OpenRouter served, how many it failed, how many the Gemini fallback picked up, when the last failover was and with what HTTP status. **“No generations to judge by” is not a pass** — it means nothing has exercised the path; generate one prompt and reload. **(3) Raw — the same numbers on `?diag=1` under `providerHealth`,** for when you want the JSON. It requires a Firebase ID token from a verified admin email and answers **404** to a plain browser visit. Break-glass for a broken Firebase credential: set `DIAG_CODE` in Vercel and call `?diag=<that value>`. It has **no default** — unset means the break-glass does not exist. **Reading a failure.** The underlying field is unchanged: a generation response carries `provider: "openrouter"` or `provider: "gemini"`, and the badge is that field rendered. 401/403 means the key is wrong or revoked, 429 means rate-limited or out of credit, any 5xx is an OpenRouter outage. HTTP 502 “AI provider rejected the API key” means BOTH providers are down; HTTP 500 “AI is not configured” means neither key is set. **Do not substitute “I checked that it works” for any of the three.** It works either way — that is the whole defect. |
| P1 | Stripe customer metadata | For each legacy paying customer, confirm `metadata.firebaseUid` exists. Back-fill only genuinely missing metadata; investigate—do not overwrite—a mismatched uid. |
| P1 | Firebase login email | Confirm `dylanjacob1100@gmail.com` is the founder login used by the admin/server allowlists. If it is wrong, authorize one coordinated HVZ change rather than editing a single copy. |
| P0 | Stripe Dashboard → Prices for **UIL4B Pro** | Create or confirm live prices at the approved ladder — **$7 monthly · $18 quarterly · $48 yearly** (decision 2 of 2026-08-20, recorded in `CHANGELOG.md`) — so the amounts charged match the amounts displayed. **Yearly is a price RISE, $39.99 → $48**, and was flagged as such before approval; decide what happens to existing yearly subscribers before publishing. Until this is done the repo only holds the *display fallback*: `api/_lib/pricing.js` and `src/config/planLadder.js` now both quote $7/$18/$48, while Stripe still charges whatever its price objects say. Quarterly additionally needs `recurring.interval_count: 3` (`INTERVAL_COUNTS` in `api/_lib/pricing.js`), a `PRICE_ENV_KEYS` entry, a `BILLING_INTERVALS` entry and a `src/pages/Checkout.jsx` case before it can be sold — `tests/unit/price-ladder.test.js` guards all four. Done condition: `/api/get-prices` reports `source: "live"` for monthly and yearly at the ladder amounts. |
| P1 | Live Stripe product/prices and Vercel price env vars | Decide whether the lifetime price should now be created (the ladder itself is settled — see the P0 row above). One-off billing code is shipped; create/advertise the lifetime price only after the webhook pre-flight above passes. |
| P1 | Stripe Customer Portal | Create/confirm the `RETAIN50` coupon (50% for 3 months), enable cancellation and select the retention offer. |
| P2 | Vercel — `RESEND_API_KEY` and `SUPPORT_NOTIFY_EMAIL` | **This one env pair now buys two things, and the second is the only push alert this deployment can have.** (a) Email notification of feedback/support submissions, as before. (b) An email the FIRST time OpenRouter fails on any given day — sent at most once per day, naming the HTTP status and whether the Gemini fallback covered it or prompt generation is down outright. The code is shipped and conditional: with these two unset it is silence, not an error. **The decision that is yours:** without them, a failover is durably counted but nothing comes and finds you — you learn about it the next time you open Admin → Overview. With them, you are told. There is no third option that does not add a paid monitoring dependency, which is out of scope by standing instruction. Set both, redeploy, submit test feedback and confirm one notification arrives; the AI alert then works off the same channel. `Admin → Overview → AI provider health` states which mode you are in on its last line. |
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

None of the checks in this section have been run. Record the result next to each
one when it is — an unticked line means "not attempted", never "passed quietly".

## Current environment reference

**Client/public:** `VITE_FIREBASE_*`, `VITE_GOOGLE_CLIENT_ID`,
`VITE_STRIPE_PUBLISHABLE_KEY`, optional `VITE_GOOGLE_FONTS_API_KEY`.

**Server/private:** `FIREBASE_SERVICE_ACCOUNT_KEY`, `GEMINI_API_KEY`,
`OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, price ids, and optional retention/support integration
variables. Never paste secret values into this repository.
