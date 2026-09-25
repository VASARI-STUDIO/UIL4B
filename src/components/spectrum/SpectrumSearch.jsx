import { useEffect, useState } from 'react'
import HomeCommandBar from '../HomeCommandBar'
import { prefersReducedMotion } from './reducedMotion'

// THE HERO SEARCH, IN THE DESIGN'S PILL — HomeCommandBar wrapped, not forked.
//
// HomeCommandBar keeps everything it does: the tool index, the ⌘K key, the
// keyboard walk through results, the live count. This wrapper only changes the
// look (spectrum.css, `.sp-search …`) and adds the design's ghost line — "Search
// for" and an accent phrase that changes every 2.9s (the design's timer and its
// six phrases). The bar's own placeholder is still there for assistive tech and
// is painted transparent; the ghost is aria-hidden and hides itself the moment
// the field holds a value.
//
// It STOPS, once and for good, when the visitor takes the bar — the same one-way
// stop HomeCommandBar gives its own demo (WCAG 2.2.2) — and never starts under
// reduced motion, where the first phrase simply stays.
const ROTATIONS = ['a contrast ratio', 'a tint and shade ramp', 'an OKLCH gradient', 'a type scale', 'an icon set', 'a WebP export']

export default function SpectrumSearch({ labelledBy }) {
  const [rot, setRot] = useState(0)
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (held || prefersReducedMotion()) return undefined
    const timer = setInterval(() => setRot((r) => r + 1), 2900)
    return () => clearInterval(timer)
  }, [held])

  return (
    <div className="sp-search" onFocus={() => setHeld(true)}>
      <HomeCommandBar labelledBy={labelledBy} />
      <span className="sp-search-ghost" aria-hidden="true">
        Search for<span className="sp-search-rot">{ROTATIONS[rot % ROTATIONS.length]}</span>
      </span>
    </div>
  )
}
