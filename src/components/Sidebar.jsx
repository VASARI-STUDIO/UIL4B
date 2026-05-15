import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { CATEGORIES, toolsByCategory, localiseCategories, localiseTools } from '../data/tools'

const STORAGE_KEY = 'vs-nav-open'

function loadOpenState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, userProfile, logout } = useAuth()
  const { t } = useI18n()
  const location = useLocation()

  const activeCategoryId = (() => {
    for (const cat of CATEGORIES) {
      if (location.pathname === cat.path) return cat.id
      if (toolsByCategory(cat.id).some(t => t.path === location.pathname)) return cat.id
    }
    return null
  })()

  const [openCats, setOpenCats] = useState(() => {
    const stored = loadOpenState()
    if (stored) return stored
    return CATEGORIES.reduce((acc, c) => ({ ...acc, [c.id]: c.id === activeCategoryId }), {})
  })

  useEffect(() => {
    if (activeCategoryId && !openCats[activeCategoryId]) {
      setOpenCats(prev => ({ ...prev, [activeCategoryId]: true }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategoryId])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openCats))
    } catch {
      /* ignore */
    }
  }, [openCats])

  const toggleCat = (id) => setOpenCats(prev => ({ ...prev, [id]: !prev[id] }))

  const cats = localiseCategories(t)
  const allTools = localiseTools(t)

  return (
    <>
      <div className={`sidebar-overlay${isOpen ? ' visible' : ''}`} onClick={onClose} />
      <nav className={`sidebar${isOpen ? ' open' : ''}`} id="sidebar">
        {/* Brand */}
        <NavLink to="/" className="sidebar-brand" onClick={onClose}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--warm-shadow)', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 255 255" fill="none">
                <text x="127.5" y="175" fontFamily="system-ui" fontSize="160" fontWeight="800" fill="white" textAnchor="middle" letterSpacing="-6">UI</text>
                <rect x="168" y="58" width="10" height="100" rx="5" fill="#60A5FA"/>
              </svg>
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">{t('brand.name')}</span>
              <span className="sidebar-brand-sub">{t('brand.tagline')}</span>
            </div>
          </div>
        </NavLink>

        {/* Primary Navigation */}
        <div className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={onClose}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="nav-item-label" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 600 }}>{t('nav.dashboard')}</span>
          </NavLink>

          {cats.map((cat, idx) => {
            const isOpen = !!openCats[cat.id]
            const isActive = activeCategoryId === cat.id
            const tools = allTools.filter(tl => tl.category === cat.id)
            const hasSubItems = tools.length > 1 || (tools.length === 1 && tools[0].path !== cat.path)
            return (
              <div key={cat.id} className={`nav-cat${isActive ? ' active' : ''}`}>
                <div className="nav-cat-header">
                  {hasSubItems ? (
                    <button
                      type="button"
                      className="nav-cat-toggle"
                      onClick={() => toggleCat(cat.id)}
                      aria-expanded={isOpen}
                      aria-label={t('nav.toggle', { name: cat.label })}
                    >
                      <svg className={`nav-cat-arr${isOpen ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 6 15 12 9 18" />
                      </svg>
                    </button>
                  ) : (
                    <div style={{ width: 20 }} />
                  )}
                  <NavLink
                    to={cat.path}
                    className={({ isActive: linkActive }) => `nav-cat-link${linkActive ? ' active' : ''}`}
                    onClick={onClose}
                  >
                    {hasSubItems && <span className="nav-cat-num">{idx + 1}</span>}
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {cat.icon}
                    </svg>
                    <span className="nav-cat-label">{cat.label}</span>
                  </NavLink>
                </div>
                {hasSubItems && (
                  <div className={`nav-cat-body${isOpen ? ' open' : ''}`}>
                    {tools.map((tool, ti) => (
                      <NavLink
                        key={tool.id}
                        to={tool.path}
                        className={({ isActive: linkActive }) => `nav-item nav-item-sub${linkActive ? ' active' : ''}`}
                        onClick={onClose}
                      >
                        <span className="nav-item-num">{idx + 1}.{ti + 1}</span>
                        <span className="nav-item-label">{tool.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <NavLink to="/settings" className={({ isActive }) => `nav-item nav-item-footer${isActive ? ' active' : ''}`} onClick={onClose}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="nav-item-label" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 600 }}>{t('nav.settings')}</span>
          </NavLink>
          <NavLink to="/feedback" className={({ isActive }) => `nav-item nav-item-footer${isActive ? ' active' : ''}`} onClick={onClose}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="nav-item-label" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 600 }}>{t('nav.support')}</span>
          </NavLink>

          {user ? (
            <div className="sidebar-user">
              <NavLink to="/settings" className="sidebar-user-link" onClick={onClose}>
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
                    {userProfile?.tier === 'pro' ? t('nav.proPlan') : t('nav.freePlan')}
                  </div>
                </div>
              </NavLink>
              <button className="sidebar-user-action" onClick={logout} title={t('common.signOut')}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="sidebar-login-btn" onClick={onClose}>
              {t('common.signIn')}
            </NavLink>
          )}
        </div>
      </nav>
    </>
  )
}
