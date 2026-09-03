import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../contexts/I18nContext'
import { useProject } from '../contexts/ProjectContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { TOOLS } from '../data/tools'
import { SECTIONS, resolveSection } from '../data/sections'
import { buildStyleGuideHTML, buildCSSVars } from '../utils/exportBuilder'
import { useAppearance } from '../contexts/AppearanceContext'
import { ADMIN_EMAILS } from '../utils/constants'
import UIPreviewModal from './UIPreviewModal'
import UserName from './UserName'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
// The drawer sidebar appears at ≤860px (see global.css responsive cascade);
// match that so a section-select opens the drawer exactly when it exists.
const MOBILE_QUERY = '(max-width: 860px)'

const STATE_PRESETS_KEY = 'vs-state-shades'
const PREVIEW_ROUNDING_KEY = 'vs-preview-rounding'

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function ExportDropdown({ onSaveProject }) {
  const [open, setOpen] = useState(false)
  const [exportTab, setExportTab] = useState('colour')
  const ref = useRef(null)
  const { design } = useProject()
  const { theme } = useTheme()
  const { rounding, density } = useAppearance()
  const { user } = useAuth()
  const { isPro } = useSubscription()
  const { requireLogin } = useLoginPrompt()
  const navigate = useNavigate()

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const getStateShades = () => {
    try {
      const raw = localStorage.getItem(STATE_PRESETS_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  const getPreviewRounding = () => {
    try { return localStorage.getItem(PREVIEW_ROUNDING_KEY) || rounding } catch { return rounding }
  }

  const requireAuth = async (action) => {
    if (!user) {
      setOpen(false)
      const signedInUser = await requireLogin('export this design')
      if (!signedInUser) return
    }
    action()
  }

  const hasFonts = !!design.fonts?.heading?.family
  const hasScale = !!design.typeScale?.base
  const hasGradient = design.gradient?.stops?.some(s => s.color)
  const missingSections = []
  if (!hasFonts) missingSections.push('Typography')
  if (!hasScale) missingSections.push('Type Scale')
  if (!hasGradient) missingSections.push('Gradient')
  const isDesignComplete = missingSections.length === 0

  const exportRoundingVal = () => getPreviewRounding()

  const exportPalettePNG = () => {
    const colors = design.palette?.colors || []
    if (!colors.length) return
    const w = 200, h = 260, sw = Math.max(60, Math.floor((w - 20) / colors.length))
    const totalW = sw * colors.length + 20
    const canvas = document.createElement('canvas')
    canvas.width = totalW
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, totalW, h)
    colors.forEach((c, i) => {
      const x = 10 + i * sw
      ctx.fillStyle = c
      ctx.fillRect(x, 10, sw - 4, 180)
      ctx.fillStyle = '#fff'
      ctx.font = '600 10px monospace'
      ctx.fillText(c.toUpperCase(), x + 4, 210)
    })
    ctx.fillStyle = '#555'
    ctx.font = '500 9px sans-serif'
    ctx.fillText('UIL4B Colour System', 10, h - 12)
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'palette.png'
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
    setOpen(false)
  }

  const exportPaletteSVG = () => {
    const colors = design.palette?.colors || []
    if (!colors.length) return
    const sw = 80, pad = 10, gap = 4
    const w = pad * 2 + colors.length * (sw + gap) - gap
    const h = 220
    const rects = colors.map((c, i) => {
      const x = pad + i * (sw + gap)
      return `<rect x="${x}" y="${pad}" width="${sw}" height="160" rx="6" fill="${c}"/><text x="${x + 4}" y="192" fill="#aaa" font-family="monospace" font-size="10" font-weight="600">${c.toUpperCase()}</text>`
    }).join('\n  ')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n  <rect width="${w}" height="${h}" rx="10" fill="#111"/>\n  ${rects}\n  <text x="${pad}" y="${h - 10}" fill="#555" font-family="sans-serif" font-size="9">UIL4B Colour System</text>\n</svg>`
    downloadFile(svg, 'palette.svg', 'image/svg+xml')
    setOpen(false)
  }

  const exportTailwind = () => {
    const colors = design.palette?.colors || []
    const names = ['primary', 'secondary', 'accent', 'neutral', 'surface']
    const colorEntries = colors.map((c, i) => `        '${names[i] || `color-${i + 1}`}': '${c}',`).join('\n')
    const fontSection = design.fonts?.heading ? `      fontFamily: {\n        heading: ['${design.fonts.heading.family}', 'system-ui', 'sans-serif'],\n${design.fonts?.body ? `        body: ['${design.fonts.body.family}', 'system-ui', 'sans-serif'],\n` : ''}      },\n` : ''
    const tw = `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${colorEntries}\n      },\n${fontSection}    },\n  },\n}\n`
    downloadFile(tw, 'tailwind.config.js', 'text/javascript')
    setOpen(false)
  }

  const exportColourCSS = () => {
    const css = buildCSSVars({
      palette: design.palette,
      tints: design.tints,
      states: design.states,
      stateShades: getStateShades(),
      appearance: { rounding: exportRoundingVal(), density },
    })
    downloadFile(css + '\n', 'colours.css', 'text/css')
    setOpen(false)
  }

  const copyColourCSS = () => {
    const css = buildCSSVars({
      palette: design.palette,
      tints: design.tints,
      states: design.states,
      stateShades: getStateShades(),
      appearance: { rounding: exportRoundingVal(), density },
    })
    navigator.clipboard.writeText(css)
    setOpen(false)
  }

  const exportStyleGuideHTML = () => requireAuth(() => {
    const html = buildStyleGuideHTML({
      design,
      stateShades: getStateShades(),
      theme,
      projectName: 'My Style Guide',
      appearance: { rounding: exportRoundingVal(), density },
      watermark: !isPro,
    })
    downloadFile(html, 'style-guide.html', 'text/html')
    setOpen(false)
  })

  const exportStyleGuideCSS = () => {
    const css = buildCSSVars({
      palette: design.palette,
      tints: design.tints,
      states: design.states,
      fonts: design.fonts,
      typeScale: design.typeScale,
      stateShades: getStateShades(),
      appearance: { rounding: exportRoundingVal(), density },
    })
    downloadFile(css + '\n', 'design.css', 'text/css')
    setOpen(false)
  }

  const copyStyleGuideCSS = () => {
    const css = buildCSSVars({
      palette: design.palette,
      tints: design.tints,
      states: design.states,
      fonts: design.fonts,
      typeScale: design.typeScale,
      stateShades: getStateShades(),
      appearance: { rounding: exportRoundingVal(), density },
    })
    navigator.clipboard.writeText(css)
    setOpen(false)
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 600, border: 'none',
    cursor: 'pointer', transition: 'all .15s', borderRadius: 'var(--radius-s)',
    background: active ? 'var(--card)' : 'transparent',
    color: active ? 'var(--t0)' : 'var(--t2)',
    boxShadow: active ? 'var(--warm-shadow)' : 'none',
    fontFamily: 'inherit',
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="topbar-btn-export"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label="Export"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span className="topbar-btn-export-label"><span className="topbar-btn-export-label-i">Export</span></span>
        <svg className={'topbar-btn-export-chev' + (open ? ' is-open' : '')} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="export-dropdown">
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 3, padding: '6px 8px 4px', background: 'var(--bg-2)', borderRadius: 'var(--radius-s)', margin: '0 8px 6px' }}>
            <button style={tabStyle(exportTab === 'colour')} onClick={() => setExportTab('colour')}>Colour System</button>
            <button style={tabStyle(exportTab === 'design')} onClick={() => setExportTab('design')}>Design System</button>
          </div>

          {exportTab === 'colour' ? (
            <>
              <button className="export-dropdown-item" onClick={exportColourCSS}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
                Download colour CSS
                <span className="export-dropdown-hint">Palette, tints &amp; states</span>
              </button>
              <button className="export-dropdown-item" onClick={copyColourCSS}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy colour CSS
                <span className="export-dropdown-hint">To clipboard</span>
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button className="export-dropdown-item" onClick={exportPalettePNG}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
                Download PNG
                <span className="export-dropdown-hint">Palette swatch image</span>
              </button>
              <button className="export-dropdown-item" onClick={exportPaletteSVG}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
                </svg>
                Download SVG
                <span className="export-dropdown-hint">Vector palette</span>
              </button>
              <button className="export-dropdown-item" onClick={exportTailwind}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" />
                </svg>
                Tailwind config
                <span className="export-dropdown-hint">tailwind.config.js</span>
              </button>
              <div style={{ padding: '8px 12px 10px', fontSize: 10, color: 'var(--t3)', lineHeight: 1.5 }}>
                Includes: palette · tints · state colours
              </div>
            </>
          ) : (
            <>
              {!isDesignComplete && (
                <div style={{ margin: '0 8px 6px', padding: '8px 10px', borderRadius: 'var(--radius-s)', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.25)', fontSize: 10, color: 'var(--t0)', lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700, color: '#d97706' }}>Heads up:</span> If you export the design system without completing other sections, UIL4B's default values will be used for: {missingSections.join(', ')}.
                </div>
              )}
              <button className="export-dropdown-item" onClick={exportStyleGuideHTML}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" />
                </svg>
                Download style guide
                <span className="export-dropdown-hint">Full HTML page</span>
              </button>
              <button className="export-dropdown-item" onClick={exportStyleGuideCSS}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
                Download CSS
                <span className="export-dropdown-hint">All design variables</span>
              </button>
              <button className="export-dropdown-item" onClick={copyStyleGuideCSS}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy CSS
                <span className="export-dropdown-hint">To clipboard</span>
              </button>

              {/* Pro-locked formats */}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              {isPro ? (
                <button className="export-dropdown-item" onClick={() => {
                    const tokens = JSON.stringify({ palette: design.palette, tints: design.tints, fonts: design.fonts, typeScale: design.typeScale, gradient: design.gradient }, null, 2)
                    downloadFile(tokens, 'design-tokens.json', 'application/json')
                    setOpen(false)
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                    Export JSON tokens
                    <span className="export-dropdown-hint">Full design data</span>
                  </button>
              ) : (
                <button className="export-dropdown-item" onClick={() => { navigate('/checkout?plan=yearly'); setOpen(false) }} style={{ opacity: 0.65 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  JSON Design Tokens
                  <span className="export-dropdown-hint" style={{ color: 'var(--accent-strong)' }}>Pro feature — Upgrade</span>
                </button>
              )}

              <div style={{ padding: '8px 12px 10px', fontSize: 10, color: 'var(--t3)', lineHeight: 1.5 }}>
                Includes: palette · tints · states · fonts · type scale · gradient{!isPro && ' · Free exports include UIL4B watermark'}
              </div>
            </>
          )}

          {/* Save project — always visible, gated behind login */}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <button className="export-dropdown-item" onClick={() => requireAuth(() => { setOpen(false); onSaveProject() })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Save as project
            <span className="export-dropdown-hint">{user ? 'In your account' : 'Sign in required'}</span>
          </button>
        </div>
      )}
    </div>
  )
}

function SaveProjectModal({ open, onClose, onSave }) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setName('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim())
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: '100%', maxWidth: 460, padding: 24 }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent-strong)', marginBottom: 12 }}>Save project</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 6 }}>Name this design</h3>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>Captures your palette, fonts, type scale, and CSS.</p>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Brand v1, Marketing site, Mobile app"
          style={{ width: '100%', marginBottom: 14 }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-accent" disabled={!name.trim()}>Save</button>
        </div>
      </form>
    </div>
  )
}

function ProfileMenu() {
  const { user, userProfile, logout } = useAuth()
  const { isPro } = useSubscription()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const go = (to) => { setOpen(false); navigate(to) }
  const goSection = (section) => { setOpen(false); navigate('/settings', { state: { section } }) }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {user ? (
        <button className="topbar-avatar" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-haspopup="menu" title={userProfile?.displayName || user.email}>
          {userProfile?.photoURL ? (
            <img src={userProfile.photoURL} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span>{(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}</span>
          )}
        </button>
      ) : (
        <button className="topbar-avatar topbar-avatar-guest" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-haspopup="menu" aria-label="Account">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      )}

      {open && (
        <div className="profile-menu" role="menu">
          {user ? (
            <>
              <div className="profile-menu-head">
                <div className="profile-menu-avatar">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span>{(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="profile-menu-name">
                    <UserName name={userProfile?.displayName} email={user.email} flair={userProfile?.flair} bold />
                  </div>
                  <div className="profile-menu-email">{user.email}</div>
                </div>
                {isPro && <span className="profile-menu-probadge">PRO</span>}
              </div>
              <button
                className={`profile-menu-item profile-menu-upgrade${isPro ? ' is-pro' : ''}`}
                role="menuitem"
                onClick={() => goSection('subscription')}
              >
                {isPro ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                )}
                {isPro ? 'Manage subscription' : 'Upgrade to Pro'}
              </button>
              <button className="profile-menu-item" role="menuitem" onClick={() => goSection('account')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Account
              </button>
              <button className="profile-menu-item" role="menuitem" onClick={() => go('/projects')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                My Projects
              </button>
              <button className="profile-menu-item" role="menuitem" onClick={() => goSection('accessibility')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>
                Accessibility
              </button>
              <button className="profile-menu-item" role="menuitem" onClick={() => goSection('language')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>
                Language
              </button>
              <div className="profile-menu-sep" />
              <button className="profile-menu-item profile-menu-danger" role="menuitem" onClick={() => { setOpen(false); logout() }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="profile-menu-guest">You're not signed in</div>
              <button className="profile-menu-item" role="menuitem" onClick={() => go('/login')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Sign in
              </button>
              <button className="profile-menu-item" role="menuitem" onClick={() => go('/login')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                Create account
              </button>
              <div className="profile-menu-sep" />
              <button className="profile-menu-item" role="menuitem" onClick={() => goSection('accessibility')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>
                Accessibility
              </button>
              <button className="profile-menu-item" role="menuitem" onClick={() => goSection('language')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>
                Language
              </button>
              <div className="profile-menu-sep" />
              <button className="profile-menu-item" role="menuitem" onClick={() => goSection('support')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Support
              </button>
              <button className="profile-menu-item" role="menuitem" onClick={() => go('/help')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Help Centre
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Section switcher — sits in the top bar between the brand and the command
// palette. Built as a sibling of ExportDropdown / ProfileMenu: same open/close
// useState, the same mousedown click-outside listener, ESC to close, and the
// same aria-haspopup / aria-expanded / aria-controls wiring. Adds full roving
// keyboard focus (↑/↓, Home/End, Enter/Space, Esc restores focus to the trigger)
// because this menu is a primary navigation control.
function NavSectionSwitcher({ onNavigateMobile }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  const currentSection = resolveSection(location.pathname)
  const current = SECTIONS.find(s => s.id === currentSection) || SECTIONS[0]

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Move focus into the menu when it opens so keyboard users land on the first
  // item; ESC closes and restores focus to the trigger.
  useEffect(() => {
    if (!open) return
    const items = menuRef.current?.querySelectorAll('[role="menuitem"]')
    items?.[0]?.focus()
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); triggerRef.current?.focus() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const isMobile = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
    window.matchMedia(MOBILE_QUERY).matches

  const go = (to) => {
    setOpen(false)
    navigate(to)
    // On mobile the drawer sidebar is hidden by default; opening it drops the
    // user straight into the destination section's navigation.
    if (isMobile()) onNavigateMobile?.()
  }

  // Roving focus across the menu items (Zone A + Zone B).
  const onMenuKeyDown = (e) => {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])
    if (!items.length) return
    const idx = items.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(idx + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(idx - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    }
  }

  return (
    <div ref={ref} className="nav-switch">
      <button
        ref={triggerRef}
        type="button"
        className="nav-switch-trigger"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="nav-switch-menu"
        aria-label={`Section: ${current.label}. Switch section`}
      >
        <svg className="nav-switch-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {current.icon}
        </svg>
        <span className="nav-switch-trigger-label">{current.label}</span>
        <svg className={`nav-switch-chev${open ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          id="nav-switch-menu"
          ref={menuRef}
          className="nav-switch-menu"
          role="menu"
          aria-label="Switch section"
          onKeyDown={onMenuKeyDown}
        >
          {/* Zone A — the three product surfaces */}
          {SECTIONS.map((s) => {
            const isCurrent = s.id === currentSection
            return (
              <button
                key={s.id}
                type="button"
                role="menuitem"
                className={`nav-switch-item${isCurrent ? ' is-current' : ''}`}
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => go(s.home)}
              >
                <svg className="nav-switch-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {s.icon}
                </svg>
                <span className="nav-switch-item-text">
                  <span className="nav-switch-item-label">{s.label}</span>
                  <span className="nav-switch-desc">{s.description}</span>
                </span>
                {isCurrent && (
                  <svg className="nav-switch-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}

          {/* Zone B — cross-cutting destinations */}
          <div className="nav-switch-divider" role="separator" />
          <button type="button" role="menuitem" className="nav-switch-link" onClick={() => go('/dashboard')}>
            <svg className="nav-switch-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
            Dashboard
          </button>
          {user && (
            <button type="button" role="menuitem" className="nav-switch-link" onClick={() => go('/projects')}>
              <svg className="nav-switch-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              My Projects
            </button>
          )}
          <button type="button" role="menuitem" className="nav-switch-link" onClick={() => go('/settings')}>
            <svg className="nav-switch-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Settings
          </button>
          {isAdmin && (
            <button type="button" role="menuitem" className="nav-switch-link" onClick={() => go('/admin')}>
              <svg className="nav-switch-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Admin
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function TopBar({ onMenuToggle, onOpenMenu, onCommandPalette }) {
  const { t } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const { saveProject } = useProject()
  const { pinned, togglePinned } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const [saveOpen, setSaveOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const isMac = IS_MAC

  // The tool that owns the current route, so the page can be pinned from itself.
  const currentTool = TOOLS.find(tl => tl.path === location.pathname)
  const isPinned = currentTool ? pinned.includes(currentTool.id) : false

  const handleSaveProject = (name) => {
    try {
      saveProject(name)
      setSaveOpen(false)
      navigate('/projects')
    } catch {
      // error swallowed — user already sees toast feedback
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-hamburger" onClick={onMenuToggle} aria-label={t('nav.toggleMenu')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>

        <Link to="/home" className="topbar-brand" title={t('brand.full')}>
          <span className="topbar-title">{t('brand.full')}</span>
        </Link>

        <NavSectionSwitcher onNavigateMobile={onOpenMenu} />

        <button type="button" className="cmdk-hint" onClick={onCommandPalette} aria-label={t('cmd.placeholder')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="cmdk-hint-text">{t('topbar.searchHint')}</span>
          <span className="cmdk-hint-keys">
            <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd>
            <kbd>K</kbd>
          </span>
        </button>
      </div>

      <div className="topbar-right">
        {currentTool && (
          <button
            className={`topbar-icon-btn topbar-pin${isPinned ? ' is-pinned' : ''}`}
            onClick={() => togglePinned(currentTool.id)}
            aria-pressed={isPinned}
            title={isPinned ? 'Unpin from dashboard' : 'Pin this page to dashboard'}
            aria-label={isPinned ? 'Unpin from dashboard' : 'Pin this page to dashboard'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17v5" /><path d="M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76Z" />
            </svg>
          </button>
        )}

        <button
          className="topbar-preview-btn"
          onClick={() => setPreviewOpen(true)}
          aria-label="Preview your colour system on UI"
          title="Preview UI"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          </svg>
          Preview
        </button>

        <ExportDropdown
          onSaveProject={() => setSaveOpen(true)}
        />

        <button
          className="topbar-icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? t('topbar.switchToLight') : t('topbar.switchToDark')}
          title={theme === 'dark' ? t('topbar.lightMode') : t('topbar.darkMode')}
        >
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
        </button>

        <ProfileMenu />
      </div>

      <SaveProjectModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onSave={handleSaveProject}
      />

      <UIPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </header>
  )
}
