// Origins the Stripe flows are allowed to send a user back to.
// Files in /api/_lib are NOT deployed as routes (underscore-prefixed).
//
// `return_url` is attacker-influenced (it is derived from the request's Origin
// / Referer), so the allowlist is the only thing stopping a checkout or billing
// portal from returning the user to someone else's page. The dev origin is
// therefore compiled out of production.

const PRODUCTION_ORIGINS = [
  'https://uil4b.vercel.app',
  'https://uil4b.com',
  'https://www.uil4b.com',
]

const DEV_ORIGIN = 'http://localhost:5173'

export const DEFAULT_ORIGIN = PRODUCTION_ORIGINS[0]

export function allowedOrigins() {
  return process.env.NODE_ENV === 'production'
    ? PRODUCTION_ORIGINS
    : [...PRODUCTION_ORIGINS, DEV_ORIGIN]
}

// Resolves the request's origin against the allowlist, falling back to the
// canonical production origin rather than trusting the header.
export function resolveOrigin(req) {
  const rawOrigin = req.headers.origin || req.headers.referer?.replace(/\/[^/]*$/, '')
  return allowedOrigins().find((o) => rawOrigin?.startsWith(o)) || DEFAULT_ORIGIN
}
