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

let depth = 0

/** Lock the page scroll. Returns an `unlock` that releases this lock once. */
export function lockScroll() {
  if (depth === 0) {
    document.documentElement.style.overflow = 'hidden'
    getLenis()?.stop()
  }
  depth += 1

  let released = false
  return function unlock() {
    if (released) return
    released = true
    depth -= 1
    if (depth === 0) {
      document.documentElement.style.overflow = ''
      getLenis()?.start()
    }
  }
}
