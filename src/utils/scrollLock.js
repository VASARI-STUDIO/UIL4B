import { getLenis } from '../hooks/useSmoothScroll.js'

// One page scroll lock shared by every surface that covers the page: dialogs,
// the full-screen menus and the side panels.
//
// The lock goes on <html>, not <body>. The root sets overflow-x: clip, so an
// overflow on body no longer passes up to the viewport: body turns into its own
// scroll box, the page behind keeps scrolling when Lenis is off, and a sticky
// footer half revealed at the foot of the page drops to where it would sit
// unstuck. On <html> the lock reaches the viewport.
//
// Lenis is stopped as well: it cancels the wheel and scrolls the document
// itself, so the overflow alone does not hold it. With reduced motion Lenis is
// never created and getLenis() is null, which is the case the overflow covers.
//
// Locks are counted. Surfaces open over one another, and each used to save and
// restore the value it found, so closing them out of order could leave the page
// stuck or release it early. Now the first lock applies and the last unlock
// releases, whatever order they close in.
//
// scrollbar-gutter is deliberately not set: reserving the gutter grew the page
// at phone widths and moved scrollY.
//
// `overflow: hidden` only stops the user scrolling. Script can still move the
// page: focus() on a control, scrollIntoView, and a test driver that scrolls a
// target into view before tapping it (a tap on a trigger that the dialog now
// covers is retried, and each retry scrolls). A dialog passes `hold: true` to
// pin the position it opened at, so none of those can move the page behind it.
// Menus and panels do not hold: they can navigate while open, and the new
// page's scroll reset must go through.

let depth = 0

/** Lock the page scroll. Returns an `unlock` that releases this lock once. */
export function lockScroll({ hold = false } = {}) {
  if (depth === 0) {
    document.documentElement.style.overflow = 'hidden'
    getLenis()?.stop()
  }
  depth += 1

  let stopHolding = null
  if (hold && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const x = window.scrollX
    const y = window.scrollY
    // A scroll event fires before the frame that shows the move is painted, so
    // putting the page back here is not seen.
    const pin = () => {
      if (window.scrollX !== x || window.scrollY !== y) window.scrollTo({ left: x, top: y, behavior: 'instant' })
    }
    window.addEventListener('scroll', pin, { passive: true })
    stopHolding = () => window.removeEventListener('scroll', pin)
  }

  let released = false
  return function unlock() {
    if (released) return
    released = true
    stopHolding?.()
    depth -= 1
    if (depth === 0) {
      document.documentElement.style.overflow = ''
      getLenis()?.start()
    }
  }
}
