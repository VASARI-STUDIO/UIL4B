import { GALLERY_PALETTES } from '../../data/paletteGallery'
import { GALLERY_GRADIENTS } from '../../data/gradientGallery'
import { PROMPT_COUNT } from '../../data/communityPromptsPreview'
import { DISCOVER_RESOURCES } from '../../data/discoverResources'

// THE DISCOVER PANE'S 2×2 — `UIL4B App.dc.html` lines 176-190 and 2066-2071.
//
// The design's component, true numbers. Palettes and gradients are counted
// here from the galleries the pages render. The font and icon totals are
// fetched at runtime from Google Fonts and Iconify and exist nowhere in this
// codebase to count, so those two cards are the other two libraries that CAN
// be counted: the prompt library and the curated resources.
//
// Lazy: the resources list is 20 KB of copy that no other always-loaded module
// needs, and the pane only exists once the Discover menu is open.
const NEUTRAL = ['#15161B', '#33384A', '#5A6379', '#C9CDD6']
const NEUTRAL_DEEP = ['#0E0F13', '#232838', '#4B5468', '#C9CDD6']

export default function DiscoverCounts() {
  const firstGradient = GALLERY_GRADIENTS[0]
  const cards = [
    { count: GALLERY_PALETTES.length, label: 'Palettes, named and tagged', swatches: GALLERY_PALETTES[0].colors.slice(0, 4) },
    { count: GALLERY_GRADIENTS.length, label: 'Gradients, copy as CSS', gradient: firstGradient },
    { count: PROMPT_COUNT, label: 'Prompts for UI and marketing', swatches: NEUTRAL },
    { count: DISCOVER_RESOURCES.length, label: 'Curated resources', swatches: NEUTRAL_DEEP },
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
