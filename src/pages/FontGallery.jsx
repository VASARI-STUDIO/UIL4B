import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FontCatalogLoading, FontCatalogNotice } from '../components/FontCatalogState'
import LibrarySearch from '../components/library/LibrarySearch'
import LibraryEmpty from '../components/library/LibraryEmpty'
import useModalDialog from '../hooks/useModalDialog'
import {
  ToolLayout, ToolToolbar, ToolButton, ToolPills, ToolSelect,
} from '../components/tool/ToolLayout'
import FiltersSheet, { ViewToggle } from '../components/FontGalleryFilters'
import FontDetailDialog from '../components/FontDetailDialog'
import { useFontCatalog } from '../hooks/useFontCatalog'
import { useProject } from '../contexts/ProjectContext'
import { useTheme } from '../contexts/ThemeContext'
import { typeToolsBarItems } from '../components/tool/TypeToolsBar'
import { trackFontCopy } from '../utils/analytics'
import {
  bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont,
  verifyFontLoaded,
} from '../utils/googleFonts'
import ToolIcon from '../components/tool/ToolIcon'
import { categoryWord, filterGalleryListTypefaces, ladderWeights } from '../utils/fontGallery'
import { ownFont, ownTypeScale, setPairDraft, setScaleDraft } from '../utils/typeHandoff'
import {
  backdropFor, backdropKind, backdropReady, backdropUrls, loadBackdrop, loadBackdropsInTurn,
} from '../utils/galleryBackdrop'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/colour.css'
import '../styles/deferred/library.css'
import '../styles/deferred/tool-shell.css'
import '../styles/deferred/type.css'
// The page's own sheet, scoped under `.fg-page`, the page root.
import '../styles/pages/font-gallery.css'

// Font Gallery — the standalone /create/font-gallery page. Browse the Google Fonts
// catalogue, read a specimen, then carry the choice into Font Pair or Type
// Scale. This is the entry point of the typography suite, so it is the one that
// has to survive a bad network gracefully.
//
// Three things this rebuild fixes, all logged as `font-gallery-readiness` in
// src/data/pipeline.js before the route was activated:
//
//   1. PREVIEW FOUT. Each catalogue row renders a skeleton in the exact reserved
//      box until verifyFontLoaded confirms the face is painting. No fallback
//      text ever masquerades as the selected family.
//
//   2. RESERVED METRICS. Every preview box has a fixed height and its text is
//      clipped, so a family whose metrics differ wildly from the fallback
//      cannot change a card's height. The grid geometry is settled at first
//      paint and never moves as faces stream in.
//
//   3. KEYBOARD + DIALOG ACCESSIBILITY. Cards are real buttons. The detail and
//      compare overlays are `role="dialog" aria-modal="true"` with a focus
//      trap, Escape to close, and focus returned to the card that opened them.
//
// Murphy's law: the catalogue degrades to the bundled list with a visible
// notice and a working retry (useFontCatalog); an individual face that is
// blocked is reported per-font in the detail dialog with its own retry, and
// never silently rendered as a system fallback pretending to be the real thing.

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'sans-serif', label: 'Sans Serif' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'handwriting', label: 'Script' },
  { id: 'monospace', label: 'Mono' },
]

// What the type-tools switcher shows until the project has faces of its own:
// the same sample pair Font Pair and Type Scale open on.
const SAMPLE_HEADING = { family: 'Archivo', weight: 800, category: 'sans-serif' }
const SAMPLE_BODY = { family: 'IBM Plex Sans', weight: 400, category: 'sans-serif' }

const SORTS = [
  { id: 'popularity', label: 'Popular' },
  { id: 'alphabetical', label: 'A–Z' },
  { id: 'weights', label: 'Most weights' },
]

const PANGRAM = 'The quick brown fox jumps over the lazy dog'
// 24, not 48. A page of results is a scroll distance, not a card count: one
// specimen per row makes each result about twice as tall, so keeping 48 would
// have doubled the run to the "Show more" control and to the tools below it.
// Twenty-four full-width rows are about the height forty-eight cards were in
// three columns. The infinite-scroll sentinel still fills in on approach, so
// this changes how much arrives at once, not how much is reachable.
const PAGE_SIZE = 24
const MAX_COMPARE = 3

// The three layouts. `name` is the band's name size and the size the list
// opens at; `floor` is how far a long name may shrink before it is clipped;
// `ratio` turns the size into the band's height, so changing the size moves the
// whole list once and never one band on its own.
const LAYOUTS = {
  wide: { name: 96, floor: 72, ratio: 2.5, grid: 56 },
  tablet: { name: 64, floor: 48, ratio: 3.125, grid: 40 },
  phone: { name: 40, floor: 32, ratio: 3, grid: 24 },
}
const SIZE_MIN = 24
const SIZE_MAX = 120
const SIZE_CHOICES = [24, 32, 40, 48, 64, 72, 96, 120]
const MIN_BAND = 72

// Category names as they read in running text come from the shared helper, so
// the pop-up, the browser and Font Pair spell them the same.
const catWord = categoryWord
const sentence = (word) => word.charAt(0).toUpperCase() + word.slice(1)

function layoutFor() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'wide'
  if (window.matchMedia('(min-width: 1024px)').matches) return 'wide'
  return window.matchMedia('(min-width: 768px)').matches ? 'tablet' : 'phone'
}

// Which of the three layouts the viewport is in. The toolbar carries a
// different set of controls in each, so the page needs to know.
function useLayoutName() {
  const [name, setName] = useState(layoutFor)
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const queries = [window.matchMedia('(min-width: 1024px)'), window.matchMedia('(min-width: 768px)')]
    const update = () => setName(layoutFor())
    queries.forEach(mq => mq.addEventListener?.('change', update))
    update()
    return () => queries.forEach(mq => mq.removeEventListener?.('change', update))
  }, [])
  return name
}

// Fits are batched: every name queued in a frame is reset, then measured, then
// written, so a page of bands costs one layout rather than one per band. A font
// loading or a resize can queue every band at once; they all settle in one frame.
const pendingFits = new Set()
let fitFrame = 0
function runFits() {
  fitFrame = 0
  const jobs = Array.from(pendingFits).filter(job => !job.dead)
  pendingFits.clear()
  jobs.forEach(job => job.el.style.setProperty('--fg-fit', '1'))
  jobs.forEach(job => {
    job.room = job.box.clientWidth
    job.natural = job.el.scrollWidth
  })
  jobs.forEach(job => {
    job.scale = job.room > 0 && job.natural > job.room ? Math.max(job.room / job.natural, job.floor) : 1
    job.el.style.setProperty('--fg-fit', String(job.scale))
  })
  // Width is not exactly linear in font size: hinting and rounding can leave a
  // scaled name a few pixels over. Measure again and shrink by what is left,
  // still never below the floor.
  for (let pass = 0; pass < 2; pass++) {
    const over = jobs.filter(job => job.scale < 1 && job.scale > job.floor)
      .map(job => ({ job, width: job.el.scrollWidth }))
      .filter(({ job, width }) => width > job.room)
    if (!over.length) break
    over.forEach(({ job, width }) => {
      job.scale = Math.max(job.scale * (job.room / width), job.floor)
      job.el.style.setProperty('--fg-fit', String(job.scale))
    })
  }
}
// `now` fits synchronously, for the first measure after a name mounts, so it
// never paints at the wrong size.
function queueFit(job, now) {
  if (now) {
    pendingFits.add(job)
    runFits()
    return
  }
  pendingFits.add(job)
  if (!fitFrame) fitFrame = requestAnimationFrame(runFits)
}

// Shrinks a long name to fit its band, down to `floor`, and no further. Past the
// floor the name is clipped by its box, never ended with an ellipsis. The scale
// is written as `--fg-fit`, which the name's font-size multiplies, so the
// natural width is measured at fit 1 each time. The name is only in the DOM
// once its face is confirmed, so it is measured in the right face.
// In the grid view `size` is the tile's name size and the cell's width is the
// room, so a long name shrinks to its cell rather than breaking mid-word.
function useFitName(active, label, size, floor) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    const box = el && el.parentElement
    if (!el || !box) return undefined
    const job = {
      el,
      box,
      floor: Math.min(floor, size) / size,
      natural: 0,
      room: 0,
    }
    const fit = () => queueFit(job)
    queueFit(job, true)
    // A face can still land after this, such as a subset for typed preview
    // text. Ask for this name's own face and fit again when it is in.
    if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
      const cs = getComputedStyle(el)
      document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, el.textContent)
        .then(() => { if (!job.dead) queueFit(job, true) }, () => {})
    }
    const fonts = typeof document !== 'undefined' ? document.fonts : null
    // A face that arrives after the first measure changes the name's width, so
    // the fit runs again for it. Only a face this name is set in counts.
    const onLoaded = (event) => {
      const faces = event && event.fontfaces
      if (faces && faces.length) {
        const stack = getComputedStyle(el).fontFamily
        if (!faces.some(face => stack.includes(face.family.replace(/^["']|["']$/g, '')))) return
      }
      fit()
    }
    if (fonts) {
      fonts.addEventListener?.('loadingdone', onLoaded)
      if (fonts.ready) fonts.ready.then(fit, () => {})
    }
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    if (ro) ro.observe(box)
    return () => {
      job.dead = true
      pendingFits.delete(job)
      if (fonts) fonts.removeEventListener?.('loadingdone', onLoaded)
      if (ro) ro.disconnect()
    }
  }, [active, label, size, floor])
  return ref
}

// Set CSS custom properties on a node — the no-inline-styles route for values
// that are genuinely per-item (a family, a weight, a size).
function varsRef(vars) {
  return (el) => {
    if (!el) return
    for (const key of Object.keys(vars)) el.style.setProperty(key, vars[key])
  }
}

// Wait until a family is genuinely painting before revealing text in it.
// Returns true only on a confirmed 'ok'; 'unknown' and 'failed' both keep the
// placeholder up, because both mean "don't show this yet".
//
// `extraWeights` are the cuts a caller is going to PAINT rather than merely
// name — the row ladder's numerals. They have to be in the same css2 request as
// the heading and body weights, because a weight the stylesheet never asked for
// is drawn with the nearest one that did arrive, and a numeral reading 200
// painted in the 400 cut is exactly the fallback-masquerading-as-the-family
// problem this hook exists to prevent.
function useFontReady(font, weight, { defer = true, extraWeights } = {}) {
  const ref = useRef(null)
  // A new array identity on every render would restart the effect on every
  // render, so the weights travel as a stable string and are parsed back inside.
  const extraKey = extraWeights ? extraWeights.join(',') : ''

  // WHAT IS READY IS A REQUEST, NOT A BOOLEAN.
  // This was `useState(false)` plus `setReady(false)` as the first statement of
  // the effect — a setState synchronous with an effect body, which is one of
  // the three `react-hooks/set-state-in-effect` warnings this file carried, and
  // a cascading render on every specimen the grid mounts. Recording WHICH
  // request succeeded instead means a changed family is not-ready by
  // derivation, in the same render that changed it, with no second commit.
  //
  // It is also a frame more honest than the reset was: the old shape kept the
  // previous family's `true` for one commit after `font` changed, so the
  // specimen painted the OUTGOING family in the incoming family's row before
  // the placeholder came back. That is the precise failure the hook's own
  // comment calls "the fallback masquerading as the family".
  const key = font ? `${font.family}|${weight}|${defer ? 1 : 0}|${extraKey}` : ''
  const [readyKey, setReadyKey] = useState(null)
  const ready = !!key && readyKey === key

  useEffect(() => {
    if (!font) return undefined
    let cancelled = false

    const start = () => {
      const extra = extraKey ? extraKey.split(',').map(Number) : []
      loadFont(font.family, [weight, bodyWeight(font), ...extra])
      verifyFontLoaded(font.family, bodyWeight(font))
        .then(async status => {
          // The name paints in `weight`, a separate file that only starts
          // downloading once text is drawn in it. Wait for that cut too, so the
          // first fit is measured in the real face. Its result is ignored: a
          // heading cut that fails must not hold the band at a skeleton.
          if (status === 'ok' && weight !== bodyWeight(font)) await verifyFontLoaded(font.family, weight)
          return status
        })
        .then(status => {
          if (!cancelled && status === 'ok') setReadyKey(key)
        })
    }

    if (!defer) { start(); return () => { cancelled = true } }

    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { start(); return () => { cancelled = true } }

    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      obs.disconnect()
      start()
    }, { rootMargin: '200px' })
    obs.observe(el)
    return () => { cancelled = true; obs.disconnect() }
  }, [font, weight, defer, extraKey, key])

  return [ready, ref]
}

// This tool's dialog plumbing — focus trap, Escape, background scroll lock and
// focus restoration — moved to hooks/useModalDialog.js when the font browser
// needed the same contract. It was the only correct implementation of it in the
// app, so it became the shared one rather than being copied a second time.
const useModal = useModalDialog

const NEED_MORE = 'Pick 1 or 2 more to compare'

// The Go arrow on an ink button: the arrow turns inside its round tint while
// the button is hovered or focused.
function GoArrow() {
  return (
    <span className="mi-go mi-go--ink" aria-hidden="true">
      <svg className="mi-a" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M7 17L17 7M8 7h9v9" />
      </svg>
    </span>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/* ── The open band ────────────────────────────────────────────────────────── */

// The page's ground, read from the theme the app has set on <html>.
const subscribeGround = (notify) => {
  const observer = new MutationObserver(notify)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}
const readGround = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark')
function useGround() {
  return useSyncExternalStore(subscribeGround, readGround, () => 'dark')
}

// How long a pointer rests on a band before it opens, how long it may be off
// every band before the first one re-opens, and how long the list stays warm
// after one opens (a warm list swaps bands with no wait).
const OPEN_INTENT_MS = 250
const REOPEN_MS = 180
const WARM_MS = 320
const COOL_MS = 600

// Which band is open: the one the pointer rests on, else the one with keyboard
// focus, else the one a tap opened, else the first.
function useOpenBand(firstFamily) {
  const [hot, setHot] = useState('')
  const [focused, setFocused] = useState('')
  const [tapped, setTapped] = useState('')
  const timers = useRef({ intent: 0, leave: 0, warm: 0, cool: 0, isWarm: false })
  useEffect(() => {
    const t = timers.current
    return () => { clearTimeout(t.intent); clearTimeout(t.leave); clearTimeout(t.warm); clearTimeout(t.cool) }
  }, [])
  const enter = useCallback((family) => {
    const t = timers.current
    clearTimeout(t.intent); clearTimeout(t.cool); clearTimeout(t.leave)
    const go = () => {
      setHot(family)
      clearTimeout(t.warm)
      t.warm = setTimeout(() => { t.isWarm = true }, WARM_MS)
    }
    if (t.isWarm) go()
    else t.intent = setTimeout(go, OPEN_INTENT_MS)
  }, [])
  const leave = useCallback(() => {
    const t = timers.current
    clearTimeout(t.intent); clearTimeout(t.cool)
    t.leave = setTimeout(() => setHot(''), REOPEN_MS)
    t.cool = setTimeout(() => { t.isWarm = false }, COOL_MS)
  }, [])
  const focus = useCallback((family) => setFocused(family), [])
  const blur = useCallback(() => setFocused(''), [])
  return { openFamily: hot || focused || tapped || firstFamily || '', enter, leave, focus, blur, tap: setTapped }
}

/* ── Catalogue band ───────────────────────────────────────────────────────── */

// One band per family: the name at band size in its own face, a meta line
// along the bottom, and a pick button on the right. The open band swaps its
// flat fill for the family's strip, so showing it never moves a box.
function GalleryCard({
  font, rank, onOpen, inCompare, onToggleCompare, previewText, nameSize, gridName, floor, tiles,
  open, ground, bands, onCopy,
}) {
  const heading = headingWeight(font)
  // The open band's image fades in once it is in, then holds. It is only asked
  // for when the band first opens (or is about to), so a long list never fetches
  // a strip nobody has seen.
  const backdrop = backdropFor(font.family, font.category, ground)
  const wantsBackdrop = !tiles && open
  const [backdropSeen, setBackdropSeen] = useState(null)
  useEffect(() => {
    if (!wantsBackdrop || backdropReady(backdrop)) return undefined
    let live = true
    loadBackdrop(backdrop).then(ok => { if (live && ok) setBackdropSeen(backdrop) })
    return () => { live = false }
  }, [wantsBackdrop, backdrop])
  const backdropIn = !tiles && (backdropSeen === backdrop || backdropReady(backdrop))
  // Once the fade has played, later opens swap with no fade.
  const [faded, setFaded] = useState(false)
  useEffect(() => {
    if (!(open && backdropIn)) return undefined
    const id = setTimeout(() => setFaded(true), 340)
    return () => clearTimeout(id)
  }, [open, backdropIn])
  const body = bodyWeight(font)
  const ladder = useMemo(() => ladderWeights(font.variants), [font.variants])
  const [ready, ref] = useFontReady(font, heading, { extraWeights: ladder })
  const weights = font.variants.length
  const typed = previewText.trim()
  const nameRef = useFitName(
    ready,
    `${typed}|${font.family}`,
    tiles ? gridName : nameSize,
    tiles ? Math.max(18, Math.round(gridName * 0.6)) : floor,
  )
  const weightLabel = `${weights} weight${weights === 1 ? '' : 's'}`
  // With the reader's own words in the name, the family name moves to the meta
  // line so it is still on the band.
  const meta = [
    rank != null ? String(rank).padStart(2, '0') : null,
    sentence(catWord(font.category)),
    weightLabel,
  ].filter(Boolean).join(' · ')
  const [copied, setCopied] = useState(false)
  const copyCss = () => {
    const url = getFontImportUrl([{ family: font.family, weights: font.variants.slice(0, 4) }])
    trackFontCopy(font.family)
    Promise.resolve(onCopy?.(`@import url('${url}');\n\nfont-family: ${fontStack(font)};`)).then(ok => {
      if (!ok) return
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  const classes = ['fg-card']
  if (inCompare) classes.push('fg-card--comparing')
  if (!tiles && open) classes.push('is-open')
  if (backdropIn) classes.push('has-backdrop')
  if (faded) classes.push('has-seen')
  if (typed) classes.push('has-label')

  return (
    <article
      className={classes.join(' ')}
      ref={varsRef({
        '--fg-ff': fontStack(font),
        '--fg-fw-h': String(heading),
        '--fg-fw-b': String(body),
        '--fg-bgimg': backdropIn ? `url(${backdrop})` : 'none',
      })}
      onMouseEnter={tiles ? undefined : () => bands.enter(font.family)}
      onMouseLeave={tiles ? undefined : bands.leave}
      onFocus={tiles ? undefined : (e) => { if (e.target.matches?.(':focus-visible')) bands.focus(font.family) }}
      onBlur={tiles ? undefined : (e) => { if (!e.currentTarget.contains(e.relatedTarget)) bands.blur() }}
    >
      <button
        type="button"
        className="fg-card-open"
        ref={ref}
        onClick={() => { if (!tiles) bands.tap(font.family); onOpen(font) }}
        aria-label={`Open the ${font.family} specimen — ${sentence(catWord(font.category))}, ${weightLabel}`}
      >
        {/* The band is decorative to assistive tech: the button's own label
            already names the family, its category and its weight count, so the
            name, pangram and weights would only say them again. */}
        <span className={ready ? 'fg-card-preview' : 'fg-card-preview fg-card-preview--pending'} aria-hidden="true">
          {ready
            ? <span className="fg-card-name fg-card-sample" ref={nameRef}>{typed || font.family}</span>
            : <span className="fg-card-skeleton fg-card-skeleton--sample" />}
        </span>
        {typed && <span className="fg-card-label" aria-hidden="true">{font.family}</span>}
        <span className="fg-card-meta" aria-hidden="true">{meta}</span>
      </button>
      {!tiles && (
        <button
          type="button"
          className={copied ? 'fg-card-copy is-done' : 'fg-card-copy'}
          onClick={copyCss}
          aria-label={`Copy CSS for ${font.family}`}
          tabIndex={open ? 0 : -1}
        >
          {copied ? 'Copied' : 'Copy CSS'}
        </button>
      )}
      <button
        type="button"
        className={inCompare ? 'fg-card-compare fg-card-compare--on' : 'fg-card-compare'}
        onClick={() => onToggleCompare(font)}
        aria-pressed={inCompare}
        aria-label={inCompare ? `Remove ${font.family} from comparison` : `Add ${font.family} to comparison`}
      >
        <svg className="fg-ico-plus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <svg className="fg-ico-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    </article>
  )
}

// The reserved band geometry, drawn empty. Shown while the catalogue is still
// in flight so the list arrives into a shape the reader has already seen,
// instead of a centred spinner collapsing into a full page.
//
// Four, not a screenful: each is a full band, and a screen of shimmer promises
// more than the first paint can deliver.
function SkeletonRows({ count = 4, vars }) {
  return (
    <div className="fg-grid fg-grid--skeleton" aria-hidden="true" ref={vars}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="fg-skel-row">
          <span className="fg-card-skeleton fg-card-skeleton--sample" />
        </div>
      ))}
    </div>
  )
}

/* ── Compare dialog ────────────────────────────────────────────────────────── */

function CompareDialog({ fonts, onClose, onRemove, onOpen, onCopy, onClear }) {
  const ref = useModal(onClose)
  const [text, setText] = useState('')
  const [size, setSize] = useState(40)

  useEffect(() => {
    fonts.forEach(f => loadFont(f.family, [headingWeight(f), bodyWeight(f)]))
  }, [fonts])

  return (
    <div className="fg-overlay" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="fg-compare"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fg-compare-title"
        tabIndex={-1}
        ref={ref}
      >
        <div className="fg-compare-head">
          <div>
            <span className="fg-detail-label">Compare</span>
            <h2 className="fg-compare-title" id="fg-compare-title">{fonts.length} typefaces, side by side</h2>
          </div>
          <div className="fg-compare-head-actions">
            {onClear && <button type="button" className="fg-more-btn fg-compare-clear" onClick={onClear}>Clear</button>}
            <button type="button" className="fg-detail-close fg-compare-close" onClick={onClose} aria-label="Close the comparison">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="fg-compare-controls">
          <input
            className="fg-compare-input"
            type="text"
            value={text}
            placeholder="Type to preview…"
            maxLength={60}
            aria-label="Comparison preview text"
            onChange={e => setText(e.target.value)}
          />
          <div className="fg-compare-control">
            <label htmlFor="fg-compare-size">Size</label>
            <input
              id="fg-compare-size"
              type="range"
              min="14"
              max="88"
              value={size}
              onChange={e => setSize(+e.target.value)}
            />
            <span>{size}px</span>
          </div>
        </div>

        <div className="fg-compare-cols">
          {fonts.map(font => (
            <div
              key={font.family}
              className="fg-compare-col"
              ref={varsRef({
                '--fg-ff': fontStack(font),
                '--fg-fw-h': String(headingWeight(font)),
                '--fg-fw-b': String(bodyWeight(font)),
                '--fg-size': `${size}px`,
              })}
            >
              <div className="fg-compare-col-head">
                <button type="button" className="fg-compare-col-name" onClick={() => onOpen(font)}>
                  {font.family}
                </button>
                <button
                  type="button"
                  className="fg-compare-col-remove"
                  onClick={() => onRemove(font)}
                  aria-label={`Remove ${font.family} from the comparison`}
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="fg-compare-meta">{sentence(catWord(font.category))} · {font.variants.length} weight{font.variants.length === 1 ? '' : 's'}</div>
              <div className="fg-compare-sample">{text.trim() || PANGRAM}</div>
              <div className="fg-compare-charset">
                <div>AaBbCcDd</div>
                <div>0123456789</div>
              </div>
              <button
                type="button"
                className="fg-compare-copy"
                onClick={() => {
                  trackFontCopy(font.family)
                  onCopy?.(getFontImportUrl([{ family: font.family, weights: font.variants.slice(0, 4) }]))
                }}
              >
                Copy import
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// The phone More sheet's Project row: the sample project, opening onto the one
// line that says how to use a project of your own.
function MoreProject() {
  const [open, setOpen] = useState(false)
  return (
    <div className="fg-more-proj">
      <span className="ttb-menu-label">Project</span>
      <button type="button" className="fg-more-proj-row" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <ToolIcon name="bicycle" size={16} />
        <span className="fg-more-proj-name">Kerbside<span className="fg-more-proj-tag"> · Sample</span></span>
        <ToolIcon name="caret-down" size={16} className="fg-more-proj-caret" />
      </button>
      {open && <p className="fg-more-proj-note">Sign in to use your own project</p>}
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function FontGallery({ onCopy, toast }) {
  const navigate = useNavigate()
  const mode = useLayoutName()
  const { setFonts, design } = useProject()
  const { setTheme } = useTheme()
  const { fonts: catalog, status, degraded, online, retry, retrying } = useFontCatalog()

  // Arriving via /create/font-gallery?font=Family (e.g. a deep link) seeds the search
  // so the family is already on screen rather than buried in the grid.
  const [query, setQuery] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('font') || '' } catch { return '' }
  })
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('popularity')
  const [previewText, setPreviewText] = useState('')
  // The specimen size is the reader's choice once they make one; until then
  // each layout opens at its own band size.
  const [sizeOverride, setSizeOverride] = useState(null)
  const [page, setPage] = useState(1)
  // THE PAGE RESET, ADJUSTED DURING RENDER RATHER THAN IN AN EFFECT.
  // `useEffect(() => { setPage(1) }, [query, category, sort])` was the third
  // `react-hooks/set-state-in-effect` warning in this file, and the effect shape
  // also meant one committed render of page 3 of the OLD filter's length under
  // the new filter before the reset landed. React's documented answer for
  // "adjust some state when a prop changes" is this: compare, set, and let React
  // re-run the render before it commits anything. IconEmojiLibrary.jsx uses the
  // same pattern for its keep-alive tab set, with the same reasoning.
  const filterKey = `${query}|${category}|${sort}`
  const [pageKey, setPageKey] = useState(filterKey)
  if (pageKey !== filterKey) {
    setPageKey(filterKey)
    setPage(1)
  }
  const [selected, setSelected] = useState(null)
  const [compare, setCompare] = useState([])
  const [showCompare, setShowCompare] = useState(false)
  const [view, setView] = useState('list')
  const [sheetOpen, setSheetOpen] = useState(false)
  const sentinelRef = useRef(null)

  const compareIds = useMemo(() => new Set(compare.map(f => f.family)), [compare])

  const galleryCatalog = useMemo(() => filterGalleryListTypefaces(catalog), [catalog])
  // Each category's family count, for the Filters sheet's pills.
  const catCounts = useMemo(() => {
    const out = { all: galleryCatalog.length }
    for (const f of galleryCatalog) out[f.category] = (out[f.category] || 0) + 1
    return out
  }, [galleryCatalog])

  // The filtered figures are derived from the catalogue actually on screen, so
  // a degraded fallback list scopes the search honestly rather than quoting the
  // full catalogue's number. Both the count line and the search placeholder
  // follow the category.
  const inCategory = useMemo(
    () => (category === 'all' ? galleryCatalog : galleryCatalog.filter(f => f.category === category)),
    [galleryCatalog, category],
  )
  const rankOf = useMemo(() => new Map(galleryCatalog.map((f, i) => [f.family, i + 1])), [galleryCatalog])
  const catPhrase = category === 'all' ? '' : `${catWord(category)} `
  const searchPlaceholder = inCategory.length
    ? `Search ${inCategory.length.toLocaleString()} ${catPhrase}${inCategory.length === 1 ? 'family' : 'families'}`
    : 'Search families'

  const filtered = useMemo(() => {
    let out = galleryCatalog
    const q = query.trim().toLowerCase()
    if (q) out = out.filter(f => f.family.toLowerCase().includes(q))
    if (category !== 'all') out = out.filter(f => f.category === category)
    if (sort === 'alphabetical') out = [...out].sort((a, b) => a.family.localeCompare(b.family))
    else if (sort === 'weights') out = [...out].sort((a, b) => b.variants.length - a.variants.length)
    return out
  }, [galleryCatalog, query, category, sort])

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page])
  const hasMore = paged.length < filtered.length
  const ground = useGround()
  const openBand = useOpenBand(paged[0]?.family)
  const bandHandlers = useMemo(
    () => ({ enter: openBand.enter, leave: openBand.leave, focus: openBand.focus, blur: openBand.blur, tap: openBand.tap }),
    [openBand.enter, openBand.leave, openBand.focus, openBand.blur, openBand.tap],
  )

  // Infinite scroll, with an explicit button underneath as the keyboard route —
  // an observer alone strands anyone who never scrolls with a pointer.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return undefined
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setPage(p => p + 1)
    }, { rootMargin: '400px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, paged.length])

  const toggleCompare = useCallback((font) => {
    setCompare(prev => {
      if (prev.some(f => f.family === font.family)) return prev.filter(f => f.family !== font.family)
      if (prev.length >= MAX_COMPARE) {
        toast?.(`You can compare ${MAX_COMPARE} fonts at a time.`, 'warning')
        return prev
      }
      return [...prev, font]
    })
  }, [toast])

  const compareFromDetail = useCallback((font) => {
    toggleCompare(font)
    setSelected(null)
  }, [toggleCompare])

  // Hand-offs. Both carry the CURRENT selection into the destination, so the
  // next tool never opens empty, and both also write the choice into the
  // project kit so a reload keeps it.
  const sendToPair = useCallback((heading, body) => {
    const draft = {
      heading: { family: heading.family, weight: headingWeight(heading), category: heading.category },
      body: body ? { family: body.family, weight: bodyWeight(body), category: body.category } : null,
    }
    setFonts({
      heading: draft.heading,
      ...(draft.body ? { body: draft.body } : {}),
    })
    if (!setPairDraft(draft)) { toast?.('Couldn’t carry that selection over — try again.'); return }
    setSelected(null)
    navigate('/create/font-pair')
  }, [navigate, setFonts, toast])

  const sendToScale = useCallback((font) => {
    const draft = {
      heading: { family: font.family, weight: headingWeight(font), category: font.category },
      body: { family: font.family, weight: bodyWeight(font), category: font.category },
    }
    setFonts(draft)
    if (!setScaleDraft(draft)) { toast?.('Couldn’t carry that selection over — try again.'); return }
    setSelected(null)
    navigate('/create/type-scale')
  }, [navigate, setFonts, toast])

  const ready = status !== 'loading'

  // The switcher's two answers: the project's own faces, or the sample pair the
  // other two tools open on. The faces are loaded so the switcher paints in them.
  const switchHeading = ownFont(design, 'heading') || SAMPLE_HEADING
  const switchBody = ownFont(design, 'body') || SAMPLE_BODY
  useEffect(() => {
    loadFont(switchHeading.family, [switchHeading.weight])
    loadFont(switchBody.family, [switchBody.weight])
  }, [switchHeading.family, switchHeading.weight, switchBody.family, switchBody.weight])

  // Once the page is idle the rest of the ground's strips come in one at a
  // time, the first band's kind first, so a hover never meets a blank band and
  // a phone on a slow link never has several in flight. Switching ground
  // restarts it with the other set.
  const firstCategory = paged[0]?.category
  useEffect(() => {
    if (!ready) return undefined
    const dark = ground === 'light' ? 'light' : 'dark'
    const urls = [...new Set([
      ...(firstCategory ? backdropUrls(dark, backdropKind(firstCategory)) : []),
      ...backdropUrls(dark),
    ])]
    let stopped = false
    const start = () => { loadBackdropsInTurn(urls, () => stopped) }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start)
      return () => { stopped = true; window.cancelIdleCallback(id) }
    }
    const id = setTimeout(start, 1200)
    return () => { stopped = true; clearTimeout(id) }
  }, [ready, ground, firstCategory])

  // The tray is a bar fixed to the foot of the screen (on the tab bar at 390).
  // Toasts and the feedback button read this class to ride above it. A phone and
  // a tablet only show it once there is something to compare.
  const trayShown = compare.length > 0 && !showCompare
  const pickedLine = `${compare.length} of ${MAX_COMPARE} picked`
  useEffect(() => {
    if (!trayShown) return undefined
    const root = document.documentElement
    root.classList.add('fg-tray')
    return () => root.classList.remove('fg-tray')
  }, [trayShown])

  const tiles = view === 'grid'
  // The sheet is a phone and tablet surface, so growing to the wide layout closes it.
  if (mode === 'wide' && sheetOpen) setSheetOpen(false)
  const sheetShown = sheetOpen && mode !== 'wide'
  // How many of the sheet's choices are off their defaults: the badge on the
  // Filters button. Preview text and the view show in the page itself.
  const filtersOn = (category !== 'all' ? 1 : 0) + (sort !== 'popularity' ? 1 : 0) + (sizeOverride !== null ? 1 : 0)
  // The empty state clears what narrows the list (search and category); the
  // sheet's own Clear puts back the sheet's controls and leaves the search alone.
  const clearFilters = () => { setQuery(''); setCategory('all') }
  const sheetDirty = category !== 'all' || sort !== 'popularity' || sizeOverride !== null || view !== 'list' || previewText !== ''
  const clearSheet = () => {
    setCategory('all')
    setSort('popularity')
    setSizeOverride(null)
    setView('list')
    setPreviewText('')
  }

  const layout = LAYOUTS[mode]
  const nameSize = sizeOverride ?? layout.name
  const floor = Math.min(layout.floor, nameSize)
  const band = Math.max(MIN_BAND, Math.round(nameSize * layout.ratio))
  // The grid name follows the same Size choice, scaled to its cell.
  const gridName = Math.max(16, Math.round(nameSize * layout.grid / layout.name))
  const bandVars = varsRef({ '--fg-name': `${nameSize}px`, '--fg-band': `${band}px`, '--fg-gname': `${gridName}px` })

  // The wide toolbar has room for a menu that reads "Size 96"; a tablet and a
  // phone set the size with the slider in the Filters sheet.
  const sizeSelect = (
    <ToolSelect
      label="Size"
      ariaLabel="Specimen size"
      value={nameSize}
      options={SIZE_CHOICES.map(n => ({ value: n, label: String(n) }))}
      onChange={v => setSizeOverride(Number(v))}
    />
  )
  const categoryPills = (
    <ToolPills
      label="Filter by category"
      className="fg-cats"
      options={CATS.map(c => ({ value: c.id, label: c.label }))}
      value={category}
      onChange={setCategory}
    />
  )
  const sortSelect = (
    <ToolSelect
      label="Sort"
      ariaLabel="Sort families"
      value={sort}
      options={SORTS.map(s => ({ value: s.id, label: s.label }))}
      onChange={setSort}
      disabled={!ready}
    />
  )
  const searchField = (
    <LibrarySearch
      className="fg-search"
      value={query}
      onChange={setQuery}
      placeholder={searchPlaceholder}
      label="Search font families"
    />
  )
  // `true` is the Filters sheet's own label; 'row' is the short "Preview" tag the
  // second toolbar row draws before the field (the input keeps its full aria-label).
  const previewField = (labelled) => (
    <label className={labelled === true ? 'fg-preview-field fg-preview-field--labelled' : 'fg-preview-field'}>
      {labelled === true && <span className="fg-preview-k">Preview text</span>}
      {labelled === 'row' && <span className="fg-preview-k" aria-hidden="true">Preview</span>}
      <input
        type="text"
        value={previewText}
        maxLength={72}
        spellCheck="false"
        placeholder="Type your own words"
        aria-label={labelled === true ? undefined : 'Preview text'}
        onChange={e => setPreviewText(e.target.value)}
      />
    </label>
  )
  const pairLink = (
    <ToolButton as={NavLink} to="/create/font-pair" icon="caret-right" className="fg-pair-link">
      Build a font pair
    </ToolButton>
  )
  const viewToggle = <ViewToggle view={view} onChange={setView} />
  const filtersButton = (
    <ToolButton
      className="fg-filt"
      icon="sliders-horizontal"
      iconSize={18}
      onClick={() => setSheetOpen(true)}
      disabled={!ready}
      aria-haspopup="dialog"
      aria-expanded={sheetShown}
      aria-label={filtersOn > 0 ? `Filters, ${filtersOn} on` : 'Filters'}
    >
      Filters
      {filtersOn > 0 && <span className="fg-filt-badge" aria-hidden="true">{filtersOn}</span>}
    </ToolButton>
  )
  // The phone's category chips: one scrolling row beside Filters, as the board
  // draws it. The tablet and wide layouts keep the pills on the toolbar.
  const categoryChips = (
    <div className="fg-chips" role="group" aria-label="Filter by category">
      {CATS.map(c => (
        <button
          key={c.id}
          type="button"
          className="fg-chip"
          aria-pressed={category === c.id}
          onClick={() => setCategory(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
  // The onward link is the first thing to fold into More.
  const pairItem = {
    id: 'pair',
    priority: 0,
    render: () => pairLink,
    menu: { label: 'Build a font pair', icon: 'caret-right', onSelect: () => navigate('/create/font-pair') },
  }
  const categoryItem = { id: 'category', priority: 5, render: () => categoryPills, menu: () => categoryPills }

  // The shared type-tools bar leads every layout; the ground control is its
  // Dark/Light pair and drives the app theme, which is what the bands follow.
  const bar = typeToolsBarItems({
    current: 'gallery',
    heading: switchHeading,
    body: switchBody,
    scale: ownTypeScale(design)?.ratio || 1.618,
    headingStack: fontStack(switchHeading),
    bodyStack: fontStack(switchBody),
    projectName: '',
    ground: ground === 'light' ? 'l' : 'd',
    onGround: g => setTheme(g === 'l' ? 'light' : 'dark'),
  })
  const groundItem = bar.find(it => it.id === 'ttb-ground')
  const barLead = bar.filter(it => it !== groundItem)

  // One item set per layout. A row never wraps: whatever does not fit goes into
  // that row's overflow menu, lowest priority first.
  //   wide    two rows. The tool bar (it scrolls away) carries Back, the project
  //           chip, the switcher, the ground and the view toggle. The sticky
  //           second row carries category, search, preview text, Sort, Size and
  //           the onward link; Size leaves it first, then Sort, then the preview.
  //   tablet  category pills and Filters on the row; search and the view toggle
  //           sit on a second row
  //   phone   search and Filters on a second row; the rest is in the Filters
  //           sheet
  let items
  let rowItems = null
  if (mode === 'wide') {
    items = [
      ...barLead,
      { ...groundItem, align: 'end' },
      { id: 'view', priority: 3, render: () => viewToggle, menu: () => viewToggle },
    ]
    rowItems = [
      categoryItem,
      { id: 'search', priority: 4, render: () => searchField, menu: () => searchField },
      { id: 'preview', priority: 3, render: () => previewField('row'), menu: () => previewField(true) },
      { id: 'sort', priority: 2, measure: sort, render: () => sortSelect, menu: () => sortSelect },
      { id: 'size', priority: 1, measure: nameSize, render: () => sizeSelect, menu: () => sizeSelect },
      { ...pairItem, align: 'end' },
    ]
  } else if (mode === 'tablet') {
    items = [...barLead, categoryItem, { id: 'filters', priority: 10, align: 'end', render: () => filtersButton }, { ...groundItem, align: 'end' }]
  } else {
    // The phone's More sheet: Project, Specimen ground, View (the ground is the
    // bar's own item). Overflow-only items keep the order they are listed in.
    items = [
      { id: 'project', inline: false, menu: () => <MoreProject /> },
      ...bar,
      {
        id: 'view',
        inline: false,
        menu: () => (
          <div className="ttb-menu-ground">
            <span className="ttb-menu-label">View</span>
            <div className="ttb-seg ttb-seg--full" role="group" aria-label="View">
              {[['list', 'List'], ['grid', 'Grid']].map(([id, label]) => (
                <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
              ))}
            </div>
          </div>
        ),
      },
    ]
  }

  // The wide layout's sticky second row. It is a toolbar of its own, so it
  // measures and folds on its own; it has no title and no feedback entry (the
  // tool bar above owns both).
  const row2 = rowItems && (
    <ToolToolbar className="fg-row2" back={false} items={rowItems} overflowLabel="More" feedback={false} />
  )

  // The tablet and phone second row, below the sticky bar, for the layouts that
  // cannot fit search on the first. It never wraps either.
  const bar2 = mode === 'wide' ? null : mode === 'phone' ? (
    <div className="fg-bar2 fg-bar2--phone">
      <div className="fg-chiprow">
        {categoryChips}
        {filtersButton}
      </div>
      {searchField}
    </div>
  ) : (
    <div className="fg-bar2">
      {searchField}
      {mode === 'tablet' && viewToggle}
      {mode === 'tablet' && pairLink}
    </div>
  )

  // The layout, the fields and the band geometry are withheld from nothing
  // while the catalogue resolves; only the filters wait, so half-working
  // filters never run over an empty list.
  if (!ready) {
    return (
      <ToolLayout className={tiles ? 'fg-page lib-surface fg-page--grid' : 'fg-page lib-surface'} title="Font Gallery" titleId="fg-title" back={false} items={items} overflowLabel="More" feedback={mode !== 'phone'}>
        {row2}
        {bar2}
        <FontCatalogLoading label="Opening the Font Gallery" />
        <SkeletonRows vars={bandVars} />
      </ToolLayout>
    )
  }

  const noun = filtered.length === 1 ? 'family' : 'families'
  const query1 = query.trim()
  const countText = `${filtered.length.toLocaleString()} ${catPhrase}${noun}`
    + `${query1 ? ` ${filtered.length === 1 ? 'matches' : 'match'} “${query1}”` : ''}`
    + `${sort === 'popularity' ? ', most popular first' : ''}`

  return (
    <ToolLayout className={tiles ? 'fg-page lib-surface fg-page--grid' : 'fg-page lib-surface'} title="Font Gallery" titleId="fg-title" back={false} items={items} overflowLabel="More" feedback={mode !== 'phone'}>
      {row2}
      <FontCatalogNotice
        online={online}
        degraded={degraded}
        onRetry={retry}
        retrying={retrying}
        count={galleryCatalog.length}
      />

      {bar2}

      {/* The results are a region named by the live count line, so it stays
          in the landmark list in the empty state too. */}
      <section className={tiles ? 'fg-results fg-results--tiles' : 'fg-results'} aria-labelledby="fg-count" ref={bandVars}>
        <p className="fg-count" id="fg-count" aria-live="polite">{countText}</p>

        {filtered.length === 0 ? (
          <LibraryEmpty
            className="fg-empty"
            title="Nothing matches that yet."
            onClear={clearFilters}
          />
        ) : (
          <>
            <div className={tiles ? 'fg-grid fg-grid--tiles' : 'fg-grid'}>
              {paged.map(font => (
                <GalleryCard
                  key={font.family}
                  font={font}
                  rank={sort === 'popularity' ? rankOf.get(font.family) : null}
                  onOpen={setSelected}
                  inCompare={compareIds.has(font.family)}
                  onToggleCompare={toggleCompare}
                  previewText={previewText}
                  nameSize={nameSize}
                  gridName={gridName}
                  floor={floor}
                  tiles={tiles}
                  open={openBand.openFamily === font.family}
                  ground={ground}
                  bands={bandHandlers}
                  onCopy={onCopy}
                />
              ))}
            </div>

            {hasMore && (
              <>
                <div ref={sentinelRef} className="fg-sentinel" aria-hidden="true" />
                <div className="fg-more">
                  <button type="button" className="fg-more-btn" onClick={() => setPage(p => p + 1)}>
                    Show more families ({(filtered.length - paged.length).toLocaleString()} left)
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </section>

      {trayShown && (
        <div className={mode === 'wide' ? 'fg-compare-tray' : 'fg-compare-tray fg-compare-tray--names'} role="region" aria-label="Comparison" aria-live="polite">
          {mode === 'wide' ? (
            <>
              <div className="fg-compare-tray-chips">
                {compare.map(f => (
                  <span key={f.family} className="fg-compare-chip" ref={varsRef({ '--fg-ff': fontStack(f) })}>
                    <span className="fg-compare-chip-name">{f.family}</span>
                    <button
                      type="button"
                      className="fg-compare-chip-x"
                      onClick={() => toggleCompare(f)}
                      aria-label={`Remove ${f.family} from comparison`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <span className="fg-compare-tray-status">{compare.length < 2 ? NEED_MORE : pickedLine}</span>
            </>
          ) : (
            <>
              <p className="fg-compare-tray-names" aria-label={`Comparing ${compare.map(f => f.family).join(', ')}`}>
                <span className="fg-compare-tray-nm">
                  {compare.map((f, i) => (
                    <span key={f.family}>
                      <span className="fg-compare-tray-name" ref={varsRef({ '--fg-ff': fontStack(f) })}>{f.family}</span>
                      {i < compare.length - 1 && <i>, </i>}
                    </span>
                  ))}
                </span>
                <span className="fg-compare-tray-ct">{pickedLine}</span>
              </p>
              {compare.length < 2 && <p className="fg-compare-tray-hint">{NEED_MORE}</p>}
            </>
          )}
          <div className="fg-compare-tray-actions">
            <button type="button" className="fg-more-btn fg-dock-ghost" onClick={() => setCompare([])}>Clear</button>
            {compare.length >= 2 && (
              <button type="button" className="fg-more-btn fg-dock-ink" onClick={() => setShowCompare(true)}>
                Compare {compare.length}
                <GoArrow />
              </button>
            )}
          </div>
        </div>
      )}

      {showCompare && compare.length >= 2 && (
        <CompareDialog
          fonts={compare}
          onClose={() => setShowCompare(false)}
          onRemove={(f) => {
            const next = compare.filter(c => c.family !== f.family)
            setCompare(next)
            if (next.length < 2) setShowCompare(false)
          }}
          onOpen={(f) => { setShowCompare(false); setSelected(f) }}
          onCopy={onCopy}
          onClear={mode === 'wide' ? undefined : () => { setCompare([]); setShowCompare(false) }}
        />
      )}

      {sheetShown && (
        <FiltersSheet
          onClose={() => setSheetOpen(false)}
          cats={CATS}
          category={category}
          onCategory={setCategory}
          sorts={SORTS}
          sort={sort}
          onSort={setSort}
          size={nameSize}
          sizeMin={SIZE_MIN}
          sizeMax={SIZE_MAX}
          onSize={setSizeOverride}
          view={view}
          onView={setView}
          previewText={previewText}
          onPreviewText={setPreviewText}
          counts={catCounts}
          ground={ground === 'light' ? 'l' : 'd'}
          onGround={g => setTheme(g === 'l' ? 'light' : 'dark')}
          count={filtered.length}
          canClear={sheetDirty}
          onClear={clearSheet}
          previewFirst={mode === 'phone'}
        />
      )}

      {selected && (
        <FontDetailDialog
          font={selected}
          previewText={previewText}
          categoryLabel={sentence(catWord(selected.category))}
          layout={mode}
          backdrop={mode === 'phone' ? backdropFor(selected.family, selected.category, ground) : null}
          onClose={() => setSelected(null)}
          onCopy={onCopy}
          onCompare={compareFromDetail}
          inCompare={compareIds.has(selected.family)}
          onSendToPair={sendToPair}
          onSendToScale={sendToScale}
        />
      )}
    </ToolLayout>
  )
}
