import { adminAuth, adminDb, credentialProblem } from './_lib/firebase-admin.js'
// One list, shared with /api/ai's diagnostic. Two copies of an allowlist is one
// copy too many — the day they disagree, the disagreement is a hole.
import { ADMIN_EMAILS } from './_lib/admin.js'

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
        await adminAuth().setCustomUserClaims(decoded.uid, { admin: true })
        claimUpdated = true
      } catch (err) {
        // Non-fatal: verification still succeeded, and the dashboard's own
        // read paths do not depend on the claim. Only moderation does, and it
        // will report its own failure.
        console.error('verify-admin: could not set the admin claim', { uid: decoded.uid, error: err?.message })
      }
    }

    if (isAdmin && req.body?.includeUsers === true) {
      try {
        const users = await listAllUsers()
        return res.status(200).json({ isAdmin, uid: decoded.uid, email, users, claimUpdated })
      } catch (err) {
        // Admin verification still succeeded — report the user-list failure
        // separately so the dashboard can fall back to local data.
        return res.status(200).json({ isAdmin, uid: decoded.uid, email, claimUpdated, usersError: err?.message || 'Failed to list users' })
      }
    }

    return res.status(200).json({ isAdmin, uid: decoded.uid, email, claimUpdated })
  } catch {
    return res.status(401).json({ error: credentialProblem() || 'Invalid token', isAdmin: false })
  }
}
