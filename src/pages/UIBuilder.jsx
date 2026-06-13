import { useState, useCallback, useMemo } from 'react'
import { useProject } from '../contexts/ProjectContext'

// ── Design Tokens ────────────────────────────────────────────────────────────

const DEFAULT_TOKENS = {
  radius: 8,
  borderWidth: 1,
  borderColor: '#d1d5db',
  shadowX: 0,
  shadowY: 2,
  shadowBlur: 8,
  shadowSpread: 0,
  shadowColor: '#000000',
  shadowOpacity: 8,
  primary: '#635BFF',
  surface: '#ffffff',
  surfaceBorder: '#e5e7eb',
  text: '#111827',
  textSub: '#6b7280',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 14,
  fontWeight: 500,
  spacing: 12,
}

function hexToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity / 100})`
}

function shadow(t) {
  return `${t.shadowX}px ${t.shadowY}px ${t.shadowBlur}px ${t.shadowSpread}px ${hexToRgba(t.shadowColor, t.shadowOpacity)}`
}

// ── Component Variant Data ────────────────────────────────────────────────────

const BUTTON_VARIANTS = [
  { id: 'solid', label: 'Solid', render: (t) => ({ background: t.primary, color: '#fff', border: 'none', borderRadius: t.radius, padding: `${t.spacing}px ${t.spacing * 2}px`, fontFamily: t.fontFamily, fontSize: t.fontSize, fontWeight: 600, cursor: 'pointer', boxShadow: shadow(t), transition: 'all .15s' }) },
  { id: 'outline', label: 'Outlined', render: (t) => ({ background: 'transparent', color: t.primary, border: `${t.borderWidth}px solid ${t.primary}`, borderRadius: t.radius, padding: `${t.spacing}px ${t.spacing * 2}px`, fontFamily: t.fontFamily, fontSize: t.fontSize, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }) },
  { id: 'ghost', label: 'Ghost', render: (t) => ({ background: 'transparent', color: t.primary, border: 'none', borderRadius: t.radius, padding: `${t.spacing}px ${t.spacing * 2}px`, fontFamily: t.fontFamily, fontSize: t.fontSize, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }) },
  { id: 'soft', label: 'Soft', render: (t) => ({ background: t.primary + '18', color: t.primary, border: 'none', borderRadius: t.radius, padding: `${t.spacing}px ${t.spacing * 2}px`, fontFamily: t.fontFamily, fontSize: t.fontSize, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }) },
  { id: 'gradient', label: 'Gradient', render: (t) => ({ background: `linear-gradient(135deg, ${t.primary}, ${t.primary}99)`, color: '#fff', border: 'none', borderRadius: t.radius, padding: `${t.spacing}px ${t.spacing * 2}px`, fontFamily: t.fontFamily, fontSize: t.fontSize, fontWeight: 600, cursor: 'pointer', boxShadow: shadow(t), transition: 'all .15s' }) },
  { id: 'glass', label: 'Glass', render: (t) => ({ background: t.primary + '22', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: t.primary, border: `1px solid ${t.primary}55`, borderRadius: t.radius, padding: `${t.spacing}px ${t.spacing * 2}px`, fontFamily: t.fontFamily, fontSize: t.fontSize, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }) },
]

const CARD_VARIANTS = [
  { id: 'elevated', label: 'Elevated', render: (t) => ({ background: t.surface, border: `${t.borderWidth}px solid ${t.surfaceBorder}`, borderRadius: t.radius * 1.5, boxShadow: shadow(t), padding: t.spacing * 2 }) },
  { id: 'outlined', label: 'Outlined', render: (t) => ({ background: t.surface, border: `${t.borderWidth}px solid ${t.surfaceBorder}`, borderRadius: t.radius * 1.5, padding: t.spacing * 2 }) },
  { id: 'filled', label: 'Filled', render: (t) => ({ background: '#f3f4f6', border: 'none', borderRadius: t.radius * 1.5, padding: t.spacing * 2 }) },
  { id: 'glass', label: 'Glass', render: (t) => ({ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: t.radius * 1.5, padding: t.spacing * 2 }) },
]

const INPUT_VARIANTS = [
  { id: 'bordered', label: 'Bordered', render: (t) => ({ background: t.surface, border: `${t.borderWidth}px solid ${t.surfaceBorder}`, borderRadius: t.radius, padding: `${t.spacing}px ${t.spacing * 1.2}px`, fontFamily: t.fontFamily, fontSize: t.fontSize, color: t.text, outline: 'none', width: '100%', transition: 'border-color .15s' }) },
  { id: 'underline', label: 'Underline', render: (t) => ({ background: 'transparent', border: 'none', borderBottom: `2px solid ${t.surfaceBorder}`, borderRadius: 0, padding: `${t.spacing}px 4px`, fontFamily: t.fontFamily, fontSize: t.fontSize, color: t.text, outline: 'none', width: '100%', transition: 'border-color .15s' }) },
  { id: 'filled', label: 'Filled', render: (t) => ({ background: '#f3f4f6', border: '2px solid transparent', borderRadius: t.radius, padding: `${t.spacing}px ${t.spacing * 1.2}px`, fontFamily: t.fontFamily, fontSize: t.fontSize, color: t.text, outline: 'none', width: '100%', transition: 'all .15s' }) },
]

const BADGE_VARIANTS = [
  { id: 'solid', label: 'Solid', render: (t) => ({ background: t.primary, color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: t.fontSize - 3, fontWeight: 700, fontFamily: t.fontFamily, letterSpacing: '.02em' }) },
  { id: 'soft', label: 'Soft', render: (t) => ({ background: t.primary + '1a', color: t.primary, borderRadius: 999, padding: '3px 10px', fontSize: t.fontSize - 3, fontWeight: 700, fontFamily: t.fontFamily, letterSpacing: '.02em' }) },
  { id: 'outline', label: 'Outlined', render: (t) => ({ background: 'transparent', color: t.primary, border: `1px solid ${t.primary}`, borderRadius: 999, padding: '2px 9px', fontSize: t.fontSize - 3, fontWeight: 700, fontFamily: t.fontFamily, letterSpacing: '.02em' }) },
  { id: 'dot', label: 'Dot', render: (t) => ({ background: t.primary + '14', color: t.primary, borderRadius: 999, padding: '3px 10px 3px 8px', fontSize: t.fontSize - 3, fontWeight: 700, fontFamily: t.fontFamily, display: 'inline-flex', alignItems: 'center', gap: 5 }) },
  { id: 'square', label: 'Square', render: (t) => ({ background: t.primary + '1a', color: t.primary, borderRadius: Math.max(3, t.radius * 0.4), padding: '3px 9px', fontSize: t.fontSize - 3, fontWeight: 700, fontFamily: t.fontFamily, letterSpacing: '.02em' }) },
  { id: 'gradient', label: 'Gradient', render: (t) => ({ background: `linear-gradient(135deg, ${t.primary}, ${t.primary}aa)`, color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: t.fontSize - 3, fontWeight: 700, fontFamily: t.fontFamily, letterSpacing: '.02em' }) },
]

const TOGGLE_VARIANTS = [
  { id: 'pill', label: 'Pill' },
  { id: 'square', label: 'Square' },
  { id: 'ios', label: 'iOS' },
]

const TABLE_VARIANTS = [
  { id: 'striped', label: 'Striped' },
  { id: 'bordered', label: 'Bordered' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'card', label: 'Card Rows' },
]

const TAB_VARIANTS = [
  { id: 'underline', label: 'Underline' },
  { id: 'pill', label: 'Pill' },
  { id: 'enclosed', label: 'Enclosed' },
  { id: 'segment', label: 'Segmented' },
]

const COMPONENT_SECTIONS = [
  { id: 'buttons', label: 'Buttons', variants: BUTTON_VARIANTS },
  { id: 'cards', label: 'Cards', variants: CARD_VARIANTS },
  { id: 'inputs', label: 'Inputs', variants: INPUT_VARIANTS },
  { id: 'badges', label: 'Badges', variants: BADGE_VARIANTS },
  { id: 'toggles', label: 'Toggles', variants: TOGGLE_VARIANTS },
  { id: 'tables', label: 'Tables', variants: TABLE_VARIANTS },
  { id: 'tabs', label: 'Tabs', variants: TAB_VARIANTS },
]

// ── Token Editor Panel ────────────────────────────────────────────────────────

function TokenField({ label, type, value, onChange, min, max, step }) {
  if (type === 'color') return (
    <label className="uib-field uib-field-color">
      <span>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
      <span className="uib-field-hex">{value}</span>
    </label>
  )
  return (
    <label className="uib-field">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step || 1} value={value} onChange={e => onChange(+e.target.value)} />
      <input type="number" className="uib-num" value={value} onChange={e => onChange(+e.target.value)} />
    </label>
  )
}

function TokenPanel({ tokens, setTokens }) {
  const set = (k, v) => setTokens(prev => ({ ...prev, [k]: v }))

  return (
    <div className="uib-tokens">
      <div className="uib-token-group">
        <div className="uib-token-group-label">Colours</div>
        <TokenField label="Primary" type="color" value={tokens.primary} onChange={v => set('primary', v)} />
        <TokenField label="Surface" type="color" value={tokens.surface} onChange={v => set('surface', v)} />
        <TokenField label="Text" type="color" value={tokens.text} onChange={v => set('text', v)} />
        <TokenField label="Subtle" type="color" value={tokens.textSub} onChange={v => set('textSub', v)} />
      </div>
      <div className="uib-token-group">
        <div className="uib-token-group-label">Shape</div>
        <TokenField label="Radius" value={tokens.radius} onChange={v => set('radius', v)} min={0} max={32} />
        <TokenField label="Border" value={tokens.borderWidth} onChange={v => set('borderWidth', v)} min={0} max={4} />
        <TokenField label="Spacing" value={tokens.spacing} onChange={v => set('spacing', v)} min={4} max={24} />
      </div>
      <div className="uib-token-group">
        <div className="uib-token-group-label">Shadow</div>
        <TokenField label="Y Offset" value={tokens.shadowY} onChange={v => set('shadowY', v)} min={-20} max={20} />
        <TokenField label="Blur" value={tokens.shadowBlur} onChange={v => set('shadowBlur', v)} min={0} max={40} />
        <TokenField label="Opacity" value={tokens.shadowOpacity} onChange={v => set('shadowOpacity', v)} min={0} max={50} />
      </div>
      <div className="uib-token-group">
        <div className="uib-token-group-label">Typography</div>
        <TokenField label="Size" value={tokens.fontSize} onChange={v => set('fontSize', v)} min={10} max={22} />
        <TokenField label="Weight" value={tokens.fontWeight} onChange={v => set('fontWeight', v)} min={300} max={800} step={100} />
      </div>
    </div>
  )
}

// ── Component Previews ────────────────────────────────────────────────────────

function TogglePreview({ variant, tokens }) {
  const [on, setOn] = useState(false)
  const w = variant.id === 'square' ? 40 : 44
  const h = variant.id === 'square' ? 22 : 24
  const r = variant.id === 'square' ? tokens.radius * 0.4 : 999
  const thumbR = variant.id === 'square' ? Math.max(1, tokens.radius * 0.3) : 999
  const thumbSize = h - 6
  return (
    <button
      type="button"
      className="uib-toggle-preview"
      onClick={() => setOn(!on)}
      style={{
        width: w, height: h, borderRadius: r, padding: 3,
        background: on ? tokens.primary : tokens.surfaceBorder,
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background .2s',
      }}
    >
      <div style={{
        width: thumbSize, height: thumbSize, borderRadius: thumbR,
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        transform: `translateX(${on ? w - thumbSize - 6 : 0}px)`,
        transition: 'transform .2s',
      }} />
    </button>
  )
}

function TablePreview({ variant, tokens }) {
  const rows = [
    { name: 'Fan Speed', status: 'Permit', value: 'Auto' },
    { name: 'Set Temp', status: 'Permit', value: '22°C' },
    { name: 'Mode', status: 'Permit', value: 'Cool' },
    { name: 'Fan On/Off', status: 'Permit', value: 'On' },
  ]
  const cellBase = { padding: `${tokens.spacing}px ${tokens.spacing * 1.2}px`, fontFamily: tokens.fontFamily, fontSize: tokens.fontSize - 1, color: tokens.text }

  if (variant.id === 'card') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: tokens.surface, border: `${tokens.borderWidth}px solid ${tokens.surfaceBorder}`, borderRadius: tokens.radius, padding: `${tokens.spacing}px ${tokens.spacing * 1.2}px`, fontFamily: tokens.fontFamily, fontSize: tokens.fontSize - 1 }}>
            <span style={{ fontWeight: 600, color: tokens.text }}>{r.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: tokens.primary + '1a', color: tokens.primary, padding: '2px 10px', borderRadius: 999, fontSize: tokens.fontSize - 3, fontWeight: 700 }}>{r.status}</span>
              <span style={{ color: tokens.textSub, fontSize: tokens.fontSize - 2 }}>{r.value}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const isStriped = variant.id === 'striped'
  const isBordered = variant.id === 'bordered'

  return (
    <table style={{ width: '100%', borderCollapse: isBordered ? 'collapse' : 'separate', borderSpacing: 0, fontFamily: tokens.fontFamily, fontSize: tokens.fontSize - 1, borderRadius: tokens.radius, overflow: 'hidden', border: isBordered ? `${tokens.borderWidth}px solid ${tokens.surfaceBorder}` : 'none' }}>
      <thead>
        <tr style={{ background: isStriped || isBordered ? tokens.primary + '0d' : 'transparent', borderBottom: `2px solid ${tokens.surfaceBorder}` }}>
          <th style={{ ...cellBase, fontWeight: 700, textAlign: 'left' }}>Property</th>
          <th style={{ ...cellBase, fontWeight: 700, textAlign: 'left' }}>Status</th>
          <th style={{ ...cellBase, fontWeight: 700, textAlign: 'right' }}>Value</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: isStriped && i % 2 === 1 ? '#f9fafb' : 'transparent', borderBottom: `1px solid ${tokens.surfaceBorder}` }}>
            <td style={{ ...cellBase, fontWeight: 500 }}>{r.name}</td>
            <td style={cellBase}>
              <span style={{ background: tokens.primary + '1a', color: tokens.primary, padding: '2px 10px', borderRadius: 999, fontSize: tokens.fontSize - 3, fontWeight: 700 }}>{r.status}</span>
            </td>
            <td style={{ ...cellBase, textAlign: 'right', color: tokens.textSub }}>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TabPreview({ variant, tokens }) {
  const [active, setActive] = useState(0)
  const tabs = ['Overview', 'Settings', 'Users']

  const tabStyle = (isActive) => {
    const base = { padding: `${tokens.spacing * 0.7}px ${tokens.spacing * 1.4}px`, fontFamily: tokens.fontFamily, fontSize: tokens.fontSize - 1, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .15s', background: 'none', color: isActive ? tokens.primary : tokens.textSub }

    switch (variant.id) {
      case 'underline': return { ...base, borderBottom: isActive ? `2px solid ${tokens.primary}` : '2px solid transparent', borderRadius: 0 }
      case 'pill': return { ...base, background: isActive ? tokens.primary + '18' : 'transparent', borderRadius: 999 }
      case 'enclosed': return { ...base, background: isActive ? tokens.surface : 'transparent', border: isActive ? `${tokens.borderWidth}px solid ${tokens.surfaceBorder}` : `${tokens.borderWidth}px solid transparent`, borderBottom: isActive ? `1px solid ${tokens.surface}` : `${tokens.borderWidth}px solid transparent`, borderRadius: `${tokens.radius}px ${tokens.radius}px 0 0`, marginBottom: -1 }
      case 'segment': return { ...base, background: isActive ? tokens.surface : 'transparent', borderRadius: tokens.radius, boxShadow: isActive ? shadow(tokens) : 'none' }
      default: return base
    }
  }

  const wrapStyle = variant.id === 'segment'
    ? { display: 'inline-flex', gap: 2, padding: 3, background: '#f3f4f6', borderRadius: tokens.radius + 3 }
    : { display: 'inline-flex', gap: variant.id === 'enclosed' ? 0 : 4, borderBottom: variant.id === 'enclosed' ? `${tokens.borderWidth}px solid ${tokens.surfaceBorder}` : 'none' }

  return (
    <div style={wrapStyle}>
      {tabs.map((tab, i) => (
        <button key={tab} type="button" style={tabStyle(i === active)} onClick={() => setActive(i)}>{tab}</button>
      ))}
    </div>
  )
}

// ── Code Generator ────────────────────────────────────────────────────────────

function styleToCSS(style) {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => {
      const prop = k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
        .replace(/^webkit-/, '-webkit-').replace(/^moz-/, '-moz-')
      const val = typeof v === 'number' && !['opacity', 'fontWeight', 'zIndex', 'flex'].includes(k) ? `${v}px` : v
      return `  ${prop}: ${val};`
    })
    .join('\n')
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function UIBuilder({ onCopy, toast }) {
  const { palette, fonts } = useProject()
  const [tokens, setTokens] = useState(() => {
    const t = { ...DEFAULT_TOKENS }
    if (palette?.colors?.length) t.primary = palette.colors[0]
    if (fonts?.heading?.family) t.fontFamily = `'${fonts.heading.family}', system-ui, sans-serif`
    return t
  })

  const [selections, setSelections] = useState({
    buttons: 'solid',
    cards: 'elevated',
    inputs: 'bordered',
    badges: 'solid',
    toggles: 'pill',
    tables: 'striped',
    tabs: 'underline',
  })

  const [codeSection, setCodeSection] = useState(null)
  const [guided, setGuided] = useState(false)
  const [guidedStep, setGuidedStep] = useState(0)

  const setVariant = useCallback((section, variantId) => {
    setSelections(prev => ({ ...prev, [section]: variantId }))
  }, [])

  const generateCSS = useCallback((sectionId) => {
    const section = COMPONENT_SECTIONS.find(s => s.id === sectionId)
    if (!section) return ''
    const variant = section.variants.find(v => v.id === selections[sectionId])
    if (!variant?.render) return `/* ${section.label} — ${variant?.label || 'N/A'} */\n/* Interactive preview only */`
    const style = variant.render(tokens)
    return `.${sectionId.slice(0, -1)} {\n${styleToCSS(style)}\n}`
  }, [tokens, selections])

  const copyCSS = useCallback((sectionId) => {
    const css = generateCSS(sectionId)
    navigator.clipboard.writeText(css)
    if (onCopy) onCopy(css)
    if (toast) toast('CSS copied')
  }, [generateCSS, onCopy, toast])

  const copyAllCSS = useCallback(() => {
    const css = COMPONENT_SECTIONS.map(s => generateCSS(s.id)).join('\n\n')
    const vars = `:root {\n  --primary: ${tokens.primary};\n  --surface: ${tokens.surface};\n  --text: ${tokens.text};\n  --text-sub: ${tokens.textSub};\n  --radius: ${tokens.radius}px;\n  --border-width: ${tokens.borderWidth}px;\n  --border-color: ${tokens.surfaceBorder};\n  --spacing: ${tokens.spacing}px;\n  --font-family: ${tokens.fontFamily};\n  --font-size: ${tokens.fontSize}px;\n  --shadow: ${shadow(tokens)};\n}\n\n`
    navigator.clipboard.writeText(vars + css)
    if (onCopy) onCopy(vars + css)
    if (toast) toast('Full design system CSS copied')
  }, [generateCSS, tokens, onCopy, toast])

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">UI Builder <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', padding: '2px 8px', borderRadius: 100, background: 'var(--brand-bg)', color: 'var(--brand)', marginLeft: 6, verticalAlign: 'middle' }}>ALPHA</span></div>
        <h1>Component Designer</h1>
        <p>Design dashboard components with live previews. Pick styles, tune tokens, copy CSS.</p>
      </div>

      {/* Guided mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          className={`btn btn-s${guided ? ' btn-accent' : ''}`}
          onClick={() => { setGuided(!guided); setGuidedStep(0) }}
        >
          {guided ? 'Exit Guided Mode' : 'Guided Mode'}
        </button>
        {!guided && <span style={{ fontSize: 11, color: 'var(--t2)' }}>Step through each component type one at a time</span>}
      </div>

      {/* Guided mode progress bar */}
      {guided && (
        <div className="uib-guided-bar" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
            {COMPONENT_SECTIONS.map((s, i) => (
              <div
                key={s.id}
                onClick={() => setGuidedStep(i)}
                style={{
                  flex: 1, height: 4, borderRadius: 2, cursor: 'pointer',
                  background: i <= guidedStep ? 'var(--accent)' : 'var(--bg-3)',
                  transition: 'background .2s',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                Step {guidedStep + 1} of {COMPONENT_SECTIONS.length}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>
                {COMPONENT_SECTIONS[guidedStep].label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-s" disabled={guidedStep === 0} onClick={() => setGuidedStep(s => s - 1)}>Back</button>
              {guidedStep < COMPONENT_SECTIONS.length - 1 ? (
                <button className="btn btn-s btn-accent" onClick={() => setGuidedStep(s => s + 1)}>Next</button>
              ) : (
                <button className="btn btn-s btn-accent" onClick={() => { copyAllCSS(); setGuided(false) }}>Finish & Copy CSS</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="uib-layout">
        <TokenPanel tokens={tokens} setTokens={setTokens} />

        <div className="uib-components">
          {COMPONENT_SECTIONS.filter((_, i) => !guided || i === guidedStep).map(section => {
            const selectedId = selections[section.id]

            return (
              <div key={section.id} className="uib-section">
                <div className="uib-section-head">
                  <h3>{section.label}</h3>
                  <div className="uib-section-actions">
                    <button className="btn-xs" onClick={() => setCodeSection(codeSection === section.id ? null : section.id)} title="View CSS">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                    </button>
                    <button className="btn-xs" onClick={() => copyCSS(section.id)} title="Copy CSS">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                    </button>
                  </div>
                </div>

                {/* Variant picker */}
                <div className="uib-variant-chips">
                  {section.variants.map(v => (
                    <button
                      key={v.id}
                      className={`uib-variant-chip${selectedId === v.id ? ' active' : ''}`}
                      onClick={() => setVariant(section.id, v.id)}
                    >{v.label}</button>
                  ))}
                </div>

                {/* Live preview */}
                <div className="uib-preview-card">
                  {section.id === 'buttons' && (
                    <div className="uib-preview-row">
                      {(() => {
                        const variant = section.variants.find(v => v.id === selectedId)
                        if (!variant?.render) return null
                        const style = variant.render(tokens)
                        return (
                          <>
                            <button type="button" style={style}>Primary</button>
                            <button type="button" style={{ ...style, opacity: 0.7 }} disabled>Disabled</button>
                            <button type="button" style={{ ...style, fontSize: tokens.fontSize - 2, padding: `${tokens.spacing * 0.7}px ${tokens.spacing * 1.5}px` }}>Small</button>
                          </>
                        )
                      })()}
                    </div>
                  )}

                  {section.id === 'cards' && (() => {
                    const variant = section.variants.find(v => v.id === selectedId)
                    if (!variant?.render) return null
                    const style = variant.render(tokens)
                    return (
                      <div style={style}>
                        <div style={{ fontFamily: tokens.fontFamily, fontWeight: 700, fontSize: tokens.fontSize + 2, color: tokens.text, marginBottom: 6 }}>Card Title</div>
                        <div style={{ fontFamily: tokens.fontFamily, fontSize: tokens.fontSize - 1, color: tokens.textSub, lineHeight: 1.5 }}>This is a preview of your card component with the selected design tokens applied.</div>
                      </div>
                    )
                  })()}

                  {section.id === 'inputs' && (() => {
                    const variant = section.variants.find(v => v.id === selectedId)
                    if (!variant?.render) return null
                    const style = variant.render(tokens)
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320 }}>
                        <label style={{ fontFamily: tokens.fontFamily, fontSize: tokens.fontSize - 2, fontWeight: 600, color: tokens.text }}>Email address</label>
                        <input type="text" placeholder="name@example.com" style={style} />
                      </div>
                    )
                  })()}

                  {section.id === 'badges' && (
                    <div className="uib-preview-row">
                      {(() => {
                        const variant = section.variants.find(v => v.id === selectedId)
                        if (!variant?.render) return null
                        const style = variant.render(tokens)
                        return (
                          <>
                            <span style={style}>{variant.id === 'dot' && <span style={{ width: 6, height: 6, borderRadius: 999, background: tokens.primary, display: 'inline-block' }} />}Active</span>
                            <span style={{ ...style, background: style.background?.replace(tokens.primary, '#10b981'), color: style.color === '#fff' ? '#fff' : '#10b981', borderColor: '#10b981' }}>{variant.id === 'dot' && <span style={{ width: 6, height: 6, borderRadius: 999, background: '#10b981', display: 'inline-block' }} />}Success</span>
                            <span style={{ ...style, background: style.background?.replace(tokens.primary, '#f59e0b'), color: style.color === '#fff' ? '#fff' : '#f59e0b', borderColor: '#f59e0b' }}>{variant.id === 'dot' && <span style={{ width: 6, height: 6, borderRadius: 999, background: '#f59e0b', display: 'inline-block' }} />}Warning</span>
                          </>
                        )
                      })()}
                    </div>
                  )}

                  {section.id === 'toggles' && (
                    <div className="uib-preview-row">
                      <TogglePreview variant={section.variants.find(v => v.id === selectedId)} tokens={tokens} />
                      <TogglePreview variant={section.variants.find(v => v.id === selectedId)} tokens={tokens} />
                    </div>
                  )}

                  {section.id === 'tables' && (
                    <TablePreview variant={section.variants.find(v => v.id === selectedId)} tokens={tokens} />
                  )}

                  {section.id === 'tabs' && (
                    <TabPreview variant={section.variants.find(v => v.id === selectedId)} tokens={tokens} />
                  )}
                </div>

                {/* Code output */}
                {codeSection === section.id && (
                  <pre className="uib-code"><code>{generateCSS(section.id)}</code></pre>
                )}
              </div>
            )
          })}

          {/* Export all */}
          <div className="uib-export-bar">
            <button className="btn btn-s" onClick={copyAllCSS}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
              Copy Full Design System CSS
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
