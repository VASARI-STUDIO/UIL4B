import { useCallback, useEffect, useId, useReducer, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EXPORT_THEMES } from '../../config/exportFormats'
import useModalDialog from '../../hooks/useModalDialog'
import { useCloseOnBack, useInertBehind } from '../../hooks/useCloseOnBack'
import { prefersReducedMotion } from '../spectrum/reducedMotion'
import { SHOWCASE_KINDS, showcaseImage, viewerKinds } from './showcaseImages'
import { preloadPage } from './showcasePreload'

// ships with the export themes
// The page viewer: one theme's pages at a large size, stepping through a few of its
// export pages (the one clicked first). useModalDialog supplies the focus trap, Escape,
// the scroll lock on <html> and the return of focus to the tile that opened it.
// Below 768px it is a full-screen sheet with its controls in a bottom bar.
// Only the page in view is fetched when the viewer opens; its neighbours are warmed after.

// How long the leaving animation runs before the viewer unmounts.
const EXIT_MS = 150
const EXIT_REDUCED_MS = 120
// How long the new page takes to settle over the old one, plus a frame of slack.
const FADE_MS = 220
const FADE_REDUCED_MS = 120
const SWIPE_PX = 48
const SHEET_QUERY = '(max-width: 767px)'

const capitalise = (text) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`
const kindName = (id) => SHOWCASE_KINDS.find((k) => k.id === id).label

// ── Which page is in view ────────────────────────────────────────────────────
//
// `index` is the page in view and `under` the page it fades in over. `phase`:
//   idle  the page in view is settled
//   wait  the new page is mounted at opacity 0 and is loading
//   fade  it has loaded and is moving in
// `dir` is 1 after a step forward and -1 after one back: the new page comes in from that side.
// A step made while the last one is still settling keeps the older page underneath,
// so the page under the fade is always one that has been seen.
function reduce(state, action) {
  switch (action.type) {
    case 'step':
      return {
        index: (state.index + action.delta + action.total) % action.total,
        under: state.phase === 'idle' ? (state.failed ? null : state.index) : state.under,
        phase: 'wait',
        failed: false,
        steps: state.steps + 1,
        dir: action.delta < 0 ? -1 : 1,
      }
    case 'loaded':
      return state.phase === 'wait' ? { ...state, phase: 'fade' } : state
    case 'settled':
      return state.phase === 'fade' ? { ...state, phase: 'idle', under: null } : state
    case 'failed':
      return { ...state, phase: 'idle', under: null, failed: true }
    default:
      return state
  }
}

// Large pages already asked for, so stepping onto a neighbour finds it cached.
const warmed = new Set()
function warm(themeId, kindId) {
  const key = `${themeId}/${kindId}`
  if (warmed.has(key)) return
  warmed.add(key)
  preloadPage(showcaseImage(themeId, kindId).large).then((ok) => { if (!ok) warmed.delete(key) })
}

const Chevron = ({ back }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={back ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
)

function Page({ themeId, kindId, alt, className, imgRef, onLoad, onError }) {
  const { large } = showcaseImage(themeId, kindId)
  return (
    <picture>
      <source type="image/avif" srcSet={large.avif} />
      <source type="image/webp" srcSet={large.webp} />
      <img
        ref={imgRef}
        className={className}
        src={large.webp}
        alt={alt}
        width={large.width}
        height={large.height}
        loading="lazy"
        decoding="async"
        onLoad={onLoad}
        onError={onError}
      />
    </picture>
  )
}

export default function ShowcaseViewer({ themeIndex, kindId, onClose }) {
  const titleId = useId()
  // The kinds this viewer steps through, fixed for as long as it is open.
  const [kinds] = useState(() => viewerKinds(kindId))
  const total = kinds.length
  const [state, dispatch] = useReducer(reduce, { index: 0, under: null, phase: 'idle', failed: false, steps: 0, dir: 1 })
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef(0)
  const topRef = useRef(null)
  const touch = useRef(null)

  const { index, under, phase, failed, steps, dir } = state
  const theme = EXPORT_THEMES[themeIndex]
  const pageKind = kinds[index]
  const pageLabel = kindName(pageKind).toLowerCase()
  // Said after each step. The first page is not announced: the dialog's name covers it.
  const announce = steps ? `${capitalise(pageLabel)} page, ${theme.name}. ${index + 1} of ${total}.` : ''
  const altFor = (at) => `${theme.brand} ${kindName(kinds[at]).toLowerCase()} page, ${theme.name} theme, ${at + 1} of ${total}`

  // The exit animation plays, then the viewer unmounts; the hook's cleanup (unlock, focus
  // back to the tile) runs at that point, so the page stays locked until it has gone.
  const requestClose = useCallback(() => {
    if (closeTimer.current) return
    setClosing(true)
    closeTimer.current = window.setTimeout(onClose, prefersReducedMotion() ? EXIT_REDUCED_MS : EXIT_MS)
  }, [onClose])

  const dialogRef = useModalDialog(requestClose)
  useCloseOnBack(true, requestClose)
  useInertBehind(true)

  useEffect(() => () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = 0
  }, [])

  const step = useCallback((delta) => {
    if (closeTimer.current) return
    dispatch({ type: 'step', delta, total })
  }, [total])

  // Warm the pages either side of the one in view.
  useEffect(() => {
    warm(theme.id, kinds[(index + 1) % total])
    warm(theme.id, kinds[(index - 1 + total) % total])
  }, [theme.id, kinds, index, total])

  // A new page that is already cached may have finished before React could hear its load.
  useEffect(() => {
    const img = topRef.current
    if (phase === 'wait' && img?.complete && img.naturalWidth > 0) dispatch({ type: 'loaded' })
  }, [index, phase])

  // The move starts two frames after the load, so the change is a real transition.
  const onLoaded = useCallback(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => dispatch({ type: 'loaded' })))
  }, [])

  useEffect(() => {
    if (phase !== 'fade') return undefined
    const t = window.setTimeout(() => dispatch({ type: 'settled' }), prefersReducedMotion() ? FADE_REDUCED_MS + 20 : FADE_MS + 20)
    return () => window.clearTimeout(t)
  }, [phase])

  const onKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
    else if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
  }

  // The scrim is the overlay and the empty parts of the dialog around the page. On the
  // phone the dialog is the whole screen, so a tap there closes nothing.
  const onScrimClick = (event) => {
    if (!event.target.hasAttribute('data-hsv-close')) return
    if (window.matchMedia(SHEET_QUERY).matches) return
    requestClose()
  }

  // A horizontal swipe on the page steps. A second finger (a pinch) or a page already
  // zoomed in is the reader zooming, not swiping.
  const onTouchStart = (event) => {
    const point = event.touches[0]
    touch.current = event.touches.length === 1 && point ? { x: point.clientX, y: point.clientY } : null
  }
  const onTouchEnd = (event) => {
    const start = touch.current
    touch.current = null
    const point = event.changedTouches[0]
    const zoomed = window.visualViewport && window.visualViewport.scale > 1.02
    if (!start || !point || zoomed) return
    const dx = point.clientX - start.x
    const dy = point.clientY - start.y
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1)
  }

  const topClass = `hsv-img hsv-top${phase === 'wait' ? ' is-wait' : ''}${phase === 'fade' ? ' is-fade' : ''}`

  return createPortal(
    <div className={closing ? 'hsv-ov is-out' : 'hsv-ov'} data-hsv-close="" onClick={onScrimClick} onKeyDown={onKeyDown}>
      <div
        className="hsv-dlg"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-hsv-close=""
      >
        <div className="hsv-meta" data-hsv-close="">
          <p className="hsv-title" id={titleId}>
            <span>{theme.name}</span>
            <span className={theme.tier === 'free' ? 'hsv-tier hsv-tier--free' : 'hsv-tier'}>{capitalise(theme.tier)}</span>
          </p>
          <p className="hsv-brand">{theme.brand}, sample brand<span className="hsv-kind">{kindName(pageKind)} page</span></p>
        </div>
        <p className="hsv-count">{index + 1} of {total}</p>

        <div className="hsv-stage" data-hsv-close="" data-dir={dir} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {under !== null && (
            <span className="hsv-under" aria-hidden="true">
              <Page key={`under-${under}`} themeId={theme.id} kindId={kinds[under]} alt="" className="hsv-img" />
            </span>
          )}
          {failed ? (
            <span className="hsv-fail">Page didn’t load</span>
          ) : (
            <Page
              key={`top-${index}`}
              themeId={theme.id}
              kindId={pageKind}
              alt={altFor(index)}
              className={topClass}
              imgRef={topRef}
              onLoad={onLoaded}
              onError={() => dispatch({ type: 'failed' })}
            />
          )}
        </div>

        <button type="button" className="hsv-btn hsv-prev" aria-label="Previous page" onClick={() => step(-1)}>
          <Chevron back />
          <span className="hsv-steptext" aria-hidden="true">Previous</span>
        </button>
        <button type="button" className="hsv-btn hsv-next" aria-label="Next page" onClick={() => step(1)}>
          <span className="hsv-steptext" aria-hidden="true">Next</span>
          <Chevron />
        </button>
        <button type="button" className="hsv-btn hsv-close" aria-label="Close" onClick={requestClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <p className="sr-only" role="status" aria-live="polite">{announce}</p>
      </div>
    </div>,
    document.body,
  )
}
