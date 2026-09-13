import { useCallback } from 'react'

// The grid rhythm. One column rule, tuned per surface by the minimum card
// width rather than by a hand-set column count — a fixed `repeat(3, …)` is
// correct at exactly one viewport and has to be re-broken at every breakpoint
// below it.
//
// `min` is written as a custom property rather than an inline
// `grid-template-columns` so the stylesheet keeps ownership of the layout and a
// page can still override the whole rule when it genuinely needs to.

// `labelledBy` USED TO BE DISCARDED. It was spread onto a bare <div>, and a
// <div> with no role computes to `generic` — a role that prohibits an
// accessible name, so Chrome threw the association away. Measured on the built
// preview at 1440x900: /discover/palettes handed this component three names
// (pgl-section-curated, pgl-section-brand, pgl-locked-brands) and not one of
// them appeared anywhere in the accessibility tree. The markup read as working
// and did nothing.
//
// `role=group` is the fix rather than `role=region`, and the difference is the
// point: a region is a LANDMARK, and three more landmarks on a page that
// already has six is the /create/palette failure (five of nine landmarks were
// colour swatches named with raw hex). A group is named but not a landmark, so
// a reader entering the Brand systems grid hears which grid it is without the
// page's arrival summary growing a row per category.
//
// Applied ONLY when a name was actually supplied. An unnamed group is noise,
// and every other caller of this component passes no `labelledBy` at all.
export default function LibraryGrid({ children, min, className = '', labelledBy }) {
  const ref = useCallback((el) => {
    if (el && min) el.style.setProperty('--lbry-col-min', typeof min === 'number' ? `${min}px` : min)
  }, [min])

  return (
    <div
      className={`lbry-grid${className ? ` ${className}` : ''}`}
      ref={ref}
      role={labelledBy ? 'group' : undefined}
      aria-labelledby={labelledBy}
    >
      {children}
    </div>
  )
}
