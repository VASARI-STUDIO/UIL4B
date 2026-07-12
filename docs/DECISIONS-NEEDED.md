# UIL4B — Decisions Needed (founder-gated)

Short list of items that need a **founder call** before code moves. Every item is
written so you can decide in one line; once you do, the change is small and ships
fast.

> Distinct from [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md) (things only *you* can do
> in a dashboard). These are things **I can do**, but shouldn't guess at.
> Last reviewed 2026-07-12.

---

## Open decisions

## 1. Confirm the free-tier cap numbers

The Free plan now **enforces** 3 saved projects / 8 custom icons (single source
of truth: `FREE_SAVE_LIMITS` in `SubscriptionContext`; `/plans` copy reads the
same values). Those numbers came from your earlier note — **confirm they're the
caps you want**. Changing them is a one-line edit and every surface updates.
**One-word reply:** `keep` · or `caps <projects>/<icons>`.

---

## ✅ Resolved this pass (previously listed here — no decision left)

0. **Merge the feature branch** — resolved 2026-07-12: on your instruction
   ("push all changes to main") the branch was fast-forwarded onto `main`
   (`b2c07b1` → `e5f75d1`). The HVZ security review below was completed before
   the merge, all clear.

**HVZ security review (done 2026-07-12, all clear):**
- *Admin Pro entitlement* — the grant only derives from a server-verified
  Firebase ID token: `planForUser` (`api/_lib/plans.js`) checks the token email
  against a hardcoded allowlist, and every AI endpoint passes the email **only
  when `decoded.email_verified` is true**, so registering the admin address
  unverified gets nothing. The client-side `isAdmin` flag is cosmetic — every
  paid call re-verifies server-side, so flipping it in devtools unlocks nothing.
  Non-admins cannot mint Pro.
- *verify-admin `includeUsers`* — the cross-user list is returned **only**
  inside the `isAdmin` branch (verified email + allowlist), so no non-admin
  token can pull user data. The Users tab keeps the response in memory only
  (never localStorage), masks emails by default, and reveals per explicit
  toggle; the CSV export (full emails) is an intentional admin feature.
- *setup-stripe* — GET and POST both sit behind the same verified-email
  allowlist (403 otherwise); amounts are validated (0 < n ≤ 100 000, supported
  currencies only) before any Stripe write.
- *Multi-account switching* — the localStorage registry stores **display data
  only** (uid, email, name, photo); no tokens or credentials ever persist, and
  switching always re-authenticates through Firebase (Google `login_hint` popup
  or the login page). On a shared computer the account emails are visible in
  the switcher — same behaviour as Google's own account chooser.
- *Pre-existing, unchanged:* the `/api` routes send `Access-Control-Allow-Origin: *`;
  safe because the bearer ID token is the credential and browsers never attach
  it cross-origin automatically — noted for completeness, not introduced by
  this branch.

1. **Free-tier "saves" copy vs. product** — resolved by *enforcing* a real cap
   (3 projects / 8 icons) and aligning the `/plans` copy — `6faabc5`. Only the
   number-confirmation above remains.
2. **App typeface** — Outfit confirmed and locked as the single app-wide
   typeface (`--font` + `--serif` both resolve to Outfit; export templates and
   the font-browser intentionally excepted). Nothing further to decide.
3. **Multi-account switching (#7)** — approved, designed, and shipped:
   device-level account switcher with silent re-auth where possible, Login
   hand-off otherwise — `e3f5f30`. HVZ — security review passed, merged.
4. **Admin premium + checkout bypass (#10)** — approved and shipped: allowlisted
   founder accounts resolve to Pro without Stripe, server-verified
   (`email_verified` required) so it cannot mint Pro for non-admins — `8cc2b99`.
   HVZ — security review passed, merged.
5. **Admin dashboard rebuild (#12/#13)** — approved and shipped — `eaca7bd`:
   - **Overview** regrouped into four visually separated categories (Traffic &
     Engagement / Audience / Feedback & Community / Setup).
   - **Submissions** — search, per-type/per-status counts, status summary,
     newest/oldest toggle.
   - **Stripe pricing** — edit one price and every currency (monthly + yearly)
     auto-fills to the nearest `.99`, scaled off the default ratios; checkbox to
     disable for manual fine-tuning.
   - **Users tab (#13)** — emails masked behind per-row eye toggles (first
     characters shown, rest blurred), plan / role / category / country
     (flag + tooltip) / joined / last-login columns, column sorting, search +
     plan + per-country chip filters with counts (answers "how many users from
     X"), CSV export. Data comes from an admin-gated server endpoint (Admin SDK),
     with a this-browser fallback if the server list is unavailable.
6. **Login + pricing polish (#4/#5)** — shipped as chrome/presentation only:
   login card polish + trust line (`a758b09`), `/plans` value-prop and Get Pro
   pill polish (`bdb0aa2`, `7691a31`). No checkout wiring touched.

Also shipped on the same branch (never needed a decision): Mobbin-style nav
redesign with centred search (`88a4fd2`), colour tools split into their own
pages (`c5778b1`), guided brand-kit builder entry (`b9c9d5b`), icon-editor
retention features, File Converter + Aspect Ratio redesigns, i18n parity fixes.
