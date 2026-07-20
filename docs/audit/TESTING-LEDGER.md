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
| Production build | `npx vite build` | ✅ built, no errors | 2026-07-20 (after A1+A2) |
| Lint (whole tree) | `npx eslint .` | ✅ 0 errors — 34 warnings, **all pre-existing** (`set-state-in-effect` in Settings/search comps; `reauthenticate` deps + fast-refresh in untouched `AuthContext` fns). My 4 changed files add **0** new warnings. | 2026-07-20 |

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
| Independent code + security review | Review | ⏳ | Auth surface (HVZ) |
| Keyboard-only signup path lands focus predictably | a11y (C5) | ⏳ | Pairs with Slice C |
| Owner validation of auth-flow change | 🔒 | 🔒 | Founder sign-off required before merge |

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
| **R3** | In-context signup (save/upgrade/`AuthGate`) hijacked to onboarding | *By design* — flagged as owner-validate; pending action still fires | Save-a-palette signup: palette persists; user on onboarding | 🔒 |
| **R4** | Cross-device onboarded user sees onboarding before Firestore sync | Unaffected — A1 doesn't force onboarding via localStorage guard; only the new-account flag routes | New device login of onboarded account → `/home` | ⏳ |
| **R5** | `onboarding` loop (routed back after skip) | `clearPendingOnboarding()` fires before/at navigation; flag is one-shot React state (not persisted) | Skip onboarding → stays on `/home`, no bounce | ⏳ |

---

## Sign-off log

| Date | Item(s) | Gate | By | Result |
|---|---|---|---|---|
| 2026-07-20 | A1, A2 | Self build + lint | PM (implementation) | ✅ green — **not** a completion sign-off |
| — | A1, A2 | Independent code/security review | — | ⏳ |
| — | A1, A2 | QA (running app) | — | ⏳ |
| — | A1 | Owner validation (🔒 auth) | Founder | 🔒 pending |
