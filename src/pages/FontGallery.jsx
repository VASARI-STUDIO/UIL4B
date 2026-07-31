import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FontCatalogLoading, FontCatalogNotice } from '../components/FontCatalogState'
import { useFontCatalog } from '../hooks/useFontCatalog'
import { useProject } from '../contexts/ProjectContext'
import { trackFontCopy } from '../utils/analytics'
import {
  bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont, reloadFont,
  suggestPairings, verifyFontLoaded,
} from '../utils/googleFonts'
import { setPairDraft, setScaleDraft } from '../utils/typeHandoff'

// Font Gallery — the standalone /fontgallery page. Browse the Google Fonts
// catalogue, read a specimen, then carry the choice into Font Pair or Type
// Scale. This is the entry point of the typography suite, so it is the one that
// has to survive a bad network gracefully.
//
// Three things this rebuild fixes, all logged as `font-gallery-readiness` in
// src/data/pipeline.js before the route was activated:
//
//   1. FEATURED FOUT. The featured cards render display-size text, so swapping
//      a fallback face for the real one was a glaring reflow of the most
//      prominent thing on the page. They now render a skeleton in the exact
//      reserved box until verifyFontLoaded confirms the face is painting, and
//      only then reveal the words. No fallback text ever paints, so there is no
//      flash to see — and no invisible-text gap either, because the skeleton is
//      a visible placeholder rather than hidden text.
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

const SORTS = [
  { id: 'popularity', label: 'Popular' },
  { id: 'alphabetical', label: 'A–Z' },
  { id: 'weights', label: 'Most weights' },
]

// Curated shortlist for the featured strip. Any family missing from the loaded
// catalogue (very likely on the bundled fallback list) is simply dropped, so
// the strip is always short rather than broken.
const FEATURED = [
  { family: 'Playfair Display', phrase: 'Beauty in every serif', tag: 'Editorial' },
  { family: 'Space Grotesk', phrase: 'Clean, geometric, modern', tag: 'Interface' },
  { family: 'Inter', phrase: 'The workhorse of the web', tag: 'Interface' },
  { family: 'Fraunces', phrase: 'Soft serif character', tag: 'Variable' },
  { family: 'Outfit', phrase: 'Friendly and versatile', tag: 'Modern' },
  { family: 'JetBrains Mono', phrase: '0Oo 1Il {}();', tag: 'Code' },
]

const PANGRAM = 'The quick brown fox jumps over the lazy dog'
const SIZES = [
  { label: 'Display', px: 64 },
  { label: 'H1', px: 48 },
  { label: 'H2', px: 36 },
  { label: 'H3', px: 28 },
  { label: 'Body', px: 16 },
  { label: 'Small', px: 13 },
]
const PAGE_SIZE = 48
const MAX_COMPARE = 3

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
function useFontReady(font, weight, { defer = true } = {}) {
  const [ready, setReady] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!font) return undefined
    let cancelled = false
    setReady(false)

    const start = () => {
      loadFont(font.family, [weight, bodyWeight(font)])
      verifyFontLoaded(font.family, bodyWeight(font)).then(status => {
        if (!cancelled && status === 'ok') setReady(true)
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
  }, [font, weight, defer])

  return [ready, ref]
}

// Shared dialog plumbing: focus trap, Escape, background scroll lock and focus
// restoration. Every overlay in this tool goes through it, so none of them can
// drift out of the keyboard contract.
function useModal(onClose) {
  const ref = useRef(null)

  useEffect(() => {
    const opener = document.activeElement
    const node = ref.current
    document.body.style.overflow = 'hidden'

    const focusables = () => Array.from(
      node?.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') || [],
    ).filter(el => el.offsetParent !== null || el === document.activeElement)

    // Focus the dialog itself rather than its first control: a screen reader
    // then announces the dialog's label before its contents, and the close
    // button is one Tab away instead of already selected.
    node?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
      if (e.key !== 'Tab') return
      const list = focusables()
      if (!list.length) { e.preventDefault(); node?.focus(); return }
      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === node)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = ''
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [onClose])

  return ref
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/* ── Featured card ─────────────────────────────────────────────────────────── */

function FeaturedCard({ font, onOpen }) {
  const weight = headingWeight(font)
  const [ready, ref] = useFontReady(font, weight, { defer: false })

  return (
    <button
      type="button"
      ref={ref}
      className="fg-feat-card"
      onClick={() => onOpen(font)}
      aria-label={`Open the ${font.family} specimen`}
    >
      <span className="fg-feat-tag">{font.tag}</span>
      <span
        className={ready ? 'fg-feat-text' : 'fg-feat-text fg-feat-text--pending'}
        ref={varsRef({ '--fg-ff': fontStack(font), '--fg-fw': String(weight) })}
        aria-hidden={!ready}
      >
        {ready ? font.phrase : null}
        {!ready && <span className="fg-skel fg-skel-a" /> }
        {!ready && <span className="fg-skel fg-skel-b" /> }
      </span>
      <span className="fg-feat-info">
        <span className="fg-feat-name">{font.family}</span>
        <span className="fg-feat-cat">{font.variants.length} weight{font.variants.length === 1 ? '' : 's'}</span>
      </span>
    </button>
  )
}

/* ── Grid card ─────────────────────────────────────────────────────────────── */

function GalleryCard({ font, onOpen, inCompare, onToggleCompare }) {
  const heading = headingWeight(font)
  const body = bodyWeight(font)
  const [ready, ref] = useFontReady(font, heading)

  return (
    <li className={inCompare ? 'fg-card fg-card--comparing' : 'fg-card'} ref={ref}>
      <button
        type="button"
        className="fg-card-open"
        onClick={() => onOpen(font)}
        aria-label={`Open the ${font.family} specimen — ${font.category}, ${font.variants.length} weights`}
      >
        {/* Both preview boxes have a reserved height and clip their text, so a
            face arriving with different metrics can never resize the card. */}
        <span
          className={ready ? 'fg-card-preview' : 'fg-card-preview fg-card-preview--pending'}
          ref={varsRef({ '--fg-ff': fontStack(font), '--fg-fw-h': String(heading), '--fg-fw-b': String(body) })}
          aria-hidden={!ready}
        >
          {ready ? (
            <>
              <span className="fg-card-sample">{font.family.length <= 18 ? font.family : 'Aa Bb Cc'}</span>
              <span className="fg-card-pangram">{PANGRAM}</span>
            </>
          ) : (
            <>
              <span className="fg-card-skeleton fg-card-skeleton--sample" />
              <span className="fg-card-skeleton fg-card-skeleton--body" />
            </>
          )}
        </span>
        <span className="fg-card-meta">
          <span className="fg-card-name">{font.family}</span>
          <span className="fg-card-info">{font.category} · {font.variants.length}w</span>
        </span>
      </button>
      <button
        type="button"
        className={inCompare ? 'fg-card-compare fg-card-compare--on' : 'fg-card-compare'}
        onClick={() => onToggleCompare(font)}
        aria-pressed={inCompare}
        aria-label={inCompare ? `Remove ${font.family} from the comparison` : `Add ${font.family} to the comparison`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {inCompare
            ? <polyline points="20 6 9 17 4 12" />
            : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
        </svg>
      </button>
    </li>
  )
}

/* ── Compare dialog ────────────────────────────────────────────────────────── */

function CompareDialog({ fonts, onClose, onRemove, onOpen, onCopy }) {
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
          <button type="button" className="fg-detail-close fg-compare-close" onClick={onClose} aria-label="Close the comparison">
            <CloseIcon />
          </button>
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
              <div className="fg-compare-meta">{font.category} · {font.variants.length} weight{font.variants.length === 1 ? '' : 's'}</div>
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

/* ── Detail dialog ─────────────────────────────────────────────────────────── */

function DetailDialog({ font, onClose, onCopy, onCompare, inCompare, onSendToPair, onSendToScale }) {
  const ref = useModal(onClose)
  const [loadState, setLoadState] = useState('checking')
  const [weight, setWeight] = useState(() => headingWeight(font))
  const [pairings, setPairings] = useState([])

  useEffect(() => {
    let cancelled = false
    setLoadState('checking')
    loadFont(font.family, font.variants)
    verifyFontLoaded(font.family, bodyWeight(font)).then(status => {
      if (!cancelled) setLoadState(status)
    })
    return () => { cancelled = true }
  }, [font])

  useEffect(() => {
    let cancelled = false
    suggestPairings(font, { limit: 3 }).then(list => {
      if (cancelled) return
      list.forEach(s => loadFont(s.font.family, [bodyWeight(s.font)]))
      setPairings(list)
    })
    return () => { cancelled = true }
  }, [font])

  const retryFont = () => {
    setLoadState('checking')
    reloadFont(font.family).then(() =>
      verifyFontLoaded(font.family, bodyWeight(font)).then(setLoadState),
    )
  }

  const fam = fontStack(font)

  return (
    <div className="fg-overlay" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="fg-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fg-detail-title"
        tabIndex={-1}
        ref={ref}
      >
        <button type="button" className="fg-detail-close" onClick={onClose} aria-label={`Close the ${font.family} specimen`}>
          <CloseIcon />
        </button>

        {loadState === 'unknown' && (
          <div className="fg-loading-note" role="status">
            <span className="fg-loading-note-spinner" aria-hidden="true" />
            <span>Still loading this preview — showing a fallback face until {font.family} arrives.</span>
          </div>
        )}

        {loadState === 'failed' && (
          <div className="typ-notice" role="status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <strong>{font.family} couldn&rsquo;t load, so a fallback is shown.</strong>
              <span>
                The stylesheet or font file did not become usable. A privacy extension, dropped
                connection or unavailable font-loading feature can cause this. The import URL and
                CSS you copy below are unaffected.
              </span>
              <button type="button" className="typ-notice-retry" onClick={retryFont}>Retry this font</button>
            </div>
          </div>
        )}

        <h2
          className="fg-detail-hero"
          id="fg-detail-title"
          ref={varsRef({ '--fg-ff': fam, '--fg-fw': String(weight) })}
        >
          {font.family}
        </h2>

        <div className="fg-detail-tags">
          <span className="fg-tag">{font.category}</span>
          <span className="fg-tag">{font.variants.length} weight{font.variants.length === 1 ? '' : 's'}</span>
          {font.subsets?.length > 0 && <span className="fg-tag">{font.subsets.length} subset{font.subsets.length === 1 ? '' : 's'}</span>}
        </div>

        <div className="fg-detail-section">
          <label className="fg-detail-label" htmlFor="fg-detail-weight">Weight</label>
          <div className="fg-weight-slider-row">
            <input
              id="fg-detail-weight"
              type="range"
              min={Math.min(...font.variants)}
              max={Math.max(...font.variants)}
              step={100}
              value={weight}
              onChange={e => setWeight(+e.target.value)}
            />
            <span className="fg-weight-slider-val">{weight}</span>
          </div>
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Type scale</div>
          {SIZES.map(s => (
            <div key={s.label} className="fg-scale-row">
              <span className="fg-scale-label">{s.label}<br /><span>{s.px}px</span></span>
              <span
                className="fg-scale-text"
                ref={varsRef({ '--fg-ff': fam, '--fg-fw': String(weight), '--fg-size': `${s.px}px` })}
              >
                {PANGRAM}
              </span>
            </div>
          ))}
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">All weights</div>
          <div className="fg-weights-grid">
            {font.variants.map(w => (
              <div key={w} className="fg-weight-card">
                <div className="fg-weight-sample" ref={varsRef({ '--fg-ff': fam, '--fg-fw': String(w) })}>Ag</div>
                <div className="fg-weight-num">{w}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Character set</div>
          <div className="fg-charset" ref={varsRef({ '--fg-ff': fam, '--fg-fw': String(weight) })}>
            <div>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
            <div>abcdefghijklmnopqrstuvwxyz</div>
            <div>0123456789 !@#$%^&amp;*()+-=</div>
          </div>
        </div>

        {pairings.length > 0 && (
          <div className="fg-detail-section">
            <div className="fg-detail-label">Pairs well with</div>
            <div className="fg-pair-grid">
              {pairings.map(({ font: pair, reason }) => (
                <div
                  key={pair.family}
                  className="fg-pair-card"
                  ref={varsRef({
                    '--fg-ff': fam,
                    '--fg-fw-h': String(headingWeight(font)),
                    '--fg-pair-ff': fontStack(pair),
                    '--fg-pair-fw': String(bodyWeight(pair)),
                  })}
                >
                  <div className="fg-pair-preview">
                    <span className="fg-pair-heading">{font.family}</span>
                    <span className="fg-pair-body">{pair.family} keeps the body copy readable underneath.</span>
                  </div>
                  <p className="fg-pair-reason">{reason}</p>
                  <div className="fg-pair-foot">
                    <span className="fg-pair-name">{pair.family}</span>
                    <button type="button" className="fg-pair-apply" onClick={() => onSendToPair(font, pair)}>
                      Open in Font Pair
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="fg-detail-section">
          <div className="fg-detail-label">Take it further</div>
          <div className="fg-detail-apply">
            <button type="button" className="fg-detail-btn fg-detail-btn--primary" onClick={() => onSendToPair(font, null)}>
              Find a pairing &rarr;
            </button>
            <button type="button" className="fg-detail-btn" onClick={() => onSendToScale(font)}>
              Build a type scale &rarr;
            </button>
          </div>
        </div>

        <div className="fg-detail-actions">
          <button type="button" className="fg-detail-btn" onClick={() => onCompare(font)} aria-pressed={inCompare}>
            {inCompare ? 'In comparison' : 'Add to comparison'}
          </button>
          <button
            type="button"
            className="fg-detail-btn"
            onClick={() => {
              trackFontCopy(font.family)
              onCopy?.(getFontImportUrl([{ family: font.family, weights: font.variants.slice(0, 4) }]))
            }}
          >
            Copy import URL
          </button>
          <a
            href={`https://fonts.google.com/specimen/${font.family.replace(/ /g, '+')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fg-detail-btn"
          >
            View on Google Fonts
          </a>
        </div>
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function FontGallery({ onCopy, toast }) {
  const navigate = useNavigate()
  const { setFonts } = useProject()
  const { fonts: catalog, status, degraded, online, retry, retrying } = useFontCatalog()

  // Arriving via /fontgallery?font=Family (e.g. a deep link) seeds the search
  // so the family is already on screen rather than buried in the grid.
  const [query, setQuery] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('font') || '' } catch { return '' }
  })
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('popularity')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [compare, setCompare] = useState([])
  const [showCompare, setShowCompare] = useState(false)
  const sentinelRef = useRef(null)

  const compareIds = useMemo(() => new Set(compare.map(f => f.family)), [compare])

  const featured = useMemo(() => {
    if (!catalog.length) return []
    return FEATURED
      .map(f => {
        const match = catalog.find(c => c.family === f.family)
        return match ? { ...match, phrase: f.phrase, tag: f.tag } : null
      })
      .filter(Boolean)
  }, [catalog])

  const filtered = useMemo(() => {
    let out = catalog
    const q = query.trim().toLowerCase()
    if (q) out = out.filter(f => f.family.toLowerCase().includes(q))
    if (category !== 'all') out = out.filter(f => f.category === category)
    if (sort === 'alphabetical') out = [...out].sort((a, b) => a.family.localeCompare(b.family))
    else if (sort === 'weights') out = [...out].sort((a, b) => b.variants.length - a.variants.length)
    return out
  }, [catalog, query, category, sort])

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page])
  const hasMore = paged.length < filtered.length

  useEffect(() => { setPage(1) }, [query, category, sort])

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
        toast?.(`You can compare ${MAX_COMPARE} fonts at a time — remove one first`)
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
    navigate('/fontpairs')
  }, [navigate, setFonts, toast])

  const sendToScale = useCallback((font) => {
    const draft = {
      heading: { family: font.family, weight: headingWeight(font), category: font.category },
      body: { family: font.family, weight: bodyWeight(font), category: font.category },
    }
    setFonts(draft)
    if (!setScaleDraft(draft)) { toast?.('Couldn’t carry that selection over — try again.'); return }
    setSelected(null)
    navigate('/typescale')
  }, [navigate, setFonts, toast])

  if (status === 'loading') {
    return (
      <div className="sec fg-page">
        <FontCatalogLoading label="Opening the Font Gallery" />
      </div>
    )
  }

  return (
    <div className="sec fg-page">
      <header className="fg-hero">
        <div className="sec-h-eyebrow">Typography system workspace</div>
        <div className="fg-hero-copy">
          <h1>Font Gallery</h1>
          <p>
            Browse {catalog.length.toLocaleString()} families from Google Fonts, read a
            full specimen, then carry your choice straight into a pairing or a type scale.
          </p>
        </div>
      </header>

      <FontCatalogNotice
        online={online}
        degraded={degraded}
        onRetry={retry}
        retrying={retrying}
        count={catalog.length}
      />

      {featured.length > 0 && (
        <section className="fg-featured" aria-labelledby="fg-featured-title">
          <h2 className="fg-section-label" id="fg-featured-title">Featured typefaces</h2>
          <div className="fg-featured-grid">
            {featured.map(font => (
              <FeaturedCard key={font.family} font={font} onOpen={setSelected} />
            ))}
          </div>
        </section>
      )}

      <div className="fg-filters">
        <div className="fg-filter-cats" role="group" aria-label="Filter by category">
          {CATS.map(c => (
            <button
              key={c.id}
              type="button"
              className={category === c.id ? 'fg-cat-pill fg-cat-pill--on' : 'fg-cat-pill'}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="fg-filter-right">
          <div className="fg-sort" role="group" aria-label="Sort families">
            {SORTS.map(s => (
              <button
                key={s.id}
                type="button"
                className={sort === s.id ? 'fg-sort-btn fg-sort-btn--on' : 'fg-sort-btn'}
                aria-pressed={sort === s.id}
                onClick={() => setSort(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="fg-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Search families…"
              value={query}
              spellCheck="false"
              aria-label="Search font families"
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <p className="fg-count" aria-live="polite">
        {filtered.length.toLocaleString()} famil{filtered.length === 1 ? 'y' : 'ies'}
        {category !== 'all' ? ` in ${CATS.find(c => c.id === category)?.label}` : ''}
        {query.trim() ? ` matching “${query.trim()}”` : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="fg-empty" role="status">
          <strong>Nothing matches that yet.</strong>
          <span>
            {query.trim()
              ? `No family in the loaded catalogue contains “${query.trim()}”.`
              : 'No family in the loaded catalogue is in this category.'}
            {' '}Clear the filters to see everything again.
          </span>
          <button
            type="button"
            className="typ-picker-clear"
            onClick={() => { setQuery(''); setCategory('all') }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <ul className="fg-grid">
            {paged.map(font => (
              <GalleryCard
                key={font.family}
                font={font}
                onOpen={setSelected}
                inCompare={compareIds.has(font.family)}
                onToggleCompare={toggleCompare}
              />
            ))}
          </ul>

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

      {compare.length > 0 && !showCompare && (
        <div className="fg-compare-tray">
          <div className="fg-compare-tray-chips">
            <span className="fg-compare-tray-label">Comparing</span>
            {compare.map(f => (
              <button
                key={f.family}
                type="button"
                className="fg-compare-chip"
                onClick={() => toggleCompare(f)}
                aria-label={`Remove ${f.family} from the comparison`}
              >
                {f.family}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ))}
          </div>
          <div className="fg-compare-tray-actions">
            <button type="button" className="fg-more-btn" onClick={() => setCompare([])}>Clear</button>
            <button
              type="button"
              className="fg-more-btn fg-more-btn--primary"
              onClick={() => setShowCompare(true)}
              disabled={compare.length < 2}
            >
              Compare {compare.length}
            </button>
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
        />
      )}

      {selected && (
        <DetailDialog
          font={selected}
          onClose={() => setSelected(null)}
          onCopy={onCopy}
          onCompare={compareFromDetail}
          inCompare={compareIds.has(selected.family)}
          onSendToPair={sendToPair}
          onSendToScale={sendToScale}
        />
      )}

      <nav className="fg-more-nav" aria-label="More typography tools">
        <div>
          <span className="fg-more-kicker">Continue your typography system</span>
          <strong>Found a family? Give it a partner and a set of sizes.</strong>
        </div>
        <div className="fg-more-links">
          <NavLink to="/fontpairs" className="fg-more-link">Pair two families &rarr;</NavLink>
          <NavLink to="/typescale" className="fg-more-link">Build a type scale &rarr;</NavLink>
          <NavLink to="/color/palette" className="fg-more-link">Build a colour palette &rarr;</NavLink>
        </div>
      </nav>
    </div>
  )
}
