import { useEffect, useRef } from 'react'
import { getLenis } from './useSmoothScroll'

// After a filter, a chip or a search changes a library's results, bring the
// results heading back below the sticky toolbar when the change left it hidden.
//
// A narrower result is a shorter page, so the browser clamps the scroll position
// and the heading can land under the bar. The stylesheet gives every id on a
// library surface a scroll-margin-top that clears the nav and the toolbar
// (styles/pages/library-v3.css), so that margin is where the heading belongs.
// The move happens only when the heading's top sits above that line; a heading
// that is already clear, or a page at the top, is left alone, and the first
// render never scrolls. The move itself follows PromptLibrary's scrollToElement:
// through Lenis when it owns the scroll, otherwise native `behavior: 'auto'`,
// which the stylesheet makes instant under reduced motion.
//
//   sectionRef  the results <section>; its aria-labelledby names the heading
//               whose scroll-margin-top is the line.
//   deps        the filter values; a change in any of them is a trigger.
export default function useResultsScroll(sectionRef, deps) {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const section = sectionRef.current
    if (!section || window.scrollY <= 0) return
    const heading = document.getElementById(section.getAttribute('aria-labelledby') || '')
    const margin = parseFloat(getComputedStyle(heading || section).scrollMarginTop) || 0
    const rect = section.getBoundingClientRect()
    if (rect.top >= margin) return
    const y = Math.max(0, Math.round(window.scrollY + rect.top - margin))
    const lenis = getLenis()
    if (lenis) {
      // Lenis measures the page height on a delay; a shorter page is not in it yet.
      lenis.resize()
      lenis.scrollTo(y)
    } else window.scrollTo({ top: y, behavior: 'auto' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller's filter values are the whole trigger
  }, deps)
}
