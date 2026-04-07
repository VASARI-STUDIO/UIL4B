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
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 2, background: 'var(--accent)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
            {tools.length} {tools.length === 1 ? 'tool' : 'tools'}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, marginBottom: 12, textTransform: 'uppercase' }}>
          {cat.label}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--t1)', maxWidth: 600, lineHeight: 1.7 }}>
          {cat.description}
        </p>
      </div>

      {/* Tool grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 14, marginBottom: 40 }}>
        {tools.map(tool => (
          <NavLink
            key={tool.id}
            to={tool.path}
            className="dash-card"
            style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', minHeight: 180 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 4, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {cat.icon}
                </svg>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 3 }}>
                {cat.label}
              </span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{tool.label}</h3>
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
