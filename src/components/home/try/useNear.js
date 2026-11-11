import { useEffect } from 'react'

// How far outside the window a tool starts its network work.
const NEAR = '600px'

/**
 * Calls `onNear` once, the first time the element in `ref` is within 600px of the
 * window. `onNear` should be stable (a state setter, or a useCallback).
 */
export function useNear(ref, onNear) {
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      onNear()
      return undefined
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect()
        onNear()
      }
    }, { rootMargin: NEAR })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, onNear])
}
