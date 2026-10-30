import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useModalDialog from '../hooks/useModalDialog'
import { FontAboutPanel, FontExamplesPanel, FontInUsePanel } from './FontDossier'
import { trackFontCopy } from '../utils/analytics'
import {
  bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont, reloadFont,
  suggestPairings, verifyFontLoaded,
} from '../utils/googleFonts'
import { formatSubsets, weightName } from '../utils/fontGallery'
import '../styles/pages/font-detail.css'

// The Font Gallery's family pop-up: one scroll of sections under a plain hero,
// with the actions pinned to the foot in a single row. The tabs it replaced
// (Specimen, About, Examples, In use) are now section headings, and nothing the
// tabs held was dropped. At 1440 the bar holds five actions; at 768 three and
// More; at 390 Find a pairing, the compare toggle and More, in a bottom sheet.

const PANGRAM = 'The quick brown fox jumps over the lazy dog'
// 80 glyphs: the grid is 8 columns on the sheet and at 768 and 10 from 1024, and
// 80 fills the last row of both.
const GLYPHS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()+-=?.,:;']

// A downward drag on the sheet's handle closes it when it goes this far (px) or
// this fast (px per ms); anything less snaps back. Moves under DRAG_JITTER never
// count as a flick, so a tap that wobbles cannot close the sheet.
const DRAG_CLOSE_DY = 96
const DRAG_CLOSE_SPEED = 0.5
const DRAG_JITTER = 12
// How long the sheet takes to slide off before the pop-up unmounts (ms); a
// little under the 200ms transform transition in font-detail.css.
const DRAG_EXIT_MS = 180

// The scheduled removal of the history entry the last pop-up pushed; a pop-up
// that opens before it runs takes the entry over instead of pushing another.
let pendingBack = null

// Set CSS custom properties on a node: the no-inline-styles route for values
// that are genuinely per-item (a family, a weight).
function varsRef(vars) {
  return (el) => {
    if (!el) return
    for (const key of Object.keys(vars)) el.style.setProperty(key, vars[key])
  }
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function CompareIcon({ on }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {on
        ? <polyline points="20 6 9 17 4 12" />
        : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
    </svg>
  )
}

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
    </svg>
  )
}

// The overflow of the action bar. A menu button that opens upward over the bar,
// or, on the phone sheet, a bottom sheet of its own under a scrim. Escape, a
// press outside or focus leaving closes it, and the dialog's own Escape waits
// for it (useModalDialog skips a close while an [aria-haspopup][aria-expanded=true]
// trigger is on screen). On the sheet the scrim takes the outside press as a
// click, so it cannot fall through onto the bar's buttons beneath.
function MoreMenu({ iconOnly, items, family }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)

  const close = useCallback((returnFocus) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return undefined
    rootRef.current?.querySelector('[role="menuitem"]')?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { close(true); return }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const list = Array.from(rootRef.current?.querySelectorAll('[role="menuitem"]') || [])
      if (!list.length) return
      e.preventDefault()
      const at = list.indexOf(document.activeElement)
      const step = e.key === 'ArrowDown' ? 1 : -1
      list[(at + step + list.length) % list.length].focus()
    }
    const onPointer = (e) => { if (!rootRef.current?.contains(e.target)) close(false) }
    document.addEventListener('keydown', onKey)
    if (!iconOnly) document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, close, iconOnly])

  // Focus moving to another control closes the menu. A null target (a press on
  // something that takes no focus) is left to the scrim or the pointer handler,
  // so a press on a menu row cannot close the menu before its click lands.
  const onBlur = (e) => {
    const next = e.relatedTarget
    if (open && next && !rootRef.current?.contains(next)) close(false)
  }

  return (
    <div className="fgd-more" ref={rootRef} onBlur={onBlur}>
      <button
        type="button"
        ref={triggerRef}
        className={iconOnly ? 'fgd-btn fgd-btn--icon' : 'fgd-btn'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={iconOnly ? `More actions for ${family}` : undefined}
        onClick={() => setOpen(o => !o)}
      >
        {iconOnly ? <DotsIcon /> : 'More'}
      </button>
      {open && iconOnly && (
        <button type="button" className="fgd-menu-scrim" tabIndex={-1} aria-hidden="true" onClick={() => close(true)} />
      )}
      {open && (
        <ul className="fgd-menu" role="menu" aria-label={`More actions for ${family}`}>
          {items.map(item => (
            <li key={item.key} role="none">
              {item.href ? (
                <a
                  className="fgd-menu-item"
                  role="menuitem"
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => close(true)}
                >
                  {item.label}<span className="fgd-ext" aria-hidden="true"> ↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <button
                  type="button"
                  className="fgd-menu-item"
                  role="menuitem"
                  onClick={() => { close(true); item.onSelect() }}
                >
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function FontDetailDialog({
  font, previewText, categoryLabel, layout, onClose, onCopy, onCompare, inCompare,
  onSendToPair, onSendToScale,
}) {
  const ref = useModalDialog(onClose)
  // The result is recorded against the font it describes, so a font this dialog
  // has not resolved yet reads 'checking' by derivation rather than by a second
  // render.
  const [loaded, setLoaded] = useState(null)
  const loadState = loaded && loaded.font === font ? loaded.status : 'checking'
  // Seeded from the gallery's own preview field, so the words typed into the
  // toolbar carry into the weight list.
  const [text, setText] = useState(previewText)
  const [pairings, setPairings] = useState([])
  // True once the hero has scrolled out of view, which brings up the name strip.
  const [pinned, setPinned] = useState(false)
  const heroRef = useRef(null)
  const drag = useRef(null)
  const exitTimer = useRef(null)
  // Whether the press that ends in an overlay click began on the overlay too.
  const pressedOverlay = useRef(false)
  // Read by the history listener, which is set up once.
  const closeRef = useRef(onClose)
  const scripts = useMemo(() => formatSubsets(font.subsets), [font.subsets])
  const weights = font.variants.length
  const fam = fontStack(font)
  const phone = layout === 'phone'

  useEffect(() => { closeRef.current = onClose }, [onClose])

  // The back button (Android's gesture) closes the pop-up instead of leaving the
  // page: opening pushes one history entry marked as ours, and a pop off that
  // entry closes. Closing any other way takes the entry back off, but only while
  // it is still the current one, so a close that came from navigating away
  // (Find a pairing) never steps back out of the page it just went to. The
  // removal waits a tick, which also lets a dev-mode remount keep its entry.
  useEffect(() => {
    let popped = false
    if (pendingBack) {
      clearTimeout(pendingBack)
      pendingBack = null
    } else {
      window.history.pushState({ ...window.history.state, fgd: true }, '')
    }
    // Any pop while open means the reader left our entry, so the pop-up closes.
    const onPop = () => {
      popped = true
      closeRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      pendingBack = setTimeout(() => {
        pendingBack = null
        if (!popped && window.history.state?.fgd) window.history.back()
      }, 0)
    }
  }, [])

  useEffect(() => () => clearTimeout(exitTimer.current), [])

  useEffect(() => {
    let cancelled = false
    loadFont(font.family, font.variants)
    verifyFontLoaded(font.family, bodyWeight(font)).then(status => {
      if (!cancelled) setLoaded({ font, status })
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

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([entry]) => setPinned(!entry.isIntersecting), {
      root: hero.closest('.fgd-scroll'),
      threshold: 0,
    })
    io.observe(hero)
    return () => io.disconnect()
  }, [font])

  const retryFont = () => {
    // Dropping the record is what puts the dialog back to 'checking'.
    setLoaded(null)
    reloadFont(font.family).then(() =>
      verifyFontLoaded(font.family, bodyWeight(font)).then(status => setLoaded({ font, status })),
    )
  }

  const copyImport = () => {
    trackFontCopy(font.family)
    onCopy?.(getFontImportUrl([{ family: font.family, weights: font.variants.slice(0, 4) }]))
  }

  const onDragStart = (e) => {
    if (exitTimer.current) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const sheet = e.currentTarget.closest('.fgd')
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0, sheet }
    sheet.classList.add('is-dragging')
  }
  const onDragMove = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    d.dy = Math.max(0, e.clientY - d.y)
    d.sheet.style.setProperty('--fgd-drag', `${d.dy}px`)
  }
  const endDrag = (e, cancelled) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    d.sheet.classList.remove('is-dragging')
    const speed = d.dy / Math.max(1, e.timeStamp - d.t)
    if (!cancelled && (d.dy > DRAG_CLOSE_DY || (d.dy > DRAG_JITTER && speed > DRAG_CLOSE_SPEED))) {
      // Slide the rest of the way off, then unmount once the slide has played.
      d.sheet.style.setProperty('--fgd-drag', '100%')
      exitTimer.current = setTimeout(onClose, DRAG_EXIT_MS)
      return
    }
    d.sheet.style.removeProperty('--fgd-drag')
  }

  const googleUrl = `https://fonts.google.com/specimen/${font.family.replace(/ /g, '+')}`

  // What the bar cannot fit goes into More, in the same order it would have
  // sat on the bar.
  const moreItems = layout === 'wide' ? [] : [
    ...(phone ? [{ key: 'scale', label: 'Build a type scale', onSelect: () => onSendToScale(font) }] : []),
    { key: 'copy', label: 'Copy import URL', onSelect: copyImport },
    { key: 'google', label: 'View on Google Fonts', href: googleUrl },
  ]

  return (
    <div
      className="fgd-overlay"
      onPointerDown={e => { pressedOverlay.current = e.target === e.currentTarget }}
      onClick={e => {
        // A press that began inside the dialog and ended on the scrim (a text
        // selection drag) must not close it.
        if (e.target === e.currentTarget && pressedOverlay.current) onClose()
        pressedOverlay.current = false
      }}
    >
      <div
        className="fgd"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fgd-title"
        tabIndex={-1}
        ref={ref}
      >
        {phone && (
          <div
            className="fgd-grab"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={e => endDrag(e, false)}
            onPointerCancel={e => endDrag(e, true)}
          >
            <span className="fgd-grab-bar" aria-hidden="true" />
          </div>
        )}

        <div className="fgd-main">
          {/* The name strip: a second, decorative copy of the name that fades in
              once the hero has scrolled away, so the dialog still says which
              family it is about. */}
          <div className={pinned ? 'fgd-strip is-on' : 'fgd-strip'} aria-hidden="true">
            <span className="fgd-strip-name" ref={varsRef({ '--fgd-ff': fam, '--fgd-fw': String(headingWeight(font)) })}>
              {font.family}
            </span>
          </div>
          <button type="button" className="fgd-close" onClick={onClose} aria-label={`Close the ${font.family} specimen`}>
            <CloseIcon />
          </button>

          <div className="fgd-scroll">
            <header className="fgd-hero" ref={heroRef}>
              <h2
                className="fgd-name"
                id="fgd-title"
                ref={varsRef({ '--fgd-ff': fam, '--fgd-fw': String(headingWeight(font)) })}
              >
                {font.family}
              </h2>
              <p className="fgd-meta">
                {[categoryLabel, `${weights} weight${weights === 1 ? '' : 's'}`, scripts.length > 0 ? scripts.join(', ') : null]
                  .filter(Boolean).join(' · ')}
              </p>
            </header>

            {loadState === 'unknown' && (
              <div className="fgd-note" role="status">
                <span className="fgd-note-spinner" aria-hidden="true" />
                <span>Still loading this preview — showing a fallback face until {font.family} arrives.</span>
              </div>
            )}

            {loadState === 'failed' && (
              <div className="typ-notice fgd-notice" role="status">
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

            {/* One control, and it drives the weight list below it. */}
            <div className="fgd-controls">
              <label className="fgd-field">
                <span>Preview text</span>
                <input
                  type="text"
                  value={text}
                  maxLength={72}
                  spellCheck="false"
                  placeholder="Type your own words"
                  enterKeyHint="done"
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                />
              </label>
            </div>

            <section className="fgd-sec" aria-labelledby="fgd-h-weights">
              <h3 className="fgd-h" id="fgd-h-weights">Weights</h3>
              <ol className="fgd-weights">
                {font.variants.map(w => (
                  <li key={w} className="fgd-weight">
                    <span
                      className="fgd-weight-line"
                      ref={varsRef({ '--fgd-ff': fam, '--fgd-fw': String(w) })}
                    >
                      {text.trim() || PANGRAM}
                    </span>
                    <span className="fgd-weight-tag">
                      <strong>{w}</strong>{weightName(w) ? ` ${weightName(w)}` : ''}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="fgd-sec" aria-labelledby="fgd-h-about">
              <h3 className="fgd-h" id="fgd-h-about">About</h3>
              <FontAboutPanel font={font} id="fgd-about" inline />
            </section>

            <section className="fgd-sec" aria-labelledby="fgd-h-chars">
              <h3 className="fgd-h" id="fgd-h-chars">Characters</h3>
              <div
                className="fgd-glyphs"
                role="img"
                aria-label="Capitals A to Z, lowercase a to z, the digits 0 to 9 and common symbols"
                ref={varsRef({ '--fgd-ff': fam, '--fgd-fw': String(bodyWeight(font)) })}
              >
                {GLYPHS.map((g, i) => <span key={i} className="fgd-glyph" aria-hidden="true">{g}</span>)}
              </div>
            </section>

            {pairings.length > 0 && (
              <section className="fgd-sec" aria-labelledby="fgd-h-pairs">
                <h3 className="fgd-h" id="fgd-h-pairs">Pairs well with</h3>
                <div className="fgd-pairs">
                  {pairings.map(({ font: pair, reason }) => (
                    <div
                      key={pair.family}
                      className="fgd-pair"
                      ref={varsRef({
                        '--fgd-ff': fam,
                        '--fgd-fw-h': String(headingWeight(font)),
                        '--fgd-pair-ff': fontStack(pair),
                        '--fgd-pair-fw': String(bodyWeight(pair)),
                      })}
                    >
                      <div className="fgd-pair-preview">
                        <span className="fgd-pair-heading">{font.family}</span>
                        <span className="fgd-pair-body">{pair.family} keeps the body copy readable underneath.</span>
                      </div>
                      <p className="fgd-pair-reason">{reason}</p>
                      <div className="fgd-pair-foot">
                        <span className="fgd-pair-name">{pair.family}</span>
                        <button type="button" className="fgd-btn fgd-btn--small" onClick={() => onSendToPair(font, pair)}>
                          Open in Font Pair
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="fgd-sec" aria-labelledby="fgd-h-examples">
              <h3 className="fgd-h" id="fgd-h-examples">Examples</h3>
              <FontExamplesPanel font={font} id="fgd-examples" inline />
            </section>

            <section className="fgd-sec" aria-labelledby="fgd-h-inuse">
              <h3 className="fgd-h" id="fgd-h-inuse">In use</h3>
              <FontInUsePanel font={font} id="fgd-inuse" inline />
            </section>
          </div>
        </div>

        {/* The actions, pinned to the foot in one row that never wraps. */}
        <footer className="fgd-bar">
          <div className="fgd-bar-row" role="group" aria-label={`Actions for ${font.family}`}>
            <button type="button" className="fgd-btn fgd-btn--primary" onClick={() => onSendToPair(font, null)}>
              Find a pairing
            </button>
            {layout !== 'phone' && (
              <button type="button" className="fgd-btn" onClick={() => onSendToScale(font)}>
                Build a type scale
              </button>
            )}
            {/* One name whether or not the font is in the comparison: the
                pressed state says which, and the +/check icon shows it. */}
            {phone ? (
              <button
                type="button"
                className="fgd-btn fgd-btn--icon"
                onClick={() => onCompare(font)}
                aria-pressed={inCompare}
                aria-label={`Compare ${font.family}`}
              >
                <CompareIcon on={inCompare} />
              </button>
            ) : (
              <button type="button" className="fgd-btn fgd-btn--compare" onClick={() => onCompare(font)} aria-pressed={inCompare}>
                <CompareIcon on={inCompare} />
                Compare
              </button>
            )}
            {layout === 'wide' ? (
              <>
                <button type="button" className="fgd-btn" onClick={copyImport}>
                  Copy import URL
                </button>
                <a className="fgd-btn" href={googleUrl} target="_blank" rel="noopener noreferrer">
                  View on Google Fonts<span className="fgd-ext" aria-hidden="true"> ↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </>
            ) : (
              <MoreMenu iconOnly={phone} items={moreItems} family={font.family} />
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
