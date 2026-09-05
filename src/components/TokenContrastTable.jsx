// The contrast article's live measurement of the page it is printed on.
//
// A table of ratios typed into prose is a claim about a stylesheet as it was on
// the day the prose was written. This reads the custom properties out of the
// running document and measures them with contrastRatio() from
// src/utils/colors.js — the same function /create/contrast runs — so the
// article cannot drift from the product, and it tells the truth in whichever
// theme the reader has.
//
// The theme is subscribed to with useSyncExternalStore rather than an effect
// that calls setState. The store's snapshot is the `data-theme` attribute, a
// string, so it is stable between renders; the rows are derived from it. An
// effect writing state here would re-render after paint for a value that is
// available before it.
//
// It renders nothing at all if a token comes back in a form the measurement
// does not accept. A row that cannot be measured honestly is worse than a
// missing row: the point of the section above it is that a contrast figure has
// to be checkable.

import { useMemo, useSyncExternalStore } from 'react'
import { contrastRatio } from '../utils/colors'

// [label, foreground token, background token].
//
// The ground is --bg-0 because that is what this article is painted on: the
// prose column sits directly on the page rather than inside a card, so
// measuring against --bg-1 would be measuring a surface that is not behind the
// text. Getting the ground wrong is the most common way a passing contrast
// figure turns out to describe nothing.
const PAIRS = [
  ['Body text', '--t1', '--bg-0'],
  ['Headings', '--t0', '--bg-0'],
  ['Meta and captions', '--t3', '--bg-0'],
  ['Links', '--accent-strong', '--bg-0'],
]

const HEX = /^#[0-9a-f]{6}$/i

function subscribe(onChange) {
  if (typeof MutationObserver === 'undefined') return () => {}
  // The theme is swapped by setting data-theme on <html>, so one observer on
  // that attribute is the whole subscription — no polling, no event bus.
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

const getSnapshot = () => document.documentElement.getAttribute('data-theme') || ''
const getServerSnapshot = () => null

function readPairs() {
  if (typeof window === 'undefined' || !document.documentElement) return null
  const cs = getComputedStyle(document.documentElement)
  const rows = []
  for (const [label, fgVar, bgVar] of PAIRS) {
    const fg = cs.getPropertyValue(fgVar).trim()
    const bg = cs.getPropertyValue(bgVar).trim()
    // Only plain six-digit hex is measured. A token that resolves to rgba(),
    // color-mix() or a named colour would need compositing against whatever is
    // behind it, and guessing at that is exactly the mistake the "Alpha"
    // section of this article is about.
    if (!HEX.test(fg) || !HEX.test(bg)) continue
    rows.push({ label, fg, bg, ratio: contrastRatio(fg, bg) })
  }
  return rows.length === PAIRS.length ? rows : null
}

export default function TokenContrastTable() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const rows = useMemo(() => (theme === null ? null : readPairs()), [theme])

  if (!rows) return null

  return (
    <figure className="lart-table-wrap">
      <div className="lart-table-scroll" tabIndex={0} role="group" aria-label="Measured contrast of this page's own text colours">
        <table className="lart-table">
          <thead>
            <tr>
              <th scope="col">Pair</th>
              <th scope="col">Colours</th>
              <th scope="col" data-num="true">Ratio</th>
              <th scope="col">AA</th>
              <th scope="col">AAA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>
                  <span className="lart-swatch" style={{ background: r.bg, color: r.fg }} aria-hidden="true">Ag</span>
                  <span className="lart-hex">{r.fg.toUpperCase()} on {r.bg.toUpperCase()}</span>
                </td>
                <td data-num="true">{r.ratio.toFixed(2)}:1</td>
                <td>{verdict(r.ratio, 4.5)}</td>
                <td>{verdict(r.ratio, 7)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="lart-table-cap">
        Read from the running stylesheet{theme ? ` in the ${theme} theme` : ''} and measured with{' '}
        <code>contrastRatio()</code>. AA and AAA are judged at the normal-text thresholds
        (4.5:1 and 7:1), since every pair above is used at body size.
      </figcaption>
    </figure>
  )
}

function verdict(ratio, min) {
  const pass = ratio >= min
  return (
    <span className="lart-verdict" data-pass={pass ? 'true' : 'false'}>
      {pass ? 'Pass' : 'Fail'}
      <span className="lart-sr"> — {ratio.toFixed(2)}:1 against a {min}:1 minimum</span>
    </span>
  )
}
