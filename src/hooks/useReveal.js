import { useEffect } from 'react'

// One-shot scroll reveal. Adds `.is-in` to every `[data-reveal]` (single element)
// and `[data-reveal-group]` (whose children are the animated units) the first time
// it scrolls into view, then stops observing it. Deliberately touches NO React
// state (keeps us clear of the `set-state-in-effect` advisory), so it is safe to
// call from any page. (The home route uses `useHomeMotion` instead, which drives
// the same attributes with GSAP.)
//
// Resilience:
//  - No IntersectionObserver (old/edge runtimes) → reveal everything immediately,
//    so content is never stuck hidden.
//  - Reduced motion → the CSS forces `[data-reveal]` visible regardless; this
//    still runs and is harmless.
//
//    THAT SENTENCE WAS FALSE FROM THE DAY IT WAS WRITTEN UNTIL 2026-09-15. No
//    such CSS existed: the only rules on the attribute were `opacity:0` and
//    `.is-in{opacity:1}`, so the only thing that ever revealed anything was
//    this observer firing on scroll. A visitor with animation off met /learn
//    with 13 of its 14 blocks blank — 1,659 characters of invisible text — and
//    had to scroll to make it exist. The rule now exists, next to those two in
//    global.css, and tests/user-sim/91-reduced-motion-reveals.spec.js fails if
//    it is removed. The comment is left standing rather than rewritten because
//    a claim of resilience that nothing enforced is worth remembering.
//
// Content in Phase 1 is static, so the node list is read once on mount. What
// re-runs is the "is it on screen" check (the sweep below).
export function useReveal() {
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll('[data-reveal]:not(.is-in), [data-reveal-group]:not(.is-in)'),
    )
    if (nodes.length === 0) return

    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((n) => n.classList.add('is-in'))
      return
    }

    // Whatever is on screen shows. The observer below trims the bottom of the
    // viewport by 8% and wants 15% of the node inside what is left, so a node
    // that straddles the fold (the last card of a short window, a tall card on a
    // phone, the second block under a heading a hash link has just scrolled to)
    // never counts as intersecting and stayed blank until the visitor scrolled a
    // few more pixels. The trim is for scrolling, where the node is about to
    // arrive; it must not hide what is already here.
    //
    // So this sweep is not a one-off at mount. The scroll position is not final
    // at mount: a hash link, a reload that restores scroll, a back/forward trip
    // and a Lenis jump all move the page AFTER the first pass, and each lands
    // with the trimmed observer silent. The sweep re-runs when a scroll settles
    // (`scrollend`, which also fires for a programmatic or Lenis jump), on
    // `hashchange` / `popstate` / `pageshow`, and once on `load` (fonts and
    // images move nodes with no scroll at all). During a live scroll only the
    // observer acts, so the trimmed, arrive-just-in-time reveal is kept.
    const pending = new Set(nodes)
    let io
    let quiet = 0
    const listeners = []

    const stop = () => {
      listeners.forEach(([type, fn]) => window.removeEventListener(type, fn))
      listeners.length = 0
      clearTimeout(quiet)
      io?.disconnect()
    }
    const show = (n) => {
      n.classList.add('is-in')
      pending.delete(n)
      io?.unobserve(n)
    }
    const sweep = () => {
      const fold = window.innerHeight
      for (const n of pending) {
        const { top, bottom } = n.getBoundingClientRect()
        if (top < fold && bottom > 0) show(n)
      }
      if (pending.size === 0) stop()
    }
    const afterJump = () => requestAnimationFrame(sweep)
    // Engines without `scrollend` fall back to "scroll, then quiet".
    const onScroll = () => { clearTimeout(quiet); quiet = setTimeout(sweep, 120) }

    listeners.push(
      'onscrollend' in window ? ['scrollend', sweep] : ['scroll', onScroll],
      ['hashchange', afterJump],
      ['popstate', afterJump],
      ['pageshow', afterJump],
    )
    if (document.readyState !== 'complete') listeners.push(['load', sweep])
    listeners.forEach(([type, fn]) => window.addEventListener(type, fn, { passive: true }))

    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) show(entry.target)
        }
        if (pending.size === 0) stop()
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    nodes.forEach((n) => io.observe(n))
    sweep()

    return stop
  }, [])
}
