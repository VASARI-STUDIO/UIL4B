import { useCallback } from 'react'

// The grid rhythm. One column rule, tuned per surface by the minimum card
// width rather than by a hand-set column count — a fixed `repeat(3, …)` is
// correct at exactly one viewport and has to be re-broken at every breakpoint
// below it.
//
// `min` is written as a custom property rather than an inline
// `grid-template-columns` so the stylesheet keeps ownership of the layout and a
// page can still override the whole rule when it genuinely needs to.

export default function LibraryGrid({ children, min, className = '', labelledBy }) {
  const ref = useCallback((el) => {
    if (el && min) el.style.setProperty('--lbry-col-min', typeof min === 'number' ? `${min}px` : min)
  }, [min])

  return (
    <div
      className={`lbry-grid${className ? ` ${className}` : ''}`}
      ref={ref}
      aria-labelledby={labelledBy}
    >
      {children}
    </div>
  )
}
