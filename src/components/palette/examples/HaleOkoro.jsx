// Hale & Okoro Architects: a practice's portfolio, painted with the user's
// palette. The artefact is an axonometric drawing of a house on a slope: the
// roofs are the primary (the studio's the secondary), the lit wall the subtle,
// the shaded wall the deep, and the glass is the one bright thing, the accent.
//
// Pure: no state, no effects. Colours arrive as --pv-* custom properties from
// the dialog; the ones this scene works out itself are set on its root.
import { useMemo } from 'react'
import { COPY, DRAWING, haleOkoroVars } from './HaleOkoro.data.js'
import './HaleOkoro.css'

// One volume's faces, painted back to front by the caller.
function Volume({ v, roof }) {
  return (
    <g>
      <path className="ho-face ho-face--lit" data-role="subtle" d={v.lit} />
      <path className="ho-face ho-face--shade" data-role="deep" d={v.shade} />
      <path className={`ho-face ho-face--${roof}`} data-role={roof} d={v.roof} />
      {v.glass && <path className="ho-face ho-face--glass" data-role="accent" d={v.glass} />}
    </g>
  )
}

function Drawing() {
  return (
    <div className="ho-draw">
      <svg viewBox={DRAWING.viewBox} aria-hidden="true">
        <path className="ho-slab" data-role="neutral" d={DRAWING.slabTop} />
        <path className="ho-hatch" data-role="neutral" d={DRAWING.hatch} />
        <path className="ho-slab ho-slab--side" data-role="neutral" d={DRAWING.slabRight} />
        <path className="ho-slab ho-slab--side" data-role="neutral" d={DRAWING.slabFront} />
        <path className="ho-slope" data-role="neutral" d={DRAWING.slope} />
        <Volume v={DRAWING.studio} roof="secondary" />
        <path className="ho-post" data-role="neutral" d={DRAWING.posts} />
        <Volume v={DRAWING.house} roof="primary" />
        <path className="ho-mullion" data-role="neutral" d={DRAWING.mullions} />
        <path className="ho-lead" data-role="neutral" d={DRAWING.leaders} />
      </svg>
      {DRAWING.callouts.map((c) => (
        <span key={c.text} className={`ho-call ho-call--${c.anchor}`} data-role="neutral" style={{ left: `${c.at[0]}%`, top: `${c.at[1]}%` }}>{c.text}</span>
      ))}
    </div>
  )
}

/**
 * @param {{roles: object}} props roles: derivePaletteRoles() output
 */
export default function HaleOkoro({ roles }) {
  const { vars, linkAdjusted } = useMemo(() => haleOkoroVars(roles), [roles])
  return (
    <div className="ho" style={vars}>
      <header className="ho-top" data-role="neutral">
        <span className="ho-studio">{COPY.studio}</span>
        <nav className="ho-nav">{COPY.nav.map((n) => <span key={n}>{n}</span>)}</nav>
        <span className="ho-mail" data-role="primary" data-adjusted={linkAdjusted ? 'true' : undefined}>{COPY.email}</span>
      </header>

      <section className="ho-hero">
        <div className="ho-words" data-role="neutral">
          <h3 className="ho-h">
            {COPY.lines.map((l, i) => <span key={l} className={`ho-line ho-line--${i + 1}`}>{l}{' '}</span>)}
          </h3>
          <p className="ho-lede">{COPY.lede}</p>
        </div>
        <Drawing />
      </section>

      <section className="ho-index" data-role="neutral">
        <div className="ho-row ho-row--head" aria-hidden="true">
          {COPY.head.map((h) => <span key={h}>{h}</span>)}
        </div>
        <ul>
          {COPY.projects.map((p, i) => (
            <li key={p[0]} className={`ho-row${i === 0 ? ' is-on' : ''}${i === 1 ? ' is-hover' : ''}`} style={{ '--i': i }}>
              {i === 0 && <i className="ho-bar" data-role="primary" />}
              <span className="ho-name">{p[0]}</span>
              <span className="ho-sub">{p[1]}</span>
              <span className="ho-year">{p[2]}</span>
              <span className="ho-type">{p[3]}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="ho-foot" data-role="neutral">{COPY.footer}</footer>
    </div>
  )
}
