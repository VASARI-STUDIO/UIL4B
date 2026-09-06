// The theme article's live demonstration that inverting a palette is not a
// theme — run on the palette the reader is actually looking at.
//
// The claim the section makes is arithmetical: inverting every channel of a
// pair does not preserve the contrast ratio between them, and it does not
// preserve the hue of either. Both halves are easy to assert and easy to get
// wrong from memory, so neither is typed. The tokens are read out of the
// running stylesheet — the same source TokenContrastTable reads — the inversion
// is computed here, and both ratios come from contrastRatio() in
// src/utils/colors.js, which is the function /create/contrast runs.
//
// The theme is subscribed to with useSyncExternalStore for the reason
// TokenContrastTable gives: the snapshot is the `data-theme` attribute, a
// string that is stable between renders and available before paint, so an
// effect writing state would only re-render after the fact for a value already
// in hand.
//
// It renders nothing if a token comes back in a form the measurement does not
// accept. That is deliberate and it is the rule for every measured figure on
// this surface: a row that cannot be measured honestly is worse than a missing
// row, because the section around it exists to say that these numbers are
// checkable.

import { useMemo, useSyncExternalStore } from 'react'
import { contrastRatio } from '../utils/colors'

// [label, foreground token, background token]. The ground is --bg-0 for the
// same reason the contrast article gives: the prose column sits directly on the
// page, so --bg-1 would be a surface that is not behind this text.
const PAIRS = [
  ['Headings', '--t0', '--bg-0'],
  ['Body text', '--t1', '--bg-0'],
  ['Captions', '--t3', '--bg-0'],
  ['Links', '--accent-strong', '--bg-0'],
]

const HEX = /^#[0-9a-f]{6}$/i

/** Every channel replaced by 255 minus itself — the whole of "inverting". */
function invert(hex) {
  const channels = hex.slice(1).match(/../g) || []
  return `#${channels.map((c) => (255 - parseInt(c, 16)).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

function subscribe(onChange) {
  if (typeof MutationObserver === 'undefined') return () => {}
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

const getSnapshot = () => document.documentElement.getAttribute('data-theme') || ''
const getServerSnapshot = () => null

function readRows() {
  if (typeof window === 'undefined' || !document.documentElement) return null
  const cs = getComputedStyle(document.documentElement)
  const rows = []
  for (const [label, fgVar, bgVar] of PAIRS) {
    const fg = cs.getPropertyValue(fgVar).trim()
    const bg = cs.getPropertyValue(bgVar).trim()
    // Only plain six-digit hex. A token resolving to rgba() or color-mix()
    // would have to be composited against whatever is behind it first, and
    // guessing at that is the failure this whole surface avoids.
    if (!HEX.test(fg) || !HEX.test(bg)) continue
    const flippedFg = invert(fg)
    const flippedBg = invert(bg)
    rows.push({
      label,
      fg: fg.toUpperCase(),
      bg: bg.toUpperCase(),
      ratio: contrastRatio(fg, bg),
      flippedFg,
      flippedBg,
      flippedRatio: contrastRatio(flippedFg, flippedBg),
    })
  }
  return rows.length === PAIRS.length ? rows : null
}

export default function ThemeInversionTable() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const rows = useMemo(() => (theme === null ? null : readRows()), [theme])

  if (!rows) return null

  return (
    <figure className="lart-table-wrap">
      <div
        className="lart-table-scroll"
        tabIndex={0}
        role="group"
        aria-label="This page's own colour pairs, and the same pairs with every channel inverted"
      >
        <table className="lart-table">
          <thead>
            <tr>
              <th scope="col">Pair</th>
              <th scope="col">As painted</th>
              <th scope="col" data-num="true">Ratio</th>
              <th scope="col">Inverted</th>
              <th scope="col" data-num="true">Ratio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>
                  <span className="lart-swatch" style={{ background: r.bg, color: r.fg }} aria-hidden="true">Ag</span>
                  <span className="lart-hex">{r.fg} on {r.bg}</span>
                </td>
                <td data-num="true">{r.ratio.toFixed(2)}:1</td>
                <td>
                  <span
                    className="lart-swatch"
                    style={{ background: r.flippedBg, color: r.flippedFg }}
                    aria-hidden="true"
                  >Ag</span>
                  <span className="lart-hex">{r.flippedFg} on {r.flippedBg}</span>
                </td>
                <td data-num="true">{r.flippedRatio.toFixed(2)}:1</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="lart-table-cap">
        The left half is read from the running stylesheet{theme ? ` in the ${theme} theme` : ''};
        the right half is the same pair with every channel replaced by 255 minus itself. Both
        ratios come from <code>contrastRatio()</code>. Read the two ratio columns against each
        other, and the two swatches: inversion produces a different colour scheme, not the same
        one seen from the other side.
      </figcaption>
    </figure>
  )
}
