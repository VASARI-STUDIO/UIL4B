const categories = [
  {
    title: 'Typography',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
    links: [
      { name: 'Google Fonts', desc: 'Browse and pair 1,500+ open-source font families', url: 'https://fonts.google.com' },
    ],
  },
  {
    title: 'Color',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="10.5" r="2.5" />
        <circle cx="8.5" cy="7.5" r="2.5" />
        <circle cx="6.5" cy="12.5" r="2.5" />
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.7 6 12 3c-.7 3-2 4.5-4 6.5S5 13 5 15a7 7 0 0 0 7 7z" />
      </svg>
    ),
    links: [
      { name: 'Tailwind Colors', desc: 'Complete color palette reference for UI design', url: 'https://tailwindcss.com/docs/colors' },
    ],
  },
  {
    title: 'AI Image & Video',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l1.09 3.26L16 6l-2.91.74L12 10l-1.09-3.26L8 6l2.91-.74L12 2z" />
        <path d="M5 15l.55 1.64L7 17.18l-1.45.37L5 19.18l-.55-1.63L3 17.18l1.45-.37L5 15z" />
        <path d="M19 11l.55 1.64L21 13.01l-1.45.37L19 15.01l-.55-1.63L17 13.01l1.45-.37L19 11z" />
      </svg>
    ),
    links: [
      { name: 'Google Veo', desc: 'AI-powered video and effects generation', url: 'https://labs.google/fx/tools/flow' },
      { name: 'Higgsfield', desc: 'Create cinematic AI videos from text', url: 'https://higgsfield.ai/' },
    ],
  },
  {
    title: 'Framer',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    links: [
      { name: 'Framer Resources', desc: 'Templates, courses and community resources', url: 'https://framer.university/resources' },
      { name: 'Framer Marketplace', desc: 'Premium templates and components', url: 'https://www.framer.com/marketplace/' },
    ],
  },
  {
    title: 'Design Inspiration',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    links: [
      { name: 'Awwwards', desc: 'Award-winning website designs and trends', url: 'https://www.awwwards.com/' },
      { name: 'Land-book', desc: 'Curated landing page design gallery', url: 'https://land-book.com/' },
      { name: 'One Page Love', desc: 'One-page website design inspiration', url: 'https://onepagelove.com/' },
    ],
  },
  {
    title: 'AI Tools',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="2" x2="9" y2="4" />
        <line x1="15" y1="2" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="22" />
        <line x1="15" y1="20" x2="15" y2="22" />
        <line x1="20" y1="9" x2="22" y2="9" />
        <line x1="20" y1="15" x2="22" y2="15" />
        <line x1="2" y1="9" x2="4" y2="9" />
        <line x1="2" y1="15" x2="4" y2="15" />
      </svg>
    ),
    links: [
      { name: 'Motion Sites', desc: 'Ready-to-use AI site generation prompts', url: 'https://motionsites.ai/' },
      { name: 'Relume', desc: 'AI wireframing and sitemap builder', url: 'https://www.relume.io/' },
    ],
  },
]

const externalIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

export default function ExternalResources() {
  return (
    <div className="sec">
      <div className="sec-h">
        <h1>External Resources</h1>
        <p>Curated links to tools, inspiration, and references for web design.</p>
      </div>

      {categories.map((cat) => (
        <div key={cat.title} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--t1)' }}>
            <span style={{ display: 'flex', color: 'var(--accent)' }}>{cat.icon}</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{cat.title}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {cat.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '14px 16px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color .2s',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', marginBottom: 4 }}>{link.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.45 }}>{link.desc}</div>
                </div>
                {externalIcon}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
