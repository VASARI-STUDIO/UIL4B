// The font-loading article's inventory of the faces this page declares — read
// out of the running stylesheet rather than copied out of it.
//
// The section around this table says that a family is not one file, that each
// file carries a character range, and that a range the page never renders is a
// file the browser never asks for. All four of those facts are properties of
// the @font-face rules this document is actually serving, so all four are read
// from the CSSOM at render: the family, the weight range, the font-display
// value, the unicode-range and — from document.fonts — whether the face has in
// fact been downloaded.
//
// The code-point count is COMPUTED from the range rather than stated. A range
// like U+0000-00FF,U+0131,U+2000-206F is three tokens of three different shapes
// and the size of the set it defines is not something a reader (or an author)
// can see by looking at it.
//
// ── Why the status column probes with a character ──────────────────────────
//
// document.fonts.check(font, text) answers the question the section is really
// asking — "has the browser downloaded the file that would draw THIS?" — rather
// than the question a status flag answers. The probe is derived, not chosen: it
// is the first printable code point in the face's own range, so the extended
// subset is probed with a character only it covers. On a page with no such
// character on it, that face reports as not downloaded, which is the whole
// argument of the section standing in front of the reader.
//
// It renders nothing if the stylesheet cannot be read (a cross-origin sheet
// throws on .cssRules), if no @font-face rule is found, or if any range fails
// to parse. A partial inventory would misstate the thing it is inventorying.

import { useEffect, useState } from 'react'

/** Below this, code points are controls and separators rather than characters. */
const FIRST_PRINTABLE = 0x21

/** `'Manrope'` → `Manrope`. The CSSOM keeps the quotes the author wrote. */
const unquote = (value) => String(value || '').trim().replace(/^['"]|['"]$/g, '')

/**
 * Every interval in a unicode-range value, as [start, end] pairs, or null if
 * any token is not one of the three shapes CSS Fonts defines for it.
 */
function intervalsOf(range) {
  const out = []
  for (const raw of String(range || '').split(',')) {
    const token = raw.trim().replace(/^[Uu]\+/, '')
    if (!token) return null
    let lo
    let hi
    if (token.includes('-')) {
      const [a, b] = token.split('-')
      lo = parseInt(a, 16)
      hi = parseInt(b, 16)
    } else if (token.includes('?')) {
      lo = parseInt(token.replace(/\?/g, '0'), 16)
      hi = parseInt(token.replace(/\?/g, 'F'), 16)
    } else {
      lo = parseInt(token, 16)
      hi = lo
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return null
    out.push([lo, hi])
  }
  return out.length ? out : null
}

/** How many code points a set of intervals covers. */
const sizeOf = (intervals) => intervals.reduce((n, [lo, hi]) => n + (hi - lo + 1), 0)

/** The first printable code point the ranges cover — the probe for this face. */
function probeOf(intervals) {
  for (const [lo, hi] of intervals) {
    const at = Math.max(lo, FIRST_PRINTABLE)
    if (at <= hi) return at
  }
  return null
}

/** Every @font-face rule this document is serving, across every readable sheet. */
function fontFaceRules() {
  const out = []
  for (const sheet of Array.from(document.styleSheets || [])) {
    let rules
    try {
      rules = sheet.cssRules
    } catch {
      // A cross-origin sheet throws rather than returning nothing. Skipping it
      // is right: it holds no rule this product declared.
      continue
    }
    if (!rules) continue
    for (const rule of Array.from(rules)) {
      if (typeof CSSFontFaceRule !== 'undefined' && rule instanceof CSSFontFaceRule) out.push(rule)
    }
  }
  return out
}

function readRows() {
  if (typeof document === 'undefined' || !document.styleSheets) return null
  const rules = fontFaceRules()
  if (!rules.length) return null

  const rows = []
  for (const rule of rules) {
    const family = unquote(rule.style.getPropertyValue('font-family'))
    const weight = rule.style.getPropertyValue('font-weight').trim()
    const display = rule.style.getPropertyValue('font-display').trim()
    const intervals = intervalsOf(rule.style.getPropertyValue('unicode-range'))
    if (!family || !weight || !display || !intervals) return null

    const probe = probeOf(intervals)
    if (probe === null) return null
    const character = String.fromCodePoint(probe)

    let downloaded = null
    try {
      downloaded = document.fonts?.check(`1em "${family}"`, character) ?? null
    } catch {
      downloaded = null
    }
    if (typeof downloaded !== 'boolean') return null

    rows.push({
      id: `${family}-${intervals[0][0]}`,
      family,
      from: intervals[0][0].toString(16).toUpperCase().padStart(4, '0'),
      weight,
      display,
      points: sizeOf(intervals),
      probe: probe.toString(16).toUpperCase().padStart(4, '0'),
      character,
      downloaded,
    })
  }
  return rows.length ? rows : null
}

export default function FontFaceTable() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let live = true
    const run = () => { if (live) setRows(readRows()) }
    // The status column is the point of the table, and before the fonts have
    // settled every row would report the same thing.
    if (typeof document !== 'undefined' && document.fonts?.ready?.then) {
      document.fonts.ready.then(run, run)
    } else {
      run()
    }
    return () => { live = false }
  }, [])

  if (!rows) return null

  return (
    <figure className="lart-table-wrap">
      <div
        className="lart-table-scroll"
        tabIndex={0}
        role="group"
        aria-label="Every font face this page declares, and whether its file has been downloaded"
      >
        <table className="lart-table">
          <thead>
            <tr>
              <th scope="col">Face</th>
              <th scope="col" data-num="true">Weights</th>
              <th scope="col">font-display</th>
              <th scope="col" data-num="true">Code points</th>
              <th scope="col">Downloaded</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  <span className="lart-hex" data-nowrap="true">{r.family}</span>
                  <span className="lart-face-role">range starts U+{r.from}</span>
                </th>
                <td data-num="true">{r.weight}</td>
                <td><code>{r.display}</code></td>
                <td data-num="true">{r.points.toLocaleString('en-GB')}</td>
                <td data-nowrap="true">
                  {r.downloaded ? 'Yes' : 'No'}
                  <span className="lart-face-role">
                    probed with U+{r.probe} <span style={{ fontFamily: `"${r.family}", serif` }}>{r.character}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="lart-table-cap">
        Read at render from this document&rsquo;s own <code>@font-face</code> rules. The code-point
        count is computed from each rule&rsquo;s <code>unicode-range</code> by summing its
        intervals; the last column asks <code>document.fonts.check()</code> whether the file that
        would draw the first printable character in that range has been downloaded, which is a
        different question for every row and depends on what is on this page.
      </figcaption>
    </figure>
  )
}
