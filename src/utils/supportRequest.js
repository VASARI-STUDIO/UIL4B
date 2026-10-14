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
  return (await supportAttempt(body)).ok
}

async function supportAttempt(body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
  try {
    const serialized = JSON.stringify(body)
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serialized,
      keepalive: new TextEncoder().encode(serialized).byteLength < 60 * 1024,
      signal: controller.signal,
    })
    return { ok: res.ok, status: res.status }
  } catch {
    return { ok: false, status: 0 }
  } finally {
    clearTimeout(timer)
  }
}

/** Retry transient failures once, keeping the exact message and request id. */
export async function postSupportWithRetry(body, { retry = true } = {}) {
  let result = await supportAttempt(body)
  if (retry && !result.ok && (!result.status || result.status >= 500 || result.status === 408)) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    result = await supportAttempt(body)
  }
  return result
}

/** Claim the send synchronously so rapid submits cannot start a second request. */
export function startSupportSend(sendingRef, body, options) {
  if (sendingRef.current || !body) return null
  sendingRef.current = true
  return postSupportWithRetry(body, options).finally(() => { sendingRef.current = false })
}

/** Return to the filled form, retaining its id unless a new seed replaces it. */
export function recoverFeedbackDraft(bodyRef, attemptRef, seed = null) {
  const preserve = !!attemptRef.current && !seed
  bodyRef.current = null
  if (seed) attemptRef.current = null
  return preserve
}

/** Register only while delivery is pending or a final failure is undismissed. */
export function guardSupportUnload(active, target = window) {
  if (!active) return undefined
  const guard = event => {
    event.preventDefault()
    event.returnValue = ''
  }
  target.addEventListener('beforeunload', guard)
  return () => target.removeEventListener('beforeunload', guard)
}

export function supportError(status) {
  return status === 429
    ? 'Too many messages just now. Try again in a minute.'
    : "Your message didn't send."
}

/** Retain delivery and its draft across surface closure and route unmounts. */
export function createSupportHolder() {
  let state = { status: 'idle', body: null, draft: null, result: null }
  const listeners = new Set()
  const sending = { current: false }
  const publish = next => { state = next; listeners.forEach(listener => listener()) }
  const holder = {
    getSnapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    reset: () => { if (!sending.current) publish({ status: 'idle', body: null, draft: null, result: null }) },
    edit: () => { if (!sending.current) publish({ ...state, status: 'editing' }) },
    send(body, draft, { retry = true, visible, notify } = {}) {
      const pending = startSupportSend(sending, body, { retry })
      if (!pending) return null
      publish({ status: 'sending', body, draft, result: null })
      return pending.then(result => {
        publish({ ...state, status: result.ok ? 'sent' : 'failed', result })
        if (!result.ok && !visible?.()) {
          notify?.(result.status, () => holder.send(body, draft, { retry: false, visible, notify }))
        }
        return result
      })
    },
  }
  return holder
}

export const modalFeedbackSend = createSupportHolder()
export const pageFeedbackSend = createSupportHolder()
