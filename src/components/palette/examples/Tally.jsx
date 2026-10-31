// Tally: a spending card, painted with the user's palette. The artefact is the
// card itself (the primary, with a chip in the subtle and a stripe in the deep)
// and the month's budget bar, where the five brand slots are the five spending
// categories, each labelled directly and kept apart by a gap.
//
// Pure: no state, no effects. Colours arrive as --pv-* custom properties from
// the dialog; the ones this scene works out itself are set on its root.
import { useMemo } from 'react'
import { ACTIONS, CARD, CATS, FIGURES, LIMITS, TXNS, amountText, tallyVars } from './Tally.data.js'
import './Tally.css'

const ACTION_ICONS = {
  Freeze: <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />,
  Details: <g><rect x="3.5" y="6" width="17" height="12" rx="2" /><path d="M3.5 10h17" /></g>,
  Limits: <path d="M5 8h9m4 0h1M5 16h1m4 0h9M14 6v4M6 14v4" />,
}

function Card() {
  return (
    <div className="ty-card" data-role="primary">
      <div className="ty-card-top">
        <span className="ty-mark">Tally</span>
        <svg className="ty-nfc" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 8a6 6 0 0 1 0 8M12 5a10 10 0 0 1 0 14M16 2.5a14 14 0 0 1 0 19" /></svg>
      </div>
      <span className="ty-chip" data-role="subtle" />
      <span className="ty-stripe" data-role="deep" />
      <div className="ty-card-foot">
        <span className="ty-num">•••• {CARD.last4}</span>
        <span className="ty-kind">{CARD.name}</span>
      </div>
    </div>
  )
}

function Actions({ pair }) {
  return (
    <ul className="ty-actions" data-role="neutral">
      {ACTIONS.map((a) => {
        const frozen = a === 'Freeze' && !pair
        return (
          <li key={a} className={frozen ? 'ty-act is-frozen' : 'ty-act'} data-role={frozen ? 'warning' : undefined}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ACTION_ICONS[a]}</svg>
            <span>{frozen ? 'Frozen' : a}</span>
          </li>
        )
      })}
    </ul>
  )
}

function Budget() {
  return (
    <section className="ty-budget">
      <p className="ty-label" data-role="neutral">October so far</p>
      <p className="ty-fig" data-role="neutral">{FIGURES.spent}</p>
      <p className="ty-of" data-role="neutral">{FIGURES.line}</p>
      <div className="ty-bar" role="presentation">
        {CATS.map((c, i) => (
          <i key={c.name} className={`ty-seg ty-seg--${i + 1}`} data-role={c.role} style={{ flexGrow: c.amount }} />
        ))}
        <i className="ty-seg ty-seg--rest" data-role="neutral" style={{ flexGrow: FIGURES.left }} />
      </div>
      <ul className="ty-legend" data-role="neutral">
        {FIGURES.cats.map((c, i) => (
          <li key={c.name}>
            <i className={`ty-key ty-key--${i + 1}`} data-role={c.role} />
            <span className="ty-cat">{c.name}</span>
            <span className="ty-amt">{c.text}</span>
            <span className="ty-share">{c.share}%</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Transactions({ pair }) {
  return (
    <section className="ty-txns" data-role="neutral">
      {TXNS.map((g) => {
        const rows = g.rows.filter((t) => !pair || !t.tone)
        // A day whose rows were all state rows would be a heading over nothing.
        if (!rows.length) return null
        return (
          <div key={g.day} className="ty-day">
            <h3 className="ty-dayname">{g.day}</h3>
            <ul>
              {rows.map((t) => (
                <li key={t.who} className={t.hover ? 'ty-tx is-hover' : 'ty-tx'} data-tone={t.tone}>
                  <span className="ty-ini">{t.ini}</span>
                  <span className="ty-who">
                    <b>{t.who}</b>
                    {t.note && <small className="ty-note" data-role={t.tone}><span aria-hidden="true">{t.mark} </span>{t.note}</small>}
                  </span>
                  <span className="ty-money" data-role={t.tone}>{amountText(t.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

const Icon = ({ children }) => (
  <svg className="ty-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)

// The Limits action, shown open. A semantic state needs a word and a shape as
// well as a colour, so the toast and the error each carry an icon.
function Limits() {
  return (
    <section className="ty-limits" data-role="neutral">
      <div className="ty-toast" data-role="success">
        <Icon><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></Icon>
        {LIMITS.toast}
      </div>
      <h3 className="ty-limits-h">Limits</h3>
      <div className="ty-field">
        <span className="ty-field-l">{LIMITS.budget.label}</span>
        <span className="ty-input is-focus" data-role="primary">{LIMITS.budget.value}</span>
      </div>
      <div className="ty-field">
        <span className="ty-field-l">{LIMITS.eating.label}</span>
        <span className="ty-input is-error" data-role="error">{LIMITS.eating.value}</span>
        <p className="ty-err" data-role="error">
          <Icon><path d="M12 4 2.8 20h18.4L12 4Z" /><path d="M12 10v4.5M12 17.5v.01" /></Icon>
          <span>{LIMITS.eating.error}</span>
        </p>
      </div>
      <div className="ty-switch">
        <span className="ty-switch-t">
          <span className="ty-field-l">{LIMITS.roundUps.label}</span>
          <small className="ty-help">{LIMITS.roundUps.help}</small>
        </span>
        <span className="ty-toggle is-on" data-role="primary"><i /></span>
      </div>
      <div className="ty-switch">
        <span className="ty-switch-t">
          <span className="ty-field-l is-disabled">{LIMITS.overseas.label}</span>
          <small className="ty-help">{LIMITS.overseas.help}</small>
        </span>
        <span className="ty-toggle is-disabled"><i /></span>
      </div>
      <div className="ty-limits-foot">
        <span className="ty-btn">Cancel</span>
        <span className="ty-btn ty-btn--primary" data-role="primary">Save limits</span>
      </div>
    </section>
  )
}

/**
 * @param {{roles: object}} props roles: derivePaletteRoles() output
 */
export default function Tally({ roles }) {
  const { vars, pair } = useMemo(() => tallyVars(roles), [roles])
  return (
    <div className="ty" style={vars}>
      <div className="ty-grid">
        <div className="ty-left">
          <Card />
          <Actions pair={pair} />
        </div>
        <div className="ty-right">
          <Budget />
          <Transactions pair={pair} />
        </div>
        {/* A two-colour pair has no semantic roles, so the Contrast Checker's use of this scene leaves the form out. */}
        {!pair && <Limits />}
      </div>
    </div>
  )
}
