import { NavLink } from 'react-router-dom'

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
          <StatBlock label="Active Projects" value="12" />
          <StatBlock label="System Uptime" value="99.9%" dot />
          <StatBlock label="Last Sync" value="2m ago" />
        </div>
      </div>

      {/* Bento Grid */}
      <div className="dash-grid">
        {/* Palette Builder — large card */}
        <NavLink to="/palette" className="dash-card dash-card-lg" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="7.5" r="1.5" fill="var(--accent)"/><circle cx="8" cy="14" r="1.5" fill="var(--accent)"/><circle cx="16" cy="14" r="1.5" fill="var(--accent)"/>
              </svg>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 6 }}>Proprietary Algorithm</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Palette Builder</h2>
          <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, marginBottom: 20, maxWidth: 400 }}>
            Neural-linked color harmonization tool for building cohesive obsidian-tier design systems.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {['#9b7cff', '#6b5ce7', '#ff7eb3', '#c4c4c4', '#888'].map(c => (
              <div key={c} style={{ width: 40, height: 40, borderRadius: 8, background: c }} />
            ))}
          </div>
        </NavLink>

        {/* Tint Generator */}
        <NavLink to="/tints" className="dash-card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Tint Generator</h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--accent)', width: '80%' }} />
            <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-4)', width: '100%' }} />
            <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-4)', width: '60%' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', fontFamily: 'var(--mono)' }}>Generate Variants -&gt;</span>
        </NavLink>

        {/* Type Scale */}
        <NavLink to="/typescale" className="dash-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ color: 'var(--accent)', fontSize: 28, fontWeight: 800, marginBottom: 12, fontFamily: 'var(--font)' }}>tT</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Type Scale</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>Ag</span>
            <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.2 }}>Ag</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t2)', lineHeight: 1.2 }}>Ag</span>
            <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--t3)', lineHeight: 1.2 }}>Ag</span>
          </div>
        </NavLink>

        {/* Projects Library */}
        <NavLink to="/projects" className="dash-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Projects Library</h3>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 8h20"/>
              </svg>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ProjectRow name="Project_Helios_V2" date="Jan 24" />
            <ProjectRow name="Obsidian_Internal_Doc" date="Jan 22" />
          </div>
        </NavLink>

        {/* Asset Gallery */}
        <NavLink to="/resources" className="dash-card dash-card-accent" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M12 22V12"/><path d="M2 7v10l10 5"/><path d="M22 7v10l-10 5"/>
          </svg>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Asset Gallery</div>
          <div style={{ fontSize: 12, color: 'var(--t1)' }}>1,204 Assets Indexed</div>
        </NavLink>
      </div>

      {/* Footer Bar */}
      <div className="dash-footer">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)' }}>Cloud Node: Tokyo-01</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t3)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)' }}>V2.4.0-Stable</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <NavLink to="/docs-design" className="btn btn-s" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, fontWeight: 700 }}>Documentation</NavLink>
          <button className="btn btn-s" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, fontWeight: 700 }}>Export Library</button>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
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

function ProjectRow({ name, date }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>
          </svg>
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500 }}>{name}</span>
      </div>
      <span style={{ fontSize: 11, color: 'var(--t2)' }}>{date}</span>
    </div>
  )
}
