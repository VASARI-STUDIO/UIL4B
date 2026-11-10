import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// On a phone the library toolbar does not stick (global.css, max-width 640px):
// a two-row bar held under the nav would cover a third of the screen. So once it
// has scrolled away, scrolling back UP brings it back, after a short pause, as a
// fixed bar under the nav; scrolling down sends it away again. When its own place
// in the page comes back into view it simply drops back into it.
//
// While it is fixed, a spacer of its exact height holds its place, so the page
// under it never moves. It stays put while it holds focus (someone is typing a
// search, and the results changing height scrolls the page) or while its
// Filters sheet is open (the sheet's scroll lock moves the window).
//
// Returns `peek` ('' in the page, 'in' fixed and shown, 'out' leaving) and the
// spacer geometry to render while `peek` is set.

const PHONE_QUERY = '(max-width:640px)'
// How far up, in one direction, counts as meaning it rather than a wobble.
const UP_TRAVEL = 48
const DOWN_TRAVEL = 24
// The pause before it comes back, so a flick up and down does not flash it.
const REVEAL_DELAY_MS = 150
// The leave transition in global.css, plus a frame.
const LEAVE_MS = 220

export default function useToolbarPeek(ref, { frozen = false } = {}) {
  const [peek, setPeek] = useState('')
  const [slot, setSlot] = useState(null)
  const live = useRef({ peek: '', frozen })
  useLayoutEffect(() => { live.current.frozen = frozen })

  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined' || !window.matchMedia) return undefined
    // Inside a dialog the toolbar scrolls with the dialog, not the window.
    if (el.closest('[role="dialog"]')) return undefined
    const phone = window.matchMedia(PHONE_QUERY)
    let lastY = window.scrollY
    let up = 0
    let down = 0
    let revealTimer = 0
    let leaveTimer = 0
    let frame = 0
    // Where a shown bar sits: read from the bar itself once it is fixed, since
    // `--nav-clear` is a calc() that only the layout resolves.
    let shownTop = 72

    const set = (next) => {
      live.current.peek = next
      setPeek(next)
    }
    const drop = () => {
      clearTimeout(revealTimer)
      clearTimeout(leaveTimer)
      revealTimer = 0
      up = 0
      down = 0
      set('')
      setSlot(null)
    }
    const reveal = () => {
      revealTimer = 0
      if (!phone.matches || live.current.peek) return
      const box = el.getBoundingClientRect()
      // Back in view on its own while waiting: nothing to bring back.
      if (box.bottom > shownTop) return
      const margin = parseFloat(getComputedStyle(el).marginBottom) || 0
      setSlot({ height: box.height + margin, left: box.left, width: box.width })
      set('in')
    }
    const busy = () => live.current.frozen || el.contains(document.activeElement)

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const y = window.scrollY
        const dy = y - lastY
        lastY = y
        if (!phone.matches) {
          if (live.current.peek) drop()
          return
        }
        const state = live.current.peek
        if (state) {
          const spacer = el.previousElementSibling
          if (state === 'in') shownTop = el.getBoundingClientRect().top || shownTop
          // Its own place is back under the nav: it is home.
          if (spacer && spacer.getBoundingClientRect().top >= shownTop - 1) { drop(); return }
          if (state === 'in' && dy > 0 && !busy()) {
            down += dy
            if (down >= DOWN_TRAVEL) {
              down = 0
              set('out')
              leaveTimer = setTimeout(drop, LEAVE_MS)
            }
          } else if (dy < 0) {
            down = 0
            if (state === 'out') { clearTimeout(leaveTimer); set('in') }
          }
          return
        }
        if (dy < 0) {
          up -= dy
          if (up >= UP_TRAVEL && !revealTimer && el.getBoundingClientRect().bottom <= shownTop) {
            revealTimer = setTimeout(reveal, REVEAL_DELAY_MS)
          }
        } else if (dy > 0) {
          up = 0
          clearTimeout(revealTimer)
          revealTimer = 0
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    phone.addEventListener?.('change', drop)
    return () => {
      window.removeEventListener('scroll', onScroll)
      phone.removeEventListener?.('change', drop)
      cancelAnimationFrame(frame)
      clearTimeout(revealTimer)
      clearTimeout(leaveTimer)
    }
  }, [ref])

  return { peek, slot }
}
