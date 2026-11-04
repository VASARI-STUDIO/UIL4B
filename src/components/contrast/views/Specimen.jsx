// The Specimen view of a Contrast Checker pair: one line at each size a test
// measures, so the verdict can be read off the type itself. It is a view like
// the others (same frame, same marking), kept last in the control because it
// describes itself instead of imitating a product.
//
// The sizes are the point and are fixed in Specimen.css: 24px is the large-text
// floor, 19px bold clears the 18.66px bold floor, 16px is body text, and the pill
// carries a 2px border and a 16px icon for the UI-part test. The border is on the
// wrapper and the label in an inner span, as in Interface, so the pill is measured
// as a UI part and its words as text.
import { part } from './pairPart.js'
import './Specimen.css'

export default function Specimen({ job = null }) {
  return (
    <div className="sp">
      <p className="sp-h" {...part('text', job)}>Headings read first</p>
      <p className="sp-large" {...part('text', job)}>Large text at 24px needs 3:1.</p>
      <p className="sp-bold" {...part('text', job)}>Bold text from 18.66px counts as large too.</p>
      <p className="sp-body" {...part('text', job)}>Body text at 16px needs 4.5:1. Paragraphs, labels and table cells sit at this size.</p>
      <span className="sp-btn" {...part('fill-label beside', job)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        <span {...part('text', job)}>Button border and icon, 3:1</span>
      </span>
    </div>
  )
}
