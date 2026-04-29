import { NavLink } from 'react-router-dom'
import { getCategory, toolsByCategory, CATEGORIES } from '../data/tools'

export default function CategoryDashboard({ categoryId }) {
  const cat = getCategory(categoryId)
  const tools = toolsByCategory(categoryId)

  if (!cat) {
    return <div className="sec"><h1>Unknown category</h1></div>
  }

  return (
    <div className="sec">
      {/* Hero */}
      <div className="hero-section" style={{ marginBottom: 40 }}>
        <div className="hero-glow" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 32, height: 2, background: 'var(--accent)', borderRadius: 1, boxShadow: '0 0 12px var(--accent-glow)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
            {tools.length} {tools.length === 1 ? 'tool' : 'tools'}
          </span>
        </div>
        <h1 className="hero-title" style={{ textTransform: 'uppercase' }}>
          {cat.label}
        </h1>
        <p className="hero-sub">
          {cat.description}
        </p>
      </div>

      {/* Tool grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 14, marginBottom: 40 }}>
        {tools.map(tool => (
          <NavLink
            key={tool.id}
            to={tool.path}
            className="card-i"
            style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', minHeight: 180 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-s)', background: 'var(--accent-bg)', border: '1px solid rgba(167,139,250,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {cat.icon}
                </svg>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', padding: '4px 10px', background: 'rgba(255,255,255,.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-s)' }}>
                {cat.label}
              </span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em' }}>{tool.label}</h3>
            <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, flex: 1 }}>{tool.description}</p>
            <div style={{ marginTop: 16, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
              Open Tool &rarr;
            </div>
          </NavLink>
        ))}
      </div>

      {/* Cross-category jump bar */}
      <div className="dash-footer">
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Jump to category</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.filter(c => c.id !== categoryId).map(c => (
            <NavLink
              key={c.id}
              to={c.path}
              className="btn btn-s"
              style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, fontWeight: 700 }}
            >
              {c.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}
