import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PhIcon from './PhIcon'
import { FREE_SAVE_LIMITS } from '../../config/plans'
import { HOME_EXPORTS } from '../../data/homeExports.generated'
import { numberWord, route } from './spectrumFacts'
import { prefersReducedMotion } from './reducedMotion'
import {
  BASES,
  EX_FILES,
  EX_FMTS,
  EX_PIECES,
  FONTS,
  GLYPHS,
  ICON_FORMATS,
  PROJECTS,
  TYPE_LABELS,
  TYPE_STEPS,
  exFileIcon,
  exFileOf,
  formatBytes,
  rampOf,
  remPx,
} from './spectrumKit'

// ═════════════════════════════════════════════════════════════════════════════
// STUDIO QUALITY EXPORTS — the three stacking cards.
// ═════════════════════════════════════════════════════════════════════════════
//
// ── THE NESTING IS THE MECHANISM ────────────────────────────────────────────
// A sticky box pins only inside its own containing block. The design nests:
//
//   nest A ─ card 0 (sticky 84) · pad · nest B ─ card 1 (sticky 116) · pad ·
//                                              nest C ─ card 2 (sticky 148) · tail
//
// so card 0 stays pinned for the whole length of A (which holds 1 and 2), card
// 1 for the length of B, card 2 for C and its tail. Built as three sibling
// slots, the previous version never pinned at all (tops 203 → −142 → −492).
//
// ── THE COVERED CARDS SHRINK AND DIM (`syncStack`) ─────────────────────────
// For each card, count the cards after it that are docked at their own top;
// scale it by 1 − 0.045 per docked card and dim it by 1 − 0.05, from its top
// edge, over the 240ms transition in spectrum.css. Two cards on top of card 0
// give .91; one on card 1 gives .955. Skipped under reduced motion and, by the
// CSS, at 1199px and below, where the stack is three ordinary cards (a card there
// is taller than most screens, so it cannot pin).
//
// ── ONE FRAME ───────────────────────────────────────────────────────────────
// Every card is the same fixed size at a given width (spectrum.css, "one card
// system"): a copy column and a stage. Card 1's stage is its live panel. Cards 2
// and 3 put a plate in the stage: real renders of the product's own exports, made
// by scripts/home-exports/generate.mjs and listed in src/data/homeExports.generated.js.
//
// ── WHAT IS LIVE ────────────────────────────────────────────────────────────
// Card 1's panel builds a real file from the seed chosen in the bench's palette
// window (and the family chosen in its font window), and "Copy file" copies it.
// Cards 2 and 3 are pictures, rendered once from fixed inputs (Cobalt, Schibsted
// Grotesk, Literata, Northbeam); they do not follow the bench.

const TOPS = [84, 116, 148]

function stackPass(els) {
  const off = prefersReducedMotion() || window.innerWidth <= 1199
  for (let i = 0; i < els.length; i += 1) {
    const el = els[i]
    if (!el) continue
    let docked = 0
    if (!off) {
      for (let j = i + 1; j < els.length; j += 1) {
        const r = els[j]?.getBoundingClientRect()
        if (r && r.top <= TOPS[j] + 6 && r.bottom > TOPS[j]) docked += 1
      }
    }
    el.style.transform = docked ? `scale(${(1 - docked * 0.045).toFixed(3)})` : ''
    el.style.filter = docked ? `brightness(${(1 - docked * 0.05).toFixed(3)})` : ''
  }
}

function useStackSync(cards) {
  useEffect(() => {
    let raf = 0
    const run = () => {
      raf = 0
      stackPass(cards.current)
    }
    const request = () => { if (!raf) raf = requestAnimationFrame(run) }
    run()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request, { passive: true })
    return () => {
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [cards])
}

function Card({ index, setRef, children }) {
  return (
    <div className="sp-stack-card" data-stack-card={index} ref={setRef} style={{ '--sp-stack-top': `${TOPS[index]}px` }}>
      <div className="sp-stack-grid">{children}</div>
    </div>
  )
}

/* ── card 1 · one piece ───────────────────────────────────────────────────── */

function OnePiece({ base, font }) {
  const [piece, setPiece] = useState(0)
  const [fmt, setFmt] = useState(0)
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const seed = BASES[base]
  const ramp = rampOf(seed)
  const file = exFileOf(piece, fmt, seed)
  const spec = FONTS[font]
  // Palette and Type scale offer CSS / Tailwind / JSON; Icons offers its own
  // three; Compressed files has nothing to choose, so it shows a line of text.
  const fmts = piece === 3 ? ICON_FORMATS : EX_FMTS.map(([label]) => label)
  const copy = useCallback(() => {
    navigator.clipboard?.writeText(file.text).catch(() => {})
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1200)
  }, [file.text])
  // The Icons formats mean something else from the others', so moving into or
  // out of Icons starts again at the first format.
  const pick = (i) => {
    if ((i === 3) !== (piece === 3)) setFmt(0)
    setPiece(i)
    setCopied(false)
  }

  return (
    <div className="sp-ex">
      <div className="sp-ex-pieces" role="group" aria-label="What to export">
        {EX_PIECES.map((label, i) => (
          <button key={label} type="button" className="sp-ex-piece" aria-pressed={piece === i} onClick={() => pick(i)}>{label}</button>
        ))}
      </div>

      <div className="sp-ex-body">
        {piece === 0 && (
          <div className="sp-ex-rows">
            {ramp.map((r) => (
              <span key={r.step}>
                <span className="sp-ex-sw" aria-hidden="true" style={{ background: r.hex, color: r.ink }}>Aa</span>
                <span className="sp-ex-step">{r.step}</span>
                <span className="sp-ex-hex">{r.hex}</span>
                <span className={r.cr >= 4.5 ? 'sp-ex-aa is-pass' : 'sp-ex-aa'}>{`${r.aa} ${r.cr.toFixed(1)}`}</span>
              </span>
            ))}
          </div>
        )}
        {piece === 1 && (
          <div className="sp-ex-type">
            {TYPE_STEPS.map(([name, value]) => (
              <span key={name}>
                <small>{name}</small>
                <b style={{ fontFamily: spec.family, fontSize: `clamp(12px, calc(${value} * 0.72), 36px)` }}>Ag<span className="sp-ex-tname">{` ${TYPE_LABELS[name]}`}</span></b>
                <i>{`${value}, ${remPx(value)}px`}</i>
              </span>
            ))}
          </div>
        )}
        {piece === 2 && (
          <div className="sp-ex-files">
            {EX_FILES.map(([icon, name, was, now]) => (
              <span className="sp-ex-file" key={name}>
                <span>
                  <PhIcon name={icon} />
                  <b>{name}</b>
                  <small>{formatBytes(was * 1024)}</small>
                  <PhIcon name="arrow-right" className="sp-ex-arrow" />
                  <strong><span className="sp-ex-tname">{`${name.replace(/\.png$/, '')}.webp `}</span>{formatBytes(now * 1024)}</strong>
                </span>
                <span className="sp-ex-track"><span style={{ width: `${Math.max(4, Math.round((now / was) * 100))}%` }} /></span>
              </span>
            ))}
            <p className="sp-ex-cap">Example sizes. The converter in the bench above measures your own file.</p>
          </div>
        )}
        {piece === 3 && (
          <div className="sp-ex-icons">
            {GLYPHS.map(([slug, name]) => (
              <span key={slug}>
                <PhIcon name={slug} />
                <small>{name}</small>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="sp-ex-filebar">
        <PhIcon name={exFileIcon(piece, fmt)} />
        <b>{file.name}</b>
        <small>{file.kb}</small>
      </div>
      <div className="sp-ex-actions">
        {piece === 2 ? (
          <span className="sp-ex-fmtnote">PNG in, WebP out</span>
        ) : (
          <div className="sp-ex-fmts" role="group" aria-label="File format">
            {fmts.map((label, i) => (
              <button key={label} type="button" className="sp-ex-fmt" aria-pressed={fmt === i} onClick={() => { setFmt(i); setCopied(false) }}>{label}</button>
            ))}
          </div>
        )}
        {piece === 2 ? (
          <Link className="sp-pill sp-ex-copy sp-ex-copy--link" to={route('file-converter')}>
            <span>Open File Converter</span>
            <span className="sp-pill-icon" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
          </Link>
        ) : (
          <button type="button" className="sp-pill sp-ex-copy" onClick={copy}>
            <PhIcon name="copy" /><span aria-live="polite">{copied ? 'Copied' : 'Copy file'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

/* ── cards 2 and 3 · the plate ────────────────────────────────────────────── */
//
// A plate is a picture of a real export on the stage's ground, with a row of
// buttons under it that picks which one. Card 2 uses it as a tab strip (UI kit,
// Book, Brand deck); card 3 as a radio group of the example projects.
//
// Loading: only the shown picture is fetched. A tab's picture is mounted on its
// first pointerenter, focus or press, and every picture is lazy. The shown
// picture changes only once the new one has decoded, so a swap never shows an
// empty plate (the old one is held until then). Both pictures stay stacked in the
// same box, so nothing below the card moves.

const PLATE_SIZES = '(min-width: 1200px) min(700px, 52vw), calc(100vw - 118px)'
const PORTRAIT_SIZES = 'calc(100vw - 72px)'
const COVER_SIZES = '(min-width: 1200px) 340px, 280px'

const TAB_ITEMS = HOME_EXPORTS.plates.map((p) => ({
  id: p.id,
  label: p.tab,
  // The accessible name has to contain the visible label ("Brand deck").
  name: p.tabName.toLowerCase().includes(p.tab.toLowerCase()) ? p.tabName : `${p.tab}, ${p.tabName}`,
  alt: p.alt,
  variants: p,
}))

// The three example projects, each with its book cover. PROJECTS and the covers
// are in the same order (Northbeam, Halcyon, Ferrule).
const PROJECT_ITEMS = PROJECTS.map(([name, when, parts], i) => {
  const cover = HOME_EXPORTS.covers[i]
  return {
    id: cover.id,
    label: name.split(/[\s,]/)[0],
    name,
    alt: cover.alt,
    variants: cover,
    when,
    parts,
  }
})

function PlatePicture({ item, on, failed, imgRef, onLoad, onError }) {
  const v = item.variants
  const cover = v.landscape === null
  const main = cover ? v.portrait : v.landscape
  const img = (
    <img
      ref={imgRef}
      className={on ? 'is-on' : undefined}
      src={main.src}
      srcSet={main.srcset}
      sizes={cover ? COVER_SIZES : PLATE_SIZES}
      width={main.width}
      height={main.height}
      loading="lazy"
      decoding="async"
      alt={item.alt}
      aria-hidden={on ? undefined : true}
      hidden={failed}
      onLoad={onLoad}
      onError={onError}
    />
  )
  if (cover) return img
  return (
    <picture>
      <source media="(max-width: 760px)" type="image/webp" srcSet={v.portrait.srcset} sizes={PORTRAIT_SIZES} />
      {img}
    </picture>
  )
}

function ExportPlate({ items, mode, label, caption }) {
  const tabs = mode === 'tabs'
  const uid = useId()
  const panelId = `${uid}-panel`
  const tabId = (i) => `${uid}-pick-${i}`
  const [active, setActive] = useState(0)
  const [shown, setShown] = useState(0)
  const [swapped, setSwapped] = useState(false)
  const [mounted, setMounted] = useState(() => new Set([0]))
  const [failed, setFailed] = useState(() => new Set())
  const activeRef = useRef(0)
  const imgs = useRef([])
  const buttons = useRef([])

  const mount = (i) => setMounted((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))

  // Show picture i once it has decoded, unless the reader has moved on.
  const reveal = (i) => {
    const el = imgs.current[i]
    const done = () => { if (activeRef.current === i) setShown(i) }
    if (el && el.decode) el.decode().then(done, done)
    else done()
  }

  const select = (i) => {
    if (i === activeRef.current) return
    activeRef.current = i
    setActive(i)
    setSwapped(true)
    mount(i)
    const el = imgs.current[i]
    if (el && el.complete && el.naturalWidth > 0) reveal(i)
    buttons.current[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  const onLoad = (i) => () => { if (activeRef.current === i) reveal(i) }
  const onError = (i) => () => {
    setFailed((prev) => new Set(prev).add(i))
    if (activeRef.current === i) setShown(i)
  }

  const onKeyDown = (e) => {
    const n = items.length
    let to = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (active + 1) % n
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (active - 1 + n) % n
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = n - 1
    if (to < 0) return
    e.preventDefault()
    select(to)
    buttons.current[to]?.focus()
  }

  return (
    <div className="sp-stage">
      <div
        className="sp-plate"
        id={tabs ? panelId : undefined}
        role={tabs ? 'tabpanel' : undefined}
        aria-labelledby={tabs ? tabId(active) : undefined}
        tabIndex={tabs ? 0 : undefined}
      >
        <div className={swapped ? 'sp-plate-art is-swap' : 'sp-plate-art'}>
          {items.map((item, i) => (mounted.has(i) ? (
            <PlatePicture
              key={item.id}
              item={item}
              on={shown === i}
              failed={failed.has(i)}
              imgRef={(el) => { imgs.current[i] = el }}
              onLoad={onLoad(i)}
              onError={onError(i)}
            />
          ) : null))}
          {failed.has(shown) && <p className="sp-plate-fail">{items[shown].alt}</p>}
        </div>
        <div className="sp-plate-cap">{caption(items[shown])}</div>
      </div>

      <div
        className="sp-pick"
        role={tabs ? 'tablist' : 'radiogroup'}
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        {!tabs && <span className="sp-pick-label" aria-hidden="true">Example projects</span>}
        {items.map((item, i) => (
          <button
            key={item.id}
            ref={(el) => { buttons.current[i] = el }}
            id={tabs ? tabId(i) : undefined}
            type="button"
            className="sp-pick-btn"
            role={tabs ? 'tab' : 'radio'}
            aria-selected={tabs ? active === i : undefined}
            aria-checked={tabs ? undefined : active === i}
            aria-controls={tabs ? panelId : undefined}
            aria-label={item.name}
            tabIndex={active === i ? 0 : -1}
            onClick={() => select(i)}
            onPointerEnter={() => mount(i)}
            onFocus={() => mount(i)}
          >
            {!tabs && <PhIcon name="folder-simple" className="sp-pick-ico" />}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── the stack ────────────────────────────────────────────────────────────── */

export default function SpectrumExports({ base, font }) {
  const cards = useRef([])
  useStackSync(cards)
  const setRef = (i) => (el) => { cards.current[i] = el }

  return (
    <div className="sp-stack">
      <div className="sp-stack-nest">
        <Card index={0} setRef={setRef(0)}>
          <div className="sp-stack-say">
            <h3>Whether it&apos;s just one thing.</h3>
            <p>
              Pull out the palette on its own, the type scale on its own, a folder of compressed
              assets or a custom icon kit. Each one leaves as a real file, named and ready to commit.
            </p>
            <p className="sp-stack-note">Free on every plan.</p>
          </div>
          <OnePiece base={base} font={font} />
        </Card>
        <div className="sp-stack-pad" aria-hidden="true" />

        <div className="sp-stack-nest">
          <Card index={1} setRef={setRef(1)}>
            <div className="sp-stack-say">
              <h3>Or a whole design system.</h3>
              <p>
                One click turns your colour, type and spacing into a UI kit. On Pro the same system
                also leaves as a 12-page book and a 16:9 brand deck.
              </p>
              <p className="sp-stack-note">The UI kit is free. The book and the deck are Pro.</p>
            </div>
            <ExportPlate
              items={TAB_ITEMS}
              mode="tabs"
              label="Export type"
              caption={() => 'Real exports, made from the Cobalt palette with Schibsted Grotesk and Literata.'}
            />
          </Card>
          <div className="sp-stack-pad" aria-hidden="true" />

          <div className="sp-stack-nest">
            <Card index={2} setRef={setRef(2)}>
              <div className="sp-stack-say">
                <h3>You can come back to it anytime.</h3>
                {/* What is true: a project keeps its palette, fonts and icons,
                    and no version history or record of exports. Saved work is a
                    "project", never a "kit". */}
                <p>Reopen a project and it&apos;s where you left it: the palette, the fonts, the icons. Export it again whenever you need to.</p>
                <p className="sp-stack-note">
                  {numberWord(FREE_SAVE_LIMITS.projects, { capital: true })} projects on Free, unlimited on Pro.
                </p>
              </div>
              <ExportPlate
                items={PROJECT_ITEMS}
                mode="radio"
                label="Example projects"
                caption={(item) => (
                  <>
                    <b>{item.name}</b>
                    <span>{item.when}, {item.parts}</span>
                  </>
                )}
              />
            </Card>
            <div className="sp-stack-pad sp-stack-pad--tail" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  )
}
