import { useEffect, useState } from 'react'

// Whether an element is on screen enough to play its animated preview.
//
// One IntersectionObserver is shared by every caller: a gallery of twenty
// cards registers twenty elements with one observer rather than creating
// twenty. A card counts as in view once PLAY_RATIO of it is visible, and
// stops counting the moment it drops below, so only the cards a person can
// actually see hold a decoded animation.
export const PLAY_RATIO = 0.35

let observer = null
const listeners = new Map()

function shared() {
  if (observer || typeof IntersectionObserver === 'undefined') return observer
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const cb = listeners.get(entry.target)
      if (cb) cb(entry.isIntersecting && entry.intersectionRatio >= PLAY_RATIO)
    }
  }, { threshold: [0, PLAY_RATIO, 0.6, 1] })
  return observer
}

/**
 * @param ref      the element to watch
 * @param enabled  false keeps it off entirely (reduced motion, data saver,
 *                 no animation for this item) and never observes
 */
export default function useInViewPlayback(ref, enabled) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    const io = enabled ? shared() : null
    if (!el || !io) return undefined
    listeners.set(el, setInView)
    io.observe(el)
    return () => {
      io.unobserve(el)
      listeners.delete(el)
      setInView(false)
    }
  }, [ref, enabled])
  return enabled && inView
}

/** Motion allowed AND the connection has not asked to save data. */
export function allowsAnimatedPreview(reducedMotion) {
  if (reducedMotion) return false
  try {
    if (typeof navigator !== 'undefined' && navigator.connection?.saveData) return false
  } catch { /* no Network Information API */ }
  return true
}
