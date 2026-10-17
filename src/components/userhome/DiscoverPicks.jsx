import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LIBRARY_PALETTE_ROWS } from '../../data/paletteLibrary'
import { useProLibrary } from '../../hooks/useProLibrary'
import { isStub, rowSlots } from '../../utils/libraryRules'
import { classifyPalette, MOOD_LABELS } from '../../utils/paletteMood'
import { newestPalettes } from './workspace'

// "New in Discover" — four palette cards and "Browse all", as drawn in
// UIL4B App.dc.html (`projects` screen). The design's demo took the first four of the
// gallery; "new" has to be true, so these are the four most recently added to
// it, by the `added` date the library carries. The same rows
// /discover/palettes renders, so every card is a palette a visitor can
// find there.
//
// A palette the account has not opened is a name-only row in the bundle: its
// card shows neutral steps where the colours would be, and links to the
// library, which says what Pro opens. A Pro account fetches the whole library
// and sees the colours.
//
// The meta line is the design's "<mood>, <n> colours". The mood is the library's own
// classifier (utils/paletteMood.js) — the one its Mood filter uses — never a tag
// typed next to the palette. Warm / Cool / Neutral first, as drawn; a
// palette that is none of the three gets the first mood it does have.
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
  const pro = useProLibrary('palettes')
  const picks = useMemo(() => newestPalettes(pro.items ?? LIBRARY_PALETTE_ROWS, 4), [pro.items])
  return (
    <section className="uh-disc" aria-labelledby="uh-disc-h">
      <div className="uh-disc-head">
        <h2 id="uh-disc-h" className="uh-sec-h">New in Discover</h2>
        <Link className="uh-disc-all" to="/discover/palettes">Browse all</Link>
      </div>
      <div className="uh-disc-grid">
        {picks.map((p) => {
          const held = !isStub(p)
          const size = held ? p.colors.length : rowSlots(p)
          const mood = held ? moodOf(p.colors) : null
          const count = `${size} colour${size === 1 ? '' : 's'}`
          return (
            <Link key={p.id} className="uh-disc-card" to="/discover/palettes">
              <span className={held ? 'uh-disc-strip' : 'uh-disc-strip uh-disc-strip--locked'} aria-hidden="true">
                {held
                  ? p.colors.map((c) => <span key={c} style={{ background: c }} />)
                  : Array.from({ length: size }, (_, i) => <span key={i} />)}
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
