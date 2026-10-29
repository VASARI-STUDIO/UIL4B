// Shared HTTP error handling for the serverless functions.
// Files in /api/_lib are NOT deployed as routes (underscore-prefixed).
//
// Raw Stripe/Firebase error messages leak internal detail — price ids, customer
// ids, account ids, credential state — so they must never be echoed to the
// browser. But the founder still has to be able to tie "it failed for me" to a
// specific server log line. So the browser gets a fixed, generic message plus a
// short correlation id, and the real error is logged server-side under that
// same id.

import { randomUUID } from 'node:crypto'

export function newCorrelationId() {
  try {
    return randomUUID().replace(/-/g, '').slice(0, 10)
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  }
}

// Logs the real error and responds with a safe, generic body.
// Returns the response so callers can `return failRequest(...)`.
export function failRequest(res, { status = 500, scope, message, err = null, context = null }) {
  const correlationId = newCorrelationId()
  console.error(`${scope} failed [${correlationId}]`, {
    ...(context || {}),
    errorMessage: err?.message || (err == null ? null : String(err)),
    errorCode: err?.code || null,
    errorType: err?.type || null,
    stack: err?.stack || null,
  })
  return res.status(status).json({ error: message, correlationId })
}

// Refuses a request that carries a query key the route does not read. A shared
// cache keys a response on the full query string, so `?x=<random>` on a public
// route makes every request a miss and the function does the expensive work each
// time. A repeated key (`?c=a&c=b`) is a second spelling of the same request and
// is refused too. Returns true when it has answered, so the caller just returns:
//   if (refuseUnexpectedQuery(req, res, ['c', 'img'])) return
export function refuseUnexpectedQuery(req, res, allowed = []) {
  const query = req.query || {}
  for (const key of Object.keys(query)) {
    if (!allowed.includes(key) || Array.isArray(query[key])) {
      res.setHeader('Cache-Control', 'no-store')
      res.status(400).json({ error: 'Unexpected query parameter' })
      return true
    }
  }
  return false
}
