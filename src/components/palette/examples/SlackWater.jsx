// "Slack Water": a harbour quarterly's article page. The ferry photograph leads;
// the headline, dek and story follow on the page; a drawn map of the crossing
// sits in the story with a time slider. The palette is spent as a masthead
// spends a brand (see SlackWater.data.js for where each role lands).
//
// One state at a time: `state` is the dialog's State menu pick (Article,
// Subscribe, Subscribe with an email error). Softly interactive when the dialog
// hands it `onState`: Subscribe opens the sheet, the nav swaps the panel under
// the story, the slider moves the ferry, Save flips. Nothing submits, fetches or
// is kept after the preview closes. Without `onState` the same markup is a still picture.
import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useEscapeLayer } from '../escapeLayer.js'
import PreviewImage from '../PreviewImage.jsx'
import { PREVIEW_ASSETS } from '../../../data/previewAssets.js'
import { BODY, CROSSING, HERO, MAP, MAST, PANELS, SUBSCRIBE, clockAt, emailProblem, slackVars, whereAt } from './SlackWater.data.js'
import './SlackWater.css'

const Live = createContext(null)

// A control is a real button while the scene is live and a plain span when it is a still picture.
function Ctl({ className, children, ...rest }) {
  const live = useContext(Live)
  if (!live) return <span className={className}>{children}</span>
  return <button type="button" className={className} {...rest}>{children}</button>
}

// Where a label's top-left sits, given the place's point (px, py) in the box and the label's size.
// 'right' hangs below and after the point, clear of the coastline the Manly wharf sits on.
const LABEL_AT = {
  below: (px, py, lw) => [px - lw / 2, py + 10],
  above: (px, py, lw, lh) => [px - lw / 2, py - lh - 8],
  land: (px, py, lw, lh) => [px - lw / 2, py - lh / 2],
  right: (px, py) => [px + 12, py + 4],
}
const LABEL_EDGE = 4

function Masthead({ nav, setNav, onSubscribe }) {
  const live = useContext(Live)
  return (
    <header className="sw-mast" data-role="neutral">
      <span className="sw-name">{MAST.name}</span>
      <nav className="sw-nav" aria-label={live ? 'Slack Water' : undefined}>
        {MAST.nav.map((n) => (
          <Ctl key={n} className={n === nav ? 'sw-navi is-current' : 'sw-navi'} aria-current={n === nav ? 'page' : undefined} onClick={() => setNav(n)}>
            {n}
            {n === nav && <i className="sw-ul" data-role="secondary" />}
          </Ctl>
        ))}
      </nav>
      <span className="sw-issue">{MAST.issue}</span>
      <Ctl className="sw-cta" data-role="primary" onClick={onSubscribe}>{MAST.cta}</Ctl>
    </header>
  )
}

function Photo({ narrow }) {
  const asset = PREVIEW_ASSETS[narrow ? 'ferry-morning-portrait' : 'ferry-morning']
  return (
    <figure className="sw-photo" data-role="neutral">
      <PreviewImage asset={asset} sizes={narrow ? '100vw' : '(min-width: 1100px) 1080px, 100vw'} eager className="sw-img" />
      <figcaption className="sw-cap">{HERO.caption}</figcaption>
    </figure>
  )
}

function Lede({ saved, setSaved }) {
  return (
    <section className="sw-lede" data-role="neutral">
      <p className="sw-rubric">{HERO.rubric}</p>
      <h2 className="sw-head">{HERO.head}</h2>
      <div className="sw-aside">
        <p className="sw-dek">{HERO.dek}</p>
        <p className="sw-by">{HERO.byline} · {HERO.credit} · {HERO.length}</p>
        <Ctl className={saved ? 'sw-save is-on' : 'sw-save'} aria-pressed={saved} onClick={() => setSaved((s) => !s)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="M4 2h8v12l-4-3-4 3Z" /></svg>
          {saved ? 'Saved' : 'Save for later'}
        </Ctl>
      </div>
    </section>
  )
}

// The drawn map: neutral land and water, the crossing as the primary line, the two wharves deep, the ferry the accent.
function CrossingMap({ p }) {
  const routeRef = useRef(null)
  const [pt, setPt] = useState({ x: 300, y: 236 })
  useEffect(() => {
    const path = routeRef.current
    if (path?.getTotalLength) setPt(path.getPointAtLength(path.getTotalLength() * p))
  }, [p])
  const { w, h } = MAP.box
  const mapRef = useRef(null)
  const labelRefs = useRef([])
  const [spots, setSpots] = useState(null)
  // The drawing is cropped to cover its box, so a label (true pixel size, so it stays readable) is placed
  // from the same crop: scale and offset as `slice` works them out, then kept inside the box.
  useLayoutEffect(() => {
    const box = mapRef.current
    if (!box) return undefined
    const place = () => {
      const bw = box.clientWidth
      const bh = box.clientHeight
      if (!bw || !bh) return
      const k = Math.max(bw / w, bh / h)
      const ox = (bw - w * k) / 2
      const oy = (bh - h * k) / 2
      setSpots(MAP.places.map((pl, i) => {
        const el = labelRefs.current[i]
        const lw = el ? el.offsetWidth : 0
        const lh = el ? el.offsetHeight : 16
        const [x, y] = LABEL_AT[pl.side](ox + pl.x * k, oy + pl.y * k, lw, lh)
        return {
          left: Math.round(Math.min(Math.max(x, LABEL_EDGE), Math.max(LABEL_EDGE, bw - lw - LABEL_EDGE))),
          top: Math.round(Math.min(Math.max(y, LABEL_EDGE), Math.max(LABEL_EDGE, bh - lh - LABEL_EDGE))),
        }
      }))
    }
    place()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(place)
    ro.observe(box)
    return () => ro.disconnect()
  }, [w, h])
  return (
    <div className="sw-map" ref={mapRef} role="img" aria-label="A drawn map of the ferry's crossing from Circular Quay to Manly" data-role="neutral">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path className="sw-land" d={MAP.north} />
        <path className="sw-land" d={MAP.south} />
        {MAP.streets.map((d) => <path key={d} className="sw-street" d={d} />)}
        {MAP.islands.map((i) => <circle key={i.x} className="sw-isle" cx={i.x} cy={i.y} r="5" />)}
        <path className="sw-casing" d={MAP.route} />
        <path ref={routeRef} className="sw-line" data-role="primary" d={MAP.route} />
        {MAP.places.filter((pl) => pl.wharf).map((pl) => <circle key={pl.name} className="sw-wharf" data-role="deep" cx={pl.x} cy={pl.y} r="5" />)}
        <circle className="sw-ferry" data-role="accent" cx={pt.x} cy={pt.y} r="7" />
      </svg>
      {MAP.places.map((pl, i) => (
        <span key={pl.name} ref={(el) => { labelRefs.current[i] = el }} className="sw-pl" style={spots ? spots[i] : { visibility: 'hidden' }}>{pl.name}</span>
      ))}
    </div>
  )
}

function Crossing() {
  const live = useContext(Live)
  const [p, setP] = useState(CROSSING.rest)
  return (
    <figure className="sw-cross">
      <CrossingMap p={p} />
      <figcaption className="sw-readout" data-role="neutral">
        <span className="sw-time">{clockAt(p)}</span>
        <span>{whereAt(p)}</span>
        {live && (
          <input
            className="sw-range" type="range" min="0" max="100" value={Math.round(p * 100)}
            aria-label="Follow the 7:12 across the harbour" aria-valuetext={`${clockAt(p)}, ${whereAt(p)}`}
            style={{ '--fill': `${p * 100}%` }} data-role="primary"
            onChange={(e) => setP(Number(e.target.value) / 100)}
          />
        )}
      </figcaption>
    </figure>
  )
}

function Panel({ nav }) {
  const panel = PANELS[nav]
  return (
    <section className="sw-panel" id="sw-panel" data-role="neutral" aria-label={panel.kicker}>
      <h3 className="sw-kicker">{panel.kicker}</h3>
      <ol>
        {panel.rows.map((r) => (
          <li key={r.a} className={r.on ? 'sw-row is-on' : 'sw-row'} data-role={r.role}>
            <span className="sw-a">{r.a}</span><span className="sw-b">{r.b}</span><span className="sw-c">{r.c}</span>
          </li>
        ))}
      </ol>
      <p className="sw-note">{panel.note}</p>
    </section>
  )
}

// The Subscribe sheet hangs from the masthead; the dock keeps it in view at any scroll.
function Sheet({ view, onClose }) {
  const live = useContext(Live)
  const [email, setEmail] = useState('')
  const [tried, setTried] = useState(false)
  const [done, setDone] = useState(false)
  const field = useRef(null)
  useEffect(() => { if (live) field.current?.focus() }, [live])
  // Escape closes just the sheet; the dialog's own Escape waits for the next press.
  useEscapeLayer(Boolean(live), onClose)
  const shown = email || (view === 'error' ? SUBSCRIBE.sample : '')
  const err = (view === 'error' || tried) && emailProblem(shown)
  const submit = (e) => {
    e.preventDefault()
    if (emailProblem(shown)) setTried(true)
    else setDone(true)
  }
  return (
    <div className="sw-dock">
      <form className="sw-sheet" data-role="neutral" onSubmit={submit} noValidate>
        <h3 className="sw-sheet-h">{SUBSCRIBE.title}</h3>
        <p className="sw-sheet-lead">{SUBSCRIBE.lead}</p>
        {done ? <p className="sw-done" role="status">{SUBSCRIBE.done}</p> : (
          <div className="sw-field">
            <label htmlFor="sw-email">{SUBSCRIBE.label}</label>
            <input
              id="sw-email" ref={field} className={`sw-input is-focus${err ? ' is-error' : ''}`} type="email" autoComplete="off"
              value={shown} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(err)} aria-describedby={err ? 'sw-email-err' : undefined}
              data-role={err ? 'error' : 'primary'} readOnly={!live}
            />
            {err && <p className="sw-err" id="sw-email-err" data-role="error"><span aria-hidden="true">▲ </span>{SUBSCRIBE.error}</p>}
          </div>
        )}
        <div className="sw-sheet-foot">
          <button type="button" className="sw-btn" onClick={onClose}>{done ? 'Close' : 'Cancel'}</button>
          {!done && <button type="submit" className="sw-btn sw-btn--primary" data-role="primary">Continue</button>}
        </div>
      </form>
    </div>
  )
}

/**
 * @param {{roles: object, state?: string, onState?: (id: string) => void}} props roles:
 *   derivePaletteRoles() output; state: the State menu's pick (article, subscribe, error);
 *   onState: asks the dialog to move its State menu. Without it the scene is a still picture.
 */
function SlackWater({ roles, state, onState }) {
  const vars = useMemo(() => slackVars(roles), [roles])
  const view = state === 'subscribe' || state === 'error' ? state : 'article'
  const isLive = !roles.pair && typeof onState === 'function'
  const [nav, setNavName] = useState('Issues')
  const [saved, setSaved] = useState(false)
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 600)
  const rootRef = useRef(null)
  // The narrow layout takes the upright crop; the scene's own width decides, not the window's.
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => setNarrow(el.getBoundingClientRect().width < 600))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const setNav = (n) => {
    setNavName(n)
    rootRef.current?.querySelector('#sw-panel')?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }
  // Closing the sheet hands focus back to the masthead's Subscribe button.
  const closeSheet = useCallback(() => {
    onState?.('article')
    rootRef.current?.querySelector('.sw-cta')?.focus()
  }, [onState])
  const live = isLive ? { nav } : null
  return (
    <Live.Provider value={live}>
      <div className={isLive ? 'sw is-live' : 'sw'} style={vars} data-state={view} ref={rootRef}>
        <Masthead nav={nav} setNav={setNav} onSubscribe={() => onState(view === 'article' ? 'subscribe' : 'article')} />
        {view !== 'article' && <Sheet key={view} view={view} onClose={closeSheet} />}
        <Photo narrow={narrow} />
        <Lede saved={saved} setSaved={setSaved} />
        <article className="sw-story">
          {BODY.map((t, i) => <p key={i} className={i === 0 ? 'sw-p sw-p--first' : 'sw-p'}>{t}</p>)}
          <Crossing />
        </article>
        <Panel nav={nav} />
      </div>
    </Live.Provider>
  )
}

export default memo(SlackWater)
