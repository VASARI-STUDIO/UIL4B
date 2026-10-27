// "Where each test lands": the three WCAG tests a pair is read against (body
// text, large text, UI parts), each with Pass or Fail for the current ratio.
// Hovering or focusing a chip outlines that class in the example below it; a tap
// or click pins it. The largest part of a failing class is outlined by default
// (PairExample), so the chips add the choice of which class to look at, and all
// of its parts.
import { ToolIcon } from '../tool/ToolLayout'
import { SIZE_CLASSES } from '../../utils/palettePairSizes'

/**
 * @param {{ratio: number, pinned: string|null, onPin: (id: string|null) => void,
 *   onHover: (id: string|null) => void}} props ratio is the unrounded ratio
 */
export default function PairLegend({ ratio, pinned, onPin, onHover }) {
  const anyFail = SIZE_CLASSES.some((c) => ratio < c.min)
  return (
    <section className="cc-lg" aria-labelledby="cc-lg-title">
      <h2 id="cc-lg-title" className="tl-sec-label">Where each test lands</h2>
      <div className="cc-lg-chips" role="group" aria-label="Tests">
        {SIZE_CLASSES.map((c) => {
          const pass = ratio >= c.min
          return (
            <button
              key={c.id}
              type="button"
              className={`cc-lg-chip${pass ? '' : ' is-fail'}`}
              aria-pressed={pinned === c.id}
              onClick={() => onPin(pinned === c.id ? null : c.id)}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') onHover(c.id) }}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(c.id)}
              onBlur={() => onHover(null)}
            >
              <span className="cc-lg-name">{c.label}</span>
              <span className="cc-lg-need">{c.min}:1</span>
              <span className={`cc-lg-mark cc-tone--${pass ? 'ok' : 'err'}`}>
                <ToolIcon name={pass ? 'check-circle' : 'x-circle'} size={14} />
                {pass ? 'Pass' : 'Fail'}
              </span>
            </button>
          )
        })}
      </div>
      <p className="cc-lede">
        {anyFail
          ? 'The largest part that misses its test is outlined. Pick a test to outline every part.'
          : 'Every test passes. Pick a test to outline every part.'}
      </p>
    </section>
  )
}
