# Account lifecycle audit — 2026-08-12

Onboarding, account management, billing and notifications (item 11). Every claim
below is traced to a file and line.

**Fixed already:** the AI quota fallback. `?? 40` was the OLD free daily limit,
so before the plan snapshot resolved a free user was told they had 40
generations when the server grants 5 — and could fire eight requests it would
reject. Now derives from `AI_LIMITS.free.daily`, with a test.

**Status: A1-A4, B1, B2, B4 and part of B6 are fixed.** Those touch auth, Stripe and Firestore
deletion, which [`human-validation-zones.md`](reference/human-validation-zones.md)
gates behind founder validation — correctly, because the failure modes are
billing people who left and deleting data that cannot be recovered. The founder
gave explicit approval to proceed on them. **A4 and the rest of B and C remain
open.**

---

## A — Legal / compliance. Not optional.

### ~~A1 · Deleting an account does not cancel the subscription~~ — FIXED
### ~~A2 · "Delete all associated data" leaves the data~~ — FIXED
### ~~A3 · Deletion is broken for Google users~~ — FIXED

All three are now one server-side transaction:
[`api/delete-account.js`](../api/delete-account.js), with the refusal rules
extracted to [`api/_lib/accountDeletion.js`](../api/_lib/accountDeletion.js) so
they can be tested without Firebase or Stripe in the room. 22 unit tests.

**A1.** It cancels every subscription that can still bill — including
`trialing`, `past_due` and `unpaid`, not only `active` — and it does that
**first**, aborting the whole deletion if Stripe fails. Deleting an account we
are still billing is the worst outcome available here; leaving it intact so the
user can retry is recoverable. Ownership of the Stripe customer is re-verified
against `metadata.firebaseUid` exactly as `create-portal` does, because
`stripeCustomerId` was client-writable until the rules lock and a tampered id
would otherwise cancel a stranger's subscription.

**A2.** `recursiveDelete` takes `users/{uid}/sync/data` with the profile.
Community prompts, feedback, uploaded media under `community-media/{uid}/` and
the `daily-usage` counters go too. Settings no longer asserts "all associated
data" — it lists what goes, item by item, and the list is now true.

**A3.** Google accounts get `reauthenticateWithPopup`, and only accounts that
actually have a password are asked for one. The Admin SDK deletes the auth user,
so `auth/requires-recent-login` cannot occur at all — the freshness that
reauthentication was providing is preserved by checking `auth_time` on the
verified token instead (five minutes), which is somewhere the client cannot lie.
Every auth error now maps to English.

**Order is the safety property, and a test asserts it:** billing → data → auth.
The auth user goes LAST, because a failure after it is gone orphans data with no
token left that could ever authorise another attempt.

**Not run:** no live deletion, no real Stripe cancellation, no webhook delivery.
This is code-truth. The one thing worth a founder's eyes before it matters is
whether every existing Stripe customer carries `metadata.firebaseUid` — any
that does not will be refused as `missing_metadata` and needs it added in the
Stripe dashboard.

### ~~A4 · Data export is browser-local and incomplete~~ — FIXED

*Was:* the export iterated a hand-maintained 15-key list and read localStorage
only — never the Firestore profile, `users/{uid}/sync/data`, or the account
identity. Observed: **16 keys present, 9 missing from the list** and therefore
absent from a file the user was told was their data. `vs-accounts` (email,
display name and photo for up to five accounts) was neither disclosed, exported,
nor cleared.

**Now:** [`src/utils/dataExport.js`](../src/utils/dataExport.js) enumerates by
**prefix**, never by list — a list is a promise someone will remember to update
it, and that promise had already been broken nine times. The export carries
localStorage, sessionStorage, the Firestore profile, `users/{uid}/sync/data` and
the account identity; a server read that fails is *recorded in the file* rather
than silently dropped. "Clear local data" enumerates the same way.

An undescribed key is still exported and still disclosed, marked
`pii: unknown` — a documentation gap must not become a data gap in a file
someone is relying on.

**Verified end-to-end through the real button:** 18 keys exported against a
seeded browser, `vs-accounts` included with its email, a deliberately invented
key exported and honestly disclosed, dated keys (`vs-usage-…-2026-08-12`)
described via their stem, and a foreign key left untouched.

**Two further defects fixed in the same pass:**

- **The privacy policy described storage that does not exist.**
  `Privacy.jsx` held a *third* hand-written copy of the list, and it disclosed
  `vs-users` — *"Account credentials (email + hashed password) for local
  accounts"* — and `vs-session`. Neither key exists anywhere in the app; it moved
  to Firebase Auth and stores no password, hashed or otherwise. The table is now
  generated from the shared source, so the policy cannot fall behind the code.
- **Settings claimed "Everything UIL4B stores lives in your browser."** False
  for any signed-in account, whose profile and synced design live in Firestore.

**Also found while verifying this:** `analytics.js`'s `load()` used
`JSON.parse(...) || fallback`, which only catches null. A valid-JSON *object*
where an array was expected passed straight through and then threw
`push is not a function` on the next page view — **a white screen on every page
load** until the user cleared storage, with no way for them to know why.
Reachable by a stale schema or by someone hand-restoring their own export. Now
shape-checked, with a regression test.

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

### ~~B2 · Nothing warns before the AI quota, and the machinery is dead code~~ — FIXED

*Was:* `getRemainingUses` and `getResetTime` were exported from
`usageTracker.js` and imported nowhere. `purgeStaleUsage` was never called, so
`vs-usage-*` keys accumulated forever. The server returned
`usage: { used, limit, remaining }` on every response and no caller read it. And
the monthly ceiling was completely invisible — Free is 5/day *and* 40/month, but
the client only knew the daily figure, so a free user hit the monthly wall on
day 8 with no warning and the server's `period: 'month'` reply rendered as a
generic error.

**Now:** [`src/utils/aiQuota.js`](../src/utils/aiQuota.js) does the arithmetic
(DOM-free, 21 unit tests), [`useAiQuota`](../src/hooks/useAiQuota.js) wires it to
the plan and to the server's figures, and
[`QuotaMeter`](../src/components/QuotaMeter.jsx) shows **both** ceilings above
the tool rather than beside the button — the allowance is something to know
before uploading forty images, not after the eighth refusal.
`purgeStaleUsage()` now runs on app start.

Two rules the code holds, because getting either backwards is what made the old
behaviour feel broken:

- **The server is the truth.** The localStorage tracker counts one browser; the
  ceiling is per account. A second device, a cleared cache or a private window
  all make the local count an undercount. Where the two disagree, the figure
  leaving **less** headroom wins — a quota that reads generous and then refuses
  only fails at the moment of use.
- **Never name the wrong reset.** The daily bucket resets at midnight, the
  monthly one on the 1st. Telling someone their monthly wall "resets at
  midnight" is a lie they act on by returning tomorrow to the same wall.

`api/ai.js` now returns the monthly figures on **success** too, not only in the
429 that enforces them — otherwise the ceiling stays invisible right up until it
blocks, which was the original dead end.

### B3 · The onboarding survey's answers are never used

`Onboarding.jsx:73-76` persists `{source, use, role}`. Complete list of readers:
`AuthContext.jsx:199` (reads `completedAt` only), and the admin table. **No
product surface reads them** — no personalisation, no tool ordering, no copy
variation. Three screens of friction delivering value only to an internal table.

### ~~B4 · The post-signup destination is the anonymous sales page~~ — FIXED

*Was:* `Onboarding.jsx` finished at `/home`, and `Home.jsx` has no auth
awareness at all — it does not import `useAuth`. So someone who had just created
an account was shown "No more tab hoarding", a "Start building free" CTA and
"No credit card · No setup". That CTA loops: `App.jsx` bounces a signed-in user
from `/login` straight back to `/home`.

**Now:** all three onboarding exits share one `FIRST_RUN_DESTINATION`
constant — `/projects` — so they cannot drift apart again. That is where **B5's
first real win** lives, and its empty state already named the two tools to start
with and offered the action. The teaching state existed; it was simply not on
the path anyone walked.

The homepage staying auth-unaware is not a bug to fix — CLAUDE.md is explicit
that it is a sales page, not a dashboard. It is the *reason* a signed-in user
must not be routed there, and a test asserts that if it ever gains auth
awareness the destination gets reconsidered rather than silently left.

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

- ~~`CheckoutReturn.jsx:83` — the success CTA points at `/dashboard`~~ —
  **FIXED.** It is now "Start building" → `/projects`. A test asserts
  `/dashboard` really is only a redirect, so if it ever becomes a real page
  these destinations get rethought rather than silently staying put.
- `Onboarding.jsx` — "continue free" discards the stashed resume target while
  "skip" honours it. **Reviewed and kept**, because the two are not the same
  event: choosing Free is an explicit decision not to buy, so resuming into the
  checkout they just declined would be hostile; skipping the survey says nothing
  about intent, so the original destination still stands. Both now land on
  `/projects` when there is no stashed target, so the inconsistency the audit
  actually felt — two different landings — is gone.
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
2. ~~**Make deletion legal and functional**~~ — **done** (A1-A3). Still open in
   this area: A4, the data EXPORT, which is browser-local and misses nine of the
   sixteen keys actually present.
3. **Replace the pricing step with the first win.** Today the last thing
   onboarding does is ask for money, and the first thing after it is ask them to
   sign up again.
