// The client half of /api/support's idempotency: every form that posts there
// names a message with a request id, so a retry of the same message is stored
// once on the server instead of twice.
//
// The server accepts an id matching /^[A-Za-z0-9_-]{16,64}$/ and creates the
// record only if that id is not already stored (see api/support.js). A form
// keeps its attempt in a ref and asks `requestIdFor` for the id on each send.

/** How long one attempt may take before it is abandoned and reported as failed. */
export const SEND_TIMEOUT_MS = 15000

/** The longest message /api/support accepts (MESSAGE_MAX there); fields cap input to match. */
export const SUPPORT_MESSAGE_MAX = 5000

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

async function supportAttempt(body, idToken) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
  try {
    const serialized = JSON.stringify(body)
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: idToken
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }
        : { 'Content-Type': 'application/json' },
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

/**
 * Retry transient failures once, keeping the exact message and request id.
 * `stale` (optional) says the sender's account has changed since the attempt
 * began; a stale send makes no retry. `idToken` (optional) is the sender's
 * Firebase ID token, sent as a Bearer header for the server to verify.
 */
export async function postSupportWithRetry(body, { retry = true, stale, idToken } = {}) {
  let result = await supportAttempt(body, idToken)
  if (retry && !stale?.() && !result.ok && (!result.status || result.status >= 500 || result.status === 408)) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    if (stale?.()) return result
    result = await supportAttempt(body, idToken)
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

/**
 * Whether a surface opening now must discard the delivery it holds: a landed
 * message never greets the next opening, and a seeded opening (a crash report,
 * a right-click report) always shows its own content, not an earlier failure.
 * A send still in flight is never discarded.
 */
export function staleDelivery(status, seeded) {
  return status === 'sent' || (!!seeded && (status === 'failed' || status === 'editing'))
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
  // Replaced (not cleared) by invalidate(), so an attempt abandoned on an
  // account change cannot clear the flag of the next account's send.
  let sending = { current: false }
  // Bumped on every account change; a send made under an older value is stale.
  let epoch = 0
  let lastRetry = null
  const publish = next => { state = next; listeners.forEach(listener => listener()) }
  const holder = {
    getSnapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    /**
     * The account changed (sign-out, or a different account signing in): forget
     * everything held, including a send still in flight. That send's outcome is
     * dropped, it makes no retry, and a retry button already offered does nothing
     * and is taken down.
     */
    invalidate() {
      epoch += 1
      sending = { current: false }
      if (lastRetry && typeof window !== 'undefined' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('uil4b:toast-dismiss', { detail: { onAction: lastRetry } }))
      }
      lastRetry = null
      publish({ status: 'idle', body: null, draft: null, result: null })
    },
    epoch: () => epoch,
    reset: () => { if (!sending.current) publish({ status: 'idle', body: null, draft: null, result: null }) },
    // A landed message is done with: drop it (and the address it carried).
    settle: () => { if (state.status === 'sent') holder.reset() },
    edit: () => { if (!sending.current) publish({ ...state, status: 'editing' }) },
    send(body, draft, { retry = true, visible, notify } = {}) {
      const mine = epoch
      const stale = () => epoch !== mine
      const pending = startSupportSend(sending, body, { retry, stale })
      if (!pending) return null
      publish({ status: 'sending', body, draft, result: null })
      return pending.then(result => {
        if (stale()) return result
        publish({ ...state, status: result.ok ? 'sent' : 'failed', result })
        if (!result.ok && !visible?.()) {
          const retryAgain = () => {
            if (stale()) return
            return holder.send(body, draft, { retry: false, visible, notify })
          }
          lastRetry = retryAgain
          notify?.(result.status, retryAgain)
        }
        return result
      })
    },
  }
  return holder
}

export const modalFeedbackSend = createSupportHolder()
export const pageFeedbackSend = createSupportHolder()

/**
 * On an account change (sign-out, or a different account signing in), drop what
 * both holders keep: the pending send, its retry, the draft and the sender's
 * address, which rides in the held body.
 */
export function forgetSupportSenders() {
  modalFeedbackSend.invalidate()
  pageFeedbackSend.invalidate()
}
