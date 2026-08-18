import { useMemo } from 'react'
import { generateHarmony, autoTonalFromSeed } from '../utils/colors'
import { COLOUR_SYSTEMS } from '../config/colourSystems'
import { resolvePaletteSeed } from '../utils/paletteSeed'

// The upgrade modal's right rail: the actual colour systems the modal is
// selling, generated from the user's own seed by the same functions the tools
// run — generateHarmony() for the hue harmonies, autoTonalFromSeed() for the
// tonal Auto system. No harmony maths is reimplemented here.
//
// This replaces a decorative purple/pink gradient with an abstract circle
// diagram. That panel was three things at once: off-brand (the accent is blue
// on warm bone), stock (it would look identical for every user forever), and
// mute about the product (it showed nothing the subscription actually buys).
// Because these strips are drawn from live code against a live seed, they
// change per user and cannot read as stock art — which was the point.
//
// The Pro rows are rendered in FULL COLOUR, not blurred or greyed. That is
// deliberate and it is the honest version of the technique: the user sees
// exactly what they would get, clearly labelled as Pro, and the generator
// itself stays gated. A blurred teaser would be selling a shape.

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

export default function ProHarmonyPreview({ seed: explicitSeed }) {
  const { seed, source } = useMemo(() => resolvePaletteSeed(explicitSeed), [explicitSeed])

  // One generation pass for the whole rail. Each strip is five swatches because
  // that is what the palette tools produce — a four-swatch preview would be
  // showing a system the product does not build.
  const rows = useMemo(() => COLOUR_SYSTEMS.map((sys) => {
    let colors = []
    try {
      colors = sys.tonal ? autoTonalFromSeed(seed) : generateHarmony(seed, sys.id)
    } catch {
      // The HCT solver can fail on out-of-gamut requests. A system that cannot
      // be drawn is dropped rather than rendered as five empty boxes.
      colors = []
    }
    return { ...sys, colors: Array.isArray(colors) ? colors.filter(Boolean) : [] }
  }).filter((r) => r.colors.length >= 2), [seed])

  if (!rows.length) return null

  const proCount = rows.filter((r) => !r.free).length

  return (
    <aside className="ui-pro-rail" aria-labelledby="ui-pro-rail-h">
      <p className="ui-pro-rail-h" id="ui-pro-rail-h">
        {source === 'brand' ? 'Every colour system' : 'Your seed, every system'}
      </p>
      <p className="ui-pro-rail-seed">
        <span className="ui-pro-rail-chip" style={{ background: seed }} aria-hidden="true" />
        <span>{seed.toUpperCase()}</span>
      </p>

      <ul className="ui-pro-rail-list">
        {rows.map((row) => (
          <li className={'ui-pro-rail-row' + (row.free ? ' is-free' : '')} key={row.id}>
            <span className="ui-pro-rail-name">
              {!row.free && <span className="ui-pro-rail-lock"><LockIcon /></span>}
              {row.label}
              {row.free && <span className="ui-pro-rail-free">Free</span>}
            </span>
            {/* One strip = one generated system. aria-hidden because the row's
                own name already carries the meaning, and reading out five
                hex values per row would bury the rest of the modal. */}
            <span className="ui-pro-rail-strip" aria-hidden="true">
              {row.colors.map((c, i) => (
                <span className="ui-pro-rail-sw" key={`${row.id}-${i}`} style={{ background: c }} />
              ))}
            </span>
          </li>
        ))}
      </ul>

      <p className="ui-pro-rail-foot">
        Generated live from {source === 'brand' ? 'the brand seed' : 'your last palette'} —
        {' '}{proCount} of these {proCount === 1 ? 'system is' : 'systems are'} Pro.
      </p>
    </aside>
  )
}
