// The Palette Builder's previews, painted with the palette the user is about to
// export. Two older scenes, Invoices and Settings, show one small product
// (Fernway) in its table and form states; the examples
// (src/components/palette/examples/) are each their own product built around
// one drawn artefact, and load as their own chunks.
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
const Check = () => <Svg size={14} strokeWidth="3"><path d="m5 12 5 5 9-10" /></Svg>

// ── Shared pieces ───────────────────────────────────────────────────────────

function Toggle() {
  return <span className="pvs-toggle" data-role="primary"><i /></span>
}

// ── Invoices ─────────────────────────────────────────────────────────────

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

// ── Settings ─────────────────────────────────────────────────────────────

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

const SCENES = {
  invoices: Invoices,
  settings: Settings,
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
