// The client half of /api/support's idempotency: every form that posts there
// names a message with a request id, so a retry of the same message is stored
// once on the server instead of twice.
//
// The server accepts an id matching /^[A-Za-z0-9_-]{16,64}$/ and creates the
// record only if that id is not already stored (see api/support.js). A form
// keeps its attempt in a ref and asks `requestIdFor` for the id on each send.

/** How long one attempt may take before it is abandoned and reported as failed. */
export const SEND_TIMEOUT_MS = 15000

/**
 * A random token naming one message. Also usable as the id of the local copy,
 * so the same message is one record on both sides.
 */
export function newRequestId() {
  const c = typeof crypto !== 'undefined' ? crypto : null
  if (c?.randomUUID) return `fb-${c.randomUUID()}`
  const bytes = new Uint8Array(16)
  if (c?.getRandomValues) c.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return `fb-${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`
}

/**
 * The request id for sending `payload`. `attemptRef` is a React ref holding the
 * last attempt as `{ fingerprint, id }`: sending identical content again reuses
 * the id (the server stores it once), and any edit gets a new one. Clear the ref
 * (`attemptRef.current = null`) once a message has landed so the next message
 * starts fresh even if its words are the same.
 */
export function requestIdFor(attemptRef, payload) {
  const fingerprint = JSON.stringify(payload)
  if (attemptRef.current?.fingerprint !== fingerprint) {
    attemptRef.current = { fingerprint, id: newRequestId() }
  }
  return attemptRef.current.id
}

/**
 * POST `body` to /api/support. Resolves true only when the server accepted it;
 * a rejected request, a network error and an attempt that outlives
 * SEND_TIMEOUT_MS all resolve false. Never throws.
 */
export async function postSupport(body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
  try {
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
