import { NavLink } from 'react-router-dom'
import { CATEGORIES, TOOLS, toolsByCategory } from '../data/tools'

export default function Dashboard() {
  return (
    <div className="sec">
      {/* Hero */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, marginBottom: 12, textTransform: 'uppercase' }}>
            Systems Overview
          </h1>
          <p style={{ fontSize: 15, color: 'var(--t1)', maxWidth: 500, lineHeight: 1.7 }}>
            Orchestrate your creative workflow through the Obsidian architecture. Real-time synchronization active.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <StatBlock label="Categories" value={String(CATEGORIES.length)} />
          <StatBlock label="Tools Online" value={String(TOOLS.length)} dot />
          <StatBlock label="System Uptime" value="99.9%" />
        </div>
      </div>

      {/* Category Bento Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 14, marginBottom: 40 }}>
        {CATEGORIES.map((cat, idx) => {
          const tools = toolsByCategory(cat.id)
          return (
            <NavLink key={cat.id} to={cat.path} className="dash-card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', minHeight: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {cat.icon}
                  </svg>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 3, fontFamily: 'var(--mono)' }}>
                  0{idx + 1} / {tools.length} TOOLS
                </span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{cat.label}</h2>
              <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, marginBottom: 16, flex: 1 }}>{cat.description}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                {tools.slice(0, 3).map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
                    <span>{t.label}</span>
                    <span>&rarr;</span>
                  </div>
                ))}
                {tools.length > 3 && (
                  <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 4 }}>+{tools.length - 3} more</div>
                )}
              </div>
            </NavLink>
          )
        })}
      </div>

      {/* Footer Bar */}
      <div className="dash-footer">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)' }}>Cloud Node: Sydney-01</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t3)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)' }}>V2.5.0-Stable</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <NavLink to="/docs" className="btn btn-s" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, fontWeight: 700 }}>Documentation</NavLink>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 3, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite' }} />
            <span style={{ color: 'var(--accent)' }}>Live Technical Feed: Active</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function StatBlock({ label, value, dot }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
        {dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />}
        {value}
      </div>
    </div>
  )
}
