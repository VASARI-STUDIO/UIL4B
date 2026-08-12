# Account lifecycle audit — 2026-08-12

Onboarding, account management, billing and notifications (item 11). Every claim
below is traced to a file and line.

**Fixed already:** the AI quota fallback. `?? 40` was the OLD free daily limit,
so before the plan snapshot resolved a free user was told they had 40
generations when the server grants 5 — and could fire eight requests it would
reject. Now derives from `AI_LIMITS.free.daily`, with a test.

**Nothing else here is fixed.** Sections A and B touch auth, Stripe and
Firestore deletion, which
[`human-validation-zones.md`](reference/human-validation-zones.md) puts behind
founder validation — correctly, because the failure modes are billing people
who left and deleting data that cannot be recovered.

---

## A — Legal / compliance. Not optional.

### A1 · Deleting an account does not cancel the subscription

`AuthContext.jsx:367-385` reauthenticates, calls `deleteUser()`, deletes the
user doc. **There is no Stripe call anywhere in that path**, and no endpoint for
one (`api/` has create-checkout, create-portal, checkout-status, stripe-webhook
— none cancels).

The billing portal is the only cancellation route and it needs a Firebase ID
token (`SubscriptionContext.jsx:135-139`), which a deleted user can never mint
again.

**So a Pro user who deletes their account keeps being charged, with no
self-serve way to stop it.** Their options are a support email or a chargeback —
and a chargeback lands in `stripe-webhook.js:356-365`, which tries to revoke an
entitlement on a user doc that no longer exists.

*Fix: an authenticated cancel before `deleteUser`, and say so in the dialog.*

### A2 · "Delete all associated data" leaves the data

`AuthContext.jsx:380` deletes only `users/{uid}`. Firestore does not delete
subcollections with their parent, and `users/{uid}/sync/data` — the user's
synced projects, prompts and current design (`useFirestoreSync.js:38`) —
survives. So do `community-prompts` carrying `authorUid`
(`SubmitPromptPanel.jsx:88`) and `feedback` carrying their email
(`api/support.js:59,68`). The `deleteDoc` is in a silent `catch`, so a failure
is never surfaced.

`Settings.jsx:774` says "Permanently delete your account and all associated
data. This cannot be undone." **That is false**, and GDPR Art. 17 is not
satisfied.

### A3 · Deletion is broken for Google users — the primary sign-in method

`AuthContext.jsx:369-371` skips reauthentication for Google accounts, so
`deleteUser()` throws `auth/requires-recent-login`. Meanwhile `Settings.jsx:368`
unconditionally asks for a password a Google-only user does not have, and
`Settings.jsx:353-354` maps only `auth/wrong-password` — everything else shows
the raw string `Firebase: Error (auth/requires-recent-login).`

*Fix: `reauthenticateWithPopup` for Google; map the error to English.*

### A4 · Data export is browser-local and incomplete

`Settings.jsx:458-474` iterates a hand-maintained 15-key list and reads
localStorage only — never the Firestore profile, `users/{uid}/sync/data`,
billing history or server-side submissions. Observed: **16 keys present, 9 not
in the list and therefore not exported**, including `vs-sessions` and
`vs-analytics`. `vs-accounts` (`AuthContext.jsx:26`) holds email, display name
and photo for up to five accounts and is neither disclosed, exported, nor
cleared by "Clear local data".

`Settings.jsx:786` ("Everything UIL4B stores lives in your browser") and `:838`
("You can export or delete your data at any time") are both inaccurate for a
signed-in user.

---

## B — Product findings

### ~~B1 · The billing signals are all written and none are read~~ — FIXED

*Was:* `stripe-webhook.js` wrote `paymentFailed`, `hostedInvoiceUrl`,
`trialEndsAt` and `trialEndingSoon`; grep across `src/` returned zero hits for
all four. `SubscriptionContext.jsx` dropped the user to Free the moment Stripe
flipped status, so an expired card silently removed Pro and the user found out
by hitting a limit.

**Now:** [`src/utils/billingState.js`](../src/utils/billingState.js) derives the
alert, [`BillingBanner.jsx`](../src/components/BillingBanner.jsx) renders it
app-wide (mounted outside `AppInner` so it reaches the chromeless Create tools),
and a **seven-day grace window** holds Pro through Stripe's retry schedule
instead of revoking on the first failed charge. 22 unit tests + 3 layout tests.

Three things that were not obvious going in, recorded so they are not
rediscovered:

- **The grace window cannot be anchored on `currentPeriodEnd`.** Stripe advances
  the period end *before* it finalises the renewal invoice, so by the time that
  invoice fails the period end is already a month out — grace measured from it
  would run ~37 days, not 7. It is anchored on a new `paymentFailedAt`, stamped
  once on the transition into failure and preserved across retries.
- **`writeSubscription` cleared `paymentFailed` unconditionally**, and Stripe
  sends `customer.subscription.updated` (→ `past_due`) alongside
  `invoice.payment_failed` with no ordering guarantee. Whenever the subscription
  event landed second it wiped the flag the invoice event had just set — so the
  banner would never have appeared even once it existed. The clear is now gated
  on a healthy status.
- **`trialEndingSoon` is never set back to false anywhere.** On its own it would
  announce a trial that ended months ago on every page load. The banner guards
  on live `status === 'trialing'` plus a future `trialEndsAt`, and treats the
  flag only as a widening hint.

Still open from this section: the **emails**. A banner only reaches someone who
is already in the app — see section C.

### B2 · Nothing warns before the AI quota, and the machinery is dead code

`usageTracker.js` exports `getRemainingUses` (:54) and `getResetTime` (:61) —
exactly the two functions needed. **Neither is imported anywhere.**
`purgeStaleUsage` (:73) is never called, so `vs-usage-*` keys accumulate
forever. The server returns `usage: { used, limit, remaining }` on every success
(`api/ai.js:157`) and no caller reads it.

**The monthly ceiling is completely invisible.** Free is 5/day *and* 40/month,
but the client only ever reads the daily figure — so a free user hits the
monthly wall on day 8 with no warning, and the server's `period: 'month'`
response renders as a generic error.

### B3 · The onboarding survey's answers are never used

`Onboarding.jsx:73-76` persists `{source, use, role}`. Complete list of readers:
`AuthContext.jsx:199` (reads `completedAt` only), and the admin table. **No
product surface reads them** — no personalisation, no tool ordering, no copy
variation. Three screens of friction delivering value only to an internal table.

### B4 · The post-signup destination is the anonymous sales page

`Onboarding.jsx:104` → `/home`, and `Home.jsx` has **no auth awareness at all**
— no `useAuth` import in the file. A user who just created an account is shown
"No more tab hoarding", a "Start building free" CTA, and "No credit card · No
setup". That CTA loops: `App.jsx:159-161` bounces a signed-in user from
`/login` straight back to `/home`.

### B5 · Activation, stated observably

**The first real win is the user's first saved project** — the first thing that
requires an account and survives the session.

**Eleven steps from landing to that win, four of which contribute nothing**
(the three survey questions and the pricing step). Nothing in the flow points at
it: onboarding never links to a tool, `/home` does not change, and the only
place that names the path is an empty state on `/projects` — a page a new user
has no reason to visit. There IS a good teaching empty state
(`Projects.jsx:725-739`); it is simply not on the path.

### B6 · Smaller

- `CheckoutReturn.jsx:83` — the success CTA points at `/dashboard`, which is a
  redirect to `/home`. The moment of highest goodwill ends on the acquisition
  page.
- `Onboarding.jsx:99-105` vs `:121-126` — "continue free" discards the stashed
  resume target while "skip" honours it, so the same user gets two different
  destinations depending on which button they press.
- Downgrade behaviour is **correct** (`ProjectContext.jsx:201-203` blocks only
  new saves; nothing is deleted) but is never communicated. `Projects.jsx` never
  reads `projectLimit`; the only usage counter in the product is
  `IconLibrary.jsx:1231`.
- No email verification anywhere (`sendEmailVerification` is never called), no
  account linking, no "sign out everywhere".

---

## C — Notifications

**Total user-facing transactional email: zero.**

The only email is inbound-to-founder (`api/support.js:98-132`), sending from
`onboarding@resend.dev` — Resend's shared sandbox domain, not production
deliverable. The product's own admin panel already marks it failing
(`Admin.jsx:1862`).

No welcome, no quota warning, no trial-ending reminder, no failed-payment
notice, no cancellation confirmation. Password reset comes from Firebase, not
us. **There is no channel to reach a user who is not currently in the app**, so
every re-engagement moment is unreachable.

*Stripe may send its own receipts and dunning depending on dashboard config —
**not checked**.*

---

## Not checked

No live signup, checkout, deletion or webhook delivery was run — those create
real Firebase and Stripe records. Vercel env vars and Stripe dashboard email
settings were not inspected. Treat anything above as code-truth, not
runtime-truth, where it depends on those.

## The three highest-impact

1. ~~**Read the billing state you already collect.**~~ **The banner half is
   done** (see B1) — four fields written by the webhook now drive an app-wide
   notice, and a seven-day grace window keeps a retrying customer on Pro. The
   **email half is not**, and it is the half that reaches someone who has
   already stopped opening the app. Blocked on section C: there is no
   deliverable sending domain.
2. **Make deletion legal and functional** — cancel the subscription, delete the
   subcollection, work for Google accounts. Compliance, not features.
3. **Replace the pricing step with the first win.** Today the last thing
   onboarding does is ask for money, and the first thing after it is ask them to
   sign up again.
