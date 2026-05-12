import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../contexts/I18nContext'
import { useExport } from '../contexts/ExportContext'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

function ExportDropdown({ actions }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="topbar-btn-export"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="export-dropdown">
          <button className="export-dropdown-item" onClick={() => { actions.downloadHTML(); setOpen(false) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" />
            </svg>
            Export HTML
            <span className="export-dropdown-hint">Styled reference page</span>
          </button>
          <button className="export-dropdown-item" onClick={() => { actions.downloadCSS(); setOpen(false) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
            Export CSS
            <span className="export-dropdown-hint">Custom properties file</span>
          </button>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <button className="export-dropdown-item" onClick={() => { actions.copyCSS(); setOpen(false) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy CSS Variables
            <span className="export-dropdown-hint">To clipboard</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function TopBar({ onMenuToggle, onCommandPalette }) {
  const { user, userProfile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const { exportActions } = useExport()
  const isMac = IS_MAC

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-hamburger" onClick={onMenuToggle} aria-label={t('nav.toggleMenu')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>

        <span className="topbar-title">{t('brand.full')}</span>

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
        {exportActions && <ExportDropdown actions={exportActions} />}

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
    </header>
  )
}
