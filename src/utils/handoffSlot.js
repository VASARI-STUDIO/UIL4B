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

export function createHandoffSlot() {
  let pending = null

  return {
    set(record) {
      pending = record ?? null
    },
    /** Read without consuming. Safe from a render React may discard. */
    peek() {
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
  }
}
