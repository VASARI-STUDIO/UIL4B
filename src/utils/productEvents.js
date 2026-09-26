// Activation events for Vercel Web Analytics — the funnel, for everyone.
//
// The existing counters in utils/analytics.js write to Firestore, and only for
// a signed-in account, so a signed-out visitor, which is most of them,
// never appeared in the funnel at all. These five go to Vercel Web Analytics
// through `track()`, which needs no account:
//
//   first_tool_used      the first real interaction inside any Create tool
//   first_copy_export    the first copy or export of a result (activation)
//   sign_up              a new account, email or Google
//   checkout_started     the embedded Stripe checkout asked for a session
//   upgrade_gate_shown   any Pro gate opened (one event, a gate id)
//
// "first_" events fire once per browser (localStorage), so they count people,
// not clicks.
//
// NO PII, BY CONSTRUCTION. Properties pass an allowlist of keys, every value
// is a short string, number or boolean, and a string that looks like an email
// address is dropped. Nothing here reads the account. Custom events need a
// Vercel plan that includes them; on one that does not, track() is a no-op.
import { track } from '@vercel/analytics'

export const EVENTS = Object.freeze({
  firstToolUsed: 'first_tool_used',
  firstCopyExport: 'first_copy_export',
  signUp: 'sign_up',
  checkoutStarted: 'checkout_started',
  upgradeGateShown: 'upgrade_gate_shown',
})

const ALLOWED_KEYS = Object.freeze(['tool', 'kind', 'plan', 'gate'])
const MAX_LEN = 48

/** Only allowlisted keys, only short primitive values, never an address. */
export function cleanProps(props) {
  const out = {}
  if (!props || typeof props !== 'object') return out
  for (const key of ALLOWED_KEYS) {
    const v = props[key]
    if (typeof v === 'number' || typeof v === 'boolean') out[key] = v
    else if (typeof v === 'string' && v && !v.includes('@')) out[key] = v.slice(0, MAX_LEN)
  }
  return out
}

function queueReady() {
  // <Analytics /> in main.jsx installs this same queue when it mounts, and
  // keeps an existing one (`if (window.va) return`). Installing it here means
  // an event raised before that mount is queued, not dropped.
  if (typeof window === 'undefined') return
  if (!window.va) {
    window.va = function va(...params) {
      if (!window.vaq) window.vaq = []
      window.vaq.push(params)
    }
  }
}

export function sendEvent(name, props, { send = track } = {}) {
  try {
    queueReady()
    send(name, cleanProps(props))
    return true
  } catch {
    // Analytics never breaks the thing being measured.
    return false
  }
}

function localStore() {
  try { return window.localStorage } catch { return null }
}

/** Once per browser. Returns whether it sent. */
export function sendOnce(name, props, { storage = localStore(), send = track } = {}) {
  const key = `uil4b-event-once:${name}`
  try {
    if (!storage || storage.getItem(key)) return false
    storage.setItem(key, '1')
  } catch {
    return false
  }
  return sendEvent(name, props, { send })
}
