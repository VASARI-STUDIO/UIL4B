import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useModalDialog from '../hooks/useModalDialog'
import { FontAboutPanel, FontDossierTabs, FontExamplesPanel, FontInUsePanel } from './FontDossier'
import { trackFontCopy } from '../utils/analytics'
import {
  bodyWeight, fontStack, getFontImportUrl, headingWeight, loadFont, reloadFont,
  suggestPairings, verifyFontLoaded,
} from '../utils/googleFonts'
import { formatSubsets, weightName } from '../utils/fontGallery'
import '../styles/pages/font-detail.css'

// The Font Gallery's family pop-up. At 768 and up it is one scroll of sections
// under a plain hero, with the actions pinned to the foot in a single row; the
// tabs became section headings and nothing they held was dropped. At 1440 the
// bar holds five actions, at 768 three and More. At 390 the sheet keeps the
// tabs (Specimen, About, Examples, In use), and its foot holds Open in Font
// Pair and Compare.

const PANGRAM = 'The quick brown fox jumps over the lazy dog'
// What the phone sheet sets each weight in when no words were typed.
const PHONE_LINE = 'Bikes, not vans.'
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

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

// The overflow of the action bar: a menu button that opens upward over the
// bar. Escape, a press outside or focus leaving closes it, and the dialog's own
// Escape waits for it (useModalDialog skips a close while an
// [aria-haspopup][aria-expanded=true] trigger is on screen).
function MoreMenu({ items, family }) {
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
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, close])

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
        className="fgd-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        More
      </button>
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

// "CSS carries 400 and 700."
function carriesLine(weights) {
  if (weights.length === 1) return `CSS carries ${weights[0]}`
  return `CSS carries ${weights.slice(0, -1).join(', ')} and ${weights[weights.length - 1]}`
}

// The phone sheet's body: four tabs under the hero. The Specimen tab sets every
// weight in the typed words (or the house line), lets the reader choose which
// weights the CSS carries, and holds Copy CSS, Copy font import, Use as body in
// Font Pair and Open in Type Scale. Tab and weight choices are this sheet's own.
function PhoneSheetBody({ font, fam, words, onCopy, onSendToScale, onUseBody, onUndoBody }) {
  const [tab, setTab] = useState('specimen')
  // The reader's weights for the CSS, recorded against the font they were
  // chosen for, so another font starts from its own defaults.
  const [chosen, setChosen] = useState(null)
  const [copied, setCopied] = useState('')
  const [bodySet, setBodySet] = useState(false)
  const timers = useRef({})
  // The body slot as it was before the first "Use as body" in this sheet.
  const before = useRef(undefined)

  useEffect(() => {
    const held = timers.current
    return () => Object.values(held).forEach(clearTimeout)
  }, [])

  const sorted = useMemo(() => [...font.variants].sort((a, b) => a - b), [font.variants])
  // Regular and heading weights, the same pair the gallery's cards copy.
  const defaults = useMemo(() => {
    const pair = [...new Set([bodyWeight(font), headingWeight(font)])]
      .filter(w => sorted.includes(w)).sort((a, b) => a - b)
    return pair.length ? pair : sorted.slice(0, 1)
  }, [font, sorted])
  const weights = chosen && chosen.font === font ? chosen.list : defaults

  const toggleWeight = (w) => {
    const list = weights.includes(w) ? weights.filter(x => x !== w) : [...weights, w].sort((a, b) => a - b)
    if (list.length) setChosen({ font, list })
  }

  const importLine = `@import url('${getFontImportUrl([{ family: font.family, weights }])}');`
  const css = `${importLine}\n\nfont-family: ${fam};`

  const copy = (key, text) => {
    trackFontCopy(font.family)
    Promise.resolve(onCopy?.(text)).then(ok => {
      if (!ok) return
      setCopied(key)
      clearTimeout(timers.current.copied)
      timers.current.copied = setTimeout(() => setCopied(''), 2000)
    })
  }

  const setBody = () => {
    const previous = onUseBody(font)
    if (before.current === undefined) before.current = previous
    setBodySet(true)
    clearTimeout(timers.current.body)
    timers.current.body = setTimeout(() => { setBodySet(false); before.current = undefined }, 6000)
  }
  const undoBody = () => {
    clearTimeout(timers.current.body)
    onUndoBody(before.current)
    before.current = undefined
    setBodySet(false)
  }

  return (
    <>
      <FontDossierTabs value={tab} onChange={setTab} idBase="fgd" label={`About ${font.family}`} />

      {tab === 'specimen' && (
        <div className="fgd-spec" id="fgd-panel-specimen" role="tabpanel" aria-labelledby="fgd-tab-specimen" tabIndex={0}>
          <section className="fgd-spec-sec" aria-labelledby="fgd-h-weights">
            <h3 className="fgd-h" id="fgd-h-weights">Every weight, in your words</h3>
            <ol className="fgd-weights">
              {sorted.map(w => (
                <li key={w} className="fgd-weight">
                  <span className="fgd-weight-line" ref={varsRef({ '--fgd-ff': fam, '--fgd-fw': String(w) })}>{words}</span>
                  <span className="fgd-weight-tag">
                    <strong>{w}</strong>{weightName(w) ? ` ${weightName(w)}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="fgd-spec-sec" aria-labelledby="fgd-h-css">
            <h3 className="fgd-h" id="fgd-h-css">Weights in the CSS</h3>
            <div className="fgd-wpills" role="group" aria-labelledby="fgd-h-css">
              {sorted.map(w => {
                const on = weights.includes(w)
                return (
                  <button
                    key={w}
                    type="button"
                    className="fgd-wpill"
                    aria-pressed={on}
                    aria-disabled={on && weights.length === 1 ? true : undefined}
                    onClick={() => toggleWeight(w)}
                  >
                    {on && <CheckIcon />}{w}
                  </button>
                )
              })}
            </div>
            <pre className="fgd-code"><code>{css}</code></pre>
            <p className="fgd-carries">{carriesLine(weights)}</p>

            <div className="fgd-acts">
              <button type="button" className="fgd-btn" onClick={() => copy('css', css)} aria-label={`Copy CSS for ${font.family}`}>
                {copied === 'css' ? 'Copied' : 'Copy CSS'}
              </button>
              <button type="button" className="fgd-btn" onClick={() => copy('import', importLine)}>
                {copied === 'import' ? 'Copied' : 'Copy font import'}
              </button>
              <button type="button" className="fgd-btn" onClick={setBody}>Use as body in Font Pair</button>
            </div>
            <span className="sr-only" role="status">{copied ? 'Copied' : ''}</span>
            {bodySet && (
              <p className="fgd-bodyset" role="status">
                {font.family} is now the body in Font Pair.
                <button type="button" className="fgd-link" onClick={undoBody}>Undo</button>
              </p>
            )}
            <button type="button" className="fgd-golink" onClick={() => onSendToScale(font)}>
              <span>Open in Type Scale</span><ArrowIcon />
            </button>
          </section>
        </div>
      )}

      {tab === 'about' && <FontAboutPanel font={font} id="fgd-panel-about" labelledBy="fgd-tab-about" />}
      {tab === 'examples' && <FontExamplesPanel font={font} id="fgd-panel-examples" labelledBy="fgd-tab-examples" />}
      {tab === 'inuse' && <FontInUsePanel font={font} id="fgd-panel-inuse" labelledBy="fgd-tab-inuse" />}
    </>
  )
}

export default function FontDetailDialog({
  font, previewText, categoryLabel, layout, onClose, onCopy, onCompare, inCompare,
  onSendToPair, onSendToScale, onUseBody, onUndoBody, backdrop,
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
    // Any pop while open means the reader left our entry, so the pop-up closes,
    // except the pop a dialog opened on top makes when it closes itself.
    const onPop = (event) => {
      if (event.__overlaySelf) return
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
            <header className={backdrop ? 'fgd-hero fgd-hero--bg' : 'fgd-hero'} ref={heroRef}>
              {backdrop && (
                <span className="fgd-hero-bg" aria-hidden="true" ref={varsRef({ '--fgd-bgimg': `url(${backdrop})` })} />
              )}
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

            {phone ? (
              <PhoneSheetBody
                font={font}
                fam={fam}
                words={previewText.trim() || PHONE_LINE}
                onCopy={onCopy}
                onSendToScale={onSendToScale}
                onUseBody={onUseBody}
                onUndoBody={onUndoBody}
              />
            ) : (
            <>
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
            </>
            )}
          </div>
        </div>

        {/* The actions, pinned to the foot in one row that never wraps. */}
        <footer className="fgd-bar">
          <div className="fgd-bar-row" role="group" aria-label={`Actions for ${font.family}`}>
            <button type="button" className="fgd-btn fgd-btn--primary" onClick={() => onSendToPair(font, null)}>
              {phone ? 'Open in Font Pair' : 'Find a pairing'}
              {phone && <ArrowIcon />}
            </button>
            {!phone && (
              <button type="button" className="fgd-btn" onClick={() => onSendToScale(font)}>
                Build a type scale
              </button>
            )}
            {/* One name whether or not the font is in the comparison: the
                pressed state says which, and the +/check icon shows it. */}
            <button type="button" className="fgd-btn fgd-btn--compare" onClick={() => onCompare(font)} aria-pressed={inCompare}>
              <CompareIcon on={inCompare} />
              Compare
            </button>
            {phone ? null : layout === 'wide' ? (
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
              <MoreMenu items={moreItems} family={font.family} />
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
