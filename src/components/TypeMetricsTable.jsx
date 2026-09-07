// The typeface-metrics article's evidence that two faces at one font-size are
// not one size — measured on the faces the reader is actually looking at.
//
// The section around this table says that `font-size` sets the em box and not
// the letters, so the same 16px produces visibly different text in different
// families. That is a claim about specific numbers, so none of them is typed.
// Each row's x-height and cap height are measured off a canvas at render, in
// the reader's own browser, using the font stacks read out of the running
// stylesheet — the same source ThemeInversionTable reads its colours from.
//
// ── Why the last three rows are the reader's own fonts ─────────────────────
//
// `serif`, `sans-serif` and `monospace` resolve to whatever the reader's
// machine supplies, so those rows are different on a Mac, a Windows PC and an
// Android phone. That is the point of the section rather than a weakness of the
// table: the spread between the rows is what a fallback costs, and a reader who
// checks these figures against a colleague's screen has demonstrated the
// article's argument better than any fixed number could.
//
// ── Why it waits for document.fonts.ready ─────────────────────────────────
//
// Measuring before the webfont has arrived measures the FALLBACK and prints it
// under the webfont's name, which is the single worst thing this component
// could do. So it waits, and then asks the product's own
// detectCanvasFontRendered() whether the family actually rendered. A named
// family that did not render is dropped rather than reported.
//
// It renders nothing at all if the canvas cannot report ink extents, if the
// stylesheet does not yield a usable stack, or if the reference row is lost.
// That is the rule for every measured figure on this surface: a row that cannot
// be measured honestly is worse than a missing row.

import { useEffect, useState } from 'react'
import { detectCanvasFontRendered } from '../utils/fontDetection'

/**
 * The em size everything is measured at. Ratios divide it back out, so any
 * value would do arithmetically — but not to the precision this table prints.
 *
 * At 100px Chromium returns the ink extents already rounded to whole pixels:
 * Manrope's x came back as exactly 54 and its H as exactly 72, which is 0.540
 * and 0.720 per em and two of those three decimal places were invented. At
 * 1000px the same measurements are 546.875 and 718.75, so 0.547 and 0.719 are
 * measured rather than rounded. Three decimals is what the table shows, and
 * this is what makes the third one real.
 */
const EM = 1000

/** The reference size the matched-size column is computed for. */
const AT_PX = 16

/**
 * The product's own two families, by the custom property that holds each stack.
 * --display is deliberately absent: global.css defines it as an alias of --font
 * (the same Manrope, named for the job), so a row for it would be a second copy
 * of the first row's measurements wearing a different label.
 */
const PRODUCT_FACES = [
  { id: 'font', role: 'Body and headings', varName: '--font' },
  { id: 'mono', role: 'Code and figures', varName: '--mono' },
]

/** The reader's own faces. No webfont involved, so no detection step. */
const GENERIC_FACES = [
  { id: 'sans-serif', role: 'Your system sans', stack: 'sans-serif', name: 'sans-serif' },
  { id: 'serif', role: 'Your system serif', stack: 'serif', name: 'serif' },
  { id: 'monospace', role: 'Your system mono', stack: 'monospace', name: 'monospace' },
]

/** The first family in a CSS font stack, unquoted. `'JetBrains Mono',ui-…` → JetBrains Mono. */
function firstFamily(stack) {
  const first = String(stack).split(',')[0].trim()
  return first.replace(/^['"]|['"]$/g, '')
}

/**
 * One face's ink measurements, per em.
 *
 * `actualBoundingBoxAscent` is the distance from the alphabetic baseline to the
 * top of the ink, so it is the x-height for "x" and the cap height for "H" —
 * the two metrics the CSS Fonts font-size-adjust keywords are named after.
 * Anything non-finite fails the whole table rather than the row: a metric that
 * came back unusable for one face means the measurement is not trustworthy.
 */
function measure(ctx, stack) {
  ctx.font = `${EM}px ${stack}`
  const x = ctx.measureText('x')
  const cap = ctx.measureText('H')
  const xh = x.actualBoundingBoxAscent
  const ch = cap.actualBoundingBoxAscent
  if (!Number.isFinite(xh) || !Number.isFinite(ch) || xh <= 0 || ch <= 0) return null
  return { aspect: xh / EM, cap: ch / EM }
}

function readRows() {
  if (typeof document === 'undefined' || !document.createElement) return null
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx || typeof ctx.measureText !== 'function') return null

  const cs = getComputedStyle(document.documentElement)
  const rows = []

  for (const face of PRODUCT_FACES) {
    const stack = cs.getPropertyValue(face.varName).trim()
    if (!stack) continue
    const name = firstFamily(stack)
    // The product's own detector, the one the Font Gallery uses to decide
    // whether a specimen is showing the family it says it is. Anything but a
    // confident `true` means this row would be a measurement of the fallback
    // under the webfont's name.
    if (detectCanvasFontRendered(ctx, name) !== true) continue
    const m = measure(ctx, stack)
    if (!m) return null
    rows.push({ id: face.id, role: face.role, name, stack, ...m })
  }

  for (const face of GENERIC_FACES) {
    const m = measure(ctx, face.stack)
    if (!m) return null
    rows.push({ id: face.id, role: face.role, name: face.name, stack: face.stack, ...m })
  }

  // The first row is the reference the matched-size column is computed against,
  // and it is the product's body face. Without it there is nothing to match to.
  if (rows.length < 2 || rows[0].id !== 'font') return null
  return rows
}

export default function TypeMetricsTable() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let live = true
    const run = () => { if (live) setRows(readRows()) }
    // Measuring before the webfont arrives measures the fallback. document.fonts
    // is the only thing that knows when it has, so the measurement waits on it
    // and falls back to measuring immediately where the API is absent.
    if (typeof document !== 'undefined' && document.fonts?.ready?.then) {
      document.fonts.ready.then(run, run)
    } else {
      run()
    }
    return () => { live = false }
  }, [])

  if (!rows) return null

  const reference = rows[0]

  return (
    <figure className="lart-table-wrap">
      <div
        className="lart-table-scroll"
        tabIndex={0}
        role="group"
        aria-label="The x-height and cap height of each face on this page, measured per em"
      >
        <table className="lart-table">
          <thead>
            <tr>
              <th scope="col">Face</th>
              <th scope="col" data-num="true">x-height &divide; em</th>
              <th scope="col" data-num="true">Cap height &divide; em</th>
              <th scope="col" data-num="true">x as % of cap</th>
              <th scope="col" data-num="true">{AT_PX}px matched to {reference.name}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  <span className="lart-specimen" style={{ fontFamily: r.stack }} aria-hidden="true">Hxg</span>
                  <span className="lart-hex" data-nowrap="true">{r.name}</span>
                  <span className="lart-face-role">{r.role}</span>
                </th>
                <td data-num="true">{r.aspect.toFixed(3)}</td>
                <td data-num="true">{r.cap.toFixed(3)}</td>
                <td data-num="true">{((r.aspect / r.cap) * 100).toFixed(1)}%</td>
                <td data-num="true">{((reference.aspect / r.aspect) * AT_PX).toFixed(1)}px</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="lart-table-cap">
        Measured in this browser at render: each face is painted to a canvas at {EM}px — large
        enough that the ink extents come back unrounded — and the height above the baseline is
        read off <code>x</code> and <code>H</code>, then divided by the em.
        The first two rows are the stacks in <code>--font</code> and <code>--mono</code>; the last
        three are whatever this machine supplies for the generic families, so they differ from one
        reader&rsquo;s screen to the next. The last column is the CSS Fonts adjustment
        <code> u = (m / m&prime;) s </code> at s&nbsp;=&nbsp;{AT_PX}px, taking {reference.name}&rsquo;s
        x-height as the target: the size each face would need to be set at to match it.
      </figcaption>
    </figure>
  )
}
