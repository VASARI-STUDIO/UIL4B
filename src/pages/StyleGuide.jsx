import { useState } from 'react'

const TOKENS = {
  colours: [
    { var: '--bg-0', label: 'Background Base', group: 'backgrounds' },
    { var: '--bg-1', label: 'Background 1', group: 'backgrounds' },
    { var: '--bg-2', label: 'Background 2', group: 'backgrounds' },
    { var: '--bg-3', label: 'Background 3', group: 'backgrounds' },
    { var: '--bg-4', label: 'Background 4', group: 'backgrounds' },
    { var: '--border', label: 'Border', group: 'borders' },
    { var: '--bh', label: 'Border Hover', group: 'borders' },
    { var: '--t0', label: 'Text Primary', group: 'text' },
    { var: '--t1', label: 'Text Secondary', group: 'text' },
    { var: '--t2', label: 'Text Tertiary', group: 'text' },
    { var: '--t3', label: 'Text Muted', group: 'text' },
    { var: '--accent', label: 'Accent', group: 'accent' },
    { var: '--accent-strong', label: 'Accent Strong', group: 'accent' },
    { var: '--accent-soft', label: 'Accent Soft', group: 'accent' },
    { var: '--accent-bg', label: 'Accent Background', group: 'accent' },
    { var: '--brand', label: 'Brand Blue', group: 'brand' },
    { var: '--brand-soft', label: 'Brand Soft', group: 'brand' },
    { var: '--brand-bg', label: 'Brand Background', group: 'brand' },
    { var: '--brand-glow', label: 'Brand Glow', group: 'brand' },
    { var: '--ok', label: 'Success', group: 'status' },
    { var: '--warn', label: 'Warning', group: 'status' },
    { var: '--err', label: 'Error', group: 'status' },
  ],
  typography: {
    families: [
      { var: '--font', label: 'Primary (UI)', value: 'Outfit' },
      { var: '--serif', label: 'Serif (Display)', value: 'Outfit' },
      { var: '--mono', label: 'Technical (tokens)', value: 'Outfit' },
    ],
    scale: [
      { size: 40, weight: 800, label: 'Display', tracking: '-.04em' },
      { size: 28, weight: 800, label: 'Heading 1', tracking: '-.03em' },
      { size: 20, weight: 700, label: 'Heading 2', tracking: '-.02em' },
      { size: 16, weight: 700, label: 'Heading 3', tracking: '-.01em' },
      { size: 14, weight: 600, label: 'Subtitle', tracking: '-.01em' },
      { size: 14, weight: 200, label: 'Body', tracking: '0' },
      { size: 12, weight: 400, label: 'Small', tracking: '0' },
      { size: 10, weight: 700, label: 'Eyebrow / Label', tracking: '.08em' },
    ],
  },
  spacing: [4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 64, 80],
  radii: [
    { var: '--radius-s', label: 'Small', default: '8px' },
    { var: '--radius', label: 'Default', default: '12px' },
    { var: '--radius-l', label: 'Large', default: '16px' },
    { var: '--radius-xl', label: 'XL', default: '24px' },
  ],
  shadows: [
    { var: '--shadow', label: 'Shadow (subtle)' },
    { var: '--warm-shadow', label: 'Warm Shadow' },
    { var: '--warm-shadow-lg', label: 'Warm Shadow Large' },
  ],
}

const SECTIONS = [
  { id: 'colours', label: 'Colours' },
  { id: 'typography', label: 'Typography' },
  { id: 'spacing', label: 'Spacing' },
  { id: 'components', label: 'Components' },
  { id: 'patterns', label: 'Patterns' },
]

function Swatch({ varName, label, onCopy }) {
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
      onClick={() => onCopy(`var(${varName})`)}
      title={`Click to copy var(${varName})`}
    >
      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-s)', background: `var(${varName})`, border: '1px solid var(--border)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)' }}>{label}</div>
        <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t2)' }}>{varName}</div>
      </div>
      <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)' }}>{val || '—'}</div>
    </div>
  )
}

export default function StyleGuide({ toast }) {
  const [section, setSection] = useState('colours')

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast?.(`Copied: ${text}`)).catch(() => {})
  }

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow" style={{ color: 'var(--warn)' }}>Admin Only</div>
        <h1>Design System</h1>
        <p>UIL4B's internal style reference. Tokens, components, and patterns.</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`pt-t${section === s.id ? ' on' : ''}`}
            onClick={() => setSection(s.id)}
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600 }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'colours' && (
        <>
          {['backgrounds', 'text', 'accent', 'brand', 'borders', 'status'].map(group => (
            <div key={group} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>{group}</h2>
              <div className="card" style={{ padding: 16 }}>
                {TOKENS.colours.filter(c => c.group === group).map(c => (
                  <Swatch key={c.var} varName={c.var} label={c.label} onCopy={copy} />
                ))}
                {group === 'brand' && (
                  <div style={{ fontSize: 11, color: 'var(--t1)', lineHeight: 1.7, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <strong style={{ color: 'var(--t0)' }}>Brand blue</strong> is a tech-company blue (#3B82F6 dark / #2563EB light) used <em>sparingly</em> on subtle, high-value moments to make the product feel polished: active toggle/chip states, the preview button, focus accents, and guided-flow hints. It is <strong>not</strong> a general-purpose accent — keep neutral <code style={{ fontFamily: 'var(--mono)' }}>--accent</code> for primary buttons and most UI. Reach for brand blue when an element should feel like a confident, intentional highlight.
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {section === 'typography' && (
        <>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Font Families</h2>
            <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {TOKENS.typography.families.map(f => (
                <div key={f.var} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--border)', paddingBottom: 12, cursor: 'pointer' }} onClick={() => copy(`var(${f.var})`)}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: `var(${f.var})`, color: 'var(--t0)' }}>{f.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--t2)' }}>{f.label}</div>
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)' }}>{f.var}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Type Scale</h2>
            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {TOKENS.typography.scale.map(s => (
                <div key={s.label} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                  <div style={{ fontSize: s.size, fontWeight: s.weight, letterSpacing: s.tracking, lineHeight: 1.2, color: 'var(--t0)', marginBottom: 4 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)' }}>
                    {s.size}px · {s.weight} · {s.tracking}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Conventions</h2>
            <div className="card" style={{ padding: 16, fontSize: 12, lineHeight: 1.8, color: 'var(--t1)' }}>
              <ul style={{ paddingLeft: 20 }}>
                <li><strong>Headings:</strong> 800 weight, negative letter-spacing (-.03em to -.04em)</li>
                <li><strong>Body:</strong> 200 weight, default tracking, 1.65 line-height</li>
                <li><strong>Eyebrow / labels:</strong> 10px, 700 weight, uppercase, .08em tracking</li>
                <li><strong>Tokens &amp; code:</strong> Outfit everywhere — one family across UI, tokens, numbers, and technical values</li>
                <li><strong>Subtitles:</strong> 14px, 600 weight for section headings in cards</li>
              </ul>
            </div>
          </div>
        </>
      )}

      {section === 'spacing' && (
        <>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Spacing Scale</h2>
            <div className="card" style={{ padding: 16 }}>
              {TOKENS.spacing.map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => copy(`${s}px`)}>
                  <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--t2)', width: 40, textAlign: 'right' }}>{s}px</div>
                  <div style={{ height: 8, width: s * 4, background: 'var(--accent)', borderRadius: 2, opacity: 0.6, maxWidth: '60%' }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Border Radii</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {TOKENS.radii.map(r => (
                <div key={r.var} className="card" style={{ padding: 16, textAlign: 'center', cursor: 'pointer', flex: '1 1 120px' }} onClick={() => copy(`var(${r.var})`)}>
                  <div style={{ width: 56, height: 56, borderRadius: `var(${r.var})`, border: '2px solid var(--accent)', margin: '0 auto 8px', opacity: 0.7 }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)' }}>{r.label}</div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)' }}>{r.var}</div>
                  <div style={{ fontSize: 10, color: 'var(--t2)' }}>{r.default}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Shadows</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {TOKENS.shadows.map(s => (
                <div key={s.var} className="card" style={{ padding: 20, textAlign: 'center', cursor: 'pointer', flex: '1 1 160px', boxShadow: `var(${s.var})` }} onClick={() => copy(`var(${s.var})`)}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)' }}>{s.var}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {section === 'components' && (
        <>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Buttons</h2>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
                <button className="btn btn-accent">Primary</button>
                <button className="btn">Default</button>
                <button className="btn btn-s">Small</button>
                <button className="btn btn-s btn-accent">Small Primary</button>
                <button className="btn" disabled>Disabled</button>
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)', lineHeight: 1.8 }}>
                .btn · .btn-accent · .btn-s · disabled
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Cards</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px,100%), 1fr))', gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Standard Card</div>
                <div style={{ fontSize: 12, color: 'var(--t1)' }}>Uses .card class. Background var(--bg-1), border var(--border), radius var(--radius).</div>
              </div>
              <div className="card" style={{ padding: 20, borderLeft: '3px solid var(--accent)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Accent Border</div>
                <div style={{ fontSize: 12, color: 'var(--t1)' }}>Left accent border pattern used for callouts and highlighted items.</div>
              </div>
              <div className="card" style={{ padding: 20, background: 'var(--bg-2)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Elevated Card</div>
                <div style={{ fontSize: 12, color: 'var(--t1)' }}>bg-2 background for nested or elevated content areas.</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Inputs</h2>
            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
              <input type="text" placeholder="Standard input" />
              <select><option>Select option</option></select>
              <textarea placeholder="Textarea" rows={2} style={{ resize: 'vertical' }} />
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)' }}>
                Default elements — styled via global resets. bg: var(--inp), border: var(--border).
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Badges & Tags</h2>
            <div className="card" style={{ padding: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: 'var(--accent-bg)', color: 'var(--accent)' }}>Default</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,.1)', color: 'var(--ok)' }}>Success</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: 'rgba(245,158,11,.1)', color: 'var(--warn)' }}>Warning</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,.1)', color: 'var(--err)' }}>Error</span>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Section Header</h2>
            <div className="card" style={{ padding: 20 }}>
              <div className="sec-h">
                <div className="sec-h-eyebrow">Eyebrow Label</div>
                <h1 style={{ fontSize: 20 }}>Section Title</h1>
                <p>Descriptive subtitle text goes here.</p>
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)', marginTop: 12 }}>
                .sec-h · .sec-h-eyebrow · h1 · p
              </div>
            </div>
          </div>
        </>
      )}

      {section === 'patterns' && (
        <>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Modal / Popup Pattern</h2>
            <div className="card" style={{ padding: 20, fontSize: 12, lineHeight: 1.8, color: 'var(--t1)' }}>
              <div style={{ fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>Standard modal structure (Font Gallery pattern):</div>
              <pre style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--bg-2)', padding: 16, borderRadius: 'var(--radius-s)', overflow: 'auto', marginBottom: 12 }}>{`<div className="fg-detail-overlay" onClick={onClose}>
  <div className="fg-detail" onClick={e => e.stopPropagation()}>
    <button className="fg-detail-close" onClick={onClose}>
      {/* close icon */}
    </button>
    {/* content */}
  </div>
</div>`}</pre>
              <ul style={{ paddingLeft: 20 }}>
                <li>Overlay: fixed inset, rgba(0,0,0,.55), z-index 1000</li>
                <li>Modal: bg-0, border, radius-l, max-width 800px, warm-shadow-lg</li>
                <li>Close button: absolute top-right, 36px circle, bg-2</li>
                <li>Animations: fg-fade (.2s ease) + fg-rise (.3s cubic-bezier)</li>
              </ul>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Tab Navigation</h2>
            <div className="card" style={{ padding: 20, fontSize: 12, lineHeight: 1.8, color: 'var(--t1)' }}>
              <div style={{ fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>Standard tab bar:</div>
              <pre style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--bg-2)', padding: 16, borderRadius: 'var(--radius-s)', overflow: 'auto', marginBottom: 12 }}>{`<div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
  <button className={\`pt-t\${active ? ' on' : ''}\`}>
    Tab Label
  </button>
</div>`}</pre>
              <ul style={{ paddingLeft: 20 }}>
                <li>.pt-t class for tab buttons, .on for active state</li>
                <li>7px 14px padding, 12px font, 600 weight</li>
                <li>Use for admin panels, tool sub-views, filter groups</li>
              </ul>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Status & Feedback</h2>
            <div className="card" style={{ padding: 20, fontSize: 12, lineHeight: 1.8, color: 'var(--t1)' }}>
              <ul style={{ paddingLeft: 20 }}>
                <li><strong>Toast:</strong> Bottom-centre, 3s auto-dismiss, via toast() hook</li>
                <li><strong>Empty states:</strong> Centred icon (opacity .25) + text + CTA button</li>
                <li><strong>Loading:</strong> .fg-loader spinner class</li>
                <li><strong>Type-to-confirm:</strong> For destructive actions — user types entity name to enable delete</li>
                <li><strong>Pro gates:</strong> Lock icon + "Pro only" text + upgrade CTA link</li>
              </ul>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Layout Rules</h2>
            <div className="card" style={{ padding: 20, fontSize: 12, lineHeight: 1.8, color: 'var(--t1)' }}>
              <ul style={{ paddingLeft: 20 }}>
                <li><strong>Sidebar:</strong> 248px wide (--sw), fixed left, collapsible on mobile</li>
                <li><strong>TopBar:</strong> 56px height (--top-h), sticky</li>
                <li><strong>Main content:</strong> .sec wrapper, .sec-h for page header</li>
                <li><strong>Grids:</strong> auto-fill minmax(min(300px,100%), 1fr) for card layouts</li>
                <li><strong>Transition:</strong> .2s cubic-bezier(.16,1,.3,1) for all interactive elements</li>
                <li><strong>Data tables:</strong> DataTable component with grid layout, striped rows</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
