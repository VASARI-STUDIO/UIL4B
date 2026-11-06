import { useEffect, useState } from 'react'

// WHEN THE HOMEPAGE'S BELOW-THE-FOLD SECTIONS MAY START LOADING (see
// DeferredSection.jsx): once the page has loaded and the browser is idle, so
// they never compete with the hero for the first request wave, and at once on a
// deep link or on the first sign of someone scrolling, pressing or tapping.
const IDLE_TIMEOUT_MS = 2500
const INTENT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']

export function useBelowFoldReady() {
  // A link into the page (`/#plans`) has to find its section, so a hash opens the gate.
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && window.location.hash.length > 1)

  useEffect(() => {
    if (ready) return undefined
    const open = () => setReady(true)
    let idleHandle = null
    let timer = null
    const afterLoad = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(open, { timeout: IDLE_TIMEOUT_MS })
      } else {
        timer = window.setTimeout(open, 1000)
      }
    }
    if (document.readyState === 'complete') afterLoad()
    else window.addEventListener('load', afterLoad, { once: true })
    INTENT_EVENTS.forEach((name) => window.addEventListener(name, open, { once: true, passive: true }))
    return () => {
      window.removeEventListener('load', afterLoad)
      INTENT_EVENTS.forEach((name) => window.removeEventListener(name, open))
      if (idleHandle !== null) window.cancelIdleCallback(idleHandle)
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [ready])

  return ready
}
