# Audit Implementation — Testing Ledger & Regression Matrix

*Tracks verification for every implemented item. An item is only `Complete` in
the [backlog](IMPLEMENTATION-BACKLOG.md) once its row here is fully green,
independently reviewed, QA-signed, and (if 🔒) owner-validated. A passing build
is necessary but **never sufficient** — live-verification items require the
running app.*

Legend: ✅ pass · ⏳ pending · 🔒 owner-gated · — n/a

---

## Automated gate (whole tree)

| Check | Command | Result | When |
|---|---|---|---|
| Production build | `npx vite build` | ✅ built, no errors | 2026-07-21 (after A1+A2+Q3/LOW-3 + Q1 resume-target) |
| Lint (changed files) | `npx eslint <changed>` | ✅ 0 errors / 0 warnings on the changed files (`Onboarding`, `ProUpgradeModal`, `App`) — re-verified after the Q1 resume-target. Tree-wide `eslint .` remains 0 errors + 34 pre-existing warnings; the changed files add **0** new. | 2026-07-21 |

---

## Running-build smoke (localhost, headless Chromium)

The production build was served with `vite preview` on `127.0.0.1:4173` and driven
with headless Chromium (Playwright). This exercises the **real bundled app** and
**live React Router**, so it upgrades the riskiest structural claim — the
generalized Q1 fix (`LoginRoute` stash) — from static review to **running-app
evidence**. It does **not** reach Firebase/Google/Stripe (see egress note below),
so the auth-completion and resume-consume halves stay ⏳.

| Check | Result | Evidence |
|---|:--:|---|
| App boots + renders at `/`, auth resolves logged-out | ✅ | `rootTextLen=856`; no app-level console errors (network/Firebase filtered) |
| `RequireAuth` `/checkout?plan=yearly` (logged out) → `/login` | ✅ | landed `pathname === '/login'`, modal mounted |
| **`LoginRoute` stashes `/checkout` intent** (NEW code) | ✅ | `sessionStorage['vs-resume-after-onboarding'] === '/checkout'` |
| **`LoginRoute` stashes `/projects` intent** (generality) | ✅ | stash `=== '/projects'` on a second protected route |
| Direct `/login` (no `from`) writes **no** stash (`from=/home` guard) | ✅ | stash `=== null` |

> **Boot 404 (benign):** one request 404s on boot. It is an **egress-blocked
> external resource** (Firebase/googleapis/analytics), not a code defect — proven
> by construction: the app rendered content and all routing assertions passed,
> which a broken JS chunk would have prevented.

> **⛔ Egress note — live-preview + Firebase/Google/Stripe verification is BLOCKED
> in this session.** The Vercel preview
> (`uil4b-git-claude-audit-implementation-qa-a1hjzp-…vercel.app`) and Google/Firebase
> hosts return **403 from the org egress proxy** (policy denial — not retried or
> routed around, per environment rules). Every row still marked ⏳/🔒 below needs
> a running app **with authenticated Firebase**, which only the founder (or a
> non-egress-blocked environment) can drive.

---

## Per-item verification

### A1 · Onboarding reachable for new sign-ups &nbsp;🔒

| Test | Type | Status | Notes |
|---|---|:--:|---|
| Fresh **email** signup → lands `/onboarding` | Manual | ⏳ | Needs running app + Firebase; `pendingOnboarding` set in `signup()` |
| Fresh **Google popup** signup → lands `/onboarding` | Manual | ⏳ | `getAdditionalUserInfo(result).isNewUser` gate |
| Fresh **Google One-Tap** signup → lands `/onboarding` | Manual | ⏳ | Same gate in `loginWithGoogleCredential` |
| Signup via **tool `AuthGate`** → reaches onboarding | Manual | ⏳ | Interrupts tool use — see regression R3 |
| Signup via **`requireLogin` popup** (save/upgrade) → onboarding | Manual | ⏳ | Interrupts in-context action — see regression R3 |
| **Returning** email login → `/home`, no onboarding | Manual | ⏳ | `isNewUser`=false → no `pendingOnboarding` |
| **Returning** Google login → `/home`, no onboarding | Manual | ⏳ | |
| Independent code review | Review | ✅ | Approve-with-nits; no returning-user path can set the flag |
| Independent security review | Review | ✅ | Clean — 0 crit/high/med; 1 pre-existing low (`vs-onboarded` client-writable) |
| Independent QA | QA | ⚠️ | PASS-with-follow-ups; Q1 (HIGH, checkout intent discarded) + Q3 (a11y) raised |
| Keyboard-only signup path lands focus predictably | a11y (C5/Q3) | ✅ | **Fixed** — `Onboarding.jsx` focuses step heading on mount + step change. Live AT pass still ⏳ |
| Mid-action **"Upgrade to Pro"** signup → onboarding → resumes `/checkout` | Manual (Q1) | ⏳ | **Fixed in code** — `ProUpgradeModal.goCheckout` stashes `vs-resume-after-onboarding`; `skip`/checkout-fail resume there. Live-verify on preview |
| Mid-action **`/login` `from`** signup (e.g. `/checkout?plan=` link) → onboarding → resumes `from` | Manual (Q1) | ⏳ | **Stash-write half ✅ verified on local build** (see running-build smoke: `LoginRoute` stashes `/checkout` **and** `/projects`, direct `/login` writes none). The onboarding-**resume** half still needs authenticated Firebase → ⏳ live-verify |
| Onboarding **"Start with Free"** after a mid-action signup → `/home` (intent dropped by explicit choice) | Manual (Q1) | ⏳ | `finishFree` clears the stashed target. Live-verify |
| Unprompted signup (no stash) → onboarding finish → `/home` | Manual (Q1) | ⏳ | `takeResumeTarget()` returns null → `/home` fallback. Live-verify |
| Owner validation of auth-flow change | 🔒 | 🔒 | Founder sign-off + live resume-path verify required before merge |

### A2 · Onboarding nav `/dashboard` → `/home`

| Test | Type | Status | Notes |
|---|---|:--:|---|
| `grep '/dashboard'` in `Onboarding.jsx` = 0 | Static | ✅ | Confirmed after edit |
| "Start with Free" → `/home` | Manual | ⏳ | Reachable once A1 lands |
| "Go Pro" checkout failure catch → `/home` | Manual | ⏳ | |
| "Skip" / "Maybe later" → `/home` | Manual | ⏳ | |
| Build + lint | Auto | ✅ | |

---

## Regression matrix

Changes touch the **auth flow (HVZ)** — regressions to actively re-verify:

| # | Risk | Guard in the implementation | Re-verify | Status |
|---|---|---|---|:--:|
| **R1** | Returning users bounced into onboarding | Flag keyed off *account-creation* event (`isNewUser`/`signup`); returning users never set it | Second login (email + Google) skips onboarding | ⏳ |
| **R2** | Storage-blocked browsers wrongly forced to onboard | `App.jsx:291` unchanged — `catch` still treats user as onboarded; A1 adds no new localStorage read on the guard | Signup with storage blocked | ⏳ |
| **R3** | In-context signup (save/upgrade/`AuthGate`) hijacked to onboarding | *By design* — flagged as owner-validate. **Escalation #2 → option B:** the checkout/`from` intent is **no longer discarded** — it's stashed in `vs-resume-after-onboarding` and onboarding resumes there (skip / checkout-fail) or fulfils Pro directly. Save panels are still pre-empted (picker-open, not persistence → no data loss; tracked as a UX follow-up, not resume-scope). | Signup via "Upgrade to Pro" **and** via a `/checkout?plan=` link: confirm `/onboarding`, then that skip / decline-to-checkout resumes to `/checkout` (not stranded on `/home`) | 🔒 |
| **R4** | Cross-device onboarded user sees onboarding before Firestore sync | Unaffected — A1 doesn't force onboarding via localStorage guard; only the new-account flag routes | New device login of onboarded account → `/home` | ⏳ |
| **R5** | `onboarding` loop (routed back after skip) | `clearPendingOnboarding()` fires before/at navigation; flag is one-shot React state (not persisted) | Skip onboarding → stays on `/home`, no bounce | ⏳ |

---

## Sign-off log

| Date | Item(s) | Gate | By | Result |
|---|---|---|---|---|
| 2026-07-20 | A1, A2 | Self build + lint | PM (implementation) | ✅ green — **not** a completion sign-off |
| 2026-07-21 | A1, A2 | Independent security review | security-reviewer | ✅ clean (1 pre-existing low) |
| 2026-07-21 | A1, A2 | Independent code review | code-reviewer | ✅ approve-with-nits |
| 2026-07-21 | A1, A2 | Independent QA (static) | qa | ⚠️ PASS-with-follow-ups (Q1 HIGH, Q3 a11y) |
| 2026-07-21 | A1 (Q3) | a11y focus fix build + lint | PM (implementation) | ✅ green, 0 new warnings |
| 2026-07-21 | A1 (Q1) | Resume-target build + lint (Escalation #2 → B) | PM (implementation) | ✅ green, 0 new warnings |
| 2026-07-21 | A1 (Q1) | **Running-build smoke** (localhost `vite preview`, headless Chromium) — `LoginRoute` stash producer + `RequireAuth` redirect | PM (verification) | ✅ 5/5 checks pass (stash-write half of Q1 now running-app evidence) |
| 2026-07-21 | A1 (HVZ) | **Founder Human-Validation-Zone sign-off** on the auth-flow change ("continue, you have approval for HV zones") | Founder | ✅ HVZ gate approved — proceed toward merge |
| 2026-07-21 | A1, A2 | **Merge to `main`** (#161 squash) per founder "continue" + HVZ sign-off; all runnable gates green + localhost smoke 5/5 | PM (merge) | ✅ merged — live-preview smoke **deferred to founder**, residual risk owned |
| — | A1, A2 | Live-app QA (running Firebase) on preview | Founder | ⏳ **deferred** — auth-completion + resume-consume + Google/Stripe; egress-blocked in CI, founder-drivable only. Revert #161 if it fails |
| — | A1 | Owner validation (🔒 auth) — live resume-path verify on preview | Founder | 🔒 post-merge — founder preview smoke on the same URL |
