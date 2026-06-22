import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useWorkspace, TOOL_DRAG_TYPE } from '../contexts/WorkspaceContext'
import { CATEGORIES, toolsByCategory, localiseCategories, localiseTools, groupBySubcategory } from '../data/tools'
import { ADMIN_EMAILS } from '../utils/constants'

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

function ContextMenu({ x, y, tool, isPinned, onPin, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.right > window.innerWidth) el.style.left = `${x - rect.width}px`
    if (rect.bottom > window.innerHeight) el.style.top = `${y - rect.height}px`
  }, [x, y])

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [onClose])

  // Clamp to the viewport so a right-click near the right/bottom edge doesn't
  // push the menu off-screen (≈200×120 footprint, 8px breathing room).
  const vw = typeof window !== 'undefined' ? window.innerWidth : 9999
  const vh = typeof window !== 'undefined' ? window.innerHeight : 9999
  const left = Math.max(8, Math.min(x, vw - 208))
  const top = Math.max(8, Math.min(y, vh - 128))

  return (
    <div
      ref={ref}
      className="nav-ctx-menu"
      style={{ position: 'fixed', left, top, zIndex: 9999 }}
    >
      <button type="button" onClick={() => { onPin(tool.id); onClose() }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 17v5" /><path d="M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76Z" />
        </svg>
        {isPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
      </button>
    </div>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, userProfile, logout } = useAuth()
  const { t } = useI18n()
  const { pinned, togglePinned, reorderPinned, addPinned } = useWorkspace()
  const location = useLocation()
  const [ctxMenu, setCtxMenu] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [pinDropActive, setPinDropActive] = useState(false)
  const pinDropDepth = useRef(0)

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

  const activeCategoryId = (() => {
    for (const cat of CATEGORIES) {
      if (location.pathname === cat.path) return cat.id
      if (toolsByCategory(cat.id).some(t => t.path === location.pathname)) return cat.id
    }
    return null
  })()

  const [openCats, setOpenCats] = useState(() => {
    const allOpen = CATEGORIES.reduce((acc, c) => ({ ...acc, [c.id]: true }), {})
    const stored = loadOpenState()
    // Merge stored prefs over the all-open default so categories added after a
    // user's prefs were saved (e.g. AI Tools) start expanded instead of
    // inheriting an undefined → collapsed state.
    return stored ? { ...allOpen, ...stored } : allOpen
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
    } catch { /* ignore */ }
  }, [openCats])

  const toggleCat = (id) => setOpenCats(prev => ({ ...prev, [id]: !prev[id] }))

  const handleContextMenu = useCallback((e, tool) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, tool })
  }, [])

  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }, [])

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }, [])

  const handleDrop = useCallback((e, toIdx) => {
    e.preventDefault()
    if (dragIdx !== null && dragIdx !== toIdx) {
      reorderPinned(dragIdx, toIdx)
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }, [dragIdx, reorderPinned])

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setDragOverIdx(null)
  }, [])

  // Pinned list as a drop target for tools dragged out of the category nav.
  // Sub-items carry TOOL_DRAG_TYPE; internal reorder drags don't, so this only
  // fires for "pin this tool" drops and leaves reordering untouched.
  const hasToolPayload = (e) => Array.from(e.dataTransfer.types || []).includes(TOOL_DRAG_TYPE)
  const onPinZoneDragEnter = useCallback((e) => {
    if (!hasToolPayload(e)) return
    e.preventDefault()
    pinDropDepth.current += 1
    setPinDropActive(true)
  }, [])
  const onPinZoneDragOver = useCallback((e) => {
    if (!hasToolPayload(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])
  const onPinZoneDragLeave = useCallback((e) => {
    if (!hasToolPayload(e)) return
    pinDropDepth.current -= 1
    if (pinDropDepth.current <= 0) { pinDropDepth.current = 0; setPinDropActive(false) }
  }, [])
  const onPinZoneDrop = useCallback((e) => {
    if (!hasToolPayload(e)) return
    e.preventDefault()
    const id = e.dataTransfer.getData(TOOL_DRAG_TYPE)
    if (id) addPinned(id)
    pinDropDepth.current = 0
    setPinDropActive(false)
  }, [addPinned])

  const cats = localiseCategories(t)
  const allTools = localiseTools(t)
  const pinnedTools = pinned.map(id => allTools.find(tl => tl.id === id)).filter(Boolean)

  return (
    <>
      <div className={`sidebar-overlay${isOpen ? ' visible' : ''}`} onClick={onClose} />
      <nav className={`sidebar${isOpen ? ' open' : ''}`} id="sidebar">
        {/* Brand — the logo is the in-app home link (to the dashboard) */}
        <NavLink to="/dashboard" className="sidebar-brand" onClick={onClose}>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">{t('brand.name')}</span>
            <span className="sidebar-brand-sub">{t('brand.tagline')}</span>
          </div>
        </NavLink>

        {/* Primary Navigation — Projects now lives in the profile menu (top-right). */}
        <div className="sidebar-nav">
          {user && (
            <div
              className={`nav-pinned${pinDropActive ? ' drop-active' : ''}`}
              onDragEnter={onPinZoneDragEnter}
              onDragOver={onPinZoneDragOver}
              onDragLeave={onPinZoneDragLeave}
              onDrop={onPinZoneDrop}
            >
              <div className="nav-pinned-label">{t('dash.pinned')}</div>
              {pinnedTools.length === 0 && (
                <div className="nav-pinned-empty">Drop here to pin</div>
              )}
              {pinnedTools.map((tool, idx) => (
                <NavLink
                  key={tool.id}
                  to={tool.path}
                  className={({ isActive }) =>
                    `nav-item nav-item-pinned${isActive ? ' active' : ''}${dragOverIdx === idx ? ' drag-over' : ''}${dragIdx === idx ? ' dragging' : ''}`
                  }
                  onClick={onClose}
                  onContextMenu={(e) => handleContextMenu(e, tool)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                >
                  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {tool.icon}
                  </svg>
                  <span className="nav-item-label">{tool.label}</span>
                  <button
                    type="button"
                    className="nav-item-pin"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePinned(tool.id) }}
                    title="Unpin"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <path d="M12 17v5" /><path d="M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76Z" />
                    </svg>
                  </button>
                </NavLink>
              ))}
            </div>
          )}

          {cats.map((cat, idx) => {
            const isOpen = !!openCats[cat.id]
            const isActive = activeCategoryId === cat.id
            // Alpha tools are admin-only — non-admins never see them in the nav.
            const tools = allTools.filter(tl => tl.category === cat.id && (isAdmin || !tl.alpha))
            // If a category has no visible tools for this user (e.g. an all-alpha
            // category for a non-admin), drop it from the nav entirely.
            if (!tools.length) return null
            const hasSubItems = tools.length > 1 || (tools.length === 1 && tools[0].path !== cat.path)
            const subGroups = groupBySubcategory(tools)
            // Number tools by their rendered order so the "n.m" labels read
            // top-to-bottom — when grouped, that's the flattened group order;
            // otherwise it's the plain tool order.
            const orderedTools = subGroups.length > 0 ? subGroups.flatMap(g => g.tools) : tools
            const toolIndex = new Map(orderedTools.map((tl, i) => [tl.id, i]))
            const renderTool = (tool) => {
              const ti = toolIndex.get(tool.id)
              return (
                <NavLink
                  key={tool.id}
                  to={tool.path}
                  className={({ isActive: linkActive }) => `nav-item nav-item-sub${linkActive ? ' active' : ''}${pinned.includes(tool.id) ? ' is-pinned' : ''}`}
                  onClick={onClose}
                  onContextMenu={(e) => handleContextMenu(e, tool)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy'
                    e.dataTransfer.setData(TOOL_DRAG_TYPE, tool.id)
                    e.dataTransfer.setData('text/plain', tool.label)
                  }}
                >
                  <span className="nav-item-num">{idx + 1}.{ti + 1}</span>
                  {tool.icon && (
                    <svg className="nav-icon nav-icon-sub" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {tool.icon}
                    </svg>
                  )}
                  <span className="nav-item-label">{tool.label}</span>
                  {tool.alpha && <span className="nav-alpha-badge">Alpha</span>}
                </NavLink>
              )
            }
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
                    {subGroups.length > 0
                      ? subGroups.map(group => (
                          <Fragment key={group.subcategory || '_'}>
                            {group.subcategory && (
                              <div className="nav-pinned-label">{group.subcategory}</div>
                            )}
                            {group.tools.map(renderTool)}
                          </Fragment>
                        ))
                      : tools.map(renderTool)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {isAdmin && (
            <div className="nav-admin-group">
              <NavLink to="/admin" className={({ isActive }) => `nav-item nav-item-footer${isActive ? ' active' : ''}`} onClick={onClose}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className="nav-item-label" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 600 }}>Admin</span>
              </NavLink>
            </div>
          )}
          <NavLink to="/settings" className={({ isActive }) => `nav-item nav-item-footer${isActive ? ' active' : ''}`} onClick={onClose}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="nav-item-label" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 600 }}>{t('nav.settings')}</span>
          </NavLink>
          <NavLink to="/help" className={({ isActive }) => `nav-item nav-item-footer${isActive ? ' active' : ''}`} onClick={onClose}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="nav-item-label" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 600 }}>Help Centre</span>
          </NavLink>
          <NavLink to="/info" className={({ isActive }) => `nav-item nav-item-footer${isActive ? ' active' : ''}`} onClick={onClose}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span className="nav-item-label" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 600 }}>Info Centre</span>
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
                </div>
              </NavLink>
              <button className="sidebar-user-action" onClick={logout} title={t('common.signOut')} aria-label={t('common.signOut')}>
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

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          tool={ctxMenu.tool}
          isPinned={pinned.includes(ctxMenu.tool.id)}
          onPin={togglePinned}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  )
}
