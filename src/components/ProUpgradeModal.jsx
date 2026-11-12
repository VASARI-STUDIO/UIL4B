import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePrices, refreshPrices } from '../hooks/usePrices'
import { detectCurrency } from '../utils/currency'
import { PRO_POINTS } from '../config/planFacts'
import {
  formatMoney,
  resolvePlanLadder,
  livePlans,
  savingsVsMonthly,
} from '../config/planLadder'
import useModalDialog from '../hooks/useModalDialog'
import { generateHarmony, autoTonalFromSeed, hexToHsl, hslToHex } from '../utils/colors'
import { resolvePaletteSeed } from '../utils/paletteSeed'
import { proGatePane, proGateMeta } from '../utils/proGateProof'
import '../styles/v3-pro-gate.css'

// The Pro upgrade popup: one design in three forms. The dialog (880px, two
// panes) on a wide screen, a bottom sheet under 768px, and a one-column dialog
// when a wall has nothing real to show on the left. The words that name the
// lock, and which pane a wall gets, live in utils/proGateProof.js.
//
// Rules this file holds to:
//  - Every upgrade action goes to /plans (?plan=<cadence>&gate=<wall>). The
//    account and payment steps start there, never in this popup.
//  - Prices, the trial length and the saving come from config/planLadder.js
//    and config/planFacts.js. Nothing here types an amount.
//  - Nothing counts down, expires or claims scarcity. Declining is as easy as
//    accepting.
//  - Billing errors are logged by the price hook, never shown here.
//  - A yearly line says what is owed over the year, never "free".
//  - Reduced motion is opacity only (v3-pro-gate.css).

// Copy for the walls opened from the icon customiser, keyed by `gate`. A caller
// that passes its own title or subtitle wins; this fills in when it passes
// neither. The literal sizes sit in <code>, the one place this dialog uses mono.
const ICON_GATE_COPY = {
  'icon-line-style': {
    title: 'Export icons in Sharp and Crisp',
    subtitle: 'Pro opens every line style and any export size, on every icon in the library.',
  },
  'icon-export-size': {
    title: 'Export icons at any size',
    subtitle: (
      <>Pro lets you type any size from <code>8</code> to <code>1024px</code>, and opens Sharp and Crisp line styles.</>
    ),
  },
  'icon-pro-preview': {
    title: 'Export your Pro settings',
    subtitle: 'Pro opens every line style and any export size, on every icon in the library.',
  },
}

const DEFAULT_TITLE = 'Unlock everything with Pro'
const DEFAULT_SUBTITLE = 'Keep every tool open and every export clean. Free stays free. Pro removes the limits.'
const DEFAULT_GATE = 'pro-default'

// /plans' Pro lines, word for word (src/config/planFacts.js).
const DEFAULT_FEATURES = PRO_POINTS

const CLOSE_MS = 150
const STARTING_GIVE_UP_MS = 6000

// USD prints as "US$", as on /plans, never a bare "$" that could read as the
// visitor's own dollar.
const money = (amount, plan) => formatMoney(amount, plan.currency, { qualify: true })

const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d }
const addMonths = (date, months) => { const d = new Date(date); d.setMonth(d.getMonth() + months); return d }
const dayName = (d) => d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
const dayNameYear = (d) => d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const Lock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

const LockPill = ({ text }) => <span className="pg-lock"><Lock /><span>{text}</span></span>

const Strip = ({ colours, blur, lock }) => (
  <div className="pg-clip">
    <div className={'pg-strip' + (blur ? ' pg-blur' : '')}>
      {colours.map((c, i) => <span key={i} style={{ background: c }} />)}
    </div>
    {lock && <LockPill text={lock} />}
  </div>
)

// The left pane: what the person was working on, then the part that is Pro,
// blurred behind a lock line. Decorative, so hidden from assistive tech; the
// same lock line is read from the dialog's description.
function SystemPane({ opts, meta }) {
  const seed = useMemo(() => resolvePaletteSeed(opts.seed).seed, [opts.seed])
  const free = useMemo(() => autoTonalFromSeed(seed), [seed])
  const pro = useMemo(() => generateHarmony(seed, opts.system), [seed, opts.system])
  // The Free strip is the Auto system; the blurred one is the Pro system tried.
  const proName = opts.name || String(opts.system).replace(/[-_]+/g, ' ').replace(/^./, (ch) => ch.toUpperCase())
  return (
    <aside className="pg-pane" aria-hidden="true" data-pane="system">
      <p className="pg-lbl">Your palette, System Auto</p>
      <Strip colours={free} />
      <p className="pg-hex">{free.map((c) => <span key={c}>{c.toUpperCase()}</span>)}</p>
      <p className="pg-lbl pg-gap">{proName}, from <span className="pg-seed">{seed.toUpperCase()}</span></p>
      <Strip colours={pro} blur lock={meta.lock} />
      {meta.caption && <p className="pg-cap">{meta.caption}</p>}
    </aside>
  )
}

function ColoursPane({ opts, meta }) {
  const colours = opts.colors.slice(0, Math.max(2, opts.limit || opts.colors.length))
  const last = colours[colours.length - 1]
  const extra = Math.max(1, (opts.max || colours.length + 2) - colours.length)
  const [lastHue] = hexToHsl(last)
  const ghosts = Array.from({ length: extra }, (_, i) => hslToHex(lastHue + 40 * (i + 1), 62, 58))
  return (
    <aside className="pg-pane" aria-hidden="true" data-pane="colours">
      <div className="pg-cols-wrap" style={{ gridTemplateColumns: `${colours.length}fr ${extra}fr` }}>
        <div className="pg-cols">{colours.map((c, i) => <span key={i} style={{ background: c }} />)}</div>
        <div className="pg-clip"><div className="pg-cols pg-blur">{ghosts.map((c, i) => <span key={i} style={{ background: c }} />)}</div></div>
        <LockPill text={meta.lock} />
      </div>
      <p className="pg-cap">{meta.caption || `${colours.length} of ${colours.length} colours`}</p>
    </aside>
  )
}

function ProjectsPane({ opts, meta }) {
  const rows = opts.projects.slice(0, 4).map((p) => (typeof p === 'string' ? { name: p } : p))
  return (
    <aside className="pg-pane" aria-hidden="true" data-pane="projects">
      <ul className="pg-proj">
        {rows.map((p, i) => <li key={i}><span>{p.name}</span>{p.meta ? <span>{p.meta}</span> : null}</li>)}
        <li className="pg-ghost">
          <div className="pg-clip">
            <div className="pg-blur">{rows[0]?.name || 'Next project'}</div>
            <LockPill text={meta.lock} />
          </div>
        </li>
      </ul>
      {meta.caption && <p className="pg-cap">{meta.caption}</p>}
    </aside>
  )
}

function ProofPane({ opts, meta }) {
  return (
    <aside className="pg-pane" data-pane="proof">
      <div className="pg-proof">{opts.proof}</div>
      {meta.caption && <p className="pg-cap">{meta.caption}</p>}
    </aside>
  )
}

// The dated steps of the bill for the chosen cadence: what is paid today, when
// the first charge lands, and what is owed after. Built from the resolved plan
// (trial length, months, total), never from a fixed cadence.
function buildStops(plan, signedIn) {
  const now = new Date()
  const total = money(plan.total, plan)
  if (plan.trialDays > 0) {
    const first = addDays(now, plan.trialDays)
    const next = addMonths(first, plan.months)
    const span = plan.months === 12 ? 'the year' : `${plan.months} months`
    const every = plan.months === 12 ? 'every year' : `every ${plan.months} months`
    const opens = signedIn ? 'Pro opens on this account' : 'Your account is set up and Pro opens on it'
    return [
      { label: 'Today', fig: money(0, plan), s: `${opens} and your ${plan.trialDays}-day free trial starts.` },
      { label: dayName(first), fig: total, s: `The first payment, for ${span}.` },
      { label: dayNameYear(next), fig: total, s: `Nothing more to pay for ${plan.months} months. Then ${total} again, ${every} until you cancel.` },
    ]
  }
  const today = { label: 'Today', fig: total, s: 'Monthly has no trial, so the first payment is taken today.' }
  if (plan.months === 1) {
    return [today, { label: 'Then', fig: `${total} a month`, s: 'Renews every month until you cancel.' }]
  }
  return [
    { ...today, s: 'There is no trial, so the first payment is taken today.' },
    { label: dayNameYear(addMonths(now, plan.months)), fig: total, s: `Renews every ${plan.months} months until you cancel.` },
  ]
}

export default function ProUpgradeModal({ opts = {}, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { prices, settled } = usePrices()
  const uid = useId()
  const [starting, setStarting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [foldOpen, setFoldOpen] = useState(false)
  const [picked, setPicked] = useState(null)
  const startingRef = useRef(false)
  const closingRef = useRef(false)
  const timers = useRef([])
  const startKey = useRef(location.key)
  const segRef = useRef(null)

  const gate = typeof opts.gate === 'string' && opts.gate ? opts.gate : DEFAULT_GATE
  const gateCopy = ICON_GATE_COPY[gate] || {}
  const meta = proGateMeta({ ...opts, gate })
  const pane = proGatePane({ ...opts, gate })
  const {
    title = gateCopy.title || DEFAULT_TITLE,
    subtitle = gateCopy.subtitle || DEFAULT_SUBTITLE,
    features = DEFAULT_FEATURES,
    onLeave,
  } = opts

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Closing fades out first. Nothing closes the popup while the pill is
  // leaving for /plans: it stays up, busy, until the route has changed.
  const requestClose = useCallback(() => {
    if (startingRef.current || closingRef.current) return
    closingRef.current = true
    setClosing(true)
    timers.current.push(setTimeout(onClose, CLOSE_MS))
  }, [onClose])
  const dialogRef = useModalDialog(requestClose)

  // The visitor has left for /plans: fade out.
  const closeAfterLeave = useCallback(() => {
    if (!startingRef.current || closingRef.current) return
    closingRef.current = true
    setClosing(true)
    timers.current.push(setTimeout(onClose, CLOSE_MS))
  }, [onClose])
  useEffect(() => {
    if (location.key !== startKey.current) closeAfterLeave()
  }, [location.key, closeAfterLeave])
  // A quick Back can land on the entry we started from before the router
  // ever renders /plans, so the key never differs: the browser's own
  // history event closes the popup then.
  useEffect(() => {
    if (!starting) return undefined
    window.addEventListener('popstate', closeAfterLeave)
    return () => window.removeEventListener('popstate', closeAfterLeave)
  }, [starting, closeAfterLeave])

  const currency = useMemo(() => detectCurrency(), [])
  const ladder = useMemo(() => resolvePlanLadder({ prices, currency }), [prices, currency])
  // Only rows Stripe has a live price for, in the currency shown. A cadence
  // served from the fallback table is not listed: it would quote an amount
  // beside the live rows and start a trial that ends at a refusal.
  const plans = useMemo(() => livePlans(ladder), [ladder])
  const priceUnavailable = settled && plans.length === 0
  const choiceId = picked || (settled ? plans.find((p) => p.trialDays)?.id : null) || 'yearly'
  const choice = plans.find((p) => p.id === choiceId) || plans[0] || null
  // While prices load the label still comes from the resolved ladder row.
  const shown = choice || ladder.find((p) => p.id === choiceId) || null
  const activeId = choice?.id || choiceId
  const layerKey = priceUnavailable ? 'er' : !settled ? 'ld' : choice?.id

  const go = () => {
    if (startingRef.current) return
    if (priceUnavailable) { refreshPrices(); return }
    startingRef.current = true
    setStarting(true)
    startKey.current = location.key
    onLeave?.()
    const cadence = shown?.checkoutPlan || choiceId
    navigate(`/plans?plan=${encodeURIComponent(cadence)}&gate=${encodeURIComponent(gate)}`)
    // If the route never changes, give the pill back rather than leave it busy.
    timers.current.push(setTimeout(() => {
      if (closingRef.current) return
      startingRef.current = false
      setStarting(false)
    }, STARTING_GIVE_UP_MS))
  }

  const seeAllPlans = (e) => {
    e.preventDefault()
    if (startingRef.current) return
    onLeave?.()
    startingRef.current = true
    setStarting(true)
    startKey.current = location.key
    navigate('/plans')
    timers.current.push(setTimeout(() => { if (!closingRef.current) { startingRef.current = false; setStarting(false) } }, STARTING_GIVE_UP_MS))
  }

  const segDisabled = !settled || priceUnavailable
  // Once prices have settled the switch lists only cadences that are live; one live cadence needs no switch.
  const segPlans = settled && !priceUnavailable ? plans : ladder
  const showSeg = !(settled && plans.length === 1)
  const pick = (id) => { if (!segDisabled && !startingRef.current && plans.some((p) => p.id === id)) setPicked(id) }
  const onSegKey = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step || segDisabled) return
    e.preventDefault()
    const ids = ladder.map((p) => p.id).filter((id) => plans.some((p) => p.id === id))
    const next = ids[(ids.indexOf(activeId) + step + ids.length) % ids.length]
    if (!next) return
    pick(next)
    segRef.current?.querySelector(`[data-seg="${next}"]`)?.focus()
  }

  const yearly = plans.find((p) => p.id === 'yearly')
  const save = yearly && settled ? Math.round(savingsVsMonthly(yearly, plans)) : 0
  const segLabel = (p) => (p.id === 'yearly' && save > 0 && !priceUnavailable ? `${p.label} · Save ${save}%` : p.label)

  const hasTrial = !!shown?.trialDays
  const pillLabel = starting
    ? 'Opening plans…'
    : priceUnavailable
      ? 'Try again'
      : hasTrial ? `Start your ${shown.trialDays}-day free trial` : 'Upgrade to Pro'

  const reasonSub = !user && meta.reason
    ? <>You were about to <b>{meta.reason}</b>. Once your account is set up, you&rsquo;ll come back to this page.</>
    : null
  // The note sits in the footer on wider screens and at the end of the scrolling
  // body on phones; CSS shows one copy per breakpoint, so only one is ever read.
  const note = (where) => (
    <p className={`pg-note ${where}`}>
      {user ? 'Cancel any time from Settings. ' : ''}
      <a className="pg-link" href="/plans" onClick={seeAllPlans} aria-disabled={starting ? 'true' : undefined}>See all plans</a>
    </p>
  )
  const withPane = pane !== 'none'
  const PaneView = { system: SystemPane, colours: ColoursPane, projects: ProjectsPane, proof: ProofPane }[pane]

  return (
    <div
      className={'pg-layer' + (closing ? ' is-closing' : '')}
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose() }}
    >
      <div
        ref={dialogRef}
        className={'pg-dialog' + (withPane ? '' : ' pg-nr')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        aria-describedby={withPane ? `${uid}-sub ${uid}-lock` : `${uid}-sub`}
        data-gate={gate}
        tabIndex={-1}
      >
        <button type="button" className="pg-x" onClick={requestClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        {withPane && PaneView && <PaneView opts={opts} meta={meta} />}
        <div className="pg-main">
          <div className="pg-bd">
            <h2 className="pg-title" id={`${uid}-title`}>{title}</h2>
            <p className="pg-sub" id={`${uid}-sub`}>{reasonSub || subtitle}</p>
            {withPane && <p className="sr-only" id={`${uid}-lock`}>{meta.lock}.</p>}

            <button
              type="button"
              className="pg-fold-btn"
              aria-expanded={foldOpen}
              aria-controls={`${uid}-fold`}
              onClick={() => setFoldOpen((v) => !v)}
            >
              <span>What Pro adds</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <div className={'pg-fold-body' + (foldOpen ? ' is-open' : '')} id={`${uid}-fold`} inert={foldOpen ? undefined : ''}>
              <div>
                <ul className="pg-pts">{features.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            </div>

            {showSeg && <div
              ref={segRef}
              className="pg-seg"
              role="radiogroup"
              aria-label="Billing"
              aria-disabled={segDisabled ? 'true' : undefined}
              onKeyDown={onSegKey}
            >
              {segPlans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  className="pg-sg"
                  data-seg={p.id}
                  aria-checked={activeId === p.id}
                  tabIndex={activeId === p.id ? 0 : -1}
                  onClick={() => pick(p.id)}
                >
                  {segLabel(p)}
                </button>
              ))}
            </div>}

            <div className="pg-blk">
              {plans.map((p) => {
                const off = layerKey !== p.id
                return (
                  <div key={p.id} className={'pg-ly' + (off ? ' is-off' : '')} data-layer={p.id} aria-hidden={off ? 'true' : undefined} inert={off ? '' : undefined}>
                    <p className="pg-price"><span className="pg-amt">{money(p.perMonth, p)}</span><span className="pg-per">/mo</span></p>
                    <ul className="pg-stops">
                      {buildStops(p, !!user).map((t) => (
                        <li className="pg-stop" key={t.label}>
                          <span className="pg-stop-l">{t.label}</span>
                          <span className="pg-stop-f">{t.fig}</span>
                          <p className="pg-stop-s">{t.s}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
              <div className={'pg-ly' + (layerKey === 'ld' ? '' : ' is-off')} data-layer="ld" aria-busy={layerKey === 'ld' ? 'true' : undefined} aria-hidden={layerKey === 'ld' ? undefined : 'true'} inert={layerKey === 'ld' ? undefined : ''}>
                <span className="pg-sk pg-sk-a" />
                <span className="pg-sk pg-sk-b" />
                <span className="pg-sk pg-sk-b" />
                <span className="pg-sk pg-sk-c" />
              </div>
              <div className={'pg-ly' + (layerKey === 'er' ? '' : ' is-off')} data-layer="er" aria-hidden={layerKey === 'er' ? undefined : 'true'} inert={layerKey === 'er' ? undefined : ''}>
                <p className="pg-out" role="status">
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5 M12 16h.01" /></svg>
                  <span>{layerKey === 'er' ? 'We couldn’t load current prices just now.' : ''}</span>
                </p>
              </div>
            </div>
            {note('pg-note-bd')}
          </div>

          <div className="pg-ft">
            <button
              type="button"
              className="pg-go"
              onClick={go}
              aria-busy={starting ? 'true' : undefined}
              aria-disabled={starting ? 'true' : undefined}
            >
              {starting && <span className="pg-spin" aria-hidden="true" />}
              <span>{pillLabel}</span>
            </button>
            <button type="button" className="pg-later" onClick={requestClose} aria-disabled={starting ? 'true' : undefined}>Maybe later</button>
            {note('pg-note-ft')}
          </div>
        </div>
      </div>
    </div>
  )
}
