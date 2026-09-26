import { Link } from 'react-router-dom'
import { GALLERY_PALETTES } from '../../data/paletteGallery'
import { classifyPalette, MOOD_LABELS } from '../../utils/paletteMood'
import { newestPalettes } from './workspace'

// "New in Discover" — four palette cards and "Browse all", as drawn in
// UIL4B App.dc.html (`projects` screen). The design's demo took the first four of the
// gallery; "new" has to be true, so these are the four most recently added to
// it, by the `added` date the gallery carries. The same
// array /discover/palettes renders, so every card is a palette a visitor can
// find there.
//
// The meta line is the design's "<mood>, <n> colours". The mood is the library's own
// classifier (utils/paletteMood.js) — the one its Mood filter uses — never a tag
// typed next to the palette. Warm / Cool / Neutral first, as drawn; a
// palette that is none of the three gets the first mood it does have.
const PICKS = newestPalettes(GALLERY_PALETTES, 4)
const ORDER = ['neutral', 'warm', 'cool', 'pastel', 'vivid', 'dark', 'light', 'monochrome']

function moodOf(colors) {
  try {
    const m = classifyPalette(colors)
    const hit = ORDER.find((k) => m[k])
    return hit ? MOOD_LABELS[hit] : null
  } catch {
    return null
  }
}

export default function DiscoverPicks() {
  return (
    <section className="uh-disc" aria-labelledby="uh-disc-h">
      <div className="uh-disc-head">
        <h2 id="uh-disc-h" className="uh-sec-h">New in Discover</h2>
        <Link className="uh-disc-all" to="/discover/palettes">Browse all</Link>
      </div>
      <div className="uh-disc-grid">
        {PICKS.map((p) => {
          const mood = moodOf(p.colors)
          const count = `${p.colors.length} colour${p.colors.length === 1 ? '' : 's'}`
          return (
            <Link key={p.id} className="uh-disc-card" to="/discover/palettes">
              <span className="uh-disc-strip" aria-hidden="true">
                {p.colors.map((c) => <span key={c} style={{ background: c }} />)}
              </span>
              <span className="uh-disc-body">
                <span className="uh-disc-name">{p.name}</span>
                <span className="uh-disc-meta">{mood ? `${mood}, ${count}` : count}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
