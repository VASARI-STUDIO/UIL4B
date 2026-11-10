import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

// WHEN THE HOMEPAGE'S BELOW-THE-FOLD SECTIONS ALL START LOADING AT ONCE.
//
// Each section opens on its own when it comes within 600px of the viewport (see
// DeferredSection.jsx), which is all a visitor who never touches the page needs.
// This hook turns true for every section together on the first sign of someone
// scrolling, pressing or touching, because a fling moves the page by many
// sections between two frames and the observer would be left behind it; on a
// link into the page (`/#plans` has to find its target); and after
// requestSections() (an in-page link, which usePageAnchors calls). The chunks
// are already in the cache from the idle prefetch (belowFoldSections.js) by the
// time a visitor does this, so mounting them all is cheap.
const INTENT_EVENTS = ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown']
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
    INTENT_EVENTS.forEach((name) => window.addEventListener(name, open, { once: true, passive: true }))
    window.addEventListener(OPEN_SECTIONS_EVENT, open, { once: true })
    if (requested) open()
    return () => {
      INTENT_EVENTS.forEach((name) => window.removeEventListener(name, open))
      window.removeEventListener(OPEN_SECTIONS_EVENT, open)
    }
  }, [asked])

  return asked || hash.length > 1
}
