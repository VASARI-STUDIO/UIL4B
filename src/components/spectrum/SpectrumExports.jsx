import { useEffect, useId, useRef, useState } from 'react'
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
// and 3 put a picture in the stage (card 2 a plate, card 3 a shelf of covers): real renders of the product's own exports, made
// by scripts/home-exports/generate.mjs and listed in src/data/homeExports.generated.js.
//
// ── ONE SWITCH, DRAWN TWICE ─────────────────────────────────────────────────
// Each card has one choice (card 1's piece, card 2's export, card 3's project).
// Its state lives in the card, and the picker is rendered twice from it: as pills
// under the stage (1199px and below) and as rows at the foot of the copy column
// (1200px and up). CSS shows one and hides the other with display: none, so the
// hidden one is out of the accessibility tree. The two have distinct ids.
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

/* ── the switch ───────────────────────────────────────────────────────────── */
//
// One list of choices as buttons: tabs (cards 1 and 2) or radios (card 3), with a
// roving tabindex and Left/Right/Up/Down/Home/End. `variant` is how it is drawn:
// pills under the stage, or rows at the foot of the copy column. Each item is
// { key, label, short?, name, rowLabel?, rowName, hint?, sub?, icon? }.

function PickList({ uid, variant, items, role, label, active, onSelect, onWarm, panelId, wrapClass, btnClass, lead }) {
  const tabs = role === 'tab'
  const rows = variant === 'rows'
  const refs = useRef([])
  const idOf = (i) => `${uid}-${variant}-${i}`

  const choose = (i) => {
    onSelect(i)
    if (!rows) refs.current[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
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
    choose(to)
    refs.current[to]?.focus()
  }

  return (
    <div className={wrapClass} role={tabs ? 'tablist' : 'radiogroup'} aria-label={label} onKeyDown={onKeyDown}>
      {lead}
      {items.map((item, i) => (
        <button
          key={item.key}
          ref={(el) => { refs.current[i] = el }}
          id={idOf(i)}
          type="button"
          className={btnClass}
          role={role}
          aria-selected={tabs ? active === i : undefined}
          aria-checked={tabs ? undefined : active === i}
          aria-controls={tabs ? panelId : undefined}
          aria-label={rows ? item.rowName : item.name}
          tabIndex={active === i ? 0 : -1}
          onClick={() => choose(i)}
          onPointerEnter={onWarm ? () => onWarm(i) : undefined}
          onFocus={onWarm ? () => onWarm(i) : undefined}
        >
          {rows ? (
            <>
              <span className="sp-rows-lab">{item.rowLabel || item.label}</span>
              {item.hint ? <span className="sp-rows-hint">{item.hint}</span> : null}
              {item.sub ? <span className="sp-rows-sub">{item.sub}</span> : null}
            </>
          ) : (
            <>
              {item.icon ? <PhIcon name={item.icon} className="sp-pick-ico" /> : null}
              {item.short ? (
                <>
                  <span className="sp-lab-full">{item.label}</span>
                  <span className="sp-lab-short">{item.short}</span>
                </>
              ) : <span>{item.label}</span>}
            </>
          )}
        </button>
      ))}
    </div>
  )
}

/* ── card 1 · one piece ───────────────────────────────────────────────────── */

// At 560px and below the pills show these, so the four fit one line.
const PIECE_SHORT = ['Palette', 'Type', 'Files', 'Icons']
const FORMATS_HINT = EX_FMTS.map(([label]) => label).join(', ')
const PIECE_HINT = [FORMATS_HINT, FORMATS_HINT, 'PNG in, WebP out', ICON_FORMATS.join(', ')]
const PIECE_ITEMS = EX_PIECES.map((label, i) => ({
  key: label,
  label,
  short: PIECE_SHORT[i],
  name: label,
  hint: PIECE_HINT[i],
  rowName: `${label}, ${PIECE_HINT[i]}`,
}))

// The card owns which piece is open, so its two switches (pills in the panel,
// rows beside the copy) read one state.
function useOnePiece() {
  const [piece, setPiece] = useState(0)
  const [fmt, setFmt] = useState(0)
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  // The Icons formats mean something else from the others', so moving into or
  // out of Icons starts again at the first format.
  const pick = (i) => {
    if ((i === 3) !== (piece === 3)) setFmt(0)
    setPiece(i)
    setCopied(false)
  }
  const copyText = (text) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1200)
  }
  return { piece, fmt, copied, setFmt, setCopied, pick, copyText }
}

function OnePiece({ base, font, st, uid, panelId }) {
  const { piece, fmt, copied, setFmt, setCopied, pick, copyText } = st
  const seed = BASES[base]
  const ramp = rampOf(seed)
  const file = exFileOf(piece, fmt, seed)
  const spec = FONTS[font]
  // Palette and Type scale offer CSS / Tailwind / JSON; Icons offers its own
  // three; Compressed files has nothing to choose, so it shows a line of text.
  const fmts = piece === 3 ? ICON_FORMATS : EX_FMTS.map(([label]) => label)

  return (
    <div className="sp-ex">
      <PickList
        uid={uid}
        variant="pills"
        items={PIECE_ITEMS}
        role="tab"
        label="What to export"
        active={piece}
        onSelect={pick}
        panelId={panelId}
        wrapClass="sp-ex-pieces"
        btnClass="sp-ex-piece"
      />

      <div className="sp-ex-body" id={panelId} role="tabpanel" aria-labelledby={`${uid}-pills-${piece}`} tabIndex={0}>
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
          <button type="button" className="sp-pill sp-ex-copy" onClick={() => copyText(file.text)}>
            <PhIcon name="copy" /><span aria-live="polite">{copied ? 'Copied' : 'Copy file'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

function OneCard({ index, setRef, base, font }) {
  const uid = useId()
  const st = useOnePiece()
  const panelId = `${uid}-panel`
  return (
    <Card index={index} setRef={setRef}>
      <div className="sp-stack-say">
        <h3>Whether it&apos;s just one thing.</h3>
        <p>
          Pull out the palette on its own, the type scale on its own, a folder of compressed
          assets or a custom icon kit. Each one leaves as a real file, named and ready to commit.
        </p>
        <p className="sp-stack-note">Free on every plan.</p>
        <PickList
          uid={uid}
          variant="rows"
          items={PIECE_ITEMS}
          role="tab"
          label="What to export"
          active={st.piece}
          onSelect={st.pick}
          panelId={panelId}
          wrapClass="sp-rows"
          btnClass="sp-rows-btn"
        />
      </div>
      <OnePiece base={base} font={font} st={st} uid={uid} panelId={panelId} />
    </Card>
  )
}

/* ── cards 2 and 3 · the plate ────────────────────────────────────────────── */
//
// A plate is a picture of a real export on the stage's ground, with a switch that
// picks which one. Card 2 uses it as a tab strip (Book, Brand deck, UI kit). Card 3
// is a shelf: a radio group of the example projects, each shown as its book's real
// cover, all three side by side, the chosen one in front.
//
// Card 2's loading: only the shown picture is fetched. A picture is mounted on its
// first pointerenter, focus or press of its button, and every picture is lazy. The
// shown picture changes only once the new one has decoded, so a swap never shows an
// empty plate (the old one is held until then). Both pictures stay stacked in the
// same box, so nothing below the card moves.
//
// Card 3's shelf: the three covers are always in the page (lazy, so they load once
// the card is near), so there is nothing to hold back and nothing to decode first.
// Picking a project only changes each cover's position (data-pos), and the move is
// a CSS transition on transform and opacity, so a second pick mid-move carries on
// from where each cover is and the shelf is never empty.

const PLATE_SIZES = '(min-width: 1200px) min(700px, 52vw), calc(100vw - 118px)'
const PORTRAIT_SIZES = 'calc(100vw - 72px)'
// The front cover is 300 CSS px wide on the wide shelf and 220 on a phone (spectrum.css).
const SHELF_SIZES = '(max-width: 760px) 220px, 300px'

// The line under each export's name in the rows beside the copy (1200px and up).
// The counts are the real book's and deck's, read by the generator.
const TAB_SUB = {
  'book-colour': `${HOME_EXPORTS.counts.bookPages} A4 pages`,
  'guide-palette': `${HOME_EXPORTS.counts.deckSlides} slides at 16:9`,
  'kit-colour': 'One HTML page with CSS and JSON tokens',
}

const TAB_ITEMS = HOME_EXPORTS.plates.map((p) => {
  // The accessible name has to contain the visible label ("Brand deck").
  const name = p.tabName.toLowerCase().includes(p.tab.toLowerCase()) ? p.tabName : `${p.tab}, ${p.tabName}`
  return {
    id: p.id,
    key: p.id,
    label: p.tab,
    name,
    rowName: `${name}, ${TAB_SUB[p.id]}`,
    hint: p.tabName.split(', ').pop(), // 'Pro' or 'Free'
    sub: TAB_SUB[p.id],
    alt: p.alt,
    variants: p,
  }
})

// The three example projects, each with its book cover. PROJECTS and the covers are
// in the same order (Northbeam, Halcyon, Ferrule).
const PROJECT_ITEMS = PROJECTS.map(([name, when, parts], i) => {
  const cover = HOME_EXPORTS.covers[i]
  return {
    id: cover.id,
    key: cover.id,
    label: name.split(/[\s,]/)[0],
    icon: 'folder-simple',
    name,
    rowLabel: name,
    rowName: `${name}, ${when}, ${parts}`,
    hint: when,
    sub: parts,
    alt: cover.alt,
    variants: cover,
    when,
    parts,
  }
})

function PlatePicture({ item, on, failed, imgRef, onLoad, onError }) {
  const v = item.variants
  return (
    <picture>
      <source media="(max-width: 760px)" type="image/webp" srcSet={v.portrait.srcset} sizes={PORTRAIT_SIZES} />
      <img
        ref={imgRef}
        className={on ? 'is-on' : undefined}
        src={v.landscape.src}
        srcSet={v.landscape.srcset}
        sizes={PLATE_SIZES}
        width={v.landscape.width}
        height={v.landscape.height}
        style={{ '--ar': v.landscape.aspect }}
        loading="lazy"
        decoding="async"
        alt={item.alt}
        aria-hidden={on ? undefined : true}
        hidden={failed}
        onLoad={onLoad}
        onError={onError}
      />
    </picture>
  )
}

// A cover's place on the shelf: the chosen one in front, and the other two behind it
// on either side, still in the order Northbeam, Halcyon, Ferrule.
function shelfPos(i, active, count) {
  if (i === active) return 'front'
  const rank = [...Array(count).keys()].filter((j) => j !== active).indexOf(i)
  return rank < (count - 1) / 2 ? 'left' : 'right'
}

// A back cover is also a click target for its project, with the pointer only: the rows and
// pills are the keyboard and screen-reader path, so it stays out of the tab order and the
// accessibility tree. The front cover has no handler.
function ShelfCover({ item, pos, failed, onError, onPick }) {
  const v = item.variants.portrait
  return (
    <img
      className={pos === 'front' ? 'is-on' : undefined}
      onClick={pos === 'front' ? undefined : onPick}
      tabIndex={pos === 'front' ? undefined : -1}
      data-pos={pos}
      src={v.src}
      srcSet={v.srcset}
      sizes={SHELF_SIZES}
      width={v.width}
      height={v.height}
      loading="lazy"
      decoding="async"
      alt={item.alt}
      aria-hidden={pos === 'front' ? undefined : true}
      hidden={failed}
      onError={onError}
    />
  )
}

// After a click on a back cover, focus goes to its project's radio in whichever switch is on
// screen (the rows from 1200px, the pills below; the other is display: none), so a keyboard or
// screen-reader user carries on from the project that was chosen. PickList's ids are
// `${uid}-${variant}-${i}`. A pointer click does not draw a focus ring on it.
function focusPick(uid, i) {
  const el = ['rows', 'pills']
    .map((variant) => document.getElementById(`${uid}-${variant}-${i}`))
    .find((b) => b && b.offsetParent !== null)
  if (!el) return
  el.focus({ preventScroll: true })
  // The pills scroll sideways on a phone, as PickList's own click does for them.
  if (el.className.includes('sp-pick-btn')) el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

// The shelf's state: the chosen project and any cover that failed to load.
function useShelf() {
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState(() => new Set())
  const onError = (i) => () => setFailed((prev) => new Set(prev).add(i))
  return { active, failed, select: setActive, onError }
}

function usePlate() {
  const [active, setActive] = useState(0)
  const [shown, setShown] = useState(0)
  const [mounted, setMounted] = useState(() => new Set([0]))
  const [failed, setFailed] = useState(() => new Set())
  const activeRef = useRef(0)
  const failedRef = useRef(new Set())
  const imgs = useRef([])

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
    mount(i)
    // A picture warmed by hover or focus may already have failed: it fires no
    // second error, so show its fallback now rather than keep the old picture.
    if (failedRef.current.has(i)) { setShown(i); return }
    const el = imgs.current[i]
    if (el && el.complete && el.naturalWidth > 0) reveal(i)
  }

  const onLoad = (i) => () => { if (activeRef.current === i) reveal(i) }
  const onError = (i) => () => {
    failedRef.current.add(i)
    setFailed((prev) => new Set(prev).add(i))
    if (activeRef.current === i) setShown(i)
  }

  return { active, shown, mounted, failed, imgs, mount, select, onLoad, onError }
}

function ExportPlate({ plate, items, uid, panelId, role, label, caption, lead, shelf }) {
  const tabs = role === 'tab'
  const { active, shown = active, mounted, failed, imgs, mount, select, onLoad, onError } = plate

  return (
    <div className="sp-stage">
      <div
        className="sp-plate"
        id={tabs ? panelId : undefined}
        role={tabs ? 'tabpanel' : undefined}
        aria-labelledby={tabs ? `${uid}-pills-${active}` : undefined}
        tabIndex={tabs ? 0 : undefined}
      >
        {shelf ? (
          <div className="sp-shelf">
            <span className="sp-shelf-tag" aria-hidden="true">Example projects</span>
            {items.map((item, i) => (
              <ShelfCover key={item.id} item={item} pos={shelfPos(i, active, items.length)} failed={failed.has(i)} onError={onError(i)} onPick={() => { select(i); focusPick(uid, i) }} />
            ))}
            {failed.has(active) && <p className="sp-plate-fail">{items[active].alt}</p>}
          </div>
        ) : (
          <div className="sp-plate-art">
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
        )}
        {caption(items[shown])}
      </div>

      <PickList
        uid={uid}
        variant="pills"
        items={items}
        role={role}
        label={label}
        active={active}
        onSelect={select}
        onWarm={mount}
        panelId={panelId}
        wrapClass="sp-pick"
        btnClass="sp-pick-btn"
        lead={lead}
      />
    </div>
  )
}

// The card is the same for a plate and for the shelf; only the state it reads differs.
function PlateCardView({ index, setRef, items, role, label, caption, lead, children, plate, shelf }) {
  const uid = useId()
  const panelId = `${uid}-panel`
  return (
    <Card index={index} setRef={setRef}>
      <div className="sp-stack-say">
        {children}
        <PickList
          uid={uid}
          variant="rows"
          items={items}
          role={role}
          label={label}
          active={plate.active}
          onSelect={plate.select}
          onWarm={plate.mount}
          panelId={panelId}
          wrapClass="sp-rows"
          btnClass="sp-rows-btn"
        />
      </div>
      <ExportPlate plate={plate} items={items} uid={uid} panelId={panelId} role={role} label={label} caption={caption} lead={lead} shelf={shelf} />
    </Card>
  )
}

function PlateCard(props) {
  return <PlateCardView {...props} plate={usePlate()} />
}

function ShelfCard(props) {
  return <PlateCardView {...props} plate={useShelf()} shelf />
}

/* ── the stack ────────────────────────────────────────────────────────────── */

// One line under the plate: the long form from 761px, a short one on a phone. Its left
// edge is the picture's (--ar is the picture's aspect, so the CSS can find that edge).
const exportCaption = (item) => (
  <div className="sp-plate-cap sp-plate-cap--pic" style={{ '--ar': item.variants.landscape.aspect }}>
    <span className="sp-cap-long">Real exports, made from the Cobalt palette with Schibsted Grotesk and Literata.</span>
    <span className="sp-cap-short">Real exports, Cobalt palette.</span>
  </div>
)

// One line under the shelf that follows the chosen project: "Northbeam, opened 2
// hours ago. Colour, type, icons." On a phone the project's name is on the chosen
// pill, so the short form starts at the time.
const projectCaption = (item) => {
  const opened = `${item.when.charAt(0).toLowerCase()}${item.when.slice(1)}`
  return (
    <div className="sp-plate-cap sp-plate-cap--project">
      <span className="sp-cap-long">{item.label}, {opened}. {item.parts}.</span>
      <span className="sp-cap-short">{item.when}. {item.parts}.</span>
    </div>
  )
}

const PROJECT_LEAD = <span className="sp-pick-label" aria-hidden="true">Example projects</span>

export default function SpectrumExports({ base, font }) {
  const cards = useRef([])
  useStackSync(cards)
  const setRef = (i) => (el) => { cards.current[i] = el }

  return (
    <div className="sp-stack">
      <div className="sp-stack-nest">
        <OneCard index={0} setRef={setRef(0)} base={base} font={font} />
        <div className="sp-stack-pad" aria-hidden="true" />

        <div className="sp-stack-nest">
          <PlateCard index={1} setRef={setRef(1)} items={TAB_ITEMS} role="tab" label="Export type" caption={exportCaption}>
            <h3>Or a whole design system.</h3>
            <p>
              One click turns your colour, type and spacing into a UI kit. On Pro the same system
              also leaves as a 12-page book and a 16:9 brand deck.
            </p>
            <p className="sp-stack-note">The book and the deck are Pro. The UI kit is free.</p>
          </PlateCard>
          <div className="sp-stack-pad" aria-hidden="true" />

          <div className="sp-stack-nest">
            <ShelfCard index={2} setRef={setRef(2)} items={PROJECT_ITEMS} role="radio" label="Example projects" caption={projectCaption} lead={PROJECT_LEAD}>
              <h3>You can come back to it anytime.</h3>
              {/* What is true: a project keeps its palette, fonts and icons,
                  and no version history or record of exports. Saved work is a
                  "project", never a "kit". */}
              <p>Reopen a project and it&apos;s where you left it: the palette, the fonts, the icons. Export it again whenever you need to.</p>
              <p className="sp-stack-note">
                {numberWord(FREE_SAVE_LIMITS.projects, { capital: true })} projects on Free, unlimited on Pro.
              </p>
            </ShelfCard>
            <div className="sp-stack-pad sp-stack-pad--tail" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  )
}
