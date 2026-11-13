// Order email: a dispatch email, painted with the user's palette.
//
// The artefact is the email's own column: a masthead in the deep, an order
// table with a subtle header and a four-step delivery track. It is a still
// picture; the button and links do nothing. Every line and the total come from
// OrderEmail.data.js, so the table adds up to what it prints.
//
// Pure: no state, no effects. Colours arrive as --pv-* custom properties from
// the dialog; the inks this scene works out are set on its root.
import { useMemo } from 'react'
import { COPY, LINES, STEPS, TOTAL, money } from './OrderEmail.data.js'
import { fieldInks } from './fieldInks.js'
import './OrderEmail.css'

const Tick = () => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 6.2l2.2 2.2 4.8-5" />
  </svg>
)

/** @param {{roles: object}} props roles: derivePaletteRoles() output */
export default function OrderEmail({ roles }) {
  const { vars, linkAdjusted } = useMemo(() => fieldInks(roles), [roles])
  const adjusted = linkAdjusted ? 'true' : undefined
  return (
    <div className="em" style={vars}>
      <p className="em-pre" data-role="neutral">{COPY.preheader}</p>
      <div className="em-col">
        <div className="em-mast" data-role="deep">{COPY.brand}</div>
        <i className="em-rule" data-role="secondary" />
        <div className="em-in">
          <h3 className="em-h" data-role="neutral">{COPY.heading}</h3>
          <p className="em-ord">
            <span className="em-lnk" data-role="secondary" data-adjusted={adjusted}>{COPY.order}</span>
            <span data-role="neutral">{COPY.count}</span>
          </p>
          <div className="em-tb" role="table" aria-label={COPY.tableLabel}>
            <div className="em-tr em-th" role="row" data-role="subtle">
              {COPY.columns.map((c) => <span key={c} role="columnheader">{c}</span>)}
            </div>
            {LINES.map((l) => (
              <div key={l.item} className="em-tr" role="row" data-role="neutral">
                <span role="cell">{l.item}</span><span role="cell">{l.length}</span><span role="cell">{l.qty}</span><span role="cell">{money(l.price)}</span>
              </div>
            ))}
            <div className="em-tr em-tot" role="row" data-role="neutral">
              <span role="cell">Total</span><span role="cell" /><span role="cell" /><span role="cell">{TOTAL}</span>
            </div>
          </div>
          <ol className="em-trk" aria-label={COPY.progressLabel}>
            {STEPS.map((s) => (
              <li key={s.name} className={s.current ? 'em-st is-cur' : 'em-st'} aria-current={s.current ? 'step' : undefined}>
                <i className="em-dot" data-role={s.role}>{s.done && <Tick />}</i>
                {s.line && <i className="em-ln" data-role={s.line} />}
                <span className="em-sl" data-role="neutral">{s.name}</span>
              </li>
            ))}
          </ol>
          <span className="em-cta" data-role="primary">{COPY.cta}</span>
        </div>
        <div className="em-ft">
          <p data-role="neutral">{COPY.address}</p>
          <p className="em-lnk" data-role="secondary" data-adjusted={adjusted}>{COPY.unsubscribe}</p>
        </div>
      </div>
    </div>
  )
}
