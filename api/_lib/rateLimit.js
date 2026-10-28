// A fixed-window rate limiter backed by Firestore, so counts are shared across
// serverless instances. Files in /api/_lib are not deployed as routes.
//
// Counter documents are keyed by a SHA-256 of `salt:ip`, so no raw address is
// stored. The salt comes from RATE_LIMIT_SALT; when it is unset, each process
// generates a random salt at load, which gives every instance its own counters.
// That is tolerable while developing and wrong in production, where `consume`
// refuses every call instead (see saltMissingInProduction).
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

const SALT_CONFIGURED = Boolean(process.env.RATE_LIMIT_SALT)

/**
 * True on a production deployment. VERCEL_ENV separates production from preview
 * (both run with NODE_ENV=production on Vercel); NODE_ENV decides only where
 * Vercel's variable is absent. Read per call, so tests can switch it.
 */
function isProduction() {
  const vercelEnv = process.env.VERCEL_ENV
  return vercelEnv ? vercelEnv === 'production' : process.env.NODE_ENV === 'production'
}

// Without a shared salt each instance writes to its own counter documents, so
// every limit is multiplied by the instance count and resets on a cold start.
// In production that is a silent hole, so the limiter refuses instead, which
// surfaces the missing setting at deploy. Logged once per instance.
let warnedMissingSalt = false
function saltMissingInProduction() {
  if (SALT_CONFIGURED || !isProduction()) return false
  if (!warnedMissingSalt) {
    warnedMissingSalt = true
    console.error(
      'rate-limit: RATE_LIMIT_SALT is not set in production, so every rate-limited request is being '
      + 'refused. Counters cannot be shared between instances without it. Set RATE_LIMIT_SALT in the '
      + 'deployment environment.',
    )
  }
  return true
}

/**
 * Collapses an address to the unit one subscriber controls. IPv4 stays whole.
 * IPv6 becomes its /64 prefix, because a home or mobile connection is routinely
 * handed a whole /64 and can present 2^64 addresses from it. An IPv4-mapped IPv6
 * address (`::ffff:1.2.3.4`, or its hex form) is treated as the IPv4 address it
 * wraps. Input that is not an address is returned trimmed and unchanged.
 */
export function normaliseIp(raw) {
  const original = String(raw || '').trim()
  let ip = original
  if (ip.startsWith('[') && ip.includes(']')) ip = ip.slice(1, ip.indexOf(']'))
  if (!ip.includes(':')) return original
  const zone = ip.indexOf('%')
  if (zone !== -1) ip = ip.slice(0, zone)

  // An embedded dotted IPv4 tail (`::ffff:1.2.3.4`) becomes two hex groups.
  const dotted = ip.match(/^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (dotted) {
    const octets = dotted.slice(2).map(Number)
    if (octets.some((o) => o > 255)) return original
    const hex = (a, b) => ((a << 8) | b).toString(16)
    ip = `${dotted[1]}${hex(octets[0], octets[1])}:${hex(octets[2], octets[3])}`
  }

  // Expand `::` to the zero groups it stands for, giving exactly eight groups.
  const halves = ip.split('::')
  if (halves.length > 2) return original
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const gap = 8 - head.length - tail.length
  if (halves.length === 1 ? gap !== 0 : gap < 1) return original
  const groups = [...head, ...Array(halves.length === 2 ? gap : 0).fill('0'), ...tail]
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/i.test(g))) return original
  const words = groups.map((g) => parseInt(g, 16))

  if (words.slice(0, 5).every((w) => w === 0) && words[5] === 0xffff) {
    return [words[6] >> 8, words[6] & 255, words[7] >> 8, words[7] & 255].join('.')
  }
  return `${words.slice(0, 4).map((w) => w.toString(16)).join(':')}::/64`
}

/**
 * The client's IP: `x-vercel-forwarded-for` (set by Vercel's edge and replaced,
 * not appended to, so a caller cannot choose it), then the leftmost
 * `x-forwarded-for` entry, then `x-real-ip`, then the socket address. Passed
 * through normaliseIp, so an IPv6 client is identified by its /64.
 */
export function clientIp(req) {
  const vercel = req.headers?.['x-vercel-forwarded-for']
  const vercelFirst = Array.isArray(vercel) ? vercel[0] : String(vercel || '').split(',')[0]
  if (vercelFirst && vercelFirst.trim()) return normaliseIp(vercelFirst)
  const fwd = req.headers?.['x-forwarded-for']
  const first = Array.isArray(fwd) ? fwd[0] : String(fwd || '').split(',')[0]
  return normaliseIp(first || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || '')
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
 *     support form down. With `failOpen: false` (a path where an uncounted
 *     request costs money, such as checkout) the same outage refuses instead;
 *   - anything else fails CLOSED with `contended: true`. A transaction that was
 *     retried and then aborted means many requests are hitting this one counter
 *     at once, and letting those through would let a burst walk past the limit.
 */
export async function consume(db, { bucket, key, limit, windowMs, now = Date.now(), failOpen = true }) {
  if (saltMissingInProduction()) {
    return { allowed: false, remaining: 0, retryAfter: CONTENTION_RETRY_SECONDS, contended: true }
  }
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
    if (failOpen && attempts <= 1 && OUTAGE_CODES.has(err?.code)) {
      console.error('rate-limit: database unreachable, allowing through', { bucket, code: err?.code })
      return { allowed: true, remaining: limit, retryAfter: 0, degraded: true }
    }
    console.error('rate-limit: could not update the counter, refusing', { bucket, code: err?.code, attempts, errorMessage: err?.message })
    return { allowed: false, remaining: 0, retryAfter: CONTENTION_RETRY_SECONDS, contended: true }
  }
}
