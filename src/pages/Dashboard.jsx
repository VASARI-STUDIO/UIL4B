import { NavLink } from 'react-router-dom'
import { CATEGORIES, TOOLS, toolsByCategory, getCategory } from '../data/tools'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useAuth } from '../contexts/AuthContext'

function PinIcon({ filled }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76Z" />
    </svg>
  )
}

const CAT_ILLUSTRATIONS = {
  color: (
    <svg viewBox="0 0 80 80" fill="none" className="cat-card-art">
      <circle cx="28" cy="32" r="18" fill="rgba(139,92,246,.12)" />
      <circle cx="50" cy="32" r="18" fill="rgba(59,130,246,.10)" />
      <circle cx="39" cy="48" r="18" fill="rgba(236,72,153,.08)" />
      <circle cx="28" cy="32" r="8" fill="rgba(139,92,246,.25)" />
      <circle cx="50" cy="32" r="8" fill="rgba(59,130,246,.2)" />
      <circle cx="39" cy="48" r="8" fill="rgba(236,72,153,.18)" />
    </svg>
  ),
  typography: (
    <svg viewBox="0 0 80 80" fill="none" className="cat-card-art">
      <text x="10" y="42" fontFamily="Inter, sans-serif" fontSize="36" fontWeight="800" fill="rgba(139,92,246,.12)">Aa</text>
      <text x="10" y="42" fontFamily="Inter, sans-serif" fontSize="36" fontWeight="800" fill="none" stroke="rgba(139,92,246,.2)" strokeWidth="1">Aa</text>
      <line x1="10" y1="54" x2="55" y2="54" stroke="rgba(139,92,246,.15)" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="62" x2="40" y2="62" stroke="rgba(139,92,246,.1)" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="70" x2="48" y2="70" stroke="rgba(139,92,246,.07)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  imagery: (
    <svg viewBox="0 0 80 80" fill="none" className="cat-card-art">
      <rect x="10" y="16" width="52" height="40" rx="6" fill="rgba(139,92,246,.06)" stroke="rgba(139,92,246,.15)" strokeWidth="1.5" />
      <circle cx="24" cy="28" r="5" fill="rgba(59,130,246,.15)" />
      <path d="M10 46 28 32 42 44 52 36 62 46" stroke="rgba(139,92,246,.2)" strokeWidth="1.5" fill="rgba(139,92,246,.04)" />
      <rect x="14" y="60" width="20" height="3" rx="1.5" fill="rgba(139,92,246,.1)" />
      <rect x="14" y="66" width="14" height="3" rx="1.5" fill="rgba(139,92,246,.07)" />
    </svg>
  ),
  components: (
    <svg viewBox="0 0 80 80" fill="none" className="cat-card-art">
      <rect x="10" y="14" width="24" height="24" rx="5" fill="rgba(139,92,246,.1)" stroke="rgba(139,92,246,.15)" strokeWidth="1" />
      <rect x="40" y="14" width="24" height="24" rx="5" fill="rgba(59,130,246,.08)" stroke="rgba(59,130,246,.12)" strokeWidth="1" />
      <rect x="10" y="44" width="24" height="24" rx="5" fill="rgba(236,72,153,.06)" stroke="rgba(236,72,153,.1)" strokeWidth="1" />
      <rect x="40" y="44" width="24" height="24" rx="5" fill="rgba(52,211,153,.06)" stroke="rgba(52,211,153,.1)" strokeWidth="1" />
      <circle cx="22" cy="26" r="4" fill="rgba(139,92,246,.2)" />
      <rect x="47" y="23" width="10" height="6" rx="3" fill="rgba(59,130,246,.18)" />
    </svg>
  ),
  documentation: (
    <svg viewBox="0 0 80 80" fill="none" className="cat-card-art">
      <rect x="16" y="10" width="40" height="52" rx="4" fill="rgba(139,92,246,.05)" stroke="rgba(139,92,246,.12)" strokeWidth="1.5" />
      <line x1="24" y1="24" x2="48" y2="24" stroke="rgba(139,92,246,.15)" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="32" x2="44" y2="32" stroke="rgba(139,92,246,.1)" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="40" x2="46" y2="40" stroke="rgba(139,92,246,.1)" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="48" x2="36" y2="48" stroke="rgba(139,92,246,.08)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="52" r="10" fill="rgba(59,130,246,.06)" stroke="rgba(59,130,246,.12)" strokeWidth="1" />
      <path d="M45 52h6M48 49v6" stroke="rgba(59,130,246,.2)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
}

function ToolMini({ tool }) {
  const { pinned, togglePinned } = useWorkspace()
  const cat = getCategory(tool.category)
  const isPinned = pinned.includes(tool.id)

  return (
    <NavLink to={tool.path} className="tool-mini">
      <div className="tool-mini-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {cat?.icon}
        </svg>
      </div>
      <div className="tool-mini-body">
        <span className="tool-mini-label">{tool.label}</span>
        <span className="tool-mini-desc">{tool.description}</span>
      </div>
      <button
        type="button"
        className={`tool-mini-pin${isPinned ? ' pinned' : ''}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePinned(tool.id) }}
        aria-label={isPinned ? `Unpin ${tool.label}` : `Pin ${tool.label}`}
      >
        <PinIcon filled={isPinned} />
      </button>
    </NavLink>
  )
}

export default function Dashboard() {
  const { user, userProfile } = useAuth()
  const { pinned } = useWorkspace()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 5) return 'Working late'
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  const firstName = userProfile?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'maker'
  const pinnedTools = pinned.map(id => TOOLS.find(t => t.id === id)).filter(Boolean)

  return (
    <div className="dash">
      {/* Hero — compact */}
      <div className="dash-hero">
        <div className="hero-glow" />
        <h1 className="dash-hero-title">
          {greeting}, <em>{firstName}</em>
        </h1>
        <p className="dash-hero-sub">
          Pick up where you left off, or explore a category below.
        </p>
      </div>

      {/* Pinned tools */}
      <section className="dash-section">
        <div className="dash-section-header">
          <h2>Your Tools</h2>
          <span className="dash-section-meta">{pinnedTools.length} pinned</span>
        </div>
        <div className="dash-tools-grid">
          {pinnedTools.map(t => <ToolMini key={t.id} tool={t} />)}
          {pinnedTools.length === 0 && (
            <div className="dash-empty">
              Pin tools from any category to see them here.
            </div>
          )}
        </div>
      </section>

      {/* Category cards with illustrations */}
      <section className="dash-section">
        <div className="dash-section-header">
          <h2>Explore</h2>
          <span className="dash-section-meta">{CATEGORIES.length} categories</span>
        </div>
        <div className="dash-cats-grid">
          {CATEGORIES.map(cat => {
            const tools = toolsByCategory(cat.id)
            return (
              <NavLink key={cat.id} to={cat.path} className="cat-card">
                <div className="cat-card-visual">
                  {CAT_ILLUSTRATIONS[cat.id]}
                </div>
                <div className="cat-card-content">
                  <div className="cat-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {cat.icon}
                    </svg>
                  </div>
                  <h3 className="cat-card-title">{cat.label}</h3>
                  <p className="cat-card-desc">{cat.description}</p>
                  <span className="cat-card-count">{tools.length} {tools.length === 1 ? 'tool' : 'tools'}</span>
                </div>
              </NavLink>
            )
          })}
        </div>
      </section>
    </div>
  )
}
