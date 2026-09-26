// Origins the Stripe flows are allowed to send a user back to.
// Files in /api/_lib are NOT deployed as routes (underscore-prefixed).
//
// `return_url` is attacker-influenced (it is derived from the request's Origin
// / Referer), so the allowlist is the only thing stopping a checkout or billing
// portal from returning the user to someone else's page. The dev origin is
// therefore compiled out of production.
//
// Only the custom domains are allowed; DEFAULT_ORIGIN is the canonical site.

const PRODUCTION_ORIGINS = [
  'https://uil4b.com',
  'https://www.uil4b.com',
]

const DEV_ORIGIN = 'http://localhost:5173'

// The canonical site origin — the same string as SITE_ORIGIN in
// src/utils/routeMeta.js (tests/unit/origins.test.js holds them together).
// While www is the primary host on Vercel the apex 308s there with the query
// string intact, so a Stripe return_url built from it still arrives.
export const DEFAULT_ORIGIN = 'https://uil4b.com'

export function allowedOrigins() {
  return process.env.NODE_ENV === 'production'
    ? PRODUCTION_ORIGINS
    : [...PRODUCTION_ORIGINS, DEV_ORIGIN]
}

// Resolves the request's origin against the allowlist, falling back to the
// canonical production origin rather than trusting the header.
//
// The match is EXACT. A prefix test would accept `https://uil4b.com.evil.com`
// for the `https://uil4b.com` entry — harmless while this returns the
// allowlisted constant rather than the caller's string, but not a property
// worth depending on. An Origin header is scheme + host + optional port with no
// path, and the referer fallback strips the path, so every real allowlisted
// origin still matches.
export function resolveOrigin(req) {
  const rawOrigin = req.headers.origin || req.headers.referer?.replace(/\/[^/]*$/, '')
  return allowedOrigins().find((o) => o === rawOrigin) || DEFAULT_ORIGIN
}
