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

**⚠ Lifetime needs code first — NOT a dashboard-only task.** Entitlement today is
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

**Also confirm these Stripe vars exist in Vercel** (needed for checkout to work at all — likely already set): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `VITE_STRIPE_PUBLISHABLE_KEY`. If prices aren't set, run `STRIPE_SECRET_KEY=sk_... npm run setup:stripe`.

---

## 🟠 3. Firebase Storage — activate community media uploads

**Why:** community prompt media now uploads to Firebase Storage (no more ~900 KB base64 cap). It falls back to the old base64 path until Storage is on, so nothing's broken in the meantime — but to get the real backend:

1. Firebase Console → **Build → Storage → Get started** (the bucket `uil4b-357c5.firebasestorage.app` is already in config).
2. Publish the rules: Firebase Console → **Storage → Rules** → paste the contents of **`storage.rules`** (in the repo root) → **Publish**. (Public read; authenticated users can only write under their own `community-media/{uid}/` path, 25 MB cap.)

---

## 🟠 4. Publish Firestore rules — activate the Admin "aggregate analytics" panel

**Why:** the Admin dashboard now has an "All users · aggregate" panel fed by a new `analytics-daily` Firestore collection. It stays empty until the rules are published.

1. Firebase Console → **Firestore Database → Rules** → paste the contents of **`firestore.rules`** (repo root) → **Publish**.
2. The analytics read is gated to **`dylanjacob1100@gmail.com`** — confirm that's your Firebase login email (the rule is in `firestore.rules`; tell me if it should change).

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
