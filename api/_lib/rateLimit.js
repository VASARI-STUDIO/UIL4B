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
 * The client's IP: `x-vercel-forwarded-for` (set by Vercel's edge and replaced,
 * not appended to, so a caller cannot choose it), then the leftmost
 * `x-forwarded-for` entry, then `x-real-ip`, then the socket address.
 */
export function clientIp(req) {
  const vercel = req.headers?.['x-vercel-forwarded-for']
  const vercelFirst = Array.isArray(vercel) ? vercel[0] : String(vercel || '').split(',')[0]
  if (vercelFirst && vercelFirst.trim()) return vercelFirst.trim()
  const fwd = req.headers?.['x-forwarded-for']
  const first = Array.isArray(fwd) ? fwd[0] : String(fwd || '').split(',')[0]
  return (first || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || '').trim()
}

export function hashKey(value) {
  return createHash('sha256').update(`${SALT}:${value}`).digest('hex').slice(0, 32)
}

// Firestore (gRPC) codes, numeric or as the string form the SDK also uses, that
// mean the database could not be reached or did not answer in time. Only these
// let a request through when the counter cannot be read.
const OUTAGE_CODES = new Set([4, 14, 'deadline-exceeded', 'unavailable', 'DEADLINE_EXCEEDED', 'UNAVAILABLE'])

// How long a caller whose count was lost to contention is told to wait.
const CONTENTION_RETRY_SECONDS = 2

/**
 * Consume one unit against `bucket:key`.
 *
 * Returns `{ allowed, remaining, retryAfter }`. `retryAfter` is whole seconds
 * until the window rolls, suitable for the header of the same name.
 *
 * When the counter cannot be updated:
 *   - a genuine outage on the first attempt (unavailable, deadline exceeded)
 *     fails OPEN, with `degraded: true`, so a database blip does not take the
 *     support form down;
 *   - anything else fails CLOSED with `contended: true`. A transaction that was
 *     retried and then aborted means many requests are hitting this one counter
 *     at once, and letting those through would let a burst walk past the limit.
 */
export async function consume(db, { bucket, key, limit, windowMs, now = Date.now() }) {
  if (!key) return { allowed: true, remaining: limit, retryAfter: 0 }
  const ref = db.collection(COLLECTION).doc(`${bucket}_${hashKey(key)}`)

  // Times the transaction body ran: more than once means Firestore retried it
  // because another request changed the counter underneath it.
  let attempts = 0

  try {
    return await db.runTransaction(async (tx) => {
      attempts += 1
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
    if (attempts <= 1 && OUTAGE_CODES.has(err?.code)) {
      console.error('rate-limit: database unreachable, allowing through', { bucket, code: err?.code })
      return { allowed: true, remaining: limit, retryAfter: 0, degraded: true }
    }
    console.error('rate-limit: could not update the counter, refusing', { bucket, code: err?.code, attempts, errorMessage: err?.message })
    return { allowed: false, remaining: 0, retryAfter: CONTENTION_RETRY_SECONDS, contended: true }
  }
}
