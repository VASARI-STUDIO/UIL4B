import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

// WHEN THE HOMEPAGE'S BELOW-THE-FOLD SECTIONS ALL START LOADING AT ONCE.
//
// Each section opens on its own when it comes within 600px of the viewport (see
// DeferredSection.jsx), so a visitor who only reads the first screen downloads
// and hydrates none of them. This hook is the other way in: it turns true for
// every section together on a link into the page (`/#plans` has to find its
// target) and on the first sign of someone scrolling, pressing or tapping, so
// an in-page jump or a fast fling does not land on empty stand-ins. `click`
// is there for a link activated with no press before it (assistive tech).
const INTENT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll', 'click']

export function useBelowFoldReady() {
  // Read from the router, not window.location: a hash pushed by a link while the
  // page is already mounted changes this too.
  const { hash } = useLocation()
  const [intent, setIntent] = useState(false)

  useEffect(() => {
    if (intent) return undefined
    const open = () => setIntent(true)
    INTENT_EVENTS.forEach((name) => window.addEventListener(name, open, { once: true, passive: true }))
    return () => INTENT_EVENTS.forEach((name) => window.removeEventListener(name, open))
  }, [intent])

  return intent || hash.length > 1
}
