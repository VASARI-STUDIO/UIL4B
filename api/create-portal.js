import Stripe from 'stripe'
import { adminAuth, adminDb } from './_lib/firebase-admin.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' })
  }

  let uid
  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7))
    uid = decoded.uid
  } catch {
    return res.status(401).json({ error: 'Invalid auth token' })
  }

  const userDoc = await adminDb().collection('users').doc(uid).get()
  const customerId = userDoc.exists ? userDoc.data()?.stripeCustomerId : null

  if (!customerId) {
    return res.status(400).json({ error: 'No subscription found' })
  }

  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://uil4b.vercel.app'

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/settings`,
  })

  return res.status(200).json({ url: session.url })
}
