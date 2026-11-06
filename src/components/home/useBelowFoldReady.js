import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

// WHEN THE HOMEPAGE'S BELOW-THE-FOLD SECTIONS ALL START LOADING AT ONCE.
//
// Each section opens on its own when it comes within 600px of the viewport (see
// DeferredSection.jsx), and that is the only thing that opens one for a visitor
// who scrolls, by wheel, touch, scrollbar or drag. This hook is the other way
// in, for the visitors who jump rather than scroll: it turns true for every
// section together on a link into the page (`/#plans` has to find its target),
// on any key press (End, Page Down and Tab move the page by more than a
// section), and after requestSections() (an in-page link, which usePageAnchors
// calls).
const OPEN_SECTIONS_EVENT = 'home:open-sections'
// Remembered, so a request made before the page has subscribed is not lost.
let requested = false

/** Asks the homepage to mount every below-the-fold section now. */
export function requestSections() {
  requested = true
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_SECTIONS_EVENT))
}

export function useBelowFoldReady() {
  // Read from the router, not window.location: a hash pushed by a link while the
  // page is already mounted changes this too.
  const { hash } = useLocation()
  const [asked, setAsked] = useState(false)

  useEffect(() => {
    if (asked) return undefined
    const open = () => setAsked(true)
    window.addEventListener('keydown', open, { once: true, passive: true })
    window.addEventListener(OPEN_SECTIONS_EVENT, open, { once: true })
    if (requested) open()
    return () => {
      window.removeEventListener('keydown', open)
      window.removeEventListener(OPEN_SECTIONS_EVENT, open)
    }
  }, [asked])

  return asked || hash.length > 1
}
