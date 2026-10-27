// The Palette Builder's previews, painted with the palette the user is about to
// export. Six older scenes show one small product (Fernway) from several sides;
// the examples (src/components/palette/examples/) are each their own product
// built around one drawn artefact, and load as their own chunks.
//
// Every component below is pure. It takes nothing but what it draws, holds no
// state and reads no context. The colours arrive as --pv-* custom properties on
// the scene root (palettePreviewRoles.js `pvVars`), the layout is a container
// query on that root, and nothing is scaled: text is its true pixel size at
// every width.
//
// `data-role` marks the elements a colour role paints. The legend under the
// stage reads it to outline "where this colour lands", and a role that fails
// its floor outlines its elements by default. A role may be shared:
// data-role="primary success" is both.
import { useEffect, useRef } from 'react'
import { pvVars } from '../../utils/palettePreviewRoles'
import { EXAMPLES } from './examples/registry'
import { FERNWAY, sceneById } from '../../data/palettePreviewScenes'
import '../../styles/pages/palette-preview.css'

const Svg = ({ size = 16, children, ...rest }) => (
  <svg className="pvs-ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
)
const Chevron = () => <Svg size={14}><path d="m6 9 6 6 6-6" /></Svg>
const Arrow = () => <Svg size={14} strokeWidth="2.5"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></Svg>
const Check = () => <Svg size={14} strokeWidth="3"><path d="m5 12 5 5 9-10" /></Svg>
const Menu = () => <Svg size={20}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></Svg>

const TAB_ICONS = {
  Today: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  Clients: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 5.5a3.5 3.5 0 0 1 0 5" /></>,
  Invoices: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4" /><path d="M10 13h6" /><path d="M10 17h6" /></>,
  Settings: <><path d="M4 8h16" /><path d="M4 16h16" /><circle cx="9" cy="8" r="2.5" /><circle cx="15" cy="16" r="2.5" /></>,
}

// ── Shared pieces ───────────────────────────────────────────────────────────

function LeadPanel() {
  return (
    <section className="pvs-panel pvs-lead" data-role="neutral">
      <p className="pvs-label">Paid this month</p>
      <p className="pvs-fig">$8,420.00</p>
      <p className="pvs-delta" data-role="success"><Arrow /> 18% on September</p>
      <div className="pvs-chart" aria-hidden="true">
        {FERNWAY.months.map((h, i) => (
          <i key={i} className={i === FERNWAY.months.length - 1 ? 'is-now' : ''} data-role="primary" style={{ '--pv-h': `${h}%` }} />
        ))}
      </div>
      <div className="pvs-axis" aria-hidden="true"><span>Nov</span><span>Oct</span></div>
      <p className="pvs-foot">Updated 11:08</p>
    </section>
  )
}

function Toggle() {
  return <span className="pvs-toggle" data-role="primary"><i /></span>
}

// ── 1. Dashboard ────────────────────────────────────────────────────────────

function Dashboard() {
  return (
    <div className="pvs-dash">
      <aside className="pvs-nav" data-role="neutral">
        <div className="pvs-nav-top">
          <span className="pvs-brand">Fernway</span>
          <span className="pvs-menu"><Menu /></span>
        </div>
        <ul className="pvs-navlist">
          {FERNWAY.nav.map((item, i) => (
            <li key={item} className={i === 0 ? 'is-on' : ''}>
              {i === 0 && <b className="pvs-navbar" data-role="primary" />}
              {item}
            </li>
          ))}
        </ul>
      </aside>
      <div className="pvs-main">
        <header className="pvs-head">
          <h2 className="pvs-h1">Overview</h2>
          <div className="pvs-actions">
            <span className="pvs-select">This month <Chevron /></span>
            <span className="pvs-btn pvs-btn--primary" data-role="primary">New invoice</span>
          </div>
        </header>
        <div className="pvs-grid">
          <LeadPanel />
          <section className="pvs-panel" data-role="neutral">
            <p className="pvs-label">Outstanding</p>
            <p className="pvs-fig pvs-fig--s">$2,940.00</p>
            <p className="pvs-muted">3 invoices, <span className="pvs-err" data-role="error">1 overdue</span></p>
            <p className="pvs-foot">Updated 11:08</p>
          </section>
          <section className="pvs-panel" data-role="neutral">
            <p className="pvs-label">Hours logged</p>
            <p className="pvs-fig pvs-fig--s">96h 30m</p>
            <div className="pvs-week" aria-hidden="true">
              {FERNWAY.week.map((d, i) => (
                <span key={i} className="pvs-day">
                  <i className={`pvs-dot is-${d.state}`} data-role={d.state === 'today' ? 'accent' : d.state === 'logged' ? 'secondary' : undefined} />
                  {d.day}
                </span>
              ))}
            </div>
            <p className="pvs-foot">Updated 11:08</p>
          </section>
        </div>
      </div>
    </div>
  )
}

// ── 2. Invoices ─────────────────────────────────────────────────────────────

function Invoices() {
  return (
    <div className="pvs-inv">
      <header className="pvs-head">
        <h2 className="pvs-h1">Invoices</h2>
        <span className="pvs-btn pvs-btn--primary" data-role="primary">New invoice</span>
      </header>
      <div className="pvs-tabs">
        {FERNWAY.tabs.map((tab, i) => (
          <span key={tab} className={i === 0 ? 'is-on' : ''}>
            {tab}
            {i === 0 && <b className="pvs-underline" data-role="primary" />}
          </span>
        ))}
      </div>
      <div className="pvs-filters">
        <span className="pvs-input pvs-search">Search clients or numbers</span>
        <span className="pvs-select" data-role="neutral">Status: Any <Chevron /></span>
        <span className="pvs-select" data-role="neutral">Due: Next 30 days <Chevron /></span>
      </div>
      <div className="pvs-table">
        <div className="pvs-row pvs-row--head">
          <span /><span>Client</span><span>Invoice</span><span>Issued</span><span>Due</span><span>Status</span><span className="pvs-amount">Amount</span>
        </div>
        {FERNWAY.invoices.map((r, i) => {
          const s = FERNWAY.status[r.status]
          return (
            <div key={r.no} className={`pvs-row${i === 1 ? ' is-selected' : ''}${i === 3 ? ' is-hover' : ''}`}>
              <span className="pvs-check" data-role={i === 1 ? 'primary' : undefined}>{i === 1 && <Check />}</span>
              <span className="pvs-client">{r.client}</span>
              <span className="pvs-no">{r.no}</span>
              <span className="pvs-issued">{r.issued}</span>
              <span className="pvs-due">{r.due}</span>
              <span className="pvs-status">
                <span className="pvs-chip" data-tone={s.role} data-role={s.role}>
                  <i className="pvs-mark" data-shape={s.shape} />{s.label}
                </span>
              </span>
              <span className="pvs-amount">{r.amount}</span>
            </div>
          )
        })}
      </div>
      <footer className="pvs-pager">
        <span>5 of 38 invoices</span>
        <span className="pvs-pages"><span className="pvs-select" data-role="neutral">Previous</span><span className="pvs-select" data-role="neutral">Next</span></span>
      </footer>
    </div>
  )
}

// ── 3. Settings ─────────────────────────────────────────────────────────────

function Field({ label, help, children }) {
  return (
    <div className="pvs-field">
      <div className="pvs-field-l"><p className="pvs-field-name">{label}</p>{help && <p className="pvs-muted">{help}</p>}</div>
      <div className="pvs-field-c">{children}</div>
    </div>
  )
}

function Settings() {
  return (
    <div className="pvs-set">
      <header className="pvs-head">
        <h2 className="pvs-h1">Settings</h2>
        <div className="pvs-toast" data-role="success"><Check /> Payment terms updated</div>
      </header>
      <div className="pvs-tabs">
        {FERNWAY.settingsTabs.map((tab) => (
          <span key={tab} className={tab === 'Business' ? 'is-on' : ''}>
            {tab}
            {tab === 'Business' && <b className="pvs-underline" data-role="primary" />}
          </span>
        ))}
      </div>
      <div className="pvs-form">
        <Field label="Business name"><span className="pvs-input">Fernway Studio</span></Field>
        <Field label="ABN"><span className="pvs-input is-focus" data-role="primary">51 824 753 556</span></Field>
        <Field label="GST registered" help="Adds 10% GST to new invoices."><Toggle /></Field>
        <Field label="Payment terms"><span className="pvs-input pvs-input--select">14 days <Chevron /></span></Field>
        <Field label="Invoice email">
          <span className="pvs-input is-error" data-role="error">accounts@fernway</span>
          <p className="pvs-err pvs-msg" data-role="error">Enter a full email address, like name@example.com</p>
        </Field>
        <Field label="Logo" help="Available on the Studio plan."><span className="pvs-btn is-disabled">Upload</span></Field>
      </div>
      <footer className="pvs-savebar" data-role="neutral">
        <span className="pvs-muted">You have unsaved changes</span>
        <span className="pvs-actions">
          <span className="pvs-btn pvs-btn--outline">Cancel</span>
          <span className="pvs-btn pvs-btn--primary" data-role="primary">Save changes</span>
        </span>
      </footer>
    </div>
  )
}

// ── 4. Phone app ────────────────────────────────────────────────────────────

function Phone() {
  return (
    <div className="pvs-phone">
      <div className="pvs-device">
        <div className="pvs-statusbar" aria-hidden="true">
          <span>9:41</span>
          <span className="pvs-signal"><i /><i /><i /><i /></span>
        </div>
        <div className="pvs-phone-body">
          <div>
            <h2 className="pvs-h1">Today</h2>
            <p className="pvs-muted">Thu 23 Oct</p>
          </div>
          <section className="pvs-timer" data-role="primary">
            <p>Harbour Physio · Brand refresh</p>
            <p className="pvs-fig">2:14:05</p>
            <span className="pvs-btn pvs-btn--invert">Stop</span>
          </section>
          <section>
            <p className="pvs-between"><span>This week</span><span className="pvs-muted">31h 20m of 38h</span></p>
            <div className="pvs-progress" aria-hidden="true"><i data-role="secondary" style={{ '--pv-w': '82%' }} /></div>
          </section>
          <ul className="pvs-entries">
            {FERNWAY.entries.map((e) => (
              <li key={e.client}>
                <i className="pvs-cdot" data-role={e.role} />
                <span className="pvs-entry-t"><b>{e.client}</b><span className="pvs-muted">{e.task}</span></span>
                <span className="pvs-time">{e.time}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="pvs-sheet" data-role="neutral">
          <i className="pvs-grab" aria-hidden="true" />
          <span className="pvs-btn pvs-btn--primary pvs-btn--block" data-role="primary">Add time</span>
        </div>
        <nav className="pvs-tabbar" data-role="neutral">
          {['Today', 'Clients', 'Invoices', 'Settings'].map((t, i) => (
            <span key={t} className={i === 0 ? 'is-on' : ''}>
              <Svg size={22} data-role={i === 0 ? 'primary' : undefined}>{TAB_ICONS[t]}</Svg>
              {t}
            </span>
          ))}
        </nav>
      </div>
    </div>
  )
}

// ── 5. Landing page ─────────────────────────────────────────────────────────

function Landing() {
  return (
    <div className="pvs-land">
      <nav className="pvs-lnav">
        <span className="pvs-brand">Fernway</span>
        <span className="pvs-llinks"><span>Features</span><span>Pricing</span><span>Help</span></span>
        <span className="pvs-login">Log in</span>
        <span className="pvs-btn pvs-btn--primary" data-role="primary">Start free</span>
      </nav>
      <section className="pvs-hero">
        <div className="pvs-hero-copy">
          <h2 className="pvs-display">Send the invoice before you close the laptop.</h2>
          <p className="pvs-sub">Fernway turns the time you log into an invoice your client can pay by card or bank transfer. Built for freelancers in Australia, GST included.</p>
          <div className="pvs-cta">
            <span className="pvs-btn pvs-btn--primary pvs-btn--l" data-role="primary">Start free</span>
            <span className="pvs-link" data-role="primary">See pricing</span>
          </div>
        </div>
        <div className="pvs-hero-art" data-role="subtle">
          <LeadPanel />
        </div>
      </section>
      <section className="pvs-plans">
        <div className="pvs-planlist">
          {FERNWAY.plans.map((p) => (
            <article key={p.id} className={`pvs-plan${p.pick ? ' is-pick' : ''}`} data-role={p.pick ? 'primary' : undefined}>
              {p.pick && <p className="pvs-pick" data-role="primary">Most picked</p>}
              <h3 className="pvs-plan-n">{p.name}</h3>
              <p className="pvs-price">{p.price}{p.per && <span className="pvs-per">{p.per}</span>}</p>
              <p className="pvs-muted">{p.note}</p>
            </article>
          ))}
        </div>
        <p className="pvs-muted pvs-fine">Prices in AUD, GST included. Sample pricing for this preview.</p>
      </section>
    </div>
  )
}

// ── 6. Email receipt ────────────────────────────────────────────────────────

function Receipt() {
  return (
    <div className="pvs-mail">
      <div className="pvs-mailbar" data-role="neutral">
        <p><b>From</b> Fernway &lt;receipts@fernway.example&gt;</p>
        <p><b>Subject</b> Kiri Walker paid invoice FW-0142</p>
      </div>
      <div className="pvs-mailcol">
        <p className="pvs-brand">Fernway</p>
        <h2 className="pvs-h1">{"You've been paid"}</h2>
        <p className="pvs-paid" data-role="success">$1,250.00 from Kiri Walker</p>
        <dl className="pvs-summary">
          {FERNWAY.receipt.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <span className="pvs-btn pvs-btn--primary pvs-btn--l" data-role="primary">View payment</span>
        <p className="pvs-muted pvs-legal">Fernway Pty Ltd, PO Box 3104, Brisbane QLD 4101 · Notification settings</p>
      </div>
    </div>
  )
}

// ── 7. Poster ───────────────────────────────────────────────────────────────

function Poster() {
  return (
    <div className="pvs-poster">
      <div className="pvs-band pvs-band--1" data-role="primary"><h2>Open studio night</h2></div>
      <div className="pvs-band pvs-band--2" data-role="secondary"><p><span>Fri 14 Nov, 6 to 9 pm</span><span>22&nbsp;Boundary St, West End</span></p></div>
      <div className="pvs-band pvs-band--3" data-role="deep"><p>Free entry. Bring a friend.</p></div>
      <i className="pvs-circle" data-role="accent" />
    </div>
  )
}

// ── 8. Social tile ──────────────────────────────────────────────────────────

function Social() {
  return (
    <div className="pvs-social" data-role="primary">
      <h2>Fernway now does GST.</h2>
      <p>Turn it on in Settings, then Business.</p>
      <div className="pvs-minirow" data-role="neutral"><span>GST registered</span><Toggle /></div>
      <p className="pvs-handle">fernway.app</p>
    </div>
  )
}

const SCENES = {
  dashboard: Dashboard,
  invoices: Invoices,
  settings: Settings,
  phone: Phone,
  landing: Landing,
  receipt: Receipt,
  poster: Poster,
  social: Social,
}

/**
 * @param {object} props
 * @param {object} props.roles derivePaletteRoles() output for the palette
 * @param {string[]} props.labels the five slot names, in BRAND_ROLES order
 * @param {string} props.sceneId one of PREVIEW_SCENES
 * @param {string|null} props.highlight a role to outline, or null
 * @param {(roles: string[], adjusted: string[]) => void} props.onRoles the roles
 *   this scene paints, and those it painted as text in an adjusted colour
 */
export default function PreviewScene({ roles, labels, sceneId, highlight = null, onRoles }) {
  const scene = sceneById(sceneId)
  const Body = scene.example ? EXAMPLES[scene.id] : SCENES[scene.id]
  const rootRef = useRef(null)
  const failKey = roles.fails.map((f) => f.role).join(',')

  // Mark every role-bearing element: which are in the highlighted role, and
  // which carry a role that fails its floor. Containers (an element holding
  // another role-bearing one) never dim, or the highlighted child would dim
  // with them. A failing role is flagged on one element, the largest it paints
  // at this width, so a chart of twelve bars shows one outline rather than
  // twelve. The marks are redone when the scene is resized, because a layout
  // change can hide the element that was flagged, and when the roles change,
  // because an example may paint a brand colour as text a step darker (or
  // lighter) to keep it readable: it marks that element data-adjusted, and the
  // legend says so on the chip.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const failing = failKey ? failKey.split(',') : []
    const mark = () => {
      const els = [...root.querySelectorAll('[data-role]')]
      const used = new Set()
      const adjusted = new Set()
      const flagged = new Set()
      for (const role of failing) {
        let best = null
        let area = 0
        for (const el of els) {
          if (!el.dataset.role.split(' ').includes(role)) continue
          const r = el.getBoundingClientRect()
          if (r.width * r.height > area) { best = el; area = r.width * r.height }
        }
        if (best) flagged.add(best)
      }
      for (const el of els) {
        const rs = el.dataset.role.split(' ')
        rs.forEach((r) => used.add(r))
        if (el.dataset.adjusted === 'true') rs.forEach((r) => adjusted.add(r))
        const isLeaf = !el.querySelector('[data-role]')
        if (highlight && rs.includes(highlight)) el.dataset.hit = 'on'
        else if (highlight && isLeaf) el.dataset.hit = 'off'
        else delete el.dataset.hit
        if (flagged.has(el)) el.dataset.fail = 'on'
        else delete el.dataset.fail
      }
      if (onRoles) onRoles([...used], [...adjusted])
    }
    mark()
    if (typeof ResizeObserver === 'undefined' || !failKey) return undefined
    const ro = new ResizeObserver(mark)
    ro.observe(root)
    return () => ro.disconnect()
  }, [highlight, scene.id, failKey, onRoles, roles])

  return (
    <div
      ref={rootRef}
      className="pvs"
      style={pvVars(roles)}
      data-scene={scene.id}
      data-mode={roles.mode}
      data-preview-scene={scene.name}
      role="img"
      aria-label={`${scene.name} preview using your palette, ${roles.mode} theme`}
    >
      <Body roles={roles} labels={labels} />
    </div>
  )
}
