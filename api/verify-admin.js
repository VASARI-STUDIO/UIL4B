import { adminAuth, adminDb, credentialProblem } from './_lib/firebase-admin.js'
// The server administrator allowlist.
import { isAdminEmail } from './_lib/adminEmails.js'
// The CORS allowlist, shared with /api/support and the Stripe flows.
import { allowedOrigins } from './_lib/origins.js'
// The moderator roster. Files in api/_lib are not deployed as routes.
import {
  reconcileModeratorClaim, roleFromDecodedToken,
  listModerators, grantModerator, revokeModerator,
  MODERATOR_CLAIM,
} from './_lib/moderators.js'

// Cross-user data for the admin Users tab. `users/{uid}` is owner-only in the
// Firestore rules, so it is read here with the Admin SDK and returned only to a
// caller that passed the verified-admin check.
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
      // intervalCount tells quarterly (month × 3) from monthly; see
      // src/utils/billingCadence.js, which Admin labels the plan with.
      subscription: { status: sub.status || null, interval: sub.interval || null, intervalCount: sub.intervalCount || null },
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
  // Only allowlisted origins are reflected; any other origin gets no CORS
  // header. Same allowlist as api/support.js.
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
    return res.status(401).json({ error: 'Not authenticated', isAdmin: false })
  }

  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7))
    const email = decoded.email?.toLowerCase()
    // Administrator status requires a Firebase-verified email on the allowlist.
    const isAdmin = !!email && !!decoded.email_verified && isAdminEmail(email)

    // ── Grant the `admin` custom claim ────────────────────────────────────
    // Firestore rules gate moderation writes on `request.auth.token.admin`.
    // The claim is set here, after the server-side allowlist check, and only
    // when it is missing.
    let claimUpdated = false
    if (isAdmin && decoded.admin !== true) {
      try {
        // Merge with the existing claims: setCustomUserClaims replaces the
        // whole claims object.
        const existing = (await adminAuth().getUser(decoded.uid)).customClaims || {}
        await adminAuth().setCustomUserClaims(decoded.uid, { ...existing, admin: true })
        claimUpdated = true
      } catch (err) {
        // Non-fatal: verification succeeded, and moderation reports its own
        // failure.
        console.error('verify-admin: could not set the admin claim', { uid: decoded.uid, error: err?.message })
      }
    }

    // ── Keep the moderator claim in step with the roster ──────────────────
    // The roster is the source of truth and the claim is derived from it. It
    // is reconciled on every handshake and written only when the two differ.
    // If the roster cannot be read, the claim already on the signed token is
    // kept and `rosterError` is returned.
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
    // The role is derived from the reconciled claim, not the incoming token, so
    // roster changes are reflected before the token refreshes.
    const role = roleFromDecodedToken({ ...decoded, [MODERATOR_CLAIM]: moderator })

    // ── Moderator assignment ──────────────────────────────────────────────
    // Administrators only; the server half of canAssignModerators() in
    // src/utils/moderation.js. `isAdmin` is the verified-email allowlist check,
    // not the `admin` claim.
    const action = typeof req.body?.moderatorAction === 'string' ? req.body.moderatorAction.trim() : ''
    if (action) {
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only an administrator can assign moderators', isAdmin, moderator, role })
      }
      // The target comes from the body; the granter is always the verified
      // caller.
      const targetUid = typeof req.body?.targetUid === 'string' ? req.body.targetUid.trim() : ''
      try {
        if (action === 'list') {
          return res.status(200).json({ isAdmin, moderator, role, moderators: await listModerators() })
        }
        if (action === 'grant') {
          if (!targetUid) return res.status(400).json({ error: 'A grant needs a targetUid', isAdmin, moderator, role })
          if (targetUid === decoded.uid) {
            // An administrator already has every moderator permission.
            return res.status(400).json({ error: 'You already have every permission a moderator has', isAdmin, moderator, role })
          }
          // Read the account from Firebase rather than trusting the body for the
          // email and name, so the roster records who the uid ACTUALLY is.
          const target = await adminAuth().getUser(targetUid)
          // Any role above `user` requires a verified email.
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
        // Verification succeeded; report the user-list failure separately so
        // the dashboard can fall back to local data.
        return res.status(200).json({ isAdmin, uid: decoded.uid, email, claimUpdated, moderator, role, rosterError, usersError: err?.message || 'Failed to list users' })
      }
    }

    return res.status(200).json({ isAdmin, uid: decoded.uid, email, claimUpdated, moderator, role, rosterError })
  } catch {
    return res.status(401).json({ error: credentialProblem() || 'Invalid token', isAdmin: false })
  }
}
