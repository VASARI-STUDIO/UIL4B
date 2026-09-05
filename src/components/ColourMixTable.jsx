// What `color-mix()` actually produces, measured in the reader's own browser.
//
// The interpolation space is the whole argument of the section this sits in,
// and it is the kind of claim that is easy to get confidently wrong: the same
// instruction — half red, half blue — lands on four different colours depending
// on the space named, and the computed value serialises differently in each
// one. Rather than print four hex codes from the machine this was written on,
// each swatch is PAINTED with the real `color-mix()` and then read back a pixel
// at a time, so the table reports what this engine did rather than what some
// other engine did once.
//
// The read-back is a 1x1 sRGB canvas. Canvas2D accepts the same CSS colour
// syntax and getImageData returns the 8-bit result after gamut mapping, which
// is the number a contrast check would use. getComputedStyle would not do: for
// `in oklab` it returns `oklab(...)` unchanged, which is the specification and
// not the paint.

import { useMemo } from 'react'
import { contrastRatio } from '../utils/colors'

const MIXES = [
  ['in srgb', 'color-mix(in srgb, red, blue)'],
  ['in oklab', 'color-mix(in oklab, red, blue)'],
  ['in oklch', 'color-mix(in oklch, red, blue)'],
  ['in hsl', 'color-mix(in hsl, red, blue)'],
]

function paintedHex(css) {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d', { colorSpace: 'srgb' })
  if (!ctx) return null
  // Set a known colour first: an invalid fillStyle is IGNORED rather than
  // throwing, so without this a browser that does not understand the value
  // would silently report the previous colour as though it had painted it.
  ctx.fillStyle = '#000000'
  ctx.fillStyle = css
  const serialised = ctx.fillStyle
  if (serialised === '#000000') return null
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export default function ColourMixTable() {
  const rows = useMemo(() => {
    if (typeof window === 'undefined' || typeof CSS === 'undefined') return []
    if (!CSS.supports('color', 'color-mix(in oklab, red, blue)')) return []
    return MIXES.map(([space, css]) => {
      const hex = paintedHex(css)
      return hex ? { space, css, hex, ratio: contrastRatio(hex, '#FFFFFF') } : null
    }).filter(Boolean)
  }, [])

  if (rows.length !== MIXES.length) return null

  return (
    <figure className="lart-table-wrap">
      <div className="lart-table-scroll" tabIndex={0} role="group" aria-label="The same colour mix in four interpolation spaces">
        <table className="lart-table">
          <thead>
            <tr>
              <th scope="col">Space</th>
              <th scope="col">Result</th>
              <th scope="col" data-num="true">Painted</th>
              <th scope="col" data-num="true">On white</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.space}>
                <th scope="row"><code>{r.space}</code></th>
                <td><span className="lart-swatch lart-swatch--wide" style={{ background: r.css }} aria-hidden="true" /></td>
                <td data-num="true">{r.hex.toUpperCase()}</td>
                <td data-num="true">{r.ratio.toFixed(2)}:1</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="lart-table-cap">
        <code>color-mix(&lt;space&gt;, red, blue)</code> in this browser. Each swatch is painted
        with the real declaration; the hex beside it is that swatch read back off a 1&times;1 sRGB
        canvas, and the last column is <code>contrastRatio()</code> on that hex. One instruction,
        four colours, and a contrast ratio that ranges by a factor of three.
      </figcaption>
    </figure>
  )
}
