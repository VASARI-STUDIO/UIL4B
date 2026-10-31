// Tally: a spending card app, painted the way a bank spends a brand. The card
// is the one coloured object (a recolourable render in the primary); the spent
// part of the budget bar is the primary, the active tab's underline the
// secondary, the day-of-month pace tick the accent, the category glyphs sit on
// the subtle and the card's edge line is the deep. Everything else is neutral.
//
// One state at a time: `state` is the dialog's State menu pick (Overview,
// Card frozen, Limits, Declined payment). A state carries a word and a shape as
// well as a colour. Colours arrive as --pv-* custom properties from the dialog;
// the ones this scene works out itself are set on its root.
//
// Softly interactive when the dialog hands it `onState`: the controls are real
// buttons and fields, Freeze and Limits move the dialog's State menu, and the
// rest (tabs, nav, the Details panel, the form's toggles and fields) is local
// and forgotten when the preview closes. Nothing navigates, fetches or saves.
// Without `onState`, or for a two-colour pair, the same markup is a still picture.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Recolour from '../Recolour.jsx'
import { PREVIEW_ASSETS } from '../../../data/previewAssets.js'
import {
  ACCOUNT, ACTIONS, CARD, CATS, DETAILS_PIN_HELP, DUE, FIGURES, FROZEN_LINE, LIMITS, NAV, NAV_HEADING, TABS, TXNS, UPCOMING,
  amountText, eatingUnderSpend, tallyVars,
} from './Tally.data.js'
import './Tally.css'

// How long "Budget saved" shows before the form hands back to the Overview.
const SAVED_MS = 2000

// null while the scene is a still picture; otherwise the local state and the actions that move it.
const Live = createContext(null)

// A control is a real button while the scene is live and a plain span when it is a still picture.
function Ctl({ className, children, ...rest }) {
  const live = useContext(Live)
  if (!live) return <span className={className}>{children}</span>
  return <button type="button" className={className} {...rest}>{children}</button>
}

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
  const live = useContext(Live)
  const here = live ? live.nav : 'Cards'
  return (
    <header className="ty-head">
      <span className="ty-wordmark" data-role="neutral">Tally</span>
      <nav className="ty-nav" data-role="neutral" aria-label={live ? 'Tally' : undefined}>
        {NAV.map((n) => (
          <Ctl key={n} className={n === here ? 'ty-navlink is-current' : 'ty-navlink'} aria-current={n === here ? 'page' : undefined} onClick={() => live.setNav(n)}>{n}</Ctl>
        ))}
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
  const live = useContext(Live)
  return (
    <ul className="ty-actions" data-role="neutral">
      {ACTIONS.map((a) => {
        // Limits and Details open something; Freeze flips the card.
        const opens = a === 'Limits' ? open : a === 'Details' && live?.details
        return (
          <li key={a} className={opens ? 'ty-act is-open' : 'ty-act'}>
            <Ctl className="ty-act-btn" data-act={a} aria-expanded={a === 'Freeze' ? undefined : Boolean(opens)} onClick={() => live.act(a)}>
              <Icon size={18} className="ty-act-ico">{ACTION_ICONS[a]}</Icon>
              <span>{a === 'Freeze' && frozen ? 'Unfreeze' : a}</span>
            </Ctl>
          </li>
        )
      })}
    </ul>
  )
}

// The Details action's small panel: what a card app shows without leaving the page.
function Details() {
  return (
    <section className="ty-details" data-role="neutral" aria-label="Card details">
      <dl className="ty-dl">
        <div><dt>Card number</dt><dd className="ty-mono">{CARD.masked}</dd></div>
        <div><dt>Expires</dt><dd>{CARD.expiry}</dd></div>
      </dl>
      <div className="ty-pin">
        <button type="button" className="ty-btn is-disabled" aria-disabled="true" aria-describedby="ty-pin-help">Show PIN</button>
        <small className="ty-help" id="ty-pin-help">{DETAILS_PIN_HELP}</small>
      </div>
    </section>
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

// One transaction or scheduled payment. The row is a button in a live scene (it
// takes hover, press and focus, and does nothing else), so a screen reader hears
// it as one control; `row` is its look in the current State-menu state.
function Row({ t, row = t, hover = false }) {
  return (
    <li className={hover ? 'ty-tx is-hover' : 'ty-tx'} data-tone={row.tone}>
      <Ctl className="ty-row">
        <span className="ty-merchant"><Icon size={18} className="ty-merchant-ico">{MARKS[t.mark]}</Icon></span>
        <span className="ty-who">
          <b>{t.who}</b>
          <small className="ty-note" data-role={row.tone}>{row.shape && <span aria-hidden="true">{row.shape} </span>}{row.note}</small>
        </span>
        <span className="ty-money" data-role={row.tone}>{amountText(t.amount)}</span>
      </Ctl>
    </li>
  )
}

// The bills due soon: plain neutral rows under the balance, so the wide layout's left column is not empty.
function Due() {
  return (
    <section className="ty-day ty-due" data-role="neutral">
      <h3 className="ty-dayname">Due soon</h3>
      <ul>
        {DUE.map((t) => <Row key={t.who} t={t} />)}
      </ul>
    </section>
  )
}

// The Upcoming tab: the scheduled payments, grouped by when they fall.
function Upcoming() {
  return (
    <section className="ty-txns ty-upcoming" data-role="neutral">
      {UPCOMING.map((g) => (
        <div key={g.day} className="ty-day">
          <h3 className="ty-dayname">{g.day}</h3>
          <ul>
            {g.rows.map((t) => <Row key={t.who} t={t} />)}
          </ul>
        </div>
      ))}
    </section>
  )
}

// The two tabs. In a live scene the arrow keys move between them, as a tab list does.
function Tabs() {
  const live = useContext(Live)
  const current = live ? live.tab : 0
  const onKeyDown = (e) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (current + step + TABS.length) % TABS.length
    live.setTab(next)
    e.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus()
  }
  return (
    <div className="ty-tabs" data-role="neutral" role={live ? 'tablist' : undefined} aria-label={live ? 'Activity' : undefined} onKeyDown={live ? onKeyDown : undefined}>
      {TABS.map((t, i) => (
        <Ctl
          key={t}
          className={i === current ? 'ty-tab is-current' : 'ty-tab'}
          role="tab"
          id={`ty-tab-${i}`}
          aria-selected={i === current}
          aria-controls={`ty-panel-${i}`}
          tabIndex={i === current ? 0 : -1}
          onClick={() => live.setTab(i)}
        >
          {t}
          {i === current && <i className="ty-tab-line" data-role="secondary" />}
        </Ctl>
      ))}
    </div>
  )
}

function Budget() {
  const live = useContext(Live)
  return (
    <section className="ty-budget">
      <p className="ty-label" data-role="neutral">{NAV_HEADING[live ? live.nav : 'Cards']}</p>
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
          <Ctl className="ty-catrow">
            <span className="ty-glyph" data-role="subtle"><Icon size={18} className="ty-glyph-ico">{GLYPHS[c.glyph]}</Icon></span>
            <span className="ty-cat">{c.name}</span>
            <span className="ty-amt">{c.text}</span>
            <span className="ty-share">{c.share}%</span>
          </Ctl>
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
              {rows.map((t) => <Row key={t.who} t={t} row={look(t, view, pair)} hover={Boolean(t.hover)} />)}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

// The Limits action, shown open. A semantic state needs a word and a shape as
// well as a colour, so the error and the help line each carry an icon or mark.
// The form's own state (the typed values, the round-ups toggle, which field has
// the ring) lives here, so it starts again every time the form opens. It rests
// with the budget field focused: the static frame shows what a focused field looks like.
function Limits() {
  const live = useContext(Live)
  const [values, setValues] = useState({ budget: LIMITS.budget.value, eating: LIMITS.eating.value })
  const [roundUps, setRoundUps] = useState(true)
  const [focus, setFocus] = useState('budget')
  const eatingError = eatingUnderSpend(values.eating)
  const type = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }))
  // Focus moving anywhere in the form moves the ring: onto a field, or off the fields.
  const track = (e) => setFocus(e.target.dataset.field || null)
  const submit = (e) => {
    e.preventDefault()
    live?.save()
  }
  return (
    <form className="ty-limits" data-role="neutral" onFocus={track} onSubmit={submit} noValidate>
      <div className="ty-limits-head">
        <h3 className="ty-limits-h">Limits</h3>
        <p className="ty-limits-lead">Changes apply from today.</p>
      </div>
      <div className="ty-field">
        <label className="ty-field-l" htmlFor="ty-budget">{LIMITS.budget.label}</label>
        <input
          id="ty-budget"
          className={focus === 'budget' ? 'ty-input is-focus' : 'ty-input'}
          data-role="primary"
          data-field="budget"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={values.budget}
          onChange={type('budget')}
        />
      </div>
      <div className="ty-field">
        <label className="ty-field-l" htmlFor="ty-eating">{LIMITS.eating.label}</label>
        <input
          id="ty-eating"
          className={`ty-input${focus === 'eating' ? ' is-focus' : ''}${eatingError ? ' is-error' : ''}`}
          data-role={eatingError ? 'error' : undefined}
          data-field="eating"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={values.eating}
          onChange={type('eating')}
          aria-invalid={eatingError}
          aria-describedby={eatingError ? 'ty-eating-err' : undefined}
        />
        {eatingError && (
          <p className="ty-err" data-role="error" id="ty-eating-err">
            <Icon><path d="M12 4 2.8 20h18.4L12 4Z" /><path d="M12 10v4.5M12 17.5v.01" /></Icon>
            <span>{LIMITS.eating.error}</span>
          </p>
        )}
      </div>
      <div className="ty-switch">
        <span className="ty-switch-t">
          <span className="ty-field-l" id="ty-roundups-l">{LIMITS.roundUps.label}</span>
          <small className="ty-help" id="ty-roundups-h">{LIMITS.roundUps.help}</small>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={roundUps}
          aria-labelledby="ty-roundups-l"
          aria-describedby="ty-roundups-h"
          className={roundUps ? 'ty-toggle is-on' : 'ty-toggle'}
          data-role="primary"
          onClick={() => setRoundUps((on) => !on)}
        ><i /></button>
      </div>
      <div className="ty-switch">
        <span className="ty-switch-t">
          <span className="ty-field-l is-disabled" id="ty-overseas-l">{LIMITS.overseas.label}</span>
          <small className="ty-help ty-help--info" data-role="info" id="ty-overseas-h"><span aria-hidden="true">◆ </span>{LIMITS.overseas.help}</small>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked="false"
          aria-disabled="true"
          aria-labelledby="ty-overseas-l"
          aria-describedby="ty-overseas-h"
          className="ty-toggle is-disabled"
        ><i /></button>
      </div>
      <div className="ty-limits-foot">
        <button type="button" className="ty-btn" onClick={() => live?.cancel()}>Cancel</button>
        <button type="submit" className="ty-btn ty-btn--primary" data-role="primary">Save limits</button>
      </div>
    </form>
  )
}

// The toast rides in a dock stuck to the bottom of the stage, so it is in view
// however far the page is scrolled. The dock stays put and announces the toast
// when it appears.
function Dock({ show, live }) {
  return (
    <div className={live ? 'ty-dock is-live' : 'ty-dock'} role="status">
      {show && (
        <div className="ty-toast" data-role="success">
          <Icon><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></Icon>
          {LIMITS.toast}
        </div>
      )}
    </div>
  )
}

/**
 * @param {{roles: object, state?: string, onState?: (id: string) => void}} props roles:
 *   derivePaletteRoles() output; state: the State menu's pick (overview, frozen, limits,
 *   declined); onState: asks the dialog to move its State menu (Freeze, Limits, Cancel,
 *   Save). Without it the scene is a still picture.
 */
export default function Tally({ roles, state, onState }) {
  const { vars, pair } = useMemo(() => tallyVars(roles), [roles])
  // A two-colour pair has no states: the Contrast Checker's use of this scene is the overview.
  const view = pair || !state ? 'overview' : state
  const frozen = view === 'frozen' || view === 'declined'
  const open = view === 'limits'
  const isLive = !pair && typeof onState === 'function'

  const [nav, setNav] = useState('Cards')
  const [tab, setTab] = useState(0)
  const [details, setDetails] = useState(false)
  // `saved`: Save limits was pressed and the toast is up. `quiet`: the form was opened by the Limits
  // action, so it has no toast until Save (the State menu's Limits frame shows it for the static view).
  const [saved, setSaved] = useState(false)
  const [quiet, setQuiet] = useState(false)
  const rootRef = useRef(null)
  const timer = useRef(0)
  const viewRef = useRef(view)
  const askRef = useRef(onState)
  const refocus = useRef(false)

  // Leaving the form by any route (its buttons, the State menu) clears the toast's bookkeeping.
  const [seen, setSeen] = useState(view)
  if (seen !== view) {
    setSeen(view)
    if (view !== 'limits') {
      setSaved(false)
      setQuiet(false)
    }
  }

  useEffect(() => {
    askRef.current = onState
    viewRef.current = view
    // The form's buttons are gone once it closes; the Limits action is where focus belongs.
    if (view !== 'limits' && refocus.current) {
      refocus.current = false
      rootRef.current?.querySelector('[data-act="Limits"]')?.focus()
    }
  }, [view, onState])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const act = (a) => {
    if (a === 'Details') {
      setDetails((d) => !d)
    } else if (a === 'Freeze') {
      onState(frozen ? 'overview' : 'frozen')
    } else if (open) {
      refocus.current = true
      onState('overview')
    } else {
      setQuiet(true)
      onState('limits')
    }
  }
  const cancel = () => {
    refocus.current = true
    onState('overview')
  }
  // Save shows the toast, then hands back to the Overview. Nothing is stored.
  const save = () => {
    if (saved) return
    setSaved(true)
    timer.current = window.setTimeout(() => {
      if (viewRef.current !== 'limits') return
      refocus.current = Boolean(rootRef.current?.querySelector('.ty-limits')?.contains(document.activeElement))
      askRef.current('overview')
    }, SAVED_MS)
  }
  const live = isLive ? { nav, setNav, tab, setTab, details, act, cancel, save } : null

  return (
    <Live.Provider value={live}>
      <div className={isLive ? 'ty is-live' : 'ty'} style={vars} data-state={view} ref={rootRef}>
        <Header />
        <div className="ty-body">
          <div className="ty-grid">
            <div className="ty-left">
              <Card color={roles.primary} frozen={frozen} />
              <div className="ty-side">
                <Actions frozen={frozen} open={open} />
                {isLive && details && <Details />}
                <Account frozen={frozen} />
                <Due />
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
                  {/* The spending panel is hidden, not unmounted, so the bar's grow-in plays once and not on every tab switch. */}
                  <div className="ty-panel" role={isLive ? 'tabpanel' : undefined} id={isLive ? 'ty-panel-0' : undefined} aria-labelledby={isLive ? 'ty-tab-0' : undefined} hidden={isLive && tab !== 0}>
                    <Budget />
                    <Categories />
                    <Transactions view={view} pair={pair} />
                  </div>
                  {isLive && tab === 1 && (
                    <div className="ty-panel" role="tabpanel" id="ty-panel-1" aria-labelledby="ty-tab-1">
                      <Upcoming />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {open && !pair && <Dock show={!isLive || saved || !quiet} live={isLive} />}
      </div>
    </Live.Provider>
  )
}
