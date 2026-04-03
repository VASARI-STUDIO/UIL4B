import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
  { to: '/palette', label: 'Palette Builder', icon: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="7.5" r="1.5" fill="currentColor"/><circle cx="8" cy="14" r="1.5" fill="currentColor"/><circle cx="16" cy="14" r="1.5" fill="currentColor"/></> },
  { to: '/tints', label: 'Tint Generator', icon: <><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></> },
  { to: '/typescale', label: 'Type Scale', icon: <><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></> },
  { to: '/projects', label: 'Projects', icon: <><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 8h20"/></> },
  { to: '/resources', label: 'Assets', icon: <><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M12 22V12"/><path d="M2 7v10l10 5"/><path d="M22 7v10l-10 5"/></> },
]

export default function Sidebar({ isOpen, onClose }) {
  const { user, userProfile, logout } = useAuth()

  return (
    <>
      <div className={`sidebar-overlay${isOpen ? ' visible' : ''}`} onClick={onClose} />
      <nav className={`sidebar${isOpen ? ' open' : ''}`} id="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--accent-bg)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6"/>
              </svg>
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">Vasari</span>
              <span className="sidebar-brand-sub">Obsidian Toolkit</span>
            </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              <span className="nav-item-label" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 600 }}>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <NavLink to="/settings" className={({ isActive }) => `nav-item nav-item-footer${isActive ? ' active' : ''}`} onClick={onClose}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <span className="nav-item-label" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 600 }}>Settings</span>
          </NavLink>
          <NavLink to="/feedback" className={({ isActive }) => `nav-item nav-item-footer${isActive ? ' active' : ''}`} onClick={onClose}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span className="nav-item-label" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 600 }}>Support</span>
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
