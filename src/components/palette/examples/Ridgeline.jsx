// Ridgeline: a trail-run app, painted with the user's palette. The artefact is a
// contour map with the route on it (primary), the start (deep), your position
// (accent) and the ground (subtle); the summary screen carries the elevation
// profile (secondary, the steepest climb in accent) and the splits.
//
// Pure: no state, no effects. Colours arrive as --pv-* custom properties from
// the dialog; the ones this scene works out itself are set on its root.
import { useMemo } from 'react'
import {
  CONTOURS, LIVE, MAP, POSITION, PROFILE, ROUTE_DONE, ROUTE_REST, START, SUMMARY, ridgelineVars,
} from './Ridgeline.data.js'
import './Ridgeline.css'

const TAB_ICONS = [
  <path key="run" d="M5 17c3 0 4-5 7-5s4 5 7 5" />,
  <path key="routes" d="M6 19V8m0 0 4 3-4 3m12 5V5m0 0-4 3 4 3" />,
  <path key="log" d="M6 6h12M6 12h12M6 18h8" />,
  <g key="me"><circle cx="12" cy="9" r="3.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></g>,
]

function Live() {
  return (
    <section className="rl-phone rl-live">
      <div className="rl-map">
        <svg viewBox={`0 0 ${MAP.w} ${MAP.h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect className="rl-ground" data-role="subtle" x="0" y="0" width={MAP.w} height={MAP.h} />
          <path className="rl-contour" data-role="neutral" d={CONTOURS} />
          <path className="rl-case" d={ROUTE_DONE} />
          <path className="rl-case rl-case--rest" d={ROUTE_REST} />
          <path className="rl-route" data-role="primary" d={ROUTE_DONE} />
          <path className="rl-route rl-route--rest" data-role="primary" d={ROUTE_REST} />
          <circle className="rl-start" data-role="deep" cx={START[0]} cy={START[1]} r="6" />
          <circle className="rl-here" data-role="accent" cx={POSITION[0]} cy={POSITION[1]} r="7" />
        </svg>
        <span className="rl-chip" data-role="neutral">GPS strong</span>
        <span className="rl-scale" data-role="neutral">500 m</span>
      </div>
      <div className="rl-sheet" data-role="neutral">
        <h3 className="rl-place">{LIVE.place}</h3>
        <dl className="rl-figs">
          {LIVE.figures.map(([k, v, u]) => (
            <div key={k}><dt>{k}</dt><dd>{v}<small>{u}</small></dd></div>
          ))}
        </dl>
        <div className="rl-btns">
          <span className="rl-btn rl-btn--pause" data-role="secondary">Pause</span>
          <span className="rl-btn rl-btn--finish" data-role="primary">Finish</span>
        </div>
      </div>
    </section>
  )
}

function Summary({ tabAdjusted }) {
  return (
    <section className="rl-phone rl-sum">
      <div className="rl-sum-in" data-role="neutral">
        <h3 className="rl-h">{SUMMARY.title}</h3>
        <p className="rl-line">{SUMMARY.line}</p>
        <div className="rl-prof">
          <svg viewBox={`0 0 ${PROFILE.w} ${PROFILE.h}`} preserveAspectRatio="none" aria-hidden="true">
            <path className="rl-prof-area" data-role="secondary" d={PROFILE.area} />
            <path className="rl-prof-line" data-role="secondary" d={PROFILE.line} />
            <path className="rl-prof-steep" data-role="accent" d={PROFILE.steep} />
          </svg>
          <span className="rl-prof-hi" style={{ left: `${PROFILE.peakX}%`, bottom: `${100 - PROFILE.peakY}%` }}>{PROFILE.high}</span>
          <span className="rl-prof-lo">{PROFILE.low}</span>
        </div>
        <ul className="rl-splits">
          {SUMMARY.splits.map((s) => (
            <li key={s.n} className={s.fastest ? 'is-fast' : ''}>
              <span className="rl-n">{s.n}</span>
              <span className="rl-pace">{s.pace}</span>
              <span className="rl-bar"><i data-role={s.fastest ? 'success' : 'primary'} style={{ width: `${s.bar}%` }} /></span>
              {s.fastest && <span className="rl-fast" data-role="success">Fastest</span>}
            </li>
          ))}
        </ul>
      </div>
      <nav className="rl-tabs" data-role="neutral">
        {SUMMARY.tabs.map((t, i) => (
          <span key={t} className={i === 0 ? 'is-on' : ''}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-role={i === 0 ? 'primary' : undefined}>{TAB_ICONS[i]}</svg>
            <span data-role={i === 0 ? 'primary' : undefined} data-adjusted={i === 0 && tabAdjusted ? 'true' : undefined}>{t}</span>
          </span>
        ))}
      </nav>
    </section>
  )
}

/**
 * @param {{roles: object}} props roles: derivePaletteRoles() output
 */
export default function Ridgeline({ roles }) {
  const { vars, tabAdjusted } = useMemo(() => ridgelineVars(roles), [roles])
  return (
    <div className="rl" style={vars}>
      <div className="rl-pair">
        <Live />
        <Summary tabAdjusted={tabAdjusted} />
      </div>
    </div>
  )
}
