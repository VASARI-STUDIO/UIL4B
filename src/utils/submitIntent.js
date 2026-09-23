// In-memory hand-off for "I was about to submit this to the community".
//
// A signed-out user who triggers a community submission entry point is asked to
// sign in FIRST — the submission form is never rendered for them. That gate has
// to remember WHY the sign-in happened, otherwise a successful sign-in drops the
// user back on the page with nothing open and their intent lost.
//
// Same contract as colorHandoff / typeHandoff (see utils/handoffSlot.js):
// versioned, never persisted, never in the URL, never in analytics. The record
// is READ during render (safe from a render React may discard) and CONSUMED
// exactly once from a committed effect.
//
// HONEST LIMIT: this lives in a module-scope variable, so it survives a route
// change, a re-render and a component remount inside the same tab — and nothing
// else. A full page reload, a new tab or a restored session legitimately finds
// nothing, and the surface simply opens normally. Today's sign-in never reloads
// the page (LoginPopup is an overlay and Google uses signInWithPopup), so the
// gate does not depend on that limit being lifted.
//
// A record carries a surface name and nothing else — no draft, no plan, no
// entitlement, no id. It is a reminder, not a capability: every surface still
// re-checks `user` before it opens its own form.
// Explicit extension so `node --test` can import this module directly for the
// unit suite; Vite resolves it identically.
import { createHandoffSlot } from './handoffSlot.js'

export const SUBMIT_INTENT_VERSION = 1

// Every community submission entry point in the product. An unknown surface is
// dropped rather than guessed at — a bogus name would re-open the wrong form.
//
// 'community-icon' is its OWN surface rather than a flag on 'community',
// because the whole job of a record here is to re-open the form the user was
// standing in front of. /community now has two — a design form and an icon form
// — and one name for both would sign somebody in for an icon and hand them back
// the design form, which is the exact failure the intent exists to prevent.
export const SUBMIT_SURFACES = ['community', 'community-icon', 'gradient', 'palette', 'prompt']

// The plain-language "why do I need an account" answer, shared by every entry
// point so the promise is identical wherever the user meets it.
export const COMMUNITY_SUBMIT_REASONS = [
  'Your submission is credited to you, so people can see whose work it is.',
  'Every submission is reviewed before it appears, and review needs an author.',
  'You can withdraw anything you have submitted, at any time.',
]

// A sign-up can detour through onboarding before the user comes back, so the
// intent has to outlive one navigation — but "outlive" is not "forever". An
// intent older than this is stale: re-opening a submission form twenty minutes
// and six tools later would be a surprise, not a courtesy.
export const SUBMIT_INTENT_TTL_MS = 10 * 60 * 1000

function validate(record, now = Date.now()) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null
  if (record.version !== SUBMIT_INTENT_VERSION) return null
  if (!SUBMIT_SURFACES.includes(record.surface)) return null
  const at = Number(record.at)
  if (!Number.isFinite(at)) return null
  // A clock that jumped backwards must not resurrect or extend an intent.
  if (now - at > SUBMIT_INTENT_TTL_MS || at > now) return null
  return { version: SUBMIT_INTENT_VERSION, surface: record.surface, at }
}

const slot = createHandoffSlot()

/** Validate a loose record. Null when there is nothing usable. */
export const validateSubmitIntent = validate

/**
 * Remember that `surface` is what the user was trying to do before the sign-in
 * prompt opened. Returns false when the surface is unknown (nothing is staged).
 */
export function setSubmitIntent(surface, now = Date.now()) {
  const valid = validate({ version: SUBMIT_INTENT_VERSION, surface, at: now }, now)
  slot.set(valid)
  return !!valid
}

/** Read during render, re-validated. Null when absent, consumed or invalid. */
export function readSubmitIntent() {
  return validate(slot.peek())
}

/** True when the staged intent is for this surface. Does not consume. */
export function hasSubmitIntent(surface) {
  return readSubmitIntent()?.surface === surface
}

/** Consume — call once from a committed effect or a settled event handler. */
export function consumeSubmitIntent() {
  slot.consume()
}

/** Drop an intent that will never be delivered (prompt dismissed, sign-in failed). */
export function resetSubmitIntent() {
  slot.clear()
}
