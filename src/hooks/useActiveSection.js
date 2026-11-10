import { useEffect, useState } from 'react'

/**
 * Which section the reader is in, for a contents rail.
 *
 * A section is current once its heading has reached the line a contents jump
 * lands it on (the section's own scroll-margin-top, plus a few px of slack), so
 * the answer is the last section at or above that line, and the first section
 * until any has. It is computed from geometry on every scroll frame rather than
 * kept from observer entries: entries only report the sections that changed,
 * which loses the marker when the reader jumps (End, then Home) and nothing is
 * left to report, and an observer cannot see the gap between two sections.
 *
 * `sections` is a list of `{ id }` objects. Options:
 *   enabled           false listens to nothing and reports no section.
 *   pinLastAtBottom   a short last section can never reach the line, so at the
 *                     very bottom of the page the last one is reported.
 */
export default function useActiveSection(sections, { enabled = true, pinLastAtBottom = false } = {}) {
  const [active, setActive] = useState(enabled ? sections[0]?.id ?? '' : '')
  // Keyed on the ids so a caller passing a fresh array each render does not
  // re-subscribe every time.
  const idKey = sections.map((s) => s.id).join('|')

  useEffect(() => {
    if (!enabled) {
      setActive('')
      return undefined
    }
    const nodes = sections.map((s) => document.getElementById(s.id)).filter(Boolean)
    if (!nodes.length) return undefined
    let frame = 0
    const pick = () => {
      frame = 0
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (pinLastAtBottom && atBottom) {
        setActive(nodes[nodes.length - 1].id)
        return
      }
      let current = nodes[0]
      for (const node of nodes) {
        const line = (parseFloat(getComputedStyle(node).scrollMarginTop) || 0) + 8
        if (node.getBoundingClientRect().top > line) break
        current = node
      }
      setActive(current.id)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(pick)
    }
    pick()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idKey stands in for sections
  }, [idKey, enabled, pinLastAtBottom])

  return active
}
