import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FontCatalogLoading, FontCatalogNotice } from '../components/FontCatalogState'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import LibraryGrid from '../components/library/LibraryGrid'
import LibraryCard from '../components/library/LibraryCard'
import LibraryEmpty from '../components/library/LibraryEmpty'
import useModalDialog from '../hooks/useModalDialog'
import { useFontCatalog } from '../hooks/useFontCatalog'
import { useProject } from '../contexts/ProjectContext'
import { trackFontCopy } from '../utils/analytics'
import {
  bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont, reloadFont,
  suggestPairings, verifyFontLoaded,
} from '../utils/googleFonts'
import { filterGalleryTypefaces, formatSubsets, ladderWeights } from '../utils/fontGallery'
import { setPairDraft, setScaleDraft } from '../utils/typeHandoff'

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
]

const SORTS = [
  { id: 'popularity', label: 'Popular' },
  { id: 'alphabetical', label: 'A–Z' },
  { id: 'weights', label: 'Most weights' },
]

const PANGRAM = 'The quick brown fox jumps over the lazy dog'
// The row's body line. A 434px card could hold one pangram at 12px and that was
// the whole running-text sample the gallery offered. A full-width row holds
// about 110 characters at 15px, so the line is written to spend them: two
// pangrams cover the alphabet twice in different letter pairs, and the tail
// carries the figures, currency and punctuation you cannot judge from letters —
// the parts of a face that most often turn out to be the disappointing ones.
const SPECIMEN_LINE = 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. 0123456789 £$€ &@?!'
// 24, not 48. A page of results is a scroll distance, not a card count: one
// specimen per row makes each result about twice as tall, so keeping 48 would
// have doubled the run to the "Show more" control and to the tools below it.
// Twenty-four full-width rows are about the height forty-eight cards were in
// three columns. The infinite-scroll sentinel still fills in on approach, so
// this changes how much arrives at once, not how much is reachable.
const PAGE_SIZE = 24
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
//
// `extraWeights` are the cuts a caller is going to PAINT rather than merely
// name — the row ladder's numerals. They have to be in the same css2 request as
// the heading and body weights, because a weight the stylesheet never asked for
// is drawn with the nearest one that did arrive, and a numeral reading 200
// painted in the 400 cut is exactly the fallback-masquerading-as-the-family
// problem this hook exists to prevent.
function useFontReady(font, weight, { defer = true, extraWeights } = {}) {
  const [ready, setReady] = useState(false)
  const ref = useRef(null)
  // A new array identity on every render would restart the effect on every
  // render, so the weights travel as a stable string and are parsed back inside.
  const extraKey = extraWeights ? extraWeights.join(',') : ''

  useEffect(() => {
    if (!font) return undefined
    let cancelled = false
    setReady(false)

    const start = () => {
      const extra = extraKey ? extraKey.split(',').map(Number) : []
      loadFont(font.family, [weight, bodyWeight(font), ...extra])
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
  }, [font, weight, defer, extraKey])

  return [ready, ref]
}

// This tool's dialog plumbing — focus trap, Escape, background scroll lock and
// focus restoration — moved to hooks/useModalDialog.js when the font browser
// needed the same contract. It was the only correct implementation of it in the
// app, so it became the shared one rather than being copied a second time.
const useModal = useModalDialog

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/* ── Catalogue row ────────────────────────────────────────────────────────── */

function GalleryCard({ font, rank, onOpen, inCompare, onToggleCompare, previewText, previewSize }) {
  const heading = headingWeight(font)
  const body = bodyWeight(font)
  const ladder = useMemo(() => ladderWeights(font.variants), [font.variants])
  const scripts = useMemo(() => formatSubsets(font.subsets), [font.subsets])
  const [ready, ref] = useFontReady(font, heading, { extraWeights: ladder })
  const weights = font.variants.length

  return (
    <LibraryCard
      className={inCompare ? 'fg-card fg-card--comparing' : 'fg-card'}
      nameClassName="fg-card-name"
      metaClassName="fg-card-info"
      media={(
        <button
          type="button"
          className="fg-card-open"
          ref={ref}
          onClick={() => onOpen(font)}
          aria-label={`Open the ${font.family} specimen — ${font.category}, ${weights} weight${weights === 1 ? '' : 's'}`}
        >
          {/* The catalogue position, which the "Popular" sort makes a real fact
              and every other ordering makes a place in the list you are reading.
              It is also the row's left edge: a full-width row with nothing at its
              start has no line for the eye to come back to down 24 of them. */}
          <span className="fg-card-index" aria-hidden="true">{String(rank).padStart(2, '0')}</span>
          {/* The specimen is decorative to assistive tech: the button's own label
              already names the family, its category and its weight count, so
              exposing the sample, the pangram and the ladder as well would repeat
              the same family name three times and read a pangram out per row. */}
          <span
            className={ready ? 'fg-card-preview' : 'fg-card-preview fg-card-preview--pending'}
            ref={varsRef({ '--fg-ff': fontStack(font), '--fg-fw-h': String(heading), '--fg-fw-b': String(body), '--fg-card-size': `${previewSize}px` })}
            aria-hidden="true"
          >
            {ready ? (
              <>
                {/* Three lines, three questions, and the row is full width because
                    all three want the width:

                      the display line  what do the letterforms look like at size,
                                        in the reader's OWN words when they type
                                        some — a 434px column showed about fifteen
                                        characters of a 40px face and truncated the
                                        rest, which is why the size slider had to
                                        stop at 48px;
                      the pangram       the same family as running text at body
                                        weight, whole rather than ellipsised;
                      the ladder        how much RANGE the family has, drawn
                                        instead of counted. This is the one that
                                        could not exist in the grid: nine weights
                                        laid across a row need a row's width, and
                                        "9w" in the card foot was the entire answer
                                        the gallery gave to the question a designer
                                        most often has to check. */}
                <span className="fg-card-sample">{previewText.trim() || font.family}</span>
                <span className="fg-card-pangram">{SPECIMEN_LINE}</span>
                <span className="fg-card-ladder">
                  {ladder.map(w => (
                    <span key={w} className="fg-card-step" ref={varsRef({ '--fg-fw': String(w) })}>{w}</span>
                  ))}
                </span>
              </>
            ) : (
              <>
                <span className="fg-card-skeleton fg-card-skeleton--sample" />
                <span className="fg-card-skeleton fg-card-skeleton--body" />
                <span className="fg-card-skeleton fg-card-skeleton--ladder" />
              </>
            )}
          </span>
        </button>
      )}
      float={(
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
      )}
      name={font.family}
      meta={`${font.category} · ${weights} weight${weights === 1 ? '' : 's'}`}
      /* The far edge of a full-width row is the one place a fact can sit without
         competing with the specimen, so it carries the one the gallery never
         showed at all: which scripts the family actually covers. Three names and
         a remainder, because the answer to "can I set my copy in this" is
         usually settled by the first script in the list and never needs seven.
         On the bundled fallback catalogue every entry is latin-only, so this
         reads "Latin" down the whole page there. That is the fallback list being
         thin, not the row being repetitive, and the banner above already says
         which catalogue is on screen — reporting it honestly beats hiding a
         field because the degraded data makes it dull. */
      tail={scripts.length > 0 ? (
        <span className="fg-card-scripts">
          {scripts.slice(0, 3).join(', ')}
          {scripts.length > 3 ? ` +${scripts.length - 3}` : ''}
        </span>
      ) : null}
    />
  )
}

/* ── Page header ───────────────────────────────────────────────────────────── */

// One header for every state of the page. The loading branch renders it too, so
// the Gallery never blinks out of existence and back while the catalogue
// resolves — only the numbers are unknown, and they say so with an em dash.
//
// The three figures are all counted off the catalogue that is actually on
// screen. Nothing here is a hand-written marketing number.
function GalleryHero({ families, classifications, weights, pending }) {
  const stat = (value) => (pending ? '—' : value.toLocaleString())

  return (
    <header className="fg-hero fg-hero--premium">
      <div className="fg-hero-topline">
        <span className="sec-h-eyebrow">Discover / Typography</span>
        <NavLink to="/create/font-pair" className="fg-hero-pair-link">Build a font pair <span aria-hidden="true">↗</span></NavLink>
      </div>
      <div className="fg-hero-copy">
        <h1>Font<br />Gallery</h1>
        <div className="fg-hero-intro">
          <p>
            A live catalogue for choosing type with confidence. Test your own words,
            compare families side by side, then take the winner into a real pairing.
          </p>
          <div className="fg-hero-stats">
            <span><strong>{stat(families)}</strong> text families</span>
            <span><strong>{stat(classifications)}</strong> classifications</span>
            <span><strong>{stat(weights)}</strong> weights to preview</span>
          </div>
        </div>
      </div>
    </header>
  )
}

// The reserved row geometry, drawn empty. Shown while the catalogue is still
// in flight so the list arrives into a shape the reader has already seen,
// instead of a centred spinner collapsing into a full page.
//
// Four, not the grid's nine: one column means a skeleton row is a full-width
// band, and nine of those is a screen and a half of shimmer promising more than
// the first paint can deliver.
function SkeletonRows({ count = 4 }) {
  return (
    <div className="lbry-grid fg-grid fg-grid--skeleton" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="fg-skel-row">
          <span className="fg-card-skeleton fg-card-skeleton--sample" />
          <span className="fg-card-skeleton fg-card-skeleton--body" />
          <span className="fg-card-skeleton fg-card-skeleton--ladder" />
        </div>
      ))}
    </div>
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

  // Arriving via /create/font-gallery?font=Family (e.g. a deep link) seeds the search
  // so the family is already on screen rather than buried in the grid.
  const [query, setQuery] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('font') || '' } catch { return '' }
  })
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('popularity')
  const [previewText, setPreviewText] = useState('')
  // 52, back up from the grid's 40. That 40 was chosen because three columns
  // gave each specimen ~400px and 52px ellipsised the longer family names — the
  // one thing a font gallery must never do to a name. A full-width row is not
  // under that constraint: "Playfair Display" at 52px wants ~430px and has
  // ~1,180px at 1440, so the reason for the smaller default has gone with the
  // columns that caused it.
  const [previewSize, setPreviewSize] = useState(52)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [compare, setCompare] = useState([])
  const [showCompare, setShowCompare] = useState(false)
  const sentinelRef = useRef(null)

  const compareIds = useMemo(() => new Set(compare.map(f => f.family)), [compare])

  const galleryCatalog = useMemo(() => filterGalleryTypefaces(catalog), [catalog])

  // Every headline figure is derived from the catalogue on screen, so a
  // degraded fallback list reports its own smaller numbers rather than the ones
  // the full catalogue would have had.
  const totalWeights = useMemo(
    () => galleryCatalog.reduce((sum, f) => sum + f.variants.length, 0),
    [galleryCatalog],
  )
  const heroStats = {
    families: galleryCatalog.length,
    classifications: CATS.length - 1, // CATS carries an "All" entry that is not a classification
    weights: totalWeights,
  }

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

  // The workbench is still withheld until the catalogue resolves — half-working
  // filters over an empty list are worse than none — but the header and the row
  // geometry are not, so the page has an identity and a shape from first paint.
  if (status === 'loading') {
    return (
      <div className="sec fg-page">
        <GalleryHero {...heroStats} pending />
        <FontCatalogLoading label="Opening the Font Gallery" />
        <SkeletonRows />
      </div>
    )
  }

  return (
    <div className="sec fg-page">
      <GalleryHero {...heroStats} />

      <FontCatalogNotice
        online={online}
        degraded={degraded}
        onRetry={retry}
        retrying={retrying}
        count={galleryCatalog.length}
      />

      {/* Search, filtering and the preview controls are one block and travel
          together — pinning the search row while the category and sort controls
          scrolled out from under it left half the toolbar stranded off screen.
          It is now the shared Library toolbar, so this page, the Palette Library
          and the Gradient Library are one implementation rather than three
          lookalikes. Preview text and size sit on the toolbar's second row:
          they change how results are RENDERED, not which results there are. */}
      <LibraryToolbar
        className="fg-controls"
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Search families…',
          label: 'Search font families',
        }}
        extra={(
          <>
            <label className="fg-command-text">
              <span>Preview text</span>
              <input
                value={previewText}
                maxLength={72}
                spellCheck="false"
                placeholder="Type something beautiful…"
                onChange={e => setPreviewText(e.target.value)}
              />
            </label>
            <label className="fg-command-size">
              <span>Size</span>
              {/* Ceiling is the reserved sample box, not a round number: the
                  slider must never offer a size the geometry cannot honour, or
                  the row clips its own descenders rather than reflow. The box
                  grew with the row (68px → 92px), so the ceiling grows with it:
                  a 72px face needs ~1.17em of ascent plus descent, which is 84px
                  inside a 92px line. */}
              <input type="range" min="22" max="72" value={previewSize} onChange={e => setPreviewSize(+e.target.value)} />
              <strong>{previewSize}px</strong>
            </label>
          </>
        )}
      >
        <LibraryFilterGroup
          label="Filter by category"
          value={category}
          onChange={setCategory}
          options={CATS}
        />
        <LibraryFilterGroup
          label="Sort families"
          value={sort}
          onChange={setSort}
          options={SORTS}
        />
      </LibraryToolbar>

      <p className="fg-count" aria-live="polite">
        {filtered.length.toLocaleString()} famil{filtered.length === 1 ? 'y' : 'ies'}
        {category !== 'all' ? ` in ${CATS.find(c => c.id === category)?.label}` : ''}
        {query.trim() ? ` matching “${query.trim()}”` : ''}
      </p>

      {filtered.length === 0 ? (
        <LibraryEmpty
          className="fg-empty"
          title="Nothing matches that yet."
          detail={`${query.trim()
            ? `No family in the loaded catalogue contains “${query.trim()}”.`
            : 'No family in the loaded catalogue is in this category.'} Clear the filters to see everything again.`}
          onClear={() => { setQuery(''); setCategory('all') }}
        />
      ) : (
        <>
          <LibraryGrid className="fg-grid">
            {paged.map((font, i) => (
              <GalleryCard
                key={font.family}
                font={font}
                rank={i + 1}
                onOpen={setSelected}
                inCompare={compareIds.has(font.family)}
                onToggleCompare={toggleCompare}
                previewText={previewText}
                previewSize={previewSize}
              />
            ))}
          </LibraryGrid>

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
          <NavLink to="/create/font-pair" className="fg-more-link">Pair two families &rarr;</NavLink>
          <NavLink to="/create/type-scale" className="fg-more-link">Build a type scale &rarr;</NavLink>
          <NavLink to="/create/palette" className="fg-more-link">Build a colour palette &rarr;</NavLink>
        </div>
      </nav>
    </div>
  )
}
