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

    // `allowNestedScroll` is the whole answer to "the popup doesn't scroll, the
    // page behind it does", and it is deliberately set HERE rather than at each
    // popup.
    //
    // Lenis intercepts the wheel globally and drives the page itself. Without
    // this option it hands an inner element back to the browser only when that
    // element — or an ancestor — carries `data-lenis-prevent`. The app had FOUR
    // of those attributes in total (three in PaletteBuilder, one in
    // IconLibrary) against a dozen scrollable overlays, so for the rest the
    // wheel scrolled the page while the user's pointer sat inside the popup.
    // That is the founder's 2026-09-03 report, and it reproduces exactly: with
    // the pointer in the prompt modal's body, one wheel gesture moved the PAGE
    // 500px and the modal 0.
    //
    // Adding the attribute to the overlays we know about today is how the count
    // got to four: it fixes the popups someone remembered and silently omits the
    // next one. With this option Lenis asks the DOM instead of asking us — it
    // measures the element under the pointer and stays out of the way while that
    // element can still scroll in the gesture's direction — so a popup added
    // next year inherits the behaviour without knowing this file exists.
    //
    // It does NOT take the page away from Lenis: an element that cannot scroll
    // any further hands the gesture straight back, so ordinary page scrolling,
    // and the horizontal rails (whose containment is `overscroll-behavior-inline`
    // and so leaves the vertical axis to Lenis), are untouched.
    //
    // What stops a popup passing the gesture on once it reaches its own end is
    // `overscroll-behavior: contain` on the scrolling element — Lenis reads it
    // and keeps out at the boundary too. Most overlay bodies already set it; the
    // ones that go through useModalDialog/usePopover now get it from the
    // `[data-lenis-prevent]` rule in global.css.
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true, allowNestedScroll: true })
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
