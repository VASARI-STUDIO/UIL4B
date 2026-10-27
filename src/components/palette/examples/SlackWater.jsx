// E1, "Slack Water": an editorial landing hero. The palette's primary is the
// harbour itself, a full-bleed field under the masthead; the land, the wharves
// and the ferry are the other slots. Content lives in SlackWater.data.js.
import { memo } from 'react'
import { brandAsText, fieldEdge, inkOnField } from '../../../utils/palettePreviewRoles'
import { CONTENTS, FERRY, HERO, MAST, NEXT, WHARVES } from './SlackWater.data'
import './SlackWater.css'

const pct = (v, of) => `${(v / of) * 100}%`

function SlackWater({ roles }) {
  const ink = inkOnField(roles.primary, { on: roles.onPrimary, text: roles.text, canvas: roles.canvas })
  const sec = brandAsText(roles.secondary, [roles.canvas])
  const vars = {
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
              {i === MAST.nav.length - 1 && <i className="sw-ul" data-role="secondary" />}
            </span>
          ))}
        </nav>
        <span className="sw-cta" data-role="primary">{MAST.cta}</span>
      </header>

      <section className="sw-hero">
        <div className="sw-copy" data-role="neutral">
          <h2 className="sw-head">{HERO.head} <span className="sw-tail">{HERO.tail}</span></h2>
          <p className="sw-stand">{HERO.standfirst}</p>
          <p className="sw-by">{HERO.byline.join(' · ')}</p>
        </div>

        <figure className="sw-field">
          <div className="sw-chart">
            <svg viewBox="0 0 480 360" aria-hidden="true">
              <rect className="sw-water" width="480" height="360" data-role="primary" />
              <path className="sw-land" data-role="subtle" d="M0 0H480V118C462 126 448 112 430 116C404 122 384 150 352 146C326 142 310 104 278 102C250 100 236 132 208 130C182 128 172 108 140 110C108 112 96 136 66 134C40 132 20 118 0 122Z" />
              <path className="sw-land" data-role="subtle" d="M0 360V254C30 248 52 266 82 262C120 256 132 232 172 238C212 244 222 276 262 270C300 264 316 238 352 244C368 246 376 238 384 222C392 202 402 194 412 198C424 204 426 238 440 262C452 270 468 256 480 252V360Z" />
              <g className="sw-route">
                <path className="sw-routeline" d="M40 244C120 214 200 200 260 188S380 150 452 130" />
              </g>
              {WHARVES.map((w) => (
                <circle key={w.name} className="sw-wharf" cx={w.x} cy={w.y} r="4" data-role="deep" />
              ))}
              <g className="sw-ferry" transform={`translate(${FERRY.x} ${FERRY.y}) rotate(-14)`}>
                <path d="M-8 -2H8L5 4H-5Z M-3 -6H3V-2H-3Z" data-role="accent" />
              </g>
            </svg>
            {WHARVES.map((w) => (
              <span
                key={w.name}
                className={`sw-label is-${w.side}${w.narrow ? ' is-keep' : ''}`}
                style={{ left: pct(w.x, 480), top: pct(w.y, 360) }}
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
