// Tally: a spending card app, painted the way a bank spends a brand. The card
// is the one coloured object (a recolourable render in the primary); the spent
// part of the budget bar is the primary, the active tab's underline the
// secondary, the day-of-month pace tick the accent, the category glyphs sit on
// the subtle and the card's edge line is the deep. Everything else is neutral.
//
// One state at a time: `state` is the dialog's State menu pick (Overview,
// Card frozen, Limits, Declined payment). A state carries a word and a shape as
// well as a colour. Pure: no state, no effects. Colours arrive as --pv-* custom
// properties from the dialog; the ones this scene works out itself are set on its root.
import { useMemo } from 'react'
import Recolour from '../Recolour.jsx'
import { PREVIEW_ASSETS } from '../../../data/previewAssets.js'
import {
  ACCOUNT, ACTIONS, CARD, CATS, FIGURES, FROZEN_LINE, LIMITS, NAV, TABS, TXNS, amountText, tallyVars,
} from './Tally.data.js'
import './Tally.css'

const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }

const ACTION_ICONS = {
  Freeze: <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />,
  Details: <g><rect x="3.5" y="6" width="17" height="12" rx="2" /><path d="M3.5 10h17" /></g>,
  Limits: <path d="M5 8h9m4 0h1M5 16h1m4 0h9M14 6v4M6 14v4" />,
}

// The five category glyphs, drawn for this scene.
const GLYPHS = {
  cart: <g><path d="M3 4.5h2.4l2 9.5h9.6l2-7.5H6.2" /><circle cx="9.5" cy="18.5" r="1.3" /><circle cx="16.5" cy="18.5" r="1.3" /></g>,
  train: <g><rect x="6" y="3" width="12" height="14" rx="3" /><path d="M6 10.5h12M8.5 21l1.5-4M15.5 21 14 17" /><circle cx="9.5" cy="13.8" r=".6" /><circle cx="14.5" cy="13.8" r=".6" /></g>,
  fork: <g><path d="M6.5 3v5.5a2.5 2.5 0 0 0 5 0V3M9 3v18M17.5 21V3c-2.3 1.3-3.5 3.8-3.5 7.5h3.5" /></g>,
  bolt: <path d="M13 3 5.5 13.5H11.5L10.7 21l7.8-10.5H12.6L13 3Z" />,
  dots: <g fill="currentColor" stroke="none"><circle cx="5.5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="18.5" cy="12" r="1.7" /></g>,
}

// Simple marks for the invented merchants: neutral, one weight, no real brand.
const MARKS = {
  leaf: <g><path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14Z" /><path d="M5 19 13 11" /></g>,
  ring: <g><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" /></g>,
  shelf: <g><rect x="5" y="5" width="14" height="5" rx="1" /><rect x="5" y="14" width="14" height="5" rx="1" /></g>,
  chevron: <path d="m7 7 5 5-5 5M13 7l5 5-5 5" />,
  bowl: <g><path d="M4 11h16a8 8 0 0 1-16 0Z" /><path d="M9 7.5c0-1.6 1.5-1.6 1.5-3.2M14 7.5c0-1.6 1.5-1.6 1.5-3.2" /></g>,
  tally: <path d="M7 6v12M11 6v12M15 6v12M5 16.5 17.5 7.5" />,
}

function Icon({ children, size = 16, className = 'ty-ico' }) {
  return <svg className={className} width={size} height={size} {...svgProps}>{children}</svg>
}

function Header() {
  return (
    <header className="ty-head">
      <span className="ty-wordmark" data-role="neutral">Tally</span>
      <nav className="ty-nav" data-role="neutral">
        {NAV.map((n) => <span key={n} className={n === 'Cards' ? 'is-current' : undefined}>{n}</span>)}
      </nav>
      <span className="ty-avatar" data-role="neutral">AK</span>
    </header>
  )
}

// A frozen card is the same render with its colour pulled back by the stylesheet.
function Card({ color, frozen }) {
  return (
    <div className="ty-cardwrap">
      <Recolour asset={PREVIEW_ASSETS['card-front']} color={color} sizes="360px" eager className={frozen ? 'ty-cardface is-frozen' : 'ty-cardface'}>
        <span className="ty-card-mark">Tally</span>
        <span className="ty-card-num">•••• {CARD.last4}</span>
        <span className="ty-network" aria-hidden="true"><i /><i /></span>
      </Recolour>
      <i className="ty-edge" data-role="deep" />
    </div>
  )
}

function Actions({ frozen, open }) {
  return (
    <ul className="ty-actions" data-role="neutral">
      {ACTIONS.map((a) => (
        <li key={a} className={a === 'Limits' && open ? 'ty-act is-open' : 'ty-act'}>
          <Icon size={18} className="ty-act-ico">{ACTION_ICONS[a]}</Icon>
          <span>{a === 'Freeze' && frozen ? 'Unfreeze' : a}</span>
        </li>
      ))}
    </ul>
  )
}

function Account({ frozen }) {
  return (
    <div className="ty-account">
      {frozen && (
        <p className="ty-frozen" data-role="warning">
          <Icon><path d="M12 4 2.8 20h18.4L12 4Z" /><path d="M12 10v4.5M12 17.5v.01" /></Icon>
          <span>{FROZEN_LINE}</span>
        </p>
      )}
      <p className="ty-label" data-role="neutral">{ACCOUNT.name}</p>
      <p className="ty-balance" data-role="neutral">{ACCOUNT.balance}</p>
    </div>
  )
}

function Tabs() {
  return (
    <div className="ty-tabs" data-role="neutral">
      {TABS.map((t, i) => (
        <span key={t} className={i === 0 ? 'ty-tab is-current' : 'ty-tab'}>
          {t}
          {i === 0 && <i className="ty-tab-line" data-role="secondary" />}
        </span>
      ))}
    </div>
  )
}

function Budget() {
  return (
    <section className="ty-budget">
      <p className="ty-label" data-role="neutral">October so far</p>
      <p className="ty-fig" data-role="neutral">{FIGURES.spent}</p>
      <p className="ty-of" data-role="neutral">{FIGURES.line}</p>
      <div className="ty-bar" role="presentation">
        <i className="ty-spent" data-role="primary" style={{ width: `${FIGURES.spentShare}%` }} />
        <i className="ty-pace" data-role="accent" style={{ left: `${FIGURES.paceShare}%` }} />
      </div>
      <div className="ty-bar-foot" data-role="neutral">
        <span className="ty-pace-label" style={{ left: `${FIGURES.paceShare}%` }}>Even pace</span>
        <span className="ty-left-amt">{FIGURES.left} left</span>
      </div>
    </section>
  )
}

function Categories() {
  return (
    <ul className="ty-cats" data-role="neutral">
      {FIGURES.cats.map((c) => (
        <li key={c.name}>
          <span className="ty-glyph" data-role="subtle"><Icon size={18} className="ty-glyph-ico">{GLYPHS[c.glyph]}</Icon></span>
          <span className="ty-cat">{c.name}</span>
          <span className="ty-amt">{c.text}</span>
          <span className="ty-share">{c.share}%</span>
        </li>
      ))}
    </ul>
  )
}

// What a row shows in the current view: its State-menu look when it has one.
function look(t, view, pair) {
  const s = !pair && t.states && t.states[view]
  return s || { tone: t.tone, shape: t.shape, note: t.note }
}

function Transactions({ view, pair }) {
  return (
    <section className="ty-txns" data-role="neutral">
      {TXNS.map((g) => {
        // A two-colour pair has no semantic roles, so the rows that carry one are left out.
        const rows = g.rows.filter((t) => (!t.only || t.only === view) && !(pair && t.tone))
        if (!rows.length) return null
        return (
          <div key={g.day} className="ty-day">
            <h3 className="ty-dayname">{g.day}</h3>
            <ul>
              {rows.map((t) => {
                const row = look(t, view, pair)
                return (
                  <li key={t.who} className={t.hover ? 'ty-tx is-hover' : 'ty-tx'} data-tone={row.tone}>
                    <span className="ty-merchant"><Icon size={18} className="ty-merchant-ico">{MARKS[t.mark]}</Icon></span>
                    <span className="ty-who">
                      <b>{t.who}</b>
                      <small className="ty-note" data-role={row.tone}>{row.shape && <span aria-hidden="true">{row.shape} </span>}{row.note}</small>
                    </span>
                    <span className="ty-money" data-role={row.tone}>{amountText(t.amount)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

// The Limits action, shown open. A semantic state needs a word and a shape as
// well as a colour, so the error and the help line each carry an icon or mark.
function Limits() {
  return (
    <section className="ty-limits" data-role="neutral">
      <div className="ty-limits-head">
        <h3 className="ty-limits-h">Limits</h3>
        <p className="ty-limits-lead">Changes apply from today.</p>
      </div>
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
          <small className="ty-help ty-help--info" data-role="info"><span aria-hidden="true">◆ </span>{LIMITS.overseas.help}</small>
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

// The toast rides in a dock stuck to the bottom of the stage, so it is in view
// however far the page is scrolled.
function Dock() {
  return (
    <div className="ty-dock">
      <div className="ty-toast" data-role="success">
        <Icon><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></Icon>
        {LIMITS.toast}
      </div>
    </div>
  )
}

/**
 * @param {{roles: object, state?: string}} props roles: derivePaletteRoles() output;
 *   state: the State menu's pick (overview, frozen, limits, declined)
 */
export default function Tally({ roles, state }) {
  const { vars, pair } = useMemo(() => tallyVars(roles), [roles])
  // A two-colour pair has no states: the Contrast Checker's use of this scene is the overview.
  const view = pair || !state ? 'overview' : state
  const frozen = view === 'frozen' || view === 'declined'
  const open = view === 'limits'
  return (
    <div className="ty" style={vars} data-state={view}>
      <Header />
      <div className="ty-body">
        <div className="ty-grid">
          <div className="ty-left">
            <Card color={roles.primary} frozen={frozen} />
            <div className="ty-side">
              <Actions frozen={frozen} open={open} />
              <Account frozen={frozen} />
            </div>
          </div>
          <div className="ty-right">
            {open ? (
              <>
                {/* A two-colour pair has no semantic roles, so the Contrast Checker's use of this scene leaves the form out. */}
                {!pair && <Limits />}
              </>
            ) : (
              <>
                <Tabs />
                <Budget />
                <Categories />
                <Transactions view={view} pair={pair} />
              </>
            )}
          </div>
        </div>
      </div>
      {open && !pair && <Dock />}
    </div>
  )
}
