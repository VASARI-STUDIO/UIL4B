import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LIBRARY_PALETTE_ROWS } from '../../data/paletteLibrary'
import { useProLibrary } from '../../hooks/useProLibrary'
import { isStub, rowSlots } from '../../utils/libraryRules'
import { classifyPalette, MOOD_LABELS } from '../../utils/paletteMood'
import Glyph from './Glyph'
import { newestPalettes } from './workspace'

// "New in Discover" — four palette cards and "Browse all", as drawn in
// UIL4B App.dc.html (`projects` screen). The design's demo took the first four of the
// gallery; "new" has to be true, so these are the four most recently added to
// it, by the `added` date the library carries. The same rows
// /discover/palettes renders, so every card is a palette a visitor can
// find there.
//
// A palette the account has not opened is a name-only row in the bundle: its
// card has no colours to draw, so it carries a lock label ("Pro palette. Opens with Pro") in the
// strip's place, never grey stand-in swatches, and links to the library, which says what Pro
// opens. A Pro account fetches the whole library and sees the colours.
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
          if (!held) {
            // No colour reaches the page for a locked palette, and none is drawn: the label says what
            // the card is from the first frame.
            return (
              <Link key={p.id} className="uh-disc-card is-locked" to="/discover/palettes" aria-label={`${p.name}, Pro palette, opens with Pro`}>
                <span className="uh-disc-lock" aria-hidden="true">
                  <span className="uh-disc-lock-label">
                    <Glyph name="lock-simple" size={14} />
                    <span>Pro palette. Opens with Pro</span>
                  </span>
                </span>
                <span className="uh-disc-body">
                  <span className="uh-disc-name">{p.name}</span>
                  <span className="uh-disc-meta">{count} · Pro</span>
                </span>
              </Link>
            )
          }
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
