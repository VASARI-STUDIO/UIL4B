import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { TOOLS, CATEGORIES, getCategory } from '../data/tools'

export default function TopBar({ onMenuToggle }) {
  const { user, userProfile } = useAuth()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [highlightIdx, setHighlightIdx] = useState(0)
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const inputRef = useRef(null)

  // Filtered results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    let pool = TOOLS
    if (activeFilter !== 'all') pool = pool.filter(t => t.category === activeFilter)
    if (!q) return pool.slice(0, 8)
    const matches = pool.filter(t => {
      if (t.label.toLowerCase().includes(q)) return true
      if (t.description.toLowerCase().includes(q)) return true
      if (t.keywords.some(k => k.includes(q))) return true
      return false
    })
    return matches.slice(0, 8)
  }, [query, activeFilter])

  // Clamp highlight if it exceeds results length
  const safeHighlight = Math.min(highlightIdx, Math.max(results.length - 1, 0))

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const goTo = (path) => {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(Math.min(safeHighlight + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(Math.max(safeHighlight - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[safeHighlight]) goTo(results[safeHighlight].path)
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>

        <span className="topbar-title" style={{ textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 800 }}>Vasari Obsidian</span>

        <div className="topbar-search-wrap" ref={searchRef}>
          <div className="topbar-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search tools, docs, prompts…"
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus() }}
                style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', padding: 0, display: 'flex' }}
                aria-label="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>

          {open && (
            <div className="topbar-search-panel">
              {/* Filter chips */}
              <div className="search-chips">
                <button
                  type="button"
                  className={`search-chip${activeFilter === 'all' ? ' active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >All</button>
                {CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`search-chip${activeFilter === c.id ? ' active' : ''}`}
                    onClick={() => setActiveFilter(c.id)}
                  >{c.label}</button>
                ))}
              </div>

              {/* Results */}
              {results.length === 0 ? (
                <div className="search-empty">No tools match "{query}"</div>
              ) : (
                <div className="search-results">
                  {results.map((tool, i) => {
                    const cat = getCategory(tool.category)
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        className={`search-result${i === safeHighlight ? ' active' : ''}`}
                        onMouseEnter={() => setHighlightIdx(i)}
                        onClick={() => goTo(tool.path)}
                      >
                        <div className="search-result-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            {cat?.icon}
                          </svg>
                        </div>
                        <div className="search-result-body">
                          <div className="search-result-label">{tool.label}</div>
                          <div className="search-result-desc">{tool.description}</div>
                        </div>
                        <div className="search-result-cat">{cat?.label}</div>
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="search-footer">
                <span><kbd>↑↓</kbd> navigate</span>
                <span><kbd>↵</kbd> open</span>
                <span><kbd>esc</kbd> close</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="topbar-right">
        <nav className="topbar-tabs">
          <NavLink to="/community" className={({ isActive }) => `topbar-tab${isActive ? ' active' : ''}`}>
            Community
          </NavLink>
          <NavLink to="/feedback" className={({ isActive }) => `topbar-tab${isActive ? ' active' : ''}`}>
            Feedback
          </NavLink>
        </nav>

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
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </NavLink>
        )}
      </div>
    </header>
  )
}
