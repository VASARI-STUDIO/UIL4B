// Account deletion, done properly and server-side.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT WAS WRONG (2026-08-12 account lifecycle audit § A1-A3)
// ─────────────────────────────────────────────────────────────────────────────
// The old path lived entirely in AuthContext.deleteAccount:
//
//   A1  It never touched Stripe. A Pro user who deleted their account KEPT
//       BEING CHARGED, and the billing portal — the only cancellation route —
//       needs a Firebase ID token they can never mint again. Their options were
//       a support email or a chargeback.
//   A2  It deleted `users/{uid}` and nothing else. Firestore does not delete
//       subcollections with their parent, so `users/{uid}/sync/data` — every
//       synced project, prompt and design — survived. So did community prompts
//       carrying authorUid, feedback carrying their email, uploaded media, and
//       the AI usage counters. Settings said "and all associated data", which
//       was false, and GDPR Art. 17 was not satisfied.
//   A3  It skipped reauthentication for Google accounts — the primary sign-in
//       method — so deleteUser() threw auth/requires-recent-login and deletion
//       simply did not work for most users.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS IS A SERVER ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
// Cancelling a subscription needs a Stripe secret key, and deleting the other
// users' collections needs privileges the client must never hold — a browser
// that could delete `community-prompts` could delete everyone's.
//
// It also FIXES A3 outright: the Admin SDK deletes any user without a recent
// login, so the whole auth/requires-recent-login class of failure disappears.
// The security that reauthentication was providing is preserved by checking the
// token's own `auth_time` claim instead (see REAUTH_WINDOW_MS) — the client
// still has to prove a fresh login, we just verify it somewhere it can't lie.
//
// ─────────────────────────────────────────────────────────────────────────────
// ORDER OF OPERATIONS — deliberate, do not rearrange
// ─────────────────────────────────────────────────────────────────────────────
//   1. Stripe first, and ABORT if it fails. Deleting an account we are still
//      billing is the single worst outcome available here; leaving the account
//      intact so the user can retry is recoverable.
//   2. Data second.
//   3. Auth LAST. If a data step fails after the auth user is gone, the data is
//      orphaned with no token that can ever authorise another attempt. This way
//      a failure anywhere leaves the account able to try again.
import { adminAuth, adminDb, adminStorageBucket } from './_lib/firebase-admin.js'
import { getStripeServer } from './_lib/stripe.js'
import { failRequest } from './_lib/http.js'
import { allowedOrigins } from './_lib/origins.js'
import {
  isReauthFresh, customerOwnershipVerdict, mayProceedWithDeletion, liveSubscriptions,
} from './_lib/accountDeletion.js'

// Firestore rejects a batch over 500 writes.
const BATCH_LIMIT = 400

async function deleteQueryInBatches(db, query) {
  let deleted = 0
  for (;;) {
    const snap = await query.limit(BATCH_LIMIT).get()
    if (snap.empty) return deleted
    const batch = db.batch()
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    deleted += snap.size
    if (snap.size < BATCH_LIMIT) return deleted
  }
}

// Cancels every live subscription on the customer, immediately.
//
// Ownership is re-verified against Stripe's own copy exactly as create-portal
// does: `stripeCustomerId` sat on a client-writable document until the
// firestore.rules lock, so the stored value is not proof. Stripe's
// metadata.firebaseUid was written by this server and has never been
// client-reachable. Without the check, a tampered id would cancel a stranger's
// subscription.
async function cancelBilling(uid, userData) {
  const customerId = userData?.stripeCustomerId || null
  if (!customerId) return { cancelled: 0, customerId: null }

  const stripe = getStripeServer()
  const customer = await stripe.customers.retrieve(customerId)
  const verdict = customerOwnershipVerdict(customer, uid)

  if (!mayProceedWithDeletion(verdict)) {
    // Refuse rather than guess. Cancelling the wrong person's subscription is
    // not something they find out about until their access stops.
    console.error('delete-account: refused — Stripe customer does not belong to this account', {
      uid, customerId, verdict,
    })
    const err = new Error('This billing account is not linked to your login. Please contact support before deleting.')
    err.exposeToUser = true
    throw err
  }
  // Nothing left to bill, so nothing to cancel.
  if (verdict === 'customer_deleted') return { cancelled: 0, customerId, note: verdict }

  // `status: 'all'` then filter: a customer can hold several subscriptions, and
  // trialing/past_due/unpaid ones resume billing just as surely as active ones.
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 })
  const live = liveSubscriptions(subs.data)

  for (const sub of live) {
    // Immediate, not at period end: the account is about to stop existing, so
    // there is nobody left to serve the remainder of the period to.
    await stripe.subscriptions.cancel(sub.id)
  }
  return { cancelled: live.length, customerId }
}

export default async function handler(req, res) {
  // An allowlisted origin is reflected, anything else gets no CORS header at
  // all — the same allowlist and the same shape as api/support.js, which
  // records the reasoning. `*` was not a CSRF hole even here (the bearer token
  // below is the only credential and a browser never attaches it by itself),
  // but this route deletes an account and there is no page outside the
  // allowlist that has any business asking a visitor's browser to call it.
  const origin = req.headers.origin
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' })
  }

  let uid, email, authTimeMs
  try {
    // checkRevoked: a user who signed out everywhere must not be able to delete
    // with a token minted before that.
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7), true)
    uid = decoded.uid
    email = decoded.email || null
    authTimeMs = (decoded.auth_time || 0) * 1000
  } catch {
    return res.status(401).json({ error: 'Invalid auth token' })
  }

  if (!isReauthFresh(authTimeMs)) {
    // The client maps this code to "please confirm your password / Google
    // account again" rather than showing a raw Firebase string.
    return res.status(401).json({
      code: 'reauth-required',
      error: 'For your security, please sign in again before deleting your account.',
    })
  }

  const db = adminDb()
  const userRef = db.collection('users').doc(uid)

  try {
    // ── 1. Billing. Abort the whole deletion if this fails. ──────────────────
    let billing
    try {
      const snap = await userRef.get()
      billing = await cancelBilling(uid, snap.exists ? snap.data() : null)
    } catch (err) {
      return failRequest(res, {
        status: err.exposeToUser ? 400 : 502,
        scope: 'delete-account billing cancellation',
        message: err.exposeToUser
          ? err.message
          : 'We could not cancel your subscription, so your account has NOT been deleted — we will not delete an account we are still billing. Please try again, or contact support with the reference below.',
        err,
        context: { uid },
      })
    }

    // ── 2. Data. ─────────────────────────────────────────────────────────────
    const deleted = {}

    // recursiveDelete takes the sync subcollection with it — the thing the old
    // client-side deleteDoc could never reach.
    await db.recursiveDelete(userRef)
    deleted.profileAndSync = true

    // AI usage counters: `uid_YYYY-MM-DD` for days and `uid_mYYYY-MM` for
    // months, both in `daily-usage` (api/ai.js). Those documents hold only
    // `{ [toolId]: count }` — no uid field — so the document id is the only
    // handle, and a `__name__` prefix range is the only way to find them.
    //
    // The upper bound is written as the ESCAPE \uf8ff, never as the literal
    // character. U+F8FF is the top of the BMP private-use area and is the
    // documented Firestore idiom for the exclusive end of a prefix scan — but
    // pasted literally it renders as nothing, so the two bounds then read as
    // identical to anyone reviewing this file. An equal-bounds range is empty:
    // it deletes no counters and truthfully reports 0, which is exactly the
    // kind of silent gap this whole endpoint exists to close.
    const usage = db.collection('daily-usage')
    deleted.usageCounters = await deleteQueryInBatches(
      db,
      usage
        .where('__name__', '>=', usage.doc(`${uid}_`))
        .where('__name__', '<', usage.doc(`${uid}_\uf8ff`)),
    )

    // Community prompts carry authorUid, authorName and a profile link.
    deleted.communityPrompts = await deleteQueryInBatches(
      db, db.collection('community-prompts').where('authorUid', '==', uid),
    )

    // Community submissions — gradients, designs and palettes queued for review
    // (utils/communityQueue.js) — carry authorUid and authorName exactly as
    // prompts do. They were MISSED when this cascade was written: the
    // collection arrived after it, and nothing tied "a collection that stores a
    // uid" to "a collection the delete has to reach". So a deleted account's
    // display name stayed on every submission it had ever made, readable by any
    // signed-in user, under a dialog that says "and all associated data".
    // tests/unit/account-deletion.test.js now derives the list of collections
    // this must reach from firestore.rules, so the next one cannot be missed
    // the same way.
    deleted.communitySubmissions = await deleteQueryInBatches(
      db, db.collection('community-submissions').where('authorUid', '==', uid),
    )

    // Feedback carries the address they typed. api/support.js stores no uid, so
    // the email is the only handle — which is also why this is skipped for an
    // account without one rather than deleting by a null match.
    deleted.feedback = email
      ? await deleteQueryInBatches(db, db.collection('feedback').where('email', '==', email))
      : 0

    // Uploaded community media lives at community-media/{uid}/*. Storage is
    // optional in this project (uploads fall back to base64 in Firestore), so a
    // missing bucket is reported, never fatal — the user's account should not
    // be held hostage to a service that may not be turned on.
    try {
      const bucket = await adminStorageBucket()
      await bucket.deleteFiles({ prefix: `community-media/${uid}/` })
      deleted.media = 'deleted'
    } catch (err) {
      deleted.media = 'skipped'
      console.error('delete-account: storage sweep skipped', { uid, error: err?.message })
    }

    // ── 3. Auth last. ────────────────────────────────────────────────────────
    await adminAuth().deleteUser(uid)

    console.warn('delete-account: account deleted', { uid, ...deleted, subscriptionsCancelled: billing.cancelled })
    return res.status(200).json({
      ok: true,
      subscriptionsCancelled: billing.cancelled,
      deleted,
    })
  } catch (err) {
    return failRequest(res, {
      status: 500,
      scope: 'delete-account',
      message: 'Your subscription was cancelled but the account could not be fully deleted. Please try again, or contact support with the reference below.',
      err,
      context: { uid },
    })
  }
}
