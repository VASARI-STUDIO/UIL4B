// Ridgeline: a trail-run app's activity page, painted with the user's palette. The
// artefact is a real map of a Mt Coot-tha loop (OpenStreetMap, drawn as four mask
// layers the palette colours) with the route on it (primary), the start and finish
// (deep) and the steepest stretch (accent); beside it the height profile (secondary
// line over a subtle ground), the splits and the named tracks of the route.
//
// One state at a time: `state` is the dialog's State menu pick (activity, live, pr).
// Softly interactive when the dialog hands it `onState`: Record starts the live view,
// Finish returns to the activity; scrubbing the chart moves a dot along the route; a
// split or a segment lights its stretch on the map; the Splits / Segments switch,
// Pause and kudos are local. Nothing records, fetches or is kept after the preview
// closes. Without `onState`, or for a two-colour pair, the same markup is a still picture.
// Every label on the map sits on an opaque plate, never on the map itself.
import { createContext, memo, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PREVIEW_ASSETS, layerUrl } from '../../../data/previewAssets.js'
import {
  ACTIVITY, BRAND, CHART, CREDIT, LENGTH, LIVE, PEAK_AT, PR_INDEX, SEGMENTS, SPLITS, STATS, STEEPEST, MAX, MIN, readoutAt, ridgelineVars,
} from './Ridgeline.data.js'
import { KM_MARKS, LABELS, ROUTE_D, START, VIEW } from './Ridgeline.route.js'
import './Ridgeline.css'

const ASSET = PREVIEW_ASSETS['coot-tha-osm']

// The scrub steps by SCRUB_STEP metres. The route is not a whole number of steps, so the slider runs
// to the next step past the end and its last stop reads as the true end of the route.
const SCRUB_STEP = 25
const SCRUB_MAX = Math.ceil(LENGTH / SCRUB_STEP) * SCRUB_STEP

// true while the scene is live; a control is a real button then and a plain span when it is a still picture.
const Live = createContext(false)

function Ctl({ className, children, ...rest }) {
  const live = useContext(Live)
  // The role tag stays on a still picture, so the legend finds the element.
  if (!live) return <span className={className} data-role={rest['data-role']}>{children}</span>
  return <button type="button" className={className} {...rest}>{children}</button>
}

const svg = { viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }
const Heart = ({ on }) => <svg {...svg} fill={on ? 'currentColor' : 'none'}><path d="M8 13.5S2 10 2 5.8A3 3 0 0 1 8 4.5a3 3 0 0 1 6 1.3C14 10 8 13.5 8 13.5Z" /></svg>

// Where a label's top-left sits for each side of its place's point (px, py), given the label's size.
const SIDE_AT = {
  right: (px, py, lw, lh) => [px + 12, py - lh / 2],
  left: (px, py, lw, lh) => [px - 12 - lw, py - lh / 2],
  above: (px, py, lw, lh) => [px - lw / 2, py - lh - 12],
  below: (px, py, lw) => [px - lw / 2, py + 12],
  centre: (px, py, lw, lh) => [px - lw / 2, py - lh / 2],
}
// The sides tried after a label's own, in order.
const FALLBACK = ['right', 'left', 'above', 'below']
const LABEL_EDGE = 4
// Gap kept between plates, and the screen radius kept clear around the start marker and around a km tick.
const PLATE_GAP = 2
const CLEAR = { start: 13, tick: 7 }
// Plates are placed in this order, so the one that names the start gets first pick.
const PRIORITY = { start: 0, peak: 1, place: 2 }
const ANCHORS = [...LABELS, { text: 'Start and finish', x: START[0], y: START[1], side: 'right', kind: 'start' }]
const PLACE_ORDER = ANCHORS.map((a, i) => i).sort((a, b) => (PRIORITY[ANCHORS[a].kind] ?? 3) - (PRIORITY[ANCHORS[b].kind] ?? 3))

/** Whether a plate {left, top, w, h} touches the circle of radius r at (cx, cy). */
const hitsCircle = (p, cx, cy, r) => {
  const nx = Math.min(Math.max(cx, p.left), p.left + p.w)
  const ny = Math.min(Math.max(cy, p.top), p.top + p.h)
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r
}
const hitsPlate = (p, q) => p.left < q.left + q.w + PLATE_GAP && q.left < p.left + p.w + PLATE_GAP && p.top < q.top + q.h + PLATE_GAP && q.top < p.top + p.h + PLATE_GAP

/**
 * Where each plate goes: the first side (its own, then right, left, above, below) that stays inside
 * the box and clears every marker and every plate already placed; if none does, the side that
 * covers least. `sizes` holds each plate's [width, height], or null for one that is not shown.
 */
function placePlates(sizes, bw, bh, scale, ox, oy) {
  const at = (x, y) => [ox + x * scale, oy + y * scale]
  const markers = [{ c: at(START[0], START[1]), r: CLEAR.start }, ...KM_MARKS.map(([x, y]) => ({ c: at(x, y), r: CLEAR.tick }))]
  const spots = []
  const placed = []
  for (const i of PLACE_ORDER) {
    const a = ANCHORS[i]
    const size = sizes[i]
    const [px, py] = at(a.x, a.y)
    if (!size) { spots[i] = { left: Math.round(px), top: Math.round(py) }; continue }
    const [lw, lh] = size
    let best = null
    for (const side of [a.side, ...FALLBACK.filter((s) => s !== a.side)]) {
      const [x, y] = SIDE_AT[side](px, py, lw, lh)
      // Each side is judged where it would really sit: pushed back inside the box.
      const p = {
        left: Math.round(Math.min(Math.max(x, LABEL_EDGE), Math.max(LABEL_EDGE, bw - lw - LABEL_EDGE))),
        top: Math.round(Math.min(Math.max(y, LABEL_EDGE), Math.max(LABEL_EDGE, bh - lh - LABEL_EDGE))),
        w: lw,
        h: lh,
      }
      const hits = markers.filter((m) => hitsCircle(p, m.c[0], m.c[1], m.r)).length + placed.filter((q) => hitsPlate(p, q)).length
      // A side that had to be pushed scores a little worse than one that fits where it is.
      const score = hits + (Math.abs(p.left - x) > 1 || Math.abs(p.top - y) > 1 ? 0.25 : 0)
      if (!best || score < best.score) best = { p, score }
      if (score === 0) break
    }
    placed.push(best.p)
    spots[i] = { left: best.p.left, top: best.p.top }
  }
  return spots
}

/**
 * The map: four mask layers painted from the palette, the route over them in the same
 * 1200-wide coordinates, and the labels on plates. `pick` is a stretch to light up,
 * `dotAt` a distance to mark, `hereAt` the live position (the route behind it is drawn
 * solid, the rest dashed), `steep` whether the steepest stretch shows in accent.
 */
function RouteMap({ pick, dotAt, hereAt, steep }) {
  const boxRef = useRef(null)
  const routeRef = useRef(null)
  const labelRefs = useRef([])
  const [fit, setFit] = useState({ k: 0.5, spots: null })
  const [dot, setDot] = useState(null)
  const { k } = fit
  // Layers and overlay are both cropped to cover the box, so a label (true pixel size, so it stays
  // readable) is placed from the same crop: scale and offset as `slice` works them out.
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return undefined
    const place = () => {
      const bw = box.clientWidth
      const bh = box.clientHeight
      if (!bw || !bh) return
      const scale = Math.max(bw / VIEW.w, bh / VIEW.h)
      const ox = (bw - VIEW.w * scale) / 2
      const oy = (bh - VIEW.h * scale) / 2
      // A plate the narrow layout hides is skipped, so it neither takes a place nor blocks one.
      const sizes = ANCHORS.map((_, i) => {
        const el = labelRefs.current[i]
        return el && el.offsetParent ? [el.offsetWidth, el.offsetHeight] : null
      })
      const spots = placePlates(sizes, bw, bh, scale, ox, oy)
      setFit((prev) => (prev.k === scale && prev.spots && prev.spots.every((s, i) => s.left === spots[i].left && s.top === spots[i].top) ? prev : { k: scale, spots }))
    }
    place()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(place)
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  const markAt = dotAt ?? hereAt
  useEffect(() => {
    const path = routeRef.current
    if (markAt == null || !path?.getTotalLength) return
    setDot(path.getPointAtLength((path.getTotalLength() * markAt) / LENGTH))
  }, [markAt])

  // Stroke widths are screen pixels, so they are divided by the crop's scale; a dash is measured in
  // metres along the route (pathLength), so its pixels go through the metres a pixel stands for.
  const px = (n) => n / k
  const dash = (n) => (n * VIEW.metresPerUnit) / k
  // One stretch of the route, from metre a to metre b, as a dash pattern.
  const only = (a, b) => `0 ${a} ${b - a} ${LENGTH * 2}`
  const route = { d: ROUTE_D, pathLength: LENGTH, fill: 'none', strokeLinejoin: 'round' }

  return (
    <div className="rl-map" ref={boxRef} role="img" aria-label="A map of the 9.6 km Mt Coot-tha loop: the route, its start and finish, and its steepest stretch" data-role="neutral">
      {ASSET.vector.layers.map((layer) => (
        <div key={layer} className={`rl-layer rl-layer--${layer}`} style={{ '--src': `url("${layerUrl(ASSET, layer)}")` }} />
      ))}
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {pick && <path {...route} className="rl-halo" data-role="neutral" strokeWidth={px(11)} strokeDasharray={only(pick.from, pick.to)} />}
        <path {...route} ref={routeRef} className="rl-case" strokeWidth={px(7)} strokeLinecap="round" />
        {hereAt != null ? (
          <>
            <path {...route} className="rl-rest" data-role="neutral" strokeWidth={px(3)} strokeDasharray={`${dash(9)} ${dash(8)}`} />
            <path {...route} className="rl-route" data-role="primary" strokeWidth={px(4)} strokeDasharray={`${hereAt} ${LENGTH * 2}`} />
          </>
        ) : (
          <path {...route} className="rl-route" data-role="primary" strokeWidth={px(4)} strokeLinecap="round" />
        )}
        {steep && (
          <>
            <path {...route} className="rl-case" strokeWidth={px(9)} strokeDasharray={only(STEEPEST.from, STEEPEST.to)} />
            <path {...route} className="rl-steep" data-role="accent" strokeWidth={px(6)} strokeDasharray={only(STEEPEST.from, STEEPEST.to)} />
          </>
        )}
        {KM_MARKS.map(([x, y]) => <circle key={`${x}-${y}`} className="rl-tick" data-role="neutral" cx={x} cy={y} r={px(3.5)} strokeWidth={px(1.5)} />)}
        <circle className="rl-start" data-role="deep" cx={START[0]} cy={START[1]} r={px(9)} strokeWidth={px(3.5)} />
        <circle className="rl-finish" data-role="deep" cx={START[0]} cy={START[1]} r={px(4.5)} />
        {markAt != null && dot && <circle className={hereAt != null ? 'rl-dot rl-dot--here' : 'rl-dot'} data-role={hereAt != null ? 'accent' : 'neutral'} cx={dot.x} cy={dot.y} r={px(7)} strokeWidth={px(2.5)} />}
      </svg>
      {ANCHORS.map((a, i) => (
        <span key={a.text} ref={(el) => { labelRefs.current[i] = el }} className="rl-pl" data-kind={a.kind} style={fit.spots ? fit.spots[i] : { visibility: 'hidden' }}>{a.text}</span>
      ))}
    </div>
  )
}

function Credit() {
  const live = useContext(Live)
  return (
    <p className="rl-credit">
      <a href={CREDIT.mapUrl} target="_blank" rel="noopener noreferrer" tabIndex={live ? undefined : -1}>{CREDIT.map}</a>
      <span>{CREDIT.elevation}</span>
    </p>
  )
}

function Header({ onRecord }) {
  return (
    <header className="rl-head">
      <span className="rl-wordmark" data-role="neutral">{BRAND.name}</span>
      <nav className="rl-nav" aria-label={BRAND.name} data-role="neutral">
        {BRAND.nav.map((n, i) => <span key={n} className="rl-navi" aria-current={i === 0 ? 'page' : undefined}>{n}</span>)}
      </nav>
      <Ctl className="rl-btn rl-btn--primary rl-record" data-role="primary" onClick={onRecord}>
        <svg {...svg} fill="currentColor" stroke="none"><circle cx="8" cy="8" r="4.5" /></svg>
        {BRAND.record}
      </Ctl>
    </header>
  )
}

function Title({ kudos, setKudos }) {
  return (
    <div className="rl-title">
      <span className="rl-avatar" data-role="subtle" aria-hidden="true">{BRAND.initials}</span>
      <div className="rl-title-t">
        <h2 className="rl-h">{ACTIVITY.title}</h2>
        <p className="rl-when">{ACTIVITY.when} · {ACTIVITY.place}</p>
      </div>
      <Ctl className={kudos ? 'rl-kudos is-on' : 'rl-kudos'} aria-pressed={kudos} onClick={() => setKudos((v) => !v)}>
        <Heart on={kudos} />
        <span>Kudos {ACTIVITY.kudos + (kudos ? 1 : 0)}</span>
      </Ctl>
    </div>
  )
}

function Stats() {
  return (
    <dl className="rl-stats">
      {STATS.map((s) => (
        <div key={s.label}>
          <dt>{s.label}</dt>
          <dd>{s.value}{s.unit && <small>{s.unit}</small>}</dd>
        </div>
      ))}
    </dl>
  )
}

function Elevation({ at, setAt }) {
  const live = useContext(Live)
  const read = readoutAt(at)
  const cur = CHART.at(at)
  return (
    <figure className="rl-elev">
      <figcaption className="rl-read">
        <span className="rl-read-km">{read.km} km</span>
        <span>{read.height}</span>
        <span>{read.grade}</span>
      </figcaption>
      <div className="rl-chart" data-role="neutral">
        <svg viewBox={`0 0 ${CHART.w} ${CHART.h}`} preserveAspectRatio="none" aria-hidden="true">
          <path className="rl-area" data-role="subtle" d={CHART.area} />
          <path className="rl-line" data-role="secondary" d={CHART.line} />
          <path className="rl-line-case" d={CHART.steep} />
          <path className="rl-line-steep" data-role="accent" d={CHART.steep} />
        </svg>
        <i className="rl-cursor" style={{ left: cur.left }} />
        <i className="rl-pin" style={cur} />
        <span className="rl-tag" style={{ ...CHART.max, '--tx': '-50%', '--ty': 'calc(-100% - 8px)' }}>{MAX} m max</span>
        <span className="rl-tag" style={{ ...CHART.min, '--tx': '-20%', '--ty': '8px' }}>{MIN} m min</span>
        <span className="rl-tag rl-tag--steep" style={{ ...CHART.steepTag, '--tx': 'calc(-100% - 12px)', '--ty': '-50%' }}>{STEEPEST.label}</span>
        {live && (
          <input
            className="rl-range" type="range" min="0" max={SCRUB_MAX} step={SCRUB_STEP} value={Math.min(Math.round(at / SCRUB_STEP) * SCRUB_STEP, SCRUB_MAX)}
            aria-label="Scrub along the route" aria-valuetext={`${read.km} km, ${read.height}, ${read.grade}`}
            onChange={(e) => setAt(Math.min(Number(e.target.value), LENGTH))}
          />
        )}
      </div>
      <div className="rl-axis" aria-hidden="true">
        {CHART.axis.map((t, i) => <span key={t} style={{ left: CHART.axisAt[i] }} data-edge={i === 0 ? 'start' : i === CHART.axis.length - 1 ? 'end' : undefined}>{t}</span>)}
      </div>
    </figure>
  )
}

function Switch({ tab, setTab }) {
  const live = useContext(Live)
  return (
    <div className="rl-switch" role={live ? 'group' : undefined} aria-label={live ? 'Show' : undefined}>
      {['splits', 'segments'].map((t) => (
        <Ctl key={t} className={t === tab ? 'rl-sw is-on' : 'rl-sw'} aria-pressed={t === tab} onClick={() => setTab(t)}>
          {t === 'splits' ? 'Splits' : 'Segments'}
          {t === tab && <i className="rl-sw-ul" data-role="secondary" />}
        </Ctl>
      ))}
    </div>
  )
}

function Splits({ picked, onPick }) {
  return (
    <ul className="rl-rows" aria-label="Splits">
      <li className="rl-rowhead" aria-hidden="true"><span>Km</span><span>Pace</span><span /><span>Elev</span></li>
      {SPLITS.map((s, i) => (
        <li key={s.n}>
          <Ctl className={picked === i ? 'rl-row is-picked' : 'rl-row'} aria-pressed={picked === i} onClick={() => onPick(i)}>
            <span className="rl-n">{s.n}</span>
            <span className="rl-pace">{s.pace}<small>/km</small></span>
            <span className="rl-barcell">
              <span className="rl-bar"><i data-role={s.fastest ? 'success' : 'primary'} style={{ width: `${s.bar}%` }} /></span>
              {s.fastest && <span className="rl-fast" data-role="success"><span aria-hidden="true">▲ </span>Fastest</span>}
            </span>
            <span className="rl-el">{s.elev}</span>
          </Ctl>
        </li>
      ))}
    </ul>
  )
}

function Segments({ picked, onPick, showPr }) {
  return (
    <ul className="rl-rows" aria-label="Segments">
      {SEGMENTS.map((s, i) => (
        <li key={s.name}>
          <Ctl className={picked === i ? 'rl-row rl-row--seg is-picked' : 'rl-row rl-row--seg'} aria-pressed={picked === i} onClick={() => onPick(i)}>
            <span className="rl-seg">
              <span className="rl-seg-n">{s.name}</span>
              <span className="rl-seg-m">{s.length} · {s.gain}{showPr && s.pr && picked === i ? ` · ${s.prNote}` : ''}</span>
            </span>
            {showPr && s.pr && <span className="rl-pr" data-role="accent">PR</span>}
            <span className="rl-seg-t">{s.time}</span>
          </Ctl>
        </li>
      ))}
    </ul>
  )
}

function Recording({ paused, setPaused, onFinish }) {
  return (
    <section className="rl-phone" aria-label="Recording">
      <div className="rl-status">
        <span className="rl-gps" data-role="neutral">GPS strong</span>
        <span className="rl-state">{paused ? 'Paused' : 'Recording'}</span>
      </div>
      <RouteMap hereAt={LIVE.at} steep />
      <dl className="rl-livefigs">
        {LIVE.figures.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}{f.unit && <small>{f.unit}</small>}</dd>
          </div>
        ))}
      </dl>
      <div className="rl-btns">
        <Ctl className="rl-btn rl-btn--secondary rl-pause" data-role="secondary" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? 'Resume' : 'Pause'}</Ctl>
        <Ctl className="rl-btn rl-btn--primary rl-finishbtn" data-role="primary" onClick={onFinish}>Finish</Ctl>
      </div>
      <Credit />
    </section>
  )
}

/**
 * @param {{roles: object, state?: string, onState?: (id: string) => void}} props roles:
 *   derivePaletteRoles() output; state: the State menu's pick (activity, live, pr);
 *   onState: asks the dialog to move its State menu. Without it the scene is a still picture.
 */
function Ridgeline({ roles, state, onState }) {
  const vars = useMemo(() => ridgelineVars(roles), [roles])
  const view = state === 'live' || state === 'pr' ? state : 'activity'
  const isLive = !roles.pair && typeof onState === 'function'
  const [at, setAt] = useState(PEAK_AT)
  const [kudos, setKudos] = useState(false)
  const [paused, setPaused] = useState(false)
  // What the user picked belongs to the state it was picked in: a new state starts from its own defaults
  // (Segment PR opens on Segments with the record stretch picked), so nothing is reset by an effect.
  const [tabPick, setTabPick] = useState({ view: null, tab: null })
  const [rowPick, setRowPick] = useState({ view: null, tab: null, i: null })
  const rootRef = useRef(null)
  const focusNext = useRef(null)

  const tab = tabPick.view === view && tabPick.tab ? tabPick.tab : view === 'pr' ? 'segments' : 'splits'
  const chosen = rowPick.view === view ? rowPick : { tab: view === 'pr' ? 'segments' : null, i: view === 'pr' ? PR_INDEX : null }
  const picked = chosen.tab === tab ? chosen.i : null
  const stretch = picked == null ? null : (tab === 'splits' ? SPLITS : SEGMENTS)[picked]
  const onPick = (i) => setRowPick({ view, tab, i: picked === i ? null : i })

  // Record and Finish swap the whole view, so focus follows to the control that now stands in for the one pressed.
  useEffect(() => {
    if (!focusNext.current) return
    rootRef.current?.querySelector(focusNext.current)?.focus()
    focusNext.current = null
  }, [view])
  const record = () => { focusNext.current = '.rl-pause'; setPaused(false); onState('live') }
  const finish = () => { focusNext.current = '.rl-record'; onState('activity') }

  return (
    <Live.Provider value={isLive}>
      <div className={isLive ? 'rl is-live' : 'rl'} style={vars} data-state={view} ref={rootRef}>
        {view === 'live' ? (
          <Recording paused={paused} setPaused={setPaused} onFinish={finish} />
        ) : (
          <>
            <Header onRecord={record} />
            <div className="rl-body">
              <section className="rl-mapcol" aria-label="Route">
                <RouteMap pick={stretch} dotAt={at} steep />
                <Credit />
              </section>
              <section className="rl-panel" aria-label="Activity">
                <Title kudos={kudos} setKudos={setKudos} />
                <Stats />
                <Elevation at={at} setAt={setAt} />
                <Switch tab={tab} setTab={(t) => setTabPick({ view, tab: t })} />
                {tab === 'splits' ? <Splits picked={picked} onPick={onPick} /> : <Segments picked={picked} onPick={onPick} showPr={view === 'pr'} />}
              </section>
            </div>
          </>
        )}
      </div>
    </Live.Provider>
  )
}

export default memo(Ridgeline)
