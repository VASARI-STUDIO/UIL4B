import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/palette', label: 'Palette Builder', icon: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="7.5" r="1.5" fill="currentColor"/><circle cx="8" cy="14" r="1.5" fill="currentColor"/><circle cx="16" cy="14" r="1.5" fill="currentColor"/></> },
  { to: '/tints', label: 'Tint Generator', icon: <><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></> },
  { to: '/gradients', label: 'Gradient Tool', icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 3l18 18"/></> },
  { to: '/contrast', label: 'Contrast Checker', icon: <><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 010 20z" fill="currentColor"/></> },
  { to: '/resources', label: 'Resources', icon: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
]

const MORE_ITEMS = [
  { to: '/typescale', label: 'Type Scale' },
  { to: '/fontpairs', label: 'Font Matcher' },
  { to: '/buttons', label: 'Buttons' },
  { to: '/layouts', label: 'Layouts' },
  { to: '/icons', label: 'Icon Library' },
  { to: '/imgconvert', label: 'Image Converter' },
  { to: '/prompts', label: 'Prompt Library' },
  { to: '/docs-design', label: 'Design Principles' },
  { to: '/docs-social', label: 'Social Marketing' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { user, userProfile, logout } = useAuth()

  return (
    <>
      <div className={`sidebar-overlay${isOpen ? ' visible' : ''}`} onClick={onClose} />
      <nav className={`sidebar${isOpen ? ' open' : ''}`} id="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Design Toolkit</span>
            <span className="sidebar-brand-sub">Professional Suite</span>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              <span className="nav-item-label">{item.label}</span>
            </NavLink>
          ))}

          {MORE_ITEMS.length > 0 && (
            <div className="nav-more-section">
              {MORE_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item nav-item-sub${isActive ? ' active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-item-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <NavLink to="/settings" className={({ isActive }) => `nav-item nav-item-footer${isActive ? ' active' : ''}`} onClick={onClose}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <span className="nav-item-label">Settings</span>
          </NavLink>
          <NavLink to="/docs-design" className={({ isActive }) => `nav-item nav-item-footer${isActive ? ' active' : ''}`} onClick={onClose}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span className="nav-item-label">Docs</span>
          </NavLink>

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
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="sidebar-login-btn" onClick={onClose}>
              Sign In
            </NavLink>
          )}
        </div>
      </nav>
    </>
  )
}
