import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

const NAV_GROUPS = [
  {
    label: 'Core Tools',
    defaultOpen: true,
    items: [
      { to: '/palette', label: 'Palette Builder', icon: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="7.5" r="1.5" fill="currentColor"/></> },
      { to: '/tints', label: 'Tint Generator', icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></> },
      { to: '/gradients', label: 'Gradient Tool', icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 3l18 18"/></> },
      { to: '/contrast', label: 'Contrast Checker', icon: <><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 010 20z" fill="currentColor"/></> },
    ]
  },
  {
    label: 'Typography',
    defaultOpen: true,
    items: [
      { to: '/typescale', label: 'Type Scale', icon: <><polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/></> },
      { to: '/fontpairs', label: 'Font Matcher', icon: <><path d="M4 20h16"/><path d="M7 4v16"/><path d="M17 4v16"/></> },
    ]
  },
  {
    label: 'Components',
    defaultOpen: true,
    items: [
      { to: '/buttons', label: 'Buttons', icon: <rect x="3" y="8" width="18" height="8" rx="2"/> },
      { to: '/layouts', label: 'Layouts', icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></> },
      { to: '/icons', label: 'Icon Library', icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/> },
    ]
  },
  {
    label: 'Tools',
    defaultOpen: true,
    items: [
      { to: '/imgconvert', label: 'Image Converter', icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></> },
      { to: '/prompts', label: 'Prompt Library', icon: <><path d="M12 3l-4 4 4 4 4-4z"/><path d="M3 12l4 4 4-4-4-4z"/></> },
    ]
  },
  {
    label: 'Knowledge',
    defaultOpen: false,
    items: [
      { to: '/docs-design', label: 'Web Design Principles', icon: <><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></> },
      { to: '/docs-social', label: 'Social Media Marketing', icon: <><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/></> },
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

const ExternalIcon = () => (
  <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>
)

function NavGroup({ label, defaultOpen, items }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <>
      <button className="nav-g" data-open={open} onClick={() => setOpen(!open)}>
        <span className={`arr${open ? ' open' : ''}`}>&#x25B8;</span> {label}
      </button>
      <div className={`nav-sub${open ? ' open' : ''}`}>
        {items.map(item => (
          item.external ? (
            <a key={item.label} className="nl" href={item.href} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><ExternalIcon /></svg>
              {item.label}
            </a>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nl${isActive ? ' on' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">{item.icon}</svg>
              {item.label}
            </NavLink>
          )
        ))}
      </div>
    </>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const { theme, toggleTheme } = useTheme()
  const { user, userProfile, logout } = useAuth()

  return (
    <>
      <div className={`ov${isOpen ? ' show' : ''}`} onClick={onClose} />
      <nav className={`sidebar${isOpen ? ' open' : ''}`} id="sidebar">
        <div className="sb-brand">
          <h2>Visari Studio</h2>
          <p>Web Design Toolkit</p>
        </div>

        {NAV_GROUPS.map(group => (
          <NavGroup key={group.label} {...group} />
        ))}

        <div className="sb-foot">
          <NavLink to="/settings" className={({ isActive }) => `nl sb-link${isActive ? ' on' : ''}`} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Settings
          </NavLink>
          <NavLink to="/docs-design" className={({ isActive }) => `nl sb-link${isActive ? ' on' : ''}`} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Docs
          </NavLink>

          <div className="sw-row">
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
            <button className={`switch${theme === 'light' ? ' on' : ''}`} onClick={toggleTheme} aria-label="Toggle theme" />
          </div>

          {user ? (
            <div className="sb-user">
              <div className="sb-user-avatar">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span>{(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}</span>
                )}
              </div>
              <div className="sb-user-info">
                <div className="sb-user-name">{userProfile?.displayName || user.email?.split('@')[0]}</div>
                <div className="sb-user-tier">{userProfile?.tier === 'pro' ? 'PRO PLAN' : 'FREE PLAN'}</div>
              </div>
              <button className="sb-user-logout" onClick={logout} title="Sign out">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="16" height="16">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="btn btn-accent sb-login-btn" onClick={onClose}>
              Sign In
            </NavLink>
          )}
        </div>
      </nav>
    </>
  )
}
