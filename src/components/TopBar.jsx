import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../contexts/I18nContext'
import { useProject } from '../contexts/ProjectContext'
import { buildStyleGuideHTML, buildCSSVars } from '../utils/exportBuilder'
import { useAppearance } from '../contexts/AppearanceContext'

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

function ExportDropdown({ onSaveProject, canSave }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { design } = useProject()
  const { theme } = useTheme()
  const { rounding, density } = useAppearance()

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
      appearance: { rounding, density },
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
      appearance: { rounding, density },
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
      appearance: { rounding, density },
    })
    navigator.clipboard.writeText(css)
    setOpen(false)
  }

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
            Download CSS
            <span className="export-dropdown-hint">All CSS variables</span>
          </button>
          <button className="export-dropdown-item" onClick={copyStyleGuideCSS}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy CSS
            <span className="export-dropdown-hint">To clipboard</span>
          </button>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <div style={{ padding: '8px 12px 10px', fontSize: 10, color: 'var(--t3)', lineHeight: 1.5 }}>
            Includes: palette · tints · states · fonts · type scale · gradient
          </div>

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
                  <div className="profile-menu-name">{userProfile?.displayName || user.email?.split('@')[0]}</div>
                  <div className="profile-menu-email">{user.email}</div>
                </div>
              </div>
              <button className="profile-menu-item" role="menuitem" onClick={() => goSection('account')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Account
              </button>
              <button className="profile-menu-item" role="menuitem" onClick={() => go('/projects')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                My Projects
              </button>
              <button className="profile-menu-item" role="menuitem" onClick={() => goSection('appearance')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8L7 17M17 7l2.8-2.8"/></svg>
                Appearance
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
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function TopBar({ onMenuToggle, onCommandPalette }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
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

        <ProfileMenu />
      </div>

      <SaveProjectModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onSave={handleSaveProject}
      />
    </header>
  )
}
