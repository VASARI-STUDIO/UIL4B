import { useEffect, useState } from 'react'

/**
 * Which section the reader is in, for a contents rail.
 *
 * The observer window is pinned near the top of the viewport rather than its
 * middle: the question the rail answers is "what am I reading now", and the
 * moment a heading crosses under the nav the reader is in that section even
 * though most of the previous one is still on screen. Intersecting sections are
 * sorted by position so the topmost wins, which keeps the marker stable when
 * two short sections are visible at once.
 *
 * `sections` is a list of `{ id }` objects. Options:
 *   enabled           false creates no observer and reports no section.
 *   fromScrollMargin  take the top edge of the window from the first section's
 *                     computed `scroll-margin-top` (the clearance a jump leaves
 *                     under a fixed nav) instead of a fixed 88px, so the section
 *                     an anchor lands on is the one marked. The extra 2px keeps
 *                     the section above it, whose bottom edge touches that line,
 *                     outside the window.
 */
export default function useActiveSection(sections, { enabled = true, fromScrollMargin = false } = {}) {
  const [active, setActive] = useState('')
  // Keyed on the ids so a caller passing a fresh array each render does not
  // tear the observer down every time.
  const idKey = sections.map((s) => s.id).join('|')

  useEffect(() => {
    if (!enabled) {
      setActive('')
      return undefined
    }
    const nodes = sections.map((s) => document.getElementById(s.id)).filter(Boolean)
    if (!nodes.length || typeof IntersectionObserver === 'undefined') return undefined
    const measured = fromScrollMargin ? parseFloat(getComputedStyle(nodes[0]).scrollMarginTop) : 0
    const top = measured > 0 ? Math.round(measured) + 2 : 88
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting)
        if (!seen.length) return
        seen.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        setActive(seen[0].target.id)
      },
      { rootMargin: `-${top}px 0px -60% 0px`, threshold: 0 },
    )
    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idKey stands in for sections
  }, [idKey, enabled, fromScrollMargin])

  return active
}
