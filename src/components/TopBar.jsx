import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../contexts/I18nContext'
import { useExport } from '../contexts/ExportContext'
import { useProject } from '../contexts/ProjectContext'
import { buildStyleGuideHTML, buildCSSVars } from '../utils/exportBuilder'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

const STATE_PRESETS_KEY = 'vs-state-shades'

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function ExportDropdown({ actions, onSaveProject, canSave }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('page')
  const ref = useRef(null)
  const { design } = useProject()
  const { theme } = useTheme()

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Pull cached state shades from localStorage if present (set by ColorStudio)
  const getStateShades = () => {
    try {
      const raw = localStorage.getItem(STATE_PRESETS_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  const exportStyleGuideHTML = () => {
    const html = buildStyleGuideHTML({
      design,
      stateShades: getStateShades(),
      theme,
      projectName: 'My Style Guide',
    })
    downloadFile(html, 'style-guide.html', 'text/html')
    setOpen(false)
  }

  const exportStyleGuideCSS = () => {
    const css = buildCSSVars({
      palette: design.palette,
      tints: design.tints,
      states: design.states,
      fonts: design.fonts,
      typeScale: design.typeScale,
      stateShades: getStateShades(),
    })
    downloadFile(css + '\n', 'design-tokens.css', 'text/css')
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
    })
    navigator.clipboard.writeText(css)
    setOpen(false)
  }

  const showPageMode = !!actions && mode === 'page'
  const showGuideMode = mode === 'guide'

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
        <span className="topbar-btn-export-label">Export</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="export-dropdown">
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, padding: '6px 6px 8px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
            <button
              type="button"
              className={`pt-t${mode === 'page' ? ' on' : ''}`}
              onClick={() => setMode('page')}
              disabled={!actions}
              style={{ flex: 1, padding: '6px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', opacity: !actions ? 0.4 : 1 }}
            >
              This page
            </button>
            <button
              type="button"
              className={`pt-t${mode === 'guide' ? ' on' : ''}`}
              onClick={() => setMode('guide')}
              style={{ flex: 1, padding: '6px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}
            >
              Style guide
            </button>
          </div>

          {/* PAGE MODE */}
          {showPageMode && (
            <>
              <button className="export-dropdown-item" onClick={() => { actions.downloadHTML(); setOpen(false) }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" />
                </svg>
                Download HTML
                <span className="export-dropdown-hint">{actions.label || 'This tool'}</span>
              </button>
              <button className="export-dropdown-item" onClick={() => { actions.downloadCSS(); setOpen(false) }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
                Download CSS
                <span className="export-dropdown-hint">Variables only</span>
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button className="export-dropdown-item" onClick={() => { actions.copyCSS(); setOpen(false) }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy CSS variables
                <span className="export-dropdown-hint">To clipboard</span>
              </button>
            </>
          )}

          {!actions && mode === 'page' && (
            <div style={{ padding: '12px 12px', fontSize: 11, color: 'var(--t2)' }}>
              No page-specific export for this tool. Switch to Style guide to export your full design.
            </div>
          )}

          {/* GUIDE MODE */}
          {showGuideMode && (
            <>
              <button className="export-dropdown-item" onClick={exportStyleGuideHTML}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" />
                </svg>
                Download style guide
                <span className="export-dropdown-hint">Styled HTML page</span>
              </button>
              <button className="export-dropdown-item" onClick={exportStyleGuideCSS}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
                Download tokens
                <span className="export-dropdown-hint">All CSS variables</span>
              </button>
              <button className="export-dropdown-item" onClick={copyStyleGuideCSS}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy tokens
                <span className="export-dropdown-hint">To clipboard</span>
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <div style={{ padding: '8px 12px 10px', fontSize: 10, color: 'var(--t3)', lineHeight: 1.5 }}>
                Includes: palette · tints · states · fonts · type scale · gradient
              </div>
            </>
          )}

          {/* Save project */}
          {canSave && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button className="export-dropdown-item" onClick={() => { setOpen(false); onSaveProject() }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                Save as project
                <span className="export-dropdown-hint">In your account</span>
              </button>
            </>
          )}
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
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>Save project</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 6 }}>Name this design</h3>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>Captures your palette, fonts, type scale, and tokens.</p>
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

export default function TopBar({ onMenuToggle, onCommandPalette }) {
  const { user, userProfile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const { exportActions } = useExport()
  const { canSaveProjects, saveProject } = useProject()
  const navigate = useNavigate()
  const [saveOpen, setSaveOpen] = useState(false)
  const isMac = IS_MAC

  const handleSaveProject = (name) => {
    try {
      saveProject(name)
      setSaveOpen(false)
      navigate('/projects')
    } catch (e) {
      console.error(e)
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

        <div className="topbar-brand">
          <div className="topbar-logo">
            <svg width="16" height="16" viewBox="0 0 255 255" fill="none">
              <text x="127.5" y="175" fontFamily="system-ui" fontSize="160" fontWeight="800" fill="white" textAnchor="middle" letterSpacing="-6">UI</text>
              <rect x="168" y="58" width="10" height="100" rx="5" fill="#60A5FA"/>
            </svg>
          </div>
          <span className="topbar-title">{t('brand.full')}</span>
        </div>

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
        <ExportDropdown
          actions={exportActions}
          onSaveProject={() => setSaveOpen(true)}
          canSave={canSaveProjects}
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

        {user ? (
          <NavLink to="/settings" className="topbar-avatar" title={userProfile?.displayName || user.email}>
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span>{(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}</span>
            )}
          </NavLink>
        ) : (
          <NavLink to="/login" className="topbar-avatar topbar-avatar-guest" aria-label={t('common.signIn')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </NavLink>
        )}
      </div>

      <SaveProjectModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onSave={handleSaveProject}
      />
    </header>
  )
}
