import { GALLERY_PALETTES } from '../../data/paletteGallery'
import { GALLERY_GRADIENTS } from '../../data/gradientGallery'
import { PROMPT_COUNT } from '../../data/communityPromptsPreview'

// Count the libraries whose totals are available in the local gallery data.
const NEUTRAL = ['#15161B', '#33384A', '#5A6379', '#C9CDD6']

export default function DiscoverCounts() {
  const firstGradient = GALLERY_GRADIENTS[0]
  const cards = [
    { count: GALLERY_PALETTES.length, label: 'Palettes, named and tagged', swatches: GALLERY_PALETTES[0].colors.slice(0, 4) },
    { count: GALLERY_GRADIENTS.length, label: 'Gradients, copy as CSS', gradient: firstGradient },
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
