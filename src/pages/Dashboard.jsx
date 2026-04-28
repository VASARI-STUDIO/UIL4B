import { NavLink } from 'react-router-dom'
import { CATEGORIES, TOOLS, toolsByCategory, getCategory } from '../data/tools'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useAuth } from '../contexts/AuthContext'

function PinIcon({ filled }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76Z" />
    </svg>
  )
}

function ToolTile({ tool }) {
  const { pinned, togglePinned } = useWorkspace()
  const cat = getCategory(tool.category)
  const isPinned = pinned.includes(tool.id)

  return (
    <NavLink to={tool.path} className="tool-tile">
      <div className="tool-tile-head">
        <div className="tool-tile-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {cat?.icon}
          </svg>
        </div>
        <button
          type="button"
          className={`tool-tile-pin${isPinned ? ' pinned' : ''}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePinned(tool.id) }}
          aria-label={isPinned ? `Unpin ${tool.label}` : `Pin ${tool.label}`}
        >
          <PinIcon filled={isPinned} />
        </button>
      </div>
      <div className="tool-tile-label">{tool.label}</div>
      <div className="tool-tile-desc">{tool.description}</div>
      <div className="tool-tile-cat">{cat?.label}</div>
    </NavLink>
  )
}

export default function Dashboard() {
  const { user, userProfile } = useAuth()
  const { recent, pinned } = useWorkspace()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 5) return 'Working late'
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  const firstName = userProfile?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'maker'

  const pinnedTools = pinned.map(id => TOOLS.find(t => t.id === id)).filter(Boolean)
  const recentTools = recent
    .map(id => TOOLS.find(t => t.id === id))
    .filter(Boolean)
    .filter(t => !pinned.includes(t.id))
    .slice(0, 4)

  return (
    <div className="sec">
      {/* Hero */}
      <div style={{ marginBottom: 36 }}>
        <span className="hero-eyebrow">
          <span className="dot" /> All systems operational
        </span>
        <h1 className="hero-title">
          {greeting}, <em>{firstName}</em>.
        </h1>
        <p className="hero-sub">
          Your design toolkit, end to end. Search any tool with{' '}
          <kbd style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 6px' }}>⌘K</kbd>
          {' '}or browse below.
        </p>
      </div>

      {/* Quick stats */}
      <div className="qstats">
        <div className="qstat">
          <span className="qstat-label">Tools online</span>
          <span className="qstat-value"><span className="dot" />{TOOLS.length}</span>
        </div>
        <div className="qstat">
          <span className="qstat-label">Categories</span>
          <span className="qstat-value">{CATEGORIES.length}</span>
        </div>
        <div className="qstat">
          <span className="qstat-label">Pinned</span>
          <span className="qstat-value">{pinned.length}</span>
        </div>
        <div className="qstat">
          <span className="qstat-label">Recent</span>
          <span className="qstat-value">{recent.length}</span>
        </div>
      </div>

      {/* Pinned (only if any) */}
      {pinnedTools.length > 0 && (
        <>
          <div className="section-h">
            <h2><span className="num">01</span> Pinned</h2>
            <span className="meta">{pinnedTools.length} {pinnedTools.length === 1 ? 'tool' : 'tools'}</span>
          </div>
          <div className="tile-grid">
            {pinnedTools.map(t => <ToolTile key={t.id} tool={t} />)}
          </div>
        </>
      )}

      {/* Recent */}
      {recentTools.length > 0 && (
        <>
          <div className="section-h">
            <h2><span className="num">{pinnedTools.length > 0 ? '02' : '01'}</span> Recently used</h2>
            <span className="meta">last {recentTools.length}</span>
          </div>
          <div className="tile-grid">
            {recentTools.map(t => <ToolTile key={t.id} tool={t} />)}
          </div>
        </>
      )}

      {/* All tools by category */}
      {CATEGORIES.map((cat, idx) => {
        const tools = toolsByCategory(cat.id)
        const sectionNum = String(
          (pinnedTools.length > 0 ? 1 : 0) + (recentTools.length > 0 ? 1 : 0) + idx + 1
        ).padStart(2, '0')
        return (
          <div key={cat.id}>
            <div className="section-h">
              <h2>
                <span className="num">{sectionNum}</span>
                {cat.label}
              </h2>
              <NavLink to={cat.path} className="meta" style={{ textDecoration: 'none' }}>
                View category &rarr;
              </NavLink>
            </div>
            <div className="tile-grid">
              {tools.map(t => <ToolTile key={t.id} tool={t} />)}
            </div>
          </div>
        )
      })}

      {/* Footer */}
      <div className="dash-footer" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)' }} />
            v2.5 · Stable
          </span>
          <NavLink to="/docs" style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', textDecoration: 'none' }}>
            Documentation &rarr;
          </NavLink>
          <NavLink to="/feedback" style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', textDecoration: 'none' }}>
            Send feedback &rarr;
          </NavLink>
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t3)' }}>
          Vasari Obsidian Toolkit
        </span>
      </div>
    </div>
  )
}
