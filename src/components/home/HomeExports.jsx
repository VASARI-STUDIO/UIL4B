import { useEffect, useMemo, useRef, useState } from 'react'
import { EXPORT_THEMES_LIVE } from '../../config/exportFormats'
import { exportCopy, exportRows, kerbsideRamp, projectsLimit, STACK_TOPS } from './homeExportsData'
import { HOME_EXPORT_IMAGES, homeExportSrc, homeExportSrcSet } from './homeExportsImages'
import {
  FACES_URL,
  ICONS,
  PIECES,
  PHOTO_SIZES,
  PROJECTS,
  TOKEN_FORMATS,
  artCaption,
  byteLength,
  dockTop,
  footnote,
  iconSvg,
  iconsBytes,
  photoCells,
  readStackTops,
  smallSize,
  tokenText,
  typeSteps,
  zipTotal,
} from './homeExportsKit'
import SIZES from './homeExportsSizes.json'
import '../../styles/pages/home-exports.css'

// The homepage's exports section: three pinned cards, each showing the thing it
// makes. One DOM serves every width; home-exports.css decides which parts show.
// Every count, price and list line comes from the config and the kit files.

// A card is scaled and dimmed by how far the next one has travelled over it: that is
// scroll-linked CSS in home-exports.css, with no script on the scroll.

// The faces the cards draw are fetched only once the section is within this
// distance of the viewport.
const NEAR_MARGIN = '600px'

// Card 2's four pictures. `art` is the id of the row that brings one forward;
// a picture whose id no row names is left out. `sizes` says which width is drawn.
// ships with the export themes
const OBJECTS = [
  { key: 'gb', art: 'brand-guidelines', image: 'guide-signage', alt: 'The signage page of the Kerbside brand guidelines, a bus shelter poster', sizes: '260px' },
  { key: 'gf', art: 'brand-guidelines', image: 'guide-cover', alt: 'Cover of the Kerbside brand guidelines', sizes: '(max-width: 767px) 260px, (max-width: 1439px) 352px, 520px' },
  { key: 'kt', art: 'brand-kit', image: 'brandkit-palette', alt: 'The palette sheet from the Kerbside brand kit', sizes: '(max-width: 767px) 168px, (max-width: 1439px) 220px, 320px' },
  { key: 'bk', art: 'brand-book', image: 'book-screen', alt: 'The Kerbside HTML brand book open at its overview', sizes: '(max-width: 767px) 240px, (max-width: 1439px) 400px, 500px' },
  { key: 'ui', art: 'ui-kit', image: 'kit-screen-light', alt: 'The product screen page of the Kerbside UI kit', sizes: '(max-width: 767px) 210px, (max-width: 1439px) 336px, 440px' },
]

// A token row's rem value without trailing zeros: "1.000rem" is "1rem".
const trimRem = (rem) => rem.replace(/\.?0+rem$/, 'rem')

function Picture({ id, sizes, alt = '', className, style, ...rest }) {
  const image = HOME_EXPORT_IMAGES[id]
  const fallback = image.widths[1] ?? image.widths[0]
  return (
    <picture>
      <source type="image/avif" srcSet={homeExportSrcSet(id, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={homeExportSrcSet(id, 'webp')} sizes={sizes} />
      <img
        className={className}
        style={style}
        src={homeExportSrc(id, 'webp', fallback)}
        sizes={sizes}
        alt={alt}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
        {...rest}
      />
    </picture>
  )
}

function Dot() {
  return <span className="hx-dot" aria-hidden="true" />
}

/* ── card 1 ───────────────────────────────────────────────────────────────── */

function RampView({ ramp }) {
  return (
    <div className="hx-ramp" data-view="palette">
      {ramp.map((r) => (
        <span key={r.step} className="hx-rrow" style={{ background: r.hex, color: r.ink }}>
          <span className="hx-aa" aria-hidden="true">Aa</span>
          <span className="hx-mono hx-step">{r.step}</span>
          <span className="hx-hexcell">
            <span className="hx-mono hx-hex">{r.hex.toUpperCase()}</span>
            {r.primary && <span className="hx-role">primary</span>}
          </span>
          <span className="hx-mono hx-grade">
            {r.grade}
            <span className="hx-on"> on {r.ground}</span>
          </span>
        </span>
      ))}
    </div>
  )
}

function TypeView({ steps }) {
  return (
    <div className="hx-type" data-view="type">
      {steps.map((t) => (
        <span key={t.name} className="hx-ts">
          <span className="hx-mono hx-dim">
            {t.name}
            <br />
            {t.rem}
          </span>
          <span
            className={`hx-tline${t.display ? ' hx-tline--lead' : ''}${t.accent ? ' hx-tline--accent' : ''}`}
            style={{ '--px': t.px, '--chars': t.chars }}
          >
            {t.line}
          </span>
        </span>
      ))}
    </div>
  )
}

function FilesView({ cells }) {
  return (
    <div className="hx-files" data-view="images">
      {cells.map((cell) => (
        <span key={cell.id} className={`hx-cell hx-cell--${cell.index}`}>
          <Picture
            id={cell.id}
            sizes={PHOTO_SIZES[cell.id]}
            alt={cell.alt}
            className="hx-fimg"
            style={{ objectPosition: cell.pos }}
          />
          <span className="hx-chip hx-chip--name">
            <span className="hx-mono">{cell.name}</span>
          </span>
          <span className="hx-chip hx-chip--size">
            <span className="hx-mono hx-dim hx-was">{cell.was}</span>
            <span className="hx-mono">
              {cell.now}
              <span className="hx-webp"> WebP</span>
            </span>
          </span>
        </span>
      ))}
    </div>
  )
}

function IconsView() {
  return (
    <div className="hx-icons" data-view="icons">
      {ICONS.map((d) => (
        <span key={d} className="hx-icell">
          <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF5A1F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={d} />
          </svg>
        </span>
      ))}
    </div>
  )
}

/* ── the section ──────────────────────────────────────────────────────────── */

export default function HomeExports({ live = EXPORT_THEMES_LIVE }) {
  const sectionRef = useRef(null)
  const cardRefs = useRef([])
  const trackRefs = useRef([])
  const copyTimer = useRef(null)
  const [near, setNear] = useState(false)
  const [piece, setPiece] = useState(0)
  const [fmt, setFmt] = useState(0)
  const [doc, setDoc] = useState(0)
  const [proj, setProj] = useState(0)
  const [copied, setCopied] = useState(false)

  const ramp = useMemo(() => kerbsideRamp(), [])
  const steps = useMemo(() => typeSteps(), [])
  const cells = useMemo(() => photoCells(SIZES), [])
  const rows = useMemo(() => exportRows(live), [live])
  const copy = useMemo(() => exportCopy(live), [live])
  const limit = useMemo(() => projectsLimit(PROJECTS.length), [])

  // Card 1's file: its name, the size the bar shows and the text "Copy file" puts on the clipboard.
  const file = useMemo(() => {
    const formats = piece < 2 ? TOKEN_FORMATS : [[piece === 2 ? 'WebP' : 'SVG', 'zip']]
    const f = Math.min(fmt, formats.length - 1)
    if (piece < 2) {
      const pairs = piece === 0
        ? ramp.map((r) => [r.step, r.hex])
        : steps.map((s) => [s.name, trimRem(s.rem)])
      const text = tokenText(pairs, f)
      const name = `kerbside-${piece === 0 ? 'palette' : 'type-scale'}.${formats[f][1]}`
      return { formats, f, name, size: smallSize(byteLength(text)), text }
    }
    if (piece === 2) {
      // A zip can't go on the clipboard as text; the contents list can.
      const text = `${cells.map((c) => c.name.replace(/\.png$/, '.webp')).join('\n')}\n`
      return { formats, f, name: 'kerbside-images-webp.zip', size: zipTotal(SIZES), text }
    }
    const text = `${ICONS.map((d) => iconSvg(d)).join('\n')}\n`
    return { formats, f, name: 'kerbside-icons-svg.zip', size: smallSize(iconsBytes()), text }
  }, [piece, fmt, ramp, steps, cells])

  const pickPiece = (i) => {
    setPiece(i)
    setFmt(0)
    setCopied(false)
  }
  const pickFmt = (i) => {
    setFmt(i)
    setCopied(false)
  }

  // "Copied" shows only once the clipboard accepted the text.
  const copyFile = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard.writeText(file.text).then(() => {
      setCopied(true)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1400)
    }, () => {})
  }

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  // Fetch the card faces once the section is near.
  useEffect(() => {
    const section = sectionRef.current
    if (!section || near || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setNear(true)
    }, { rootMargin: NEAR_MARGIN })
    observer.observe(section)
    return () => observer.disconnect()
  }, [near])

  // Dock each card at its top. From 1024 the tops come from the --stack-top-N
  // tokens; below that a card taller than the screen docks by its bottom edge.
  // Card heights change with the answer picked and with the faces, so it
  // re-runs on each.
  useEffect(() => {
    const section = sectionRef.current
    const cards = cardRefs.current.filter(Boolean)
    if (!section || cards.length === 0) return undefined
    let mounted = true
    const dock = () => {
      const style = getComputedStyle(section)
      const tops = readStackTops((name) => style.getPropertyValue(name))
      const docks = cards.map((el, index) => dockTop({
        index,
        tops,
        width: window.innerWidth,
        height: window.innerHeight,
        cardHeight: el.offsetHeight,
      }))
      cards.forEach((el, index) => { el.style.top = `${docks[index]}px` })
      // Each card after the first has a tracker for the scroll-linked cover of the card
      // before it. Its height is the distance the card's top travels from the earlier
      // card's bottom edge to its own dock line, and it sits that dock line above it.
      trackRefs.current.forEach((track, index) => {
        if (!track || index === 0 || !cards[index - 1]) return
        track.style.setProperty('--hx-trav', `${Math.max(1, docks[index - 1] + cards[index - 1].offsetHeight - docks[index])}px`)
        track.style.setProperty('--hx-dock', `${docks[index]}px`)
      })
    }
    dock()
    window.addEventListener('resize', dock)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(dock)
    cards.forEach((el) => observer?.observe(el))
    document.fonts?.ready.then(() => { if (mounted) dock() })
    return () => {
      mounted = false
      window.removeEventListener('resize', dock)
      observer?.disconnect()
    }
  }, [])

  const front = rows[Math.min(doc, rows.length - 1)]?.art
  const shown = OBJECTS.filter((o) => rows.some((r) => r.art === o.art))
  const stackTops = Object.fromEntries(STACK_TOPS.map((top, i) => [`--stack-top-${i}`, `${top}px`]))
  const setCard = (i) => (el) => { cardRefs.current[i] = el }
  const tracker = (i) => <span className="hx-track" data-track={i} ref={(el) => { trackRefs.current[i] = el }} aria-hidden="true" />

  const card1 = (
    <div className="hx-card" data-card="0" ref={setCard(0)}>
      <div className="hx-grid">
        <div className="hx-say">
          <h3>From small jobs.</h3>
          <p>Pull out the palette on its own, the type scale on its own, a folder of compressed images or a custom icon kit. Each one leaves as a real file, named and ready to commit.</p>
          <p className="hx-note">Shown with Kerbside, a sample brand. Photos from Unsplash.</p>
          <div className="hx-list hx-list--pieces" role="group" aria-label="What to export">
            {PIECES.map((p, i) => (
              <button key={p.id} type="button" className="hx-row hx-pc" aria-pressed={i === piece} onClick={() => pickPiece(i)}>
                <Dot />
                <span className="hx-name">
                  <span className="hx-long">{p.name}</span>
                  <span className="hx-short">{p.short}</span>
                </span>
                <span className="hx-tag">
                  <span className="hx-long">{p.tag}</span>
                  <span className="hx-short">{p.shortTag}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="hx-art hx-art--files">
          <div className="hx-stage">
            {piece === 0 && <RampView ramp={ramp} />}
            {piece === 1 && <TypeView steps={steps} />}
            {piece === 2 && <FilesView cells={cells} />}
            {piece === 3 && <IconsView />}
          </div>
          <div className="hx-bar">
            <span className="hx-file">
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(239,238,234,.6)" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M6 3h8l4 4v14H6zM14 3v4h4" />
              </svg>
              <span className="hx-mono hx-fname">{file.name}</span>
              <span className="hx-mono hx-dim hx-fsize">{file.size}</span>
            </span>
            <span className="hx-segs" role="group" aria-label="File format">
              {file.formats.map(([label], i) => (
                <button key={label} type="button" className="hx-seg" aria-pressed={i === file.f} onClick={() => pickFmt(i)}>
                  {label}
                </button>
              ))}
            </span>
            <button type="button" className="hx-pill" onClick={copyFile}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="8" y="8" width="12" height="12" rx="2" />
                <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
              </svg>
              <span aria-live="polite">{copied ? 'Copied' : 'Copy file'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const card2 = (
    <div className="hx-card" data-card="1" ref={setCard(1)}>
      <div className="hx-grid">
        <div className="hx-say">
          <h3>To whole design systems.</h3>
          {/* ships with the export themes */}
          <p>{copy.body}</p>
          {/* ships with the export themes */}
          <p className="hx-note">{copy.note}</p>
          <div className="hx-list" role="group" aria-label="Which file to bring forward">
            {rows.map((row, i) => (
              <button key={row.id} type="button" className="hx-row" aria-pressed={i === doc} onClick={() => setDoc(i)}>
                <Dot />
                <span>
                  {row.name}
                  <span className="hx-sub">{row.sub}</span>
                </span>
                <span className="hx-tag">{row.tag}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="hx-art hx-art--sys">
          <div className="hx-stage">
            {shown.map((o) => {
              const isFront = o.art === front
              if (o.key === 'bk') {
                return (
                  <span key={o.key} className="hx-obj hx-pg hx-bk" data-front={isFront}>
                    <span className="hx-chrome" aria-hidden="true">
                      <i /><i /><i />
                      <span className="hx-mono">brand-book/index.html</span>
                    </span>
                    <Picture id={o.image} sizes={o.sizes} alt={o.alt} className="hx-bkimg" />
                  </span>
                )
              }
              return (
                <Picture key={o.key} id={o.image} sizes={o.sizes} alt={o.alt} className={`hx-obj hx-pg hx-${o.key}`} data-front={isFront} />
              )
            })}
          </div>
          {/* ships with the export themes */}
          <p className="hx-cap">{artCaption(live)}</p>
        </div>
      </div>
    </div>
  )

  const card3 = (
    <div className="hx-card" data-card="2" ref={setCard(2)}>
      <div className="hx-grid">
        <div className="hx-say">
          <h3>Still here when you return.</h3>
          <p>Reopen a project and it’s where you left it: the palette, the fonts, the icons. Export it again whenever you need to.</p>
          <p className="hx-note">{limit.note}</p>
          <div className="hx-list" role="group" aria-label="Example projects">
            {PROJECTS.map((p, i) => (
              <button key={p.name} type="button" className="hx-row" aria-pressed={i === proj} onClick={() => setProj(i)}>
                <Dot />
                <span>
                  {p.name}
                  <span className="hx-sub">{p.parts}</span>
                </span>
                <span className="hx-tag">{p.when.replace('Opened ', '')}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="hx-art hx-art--proj">
          <div className="hx-ws" aria-hidden="true">
            <div className="hx-wshead">
              <svg width="24" height="15" viewBox="0 0 323.61 200" fill="#EFEEEA">
                <path d="M0 0H100V123.61A123.61 123.61 0 0 0 126.43 200H76.39A76.39 76.39 0 0 1 0 123.61Z" />
                <path d="M125 0H177.79A47.21 47.21 0 0 1 225 47.21V125H276.39A47.21 47.21 0 0 1 323.61 172.21V200H201.39A76.39 76.39 0 0 1 125 123.61Z" />
              </svg>
              <span className="hx-wstitle">Your workspace</span>
              <span className="hx-count">
                {limit.pill}
                <span className="hx-count-long">{limit.pillLong}</span>
                <span className="hx-count-mid">{limit.pillLong.replace(' projects', '')}</span>
              </span>
            </div>
            <div className="hx-tiles" style={{ '--proj': proj }}>
              {PROJECTS.map((p, i) => (
                <span key={p.name} className="hx-tile" data-selected={i === proj}>
                  <span className="hx-ph">
                    <Picture id={p.photo} sizes={p.sizes} className="hx-tphoto" style={{ '--pos': p.pos, '--pos-phone': p.posPhone }} />
                    <span className="hx-scrim">
                      <span
                        className="hx-word"
                        style={{
                          fontFamily: p.word.family,
                          fontWeight: p.word.weight,
                          fontStretch: p.word.stretch,
                          letterSpacing: p.word.track,
                          '--w-px': p.word.px,
                          '--w-pxp': p.word.pxPhone,
                          '--w-k': p.word.k,
                        }}
                      >
                        {p.word.text}
                      </span>
                      <span className="hx-pal">
                        {p.pal.map((c) => <span key={c} style={{ background: c }} />)}
                      </span>
                    </span>
                    <span className="hx-open">Open</span>
                  </span>
                  <span className="hx-tmeta">
                    <span className="hx-tname">{p.name}</span>
                    <span className="hx-twhen">{p.when}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <section id="exports" ref={sectionRef} className="hx" aria-labelledby="exports-h" data-pins style={stackTops}>
      {near && <link rel="stylesheet" href={FACES_URL} />}
      <div className="hx-wrap">
        <div className="hx-head">
          <h2 id="exports-h" className="hx-h2" tabIndex={-1}>For All Your Design Tasks</h2>
          <p className="hx-lead">Covering all your design needs, from one palette to a whole design system. Every file leaves the browser looking like a studio made it.</p>
        </div>

        <div className="hx-stack">
          <div className="hx-nest">
            {card1}
            <div className="hx-gap" aria-hidden="true" />
            <div className="hx-nest">
              {tracker(1)}
              {card2}
              <div className="hx-gap" aria-hidden="true" />
              <div className="hx-nest">
                {tracker(2)}
                {card3}
                <div className="hx-tail" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        {/* ships with the export themes */}
        <p className="hx-foot">{footnote(live)}</p>
      </div>
    </section>
  )
}
