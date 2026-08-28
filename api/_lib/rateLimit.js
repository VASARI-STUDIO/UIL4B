// A fixed-window rate limiter backed by Firestore.
// Files in /api/_lib are underscore-prefixed and NOT deployed as routes.
//
// WHY FIRESTORE AND NOT A MODULE-LEVEL MAP
// Serverless functions are horizontally scaled and recycled at will. An
// in-memory counter is per-instance, so N concurrent instances give an attacker
// N times the allowance, and a cold start resets it to zero. A limiter that can
// be reset by sending traffic faster is not a limiter.
//
// WHY THE KEY IS HASHED
// The counter documents are keyed by client IP. An IP is personal data, and
// these documents outlive the request; storing a SHA-256 of `ip + salt` keeps
// the limiter exact while leaving nothing in the database that identifies
// anyone. The salt is per-deployment (RATE_LIMIT_SALT) so the hashes cannot be
// reversed with a dictionary of the whole IPv4 space, and falls back to a
// constant when unset — the fallback is weaker, and is documented rather than
// silently relied on.
//
// The `rate-limits` collection has NO rule in firestore.rules, which means
// Firestore denies every client read and write to it by default. Only the Admin
// SDK, which bypasses rules, can touch it.

import { createHash } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'

const COLLECTION = 'rate-limits'

/**
 * The client's IP, as far as it can be known behind a proxy.
 *
 * `x-forwarded-for` is a client-supplied header everywhere except behind a
 * proxy that overwrites it — Vercel does overwrite it, and the LEFTMOST entry
 * is the one it sets. Taking the rightmost (a common suggestion, and correct on
 * some other platforms) would read a value the client controls here.
 */
export function clientIp(req) {
  const fwd = req.headers?.['x-forwarded-for']
  const first = Array.isArray(fwd) ? fwd[0] : String(fwd || '').split(',')[0]
  return (first || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || '').trim()
}

export function hashKey(value) {
  const salt = process.env.RATE_LIMIT_SALT || 'uil4b-rate-limit'
  return createHash('sha256').update(`${salt}:${value}`).digest('hex').slice(0, 32)
}

/**
 * Consume one unit against `bucket:key`.
 *
 * Returns `{ allowed, remaining, retryAfter }`. `retryAfter` is whole seconds
 * until the window rolls, suitable for the header of the same name.
 *
 * FAILS OPEN, DELIBERATELY. If Firestore is unreachable the request is allowed
 * through: a support form that stops accepting bug reports the moment the
 * database wobbles turns a availability blip into total loss of the channel
 * users report it on. The trade is stated rather than assumed — this limiter
 * exists to stop casual abuse and runaway cost, not to be a security boundary.
 */
export async function consume(db, { bucket, key, limit, windowMs, now = Date.now() }) {
  if (!key) return { allowed: true, remaining: limit, retryAfter: 0 }
  const ref = db.collection(COLLECTION).doc(`${bucket}_${hashKey(key)}`)

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const data = snap.exists ? snap.data() : null
      const previousStart = data?.windowStart

      // A MISSING document opens a window at `now`. Writing `windowStart || 0`
      // and testing `now - 0 >= windowMs` looks equivalent — it is true for
      // every real epoch timestamp — but it pins a first-ever request's window
      // to 1970, so the stored start is wrong from the first write and every
      // Retry-After computed from it is off by the whole window. A unit test on
      // a small synthetic clock is what surfaced it.
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
