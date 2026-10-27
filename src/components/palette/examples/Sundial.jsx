// Sundial: a home battery and solar dashboard, painted with the user's palette.
//
// The artefact is the day's energy curve: solar in the primary, the battery in
// the secondary, grid import in the deep, with "now" in the accent. All other
// chrome is neutral, and the four semantic colours appear only where the
// product has a real state (the credit and three alerts), each with a word and
// a shape. Every figure is derived in Sundial.data.js from one hourly array.
//
// Pure: no state, no effects. Colours arrive as --pv-* custom properties from
// the dialog; the two this scene works out itself are set on its root.
import { useId, useMemo } from 'react'
import { CHART, FIGURES, BATTERY_KWH, FEED_IN_CENTS, sundialVars } from './Sundial.data.js'
import './Sundial.css'

const Icon = ({ children }) => (
  <svg className="sd-ico" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

function Segmented({ className }) {
  return (
    <span className={`sd-seg ${className}`} data-role="neutral">
      <span className="is-on">Day</span><span>Week</span><span>Month</span>
    </span>
  )
}

function Chart() {
  const uid = useId().replace(/:/g, '')
  const past = `sd-past-${uid}`
  const next = `sd-next-${uid}`
  const { W, H, nowX } = CHART
  return (
    <figure className="sd-chart">
      <div className="sd-yaxis" aria-hidden="true">
        {CHART.kw.map((k) => <span key={k}>{k}</span>)}
      </div>
      <div className="sd-plot">
        {CHART.kw.map((k) => <i key={k} className="sd-grid-l" data-role="neutral" style={{ top: `${100 - (k / 6) * 100}%` }} />)}
        <svg className="sd-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <clipPath id={past}><rect x="0" y="0" width={nowX} height={H} /></clipPath>
            <clipPath id={next}><rect x={nowX} y="0" width={W - nowX} height={H} /></clipPath>
          </defs>
          {/* Forecast after now: the same areas, faint, with a dashed top. */}
          <g className="sd-forecast" clipPath={`url(#${next})`}>
            {CHART.areas.map((a) => <path key={a.id} className={`sd-area sd-area--${a.id}`} d={a.d} data-role={a.role} />)}
            {CHART.areas.map((a) => <path key={a.id} className={`sd-edge sd-edge--${a.id}`} d={a.edge} data-role={a.role} />)}
          </g>
          <g className="sd-actual" clipPath={`url(#${past})`}>
            {CHART.areas.map((a) => <path key={a.id} className={`sd-area sd-area--${a.id}`} d={a.d} data-role={a.role} />)}
            {/* 2px seams in the surface colour keep neighbouring series apart. */}
            {CHART.areas.map((a) => <path key={a.id} className="sd-seam" d={a.edge} />)}
          </g>
        </svg>
        {CHART.labels.map((l) => (
          <span key={l.name} className={l.beforeNow ? 'sd-tag sd-tag--before-now' : 'sd-tag'} style={{ left: `${l.left}%`, top: `${l.top}%` }}>
            <i data-role={l.role} />{l.name}
          </span>
        ))}
        <span className="sd-now" style={{ left: `${CHART.nowPct}%` }}>
          <i className="sd-now-line" data-role="accent" />
          <i className="sd-now-dot" data-role="accent" />
          <b className="sd-now-t" data-role="accent">Now {FIGURES.now}</b>
        </span>
      </div>
      <div className="sd-xaxis" aria-hidden="true">
        {CHART.ticks.map((t) => (
          <span key={t} className={t % 6 === 0 ? 'is-6' : ''} style={{ left: `${(t / 24) * 100}%` }}>
            {String(t).padStart(2, '0')}:00
          </span>
        ))}
      </div>
      <figcaption className="sd-cap">kW · Forecast after now, shown faint</figcaption>
    </figure>
  )
}

function Ring() {
  const pct = FIGURES.socPct
  return (
    <section className="sd-panel sd-battery" data-role="neutral">
      <p className="sd-label">Battery</p>
      <div className="sd-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="sd-ring-track" cx="60" cy="60" r="52" />
          <circle
            className="sd-ring-arc" cx="60" cy="60" r="52" pathLength="100"
            data-role="accent" style={{ strokeDasharray: `${pct} 100` }}
          />
        </svg>
        <p className="sd-ring-v">{pct}<small>%</small></p>
      </div>
      <p className="sd-meta">
        {FIGURES.socKwh} of {BATTERY_KWH} kWh
        {FIGURES.fullBy ? ` · full by ${FIGURES.fullBy}` : ' · charging'}
      </p>
    </section>
  )
}

function Alerts() {
  return (
    <section className="sd-panel sd-alerts" data-role="neutral">
      <p className="sd-label">Alerts</p>
      <ul className="sd-alist">
        <li className="sd-alert" data-tone="warning" data-role="warning">
          <Icon><path d="M8 2.5 14 13H2z" /><path d="M8 7v2.5" /><path d="M8 11.2v.1" /></Icon>
          <span><b>Peak rate from 15:00.</b> The battery will cover the evening.</span>
        </li>
        <li className="sd-alert" data-tone="error" data-role="error">
          <Icon><circle cx="8" cy="8" r="6" /><path d="m6 6 4 4" /><path d="m10 6-4 4" /></Icon>
          <span><b>Inverter 2 offline since 06:12.</b> <u>See steps</u></span>
        </li>
        <li className="sd-alert" data-tone="info" data-role="info">
          <Icon><circle cx="8" cy="8" r="6" /><path d="M8 7.5V11" /><path d="M8 5v.1" /></Icon>
          <span><b>Firmware 3.2 is ready</b> to install.</span>
        </li>
      </ul>
    </section>
  )
}

function Table() {
  return (
    <section className="sd-panel sd-table" data-role="neutral">
      <header className="sd-thead">
        <h3 className="sd-h">{"Where today's energy came from"}</h3>
        <p className="sd-meta">To {FIGURES.now} · against the same time yesterday</p>
      </header>
      <div className="sd-row sd-row--head">
        <span>Source</span><span className="sd-num">kWh</span><span className="sd-share">Share</span><span className="sd-num sd-chg">Change</span>
      </div>
      {FIGURES.sources.map((s) => (
        <div key={s.id} className="sd-row">
          <span className="sd-src"><i className="sd-key" data-role={s.role} />{s.name}</span>
          <span className="sd-num">{s.kwh}</span>
          <span className="sd-share">
            <span className="sd-bar" data-role="subtle"><i data-role={s.role} style={{ width: `${s.share}%` }} /></span>
            <span className="sd-pct">{s.share}%</span>
          </span>
          <span className="sd-num sd-chg">{s.delta > 0 ? '+' : s.delta < 0 ? '−' : ''}{Math.abs(s.delta)}%</span>
        </div>
      ))}
      <div className="sd-row sd-row--total">
        <span>Total</span><span className="sd-num">{FIGURES.total}</span><span className="sd-share" /><span className="sd-chg" />
      </div>
    </section>
  )
}

/**
 * @param {{roles: object, labels?: string[]}} props roles: derivePaletteRoles()
 */
export default function Sundial({ roles }) {
  const { vars, nowAdjusted } = useMemo(() => sundialVars(roles), [roles])
  return (
    <div className="sd" style={vars} data-now-adjusted={nowAdjusted ? 'true' : undefined}>
      <header className="sd-top" data-role="neutral">
        <span className="sd-brand">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="4" fill="currentColor" /><path d="M10 1.5v2.5M10 16v2.5M1.5 10H4M16 10h2.5M4 4l1.8 1.8M14.2 14.2 16 16M4 16l1.8-1.8M14.2 5.8 16 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Sundial
        </span>
        <span className="sd-site">Home · Castlemaine VIC</span>
        <span className="sd-day">Today</span>
        <Segmented className="sd-seg--top" />
        <span className="sd-sample">Sample data</span>
      </header>

      <div className="sd-grid">
        <section className="sd-lead" data-role="neutral">
          <p className="sd-label">Exported to the grid today</p>
          <p className="sd-fig">{FIGURES.exported}<small> kWh</small></p>
          <p className="sd-credit" data-role="success">
            <Icon><path d="M8 3.5 13 12H3z" fill="currentColor" /></Icon>
            ${FIGURES.credit} credit at {FEED_IN_CENTS}c/kWh
          </p>
          <Segmented className="sd-seg--lead" />
          <Chart />
        </section>

        <div className="sd-side">
          <Ring />
          <Alerts />
        </div>

        <Table />
      </div>
    </div>
  )
}
