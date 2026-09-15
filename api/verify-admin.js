import { adminAuth, adminDb, credentialProblem } from './_lib/firebase-admin.js'
// One list, shared with /api/ai's diagnostic. Two copies of an allowlist is one
// copy too many — the day they disagree, the disagreement is a hole.
import { ADMIN_EMAILS } from './_lib/admin.js'
// The moderator roster. api/_lib/ is underscore-prefixed and NOT deployed as a
// route, so this adds nothing to the 12-function budget — the same reason the
// cross-user list below piggybacks on this handshake instead of taking a route
// of its own.
import {
  reconcileModeratorClaim, roleFromDecodedToken,
  listModerators, grantModerator, revokeModerator,
  MODERATOR_CLAIM,
} from './_lib/moderators.js'

// Cross-user data for the admin Users tab. Firestore rules make `users/{uid}`
// owner-only, so the client can't read other users' docs — only the Admin SDK
// (which bypasses rules) can, and the 12-function limit rules out a dedicated
// route. Piggybacks on the admin handshake and is only ever returned when the
// caller passed the verified-admin check above.
async function listAllUsers() {
  const authUsers = []
  let pageToken
  do {
    const page = await adminAuth().listUsers(1000, pageToken)
    authUsers.push(...page.users)
    pageToken = page.pageToken
  } while (pageToken)

  const docs = {}
  try {
    const snap = await adminDb().collection('users').get()
    snap.forEach(d => { docs[d.id] = d.data() })
  } catch { /* profiles are enrichment — auth records alone are still useful */ }

  return authUsers.map(u => {
    const d = docs[u.uid] || {}
    const sub = d.subscription || {}
    return {
      uid: u.uid,
      email: u.email || '',
      displayName: u.displayName || d.displayName || '',
      provider: u.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email',
      emailVerified: !!u.emailVerified,
      createdAt: u.metadata?.creationTime || null,
      lastLoginAt: u.metadata?.lastSignInTime || null,
      subscription: { status: sub.status || null, interval: sub.interval || null },
      onboarding: {
        role: d.onboarding?.role || null,
        use: d.onboarding?.use || null,
        source: d.onboarding?.source || null,
      },
      location: d.location || '',
      company: d.company || '',
    }
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated', isAdmin: false })
  }

  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7))
    const email = decoded.email?.toLowerCase()
    // Require a Firebase-verified email — an unverified signup could
    // otherwise register the admin address and pass the allowlist check.
    const isAdmin = !!email && !!decoded.email_verified && ADMIN_EMAILS.includes(email)

    // ── Grant the `admin` custom claim ────────────────────────────────────
    // firestore.rules gates every moderation write on
    // `request.auth.token.admin == true`, and NOTHING IN THIS CODEBASE EVER
    // CALLED setCustomUserClaims. The condition was therefore always false, so
    // approving or deleting a community prompt from the dashboard was rejected
    // by Firestore every single time — the buttons have never worked.
    //
    // This is the right place to fix it: the endpoint has already proved
    // adminness server-side from a verified email against the allowlist, which
    // is strictly stronger than the claim it is granting. Nothing a client
    // sends influences the decision.
    //
    // Idempotent — only written when the claim is missing, because
    // setCustomUserClaims invalidates nothing but does cost a write and forces
    // a token refresh on every call.
    let claimUpdated = false
    if (isAdmin && decoded.admin !== true) {
      try {
        // MERGE, do not replace. setCustomUserClaims overwrites the WHOLE claims
        // object rather than merging into it, so a blind `{ admin: true }` would
        // delete the founder's own `moderator` claim the moment he holds one —
        // and the roster reconciliation below would then have to put it back on
        // the next request. Harmless while `admin` was the only claim in the
        // project; not harmless from the commit that adds a second one.
        const existing = (await adminAuth().getUser(decoded.uid)).customClaims || {}
        await adminAuth().setCustomUserClaims(decoded.uid, { ...existing, admin: true })
        claimUpdated = true
      } catch (err) {
        // Non-fatal: verification still succeeded, and the dashboard's own
        // read paths do not depend on the claim. Only moderation does, and it
        // will report its own failure.
        console.error('verify-admin: could not set the admin claim', { uid: decoded.uid, error: err?.message })
      }
    }

    // ── Keep the moderator claim in step with the roster ──────────────────
    // The roster is the record of the founder's decision; the claim is derived
    // state that can go missing. A claim is per-account and does not survive an
    // account being deleted and recreated, and a setCustomUserClaims call can
    // fail on its own — which this route already treats as non-fatal above.
    // Reconciling on the handshake means a moderator whose claim went missing
    // gets it back by signing in, rather than by the founder noticing. It is
    // also the only thing that TAKES the claim away: revokeModerator drops it
    // at the moment of revocation, and this is what catches the account that
    // was not signed in then.
    //
    // Idempotent: it writes only when the token and the roster disagree.
    //
    // NON-FATAL, AND IT FALLS BACK TO THE SIGNED TOKEN RATHER THAN TO `false`.
    // A roster read that fails must not take the handshake down — verification
    // has already succeeded — and it must not grant anything either. The
    // fallback is therefore exactly what Firebase already signed into this
    // token, which firestore.rules would honour with or without this route: no
    // new authority, and no live moderator knocked out of their queues by a
    // transient Firestore error. `rosterError` is returned rather than
    // swallowed, for the reason `usersError` below already is — a verdict that
    // could not be reached must be distinguishable from one that came back
    // negative.
    let moderator = decoded[MODERATOR_CLAIM] === true
    let rosterError = null
    try {
      const rec = await reconcileModeratorClaim(decoded)
      moderator = rec.moderator
      if (rec.changed) claimUpdated = true
    } catch (err) {
      rosterError = err?.message || 'The moderator roster could not be read'
      console.error('verify-admin: could not reconcile the moderator claim', { uid: decoded.uid, error: err?.message })
    }
    // The role is read from the RECONCILED claim rather than from the token as
    // it arrived. An ID token stays valid for up to an hour, so somebody
    // revoked a minute ago is still carrying `moderator: true` in a perfectly
    // valid token — reporting the token's word would tell the browser to keep
    // rendering queues Firestore is about to refuse. The same applies in the
    // other direction to somebody appointed since their token was minted.
    const role = roleFromDecodedToken({ ...decoded, [MODERATOR_CLAIM]: moderator })

    // ── The founder assigns the role ──────────────────────────────────────
    // Folded into this route rather than spending the 13th Vercel function, the
    // same way `includeUsers` already is, and for the same recorded reason.
    //
    // FOUNDER ONLY, and this is the server half of canAssignModerators() in
    // src/utils/moderation.js. A moderator who can appoint moderators is not a
    // role, it is a self-replicating grant: one careless or compromised
    // moderator account becomes every moderator account, and the founder's
    // liability decision — the whole reason the approval queue exists — stops
    // being his to make. `isAdmin` here is a Firebase-VERIFIED email checked
    // against a server-side allowlist, not the `admin` claim, so the check does
    // not depend on the very claim system it administers.
    const action = typeof req.body?.moderatorAction === 'string' ? req.body.moderatorAction.trim() : ''
    if (action) {
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only the founder may assign moderators', isAdmin, moderator, role })
      }
      // The target comes from the body; the GRANTER never does. Taking
      // grantedByUid from the request would let the audit trail be forged.
      const targetUid = typeof req.body?.targetUid === 'string' ? req.body.targetUid.trim() : ''
      try {
        if (action === 'list') {
          return res.status(200).json({ isAdmin, moderator, role, moderators: await listModerators() })
        }
        if (action === 'grant') {
          if (!targetUid) return res.status(400).json({ error: 'A grant needs a targetUid', isAdmin, moderator, role })
          if (targetUid === decoded.uid) {
            // Not a security hole, just meaningless: he is already a founder,
            // and it would put him on a list he is not on by roster.
            return res.status(400).json({ error: 'You already have every permission a moderator has', isAdmin, moderator, role })
          }
          // Read the account from Firebase rather than trusting the body for the
          // email and name, so the roster records who the uid ACTUALLY is.
          const target = await adminAuth().getUser(targetUid)
          // A verified email is required for any role above `user`, and this is
          // the only place that can enforce it. roleFromClaims() — both copies —
          // refuses an unverified account, but firestore.rules reads the raw
          // `moderator` claim and has no notion of a verified email, so minting
          // one here onto an unverified account would produce the worst possible
          // split: every JavaScript surface calls them a plain user while
          // Firestore lets them delete the queue.
          if (target.emailVerified !== true) {
            return res.status(400).json({
              error: 'A verified email is required for any role above user',
              isAdmin, moderator, role,
            })
          }
          const entry = await grantModerator({
            uid: targetUid,
            email: target.email,
            displayName: target.displayName,
            grantedByUid: decoded.uid,
          })
          return res.status(200).json({ isAdmin, moderator, role, granted: entry })
        }
        if (action === 'revoke') {
          if (!targetUid) return res.status(400).json({ error: 'A revocation needs a targetUid', isAdmin, moderator, role })
          await revokeModerator(targetUid)
          // Stated rather than hidden: an ID token already minted stays valid
          // for up to an hour, so revocation is not instant. Closing that gap
          // needs revokeRefreshTokens plus checkRevoked on every verifying
          // route — wider than this change, and recorded on the pipeline.
          return res.status(200).json({
            isAdmin, moderator, role, revoked: targetUid,
            note: 'Removed from the roster. Their existing session can still act for up to an hour, until its ID token expires.',
          })
        }
        return res.status(400).json({ error: `Unknown moderatorAction: ${action}`, isAdmin, moderator, role })
      } catch (err) {
        return res.status(500).json({ error: err?.message || 'The roster could not be updated', isAdmin, moderator, role })
      }
    }

    if (isAdmin && req.body?.includeUsers === true) {
      try {
        const users = await listAllUsers()
        return res.status(200).json({ isAdmin, uid: decoded.uid, email, users, claimUpdated, moderator, role, rosterError })
      } catch (err) {
        // Admin verification still succeeded — report the user-list failure
        // separately so the dashboard can fall back to local data.
        return res.status(200).json({ isAdmin, uid: decoded.uid, email, claimUpdated, moderator, role, rosterError, usersError: err?.message || 'Failed to list users' })
      }
    }

    return res.status(200).json({ isAdmin, uid: decoded.uid, email, claimUpdated, moderator, role, rosterError })
  } catch {
    return res.status(401).json({ error: credentialProblem() || 'Invalid token', isAdmin: false })
  }
}
