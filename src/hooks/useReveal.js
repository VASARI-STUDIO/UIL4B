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
// Content in Phase 1 is static, so a single mount-time scan is sufficient.
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

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            obs.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )

    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])
}
