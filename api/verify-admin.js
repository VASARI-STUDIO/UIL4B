import { adminAuth, adminDb, credentialProblem } from './_lib/firebase-admin.js'

const ADMIN_EMAILS = ['dylanjacob1100@gmail.com']

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

    if (isAdmin && req.body?.includeUsers === true) {
      try {
        const users = await listAllUsers()
        return res.status(200).json({ isAdmin, uid: decoded.uid, email, users })
      } catch (err) {
        // Admin verification still succeeded — report the user-list failure
        // separately so the dashboard can fall back to local data.
        return res.status(200).json({ isAdmin, uid: decoded.uid, email, usersError: err?.message || 'Failed to list users' })
      }
    }

    return res.status(200).json({ isAdmin, uid: decoded.uid, email })
  } catch {
    return res.status(401).json({ error: credentialProblem() || 'Invalid token', isAdmin: false })
  }
}
