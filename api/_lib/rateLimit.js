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
// reversed with a dictionary of the whole IPv4 space.
//
// THE CONSTANT FALLBACK IS GONE, AND WHY
// This used to fall back to the literal 'uil4b-rate-limit' when RATE_LIMIT_SALT
// was unset — documented as "weaker", which was true while the repository was
// private and false the moment it was not. A salt published in the source is a
// salt an attacker has: the whole IPv4 space is 4.3 billion SHA-256s, which is
// minutes of work, so every stored hash became a stored IP address. A known
// constant is not a weaker salt, it is no salt.
//
// An unset variable now gets a random one, generated once per process, because
// the two alternatives are both worse. Refusing to hash would throw out of
// `consume` before its try block and turn a missing env var into a 500 on a
// route that is documented below as failing OPEN. Keeping any literal at all
// puts us back where we started.
//
// WHAT THE PER-PROCESS SALT COSTS, said plainly because it contradicts the
// section above: hashes stop being comparable between instances, so each one
// counts into its own document and N concurrent instances give an attacker N
// windows — the same defect "WHY FIRESTORE AND NOT A MODULE-LEVEL MAP" exists to
// avoid. That is the price of an UNSET variable only, it is announced in the
// logs rather than silent, and it buys a limiter that is approximate over a
// database of reversible IP addresses. Set RATE_LIMIT_SALT (see .env.example)
// and the limiter is exact again.
//
// The `rate-limits` collection has NO rule in firestore.rules, which means
// Firestore denies every client read and write to it by default. Only the Admin
// SDK, which bypasses rules, can touch it.

import { createHash, randomBytes } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'

const COLLECTION = 'rate-limits'

/**
 * Read ONCE, at module load. Re-reading `process.env` per call would let the
 * salt change under a live window and orphan every counter written before it.
 */
const SALT = process.env.RATE_LIMIT_SALT || randomBytes(32).toString('hex')

// Announced, not silent. A rate limiter that quietly became per-instance is a
// rate limiter nobody knows they are missing; NODE_ENV is only 'production' in
// a real deployment, so this never adds a line to the test output.
if (!process.env.RATE_LIMIT_SALT && process.env.NODE_ENV === 'production') {
  console.warn(
    'rate-limit: RATE_LIMIT_SALT is not set, so this instance generated its own salt. '
    + 'Counters are NOT shared with the other instances of this deployment and the limits are '
    + 'effectively multiplied by the instance count. Set RATE_LIMIT_SALT to fix it.',
  )
}

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
  return createHash('sha256').update(`${SALT}:${value}`).digest('hex').slice(0, 32)
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
