// A fixed-window rate limiter backed by Firestore, so counts are shared across
// serverless instances. Files in /api/_lib are not deployed as routes.
//
// Counter documents are keyed by a SHA-256 of `salt:ip`, so no raw address is
// stored. The salt comes from RATE_LIMIT_SALT; when it is unset, each process
// generates a random salt at load.
//
// The `rate-limits` collection has no rule in firestore.rules, so only the
// Admin SDK can read or write it.

import { createHash, randomBytes } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'

const COLLECTION = 'rate-limits'

/**
 * Read once, at module load, so the salt cannot change under a live window.
 */
const SALT = process.env.RATE_LIMIT_SALT || randomBytes(32).toString('hex')

// Logged in production when the salt is generated rather than configured.
if (!process.env.RATE_LIMIT_SALT && process.env.NODE_ENV === 'production') {
  console.warn(
    'rate-limit: RATE_LIMIT_SALT is not set, so this instance generated its own salt. '
    + 'Counters are NOT shared with the other instances of this deployment and the limits are '
    + 'effectively multiplied by the instance count. Set RATE_LIMIT_SALT to fix it.',
  )
}

/**
 * The client's IP: the leftmost `x-forwarded-for` entry (set by the hosting
 * proxy), then `x-real-ip`, then the socket address.
 */
export function clientIp(req) {
  const fwd = req.headers?.['x-forwarded-for']
  const first = Array.isArray(fwd) ? fwd[0] : String(fwd || '').split(',')[0]
  return (first || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || '').trim()
}

export function hashKey(value) {
  return createHash('sha256').update(`${SALT}:${value}`).digest('hex').slice(0, 32)
}

/**
 * Consume one unit against `bucket:key`.
 *
 * Returns `{ allowed, remaining, retryAfter }`, plus `degraded: true` when the
 * counter could not be read. `retryAfter` is whole seconds until the window
 * rolls, suitable for the header of the same name.
 */
export async function consume(db, { bucket, key, limit, windowMs, now = Date.now() }) {
  if (!key) return { allowed: true, remaining: limit, retryAfter: 0 }
  const ref = db.collection(COLLECTION).doc(`${bucket}_${hashKey(key)}`)

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const data = snap.exists ? snap.data() : null
      const previousStart = data?.windowStart

      // A missing document opens a window at `now` (not at 0, which would
      // make every Retry-After computed from the stored start wrong).
      const fresh = previousStart == null || now - previousStart >= windowMs
      const windowStart = fresh ? now : previousStart
      const count = fresh ? 0 : (data?.count || 0)

      if (count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          retryAfter: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)),
        }
      }

      tx.set(ref, {
        count: count + 1,
        windowStart,
        // Only so a TTL policy or a sweep can find stale documents later.
        // Nothing reads it.
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })

      return { allowed: true, remaining: limit - count - 1, retryAfter: 0 }
    })
  } catch (err) {
    console.error('rate-limit: could not read the counter, allowing through', {
      bucket,
      errorMessage: err?.message,
    })
    return { allowed: true, remaining: limit, retryAfter: 0, degraded: true }
  }
}
