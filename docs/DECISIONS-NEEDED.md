# UIL4B — Decisions Needed (founder-gated)

Short list of backlog items an autonomous pass reached but **stopped before
executing**, because each one is either revenue-affecting, an auth/Stripe Human
Validation Zone, or a subjective brand call. Every item is written so you can
decide in one line; once you do, the code change is small and I'll ship it.

> Distinct from [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md) (things only *you* can do
> in a dashboard). These are things **I can do**, but shouldn't guess at.
> Last reviewed 2026-07-12.

---

## 1. Free-tier "saves" number — reconcile copy with the product (WS-H)

**The contradiction.** `Plans.jsx` advertises the Free plan as **"Local saves —
up to 25"** (also in the comparison table: *"Local, up to 25"*). But the product
doesn't enforce 25 — icon/collection saving is fully **Pro-gated**
(`SubscriptionContext` free limits cover AI actions only: `alt-text` 40,
`prompts-ai` 40; `promptCategories.js` caps free prompts at 5). So "up to 25
local saves" is **unenforced marketing copy** that the app contradicts.

**The decision (pick one):**
- **(a) Make it true** — add a real free save cap (e.g. 25 local saves) in
  `SubscriptionContext` + wherever saves are written, and keep the copy. *This is
  a monetization change — it loosens the current "saving = Pro" wall, so it
  affects upgrade pressure.*
- **(b) Reword to match reality (recommended)** — change the Free bullet to
  something the product actually delivers (e.g. *"Save & copy locally"* with cloud
  sync + saved collections as the Pro upgrade), so we stop promising a number
  nothing enforces. Copy-only, zero revenue risk, no Stripe wiring touched.
- **(c) Give me the real number** — if the intent was "3 projects / ~8 icons"
  (your earlier note), tell me the exact cap and I'll do (a) with that number.

**My recommendation: (b).** Cleanest, honest, ships today, no HVZ exposure.
**One-word reply to unblock:** `reword` · `enforce 25` · or `enforce <N>`.

---

## 2. App typeface — confirm or swap (WS-I font unification)

**State.** The app is **already unified on a single typeface (Outfit)** —
`--font` *and* `--serif` both resolve to `'Outfit'` in `global.css`, Outfit is
preloaded in `index.html`, and the only remaining hardcoded fonts live in
export templates / theme demos / the font-browser tool (intentional — those show
*other* fonts on purpose). So there's nothing broken to fix here.

**The decision.** Your note mentioned Google Sans. **Google Sans isn't
web-licensable** (Google-product-only), so we can't ship it. Options:
- **(a) Keep Outfit (recommended)** — already live, geometric, clean, free.
  Nothing to do.
- **(b) Swap to a specific open alternative** — e.g. *Geist*, *Inter*, or
  *Plus Jakarta Sans* if you want a different feel. This is a subjective brand
  change I won't make unattended; name one and I'll swap the two tokens + preload
  and rebuild (≈15 min, one commit).

**My recommendation: (a) keep Outfit.**
**One-word reply:** `keep` · or a font name to swap to.

---

## 3. Multi-account switching (#7) — auth HVZ, design-only

Adding "switch between accounts" touches `AuthContext` / session handling / token
storage — a **Human Validation Zone**. I did not implement it unattended.
**Needs your go-ahead before I design + build**, and it should ride its own branch
with your review. Say `spec #7` if you want the design doc first.

## 4. Admin premium + checkout bypass (#10) — auth/Stripe HVZ, design-only

Granting admin accounts Pro (and/or a checkout bypass) is an **entitlement +
Stripe** change — HVZ, revenue-adjacent, and a security surface (must not become a
way to mint Pro for non-admins). Design-only until you approve. Say `spec #10`.

## 5. Admin dashboard rebuild (#12/#13) — large, HVZ, own branch

Big surface, touches admin auth. Out of scope for an unattended pass. Should be
scoped on its own branch with your review. Say `spec admin` for a plan.

## 6. Mobbin-style login + pricing polish (WS-B #4/#5)

- **#4 login** — visual/UX polish is safe; I can do it. But it borders
  `GoogleOneTap.jsx` / `AuthContext` (HVZ), so tell me if you want *chrome only*
  (`login chrome`) or a deeper flow change (`spec login`).
- **#5 pricing page** — the `/plans` page is live; further changes to the pricing
  *presentation* are safe, but anything touching `checkoutHref` / `proTo` /
  `useProPrice` is HVZ. Say `plans polish` for copy/layout-only work.

---

### What already shipped this pass (no decision needed)
- Icon editor **similar-icons row** (same-pack siblings) — `08c158e`.
- **i18n parity restored** — 6 actively-rendered strings (icon/emoji library
  headers) were missing from all 9 non-English locales; now filled, all locales
  back to 466-key parity — `1b33adc`.
- **Colour-picker chrome unified** — every `input[type="color"]` well now reads as
  one clean rounded chip app-wide — `1b33adc`.
