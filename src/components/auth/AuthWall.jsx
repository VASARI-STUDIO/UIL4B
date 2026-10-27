import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AUTH_WALL } from '../../data/authWall.js'
import { AUTH_WALL_GENERATED as G } from '../../data/authWall.generated.js'
import { contrastText } from '../../utils/exportBuilder.js'
import { useI18n } from '../../contexts/I18nContext'
import { useAppearance } from '../../contexts/AppearanceContext'
import { useTheme } from '../../contexts/ThemeContext'
import useMediaQuery from '../../hooks/useMediaQuery'
import '../../styles/pages/auth.css'
import '../../styles/pages/auth-page.css'

// The wall of real exports beside the log-in form: 15 files from UIL4B's own
// tools, each captioned with the tool that made it (data/authWall.js). Three
// presentations of the same list:
//   page   columns, drifting slowly (the /login split, 1024 and up)
//   band   one row of art, drifting sideways (/login below 1024)
//   strip  one still column of the first five, inside the sign-in modal
//
// Motion is deliberately small: a 12px-a-second drift, off whenever a form
// control has focus, the tab is hidden, the wall is offscreen or the visitor
// pressed pause. Reduced motion gets a still board with no pause button.

export const WALL_PAUSED_KEY = 'uil4b-auth-wall-paused'
/** Drift speed. One copy's length divided by this is the loop's duration. */
const DRIFT_PX_PER_S = 12
const STRIP_COUNT = 5

const readPaused = () => {
  try { return sessionStorage.getItem(WALL_PAUSED_KEY) === '1' } catch { return false }
}

// Ink for a ramp row is the better of the two export inks, so it is the same
// answer the style-guide export gives.
const inkFor = (hex) => contrastText(hex)

function CodeArt({ id }) {
  const { lines } = G.code[id]
  return (
    <pre className="aw-code" aria-hidden="true">
      {lines.map((line, i) => {
        const m = line.match(/^(\s*--[\w-]+)(:.*)$/)
        return (
          <span className="aw-line" key={i}>
            {m ? <><span className="aw-prop">{m[1]}</span>{m[2]}</> : <span className="aw-prop">{line}</span>}
          </span>
        )
      })}
    </pre>
  )
}

function Art({ row }) {
  const { t } = useI18n()
  const theme = useTheme()?.theme
  switch (row.kind) {
    case 'palette':
      return (
        <>
          <img className="aw-img" src={row.asset} width="600" height="270" alt="" decoding="async" />
          <span className="sr-only">{t('auth.wall.colours', { list: row.colors.join(', ') })}</span>
        </>
      )
    case 'pair': {
      const p = G.pairs[row.id]
      const alt = t('auth.wall.pairAlt', { heading: p.heading.family, body: p.body.family })
      return <img className="aw-img" src={`${row.asset}-${theme === 'dark' ? 'dark' : 'light'}.webp`} width="600" height="400" alt={alt} decoding="async" />
    }
    case 'guide':
      return <img className="aw-img" src={row.asset} width="600" height="270" alt={t('auth.wall.guideAlt', { name: row.name })} decoding="async" />
    case 'icons':
      return (
        <div className="aw-icons" aria-hidden="true">
          {G.icons[row.id].items.map((it) => <span className="aw-ico" key={it.ref} dangerouslySetInnerHTML={{ __html: it.svg }} />)}
        </div>
      )
    case 'tint':
      return (
        <div className="aw-ramp" aria-hidden="true">
          {G.tints[row.id].steps.map((s) => (
            <div className="aw-step" key={s.step} style={{ background: s.hex, color: inkFor(s.hex) }}>
              <span>{s.step}</span><span>{s.hex}</span>
            </div>
          ))}
        </div>
      )
    case 'scale':
      return <CodeArt id={row.id} />
    default:
      return null
  }
}

function Tile({ row }) {
  return (
    <figure className={'aw-tile aw-tile--' + row.kind}>
      <div className="aw-art"><Art row={row} /></div>
      <figcaption className="aw-cap">
        <span className="aw-name">{row.caption[0]}</span>
        <span className="aw-meta">{row.caption[1]}</span>
        {row.credit && <span className="aw-meta">{row.credit}</span>}
      </figcaption>
    </figure>
  )
}

// One copy of a column (or of the band). The second copy exists only so the
// loop has no seam; it is hidden from assistive tech and from the keyboard.
function TileSet({ rows, copy = false }) {
  return (
    <div className={'aw-set' + (copy ? ' aw-set--copy' : '')} data-aw-set aria-hidden={copy || undefined} inert={copy || undefined}>
      {rows.map((r) => <Tile key={r.id} row={r} />)}
    </div>
  )
}

function PauseIcon({ paused }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {paused ? <path d="M7 4.5v15l12-7.5z" /> : <path d="M6.5 4h4v16h-4zM13.5 4h4v16h-4z" />}
    </svg>
  )
}

export default function AuthWall({ variant = 'page', still = false }) {
  const { t } = useI18n()
  const reduced = !!useAppearance()?.reducedMotion
  const three = useMediaQuery('(min-width:1280px)')
  const rootRef = useRef(null)
  const [paused, setPaused] = useState(readPaused)
  const [hidden, setHidden] = useState(false)
  const [offscreen, setOffscreen] = useState(false)
  const [run, setRun] = useState(false)

  const animated = variant !== 'strip' && !reduced && !still
  const cols = variant === 'page' ? (three ? 3 : 2) : 1

  // Drift only starts when one copy is longer than the room it drifts through.
  // A shorter loop would show its seam, so the wall stays still instead. The
  // duration follows each copy's length so every column moves at the same pace.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!animated || !root) return undefined
    const sideways = variant === 'band'
    const tracks = [...root.querySelectorAll('[data-aw-track]')]
    const measure = () => {
      let fits = tracks.length > 0
      for (const track of tracks) {
        const set = track.firstElementChild
        const size = sideways ? set.offsetWidth : set.offsetHeight
        const room = sideways ? track.parentElement.clientWidth : track.parentElement.clientHeight
        const lead = sideways ? track.offsetLeft : track.offsetTop
        track.style.setProperty('--drift-dur', (size / DRIFT_PX_PER_S).toFixed(1) + 's')
        if (size + lead <= room) fits = false
      }
      setRun(fits)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    tracks.forEach((tr) => ro.observe(tr.firstElementChild))
    return () => ro.disconnect()
  }, [animated, variant, cols])

  useEffect(() => {
    if (!animated) return undefined
    const onVis = () => setHidden(document.visibilityState === 'hidden')
    onVis()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [animated])

  useEffect(() => {
    const root = rootRef.current
    if (!animated || !root || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([e]) => setOffscreen(!e.isIntersecting), { threshold: 0 })
    io.observe(root)
    return () => io.disconnect()
  }, [animated])

  const togglePause = () => {
    const next = !paused
    setPaused(next)
    try { if (next) sessionStorage.setItem(WALL_PAUSED_KEY, '1'); else sessionStorage.removeItem(WALL_PAUSED_KEY) } catch { /* ignore */ }
  }

  const rows = variant === 'strip' ? AUTH_WALL.slice(0, STRIP_COUNT) : AUTH_WALL
  // Round-robin, so no column puts two tiles of one kind together.
  const columns = Array.from({ length: cols }, (_, c) => rows.filter((_, i) => i % cols === c))
  const named = variant !== 'strip'

  // Beside the caption in the page's top bar; inside the band's own slot below 1024.
  const pause = animated && (
    <button type="button" className="btn btn-s aw-pause" onClick={togglePause} aria-pressed={paused} aria-label={paused ? t('auth.wall.playLabel') : t('auth.wall.pauseLabel')}>
      <PauseIcon paused={paused} />
      <span className="aw-pause-text">{paused ? t('auth.wall.play') : t('auth.wall.pause')}</span>
    </button>
  )

  return (
    <section
      ref={rootRef}
      className={'aw aw--' + variant + (variant === 'page' ? ' aw--c' + cols : '')}
      aria-labelledby={named ? 'auth-wall-title' : undefined}
      aria-hidden={named ? undefined : 'true'}
      data-motion={animated ? 'true' : 'false'}
      data-run={animated && run ? 'true' : 'false'}
      data-paused={paused ? 'true' : 'false'}
      data-hidden={hidden ? 'true' : 'false'}
      data-offscreen={offscreen ? 'true' : 'false'}
    >
      {named && <h2 id="auth-wall-title" className="sr-only">{t('auth.wall.title')}</h2>}

      {variant === 'page' ? (
        <div className="aw-cols">
          {columns.map((col, c) => (
            <div className="aw-col" data-up={c % 2 === 0 ? 'true' : 'false'} style={{ '--i': c }} key={c}>
              <div className="aw-track" data-aw-track>
                <TileSet rows={col} />
                {animated && <TileSet rows={col} copy />}
              </div>
            </div>
          ))}
        </div>
      ) : variant === 'band' ? (
        <div className="aw-bandview">
          <div className="aw-track" data-aw-track>
            <TileSet rows={rows} />
            {animated && <TileSet rows={rows} copy />}
          </div>
        </div>
      ) : (
        <div className="aw-strip"><TileSet rows={rows} /></div>
      )}

      {variant === 'page' ? (
        <div className="aw-rail">
          <p className="aw-line-note">{t('auth.wall.note')}</p>
          {pause}
        </div>
      ) : pause}
    </section>
  )
}
