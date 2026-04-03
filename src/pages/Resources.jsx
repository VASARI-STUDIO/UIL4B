import { NavLink } from 'react-router-dom'

const TOOLS = [
  { to: '/typescale', label: 'Type Scale', desc: 'Calculate modular type scales with ratio presets.' },
  { to: '/fontpairs', label: 'Font Matcher', desc: 'Discover curated heading and body font pairings.' },
  { to: '/buttons', label: 'Button Catalogue', desc: 'Browse reusable button styles with copy-ready CSS.' },
  { to: '/layouts', label: 'Section Layouts', desc: 'Common responsive section patterns for any project.' },
  { to: '/icons', label: 'Icon Library', desc: 'Search thousands of icons across multiple packs.' },
  { to: '/imgconvert', label: 'Image Converter', desc: 'Convert, compress, and resize images locally.' },
  { to: '/prompts', label: 'Prompt Library', desc: 'Save and organize AI image generation prompts.' },
]

const LINKS = [
  { href: 'https://framer.university', label: 'Framer University' },
  { href: 'https://fonts.google.com', label: 'Google Fonts' },
  { href: 'https://labs.google/fx/tools/flow', label: 'Google Flow' },
  { href: 'https://stitch.withgoogle.com/?pli=1', label: 'Google Stitch' },
]

export default function Resources() {
  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Resources</h1>
        <p>Additional tools, utilities, and external links to help your design workflow.</p>
      </div>

      <div className="sub">
        <h2>Tools & Utilities</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px,100%), 1fr))', gap: 12 }}>
          {TOOLS.map(t => (
            <NavLink key={t.to} to={t.to} className="card" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--t0)' }}>{t.label}</div>
              <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>{t.desc}</div>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="sub">
        <h2>External Links</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px,100%), 1fr))', gap: 12 }}>
          {LINKS.map(l => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{l.label}</span>
              <span style={{ fontSize: 11, color: 'var(--t2)' }}>&rarr;</span>
            </a>
          ))}
        </div>
      </div>

      <div className="sub">
        <h2>Knowledge Base</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px,100%), 1fr))', gap: 12 }}>
          <NavLink to="/docs-design" className="card" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--t0)' }}>Web Design Principles</div>
            <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>Psychology-driven strategies for high-converting design.</div>
          </NavLink>
          <NavLink to="/docs-social" className="card" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--t0)' }}>Social Media Marketing</div>
            <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>Content strategy and growth tactics for designers.</div>
          </NavLink>
        </div>
      </div>
    </div>
  )
}
