// Sales report: a kiosk's weekly report, painted with the user's palette.
//
// The artefact is the stacked bar chart: the five brand colours are the five
// categories. A colour too close to the page to read by colour alone gets an
// outline and its contrast ratio next to its name. The chart is a picture with
// a text alternative; the table under it has every figure. Everything comes
// from SalesReport.data.js, so the bars, the table and the label agree.
//
// Pure: no state, no effects. Colours arrive as --pv-* custom properties from
// the dialog.
import { useMemo } from 'react'
import { COPY, DAYS, GRID, TICKS, dollars, reportFor } from './SalesReport.data.js'
import './SalesReport.css'

const swatch = (c) => `rp-c${c.i}${c.fail ? ' is-edge' : ''}`

/** @param {{roles: object}} props roles: derivePaletteRoles() output */
export default function SalesReport({ roles }) {
  const rep = useMemo(() => reportFor(roles), [roles])
  return (
    <div className="rp">
      <header className="rp-top">
        <span className="rp-wk" data-role="neutral">{COPY.week}</span>
        <span className="rp-co" data-role="neutral">{COPY.company}</span>
      </header>
      <div className="rp-in">
        <div className="rp-hero">
          <p className="rp-fig" data-role="neutral">{rep.headline}</p>
          <p className="rp-up" data-role="success">{rep.up}</p>
        </div>
        <div className="rp-chart" role="img" aria-label={rep.chartLabel}>
          <div className="rp-axis" aria-hidden="true">
            {TICKS.map((t) => <span key={t.text} className="rp-tk" style={{ bottom: `${t.y}px` }} data-role="neutral">{t.text}</span>)}
          </div>
          <div className="rp-cols" aria-hidden="true">
            <div className="rp-lines">{GRID.map((y) => <i key={y} style={{ bottom: `${y}px` }} />)}</div>
            {rep.days.map((d) => (
              <div key={d.name} className="rp-day">
                <span className="rp-tot" data-role="neutral">{dollars(d.total)}</span>
                <div className="rp-stack">
                  {d.segs.map((s) => <i key={s.i} className={`rp-seg ${swatch(s)}`} style={{ height: `${s.h.toFixed(1)}px` }} data-role={s.role} />)}
                </div>
              </div>
            ))}
            {rep.labels.map((l) => (
              <span key={l.name} className="rp-lab" style={{ bottom: `${l.y.toFixed(1)}px` }}>
                <i className={`rp-dot ${swatch(l)}`} data-role={l.role} />
                <span data-role="neutral">{l.name}</span>
                {l.fail && <span className="rp-fr" data-role="neutral">{l.ratio}</span>}
              </span>
            ))}
          </div>
          <div className="rp-dn" aria-hidden="true">{DAYS.map((d) => <span key={d} data-role="neutral">{d}</span>)}</div>
        </div>
        <div className="rp-tb" role="table" aria-label={COPY.tableLabel}>
          <div className="rp-r rp-rh" role="row">
            {COPY.columns.map((c) => <span key={c} role="columnheader" data-role="neutral">{c}</span>)}
          </div>
          {rep.rows.map((r) => (
            <div key={r.name} className="rp-r" role="row">
              <span className="rp-nm" role="cell">
                <i className={`rp-sw ${swatch(r)}`} data-role={r.role} />
                <span data-role="neutral">{r.name}</span>
                {r.fail && <span className="rp-trr" data-role="neutral">{r.ratio}</span>}
              </span>
              <span role="cell" data-role="neutral">{r.sales}</span>
              <span role="cell" data-role="neutral">{r.share}</span>
              <span role="cell" data-role="neutral">{r.delta}</span>
            </div>
          ))}
          <div className="rp-r rp-rt" role="row">
            <span role="cell" data-role="neutral">{COPY.total}</span>
            <span role="cell" data-role="neutral">{rep.totals.sales}</span>
            <span role="cell" data-role="neutral">{rep.totals.share}</span>
            <span role="cell" data-role="neutral">{rep.totals.delta}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
