import Stripe from 'stripe'
import { adminDb } from './_lib/firebase-admin.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export const config = { api: { bodyParser: false } }

async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

async function upsertSubscription(subscription) {
  const uid = subscription.metadata?.firebaseUid
  if (!uid) {
    const customerId = subscription.customer
    const snap = await adminDb()
      .collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get()
    if (snap.empty) return
    const userUid = snap.docs[0].id
    return writeSubscription(userUid, subscription)
  }
  return writeSubscription(uid, subscription)
}

async function writeSubscription(uid, sub) {
  await adminDb().collection('users').doc(uid).set({
    subscription: {
      id: sub.id,
      status: sub.status,
      priceId: sub.items?.data?.[0]?.price?.id || null,
      interval: sub.items?.data?.[0]?.price?.recurring?.interval || null,
      currentPeriodEnd: sub.current_period_end ? sub.current_period_end * 1000 : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end || false,
      updatedAt: Date.now(),
    },
  }, { merge: true })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await upsertSubscription(event.data.object)
      break
    }
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription)
        await upsertSubscription(sub)
      }
      break
    }
  }

  return res.status(200).json({ received: true })
}
