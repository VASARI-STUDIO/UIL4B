// A one-consumption, in-memory hand-off slot.
//
// Used to carry live `File` objects and small validated drafts across an SPA
// route change without ever touching the URL, localStorage, sessionStorage or
// analytics. The value only exists for the lifetime of the tab; a reload or a
// direct visit to the destination legitimately finds nothing.
//
// READ during render, CONSUME on commit. This split matters: React may render a
// component, throw the result away and render it again (concurrent rendering,
// Suspense retries, StrictMode's development double-invoke). A slot that emptied
// itself during render would hand the payload to a render that never committed
// and leave the real mount with nothing — a load-dependent, intermittent loss.
//
// So `peek()` is safe to call any number of times from render, and `consume()`
// is called once from a mount effect — effects only run for a committed tree.
// After that single commit the slot is empty, so a remount, a Back/Forward
// navigation or a second visit to the destination can never import it again.
//
// ── Why a slot may also EXPIRE ──────────────────────────────────────────────
// The contract above is only airtight when staging is always followed by a
// navigation in THIS tab. It is not. A `<Link onClick={stage}>` runs its
// handler on a Ctrl/Cmd/Shift-click too — React Router composes the caller's
// onClick unconditionally and only THEN asks shouldProcessLinkClick whether to
// navigate, which for a modified click is no, so the browser opens a new tab
// instead. The new tab starts a fresh module instance and finds nothing, which
// is correct; the ORIGINAL tab is left holding a staged record that nothing
// will ever consume. It then sits there for the life of the tab and ambushes
// the next visit to the destination, however much later and by whatever route.
// That is the founder's "sometimes I open the palette builder and it has added
// many colours and it's a different swatch".
//
// The stagers are fixed at the call site too, but a permanent trap is the wrong
// shape for a value whose entire meaning is "the visitor pressed Continue
// SECONDS ago". `ttlMs` makes that meaning enforceable, so a future stager that
// leaks leaks for a few seconds rather than forever. Default 0 = never expires,
// which is the existing behaviour for every slot that does not ask for one —
// the File-carrying image/icon slots keep the contract they were built on.

/**
 * Will THIS tab navigate as a result of this click on a react-router `<Link>`?
 *
 * The one question a stager has to answer before it stages. It mirrors react-
 * router's own `shouldProcessLinkClick` — primary button, no modifier key, and
 * a target that is not another browsing context — plus `defaultPrevented`, for
 * a handler upstream that has already cancelled the navigation. Kept here, next
 * to the failure it prevents, and kept plain so `node --test` can enumerate the
 * modifier matrix without a DOM.
 *
 * Stagers only. It deliberately does not care about `to`, external URLs or
 * router state: everything it looks at is on the event.
 */
export function navigatesThisTab(event, target) {
  if (!event || event.defaultPrevented) return false
  // `button` is undefined on a synthetic/keyboard-activated click; Enter on a
  // focused link does navigate this tab, so absent means primary.
  if (event.button != null && event.button !== 0) return false
  if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return false
  const t = target ?? event.currentTarget?.target
  return !t || t === '_self'
}

// `now` defaults to a CALL through Date.now rather than a captured reference to
// it. Capturing froze the clock this module reads at module-eval time, which
// made the ttl on the real board slot untestable — a test that moved the wall
// clock moved something the slot was no longer looking at, so a mutation
// removing the ttl from the shipped slot passed. One extra call per peek buys
// an assertion about the object the page actually imports.
export function createHandoffSlot({ ttlMs = 0, now = () => Date.now() } = {}) {
  let pending = null
  let stagedAt = 0

  // Live until `ttlMs` has passed. A non-positive ttl means "no expiry".
  const fresh = () => ttlMs <= 0 || now() - stagedAt <= ttlMs

  return {
    set(record) {
      pending = record ?? null
      stagedAt = now()
    },
    /** Read without consuming. Safe from a render React may discard. */
    peek() {
      // Dropping the stale record here rather than only reporting it keeps a
      // single expiry decision: two peeks either side of the boundary can never
      // disagree about what the slot holds.
      if (pending && !fresh()) pending = null
      return pending
    },
    /** Consume. Call once from a mount effect, never from render. */
    consume() {
      pending = null
    },
    /** Drop a staged record that will never be delivered (e.g. a failed navigation). */
    clear() {
      pending = null
    },
    /** Age in ms of the live record, or null when the slot is empty or stale.
     *  Diagnostics only — a destination uses it to explain why a board looks
     *  the way it does, never to decide anything. */
    stagedAgo() {
      return this.peek() ? now() - stagedAt : null
    },
  }
}
