// Keeps the admin's unsaved price draft across a sign-in.
//
// The price route wants a sign-in from the last few minutes, and for an account
// that cannot re-prove itself in place the admin page signs out and lets the
// person sign in again, which unmounts the panel and loses what they typed.
// The draft is parked in sessionStorage (this tab only, gone when it closes)
// before the sign-out and handed back once, after the sign-in.
//
// Keyed by the admin's uid, so a draft is never restored into a different
// account's session, and it expires after DRAFT_TTL_MS so an old draft is not
// quietly restored over prices that have changed since.
//
// The storage object is passed in so the functions can be tested without a
// browser. Every storage failure (private mode, quota) is swallowed: the draft
// is a convenience and its loss must never block signing in.

export const DRAFT_TTL_MS = 30 * 60 * 1000

const keyFor = (uid) => `uil4b-admin-price-draft:${uid}`

/** A draft is `{ interval: { currency: amount } }`; anything else is not restored. */
function looksLikeDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every((byCurrency) => (
    byCurrency && typeof byCurrency === 'object' && !Array.isArray(byCurrency)
    && Object.values(byCurrency).every((amt) => typeof amt === 'string' || typeof amt === 'number')
  ))
}

/** Park `draft` for `uid`. Returns true when it was stored. */
export function stashPriceDraft(storage, uid, draft, now = Date.now()) {
  if (!storage || !uid || !looksLikeDraft(draft)) return false
  try {
    storage.setItem(keyFor(uid), JSON.stringify({ savedAt: now, draft }))
    return true
  } catch {
    return false
  }
}

/**
 * The parked draft for `uid`, or null. Reading removes it, so it is restored
 * once; an expired, malformed or other-account entry is removed and ignored.
 */
export function takePriceDraft(storage, uid, now = Date.now()) {
  if (!storage || !uid) return null
  try {
    const raw = storage.getItem(keyFor(uid))
    if (raw == null) return null
    storage.removeItem(keyFor(uid))
    const { savedAt, draft } = JSON.parse(raw)
    if (!Number.isFinite(savedAt) || now - savedAt > DRAFT_TTL_MS || now < savedAt) return null
    return looksLikeDraft(draft) ? draft : null
  } catch {
    return null
  }
}

/**
 * `saved` laid over `base`, only for the intervals and currencies `base` has,
 * so a draft parked before the price table changed cannot add a cell the route
 * would reject. With no `saved`, `base` is returned as it is.
 */
export function overlayDraft(base, saved) {
  if (!saved) return base
  const out = {}
  for (const interval of Object.keys(base)) {
    out[interval] = { ...base[interval] }
    for (const code of Object.keys(base[interval])) {
      if (saved[interval] && code in saved[interval]) out[interval][code] = saved[interval][code]
    }
  }
  return out
}
