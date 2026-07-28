# UIL4B — Owner Action List

Things only **you** can do (credentials, dashboards, infra) to fully activate the
work that's now in the codebase. Ordered by impact. Last reviewed 2026-07-28.

> **Reachability status (2026-07-28):** the production AI diagnostic was reachable
> and confirmed Firebase credentials plus Gemini are healthy. Dashboard mutations
> remain owner-only, so each manual action still starts with a read-only check.
> Do not repeat a completed dashboard action just because it appears in history.

---

## 🔴 1. Add the missing OpenRouter primary key

**▶ Check first (30 sec):** open
`https://uil4b.com/api/ai?diag=uil4b-dev-2026` in your browser (or
`curl` it).

**Verified production state (2026-07-28):**

| Env/config | Status | Verdict |
|---|---|---|
| Firebase Admin credential | **healthy** | ✅ token verification works |
| `GEMINI_API_KEY` | **set** | ✅ production AI fallback is available |
| `OPENROUTER_API_KEY` | **MISSING** | ❌ intended primary provider is unavailable |

AI is therefore operational through Gemini; this is provider completion, not an
AI outage.

**Fix (≈3 min):**

1. Create/copy an OpenRouter key from <https://openrouter.ai/keys>.
2. In Vercel, add `OPENROUTER_API_KEY=sk-or-…` to **Production** (and Preview if
   previews should exercise the primary provider), with no surrounding quotes.
3. Optional: set `OPENROUTER_MODEL`; otherwise the code uses
   `deepseek/deepseek-chat`.
4. Redeploy, then rerun the diagnostic. Firebase and Gemini should remain healthy
   and OpenRouter should report `set (… chars)`.

---

## 🔴 2. Pricing & billing

### 2·PRE. ⛔ HARD BLOCKER — configure the Stripe webhook events FIRST

**Do this before you create the lifetime price. Not after. Not at the same time.**
The one-off purchase has no subscription object behind it, so the *only* things
that grant and remove access are these webhook events. If the endpoint is not
subscribed to them when the first purchase lands, the buyer pays and gets
nothing — or refunds/chargebacks silently keep their Pro access.

Stripe Dashboard → **Developers → Webhooks → your `/api/stripe-webhook`
endpoint → Update details → Select events.** The endpoint MUST be subscribed to
every row below:

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

#### What a refund actually does to access (support needs this)

`api/stripe-webhook.js` revokes on a **full** refund only — the check is
`amount_refunded >= amount`. Consequences, in plain terms:

- **Full refund → Pro is removed.** The customer drops to Free.
- **Partial / goodwill refund → Pro stays active.** Refunding, say, half the
  one-off price as a gesture does **not** take access away. That is deliberate
  (a partial refund is not "the sale is off"), but it means *"refund them a bit
  to say sorry"* silently costs you the whole entitlement. If the intent is to
  end the sale, refund it **in full**.
- **Refunding to settle a chargeback is final.** Once a charge is refunded, the
  entitlement stays revoked even if the dispute later closes in your favour —
  the buyer would otherwise keep both the money and Pro. If you win a dispute
  after refunding and still want the customer to have Pro, that is a manual
  restore (or have them repurchase); the webhook will not do it. Look for
  `won dispute did NOT restore access` in the Vercel logs.
- **Re-granting is never automatic.** A refunded session can never re-grant on a
  webhook re-delivery; only a genuine new purchase restores access.

**Verify before going live (2 min):** on the endpoint page, use **Send test
event** for `checkout.session.async_payment_succeeded` and
`charge.dispute.created`, then confirm each returns **200** in the endpoint's
event log. A `400 Invalid signature` means `STRIPE_WEBHOOK_SECRET` in Vercel
does not match this endpoint's signing secret — fix that before selling.

**Then, and only then, create the lifetime price (2a below).**

### 2a. Flip to the new price ladder (Stripe)

**▶ Read live first (authoritative):** open the in-app **admin Stripe panel**
(`/admin` → Setup Stripe; it calls `GET /api/setup-stripe`, which expands live
`currency_options`) **and** check Vercel for `STRIPE_PRICE_MONTHLY` /
`STRIPE_PRICE_YEARLY`. Those two together are the truth of what's charged today.
Everything below is the **target** to change it *to* — no price changes until you
save it in Stripe.

**What's live today (read-only Stripe check, 2026-07-09):**
- One product: **UIL4B Pro** (`prod_Uh3MFir6kwPWS3`); every plan hangs off it.
- Canonical prices resolve by **lookup key** (`uil4b_pro_monthly`,
  `uil4b_pro_yearly`), base currency **USD**, other currencies attached as
  `currency_options`. Live base amounts: **US$4.99/mo** (`price_1ThfmX…`) and
  **US$39.99/yr** (`price_1ThfmY…`).
- ⚠ **Checkout can override the lookup key.** `create-checkout.js` uses
  `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` **if set** — those pin checkout
  to a specific price ID and win over the lookup key. If they point at an AUD
  object below, AUD (not USD) is what's actually charged. Confirm in Vercel.
- **No lifetime price exists.** Lifetime needs code first — see the ⚠ block below.
- **Legacy AUD price objects (candidates to archive):**
  `price_1TgBrEE5YhjGQhQ5b2L72tJZ` (A$7.99), `price_1TgBrEE5YhjGQhQ5iUyc0hq6`
  (A$69.99), `price_1R3wo2E5YhjGQhQ5x9JjC9zN` (A$89.99),
  `price_1R3wnsE5YhjGQhQ5op14WVt6` (A$89.99), `price_1R3wX9E5YhjGQhQ532RNnYgn`
  (A$99.99). None are lookup-keyed. **Archive only after** confirming each is
  neither the target of the env vars above nor attached to an active subscription
  (archiving is reversible and does not cancel existing subs, but it stops new
  checkouts that resolve to that exact ID).

**Target ladder** — AUD is the anchor (your numbers, final); international ends in
`.99` (values below are **recommended — confirm before saving, this is real money**):

| Interval | AUD (anchor) | USD | EUR | GBP | NZD | CAD |
|---|---|---|---|---|---|---|
| **Monthly** | **A$4.99** | $4.99 | €4.99 | £3.99 | NZ$5.99 | C$4.99 |
| **Yearly** | **A$41.99** | $39.99 | €39.99 | £34.99 | NZ$44.99 | C$41.99 |
| **Lifetime** ⚠ | **A$129** | $89.99 | €84.99 | £74.99 | NZ$139.99 | C$119.99 |

*(SGD + CHF are also supported in code — leave as-is, or extend the row to match.)*

**Change monthly & yearly (no code needed):**
1. In Vercel, settle the env vars: if `STRIPE_PRICE_MONTHLY` / `_YEARLY` are
   **set**, they override the lookup key, so a panel edit won't reach checkout
   until you repoint or **clear** them. Simplest: clear both, so checkout resolves
   by lookup key (the panel always keeps the key on the newest price).
2. Admin Stripe panel → edit the AUD (and any international) amount → **Save**.
   Stripe prices are immutable, so this **creates a fresh price, moves the lookup
   key onto it, and archives the old one** — checkout keeps working and each
   customer sees their local currency automatically. *(New: the panel now
   auto-fills — edit one price and every other currency, both intervals,
   recalculates to the nearest `.99` off the default ratios. Untick the
   auto-fill box to fine-tune currencies individually — e.g. to enter the exact
   ladder above rather than the computed values.)*
3. Update **both** fallbacks so a Stripe outage can't show a stale figure:
   the server anchor `api/_lib/pricing.js → DEFAULT_PRICES` (today AUD monthly
   7.99 / yearly 79.99 → set 4.99 / 41.99, and mirror any international change),
   **and** the client display anchor `src/hooks/usePrices.js → FALLBACK` (the AUD
   figure shown only before `/api/get-prices` resolves or if it's unreachable).

**⚠ Lifetime needs code first, AND the webhook events from §2·PRE — NOT a
dashboard-only task.** Entitlement today is
subscription-only: `api/_lib/plans.js → planForSubscription` reads a Stripe
**subscription** status, and `create-checkout.js` is hardcoded to
`mode: 'subscription'`. A lifetime purchase is a **one-time payment** with no
subscription, so as-built a lifetime buyer resolves to **Free**. To ship it,
engineering must: (1) add a one-time (non-recurring) Price + a
`uil4b_pro_lifetime` lookup key; (2) branch checkout to `mode: 'payment'` for it;
(3) on that price's `checkout.session.completed` webhook, write a permanent
`lifetime: true` flag to the user's Firestore doc; (4) make plan resolution honour
that flag. **Don't create the Stripe lifetime price until that code is merged**, or
buyers pay and get nothing. (Tracked as an engineering slice.)

**In-app (engineering — status):** ✅ **Done (PR #145).** Every price surface
(Landing, Settings, Onboarding, Checkout, HelpCentre) now reads live amounts from
`/api/get-prices` via the shared `src/hooks/usePrices.js` hook, so **no displayed
price can diverge from what Stripe charges** — when you flip the ladder in step 2
the whole UI updates with zero code change, and the "Save N%" badge is computed
from the same two live numbers so it can't contradict them. ✅ The dedicated
**`/plans`** page now exists and reads the same live amounts. Remaining optional
follow-up: trim the pricing block out of Settings (Settings would keep *Manage
billing* + *Cancel* only).

### 2b. Retention coupon — exact codes & amounts

**Recommended — one coupon, the cancel flow uses it:**

| Field | Value |
|---|---|
| Type | **Percentage discount** |
| Percent off | **50%** |
| Duration | **Repeating → 3 months** |
| Coupon ID (code) | **`RETAIN50`** (set a custom ID, or let Stripe auto-generate and note it) |
| Name | `Retention — 50% off 3 months` |

Why this: it's the standard win-back — meaningful but time-boxed (Pro monthly is ~A$4.99 → ~A$2.50/mo for 3 months), recovers churn without permanently halving revenue, and is **safe for both monthly and yearly** subscribers.

**Steps:**
1. Stripe Dashboard → **Product catalogue → Coupons → + New** → enter the values above → Save. *(Customers never type the code — the portal applies it automatically; the ID is just for your reference / the optional env var.)*
2. Stripe Dashboard → **Settings → Billing → Customer portal** → turn on **"Customers can cancel subscriptions"** AND **"Offer a coupon to retain customers"** → select `RETAIN50` → Save.
3. *(Optional)* add `STRIPE_RETENTION_COUPON=<coupon_id>` in Vercel to also embed it via the API; not required if step 2 is done.

**If you'd rather offer tiered options** (create these, pick what the portal shows — but Stripe's portal shows only ONE retention coupon, so `RETAIN50` is the safe single pick):

| Scenario | Coupon | Note |
|---|---|---|
| "Too expensive" | **50% off · repeating · 3 months** → `RETAIN50` | the default |
| "Not using it" | *(no coupon)* — enable **Pause subscription** in the portal | Stripe pauses billing, no coupon needed |
| "One free month" | **100% off · Duration: Once** → `FREEMONTH` | ⚠ on a **yearly** plan, "once" = a free **year** — only show this to monthly subscribers |

### 2c. ⚠ Back-fill `firebaseUid` on legacy Stripe customers

`/api/create-portal` now refuses to open a billing portal unless the Stripe
customer's own `metadata.firebaseUid` matches the signed-in user — the Firestore
`stripeCustomerId` was client-writable until the rules fix, so it is no longer
accepted as proof on its own. Customers this app created always carry that
metadata; a customer created **by hand in the Stripe dashboard** (or by an older
build) does not, and that user will get *"This billing account is not linked to
your login"*.

**Check (2 min):** Stripe Dashboard → **Customers** → open each existing paying
customer → confirm **Metadata** has `firebaseUid`. Where it's missing, add it
with the user's Firebase uid (Admin dashboard → Users tab). The server log line
distinguishes the two cases: `cause: "missing_metadata"` (back-fill needed) vs
`cause: "uid_mismatch"` (tampering — do not "fix" by editing metadata).

**Also confirm these Stripe vars exist in Vercel** (needed for checkout to work at all — likely already set): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `VITE_STRIPE_PUBLISHABLE_KEY`. If prices aren't set, run `STRIPE_SECRET_KEY=sk_... npm run setup:stripe`.

---

## 🟠 3. Firebase Storage — activate community media uploads

**Why:** community prompt media now uploads to Firebase Storage (no more ~900 KB base64 cap). It falls back to the old base64 path until Storage is on, so nothing's broken in the meantime — but to get the real backend:

1. Firebase Console → **Build → Storage → Get started** (the bucket `uil4b-357c5.firebasestorage.app` is already in config).
2. Publish the rules: Firebase Console → **Storage → Rules** → paste the contents of **`storage.rules`** (in the repo root) → **Publish**. (Public read; authenticated users can only write under their own `community-media/{uid}/` path, 25 MB cap.)

---

## 🔴 4. Publish Firestore rules — CLOSES A LIVE PRIVILEGE-ESCALATION HOLE

**Why (upgraded from 🟠 to 🔴):** the published rules currently allow a signed-in
user to write **any** field to their own `users/{uid}` document — including
`lifetimeEntitlement`, `subscription` and `stripeCustomerId`, which are exactly
what the server reads to decide Pro (`api/_lib/plans.js → planForUser`). Anyone
who can open devtools can grant themselves Pro (1,000 AI actions/day instead of
40, billed to you). The repo's `firestore.rules` now blocks those three fields on
create **and** update; **deploying the code does not deploy the rules** — this
publish is what actually closes it.

1. Firebase Console → **Firestore Database → Rules** → paste the contents of
   **`firestore.rules`** (repo root) → **Publish**.
2. Sanity-check after publishing: sign in, edit your display name in
   **Settings** → it should save normally (no warning banner). Rules are
   versioned in the console, so this is reversible in one click.
3. The analytics read is gated to **`dylanjacob1100@gmail.com`** — confirm that's
   your Firebase login email (the rule is in `firestore.rules`; tell me if it
   should change). This also activates the Admin "All users · aggregate" panel,
   fed by the `analytics-daily` collection.

*(The rules are covered by emulator tests — `npm run test:rules`, which needs a
JDK 21+ on PATH. Run them before publishing any future rules edit.)*

*(The new admin **Users tab** does NOT depend on these rules — it reads
cross-user data through the server's Admin SDK via an admin-gated
`/api/verify-admin` flag, so it works as soon as the branch deploys. Only the
aggregate-analytics panel waits on the rules publish.)*

---

## ✅ Already handled in code (no action needed, just FYI)
- Commit signing is working (you authorised it).
- Converters consolidated into File Converter; `/imgconvert` + `/video-frames` redirect.
- Auth return-path, feedback failure handling, accessibility pass, Color Studio undo, etc. — all merged.
- **Merged to `main` (2026-07-12, on your instruction):** admin dashboard
  rebuild (categorised overview, upgraded submissions, Stripe price auto-fill,
  full Users tab with masked emails / country flags / sorting / filters / CSV
  export), device-level multi-account switching, founder accounts auto-Pro
  without Stripe, login + `/plans` polish, Mobbin-style nav, colour tools as
  separate pages. The two auth/Stripe HVZ slices passed the security review
  before merge — see the closed
  [`audit/HVZ-DECISIONS-2026-07-12.md`](audit/HVZ-DECISIONS-2026-07-12.md).

---

### Quick reference: every env var, in one place
**Client (`VITE_` — likely already set):** `VITE_FIREBASE_*`, `VITE_GOOGLE_CLIENT_ID`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_GOOGLE_FONTS_API_KEY` (optional).
**Server (set in Vercel, NO `VITE_` prefix):** `FIREBASE_SERVICE_ACCOUNT_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` (**missing in Production as of 2026-07-28**) + optional `OPENROUTER_MODEL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_PRICE_LIFETIME` (only after the lifetime decision + code), `STRIPE_RETENTION_COUPON` (optional).
