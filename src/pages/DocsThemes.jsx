import { useState } from 'react'
import DocsTOC from '../components/DocsTOC'

const LAST_UPDATED = '2026-06-15'

const TOC_ITEMS = [
  { id: 'theme-01', number: '01', title: 'Neo-Brutalism' },
  { id: 'theme-02', number: '02', title: 'Glassmorphism' },
  { id: 'theme-03', number: '03', title: 'Bento Grid' },
  { id: 'theme-04', number: '04', title: 'Dark Luxury' },
  { id: 'theme-05', number: '05', title: 'Claymorphism' },
  { id: 'theme-06', number: '06', title: 'Swiss / International' },
  { id: 'theme-07', number: '07', title: 'Organic / Soft UI' },
  { id: 'theme-08', number: '08', title: 'Retro / Y2K Revival' },
]

function Article({ id, number, title, updated, children }) {
  return (
    <section id={id} style={{ marginBottom: 48, paddingBottom: 48, borderBottom: '1px solid var(--border)', scrollMarginTop: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 48, fontWeight: 800, color: 'var(--accent)', opacity: 0.15, lineHeight: 1, fontFamily: 'var(--mono)' }}>{number}</span>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.2 }}>{title}</h2>
      </div>
      {updated && (
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 20, paddingLeft: 58 }}>
          Updated {updated}
        </div>
      )}
      <div style={{ maxWidth: 760 }}>{children}</div>
    </section>
  )
}

function Tag({ children }) {
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--t1)', marginRight: 6, marginBottom: 6 }}>{children}</span>
}

function BrandLink({ name, url }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 6, background: 'var(--bg-1)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none', transition: 'all .15s', marginRight: 8, marginBottom: 8 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.background = 'var(--brand-bg)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-1)' }}
    >
      {name}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
    </a>
  )
}

function Callout({ children, type = 'insight' }) {
  const colors = {
    insight: { bg: 'var(--accent-bg)', border: 'var(--accent)', label: 'Key Trait' },
    when: { bg: 'rgba(99,91,255,.06)', border: '#635BFF', label: 'Best For' },
    avoid: { bg: 'rgba(245,158,11,.08)', border: 'var(--warn)', label: 'Watch Out' },
  }
  const c = colors[type]
  return (
    <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-s)', background: c.bg, borderLeft: `3px solid ${c.border}`, marginTop: 12, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: c.border, marginBottom: 6 }}>{c.label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t0)' }}>{children}</div>
    </div>
  )
}

function DesktopMockup({ children, label }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>Desktop</div>}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-l)', overflow: 'hidden', background: 'var(--card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
          <span style={{ flex: 1, height: 18, borderRadius: 4, background: 'var(--bg-2)', marginLeft: 8 }} />
        </div>
        <div style={{ padding: 20, minHeight: 200 }}>{children}</div>
      </div>
    </div>
  )
}

function MobileMockup({ children, label }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>Mobile</div>}
      <div style={{ width: 220, border: '2px solid var(--border)', borderRadius: 24, overflow: 'hidden', background: 'var(--card)', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: 60, height: 4, borderRadius: 4, background: 'var(--border)' }} />
        </div>
        <div style={{ padding: 14, minHeight: 300 }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
          <span style={{ width: 32, height: 4, borderRadius: 4, background: 'var(--border)' }} />
        </div>
      </div>
    </div>
  )
}

function MockupRow({ desktop, mobile }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start', marginTop: 20, marginBottom: 20 }}>
      <DesktopMockup label>{desktop}</DesktopMockup>
      <MobileMockup label>{mobile}</MobileMockup>
    </div>
  )
}

function CSSSnippet({ code }) {
  return (
    <pre style={{ padding: '14px 16px', borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)', fontSize: 12, fontFamily: 'var(--mono)', lineHeight: 1.7, color: 'var(--t1)', overflow: 'auto', marginTop: 10, marginBottom: 16 }}>
      <code>{code}</code>
    </pre>
  )
}

const P = ({ children }) => <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>{children}</p>

export default function DocsThemes() {
  const [filter, setFilter] = useState('all')
  const categories = ['all', 'modern', 'retro', 'minimal', 'bold']

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Documentation</div>
        <h1>UI Design Themes</h1>
        <p>A reference guide to the major UI design trends shaping the web. Each theme includes what it is, when to use it, real brands using it, and visual examples in desktop and mobile.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>Last updated: {LAST_UPDATED}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: filter === c ? '1px solid var(--brand)' : '1px solid var(--border)',
              background: filter === c ? 'var(--brand-bg)' : 'transparent',
              color: filter === c ? 'var(--brand)' : 'var(--t2)',
              textTransform: 'capitalize', transition: 'all .15s',
            }}
          >{c}</button>
        ))}
      </div>

      <DocsTOC items={TOC_ITEMS} />

      {/* ── 01 NEO-BRUTALISM ── */}
      <Article id="theme-01" number="01" title="Neo-Brutalism" updated="Jun 2026">
        <div style={{ marginBottom: 12 }}>
          <Tag>Bold</Tag><Tag>Modern</Tag><Tag>High contrast</Tag>
        </div>
        <P>
          Neo-Brutalism takes cues from the Brutalist architecture movement — raw materials, exposed structure, zero ornamentation — and translates it to web design. Think thick black borders, solid fills, hard drop shadows, and loud typography. It deliberately rejects polish.
        </P>
        <P>
          <strong>Also known as:</strong> New Brutalism, Brutalist web design, Anti-design, Raw UI.
        </P>

        <Callout type="insight">Heavy black outlines (2-4px), solid background colours, monospace or chunky sans-serif type, and hard-offset box shadows (no blur). Every element looks like it was cut and pasted.</Callout>

        <Callout type="when">Startups, creative agencies, developer tools, and brands that want to stand out from the sea of rounded-corner SaaS templates. Works especially well for portfolios and editorial sites.</Callout>

        <Callout type="avoid">Corporate / enterprise clients, healthcare, finance, or anywhere trust and polish are table stakes. The deliberately raw aesthetic can read as "broken" to mainstream users.</Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>Brands using this style</h4>
        <div style={{ marginBottom: 16 }}>
          <BrandLink name="Gumroad" url="https://gumroad.com" />
          <BrandLink name="Figma" url="https://figma.com" />
          <BrandLink name="Notion" url="https://notion.so" />
          <BrandLink name="Pitch" url="https://pitch.com" />
        </div>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Key CSS properties</h4>
        <CSSSnippet code={`border: 3px solid #000;
box-shadow: 4px 4px 0 #000;
border-radius: 0;
font-family: 'Space Mono', monospace;
background: #FFE566; /* solid, loud fills */`} />

        <MockupRow
          desktop={
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, padding: 16, background: '#FFE566', border: '3px solid #000', boxShadow: '4px 4px 0 #000' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>Featured</div>
                  <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>Build stuff that matters.</div>
                </div>
                <div style={{ flex: 1, padding: 16, background: '#A8F0D4', border: '3px solid #000', boxShadow: '4px 4px 0 #000' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>Pricing</div>
                  <div style={{ fontSize: 28, fontWeight: 900 }}>$0</div>
                  <div style={{ fontSize: 12 }}>Free forever</div>
                </div>
              </div>
              <button style={{ padding: '12px 28px', background: '#000', color: '#fff', border: '3px solid #000', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', boxShadow: '4px 4px 0 #FFE566' }}>Get started →</button>
            </div>
          }
          mobile={
            <div>
              <div style={{ padding: 12, background: '#FFE566', border: '2px solid #000', boxShadow: '3px 3px 0 #000', marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.3 }}>Ship fast.</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>No fluff, just tools.</div>
              </div>
              <div style={{ padding: 10, background: '#A8F0D4', border: '2px solid #000', boxShadow: '3px 3px 0 #000', marginBottom: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 900 }}>$0</div>
                <div style={{ fontSize: 10 }}>Free tier</div>
              </div>
              <button style={{ width: '100%', padding: '10px', background: '#000', color: '#fff', border: '2px solid #000', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'monospace' }}>Get started</button>
            </div>
          }
        />
      </Article>

      {/* ── 02 GLASSMORPHISM ── */}
      <Article id="theme-02" number="02" title="Glassmorphism" updated="Jun 2026">
        <div style={{ marginBottom: 12 }}>
          <Tag>Modern</Tag><Tag>Minimal</Tag><Tag>Translucent</Tag>
        </div>
        <P>
          Glassmorphism creates a frosted-glass effect using <code>backdrop-filter: blur()</code>, semi-transparent backgrounds, and subtle borders. Popularised by Apple's macOS Big Sur and iOS, it creates depth through transparency rather than shadows.
        </P>
        <P>
          <strong>Also known as:</strong> Frosted glass UI, Acrylic design (Microsoft), Blur UI, Translucent design.
        </P>

        <Callout type="insight">The effect depends on a colourful or image-rich background behind the glass layer. Without something to blur, it just looks like a slightly transparent card.</Callout>

        <Callout type="when">Dashboards, media apps, creative tools, landing pages with gradient backgrounds. Any UI that benefits from feeling lightweight and layered.</Callout>

        <Callout type="avoid">Low-contrast text becomes unreadable over varying backgrounds. Always test with light and dark images behind the glass. Accessibility can be challenging.</Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>Brands using this style</h4>
        <div style={{ marginBottom: 16 }}>
          <BrandLink name="Apple" url="https://apple.com" />
          <BrandLink name="Linear" url="https://linear.app" />
          <BrandLink name="Raycast" url="https://raycast.com" />
          <BrandLink name="Arc Browser" url="https://arc.net" />
        </div>

        <CSSSnippet code={`background: rgba(255, 255, 255, 0.12);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.18);
border-radius: 16px;`} />

        <MockupRow
          desktop={
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 12, padding: 24, minHeight: 160 }}>
              <div style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: 14, border: '1px solid rgba(255,255,255,.2)', padding: 20, maxWidth: 340 }}>
                <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Dashboard</div>
                <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginBottom: 14 }}>Your workspace at a glance</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>128</div>
                    <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 10 }}>Projects</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,.1)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>94%</div>
                    <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 10 }}>Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          }
          mobile={
            <div style={{ background: 'linear-gradient(180deg, #667eea, #764ba2)', borderRadius: 10, padding: 12, minHeight: 260 }}>
              <div style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid rgba(255,255,255,.2)', padding: 14, marginBottom: 10 }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Overview</div>
                <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 10 }}>Today</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,.1)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid rgba(255,255,255,.15)', padding: 14 }}>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>128</div>
                <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 10 }}>Active projects</div>
              </div>
            </div>
          }
        />
      </Article>

      {/* ── 03 BENTO GRID ── */}
      <Article id="theme-03" number="03" title="Bento Grid" updated="Jun 2026">
        <div style={{ marginBottom: 12 }}>
          <Tag>Modern</Tag><Tag>Structured</Tag><Tag>Apple-inspired</Tag>
        </div>
        <P>
          Named after Japanese bento boxes, this layout organises content into a clean grid of mixed-size cards. Apple popularised it for product feature pages; now it's the default pattern for SaaS landing pages and dashboards.
        </P>
        <P>
          <strong>Also known as:</strong> Bento layout, Feature grid, Card mosaic, Modular grid.
        </P>

        <Callout type="insight">The magic is in the size contrast — mixing 1×1, 2×1, and 2×2 cards creates visual rhythm without chaos. Each card is self-contained with one message.</Callout>

        <Callout type="when">Feature showcases, product pages, dashboards, portfolio sites. Anywhere you need to present 4-12 distinct things in a visually interesting way.</Callout>

        <Callout type="avoid">Content that has a natural reading order (tutorials, documentation). Bento grids work for scannable content, not sequential narratives.</Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>Brands using this style</h4>
        <div style={{ marginBottom: 16 }}>
          <BrandLink name="Apple" url="https://apple.com" />
          <BrandLink name="Vercel" url="https://vercel.com" />
          <BrandLink name="Resend" url="https://resend.com" />
          <BrandLink name="Clerk" url="https://clerk.com" />
        </div>

        <CSSSnippet code={`display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 12px;
/* Feature card spanning 2 cols */
.feature-hero { grid-column: span 2; grid-row: span 2; }`} />

        <MockupRow
          desktop={
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div style={{ gridColumn: 'span 2', background: 'var(--bg-1)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>Performance</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)' }}>10x faster builds</div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>Incremental compilation with zero config.</div>
              </div>
              <div style={{ background: 'var(--bg-1)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>Type-safe</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>End-to-end types</div>
              </div>
              <div style={{ background: 'var(--bg-1)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>Edge</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>Global CDN</div>
              </div>
              <div style={{ gridColumn: 'span 2', background: 'var(--bg-1)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>Analytics</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>Real-time insights with zero config</div>
              </div>
            </div>
          }
          mobile={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: 'var(--bg-1)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 4 }}>Performance</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>10x faster</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: 'var(--bg-1)', borderRadius: 8, padding: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 4 }}>Types</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)' }}>E2E safe</div>
                </div>
                <div style={{ background: 'var(--bg-1)', borderRadius: 8, padding: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 4 }}>Edge</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)' }}>Global</div>
                </div>
              </div>
            </div>
          }
        />
      </Article>

      {/* ── 04 DARK LUXURY ── */}
      <Article id="theme-04" number="04" title="Dark Luxury" updated="Jun 2026">
        <div style={{ marginBottom: 12 }}>
          <Tag>Bold</Tag><Tag>Premium</Tag><Tag>Dark mode</Tag>
        </div>
        <P>
          A near-black palette with gold, cream, or single-accent highlights. Large serif headings, generous whitespace, and subtle gradients. The goal is to feel expensive and exclusive — like walking into a high-end store.
        </P>
        <P>
          <strong>Also known as:</strong> Premium dark, Luxury UI, High-end minimal, Editorial dark.
        </P>

        <Callout type="insight">The key ingredient is restraint. One accent colour (gold, champagne, or muted blue), lots of negative space, and serif headings. Every element earns its place.</Callout>

        <Callout type="when">Luxury brands, fintech, premium SaaS, agencies, fashion, automotive. Any product positioning itself as high-end.</Callout>

        <Callout type="avoid">Actual gold (#FFD700) looks cheap — use muted golds like #C9A96E or #B8945F. Avoid too many shiny effects; subtlety is what sells.</Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>Brands using this style</h4>
        <div style={{ marginBottom: 16 }}>
          <BrandLink name="Stripe" url="https://stripe.com" />
          <BrandLink name="Loom" url="https://loom.com" />
          <BrandLink name="Rolex" url="https://rolex.com" />
          <BrandLink name="Mercury" url="https://mercury.com" />
        </div>

        <CSSSnippet code={`--bg: #0A0A0A;
--text: #E8E4DE;
--accent: #C9A96E;
font-family: 'Playfair Display', serif;
letter-spacing: -0.02em;`} />

        <MockupRow
          desktop={
            <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 28, color: '#E8E4DE' }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: '#C9A96E', marginBottom: 16 }}>Established 2024</div>
              <div style={{ fontSize: 32, fontWeight: 300, fontFamily: 'Georgia, serif', letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 12 }}>Crafted for those<br />who notice the details.</div>
              <div style={{ fontSize: 13, color: '#888', lineHeight: 1.7, maxWidth: 380, marginBottom: 20 }}>A curated experience where every pixel serves a purpose. No noise. No compromise.</div>
              <button style={{ padding: '10px 28px', background: 'transparent', border: '1px solid #C9A96E', color: '#C9A96E', fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 0 }}>Explore</button>
            </div>
          }
          mobile={
            <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 16, color: '#E8E4DE' }}>
              <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: '#C9A96E', marginBottom: 14 }}>Est. 2024</div>
              <div style={{ fontSize: 20, fontWeight: 300, fontFamily: 'Georgia, serif', letterSpacing: '-.02em', lineHeight: 1.3, marginBottom: 10 }}>Crafted for<br />the details.</div>
              <div style={{ fontSize: 11, color: '#888', lineHeight: 1.6, marginBottom: 16 }}>Every pixel serves a purpose.</div>
              <button style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #C9A96E', color: '#C9A96E', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Explore</button>
            </div>
          }
        />
      </Article>

      {/* ── 05 CLAYMORPHISM ── */}
      <Article id="theme-05" number="05" title="Claymorphism" updated="Jun 2026">
        <div style={{ marginBottom: 12 }}>
          <Tag>Bold</Tag><Tag>3D</Tag><Tag>Playful</Tag>
        </div>
        <P>
          Claymorphism makes UI elements look like soft, inflated clay or plastic. Think rounded corners, pastel colours, inner shadows, and double layered shadows that create a puffy 3D effect. It's the digital version of "tactile and squishy."
        </P>
        <P>
          <strong>Also known as:</strong> Clay UI, Inflated UI, Soft 3D, Bubbly design.
        </P>

        <Callout type="insight">The signature move is combining an outer shadow with an inner highlight (inset shadow at the top) to create the illusion of an inflated surface catching light from above.</Callout>

        <Callout type="when">Consumer apps, fintech for younger audiences, onboarding flows, landing pages that need to feel friendly and approachable.</Callout>

        <Callout type="avoid">Dense information interfaces. The rounded, puffy aesthetic eats space and can make data-heavy screens feel cluttered. Also ages quickly — use sparingly.</Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>Brands using this style</h4>
        <div style={{ marginBottom: 16 }}>
          <BrandLink name="Amie" url="https://amie.so" />
          <BrandLink name="Craft" url="https://craft.do" />
          <BrandLink name="Cron" url="https://cron.com" />
        </div>

        <CSSSnippet code={`background: #E8D5FF;
border-radius: 24px;
box-shadow:
  8px 8px 16px rgba(0,0,0,.1),
  inset 0 -2px 6px rgba(0,0,0,.05),
  inset 0 2px 6px rgba(255,255,255,.7);`} />

        <MockupRow
          desktop={
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, background: '#E8D5FF', borderRadius: 20, padding: 20, boxShadow: '6px 6px 12px rgba(0,0,0,.08), inset 0 2px 4px rgba(255,255,255,.7)' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#4A2D7A', marginBottom: 4 }}>$2,400</div>
                <div style={{ fontSize: 12, color: '#7A5AAF' }}>Revenue this month</div>
              </div>
              <div style={{ flex: 1, background: '#D5F0E8', borderRadius: 20, padding: 20, boxShadow: '6px 6px 12px rgba(0,0,0,.08), inset 0 2px 4px rgba(255,255,255,.7)' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#2D6B4A', marginBottom: 4 }}>89%</div>
                <div style={{ fontSize: 12, color: '#4A9B7A' }}>Satisfaction</div>
              </div>
            </div>
          }
          mobile={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#E8D5FF', borderRadius: 16, padding: 14, boxShadow: '4px 4px 10px rgba(0,0,0,.08), inset 0 2px 3px rgba(255,255,255,.7)' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#4A2D7A' }}>$2,400</div>
                <div style={{ fontSize: 10, color: '#7A5AAF' }}>Revenue</div>
              </div>
              <div style={{ background: '#D5F0E8', borderRadius: 16, padding: 14, boxShadow: '4px 4px 10px rgba(0,0,0,.08), inset 0 2px 3px rgba(255,255,255,.7)' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2D6B4A' }}>89%</div>
                <div style={{ fontSize: 10, color: '#4A9B7A' }}>Satisfaction</div>
              </div>
            </div>
          }
        />
      </Article>

      {/* ── 06 SWISS / INTERNATIONAL ── */}
      <Article id="theme-06" number="06" title="Swiss / International" updated="Jun 2026">
        <div style={{ marginBottom: 12 }}>
          <Tag>Minimal</Tag><Tag>Grid-based</Tag><Tag>Timeless</Tag>
        </div>
        <P>
          The Swiss (International Typographic) style is the grandfather of modern UI design. Grid-based layouts, Helvetica-style sans-serif type, flush-left alignment, mathematical spacing, and restrained use of colour. It prioritises clarity above all else.
        </P>
        <P>
          <strong>Also known as:</strong> International Typographic Style, Helvetica Style, Grid design, Swiss Modernism.
        </P>

        <Callout type="insight">Strict grid, left-aligned text, generous line height (1.6+), one typeface in 2-3 weights, and colour used only for function (links, status, CTAs) — never decoration.</Callout>

        <Callout type="when">Corporate sites, portfolios for print designers, government/institutional sites, anywhere credibility and clarity matter more than personality.</Callout>

        <Callout type="avoid">Brands that need warmth or playfulness. Pure Swiss style can feel clinical — consumer products and social apps usually need more personality.</Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>Brands using this style</h4>
        <div style={{ marginBottom: 16 }}>
          <BrandLink name="Bloomberg" url="https://bloomberg.com" />
          <BrandLink name="Dieter Rams" url="https://dieterrams.com" />
          <BrandLink name="SSENSE" url="https://ssense.com" />
          <BrandLink name="Aesop" url="https://aesop.com" />
        </div>

        <CSSSnippet code={`font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
line-height: 1.65;
letter-spacing: 0;
max-width: 720px;
/* Grid: 12-column, 20px gutter */`} />

        <MockupRow
          desktop={
            <div style={{ padding: 4 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 32 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 16 }}>Navigation</div>
                  <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 2.4 }}>
                    <div>About</div><div>Work</div><div>Contact</div>
                  </div>
                </div>
                <div>
                  <h2 style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-.01em', lineHeight: 1.3, marginBottom: 12, color: 'var(--t0)' }}>Form follows function.</h2>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--t2)', maxWidth: 440 }}>Good design is as little design as possible. Less, but better — because it concentrates on the essential aspects.</p>
                  <div style={{ width: 40, height: 2, background: 'var(--t0)', marginTop: 20 }} />
                </div>
              </div>
            </div>
          }
          mobile={
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 20 }}>About</div>
              <h2 style={{ fontSize: 20, fontWeight: 400, letterSpacing: '-.01em', lineHeight: 1.35, marginBottom: 10, color: 'var(--t0)' }}>Form follows function.</h2>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--t2)' }}>Less, but better — because it concentrates on the essential aspects.</p>
              <div style={{ width: 32, height: 2, background: 'var(--t0)', marginTop: 16 }} />
            </div>
          }
        />
      </Article>

      {/* ── 07 ORGANIC / SOFT UI ── */}
      <Article id="theme-07" number="07" title="Organic / Soft UI" updated="Jun 2026">
        <div style={{ marginBottom: 12 }}>
          <Tag>Modern</Tag><Tag>Minimal</Tag><Tag>Warm</Tag>
        </div>
        <P>
          Organic design uses earth tones, rounded shapes, grain textures, and natural imagery to create warmth. It rejects the cold efficiency of tech minimalism in favour of something that feels handcrafted and human. Think warm neutrals, blob shapes, and subtle noise overlays.
        </P>
        <P>
          <strong>Also known as:</strong> Soft UI (not neumorphism), Warm minimal, Earth-tone design, Natural design, Humanistic UI.
        </P>

        <Callout type="insight">Warm neutrals (#F5F0EB, #2C2420), slightly imperfect shapes (CSS blob clips), grain/noise texture overlays, and illustration over photography give it soul.</Callout>

        <Callout type="when">Wellness, food/beverage, D2C brands, portfolio sites, creative agencies. Anywhere you want to feel personal rather than corporate.</Callout>

        <Callout type="avoid">Data-heavy dashboards, dev tools, enterprise B2B. The softness can undermine perceived technical competence.</Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>Brands using this style</h4>
        <div style={{ marginBottom: 16 }}>
          <BrandLink name="Oatly" url="https://oatly.com" />
          <BrandLink name="Aesop" url="https://aesop.com" />
          <BrandLink name="Patagonia" url="https://patagonia.com" />
          <BrandLink name="Headspace" url="https://headspace.com" />
        </div>

        <CSSSnippet code={`--bg: #F5F0EB;
--text: #2C2420;
--accent: #B8763E;
border-radius: 24px;
font-family: 'DM Sans', sans-serif;
/* Add grain: background-image: url(noise.svg); */`} />

        <MockupRow
          desktop={
            <div style={{ background: '#F5F0EB', borderRadius: 12, padding: 28, color: '#2C2420' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#B8763E', marginBottom: 16 }}>Handcrafted</div>
              <div style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.3, marginBottom: 12 }}>Made with intention,<br />not algorithms.</div>
              <div style={{ fontSize: 13, color: '#8B7B6B', lineHeight: 1.7, maxWidth: 360, marginBottom: 20 }}>Every product is thoughtfully sourced, sustainably made, and designed to last. No fast fashion, no shortcuts.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ padding: '10px 24px', background: '#2C2420', color: '#F5F0EB', border: 'none', borderRadius: 24, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Shop now</button>
                <button style={{ padding: '10px 24px', background: 'transparent', color: '#2C2420', border: '1px solid #2C2420', borderRadius: 24, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Our story</button>
              </div>
            </div>
          }
          mobile={
            <div style={{ background: '#F5F0EB', borderRadius: 10, padding: 16, color: '#2C2420' }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#B8763E', marginBottom: 12 }}>Handcrafted</div>
              <div style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.3, marginBottom: 10 }}>Made with intention.</div>
              <div style={{ fontSize: 11, color: '#8B7B6B', lineHeight: 1.6, marginBottom: 14 }}>Sustainably sourced. Designed to last.</div>
              <button style={{ width: '100%', padding: '10px', background: '#2C2420', color: '#F5F0EB', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Shop now</button>
            </div>
          }
        />
      </Article>

      {/* ── 08 RETRO / Y2K REVIVAL ── */}
      <Article id="theme-08" number="08" title="Retro / Y2K Revival" updated="Jun 2026">
        <div style={{ marginBottom: 12 }}>
          <Tag>Retro</Tag><Tag>Bold</Tag><Tag>Nostalgic</Tag>
        </div>
        <P>
          Y2K Revival brings back the aesthetics of early 2000s digital culture — metallic gradients, pixel fonts, chunky borders, bold colour blocking, and star/sparkle motifs. It's nostalgia weaponised for Gen Z who find it "ironic-cool."
        </P>
        <P>
          <strong>Also known as:</strong> Y2K aesthetic, Retro web, McBling, Cyber kitsch, Digital maximalism, Frutiger Aero (the nature-meets-tech variant).
        </P>

        <Callout type="insight">Combine modern layout (grid, responsive) with retro styling: pixel fonts for headings, chrome/metallic gradients, bright saturated colours, and interface elements that reference old Windows/Mac UI.</Callout>

        <Callout type="when">Fashion, music, streetwear, social apps targeting 16-28 year olds, creative studios. Anything that trades on cultural cachet rather than trust signals.</Callout>

        <Callout type="avoid">Anything targeting 35+ demographics or requiring trust (banking, healthcare, legal). The ironic aesthetic reads as "unserious" to audiences who lived through the original era.</Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>Brands using this style</h4>
        <div style={{ marginBottom: 16 }}>
          <BrandLink name="Olivia Rodrigo" url="https://oliviarodrigo.com" />
          <BrandLink name="MSCHF" url="https://mschf.com" />
          <BrandLink name="Balenciaga" url="https://balenciaga.com" />
        </div>

        <CSSSnippet code={`font-family: 'VT323', 'Press Start 2P', monospace;
background: linear-gradient(135deg, #FF6B9D, #C084FC, #60A5FA);
border: 2px solid;
/* Chrome text effect */
background-clip: text;
-webkit-background-clip: text;`} />

        <MockupRow
          desktop={
            <div style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b2a)', borderRadius: 0, padding: 24, color: '#fff', fontFamily: 'monospace' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#C084FC' }}>★ Welcome.exe ★</div>
                <div style={{ fontSize: 10, color: '#60A5FA' }}>2026</div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, background: 'linear-gradient(90deg, #FF6B9D, #C084FC, #60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 12, lineHeight: 1.1 }}>ENTER THE VOID</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 20, maxWidth: 400 }}>A digital experience for the chronically online generation.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #FF6B9D, #C084FC)', border: '2px solid #fff', color: '#fff', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>[ Enter ]</button>
                <button style={{ padding: '8px 20px', background: 'transparent', border: '2px solid #C084FC', color: '#C084FC', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>[ About ]</button>
              </div>
            </div>
          }
          mobile={
            <div style={{ background: 'linear-gradient(180deg, #1a0533, #0d1b2a)', borderRadius: 0, padding: 14, color: '#fff', fontFamily: 'monospace' }}>
              <div style={{ fontSize: 8, letterSpacing: '.2em', textTransform: 'uppercase', color: '#C084FC', marginBottom: 16, textAlign: 'center' }}>★ Welcome ★</div>
              <div style={{ fontSize: 22, fontWeight: 900, background: 'linear-gradient(90deg, #FF6B9D, #C084FC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10, textAlign: 'center', lineHeight: 1.2 }}>ENTER THE VOID</div>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 16, textAlign: 'center' }}>Chronically online edition.</div>
              <button style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #FF6B9D, #C084FC)', border: '2px solid #fff', color: '#fff', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>[ Enter ]</button>
            </div>
          }
        />
      </Article>

    </div>
  )
}
