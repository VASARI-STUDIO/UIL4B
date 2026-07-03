import { useEffect } from 'react'

// One-shot scroll reveal. Adds `.is-in` to every `[data-reveal]` element the
// first time it scrolls into view, then stops observing it. Deliberately touches
// NO React state (keeps us clear of the `set-state-in-effect` advisory), so it is
// safe to call from any page.
//
// Resilience:
//  - No IntersectionObserver (old/edge runtimes) → reveal everything immediately,
//    so content is never stuck hidden.
//  - Reduced motion → the CSS forces `[data-reveal]` visible regardless; this
//    still runs and is harmless.
//
// Content in Phase 1 is static, so a single mount-time scan is sufficient.
export function useReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-reveal]:not(.is-in)'))
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
