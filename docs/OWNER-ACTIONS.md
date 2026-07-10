# UIL4B — Owner Action List

Things only **you** can do (credentials, dashboards, infra) to fully activate the
work that's now in the codebase. Ordered by impact. Last reviewed 2026-07-09.

> **⚠ Status is uncertain — verify before you fix.** As of 2026-06-30 you weren't
> sure which of these you'd already done, and the agent environment **cannot reach
> `uil4b.com` to check for you** (outbound to the production domain is blocked by
> the sandbox network policy — a `403 CONNECT` on every request). So each item
> below now leads with a **self-check you can run in ~30 seconds**. Run the check
> first; only do the fix if the check fails. Nothing here is destructive — re-doing
> an already-done step is harmless.

---

## 🔴 1. Make the AI features work again (CRITICAL)

**▶ Check first (30 sec):** open
`https://uil4b.com/api/generate-prompt?diag=uil4b-dev-2026` in your browser (or
`curl` it). You want to see `firebaseCredential: "ok"` and both `GEMINI_API_KEY`
and `OPENROUTER_API_KEY` reported as `set (… chars)`. If all three are healthy,
**this item is done — skip the fix.** (Even quicker: sign in and open the Alt Text
Generator; if it works, AI is alive.)

**Last known state (2026-06-20 diagnostic — may be stale if you've since fixed it):**

| Env var | Status then | Verdict |
|---|---|---|
| `GEMINI_API_KEY` | **set (39 chars)** | ✅ present, correct length |
| `OPENROUTER_API_KEY` | **MISSING** | ❌ not set in Production (replaces DEEPSEEK_API_KEY) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **set, but not valid service-account JSON** | ❌ malformed |

If the check above still shows those failures: every AI tool verifies your login
(`verifyIdToken`) *before* calling the AI model, and that needs a valid
service-account credential. A malformed `FIREBASE_SERVICE_ACCOUNT_KEY` (the code
snippet from that page, the web-app `firebaseConfig`, or a partial paste — instead
of the real service-account JSON) makes auth fail, so **every** AI tool dies no
matter how correct the AI keys are.

**Fix (≈5 min):**

1. **`FIREBASE_SERVICE_ACCOUNT_KEY`** — replace the value:
   - Firebase Console → ⚙ **Project Settings → Service Accounts → Generate new private key** → a `.json` file downloads.
   - Open it, copy the **entire** contents (starts with `{"type":"service_account","project_id":"uil4b-357c5",...}`) and paste that as the value. **Not** the code snippet on that page, **not** the web `firebaseConfig`.
   - Scope: **Production** (+ Preview if you want previews to work).
2. **`OPENROUTER_API_KEY`** — the primary AI provider (replaces DeepSeek). Add it (OpenRouter → https://openrouter.ai/keys, key starts with `sk-or-`), scoped to **Production**, no surrounding quotes/spaces. *(Gemini already works as the fallback, so AI will function once Firebase is fixed even before you add OpenRouter — but OpenRouter is the primary prompt model, so add it.)* Optional: `OPENROUTER_MODEL` to override the default `deepseek/deepseek-chat`.
3. **Redeploy** — Vercel env-var changes only take effect on the next deployment.
4. **Verify** — re-run the diagnostic URL above. You want `firebaseCredential: "ok"` and both keys `set (... chars)`. (Or just open the Alt Text Generator while signed in — the on-screen error now names the exact cause.)

The code now strips stray quotes/newlines from the AI keys and decodes a double-encoded
service-account blob, so a *slightly* mis-pasted value self-heals — but an outright-wrong value
(as now) still needs re-pasting. All three keys are server-only (never `VITE_`):
`FIREBASE_SERVICE_ACCOUNT_KEY` (verifies logins on every AI call), `GEMINI_API_KEY`
(alt-text + photo-scan + fallback), `OPENROUTER_API_KEY` (prompt generation).

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
   customer sees their local currency automatically.
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
from the same two live numbers so it can't contradict them. Optional,
founder-gated design follow-up (not a safety requirement): a dedicated **Plans**
page and trimming the pricing block out of Settings (Settings would keep *Manage
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

---

## 🟡 5. Create the social-share image (`og-image.png`)

`index.html` references `https://www.uil4b.com/previews/og-image.png` for link previews, but the file doesn't exist — so every shared link currently shows a broken/blank card. Drop a **1200×630 PNG** at `public/previews/og-image.png` (a branded card: wordmark + tagline on the dark theme). If you'd rather, give me the wording/look and I'll generate it.

---

## 🟡 6. SEO: decide on prerendering (biggest organic-growth lever)

The app is a client-rendered SPA, so Google sees deferred/partial content and **AI answer engines (ChatGPT/Perplexity/Bing) see almost nothing** — every route looks identical to them. The SEO audit's #1 recommendation is to **prerender/static-generate the public routes** (via `vite-react-ssg` or Vercel prerender). This is an architectural change I don't want to make unannounced. **Give me the go-ahead** and I'll implement it for the public tool/docs/landing routes (auth pages stay client-only). It simultaneously fixes indexability, AI-citation, social cards, and the largest performance problem.

*(The smaller SEO wins — sitemap cleanup, `llms.txt`, robots — are already done.)*

---

## ✅ Already handled in code (no action needed, just FYI)
- Commit signing is working (you authorised it).
- Converters consolidated into File Converter; `/imgconvert` + `/video-frames` redirect.
- Auth return-path, feedback failure handling, accessibility pass, Color Studio undo, etc. — all merged.

---

### Quick reference: every env var, in one place
**Client (`VITE_` — likely already set):** `VITE_FIREBASE_*`, `VITE_GOOGLE_CLIENT_ID`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_GOOGLE_FONTS_API_KEY` (optional).
**Server (set in Vercel, NO `VITE_` prefix):** `FIREBASE_SERVICE_ACCOUNT_KEY` ⬅ *fixes AI*, `GEMINI_API_KEY` ⬅ *fixes AI*, `OPENROUTER_API_KEY` ⬅ *fixes AI (replaces DEEPSEEK_API_KEY)*, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_PRICE_LIFETIME` (Early Investor), `STRIPE_RETENTION_COUPON` (optional).
