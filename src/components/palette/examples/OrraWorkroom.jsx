// Orra Workroom: a product page for one overshirt, spent the way a shop spends a
// brand. The garment is the one coloured object (a recolourable render, in the
// selected colourway); the primary also paints Add to bag and the selected
// swatch's ring, the accent is the "New" text, and everything else is neutral.
//
// One state at a time: `state` is the dialog's State menu pick (overview, soldout,
// added, focus). A state carries words and a shape as well as a colour.
//
// Softly interactive when the dialog hands it `onState`: the colourways, pictures,
// sizes, Save, the disclosures and the nav are local and forgotten when the preview
// closes; Add to bag and a sold-out size move the dialog's State menu. Nothing
// navigates, fetches or saves. Without `onState`, or for a two-colour pair, the
// same markup is a still picture. Text never sits on an image.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Recolour from '../Recolour.jsx'
import { useSceneEscape } from '../escapeLayer.js'
import { PREVIEW_ASSETS } from '../../../data/previewAssets.js'
import { PRODUCT, colourways, orraVars } from './OrraWorkroom.data.js'
import './OrraWorkroom.css'

// null while the scene is a still picture.
const Live = createContext(null)

// A control is a real button while the scene is live and a plain span when it is a still picture.
function Ctl({ className, children, ...rest }) {
  const live = useContext(Live)
  if (!live) return <span className={className}>{children}</span>
  return <button type="button" className={className} {...rest}>{children}</button>
}

const svg = { viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }
const Heart = ({ on }) => <svg {...svg} fill={on ? 'currentColor' : 'none'}><path d="M8 13.5S2 10 2 5.8A3 3 0 0 1 8 4.5a3 3 0 0 1 6 1.3C14 10 8 13.5 8 13.5Z" /></svg>
const Chevron = ({ open }) => <svg {...svg} className="or-chev" data-open={open}><path d="m4 6 4 4 4-4" /></svg>
const Check = () => <svg {...svg}><circle cx="8" cy="8" r="6.25" /><path d="m5.5 8.3 1.7 1.7 3.3-3.8" /></svg>

const price = (n) => `$${n * PRODUCT.price}`
const SOLD = PRODUCT.soldOut

// Arrow keys move a radio group's choice and its focus, as a radio group does.
function arrows(e, count, current, pick) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (!step) return
  e.preventDefault()
  const next = (current + step + count) % count
  pick(next)
  e.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus()
}

// The garment cropped to a square, for a swatch or a line in the bag.
function Crop({ color, role, className = 'or-crop' }) {
  return (
    <span className={className}>
      <Recolour asset={PREVIEW_ASSETS['overshirt-front']} color={color} role={role} sizes="168px" />
    </span>
  )
}

function Header({ count }) {
  const live = useContext(Live)
  const here = live ? live.nav : PRODUCT.nav[0]
  return (
    <header className="or-head">
      <span className="or-wordmark" data-role="neutral">Orra Workroom</span>
      <nav className="or-nav" data-role="neutral" aria-label={live ? 'Orra Workroom' : undefined}>
        {PRODUCT.nav.map((n) => (
          <Ctl key={n} className={n === here ? 'or-navlink is-current' : 'or-navlink'} aria-current={n === here ? 'page' : undefined} onClick={() => live.setNav(n)}>{n}</Ctl>
        ))}
      </nav>
      <Ctl className="or-bagbtn" aria-label={`Bag, ${count} ${count === 1 ? 'item' : 'items'}`} onClick={() => live.openBag()}>
        <span>Bag</span> <b className="or-count">{count}</b>
      </Ctl>
    </header>
  )
}

function Gallery({ ways, way, pic }) {
  const live = useContext(Live)
  const cw = ways[way]
  const stripRef = live ? live.stripRef : undefined
  return (
    <section className="or-gallery" aria-label={live ? 'Pictures' : undefined}>
      <div className="or-thumbs" data-role="neutral">
        {PRODUCT.views.map((v, i) => (
          <Ctl key={v.id} className={i === pic ? 'or-thumb is-on' : 'or-thumb'} aria-label={v.name} aria-pressed={live ? i === pic : undefined} onClick={() => live.show(i)}>
            <Recolour asset={PREVIEW_ASSETS[v.asset]} color={cw.color} role={cw.role} sizes="72px" />
          </Ctl>
        ))}
      </div>
      <div className="or-stage">
        <div className="or-strip" ref={stripRef} onScroll={live ? live.onStrip : undefined}>
          {PRODUCT.views.map((v, i) => (
            <div key={v.id} className="or-slide">
              <Recolour asset={PREVIEW_ASSETS[v.asset]} color={cw.color} role={cw.role} sizes="(min-width: 960px) 600px, 100vw" eager={i === 0} className="or-shirt" />
            </div>
          ))}
        </div>
        <div className="or-dots" data-role="neutral">
          {PRODUCT.views.map((v, i) => (
            <Ctl key={v.id} className={i === pic ? 'or-dot is-on' : 'or-dot'} aria-label={`Show ${v.name.toLowerCase()}`} aria-current={i === pic ? 'true' : undefined} onClick={() => live.show(i)}><i /></Ctl>
          ))}
        </div>
      </div>
      <p className="or-cap" data-role="neutral">{PRODUCT.views[pic].name} · {cw.name}</p>
    </section>
  )
}

function Swatches({ ways, way }) {
  const live = useContext(Live)
  return (
    <div className="or-swatches" role={live ? 'radiogroup' : undefined} aria-label={live ? 'Colourway' : undefined} onKeyDown={live ? (e) => arrows(e, ways.length, way, live.setWay) : undefined}>
      {ways.map((w, i) => (
        <Ctl key={w.name} className={i === way ? 'or-sw is-on' : 'or-sw'} role="radio" aria-checked={i === way} aria-label={w.name} tabIndex={i === way ? 0 : -1} onClick={() => live.setWay(i)}>
          <Crop color={w.color} role={w.role} />
          <span className="or-sw-t" data-role="neutral">{w.name}</span>
        </Ctl>
      ))}
    </div>
  )
}

function Sizes({ sel, focused }) {
  const live = useContext(Live)
  const at = PRODUCT.sizes.indexOf(sel)
  return (
    <div className="or-sizes" data-role="neutral" role={live ? 'radiogroup' : undefined} aria-label={live ? 'Size' : undefined} onKeyDown={live ? (e) => arrows(e, PRODUCT.sizes.length, at, (i) => live.pickSize(PRODUCT.sizes[i])) : undefined}>
      {PRODUCT.sizes.map((s, i) => {
        const cls = ['or-size', s === sel && 'is-on', s === SOLD && 'is-sold', s === sel && focused && 'is-focus'].filter(Boolean).join(' ')
        return (
          <Ctl key={s} className={cls} role="radio" aria-checked={s === sel} aria-label={s === SOLD ? `${s}, sold out` : s} tabIndex={s === sel ? 0 : -1} onClick={() => live.pickSize(s)}>{s}</Ctl>
        )
      })}
    </div>
  )
}

function Disclosures() {
  const live = useContext(Live)
  return (
    <ul className="or-disc" data-role="neutral">
      {PRODUCT.disclosures.map((d) => {
        const open = Boolean(live?.open[d.id])
        return (
          <li key={d.id}>
            <Ctl className="or-disc-btn" aria-expanded={live ? open : undefined} aria-controls={`or-${d.id}`} onClick={() => live.toggle(d.id)}>
              <span>{d.label}</span><Chevron open={open} />
            </Ctl>
            <p className="or-disc-t" id={`or-${d.id}`} hidden={!open}>{d.text}</p>
          </li>
        )
      })}
    </ul>
  )
}

// The bag sheet rides in a dock stuck to the bottom of the stage, so it is in view however
// far the page is scrolled. It is a modal: the page behind it is inert.
function Sheet({ count, item, contRef }) {
  const live = useContext(Live)
  return (
    <div className="or-dock">
      <div className="or-scrim" onClick={live ? () => live.close() : undefined} />
      <div className="or-sheet" role="dialog" aria-modal="true" aria-label="Your bag" data-role="neutral">
        <h3 className="or-sheet-h">Your bag</h3>
        <p className="or-added" data-role="success"><Check /><span>Added to your bag</span></p>
        <div className="or-line">
          <Crop color={item.way.color} role={item.way.role} className="or-crop or-crop--line" />
          <div className="or-line-t">
            <b>{PRODUCT.name}</b>
            <small>{item.way.name}, size {item.size}{count > 1 ? `, quantity ${count}` : ''}</small>
          </div>
          <span className="or-line-p">{price(count)}</span>
        </div>
        <div className="or-sheet-foot">
          <Ctl className="or-btn or-btn--primary" data-role="primary" ref={contRef} onClick={() => live.close()}>Continue shopping</Ctl>
        </div>
      </div>
    </div>
  )
}

/**
 * @param {{roles: object, state?: string, onState?: (id: string) => void}} props roles:
 *   derivePaletteRoles() output; state: the State menu's pick (overview, soldout, added,
 *   focus); onState: asks the dialog to move its State menu. Without it the scene is a still picture.
 */
export default function OrraWorkroom({ roles, state, onState }) {
  const vars = useMemo(() => orraVars(roles), [roles])
  const ways = useMemo(() => colourways(roles), [roles])
  const pair = Boolean(roles.pair)
  const isLive = !pair && typeof onState === 'function'
  const view = pair || !state ? 'overview' : state

  const [way, setWay] = useState(0)
  const [pic, setPic] = useState(0)
  const [size, setSize] = useState(PRODUCT.defaultSize)
  const [count, setCount] = useState(0)
  const [bought, setBought] = useState(null)
  const [saved, setSaved] = useState(false)
  const [notified, setNotified] = useState(false)
  const [open, setOpen] = useState({})
  const [nav, setNav] = useState(PRODUCT.nav[0])
  const stripRef = useRef(null)
  const addRef = useRef(null)
  const contRef = useRef(null)
  const opener = useRef(null)
  const refocus = useRef(false)
  const askRef = useRef(onState)

  const sheetOpen = view === 'added'
  const sel = view === 'soldout' ? SOLD : size
  const sold = sel === SOLD
  const shown = Math.max(count, sheetOpen ? 1 : 0)

  useEffect(() => {
    askRef.current = onState
    if (!sheetOpen && refocus.current) {
      refocus.current = false
      ;(opener.current?.isConnected ? opener.current : addRef.current)?.focus()
    }
  }, [sheetOpen, onState])
  useEffect(() => {
    if (sheetOpen && isLive) contRef.current?.focus()
  }, [sheetOpen, isLive])

  const close = useCallback(() => {
    refocus.current = true
    askRef.current?.('overview')
  }, [])
  useSceneEscape(sheetOpen && isLive, close)

  const show = (i) => {
    setPic(i)
    const s = stripRef.current
    if (s) s.scrollTo({ left: i * s.clientWidth, behavior: 'instant' })
  }
  const onStrip = (e) => {
    const s = e.currentTarget
    if (s.clientWidth) setPic(Math.round(s.scrollLeft / s.clientWidth))
  }
  const pickSize = (s) => {
    if (s === SOLD) onState('soldout')
    else {
      setSize(s)
      if (view !== 'overview') onState('overview')
    }
  }
  const openBag = () => {
    opener.current = document.activeElement
    onState('added')
  }
  const add = () => {
    opener.current = addRef.current
    setCount((c) => c + 1)
    setBought({ way: ways[way], size })
    onState('added')
  }
  const live = isLive ? { nav, setNav, way, setWay, show, onStrip, stripRef, pickSize, open, close, openBag, toggle: (id) => setOpen((o) => ({ ...o, [id]: !o[id] })) } : null
  const item = bought || { way: ways[way], size: sel }

  return (
    <Live.Provider value={live}>
      <div className={isLive ? 'or is-live' : 'or'} style={vars} data-state={view}>
        <div className="or-page" inert={sheetOpen && isLive ? true : undefined}>
          <Header count={shown} />
          <div className="or-body">
            <p className="or-crumb" data-role="neutral">{nav} / Overshirts / <b>{PRODUCT.name}</b></p>
            <div className="or-grid">
              <Gallery ways={ways} way={way} pic={pic} />
              <section className="or-buy">
                <p className="or-new" data-role="accent">New</p>
                <h3 className="or-title" data-role="neutral">{PRODUCT.name}</h3>
                <p className="or-price" data-role="neutral">{price(1)}<span>{PRODUCT.terms}</span></p>

                <div className="or-opt">
                  <p className="or-opt-l" data-role="neutral">Colour <b>{ways[way].name}</b></p>
                  <Swatches ways={ways} way={way} />
                </div>

                <div className="or-opt">
                  <p className="or-opt-l" data-role="neutral">Size <b>{sel}</b></p>
                  <Sizes sel={sel} focused={view === 'focus'} />
                  <p className="or-note" data-role="neutral" role={isLive ? 'status' : undefined}>
                    {sold ? (notified ? `Got it. We will email you when ${SOLD} is back.` : `${SOLD} is sold out. Back in 4 weeks.`) : `Size ${sel} is ready to ship in 2 days.`}
                  </p>
                </div>

                <div className="or-ctas">
                  {sold ? (
                    <Ctl className="or-btn or-btn--ghost" data-role="secondary" aria-pressed={isLive ? notified : undefined} onClick={() => setNotified((n) => !n)}>{notified ? 'Notification set' : 'Notify me'}</Ctl>
                  ) : (
                    <Ctl className="or-btn or-btn--primary" data-role="primary" ref={addRef} aria-haspopup={isLive ? 'dialog' : undefined} aria-expanded={isLive ? sheetOpen : undefined} onClick={add}>Add to bag</Ctl>
                  )}
                  <Ctl className="or-save" data-role="neutral" aria-pressed={isLive ? saved : undefined} onClick={() => setSaved((v) => !v)}><Heart on={saved} /> {saved ? 'Saved' : 'Save'}</Ctl>
                </div>

                <ul className="or-details" data-role="neutral">
                  {PRODUCT.details.map((d) => <li key={d}>{d}</li>)}
                </ul>
                <Disclosures />
              </section>
            </div>
          </div>
        </div>
        {sheetOpen && <Sheet count={Math.max(count, 1)} item={item} contRef={contRef} />}
      </div>
    </Live.Provider>
  )
}
