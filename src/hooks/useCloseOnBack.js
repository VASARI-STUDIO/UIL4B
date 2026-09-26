import { useEffect, useRef } from 'react'

// THE BACK GESTURE CLOSES THE OVERLAY — the shared hook for every overlay.
//
//   useCloseOnBack(open, onBack)
//
//   open    boolean. While true, the overlay owns one history entry.
//   onBack  called when the visitor presses Back (or swipes back) while the
//           overlay is open. Close the overlay in it; do not navigate.
//
// Same shape as src/components/spectrum/useCloseOnBack.js, so SpectrumNav can
// swap between them with one import line.
//
// WHY. On a phone a sheet, a dialog or a
// full-screen menu looks like a page, so the system back gesture is how people
// try to leave it — and without this it left the site, or the tool, with
// whatever was in the overlay.
//
// HOW. Opening pushes one entry that carries the router's own state (so React
// Router still reads the same location and index) plus a STACK of overlay ids.
// Back pops it; the overlay whose id is no longer on the stack calls onBack, so
// one Back closes only the top overlay. Closing any other way (Escape, a close
// button) takes the entry back off with history.back() if it is still on top —
// a route link inside the overlay has already pushed past it.
//
// ONE OVERLAY HANDING OVER TO ANOTHER (the phone sheet's Export row closes the
// sheet and opens the Export panel in the same commit). history.back() is
// asynchronous, so a push made straight after it would be the entry that back()
// then pops, closing the new overlay the moment it opened. So while a back() of
// ours is in flight, a new overlay's push waits for it, and the popstate that
// back() produces is marked as ours and ignored by every overlay.
let seq = 0
let pendingBacks = 0
let queued = []

function onAnyPop(event) {
  if (pendingBacks <= 0) return
  pendingBacks -= 1
  event.__overlaySelf = true
  if (pendingBacks === 0) {
    const run = queued
    queued = []
    run.forEach((fn) => fn())
  }
}
if (typeof window !== 'undefined') window.addEventListener('popstate', onAnyPop)

function whenSettled(fn) {
  if (pendingBacks > 0) queued.push(fn)
  else fn()
}

export function useCloseOnBack(open, onBack) {
  const onBackRef = useRef(onBack)
  useEffect(() => { onBackRef.current = onBack }, [onBack])

  useEffect(() => {
    if (!open || typeof window === 'undefined') return undefined
    const id = `ov${++seq}`
    let alive = true
    let pushed = false
    const onPop = (event) => {
      if (event.__overlaySelf || !pushed) return
      const now = event.state?.__overlays || []
      if (now.includes(id)) return
      pushed = false
      onBackRef.current?.()
    }
    whenSettled(() => {
      if (!alive) return
      const prev = window.history.state || {}
      window.history.pushState({ ...prev, __overlays: [...(prev.__overlays || []), id] }, '')
      pushed = true
      window.addEventListener('popstate', onPop)
    })
    return () => {
      alive = false
      window.removeEventListener('popstate', onPop)
      const top = window.history.state?.__overlays
      if (pushed && top && top[top.length - 1] === id) {
        pendingBacks += 1
        window.history.back()
      }
    }
  }, [open])
}

// While a modal overlay is open, everything behind it is inert (audit A12): no
// focus, no pointer, and assistive tech does not read the page under the sheet.
// `selector` defaults to the app's <main>. Pass the overlay's own open flag.
export function useInertBehind(open, selector = '#main') {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined
    const el = document.querySelector(selector)
    if (!el || el.hasAttribute('inert')) return undefined
    el.setAttribute('inert', '')
    return () => el.removeAttribute('inert')
  }, [open, selector])
}
