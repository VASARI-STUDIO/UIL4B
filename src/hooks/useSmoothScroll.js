import { useEffect } from 'react'
import Lenis from 'lenis'
import { useAppearance } from '../contexts/AppearanceContext'

// App-wide smooth scroll. A single Lenis instance lives as a module singleton so
// any part of the app can reach the live scroller without prop-drilling or a
// dedicated context: the route-change scroll reset (App), the home motion system
// (useHomeMotion subscribes ScrollTrigger to it instead of owning its own Lenis),
// and modal scroll-locks (ExportPanel stops/starts it while open).
//
// Reduced motion is authoritative via AppearanceContext: when it is on we never
// instantiate Lenis and leave native scrolling completely untouched — getLenis()
// returns null and every caller falls back to the browser's own scroll. The
// effect is keyed on that toggle, so flipping the setting live tears Lenis down or
// rebuilds it cleanly. One rAF loop drives the instance and nothing else does.

let lenisInstance = null

export function getLenis() {
  return lenisInstance
}

export function setLenis(instance) {
  lenisInstance = instance
}

export default function useSmoothScroll() {
  const { reducedMotion } = useAppearance()

  useEffect(() => {
    if (reducedMotion) return undefined

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true })
    setLenis(lenis)

    let rafId = 0
    const raf = (time) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      setLenis(null)
    }
  }, [reducedMotion])
}
