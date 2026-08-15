import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useTheme } from '../contexts/ThemeContext'
import { generateHarmony, textColorForBg } from '../utils/colors'
import useModalDialog from '../hooks/useModalDialog'

// A universal "preview your colour system on real UI" popup. It reads the
// current design's palette and state colours straight from ProjectContext, so
// it reflects whatever the user has built — and can be opened from any tool via
// the top bar, not just the colour page.

const ROLES = ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP']

const STATE_PRESETS = {
  success: [
    { name: 'Emerald', shades: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'] },
    { name: 'Green', shades: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
    { name: 'Teal', shades: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'] },
    { name: 'Apple', shades: ['#f0fdf4', '#dcfce7', '#b6f5cc', '#7aedaa', '#4ade80', '#34C759', '#2aa648', '#1f8a3a', '#186d2e', '#125524'] },
    { name: 'Material', shades: ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4CAF50', '#43a047', '#388e3c', '#2e7d32', '#1b5e20'] },
    { name: 'Tailwind', shades: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
  ],
  warning: [
    { name: 'Amber', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
    { name: 'Yellow', shades: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'] },
    { name: 'Orange', shades: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'] },
    { name: 'Apple', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#FF9500', '#e08200', '#b86a00', '#925300', '#6e3e00'] },
    { name: 'Material', shades: ['#fff8e1', '#ffecb3', '#ffe082', '#ffd54f', '#ffca28', '#FF9800', '#fb8c00', '#f57c00', '#ef6c00', '#e65100'] },
    { name: 'Tailwind', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
  ],
  error: [
    { name: 'Red', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
    { name: 'Rose', shades: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'] },
    { name: 'Pink', shades: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'] },
    { name: 'Apple', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#FF3B30', '#e0342a', '#b82a22', '#91211b', '#6e1914'] },
    { name: 'Material', shades: ['#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#F44336', '#e53935', '#d32f2f', '#c62828', '#b71c1c'] },
    { name: 'Tailwind', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
  ],
  info: [
    { name: 'Blue', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] },
    { name: 'Sky', shades: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'] },
    { name: 'Indigo', shades: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'] },
    { name: 'Apple', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#007AFF', '#0062d6', '#004db3', '#003d8f', '#002e6b'] },
    { name: 'Material', shades: ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196F3', '#1e88e5', '#1565c0', '#0d47a1', '#0a3880'] },
    { name: 'Tailwind', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] },
  ],
}

const PREVIEW_RADIUS = {
  none:        { xs: 0, s: 0, m: 0, l: 0, pill: 0 },
  subtle:      { xs: 2, s: 3, m: 4, l: 6, pill: 8 },
  default:     { xs: 3, s: 6, m: 8, l: 12, pill: 20 },
  pronounced:  { xs: 8, s: 16, m: 24, l: 32, pill: 9999 },
}

const ROUNDING_OPTIONS = [
  { id: 'none', label: 'Square' },
  { id: 'subtle', label: 'Subtle' },
  { id: 'default', label: 'Medium' },
  { id: 'pronounced', label: 'Round' },
]

// Responsive preview — constrain the showcase to a device width so the grids
// reflow exactly as they would on a real screen. `width: null` means full-width.
const DEVICE_OPTIONS = [
  { id: 'full', label: 'Desktop', width: null, icon: (<><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>) },
  { id: 'tablet', label: 'Tablet', width: 768, icon: (<><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></>) },
  { id: 'mobile', label: 'Mobile', width: 390, icon: (<><rect x="6" y="2" width="12" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></>) },
]

function themeTokens(isDark) {
  if (isDark) return { bg: '#1e1c18', surface: '#161412', surfaceAlt: '#28251f', border: '#353028', borderStrong: '#423c32', text: '#f3efe8', textMuted: '#a8a29e', textFaint: '#706b64', textGhost: '#4a453e', card: '#1e1c18', inputBg: '#28251f' }
  return { bg: '#ffffff', surface: '#f9f6f1', surfaceAlt: '#eee9e0', border: '#eee9e0', borderStrong: '#e2dcd2', text: '#1a1814', textMuted: '#5c5650', textFaint: '#8a847e', textGhost: '#b8b2aa', card: '#ffffff', inputBg: '#ffffff' }
}

function PreviewBtn({ children, bg, color, border, hoverBg, hoverBorder, radius = 8, style = {} }) {
  const [hover, setHover] = useState(false)
  const [active, setActive] = useState(false)
  const base = { padding: '8px 20px', borderRadius: radius, border: border || 'none', background: bg, color, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s ease', transform: active ? 'scale(.97)' : hover ? 'translateY(-1px)' : 'none', opacity: active ? .9 : 1, boxShadow: hover && !active ? '0 2px 8px rgba(0,0,0,.1)' : 'none', ...style }
  if (hover && hoverBg) base.background = hoverBg
  if (hover && hoverBorder) base.border = hoverBorder
  return <button style={base} onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setActive(false) }} onMouseDown={() => setActive(true)} onMouseUp={() => setActive(false)}>{children}</button>
}

function PreviewNavItem({ label, isActive, activeBg, activeColor, idleBg, idleColor, hoverBg, radius = 6, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}
      style={{ padding: '7px 16px', borderRadius: radius, fontSize: 12, fontWeight: isActive ? 600 : 400, cursor: 'pointer', transition: 'all .15s ease', background: isActive ? activeBg : hover ? (hoverBg || 'rgba(128,128,128,.08)') : (idleBg || 'transparent'), color: isActive ? activeColor : idleColor }}
    >{label}</div>
  )
}

function PreviewTableRow({ children, bg, hoverBg, style = {} }) {
  const [hover, setHover] = useState(false)
  return <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ ...style, background: hover ? hoverBg : bg, transition: 'background .12s ease', cursor: 'default' }}>{children}</div>
}

function PreviewToast({ icon, msg, accentColor, iconBg, iconColor, bg, border, textColor, radius = 8, iconRadius = 6 }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 6, borderRadius: radius, background: bg, border: `1px solid ${border}`, borderLeft: `3px solid ${accentColor}`, transition: 'all .15s ease', transform: hover ? 'translateX(2px)' : 'none', cursor: 'default' }}
    >
      <div style={{ width: 22, height: 22, borderRadius: iconRadius, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: 12, color: textColor, flex: 1 }}>{msg}</span>
    </div>
  )
}

export default function UIPreviewModal({ open, onClose }) {
  const { design } = useProject()
  const { theme } = useTheme()

  const [previewRounding, setPreviewRounding] = useState(() => {
    try { return localStorage.getItem('vs-preview-rounding') || 'default' } catch { return 'default' }
  })
  const [previewDevice, setPreviewDevice] = useState(() => {
    try { return localStorage.getItem('vs-preview-device') || 'full' } catch { return 'full' }
  })
  const [previewTab, setPreviewTab] = useState('Dashboard')
  const [previewEmail, setPreviewEmail] = useState('')
  const [previewEmailFocused, setPreviewEmailFocused] = useState(false)
  const [previewCheckbox, setPreviewCheckbox] = useState(false)
  const [previewRadio, setPreviewRadio] = useState('option1')
  const [previewFormToast, setPreviewFormToast] = useState(false)

  useEffect(() => {
    try { localStorage.setItem('vs-preview-rounding', previewRounding) } catch { /* quota */ }
  }, [previewRounding])

  useEffect(() => {
    try { localStorage.setItem('vs-preview-device', previewDevice) } catch { /* quota */ }
  }, [previewDevice])

  // Scroll lock, Escape, focus trap and focus restoration from the shared hook.
  // This had the first two only, and Tab walked out of a dialog that claimed to
  // be modal.
  const dialogRef = useModalDialog(onClose, { enabled: open })

  // Close the preview when the user navigates to a different page (e.g. clicks a
  // nav item) — the preview should never linger over a page it doesn't belong to.
  const location = useLocation()
  const pathRef = useRef(location.pathname)
  useEffect(() => {
    if (open && location.pathname !== pathRef.current) onClose()
    pathRef.current = location.pathname
  }, [location.pathname, open, onClose])

  if (!open) return null

  // Pull the palette from the live design; fall back to regenerating from the
  // base colour if a saved colours array isn't present yet.
  const savedColors = design?.palette?.colors
  const allColors = (Array.isArray(savedColors) && savedColors.length)
    ? savedColors
    : generateHarmony(design?.palette?.base || '#0051FF', design?.palette?.harmony || 'analogous')
  const stateColors = design?.states || { success: 4, warning: 4, error: 4, info: 4 }

  const primary = allColors[0]
  const secondary = allColors[1] || allColors[0]
  const accent = allColors[2] || allColors[0]

  const isDark = theme === 'dark'
  const tk = themeTokens(isDark)
  const sidebarTk = themeTokens(!isDark)
  const okShade = STATE_PRESETS.success[stateColors.success].shades
  const rd = PREVIEW_RADIUS[previewRounding] || PREVIEW_RADIUS.default
  const deviceWidth = (DEVICE_OPTIONS.find(d => d.id === previewDevice) || DEVICE_OPTIONS[0]).width

  return (
    // role="dialog" was on the OVERLAY, which made the scrim part of the dialog
    // and gave the whole backdrop the dialog's accessible name. The scrim is
    // presentation; the panel is the dialog.
    <div className="uip-overlay" onClick={onClose} role="presentation">
      <div
        className="uip-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="UI preview"
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="uip-modal-head">
          <div>
            <div className="uip-modal-eyebrow">Live preview</div>
            <h2 className="uip-modal-title">Your colour system on real UI</h2>
          </div>
          <div className="uip-modal-head-actions">
            <div className="uip-device" role="group" aria-label="Preview width">
              {DEVICE_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setPreviewDevice(opt.id)}
                  className={`uip-device-btn${previewDevice === opt.id ? ' is-active' : ''}`}
                  title={opt.label} aria-label={opt.label} aria-pressed={previewDevice === opt.id}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{opt.icon}</svg>
                </button>
              ))}
            </div>
            <div className="uip-rounding">
              {ROUNDING_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setPreviewRounding(opt.id)}
                  className={`uip-rounding-btn${previewRounding === opt.id ? ' is-active' : ''}`}
                  style={{ borderRadius: (PREVIEW_RADIUS[opt.id] || PREVIEW_RADIUS.default).m }}
                >{opt.label}</button>
              ))}
            </div>
            <button className="uip-close" onClick={onClose} aria-label="Close preview">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="uip-modal-body">
          <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.6 }}>
            Preview your palette and state colours on real components. Use the device controls (top right) to see how the layout reflows on tablet and mobile.
          </p>

          <div className="uip-canvas" style={{ maxWidth: deviceWidth || '100%', margin: deviceWidth ? '0 auto' : undefined, transition: 'max-width .3s cubic-bezier(.2,0,0,1)' }}>
          {/* ── App Layout ── */}
          <div style={{ borderRadius: rd.l, overflow: 'hidden', border: `1px solid ${tk.border}`, marginBottom: 24 }}>
            <div className="uip-layout">
              <div className="uip-sidebar" style={{ background: sidebarTk.bg, borderRight: `1px solid ${sidebarTk.border}` }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: sidebarTk.text, marginBottom: 12 }}>AppName</span>
                {['Dashboard', 'Projects', 'Analytics', 'Settings'].map((item, idx) => (
                  <PreviewNavItem key={item} label={item} isActive={idx === 0} activeBg={primary} activeColor={textColorForBg(primary)} idleColor={sidebarTk.textMuted} hoverBg={sidebarTk.surfaceAlt} radius={rd.s} />
                ))}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: accent, color: textColorForBg(accent), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>A</div>
                  <span style={{ fontSize: 11, color: sidebarTk.textMuted }}>Alex M.</span>
                </div>
              </div>
              <div style={{ flex: 1, background: tk.bg, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: tk.text }}>Dashboard</div>
                  <PreviewBtn bg={primary} color={textColorForBg(primary)} radius={rd.s} style={{ fontSize: 11, padding: '6px 16px' }}>New Project</PreviewBtn>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                  {allColors.slice(0, 4).map((c, i) => (
                    <div key={i} style={{ borderRadius: rd.m, border: `1px solid ${tk.border}`, padding: 14, background: tk.card }}>
                      <div style={{ width: '100%', height: 4, borderRadius: rd.xs, background: c, marginBottom: 10 }} />
                      <div style={{ fontSize: 20, fontWeight: 700, color: tk.text }}>{[247, '1.2k', '89%', '4.8s'][i]}</div>
                      <div style={{ fontSize: 10, color: tk.textFaint, marginTop: 2 }}>{['Views', 'Revenue', 'Uptime', 'Latency'][i]}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
                  <div style={{ borderRadius: rd.m, border: `1px solid ${tk.border}`, padding: 14, background: tk.card }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: tk.textFaint, marginBottom: 8 }}>Recent Activity</div>
                    {['Design tokens updated', 'New team member added', 'Export completed'].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < 2 ? `1px solid ${tk.border}` : 'none' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: allColors[i] || primary }} />
                        <span style={{ fontSize: 11, color: tk.textMuted }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderRadius: rd.m, border: `1px solid ${tk.border}`, padding: 14, background: tk.card }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: tk.textFaint, marginBottom: 8 }}>Quick Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <PreviewBtn bg={primary} color={textColorForBg(primary)} radius={rd.s} style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}>Export Design System</PreviewBtn>
                      <PreviewBtn bg="transparent" color={tk.text} border={`1px solid ${tk.border}`} hoverBg={tk.surfaceAlt} radius={rd.s} style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}>View Documentation</PreviewBtn>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Component Showcase ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 16 }}>
            {/* Card */}
            <div style={{ borderRadius: rd.l, overflow: 'hidden', border: `1px solid ${tk.border}`, background: tk.bg }}>
              <div style={{ padding: 22 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, color: tk.text }}>Dashboard Overview</h3>
                <p style={{ fontSize: 13, color: tk.textMuted, lineHeight: 1.6, marginBottom: 16 }}>Your design system is ready. Review the metrics below.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PreviewBtn bg={primary} color={textColorForBg(primary)} radius={rd.m}>Get Started</PreviewBtn>
                  <PreviewBtn bg="transparent" color={secondary} border={`1px solid ${secondary}`} hoverBg={`${secondary}12`} radius={rd.m}>Learn More</PreviewBtn>
                </div>
              </div>
            </div>

            {/* Profile Card */}
            <div style={{ borderRadius: rd.l, overflow: 'hidden', border: `1px solid ${tk.border}`, background: tk.bg }}>
              <div style={{ height: 56, background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
              <div style={{ padding: '0 18px 18px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: primary, color: textColorForBg(primary), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, border: `3px solid ${tk.bg}`, marginTop: -24, marginBottom: 10 }}>A</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, color: tk.text }}>Alex Morgan</div>
                <div style={{ fontSize: 12, color: tk.textFaint, marginBottom: 10 }}>Senior Product Designer</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <span style={{ padding: '3px 10px', borderRadius: rd.pill, fontSize: 10, fontWeight: 600, background: `${primary}18`, color: primary }}>Design</span>
                  <span style={{ padding: '3px 10px', borderRadius: rd.pill, fontSize: 10, fontWeight: 600, background: `${secondary}18`, color: secondary }}>Systems</span>
                  <span style={{ padding: '3px 10px', borderRadius: rd.pill, fontSize: 10, fontWeight: 600, background: `${accent}18`, color: accent }}>Research</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PreviewBtn bg={primary} color={textColorForBg(primary)} radius={rd.s} style={{ flex: 1, padding: '7px', fontSize: 11 }}>Follow</PreviewBtn>
                  <PreviewBtn bg={tk.card} color={tk.text} border={`1px solid ${tk.border}`} hoverBg={tk.surfaceAlt} radius={rd.s} style={{ flex: 1, padding: '7px', fontSize: 11 }}>Message</PreviewBtn>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div style={{ borderRadius: rd.l, overflow: 'hidden', border: `1px solid ${tk.border}`, background: tk.bg }}>
              <div style={{ padding: 22 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: rd.xs, background: primary, color: textColorForBg(primary), display: 'inline-block', marginBottom: 6 }}>PRO</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: tk.text }}>$29</span>
                  <span style={{ fontSize: 13, color: tk.textFaint }}>/month</span>
                </div>
                {['Unlimited projects', 'Priority support', 'Custom branding', 'API access'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: isDark ? `${okShade[6]}30` : okShade[1], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 10, color: okShade[isDark ? 3 : 6], fontWeight: 700 }}>&#10003;</span>
                    </div>
                    <span style={{ fontSize: 12, color: tk.textMuted }}>{f}</span>
                  </div>
                ))}
                <PreviewBtn bg={primary} color={textColorForBg(primary)} radius={rd.m} style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}>Get Started</PreviewBtn>
              </div>
            </div>

            {/* Alerts */}
            <div style={{ borderRadius: rd.l, overflow: 'hidden', border: `1px solid ${tk.border}`, background: tk.bg, padding: 18 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: tk.textFaint, display: 'block', marginBottom: 12 }}>Alerts</span>
              {['success', 'warning', 'error', 'info'].map(state => {
                const shade = STATE_PRESETS[state][stateColors[state]].shades
                return (
                  <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: rd.m, background: isDark ? `${shade[8]}22` : shade[0], border: `1px solid ${isDark ? shade[8] : shade[2]}`, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: shade[5], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: isDark ? shade[2] : shade[8], fontWeight: 500, flex: 1, textTransform: 'capitalize' }}>{state} alert message</span>
                  </div>
                )
              })}
            </div>

            {/* Chat */}
            <div style={{ borderRadius: rd.l, overflow: 'hidden', border: `1px solid ${tk.border}`, background: tk.surface, padding: 18 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: tk.textFaint, display: 'block', marginBottom: 12 }}>Chat</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: secondary, color: textColorForBg(secondary), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>J</div>
                  <div style={{ padding: '8px 14px', borderRadius: `${rd.l}px ${rd.l}px ${rd.l}px ${rd.xs}px`, background: tk.card, border: `1px solid ${tk.border}`, fontSize: 12, color: tk.text, maxWidth: '80%' }}>
                    How does this palette look?
                    <div style={{ fontSize: 9, color: tk.textGhost, marginTop: 4 }}>10:32 AM</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <div style={{ padding: '8px 14px', borderRadius: `${rd.l}px ${rd.l}px ${rd.xs}px ${rd.l}px`, background: primary, color: textColorForBg(primary), fontSize: 12, maxWidth: '80%' }}>
                    Looks great! Ready to ship.
                    <div style={{ fontSize: 9, opacity: .7, marginTop: 4 }}>10:33 AM</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div style={{ borderRadius: rd.l, overflow: 'hidden', border: `1px solid ${tk.border}`, background: tk.bg, padding: 18 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: tk.textFaint, display: 'block', marginBottom: 12 }}>Badges &amp; Tags</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {allColors.map((c, i) => (
                  <span key={i} style={{ padding: '4px 12px', borderRadius: rd.pill, fontSize: 11, fontWeight: 600, background: c, color: textColorForBg(c) }}>
                    {ROLES[i] || `Tag ${i + 1}`}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allColors.map((c, i) => (
                  <span key={i} style={{ padding: '4px 12px', borderRadius: rd.pill, fontSize: 11, fontWeight: 500, border: `1px solid ${c}`, color: c }}>
                    Outline {i + 1}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Data Table ── */}
          <div style={{ borderRadius: rd.l, overflow: 'hidden', border: `1px solid ${tk.border}`, marginTop: 16 }}>
            <div style={{ padding: '14px 18px', background: tk.bg }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: tk.textFaint, display: 'block', marginBottom: 12 }}>Data Table</span>
              <div style={{ borderRadius: rd.m, border: `1px solid ${tk.border}`, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px', padding: '8px 14px', background: tk.surfaceAlt, fontSize: 10, fontWeight: 700, color: tk.textMuted, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  <span>Name</span><span>Status</span><span>Role</span><span></span>
                </div>
                {[
                  { name: 'Sarah Chen', status: 'Active', role: 'Admin', stateKey: 'success' },
                  { name: 'James Wilson', status: 'Pending', role: 'Editor', stateKey: 'warning' },
                  { name: 'Eva Martinez', status: 'Inactive', role: 'Viewer', stateKey: 'error' },
                ].map((row, ri) => {
                  const stShade = STATE_PRESETS[row.stateKey][stateColors[row.stateKey]].shades
                  return (
                    <PreviewTableRow key={ri} bg={tk.card} hoverBg={tk.surfaceAlt}
                      style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px', padding: '10px 14px', borderTop: `1px solid ${tk.border}`, alignItems: 'center', fontSize: 12 }}
                    >
                      <span style={{ fontWeight: 600, color: tk.text }}>{row.name}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: stShade[5] }} />
                        <span style={{ fontSize: 11, color: stShade[isDark ? 3 : 7] }}>{row.status}</span>
                      </span>
                      <span style={{ fontSize: 11, color: tk.textFaint }}>{row.role}</span>
                      <PreviewBtn bg={`${primary}12`} color={primary} border={`1px solid ${primary}30`} hoverBg={`${primary}22`} radius={rd.xs} style={{ padding: '4px 10px', fontSize: 10 }}>Edit</PreviewBtn>
                    </PreviewTableRow>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Toasts / Progress / Form */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 16, marginTop: 16 }}>
            <div style={{ borderRadius: rd.l, overflow: 'hidden', border: `1px solid ${tk.border}`, background: tk.bg, padding: 18 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: tk.textFaint, display: 'block', marginBottom: 12 }}>Notifications</span>
              {[
                { type: 'success', msg: 'Changes saved', icon: '✓' },
                { type: 'error', msg: 'Upload failed', icon: '✕' },
                { type: 'warning', msg: 'Storage at 90%', icon: '!' },
                { type: 'info', msg: 'Update available', icon: 'i' },
              ].map(toast => {
                const shade = STATE_PRESETS[toast.type][stateColors[toast.type]].shades
                return <PreviewToast key={toast.type} icon={toast.icon} msg={toast.msg} accentColor={shade[5]} iconBg={isDark ? `${shade[7]}30` : shade[1]} iconColor={shade[isDark ? 3 : 7]} bg={tk.card} border={tk.border} textColor={tk.text} radius={rd.m} iconRadius={rd.s} />
              })}
            </div>

            {/* Progress */}
            <div style={{ borderRadius: rd.l, overflow: 'hidden', border: `1px solid ${tk.border}`, background: tk.bg, padding: 18 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: tk.textFaint, display: 'block', marginBottom: 12 }}>Progress</span>
              {[
                { label: 'Design tokens', pct: 85, color: primary },
                { label: 'Component library', pct: 62, color: secondary },
                { label: 'Documentation', pct: 34, color: accent },
                { label: 'Testing', pct: 91, color: allColors[3] || primary },
              ].map(p => (
                <div key={p.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: tk.textMuted }}>{p.label}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600, color: p.color }}>{p.pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: rd.xs, background: tk.surfaceAlt, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.pct}%`, borderRadius: rd.xs, background: p.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation + Form */}
            <div style={{ borderRadius: rd.l, overflow: 'hidden', border: `1px solid ${tk.border}`, background: tk.bg, padding: 18, position: 'relative' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: tk.textFaint, display: 'block', marginBottom: 10 }}>Form</span>
              <div style={{ display: 'flex', gap: 4, background: tk.surfaceAlt, borderRadius: rd.m, padding: 4, marginBottom: 14 }}>
                {['Dashboard', 'Projects', 'Settings'].map(tab => (
                  <PreviewNavItem key={tab} label={tab} isActive={previewTab === tab} activeBg={primary} activeColor={textColorForBg(primary)} idleColor={tk.textMuted} hoverBg={tk.border} radius={rd.s} onClick={() => setPreviewTab(tab)} />
                ))}
              </div>

              {previewTab === 'Dashboard' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: tk.text, marginBottom: 8 }}>Welcome back</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    {[{ label: 'Tasks', val: '12' }, { label: 'Done', val: '8' }].map(s => (
                      <div key={s.label} style={{ padding: '8px 10px', borderRadius: rd.s, background: tk.surfaceAlt, border: `1px solid ${tk.border}` }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: primary }}>{s.val}</div>
                        <div style={{ fontSize: 9, color: tk.textFaint }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewTab === 'Projects' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: tk.text, marginBottom: 8 }}>Your projects</div>
                  {['Brand Redesign', 'Mobile App', 'Marketing Site'].map((p, i) => (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < 2 ? `1px solid ${tk.border}` : 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: allColors[i] || primary }} />
                      <span style={{ fontSize: 11, color: tk.textMuted, flex: 1 }}>{p}</span>
                      <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: tk.textFaint }}>{['Active', 'Draft', 'Review'][i]}</span>
                    </div>
                  ))}
                </div>
              )}

              {previewTab === 'Settings' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: tk.text, marginBottom: 8 }}>Preferences</div>
                  {['Dark mode', 'Notifications', 'Auto-save'].map((s, i) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 2 ? `1px solid ${tk.border}` : 'none' }}>
                      <span style={{ fontSize: 11, color: tk.textMuted }}>{s}</span>
                      <div style={{ width: 28, height: 16, borderRadius: 8, background: i === 0 ? primary : tk.surfaceAlt, border: `1px solid ${i === 0 ? primary : tk.borderStrong}`, position: 'relative', cursor: 'default' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 1, left: i === 0 ? 14 : 1, transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tk.textMuted, marginBottom: 4 }}>Email Address</label>
              <input
                type="email"
                value={previewEmail}
                onChange={e => setPreviewEmail(e.target.value)}
                onFocus={() => setPreviewEmailFocused(true)}
                onBlur={() => setPreviewEmailFocused(false)}
                placeholder="user@example.com"
                style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: rd.m, border: `1px solid ${previewEmailFocused ? primary : tk.borderStrong}`, background: tk.inputBg, fontSize: 13, color: tk.text, marginBottom: 10, outline: 'none', transition: 'border-color .15s ease', boxShadow: previewEmailFocused ? `0 0 0 2px ${primary}25` : 'none', fontFamily: 'inherit' }}
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: tk.textMuted, cursor: 'pointer', marginBottom: 8 }} onClick={() => setPreviewCheckbox(!previewCheckbox)}>
                <div style={{ width: 16, height: 16, borderRadius: rd.xs, border: `1.5px solid ${previewCheckbox ? primary : tk.borderStrong}`, background: previewCheckbox ? primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', flexShrink: 0 }}>
                  {previewCheckbox && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={textColorForBg(primary)} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                Remember me
              </label>

              <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                {[{ id: 'option1', label: 'Personal' }, { id: 'option2', label: 'Business' }].map(opt => (
                  <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: tk.textMuted, cursor: 'pointer' }} onClick={() => setPreviewRadio(opt.id)}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${previewRadio === opt.id ? primary : tk.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', flexShrink: 0 }}>
                      {previewRadio === opt.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: primary }} />}
                    </div>
                    {opt.label}
                  </label>
                ))}
              </div>

              <PreviewBtn bg={primary} color={textColorForBg(primary)} radius={rd.m} style={{ width: '100%', justifyContent: 'center' }}>
                <span onClick={() => { setPreviewFormToast(true); setTimeout(() => setPreviewFormToast(false), 2000) }}>Submit</span>
              </PreviewBtn>

              {previewFormToast && (
                <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, padding: '8px 12px', borderRadius: rd.s, background: okShade[isDark ? 8 : 1], border: `1px solid ${okShade[isDark ? 6 : 3]}`, display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn .2s ease', zIndex: 2 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: okShade[5], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>&#10003;</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: okShade[isDark ? 2 : 7] }}>Submitted successfully!</span>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
