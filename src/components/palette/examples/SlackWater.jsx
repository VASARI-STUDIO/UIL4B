// E1, "Slack Water": an editorial landing hero. The palette's primary is the
// harbour itself, a full-bleed field under the masthead; the land, the wharves
// and the ferry are the other slots. Content and chart geometry live in
// SlackWater.data.js.
import { memo } from 'react'
import { brandAsText, fieldEdge, inkOnField } from '../../../utils/palettePreviewRoles'
import { CHART_BOX, CONTENTS, FERRY, HERO, LAND, MAST, NEXT, ROUTE, WHARVES } from './SlackWater.data'
import './SlackWater.css'

const pct = (v, of) => `${(v / of) * 100}%`

function SlackWater({ roles }) {
  const inks = { on: roles.onPrimary, text: roles.text, canvas: roles.canvas }
  // The Contrast Checker's pair is under test, so nothing is corrected: the type
  // on the field is the background colour, and the one brand-coloured text is the
  // text colour.
  const pair = Boolean(roles.pair)
  const ink = inkOnField(roles.primary, inks, { keep: pair })
  const sec = pair ? { hex: roles.text, adjusted: false } : brandAsText(roles.secondary, [roles.canvas])
  const vars = {
    // Type set on the field: wharf labels, the caption, and the Subscribe button.
    '--sw-ink': ink.hex,
    '--sw-edge': fieldEdge(roles.primary, roles.canvas, roles.borderStrong),
    '--sw-sec': sec.hex,
  }
  return (
    <div className="sw" style={vars}>
      <header className="sw-mast" data-role="neutral">
        <span className="sw-name">{MAST.name}</span>
        <span className="sw-issue">{MAST.issue}</span>
        <nav className="sw-nav">
          {MAST.nav.map((n, i) => (
            <span key={n} className="sw-navi">
              {n}
              {i === 0 && <i className="sw-ul" data-role="secondary" />}
            </span>
          ))}
        </nav>
        <span className="sw-cta" data-role="primary">{MAST.cta}</span>
        <span className="sw-menu" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 6h14M3 10h14M3 14h14" /></svg>
        </span>
      </header>

      <section className="sw-hero">
        <div className="sw-copy" data-role="neutral">
          <h2 className="sw-head">{HERO.head} <span className="sw-tail">{HERO.tail}</span></h2>
          <p className="sw-stand">{HERO.standfirst}</p>
          <p className="sw-by">{HERO.byline.join(' · ')}</p>
        </div>

        <figure className="sw-field" data-role="primary">
          <div className="sw-chart">
            <svg viewBox={`0 0 ${CHART_BOX.w} ${CHART_BOX.h}`} aria-hidden="true">
              {LAND.map((d) => <path key={d} className="sw-land" data-role="subtle" d={d} />)}
              <g className="sw-route">
                <path className="sw-routeline" d={ROUTE} />
              </g>
              {WHARVES.map((w) => (
                <circle key={w.name} className="sw-wharf" cx={w.x} cy={w.y} r="4" data-role="deep" />
              ))}
              <g className="sw-ferry" transform={`translate(${FERRY.x} ${FERRY.y}) rotate(${FERRY.turn})`}>
                <path d="M-8 -2H8L5 4H-5Z M-3 -6H3V-2H-3Z" data-role="accent" />
              </g>
            </svg>
            {WHARVES.map((w) => (
              <span
                key={w.name}
                className={`sw-label is-${w.side}`}
                style={{ left: pct(w.x, CHART_BOX.w), top: pct(w.y, CHART_BOX.h), '--gap': `${w.gap}px` }}
              >
                {w.name}
              </span>
            ))}
          </div>
          <figcaption className="sw-cap">{HERO.caption}</figcaption>
        </figure>
      </section>

      <section className="sw-contents" data-role="neutral">
        <p className="sw-kicker">In this issue</p>
        <ol className="sw-list">
          {CONTENTS.map((c) => (
            <li key={c.page} className="sw-row">
              {c.active
                ? <span className="sw-page is-on" data-role="secondary" data-adjusted={sec.adjusted ? 'true' : undefined}>{c.page}</span>
                : <span className="sw-page">{c.page}</span>}
              <span className="sw-title">{c.title}</span>
              <span className="sw-desk">{c.desk}</span>
            </li>
          ))}
        </ol>
        <p className="sw-next">{NEXT}</p>
      </section>
    </div>
  )
}

export default memo(SlackWater)
