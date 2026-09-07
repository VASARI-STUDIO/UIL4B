// The font-loading article's measurement of the swap itself.
//
// The section around this table says that the moment a webfont arrives, the
// line it replaces changes width — because the fallback that was standing in
// for it has different advances, and nothing about the fallback was chosen to
// match. That is a claim about a specific number on a specific machine, so it
// is measured rather than asserted, at render, in the reader's own browser.
//
// ── Why the rows are font-family VALUES and not family names ───────────────
//
// The obvious table has one row per family in the stack. It cannot be built
// honestly: if `-apple-system` is not present on this machine, painting text in
// `-apple-system` alone silently paints it in the browser's default font, and
// the row would report that font's width under a name it does not have. There
// is no reliable way to ask a canvas "did this generic resolve to anything".
//
// So each row is a complete, valid font-family DECLARATION, and every one of
// them resolves to something on every machine. Row one is the stack as
// global.css declares it. Row two is the same stack with the webfont removed,
// which is exactly what the browser paints during the swap period. The
// difference between those two rows is the shift, and both halves of it are
// real measurements of real declarations.
//
// It renders nothing if the canvas cannot measure, if the stack has fewer than
// two entries to remove one from, or if the product's own detector cannot
// confirm that the first family actually rendered — because the whole table is
// a comparison against the loaded webfont, and without it there is nothing to
// compare to.

import { useEffect, useState } from 'react'
import { detectCanvasFontRendered } from '../utils/fontDetection'

/** The size the sample is measured at, and the sample. */
const AT_PX = 16
const SAMPLE = 'Every figure cited or computed'

/** `'Manrope'` → `Manrope`. */
const unquote = (value) => String(value || '').trim().replace(/^['"]|['"]$/g, '')

function readRows() {
  if (typeof document === 'undefined' || !document.createElement) return null
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx || typeof ctx.measureText !== 'function') return null

  const stack = getComputedStyle(document.documentElement).getPropertyValue('--font').trim()
  const entries = stack.split(',').map((s) => s.trim()).filter(Boolean)
  if (entries.length < 2) return null

  // Without a confident yes, row one is not the webfont and the table is a
  // comparison of the fallback with itself.
  if (detectCanvasFontRendered(ctx, unquote(entries[0])) !== true) return null

  const declarations = [
    { id: 'declared', label: 'The stack as declared', value: entries.join(', ') },
    { id: 'swap', label: 'What the swap period paints', value: entries.slice(1).join(', ') },
    { id: 'last', label: 'The last family in the stack', value: entries[entries.length - 1] },
  ]

  const rows = []
  for (const d of declarations) {
    ctx.font = `${AT_PX}px ${d.value}`
    const width = ctx.measureText(SAMPLE).width
    if (!Number.isFinite(width) || width <= 0) return null
    rows.push({ ...d, width })
  }
  return rows
}

export default function FallbackShiftTable() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let live = true
    const run = () => { if (live) setRows(readRows()) }
    if (typeof document !== 'undefined' && document.fonts?.ready?.then) {
      document.fonts.ready.then(run, run)
    } else {
      run()
    }
    return () => { live = false }
  }, [])

  if (!rows) return null

  const loaded = rows[0].width

  return (
    <figure className="lart-table-wrap">
      <div
        className="lart-table-scroll"
        tabIndex={0}
        role="group"
        aria-label="The same sentence measured in the declared stack and in the stack without its webfont"
      >
        <table className="lart-table">
          <thead>
            <tr>
              <th scope="col">What is painted</th>
              <th scope="col" data-num="true">Width at {AT_PX}px</th>
              <th scope="col" data-num="true">Against the declared stack</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const delta = ((r.width - loaded) / loaded) * 100
              return (
                <tr key={r.id}>
                  <th scope="row">
                    <span className="lart-hex" data-nowrap="true">{r.label}</span>
                    <span className="lart-face-role"><code>{r.value}</code></span>
                  </th>
                  <td data-num="true">{r.width.toFixed(2)}px</td>
                  <td data-num="true">
                    {r.id === 'declared' ? '—' : `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(2)}%`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <figcaption className="lart-table-cap">
        &ldquo;{SAMPLE}&rdquo; — {SAMPLE.length} characters — painted to a canvas at {AT_PX}px in
        each declaration and measured with <code>measureText()</code>. Every row is a font-family
        value a browser can resolve, so no row names a family that might not be installed. The
        second row is the first with its webfont removed: the width a reader sees before the file
        arrives, against the width they see after it.
      </figcaption>
    </figure>
  )
}
