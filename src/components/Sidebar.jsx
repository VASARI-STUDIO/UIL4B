import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

const NAV_GROUPS = [
  {
    label: 'Core Tools',
    defaultOpen: true,
    items: [
      { to: '/palette', label: 'Palette Builder', icon: 'palette' },
      { to: '/tints', label: 'Tint Generator', icon: 'tint' },
      { to: '/gradients', label: 'Gradient Tool', icon: 'gradient' },
      { to: '/contrast', label: 'Contrast Checker', icon: 'contrast' },
    ]
  },
  {
    label: 'Typography',
    defaultOpen: true,
    items: [
      { to: '/typescale', label: 'Type Scale', icon: 'type' },
      { to: '/fontpairs', label: 'Font Matcher', icon: 'font' },
    ]
  },
  {
    label: 'Components',
    defaultOpen: true,
    items: [
      { to: '/buttons', label: 'Buttons', icon: 'button' },
      { to: '/layouts', label: 'Layouts', icon: 'layout' },
      { to: '/icons', label: 'Icon Library', icon: 'star' },
    ]
  },
  {
    label: 'Tools',
    defaultOpen: true,
    items: [
      { to: '/imgconvert', label: 'Image Converter', icon: 'image' },
      { to: '/prompts', label: 'Prompt Library', icon: 'prompt' },
    ]
  },
  {
    label: 'Knowledge',
    defaultOpen: false,
    items: [
      { to: '/docs-design', label: 'Design Principles', icon: 'book' },
      { to: '/docs-social', label: 'Social Marketing', icon: 'share' },
    ]
  },
  {
    label: 'Links',
    defaultOpen: false,
    items: [
      { href: 'https://framer.university', label: 'Framer University', external: true },
      { href: 'https://fonts.google.com', label: 'Google Fonts', external: true },
      { href: 'https://labs.google/fx/tools/flow', label: 'Google Flow', external: true },
      { href: 'https://stitch.withgoogle.com/?pli=1', label: 'Google Stitch', external: true },
    ]
  }
]

const ICONS = {
  palette: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="7.5" r="1.5" fill="currentColor"/><circle cx="8" cy="14" r="1.5" fill="currentColor"/><circle cx="16" cy="14" r="1.5" fill="currentColor"/></>,
  tint: <><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="3" y="3" width="9" height="18" rx="1" fill="currentColor" opacity=".15"/></>,
  gradient: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 3h18v18" fill="currentColor" opacity=".1"/></>,
  contrast: <><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 010 20z" fill="currentColor"/></>,
  type: <><polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></>,
  font: <><path d="M4 20h16"/><path d="M7 4v16"/><path d="M17 4v16"/><path d="M7 12h10"/></>,
  button: <><rect x="3" y="8" width="18" height="8" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  layout: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/></>,
  star: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></>,
  prompt: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
  book: <><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></>,
  share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
  external: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  docs: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
}

function NavIcon({ name }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name] || ICONS.star}
    </svg>
  )
}

function NavGroup({ label, defaultOpen, items, onClose }) {
  const [open, setOpen] = useState(defaultOpen)
  const location = useLocation()
  const hasActive = items.some(item => !item.external && location.pathname === item.to)

  return (
    <div className="nav-group">
      <button
        className={`nav-group-header${hasActive ? ' has-active' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className="nav-group-label">{label}</span>
        <svg className={`nav-group-chevron${open ? ' open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div className={`nav-group-items${open ? ' open' : ''}`}>
        {items.map(item => (
          item.external ? (
            <a key={item.label} className="nav-item" href={item.href} target="_blank" rel="noopener noreferrer">
              <NavIcon name="external" />
              <span className="nav-item-label">{item.label}</span>
              <svg className="nav-item-external" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
              </svg>
            </a>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <NavIcon name={item.icon} />
              <span className="nav-item-label">{item.label}</span>
            </NavLink>
          )
        ))}
      </div>
    </div>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const { theme, toggleTheme } = useTheme()
  const { user, userProfile, logout } = useAuth()

  return (
    <>
      <div className={`sidebar-overlay${isOpen ? ' visible' : ''}`} onClick={onClose} />
      <nav className={`sidebar${isOpen ? ' open' : ''}`} id="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="6" fill="var(--accent)"/>
              <path d="M8 16l4-10 4 10M9.5 13h5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Visari Studio</span>
            <span className="sidebar-brand-sub">Design Toolkit</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="sidebar-nav">
          {NAV_GROUPS.map(group => (
            <NavGroup key={group.label} {...group} onClose={onClose} />
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-links">
            <NavLink to="/settings" className={({ isActive }) => `nav-item nav-item-footer${isActive ? ' active' : ''}`} onClick={onClose}>
              <NavIcon name="settings" />
              <span className="nav-item-label">Settings</span>
            </NavLink>
            <NavLink to="/docs-design" className={({ isActive }) => `nav-item nav-item-footer${isActive ? ' active' : ''}`} onClick={onClose}>
              <NavIcon name="docs" />
              <span className="nav-item-label">Documentation</span>
            </NavLink>
          </div>

          <div className="sidebar-theme-toggle">
            <div className="sidebar-theme-info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {theme === 'dark' ? (
                  <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>
                ) : (
                  <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>
                )}
              </svg>
              <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
            </div>
            <button className={`theme-switch${theme === 'light' ? ' on' : ''}`} onClick={toggleTheme} aria-label="Toggle theme" />
          </div>

          {user ? (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span>{(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}</span>
                )}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{userProfile?.displayName || user.email?.split('@')[0]}</div>
                <div className={`sidebar-user-tier${userProfile?.tier === 'pro' ? ' pro' : ''}`}>
                  {userProfile?.tier === 'pro' ? 'PRO' : 'FREE'} PLAN
                </div>
              </div>
              <button className="sidebar-user-action" onClick={logout} title="Sign out">
                <NavIcon name="logout" />
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="sidebar-login-btn" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Sign In
            </NavLink>
          )}
        </div>
      </nav>
    </>
  )
}
