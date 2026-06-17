# UIL4B — Owner Action List

Things only **you** can do (credentials, dashboards, infra) to fully activate the
work that's now in the codebase. Ordered by impact. Last updated 2026-06-17.

---

## 🔴 1. Make the AI features work again (CRITICAL — they're dead in prod)

**Why:** Alt Text Generator, AI Image Prompt Generator, and the photo-scan feature all fail because the **server-side env vars aren't set in Vercel**. Without the Firebase service-account key, every AI request fails auth; without the AI provider keys, generation can't run. The code is correct — it's purely missing config. (The endpoints now return a precise error telling you which one is missing.)

Set these in **Vercel → your project → Settings → Environment Variables** (scope: **Production** + Preview), then **redeploy**:

| Variable | Where to get it | Notes |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Console → ⚙ Project Settings → **Service Accounts** → **Generate new private key** → download the `.json` | Paste the **entire JSON file contents** as the value (one line is fine). It must start with `{"type":"service_account",...}` — NOT the code snippet shown on that page. This is what verifies user logins on every AI call. |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Create API key | Powers Alt Text + photo-scan, and is the fallback for prompt generation. |
| `DEEPSEEK_API_KEY` | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) | Primary provider for the AI Prompt Generator (Gemini covers it if this is absent). |

**Verify:** after redeploy, open the Alt Text Generator, sign in, upload an image. If it still fails, the on-screen error now names the exact missing key. (These are all server-only — never prefix them with `VITE_`.)

---

## 🟠 2. Stripe retention coupon (so "Cancel plan" offers a real discount)

**Why:** the cancel flow now routes into Stripe's native cancellation flow; it just needs a coupon configured to actually offer one.

1. **Create the coupon** — Stripe Dashboard → **Product catalogue → Coupons → + New**:
   - Type: **Percentage discount**, **50% off**
   - Duration: **Repeating**, **3 months**
   - Name: `Retention 50% (3 months)` → Save. **Copy the Coupon ID** (looks like `aZ1bC2d3`).
   *(Alternative offers if you prefer: a 100%-off "Duration: Once" coupon = one free billing cycle; or skip the discount and just allow cancellation.)*
2. **Enable it in the portal** — Stripe Dashboard → **Settings → Billing → Customer portal**:
   - Turn on **"Customers can cancel subscriptions."**
   - Turn on **"Offer a coupon to retain customers"** → select the coupon above → Save.
3. **(Optional)** add `STRIPE_RETENTION_COUPON=<coupon_id>` in Vercel — this embeds the offer directly via the API. Not required if you did step 2 (the portal config handles it); the code falls back gracefully either way.

**Also confirm these Stripe vars exist in Vercel** (needed for checkout at all — likely already set): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, and client `VITE_STRIPE_PUBLISHABLE_KEY`. If prices aren't set, run `STRIPE_SECRET_KEY=sk_... npm run setup:stripe` and paste the printed IDs.

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
