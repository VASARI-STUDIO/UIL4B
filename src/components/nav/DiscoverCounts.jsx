import { LIBRARY_TOTALS, LIBRARY_LEAD } from '../../data/libraryTotals'
import { PROMPT_COUNT } from '../../data/communityPromptsPreview'

// Count the libraries whose totals are available in the local gallery data.
// Palettes and gradients are counted from the generated totals
// (src/data/libraryTotals.js), so no Pro row is needed in the bundle.
const NEUTRAL = ['#15161B', '#33384A', '#5A6379', '#C9CDD6']

export default function DiscoverCounts() {
  const cards = [
    { count: LIBRARY_TOTALS.curatedPalettes, label: 'Palettes, named and tagged', swatches: LIBRARY_LEAD.palette.colors.slice(0, 4) },
    { count: LIBRARY_TOTALS.gradients, label: 'Gradients, copy as CSS', gradient: LIBRARY_LEAD.gradient },
    { count: PROMPT_COUNT, label: 'Prompts for UI and marketing', swatches: NEUTRAL },
  ]
  return (
    <div className="pnav-dcounts">
      {cards.map((c) => (
        <div className="pnav-dcount" key={c.label}>
          {c.gradient ? (
            <span
              className="pnav-dcount-strip"
              aria-hidden="true"
              style={{ backgroundImage: `linear-gradient(90deg, ${c.gradient.stops.map((s) => `${s.color} ${s.position}%`).join(', ')})` }}
            />
          ) : (
            <span className="pnav-dcount-strip" aria-hidden="true">
              {c.swatches.map((hex, i) => <span key={`${hex}-${i}`} style={{ background: hex }} />)}
            </span>
          )}
          <span className="pnav-dcount-n">{c.count}</span>
          <span className="pnav-dcount-l">{c.label}</span>
        </div>
      ))}
    </div>
  )
}
