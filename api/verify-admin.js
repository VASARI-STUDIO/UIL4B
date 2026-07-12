import { adminAuth, credentialProblem } from './_lib/firebase-admin.js'

const ADMIN_EMAILS = ['dylanjacob1100@gmail.com']

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
    return res.status(200).json({ isAdmin, uid: decoded.uid, email })
  } catch {
    return res.status(401).json({ error: credentialProblem() || 'Invalid token', isAdmin: false })
  }
}
