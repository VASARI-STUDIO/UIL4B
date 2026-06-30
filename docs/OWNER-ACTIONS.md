# UIL4B — Owner Action List

Things only **you** can do (credentials, dashboards, infra) to fully activate the
work that's now in the codebase. Ordered by impact. Last reviewed 2026-06-30.

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
and `DEEPSEEK_API_KEY` reported as `set (… chars)`. If all three are healthy,
**this item is done — skip the fix.** (Even quicker: sign in and open the Alt Text
Generator; if it works, AI is alive.)

**Last known state (2026-06-20 diagnostic — may be stale if you've since fixed it):**

| Env var | Status then | Verdict |
|---|---|---|
| `GEMINI_API_KEY` | **set (39 chars)** | ✅ present, correct length |
| `DEEPSEEK_API_KEY` | **MISSING** | ❌ not set in Production |
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
2. **`DEEPSEEK_API_KEY`** — currently missing in Production. Add it (DeepSeek dashboard → API keys), scoped to **Production**, no surrounding quotes/spaces. *(Gemini already works as the fallback, so AI will function once Firebase is fixed even before you add DeepSeek — but DeepSeek is the primary prompt model, so add it.)*
3. **Redeploy** — Vercel env-var changes only take effect on the next deployment.
4. **Verify** — re-run the diagnostic URL above. You want `firebaseCredential: "ok"` and both keys `set (... chars)`. (Or just open the Alt Text Generator while signed in — the on-screen error now names the exact cause.)

The code now strips stray quotes/newlines from the AI keys and decodes a double-encoded
service-account blob, so a *slightly* mis-pasted value self-heals — but an outright-wrong value
(as now) still needs re-pasting. All three keys are server-only (never `VITE_`):
`FIREBASE_SERVICE_ACCOUNT_KEY` (verifies logins on every AI call), `GEMINI_API_KEY`
(alt-text + photo-scan + fallback), `DEEPSEEK_API_KEY` (prompt generation).

---

## 🟠 2. Stripe retention coupon — exact codes & amounts

**Recommended — one coupon, the cancel flow uses it:**

| Field | Value |
|---|---|
| Type | **Percentage discount** |
| Percent off | **50%** |
| Duration | **Repeating → 3 months** |
| Coupon ID (code) | **`RETAIN50`** (set a custom ID, or let Stripe auto-generate and note it) |
| Name | `Retention — 50% off 3 months` |

Why this: it's the standard win-back — meaningful but time-boxed (Pro is $4.99/mo → ~$2.50/mo for 3 months), recovers churn without permanently halving revenue, and is **safe for both monthly and yearly** subscribers.

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
**Server (set in Vercel, NO `VITE_` prefix):** `FIREBASE_SERVICE_ACCOUNT_KEY` ⬅ *fixes AI*, `GEMINI_API_KEY` ⬅ *fixes AI*, `DEEPSEEK_API_KEY` ⬅ *fixes AI*, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_RETENTION_COUPON` (optional).
