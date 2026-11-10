import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PhIcon from '../spectrum/PhIcon'
import { EXPORT_THEMES } from '../../config/exportFormats'
import { THEME_FACTS, numberWord } from '../../config/planFacts'
import { prefersReducedMotion } from '../spectrum/reducedMotion'
import { DEFAULT_KIND_ID, SHOWCASE_KINDS, showcaseImage, showcaseRatio } from './showcaseImages'
import { preloadPage } from './showcasePreload'
import ShowcaseViewer from './ShowcaseViewer'
import '../../styles/pages/home-showcase.css'

// ships with the export themes
// "Pick a page, compare ten themes": a picker of page kinds over two rows that show
// the picked kind in every export theme. Only the picked kind's images are in the
// DOM (bar the old page for a moment while it fades out). A pick swaps all of them in one
// commit, once every new page has loaded, or after SLOW_SWAP_MS with the ones that have. The
// new page is already in the cache when it appears, and crossfades in over the old one, each
// tile a beat after the one before. When the section first scrolls into view the tiles rise in
// the same way. Opacity and transform only; reduced motion drops the movement and the stagger.

const capitalise = (text) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`
const joinAnd = (items) => (items.length < 2
  ? items.join('')
  : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)

// Which row a theme sits in follows its page shape; the order is the theme list's.
const SLOTS = EXPORT_THEMES.map((theme, index) => ({ theme, index, landscape: theme.shape !== 'A4' }))
const LANDSCAPE = SLOTS.filter((s) => s.landscape)
const PORTRAIT = SLOTS.filter((s) => !s.landscape)

const INTENT_DELAY_MS = 80
// How long a pick waits for all ten pages before swapping the ones it has.
const SLOW_SWAP_MS = 600
// A page crossfades in over FADE_MS (the same in home-showcase.css); each tile, in theme order,
// starts FADE_STEP_MS after the one before it.
const FADE_MS = 240
const FADE_STEP_MS = 24
// The scroll-in reveal: each tile moves for REVEAL_MS (the same in the CSS), REVEAL_STEP_MS apart.
const REVEAL_MS = 300
const REVEAL_STEP_MS = 32
const REVEAL_LAST = EXPORT_THEMES.length - 1
const kindIndex = (id) => SHOWCASE_KINDS.findIndex((k) => k.id === id)
const kindLabel = (id) => SHOWCASE_KINDS[kindIndex(id)].label

// ── Page loading ─────────────────────────────────────────────────────────────
//
// A page is "ready" once its thumbnail is in the browser's cache (see preloadPage), so
// the visible image is served from cache. A failed load is forgotten, so it can retry.

const loads = new Map()
const ready = new Set()
const pageKey = (themeId, kindId) => `${themeId}/${kindId}`

function loadPage(themeId, kindId) {
  const key = pageKey(themeId, kindId)
  if (loads.has(key)) return loads.get(key)
  const promise = preloadPage(showcaseImage(themeId, kindId).thumb).then((ok) => {
    if (ok) ready.add(key)
    else loads.delete(key)
    return ok
  })
  loads.set(key, promise)
  return promise
}

const loadKind = (kindId) => Promise.all(EXPORT_THEMES.map((t) => loadPage(t.id, kindId)))

// ── One page ─────────────────────────────────────────────────────────────────

// The kind a tile showed before its last swap, while the new page fades in over it; null
// once the fade is done. It is derived from the kind changing, so the old page is in the
// same commit as the new one.
function useLeavingKind(kindId, place) {
  const [seen, setSeen] = useState({ kind: kindId, leaving: null })
  if (seen.kind !== kindId) setSeen({ kind: kindId, leaving: seen.kind })
  const { leaving } = seen
  useEffect(() => {
    if (leaving === null) return undefined
    const timer = window.setTimeout(() => {
      setSeen((prev) => (prev.leaving === leaving ? { ...prev, leaving: null } : prev))
    }, FADE_MS + place * FADE_STEP_MS + 60)
    return () => window.clearTimeout(timer)
  }, [leaving, place])
  const drop = useCallback(() => setSeen((prev) => (prev.leaving === null ? prev : { ...prev, leaving: null })), [])
  return [leaving, drop]
}

const ShowcaseTile = memo(function ShowcaseTile({ slot, kindId, failed, onFailed, onOpen }) {
  const { theme, index } = slot
  const label = kindLabel(kindId).toLowerCase()
  const alt = `${theme.brand} ${label} page, ${theme.name} theme`
  const { thumb } = showcaseImage(theme.id, kindId)
  const tier = capitalise(theme.tier)
  const [leaving, dropLeaving] = useLeavingKind(kindId, index)
  const out = leaving !== null && !failed ? showcaseImage(theme.id, leaving).thumb : null
  return (
    <li
      style={{
        '--ar': showcaseRatio(theme.id),
        '--fade-delay': `${index * FADE_STEP_MS}ms`,
        '--reveal-delay': `${index * REVEAL_STEP_MS}ms`,
      }}
    >
      <figure className="hsc-fig">
        <button
          type="button"
          id={`hsc-tile-${index}`}
          className="hsc-open"
          aria-haspopup="dialog"
          aria-label={`Enlarge ${alt}`}
          onClick={(event) => {
            // Safari doesn't focus a button when it is tapped, and focus is what returns here on close.
            event.currentTarget.focus({ preventScroll: true })
            onOpen(index, kindId)
          }}
        >
          <span className="hsc-page">
            {failed ? (
              <span className="hsc-fail">Page didn’t load</span>
            ) : (
              <>
                {out && (
                  <picture key={`out-${leaving}`} aria-hidden="true">
                    <source type="image/avif" srcSet={out.avif} />
                    <source type="image/webp" srcSet={out.webp} />
                    <img src={out.webp} alt="" width={out.width} height={out.height} className="hsc-out" onError={dropLeaving} />
                  </picture>
                )}
                <picture key={kindId}>
                  <source type="image/avif" srcSet={thumb.avif} />
                  <source type="image/webp" srcSet={thumb.webp} />
                  <img
                    src={thumb.webp}
                    alt={alt}
                    width={thumb.width}
                    height={thumb.height}
                    className={out ? 'hsc-in' : undefined}
                    loading={leaving === null ? 'lazy' : 'eager'}
                    decoding="async"
                    onError={() => onFailed(index)}
                  />
                </picture>
              </>
            )}
          </span>
          <span className="hsc-zoom" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
            </svg>
          </span>
        </button>
        <figcaption className="hsc-cap">
          <span className="hsc-cap1">
            <span className="hsc-name">{theme.name}</span>
            <span className={theme.tier === 'free' ? 'hsc-tier hsc-tier--free' : 'hsc-tier'}>{tier}</span>
          </span>
          <span className="hsc-cap2">{theme.brand}</span>
        </figcaption>
      </figure>
    </li>
  )
})

// ── The section ──────────────────────────────────────────────────────────────

export default function HomeShowcase() {
  const rootRef = useRef(null)
  const tabRefs = useRef([])
  const intentTimer = useRef(0)
  const swapTimer = useRef(0)
  const swapToken = useRef(0)
  // `kindId` is the picked kind. `shown` is the kind each page currently displays: it
  // trails the pick until the new pages have loaded, and stays put for a page that fails.
  const [kindId, setKindId] = useState(DEFAULT_KIND_ID)
  const [shown, setShown] = useState(() => EXPORT_THEMES.map(() => DEFAULT_KIND_ID))
  const [failed, setFailed] = useState(() => EXPORT_THEMES.map(() => false))
  const [announce, setAnnounce] = useState('')
  // The page open in the viewer: its position in the theme list and the kind it was showing.
  const [viewer, setViewer] = useState(null)
  // The scroll-in reveal: off (no motion, or already on screen when mounted), armed (tiles
  // held back until the panel scrolls near), in (tiles moving), done (all at rest).
  const [reveal, setReveal] = useState('off')

  // Armed before the first paint, so a tile is never seen and then hidden. Without an
  // observer, or with motion off, the tiles are simply there.
  useLayoutEffect(() => {
    const panel = rootRef.current?.querySelector('.hsc-panel')
    if (!panel || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return undefined
    if (panel.getBoundingClientRect().top < window.innerHeight * 0.85) return undefined
    let settle = 0
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      setReveal('in')
      settle = window.setTimeout(() => setReveal('done'), REVEAL_MS + REVEAL_LAST * REVEAL_STEP_MS + 80)
    }, { rootMargin: '0px 0px -12% 0px' })
    observer.observe(panel)
    // The layout effect runs before paint, so this arms the tiles in the same frame; it needs the DOM measure above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReveal('armed')
    return () => {
      observer.disconnect()
      window.clearTimeout(settle)
    }
  }, [])

  useEffect(() => () => {
    window.clearTimeout(intentTimer.current)
    window.clearTimeout(swapTimer.current)
    swapToken.current += 1
  }, [])

  const markFailed = useCallback((index) => {
    setFailed((prev) => (prev[index] ? prev : prev.map((f, i) => (i === index ? true : f))))
  }, [])

  const openViewer = useCallback((index, openKindId) => setViewer({ index, kindId: openKindId }), [])
  const closeViewer = useCallback(() => setViewer(null), [])

  const swapTo = useCallback((id) => {
    const token = ++swapToken.current
    window.clearTimeout(swapTimer.current)
    const current = () => token === swapToken.current
    // `results[i]` says whether theme i's new page is ready to show.
    const apply = (results) => {
      setShown((prev) => prev.map((k, i) => (results[i] ? id : k)))
      setFailed((prev) => prev.map((f, i) => (results[i] ? false : f)))
      rootRef.current?.querySelectorAll('[data-hsc-rail]').forEach((rail) => { rail.scrollLeft = 0 })
    }
    if (EXPORT_THEMES.every((t) => ready.has(pageKey(t.id, id)))) {
      apply(EXPORT_THEMES.map(() => true))
      return
    }
    const loading = EXPORT_THEMES.map((t) => loadPage(t.id, id))
    let swapped = false
    // Not everything arrived in time: swap the pages that are ready. Each of the others keeps
    // its old image, and swaps on its own as soon as its new one has loaded.
    swapTimer.current = window.setTimeout(() => {
      if (!current() || swapped) return
      swapped = true
      const results = EXPORT_THEMES.map((t) => ready.has(pageKey(t.id, id)))
      apply(results)
      loading.forEach((load, at) => {
        if (results[at]) return
        load.then((ok) => {
          if (!ok || !current()) return
          setShown((prev) => prev.map((k, i) => (i === at ? id : k)))
          setFailed((prev) => prev.map((f, i) => (i === at ? false : f)))
        })
      })
    }, SLOW_SWAP_MS)
    Promise.all(loading).then((results) => {
      if (!current() || swapped) return
      swapped = true
      window.clearTimeout(swapTimer.current)
      apply(results)
    })
  }, [])

  const pick = useCallback((id, { focus = false } = {}) => {
    if (focus) tabRefs.current[kindIndex(id)]?.focus()
    if (id === kindId) return
    setKindId(id)
    setAnnounce(`Showing the ${kindLabel(id).toLowerCase()} page in all ${THEME_FACTS.countWord} themes.`)
    swapTo(id)
  }, [kindId, swapTo])

  // Intent to pick a kind: the pointer rests on its tab, the tab takes focus, or it is pressed.
  const preload = useCallback((id) => { loadKind(id) }, [])
  const onTabEnter = (id) => {
    window.clearTimeout(intentTimer.current)
    intentTimer.current = window.setTimeout(() => preload(id), INTENT_DELAY_MS)
  }
  const onTabLeave = () => window.clearTimeout(intentTimer.current)

  const onTabKeyDown = (event, at) => {
    const last = SHOWCASE_KINDS.length - 1
    const to = {
      ArrowLeft: at === 0 ? last : at - 1,
      ArrowRight: at === last ? 0 : at + 1,
      Home: 0,
      End: last,
    }[event.key]
    if (to === undefined) return
    event.preventDefault()
    pick(SHOWCASE_KINDS[to].id, { focus: true })
  }

  const count = THEME_FACTS.countWord

  const renderRow = (slots, modifier, labelId) => (
    <ul className={`hsc-row hsc-row--${modifier}`} role="list" aria-labelledby={labelId} data-hsc-rail="">
      {slots.map((slot) => (
        <ShowcaseTile
          key={slot.theme.id}
          slot={slot}
          kindId={shown[slot.index]}
          failed={failed[slot.index]}
          onFailed={markFailed}
          onOpen={openViewer}
        />
      ))}
    </ul>
  )

  return (
    <div className="hsc" ref={rootRef} data-reveal={reveal}>
      <div className="hsc-inner">
        <div className="hsc-head">
          <h2 id="examples-h" className="hsc-h" tabIndex={-1}>
            <span className="hsc-h-line">Don’t believe us?</span>{' '}
            <span className="hsc-h-line">See it for yourself.</span>
          </h2>
          {/* ships with the export themes */}
          <p className="hsc-sub">
            {capitalise(count)} sample brands, {count} export themes. Pick a page to see it in all {count}, then open
            any of them full size. Every page below is a real export, not a mock-up.
          </p>
        </div>

        <div className="hsc-bar" role="tablist" aria-label="Choose a page to compare">
          {SHOWCASE_KINDS.map((kind, at) => (
            <button
              key={kind.id}
              ref={(el) => { tabRefs.current[at] = el }}
              type="button"
              role="tab"
              id={`hsc-tab-${kind.id}`}
              className="hsc-tab"
              aria-selected={kind.id === kindId}
              aria-controls="hsc-panel"
              tabIndex={kind.id === kindId ? 0 : -1}
              onClick={() => pick(kind.id)}
              onKeyDown={(event) => onTabKeyDown(event, at)}
              onPointerEnter={() => onTabEnter(kind.id)}
              onPointerLeave={onTabLeave}
              onPointerDown={() => preload(kind.id)}
              onFocus={() => preload(kind.id)}
            >
              {kind.label}
            </button>
          ))}
        </div>
        {/* ships with the export themes */}
        <p className="hsc-note">{THEME_FACTS.freeNames} are free for the UI kit. Everything else is Pro.</p>
        <p className="hsc-hint">
          Swipe each row. {capitalise(numberWord(LANDSCAPE.length))} on top, {numberWord(PORTRAIT.length)} below.
        </p>
        <p className="sr-only" role="status" aria-live="polite">{announce}</p>

        <div className="hsc-panel" id="hsc-panel" role="tabpanel" aria-labelledby={`hsc-tab-${kindId}`} data-kind={kindId}>
          <div className="hsc-group">
            <p className="hsc-rowlabel" id="hsc-label-land">Slides and landscape pages</p>
            {renderRow(LANDSCAPE, 'land', 'hsc-label-land')}
          </div>
          <div className="hsc-group">
            <p className="hsc-rowlabel" id="hsc-label-port">Portrait pages</p>
            {renderRow(PORTRAIT, 'port', 'hsc-label-port')}
          </div>
        </div>

        <div className="hsc-foot">
          {/* ships with the export themes */}
          <p className="hsc-footnote">
            {joinAnd(EXPORT_THEMES.map((t) => t.brand))} are sample brands; {EXPORT_THEMES[0].brand}’s photos are from Unsplash.{' '}
            {THEME_FACTS.uiKitNoteWords}; every other export is Pro.
          </p>
          <Link className="hsc-cta ui-pill-out" to="/projects">
            Open the toolkit
            <span className="mi-go" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
          </Link>
        </div>
      </div>
      {viewer && <ShowcaseViewer themeIndex={viewer.index} kindId={viewer.kindId} onClose={closeViewer} />}
    </div>
  )
}
