# UIL4B — Owner Action List

Everything that **only you** can do — console, dashboard, credential and
judgement calls that no pull request can close. Ordered by what blocks the V1
release first.

_Last reviewed 2026-07-29 · verified against `main` @ `b8aabb6`._

> **How to read this:** each item states the *check* before the *change*, so you
> never repeat a completed dashboard action. Anything marked **🔴 V1 BLOCKER**
> must be done before you call the product released; 🟠 items are strongly
> recommended before launch; 🟡 items can follow.
>
> **Reachability (2026-07-28):** the production AI diagnostic answered and
> confirmed Firebase Admin credentials and Gemini are healthy.

---

## The V1 blocker list, in order

| # | Action | Why it blocks | Time |
|---|---|---|---|
| **1** | **Publish `firestore.rules`** | A live privilege-escalation hole is open in production right now. Merging code did **not** close it. | 3 min |
| **2** | **Subscribe the Stripe webhook to the dispute + async-payment events** | Chargebacks and delayed payments are unhandled. Must be done *before* any lifetime price exists. | 10 min |
| **3** | **Decide the subscription-chargeback gap** (§3) | A yearly subscriber can charge back and keep 12 months of Pro. Needs your call: fix or accept. | decision |
| **4** | **Publish `storage.rules`** + enable Storage | Community media falls back to a ~900 KB base64 path until this is on. | 5 min |
| **5** | **Add `OPENROUTER_API_KEY` to Production** | The intended primary AI provider is absent; Gemini is carrying the whole AI path alone. | 3 min |
| **6** | **Back-fill `firebaseUid` on legacy Stripe customers** | Affected customers get a 403 on the billing portal and cannot manage their own subscription. | 10 min |
| **7** | **Confirm `dylanjacob1100@gmail.com` is your Firebase login email** | It is hardcoded in four places as the owner gate. Wrong email = you lock yourself out. | 1 min |

Everything below §7 is polish, hardening or already-handled context.

---

## 🔴 1. Publish `firestore.rules` — CLOSES A LIVE PRIVILEGE-ESCALATION HOLE

**This is the single most important item in this document.**

**The hole, concretely.** The rules *currently published* in your Firebase
project let any signed-in user write **any** field to their own
`users/{uid}` document. That includes `lifetimeEntitlement`, `subscription` and
`stripeCustomerId` — the exact fields the server reads to decide whether someone
is Pro (`api/_lib/plans.js → planForUser`). Anyone who can open devtools can run
one `setDoc(..., { lifetimeEntitlement: { active: true, revokedAt: null } }, { merge: true })`
and hand themselves Pro: 1,000 AI actions/day instead of 40, billed to you.

**The repo's `firestore.rules` blocks those fields on create and on update, and
24 emulator tests pin that behaviour. But rules do not deploy with code.** No
merge, no Vercel deploy and no future pull request will close this. Only this
publish does.

**Do it:**

1. Firebase Console → **Firestore Database → Rules** → paste the contents of
   **`firestore.rules`** (repo root) → **Publish**.
2. Sanity check: sign in, change your display name in **Settings** — it should
   save normally with no warning banner. Rules are versioned in the console, so
   this is one-click reversible.

**⚠ Expect one thing to break — this is correct, not a rollback trigger.**
The rules gate `feedback` reads on a Firebase **custom claim**
(`request.auth.token.admin == true`, `firestore.rules:53` and `:63`). That claim
is **never set anywhere in this codebase** — there is no `setCustomUserClaims`
call in `api/` or `src/`. So after publishing, the Admin dashboard's feedback
panel (`src/pages/Admin.jsx:1247`, a client-side `getDocs(collection(db,'feedback'))`)
will return `permission-denied` and show empty.

That is fail-*closed* and safe — it denies you, not the public. Two ways out,
your choice:

- **Accept for V1.** Read feedback in the Firebase console directly. Nothing
  user-facing is affected.
- **Fix properly (engineering slice, not yet built).** Either set the `admin`
  custom claim on your uid once via the Admin SDK, or move the feedback read
  behind the existing admin-gated `/api/verify-admin` server path the way the
  Users tab already works. Tell me which and I'll queue it.

The Admin **Users tab** and the aggregate-analytics panel are unaffected: Users
reads through the server's Admin SDK, and `analytics-daily` is gated by email
(`firestore.rules:73`), not by the claim.

---

## 🔴 2. Stripe webhook events — configure BEFORE any lifetime price

**Do this before you create a lifetime price. Not after. Not at the same time.**
A one-off purchase has no subscription object behind it, so these webhook events
are the *only* things that grant and remove access. If the endpoint isn't
subscribed when the first purchase lands, the buyer pays and gets nothing — or a
refund silently leaves them with permanent Pro.

Stripe Dashboard → **Developers → Webhooks → your `/api/stripe-webhook`
endpoint → Update details → Select events.** Every row must be subscribed:

| Event | What breaks without it |
|---|---|
| `checkout.session.completed` | No access is ever granted. |
| `checkout.session.async_payment_succeeded` | **Delayed payment methods** (bank debits, some wallets) never grant. The buyer pays and stays on Free. |
| `charge.refunded` | A refunded buyer keeps Pro forever. |
| `charge.dispute.created` | A chargeback keeps Pro forever. Stripe does **not** send `charge.refunded` for disputes. |
| `charge.dispute.funds_withdrawn` | Access survives the money actually leaving your account. |
| `charge.dispute.closed` | A dispute you *win* never restores the buyer's access. |
| `customer.subscription.created` / `.updated` / `.deleted` | Subscription plan state stops tracking Stripe. |
| `invoice.payment_failed` / `invoice.paid` | The "payment failed" banner never appears or never clears. |
| `customer.subscription.trial_will_end` | No trial-ending notice. |

**Verify (2 min):** on the endpoint page use **Send test event** for
`checkout.session.async_payment_succeeded` and `charge.dispute.created`, then
confirm each logs a **200**. A `400 Invalid signature` means
`STRIPE_WEBHOOK_SECRET` in Vercel doesn't match this endpoint's signing secret —
fix that before selling anything.

### What a refund actually does to access (support needs this)

`api/stripe-webhook.js` revokes on a **full** refund only — the check is
`amount_refunded >= amount`:

- **Full refund → Pro is removed.** The customer drops to Free.
- **Partial / goodwill refund → Pro stays active.** Refunding half the one-off
  price as a gesture does **not** take access away. Deliberate, but it means
  *"refund them a bit to say sorry"* costs you the whole entitlement. If the
  intent is to end the sale, refund **in full**.
- **Refunding to settle a chargeback is final.** Once refunded, the entitlement
  stays revoked even if the dispute later closes in your favour. Restoring is
  manual. Look for `won dispute did NOT restore access` in the Vercel logs.
- **Re-granting is never automatic.** A refunded session can't re-grant on a
  webhook re-delivery; only a genuine new purchase restores access.

---

## 🔴 3. DECISION NEEDED — a subscription chargeback does not revoke Pro

Found in this session's security review. **This is a real money-loss path and it
is inside a human-validation zone, so I have not touched it.**

**What happens.** `api/stripe-webhook.js:183` reads:

```js
if (!entitlement || entitlement.paymentIntentId !== paymentIntentId) return false
```

`entitlement` here is the **lifetime** entitlement only. So when a *subscription*
charge is refunded or charged back, the handler finds no matching lifetime
entitlement and returns `false` — silently, with no log line (the `console.error`
calls at `:167` and `:172` are upstream of this branch). A customer who pays for
a year and then charges back keeps 12 months of Pro.

It compounds: subscription PaymentIntents carry no `firebaseUid` at all, because
`api/create-checkout.js:132-136` only stamps that metadata on the lifetime
branch. So even a correct handler would struggle to find the user.

**Your call, one of:**

- **(a) Fix it** — I'll scope an engineering slice: stamp `firebaseUid` on
  subscription PaymentIntents too, and make the dispute/refund handler resolve
  and cancel the subscription entitlement. This is an HVZ change and needs your
  explicit go-ahead.
- **(b) Accept it in writing** — reasonable if subscription chargeback volume is
  near zero at your price point (A$4.99/mo). If you accept, say so and I'll
  record it in `DECISIONS-NEEDED.md` so the next reviewer doesn't re-raise it.

Three lower-severity findings from the same review are recorded, not urgent, and
worth knowing:

- **No `event.id` dedupe or ordering guard.** A retried
  `subscription.updated` can resurrect `active` after a `subscription.deleted`.
- **Every failure branch returns `200`**, so Stripe never retries a lost grant.
  Partially mitigated by the reconciliation in `api/checkout-status.js:82-105`.
- **`/api/support` has no auth, rate limit or captcha** — each call writes
  Firestore, POSTs a Sheets webhook and sends a Resend email. `firestore.rules:51`
  (`allow create: if true` on `feedback`) permits the same unauthenticated. This
  is an abuse/cost exposure, not an injection one; output is escaped.

---

## 🟠 4. Firebase Storage — activate community media uploads

Community prompt media uploads to Firebase Storage instead of the old ~900 KB
base64 cap. It falls back gracefully until Storage is on, so nothing is broken —
but the real backend needs two clicks:

1. Firebase Console → **Build → Storage → Get started** (the bucket
   `uil4b-357c5.firebasestorage.app` is already in config).
2. Firebase Console → **Storage → Rules** → paste the contents of
   **`storage.rules`** (repo root) → **Publish**. (Public read; authenticated
   users write only under their own `community-media/{uid}/` path; 25 MB cap.)

---

## 🟠 5. Add the missing OpenRouter primary key

**▶ Check first (30 sec):** open `https://uil4b.com/api/ai?diag=uil4b-dev-2026`.

**Verified production state (2026-07-28):**

| Env/config | Status | Verdict |
|---|---|---|
| Firebase Admin credential | **healthy** | ✅ token verification works |
| `GEMINI_API_KEY` | **set** | ✅ production AI fallback is available |
| `OPENROUTER_API_KEY` | **MISSING** | ❌ intended primary provider is unavailable |

AI is operational through Gemini — this is provider completion, not an outage,
but it means a single provider outage takes the whole AI surface down.

**Fix (≈3 min):**

1. Create/copy a key at <https://openrouter.ai/keys>.
2. Vercel → add `OPENROUTER_API_KEY=sk-or-…` to **Production** (and Preview if
   previews should exercise the primary provider). No surrounding quotes.
3. Optional: set `OPENROUTER_MODEL`; otherwise the code uses
   `deepseek/deepseek-chat`.
4. Redeploy, rerun the diagnostic. OpenRouter should report `set (… chars)`.

---

## 🟠 6. Back-fill `firebaseUid` on legacy Stripe customers

`/api/create-portal` refuses to open a billing portal unless the Stripe
customer's own `metadata.firebaseUid` matches the signed-in user — the Firestore
`stripeCustomerId` was client-writable until the rules fix, so it is no longer
accepted as proof on its own. Customers this app created always carry the
metadata; one created **by hand in the Stripe dashboard** (or by an older build)
does not, and that user sees *"This billing account is not linked to your login"*.

**Check (10 min):** Stripe Dashboard → **Customers** → open each paying customer
→ confirm **Metadata** contains `firebaseUid`. Where missing, add the user's
Firebase uid (Admin dashboard → Users tab).

**⚠ The server log distinguishes two cases and they are not the same:**

| Log line | Meaning | Action |
|---|---|---|
| `cause: "missing_metadata"` | Legacy customer, never stamped | **Back-fill it.** |
| `cause: "uid_mismatch"` | Metadata exists but points at a *different* user | **Do NOT "fix" this by editing metadata.** This is the tampering signal. Investigate. |

**Also confirm these exist in Vercel** (checkout won't work without them; likely
already set): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `VITE_STRIPE_PUBLISHABLE_KEY`.
If prices aren't set, run `STRIPE_SECRET_KEY=sk_... npm run setup:stripe`.

---

## 🟠 7. Confirm the owner email

`dylanjacob1100@gmail.com` is hardcoded as the owner/admin gate in four places:

- `firestore.rules:73` — the `analytics-daily` aggregate read
- `api/verify-admin.js:3`
- `api/setup-stripe.js:8`
- `api/_lib/plans.js:49` — founder auto-Pro

**Confirm that is the email on your Firebase login account.** If it isn't, you
will lock yourself out of the Admin dashboard the moment you publish the rules
(§1). Tell me if it should change and I'll queue the edit — it touches HVZ files,
so it needs your instruction.

---

## 🟡 8. Pricing ladder & the lifetime price

**▶ Read live first (authoritative):** open the in-app **admin Stripe panel**
(`/admin` → Setup Stripe; it calls `GET /api/setup-stripe`, which expands live
`currency_options`) **and** check Vercel for `STRIPE_PRICE_MONTHLY` /
`STRIPE_PRICE_YEARLY`. Those two together are the truth of what's charged today.
Everything below is the **target** — no price changes until you save it in Stripe.

**What's live today (read-only Stripe check, 2026-07-09):**

- One product: **UIL4B Pro** (`prod_Uh3MFir6kwPWS3`); every plan hangs off it.
- Canonical prices resolve by **lookup key** (`uil4b_pro_monthly`,
  `uil4b_pro_yearly`), base currency **USD**, others attached as
  `currency_options`. Live base amounts: **US$4.99/mo** (`price_1ThfmX…`) and
  **US$39.99/yr** (`price_1ThfmY…`).
- ⚠ **Checkout can override the lookup key.** `create-checkout.js` uses
  `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` **if set**, and those win over
  the lookup key. If they point at an AUD object below, AUD is what's charged.
- **No lifetime price exists.**
- **Legacy AUD price objects (candidates to archive):**
  `price_1TgBrEE5YhjGQhQ5b2L72tJZ` (A$7.99), `price_1TgBrEE5YhjGQhQ5iUyc0hq6`
  (A$69.99), `price_1R3wo2E5YhjGQhQ5x9JjC9zN` (A$89.99),
  `price_1R3wnsE5YhjGQhQ5op14WVt6` (A$89.99), `price_1R3wX9E5YhjGQhQ532RNnYgn`
  (A$99.99). None are lookup-keyed. **Archive only after** confirming each is
  neither targeted by the env vars above nor attached to an active subscription.

**Target ladder** — AUD is the anchor (your numbers); international ends in
`.99` (**recommended — confirm before saving, this is real money**):

| Interval | AUD (anchor) | USD | EUR | GBP | NZD | CAD |
|---|---|---|---|---|---|---|
| **Monthly** | **A$4.99** | $4.99 | €4.99 | £3.99 | NZ$5.99 | C$4.99 |
| **Yearly** | **A$41.99** | $39.99 | €39.99 | £34.99 | NZ$44.99 | C$41.99 |
| **Lifetime** ⛔ | **A$129** | $89.99 | €84.99 | £74.99 | NZ$139.99 | C$119.99 |

*(SGD + CHF are also supported in code — leave as-is or extend the row.)*

**Change monthly & yearly (no code needed):**

1. In Vercel, settle the env vars: if `STRIPE_PRICE_MONTHLY` / `_YEARLY` are
   **set** they override the lookup key, so a panel edit won't reach checkout
   until you repoint or **clear** them. Simplest: clear both.
2. Admin Stripe panel → edit the AUD (and international) amount → **Save**.
   Stripe prices are immutable, so this **creates a fresh price, moves the lookup
   key onto it and archives the old one** — checkout keeps working and each
   customer sees their local currency. *(The panel auto-fills: edit one price and
   every other currency and interval recalculates to the nearest `.99`. Untick
   auto-fill to enter the exact ladder above.)*
3. Update **both** fallbacks so a Stripe outage can't show a stale figure:
   `api/_lib/pricing.js → DEFAULT_PRICES` (today AUD 7.99 / 79.99 → set
   4.99 / 41.99) **and** `src/hooks/usePrices.js → FALLBACK`.

**⛔ Do NOT create the lifetime price yet.** Two things gate it:

1. **§2 must be done first** — without the dispute and async-payment events, a
   one-off purchase has nothing that can revoke it.
2. **Code is still missing.** Entitlement is subscription-only:
   `api/_lib/plans.js → planForSubscription` reads a Stripe *subscription*
   status, and `create-checkout.js` is hardcoded to `mode: 'subscription'`. A
   lifetime purchase is a one-time payment with no subscription, so as-built a
   lifetime buyer resolves to **Free** — they'd pay and get nothing. Shipping it
   needs: a one-time Price with a `uil4b_pro_lifetime` lookup key; a checkout
   branch to `mode: 'payment'`; a `checkout.session.completed` handler writing a
   permanent lifetime flag; and plan resolution honouring it.

**In-app (engineering — done):** every price surface (Landing, Settings,
Onboarding, Checkout, HelpCentre, `/plans`) reads live amounts from
`/api/get-prices` via `src/hooks/usePrices.js`, so **no displayed price can
diverge from what Stripe charges** and the "Save N%" badge is computed from the
same two live numbers.

---

## 🟡 9. Retention coupon & cancellation

**Recommended — one coupon, applied automatically by the cancel flow:**

| Field | Value |
|---|---|
| Type | **Percentage discount** |
| Percent off | **50%** |
| Duration | **Repeating → 3 months** |
| Coupon ID | **`RETAIN50`** |
| Name | `Retention — 50% off 3 months` |

Standard win-back: meaningful but time-boxed (~A$2.50/mo for 3 months), recovers
churn without permanently halving revenue, safe for monthly and yearly alike.

**Steps:**

1. Stripe → **Product catalogue → Coupons → + New** → values above → Save.
   *(Customers never type the code; the portal applies it automatically.)*
2. Stripe → **Settings → Billing → Customer portal** → turn on **"Customers can
   cancel subscriptions"** AND **"Offer a coupon to retain customers"** → select
   `RETAIN50` → Save.
3. *(Optional)* add `STRIPE_RETENTION_COUPON=<coupon_id>` in Vercel; not required
   if step 2 is done.

**Tiered alternative** (Stripe's portal shows only ONE retention coupon, so
`RETAIN50` is the safe single pick):

| Scenario | Coupon | Note |
|---|---|---|
| "Too expensive" | **50% · repeating · 3 months** → `RETAIN50` | the default |
| "Not using it" | *(no coupon)* — enable **Pause subscription** | no coupon needed |
| "One free month" | **100% off · Once** → `FREEMONTH` | ⚠ on a **yearly** plan "once" = a free **year** — monthly subscribers only |

---

## 🟡 10. Hardening follow-ups

Low severity, but each is a console action only you can take.

**a. Restrict the Google Fonts API key by HTTP referrer.**
`VITE_GOOGLE_FONTS_API_KEY` ships in the client bundle by design, so anyone can
read it. Google Cloud Console → **APIs & Services → Credentials** → open the key
→ **Application restrictions → HTTP referrers** → add `https://uil4b.com/*` (and
your Vercel preview domain). Also set **API restrictions** to the Web Fonts
Developer API only. Without this, someone can burn your quota.

**b. Move the AI diagnostic code off a hardcoded constant.**
`api/ai.js:410` compares against the literal `uil4b-dev-2026`, which is committed
to a repo and printed in this document. It only exposes which env vars are set
(never their values), so severity is low — but it should be a `DIAG_CODE` env var
in Vercel. Tell me and I'll queue it; it's an `/api` file, so it needs your go.

**c. `analytics-daily` is world-readable by design.** Documented and accepted —
noting it here so a future review doesn't flag it as new.

---

## 🟡 11. Manual passes only you can run

These need a real browser, real Google account and real card — no automated test
can substitute.

- **Google OAuth account switching.** Account-switch reliability shipped in #183
  (the session now survives until the new credential commits), but the real
  Google popup behaviour has never been exercised by a human. Sign in, switch
  between two Google accounts, confirm neither session is dropped mid-switch.
- **Live Stripe checkout return/retry.** Complete a real purchase, then
  deliberately abandon one, return to it, and retry a declined card. Confirm the
  app state matches Stripe in all three.

---

## ✅ Already handled in code — no action needed

- Commit signing works (you authorised it).
- Converters consolidated into File Converter; `/imgconvert` + `/video-frames`
  redirect.
- Auth return-path, feedback failure handling, accessibility pass, Color Studio
  undo — merged.
- **CI quality gates (#188).** Every pull request now runs lint, build, the unit
  suite, the 24 Firestore rules assertions that pin the entitlement lock, and the
  Playwright acceptance suite. Nothing merges red.
- **Merged 2026-07-12 on your instruction:** admin dashboard rebuild
  (categorised overview, upgraded submissions, Stripe price auto-fill, Users tab
  with masked emails / country flags / sorting / filters / CSV export),
  device-level multi-account switching, founder accounts auto-Pro without Stripe,
  login + `/plans` polish, Mobbin-style nav, colour tools as separate pages. Both
  auth/Stripe HVZ slices passed security review — see
  [`audit/HVZ-DECISIONS-2026-07-12.md`](audit/HVZ-DECISIONS-2026-07-12.md).
- **No real secrets are exposed.** A repo-wide scan for `sk_live_`, `whsec_` and
  private-key headers returns zero hits. The Firebase web `apiKey`, Stripe
  publishable key and Google client ID are public by design — they are not leaks.

---

## Quick reference: every env var, in one place

**Client (`VITE_` — likely already set):** `VITE_FIREBASE_*`,
`VITE_GOOGLE_CLIENT_ID`, `VITE_STRIPE_PUBLISHABLE_KEY`,
`VITE_GOOGLE_FONTS_API_KEY` (optional; restrict it — §10a).

**Server (set in Vercel, NO `VITE_` prefix):** `FIREBASE_SERVICE_ACCOUNT_KEY`,
`GEMINI_API_KEY`, `OPENROUTER_API_KEY` (**missing in Production as of
2026-07-28**) + optional `OPENROUTER_MODEL`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`,
`STRIPE_PRICE_LIFETIME` (only after §2 **and** the lifetime code),
`STRIPE_RETENTION_COUPON` (optional).
