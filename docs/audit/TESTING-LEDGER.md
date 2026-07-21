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
| Production build | `npx vite build` | ✅ built, no errors | 2026-07-21 (after A1+A2+Q3/LOW-3) |
| Lint (whole tree) | `npx eslint .` | ✅ 0 errors — 34 warnings, **all pre-existing** (`set-state-in-effect` in Settings/search comps; `reauthenticate` deps + fast-refresh in untouched `AuthContext` fns). The 4 changed files (`AuthContext`, `App`, `AuthGate`, `Onboarding`) add **0** new warnings — re-verified after the Q3 focus fix + LOW-3 comment. | 2026-07-21 |

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
| Owner validation of auth-flow change | 🔒 | 🔒 | Founder sign-off + Escalation #2 decision required before merge |

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
| **R3** | In-context signup (save/upgrade/`AuthGate`) hijacked to onboarding | *By design* — flagged as owner-validate. **Corrected per QA Q1/Q2:** the pending action does **not** complete — save panels are pre-empted before they open, and "Upgrade to Pro"'s `/checkout` nav is discarded (user reaches Pro via onboarding's pricing step). No data loss; re-routed not stranded. Escalation #2. | Signup via "Upgrade to Pro": confirm user lands on `/onboarding` and can still reach Pro at the pricing step | 🔒 |
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
| — | A1, A2 | Live-app QA (running Firebase) | — | ⏳ all "Manual" rows above |
| — | A1 | Owner validation (🔒 auth) + Escalation #2 | Founder | 🔒 pending |
