import { useCallback, useMemo, useState } from 'react'
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
// A palette the account has not opened is a name-only row in the bundle: it has no colours to
// draw. Its strip is a picture the SERVER makes, a soft wash of the palette's mean and its two most distinct
// stops on a coarse grid (api/_lib/library/preview.js), so no hex code reaches the page. The card says "Opens with
// Pro" on it from the first frame, before the picture has arrived. If the picture cannot be had, the
// strip is dropped and a line of text says the same thing, never a grey box. The card links to the
// library, which shows what Pro opens. A Pro account fetches the whole library and sees the colours.
//
// The meta line is the design's "<mood>, <n> colours" when every card in the row has a mood, and
// "<n> colours" on every card when any does not (a locked card has no colours to classify), so the row
// never mixes the two forms. The mood is the library's own
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

/** The soft strip of a locked palette: the server's picture under a solid "Opens with Pro" label. */
function LockedStrip({ id, onFail }) {
  const [ready, setReady] = useState(false)
  return (
    <span className={`uh-disc-lock${ready ? ' is-ready' : ''}`} aria-hidden="true">
      <img
        className="uh-disc-blur"
        src={`/api/ai?palettePreview=${encodeURIComponent(id)}`}
        alt=""
        width="320"
        height="74"
        loading="lazy"
        decoding="async"
        onLoad={() => setReady(true)}
        onError={onFail}
      />
      <span className="uh-disc-lock-label">
        <Glyph name="lock-simple" size={14} />
        <span>Opens with Pro</span>
      </span>
    </span>
  )
}

function LockedCard({ palette, count }) {
  const [failed, setFailed] = useState(false)
  const fail = useCallback(() => setFailed(true), [])
  return (
    <Link className="uh-disc-card is-locked" to="/discover/palettes" aria-label={`${palette.name}, Pro palette, opens with Pro`}>
      {failed
        ? <span className="uh-disc-note">Pro palette</span>
        : <LockedStrip id={palette.id} onFail={fail} />}
      <span className="uh-disc-body">
        <span className="uh-disc-name">{palette.name}</span>
        <span className="uh-disc-meta">{count} · Pro</span>
      </span>
    </Link>
  )
}

export default function DiscoverPicks() {
  const pro = useProLibrary('palettes')
  const picks = useMemo(() => newestPalettes(pro.items ?? LIBRARY_PALETTE_ROWS, 4), [pro.items])
  // One form across the row: a mood is shown only when every card has one. A locked card has no
  // colours to classify, so any locked card in the row means "4 colours" on all of them.
  const moods = useMemo(() => picks.map((p) => (isStub(p) ? null : moodOf(p.colors))), [picks])
  const showMood = moods.length > 0 && moods.every(Boolean)
  return (
    <section className="uh-disc" aria-labelledby="uh-disc-h">
      <div className="uh-disc-head">
        <h2 id="uh-disc-h" className="uh-sec-h">New in Discover</h2>
        <Link className="uh-disc-all" to="/discover/palettes">Browse the Palette Library</Link>
      </div>
      <div className="uh-disc-grid">
        {picks.map((p, i) => {
          const held = !isStub(p)
          const size = held ? p.colors.length : rowSlots(p)
          const mood = showMood ? moods[i] : null
          const count = `${size} colour${size === 1 ? '' : 's'}`
          if (!held) return <LockedCard key={p.id} palette={p} count={count} />
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
