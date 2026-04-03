import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function TopBar({ onMenuToggle }) {
  const { user, userProfile } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Future: implement global search
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
          </svg>
        </button>

        <span className="topbar-title">Design Toolkit</span>

        <nav className="topbar-tabs">
          <NavLink to="/palette" className={({ isActive }) => `topbar-tab${isActive ? ' active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/community" className={({ isActive }) => `topbar-tab${isActive ? ' active' : ''}`}>
            Community
          </NavLink>
          <NavLink to="/feedback" className={({ isActive }) => `topbar-tab${isActive ? ' active' : ''}`}>
            Feedback
          </NavLink>
        </nav>
      </div>

      <div className="topbar-right">
        <form className="topbar-search" onSubmit={handleSearch}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </form>

        <button className="topbar-icon-btn" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </button>

        <button className="topbar-btn-export" onClick={() => navigate('/settings')}>
          Export Config
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
          <NavLink to="/login" className="topbar-avatar topbar-avatar-guest" aria-label="Sign in">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </NavLink>
        )}
      </div>
    </header>
  )
}
