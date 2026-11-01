// Attempt limits and input checks for /api/ai. Files in /api/_lib are not
// deployed as routes.
//
// The quota meter in aiGeneration.js counts GENERATIONS: a call that produces
// nothing gives its unit back, so a failing call is free to repeat. Every
// repeat still reaches the provider, and the provider's free tier is one pool
// for the whole site. These limits count ATTEMPTS instead, and nothing ever
// gives an attempt back:
//
//   per account  6 a minute and 60 an hour   one login cannot loop provider calls
//   per address  30 a day, non-Pro accounts  many throwaway accounts on one
//                                            connection share one allowance
//   site-wide    180 a day, every account    a breaker under the pool's ceiling
//                                            (see the note at the top of plans.js)
//
// They use the same Firestore-backed counters as /api/support and
// /api/create-checkout (rateLimit.js), so the figures hold across instances.
//
// Every counter fails CLOSED (`failOpen: false`) when Firestore is unreachable.
// An uncounted call is a provider call nobody is limiting, and the route
// already needs Firestore to read the plan and reserve the quota unit, so
// refusing here adds no outage the route did not already have.

import { clientIp, consume } from './rateLimit.js'

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export const AI_ABUSE_LIMITS = Object.freeze({
  perUidMinute: Object.freeze({ limit: 6, windowMs: MINUTE_MS }),
  perUidHour: Object.freeze({ limit: 60, windowMs: HOUR_MS }),
  perIpDay: Object.freeze({ limit: 30, windowMs: DAY_MS }),
  siteDay: Object.freeze({ limit: 180, windowMs: DAY_MS }),
})

// The one key every request shares, for the site-wide counter.
const SITE_KEY = 'site'

function waitPhrase(seconds) {
  if (seconds < 90) return `${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 90) return `${minutes} minutes`
  return `${Math.ceil(minutes / 60)} hours`
}

/**
 * Counts this request against every attempt limit. Returns null when it may go
 * ahead, or `{ status, retryAfter, body }` for the first limit that is spent,
 * ready to send: the route sets `Retry-After` from `retryAfter` and sends
 * `body` with `status`.
 *
 * Checked in this order, so a refused account does not spend the shared
 * address or site allowance:
 *   1. account, per minute   (body carries `retryAfter`)
 *   2. account, per hour
 *   3. address, per day      (accounts that are not Pro)
 *   4. site, per day
 *
 * `body.retryAfter` is sent ONLY for the per-minute limit, whose wait is short.
 * The alt-text page sleeps for `retryAfter` seconds and retries when the body
 * has one, which is right for a minute and wrong for an hour or a day. The
 * longer limits send the header and a plain error the page shows as it is.
 *
 * A non-Pro request with no address at all is REFUSED (400), not counted
 * against the account alone: consume() skips an empty key, so passing one
 * through would exempt it from the address limit. Vercel always supplies an
 * address. Nothing is counted for it.
 */
export async function aiAttemptRefusal(db, { uid, req, planId, now = Date.now() }) {
  const ip = clientIp(req)
  const perIp = planId !== 'pro'
  if (perIp && !ip) {
    return {
      status: 400,
      retryAfter: 0,
      body: { error: 'Your connection could not be identified, so the AI tools cannot run from it.' },
    }
  }

  const contended = (verdict) => ({
    status: 429,
    retryAfter: verdict.retryAfter,
    body: {
      error: 'The AI tools could not check your request just now. Try again in a moment.',
      retryAfter: verdict.retryAfter,
      rateLimited: 'busy',
    },
  })

  const minute = await consume(db, { bucket: 'ai-uid-minute', key: uid, ...AI_ABUSE_LIMITS.perUidMinute, now, failOpen: false })
  if (!minute.allowed) {
    if (minute.contended) return contended(minute)
    return {
      status: 429,
      retryAfter: minute.retryAfter,
      body: {
        error: `Too many AI requests in a short time. Wait ${waitPhrase(minute.retryAfter)} and try again.`,
        retryAfter: minute.retryAfter,
        rateLimited: 'minute',
      },
    }
  }

  const hour = await consume(db, { bucket: 'ai-uid-hour', key: uid, ...AI_ABUSE_LIMITS.perUidHour, now, failOpen: false })
  if (!hour.allowed) {
    if (hour.contended) return contended(hour)
    return {
      status: 429,
      retryAfter: hour.retryAfter,
      body: {
        error: `You have made a lot of AI requests this hour. Try again in about ${waitPhrase(hour.retryAfter)}.`,
        rateLimited: 'hour',
      },
    }
  }

  if (perIp) {
    const day = await consume(db, { bucket: 'ai-ip-day', key: ip, ...AI_ABUSE_LIMITS.perIpDay, now, failOpen: false })
    if (!day.allowed) {
      if (day.contended) return contended(day)
      return {
        status: 429,
        retryAfter: day.retryAfter,
        body: {
          error: `Free AI use from this network has reached its daily limit. Try again in about ${waitPhrase(day.retryAfter)}, or upgrade to Pro.`,
          rateLimited: 'ip',
        },
      }
    }
  }

  const site = await consume(db, { bucket: 'ai-site-day', key: SITE_KEY, ...AI_ABUSE_LIMITS.siteDay, now, failOpen: false })
  if (!site.allowed) {
    if (site.contended) return contended(site)
    return {
      status: 429,
      retryAfter: site.retryAfter,
      body: {
        error: `The AI tools have reached their limit for today. Try again in about ${waitPhrase(site.retryAfter)}.`,
        rateLimited: 'site',
      },
    }
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE INPUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The most base64 characters an image field may hold: about 5.2 MB of image,
 * under the route's 8 MB body limit with room for the rest of the request.
 */
export const MAX_IMAGE_BASE64_CHARS = 7_000_000

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

/**
 * Why `image` cannot be sent to a vision model, or null when it can: a
 * non-empty string of standard base64 (no `data:` prefix, no whitespace), padded
 * to a multiple of four, within MAX_IMAGE_BASE64_CHARS. Run before a quota unit
 * is reserved or an attempt is counted, so a malformed request costs nothing.
 */
export function imagePayloadProblem(image) {
  if (typeof image !== 'string' || image.length === 0) return 'image (base64) and mimeType required'
  if (image.length > MAX_IMAGE_BASE64_CHARS) return 'image is too large'
  if (image.length % 4 !== 0 || !BASE64.test(image)) return 'image must be base64'
  return null
}
