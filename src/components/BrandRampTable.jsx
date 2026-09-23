// The brand-colour article's ramp, generated rather than listed.
//
// The section around this table says that one brand value cannot do every job
// a brand colour is asked to do, and that the ramp is what resolves it. That is
// a claim about specific numbers, so none of them is typed: the eleven stops
// come from generateTintScale() in src/utils/colors.js — the function the Tint
// Scale Generator at /create/tint runs, called with the same defaults
// src/data/designDefaults.js gives it — and every ratio comes from
// contrastRatio(), the function /create/contrast runs.
//
// ── Why the two grounds are constants here ─────────────────────────────────
//
// TokenContrastTable reads --bg-0 out of the running document, which is right
// for a table about the page you are on. This table is about BOTH themes at
// once, and only one of them is mounted, so the two grounds cannot be read —
// they are the product's own two values, written down once. That makes them the
// one thing here that could go stale, so tests/unit/learn-figures.test.js reads
// them back out of src/styles/global.css and fails if either theme's --bg-0
// moves. The check is the reason the constants are allowed to exist.
//
// The seed is the Colour Studio's own default base colour, so the ramp a reader
// sees here is the ramp the product hands them from a standing start.

import { useMemo } from 'react'
import { contrastRatio, generateTintScale, T_LABELS } from '../utils/colors'

/** The two --bg-0 values in src/styles/global.css, light theme then dark. */
const LIGHT_GROUND = '#EFEEE9'
const DARK_GROUND = '#0A0A0C'

/** ColorStudio.jsx's default base colour and its default tint configuration. */
const SEED = '#2563EB'
const TINT_CONFIG = Object.freeze({
  hex: SEED, anchor: 5, hueShift: 0, satMin: -12, satMax: 6, lMin: 3, lMax: 82, mode: 'perceived',
})

// WCAG 2.2: 4.5:1 for normal-size text (SC 1.4.3), 3:1 for the visual
// information required to identify a component or its state (SC 1.4.11).
const TEXT_MIN = 4.5
const BOUNDARY_MIN = 3

/**
 * What a stop is allowed to be, given its two ratios. Derived rather than
 * annotated, so a change to the ramp changes the verdict with it.
 */
function jobsFor(onLight, onDark) {
  const jobs = []
  if (onLight >= TEXT_MIN) jobs.push('text on light')
  else if (onLight >= BOUNDARY_MIN) jobs.push('borders on light')
  if (onDark >= TEXT_MIN) jobs.push('text on dark')
  else if (onDark >= BOUNDARY_MIN) jobs.push('borders on dark')
  if (!jobs.length) return 'Fills and decoration only'
  return `${jobs[0][0].toUpperCase()}${jobs[0].slice(1)}${jobs[1] ? `, ${jobs[1]}` : ''}`
}

export default function BrandRampTable() {
  const rows = useMemo(() => {
    const ramp = generateTintScale(TINT_CONFIG)
    if (ramp.length !== T_LABELS.length) return null
    return ramp.map((hex, i) => {
      const onLight = contrastRatio(hex, LIGHT_GROUND)
      const onDark = contrastRatio(hex, DARK_GROUND)
      return { stop: T_LABELS[i], hex: hex.toUpperCase(), onLight, onDark, jobs: jobsFor(onLight, onDark) }
    })
  }, [])

  if (!rows) return null

  return (
    <figure className="lart-table-wrap">
      <div
        className="lart-table-scroll"
        tabIndex={0}
        role="group"
        aria-label="Each stop of a generated brand ramp, measured against both theme grounds"
      >
        <table className="lart-table">
          <thead>
            <tr>
              <th scope="col">Stop</th>
              <th scope="col">Colour</th>
              <th scope="col" data-num="true">On {LIGHT_GROUND}</th>
              <th scope="col" data-num="true">On {DARK_GROUND}</th>
              <th scope="col">Can carry</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.stop}>
                <th scope="row">{r.stop}</th>
                <td>
                  <span className="lart-swatch" style={{ background: r.hex }} aria-hidden="true" />
                  <span className="lart-hex">{r.hex}</span>
                </td>
                <td data-num="true">{r.onLight.toFixed(2)}:1</td>
                <td data-num="true">{r.onDark.toFixed(2)}:1</td>
                <td data-nowrap="true">{r.jobs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="lart-table-cap">
        <code>generateTintScale()</code> on <code>{SEED}</code> at the Colour Studio&rsquo;s own
        defaults, then <code>contrastRatio()</code> against each theme&rsquo;s{' '}
        <code>--bg-0</code>. The last column is derived from the two ratios beside it: 4.5:1 for
        text (SC 1.4.3), 3:1 for a border or an icon that identifies a control (SC 1.4.11).
      </figcaption>
    </figure>
  )
}
