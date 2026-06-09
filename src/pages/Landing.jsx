import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { CATEGORIES } from '../data/tools'
import { loadFont } from '../utils/googleFonts'

const VISITED_KEY = 'vs-visited'

// Reveal-on-scroll helper — fades/slides sections in as they enter the viewport.
function useReveal() {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); obs.disconnect() }
    }, { rootMargin: '0px 0px -60px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, shown]
}

function Reveal({ as: Tag = 'section', className = '', style, children, ...rest }) {
  const [ref, shown] = useReveal()
  return (
    <Tag ref={ref} className={`${className} landing-reveal${shown ? ' is-shown' : ''}`} style={style} {...rest}>
      {children}
    </Tag>
  )
}

const FEATURES = [
  {
    title: 'Build complete colour systems',
    body: 'Create harmonious palettes from colour theory, generate Material-style state colours, fine-tune tints and gradients, and export everything as production-ready CSS or JSON.',
  },
  {
    title: 'Pair fonts and preview typography',
    body: 'Browse hundreds of Google Fonts in a visual gallery, find curated pairings for headings and body, and dial in a modular type scale with live preview.',
  },
  {
    title: 'Icons, images and AI tools',
    body: 'Search thousands of icons via Iconify, convert and compress images locally, generate accessible alt text with AI, and save AI prompt templates for reuse.',
  },
  {
    title: 'Design tokens at your fingertips',
    body: 'Reference spacing scales, shadows, border radii, and font sizes from popular frameworks. Export a complete design system from your palette, fonts, and type scale in one click.',
  },
]

const HIGHLIGHTS = [
  {
    title: 'Everything in one place',
    body: 'Colour systems, typography, image tools, AI generators and design references — no more juggling a dozen browser tabs.',
    icon: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  },
  {
    title: 'Mostly free, always fair',
    body: 'Explore the full toolkit for free. Upgrade for AI tools, extra prompts, and advanced exports — from just $4.99/month.',
    icon: (<><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></>),
  },
  {
    title: 'Built for real workflows',
    body: 'Export production-ready design systems, generate palettes from colour theory, and reference the tokens you actually use day to day.',
    icon: (<><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></>),
  },
]

const DEMO_LABELS = ['Primary', 'Dark', 'Accent', 'Light', 'Base']

const DEMO_PALETTES = [
  { name: 'Stripe', colors: ['#635BFF', '#0A2540', '#00D4AA', '#7A73FF', '#FBFCFE'], hue: 244 },
  { name: 'Spotify', colors: ['#1DB954', '#191414', '#1ED760', '#535353', '#FFFFFF'], hue: 141 },
  { name: 'Linear', colors: ['#5E6AD2', '#1B1B25', '#26B5CE', '#7B61FF', '#F2F2F2'], hue: 232 },
  { name: 'Figma', colors: ['#A259FF', '#F24E1E', '#FF7262', '#1ABCFE', '#0ACF83'], hue: 267 },
  { name: 'Sunset', colors: ['#FF6B6B', '#2B2D42', '#FFD93D', '#FF8E72', '#FFF3E0'], hue: 12 },
]

function PaletteDemo() {
  const [hovered, setHovered] = useState(null)
  const [idx, setIdx] = useState(0)
  const [copied, setCopied] = useState(null)
  const palette = DEMO_PALETTES[idx]

  const shuffle = (e) => {
    e?.stopPropagation()
    setIdx(prev => (prev + 1) % DEMO_PALETTES.length)
    setCopied(null)
  }

  const copy = (c, i) => {
    try { navigator.clipboard?.writeText(c) } catch { /* ignore */ }
    setCopied(i)
    setTimeout(() => setCopied(prev => (prev === i ? null : prev)), 1100)
  }

  return (
    <div className="landing-demo landing-demo-palette">
      <div className="landing-demo-palette-head">
        <span className="landing-demo-tag">{palette.name}</span>
        <button type="button" className="landing-demo-shuffle" onClick={shuffle} title="Shuffle palette">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" />
          </svg>
          Shuffle
        </button>
      </div>
      <div style={{ display: 'flex', borderRadius: 'var(--radius)', overflow: 'hidden', height: 120 }}>
        {palette.colors.map((c, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => copy(c, i)}
            style={{
              flex: hovered === i ? 2.5 : 1,
              background: c,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 10,
              transition: 'flex .35s cubic-bezier(.16,1,.3,1)',
              cursor: 'pointer',
            }}
          >
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(255,255,255,.92)',
              opacity: hovered === i ? 1 : 0,
              transition: 'opacity .2s',
              background: 'rgba(0,0,0,.36)',
              padding: '3px 7px',
              borderRadius: 4,
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
            }}>
              {copied === i ? 'Copied!' : c}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {DEMO_LABELS.map((label, i) => (
          <span key={i} style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 9,
            fontFamily: 'var(--mono)',
            fontWeight: 600,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            color: 'var(--t3)',
          }}>{label}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => {
          const l = 95 - i * 9
          return (
            <div key={i} style={{
              flex: 1,
              height: 24,
              borderRadius: 3,
              background: `hsl(${palette.hue}, 70%, ${l}%)`,
              transition: 'background .4s ease',
            }} />
          )
        })}
      </div>
      <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t3)', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'center' }}>
        Tint Scale · 50–900 · click a swatch to copy
      </div>
    </div>
  )
}

const FONT_PAIRS = [
  { heading: 'Playfair Display', body: 'Source Sans 3', hWeight: 700, bWeight: 400 },
  { heading: 'Space Grotesk', body: 'Inter', hWeight: 600, bWeight: 400 },
  { heading: 'DM Serif Display', body: 'DM Sans', hWeight: 400, bWeight: 400 },
]

function FontDemo() {
  const [pair, setPair] = useState(0)
  const [word, setWord] = useState('Typography')
  const p = FONT_PAIRS[pair]

  useEffect(() => {
    FONT_PAIRS.forEach(fp => {
      loadFont(fp.heading, [fp.hWeight])
      loadFont(fp.body, [fp.bWeight])
    })
  }, [])

  const headingFam = `'${p.heading}', Georgia, serif`
  const bodyFam = `'${p.body}', system-ui, sans-serif`

  return (
    <div className="landing-demo" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {FONT_PAIRS.map((fp, i) => (
          <button key={i} onClick={() => setPair(i)} style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-s)',
            border: '1px solid',
            borderColor: pair === i ? 'var(--accent)' : 'var(--border)',
            background: pair === i ? 'var(--accent-bg)' : 'transparent',
            color: pair === i ? 'var(--accent)' : 'var(--t2)',
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            transition: 'all .2s',
          }}>{fp.heading.split(' ')[0]}</button>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, minHeight: 100 }}>
        <div style={{ fontFamily: headingFam, fontWeight: p.hWeight, fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: 1.1, color: 'var(--t0)', transition: 'font-family .3s', wordBreak: 'break-word' }}>
          {word || 'Typography'}
        </div>
        <div style={{ fontFamily: bodyFam, fontWeight: p.bWeight, fontSize: 14, lineHeight: 1.6, color: 'var(--t1)', transition: 'font-family .3s' }}>
          Good type pairing balances contrast and harmony between headline and body.
        </div>
      </div>
      <input
        type="text"
        value={word}
        onChange={e => setWord(e.target.value)}
        placeholder="Type to preview…"
        className="landing-demo-input"
      />
      <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', fontWeight: 600 }}>
        {p.heading} / {p.body}
      </div>
    </div>
  )
}

const DEMO_ICONS = [
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></>,
  <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
  <><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></>,
  <><polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9" /></>,
  <><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></>,
  <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 4v16" /><path d="M17 4v16" /></>,
  <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
]

function IconDemo() {
  return (
    <div className="landing-demo-icons">
      {DEMO_ICONS.map((g, i) => (
        <div key={i} className="landing-demo-icon" style={{ transitionDelay: `${i * 30}ms` }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{g}</svg>
        </div>
      ))}
    </div>
  )
}

const DEMO_TOKENS = [
  { label: 'xs', value: 4 },
  { label: 'sm', value: 8 },
  { label: 'md', value: 16 },
  { label: 'lg', value: 24 },
  { label: 'xl', value: 32 },
  { label: '2xl', value: 48 },
]

function TokenDemo() {
  const [hovered, setHovered] = useState(null)
  return (
    <div className="landing-demo-tokens">
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 4 }}>Spacing Scale</div>
      {DEMO_TOKENS.map((tk, i) => (
        <div key={i}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'default' }}
        >
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: hovered === i ? 'var(--accent)' : 'var(--t2)', minWidth: 28, transition: 'color .2s' }}>{tk.label}</span>
          <div style={{
            height: 6,
            borderRadius: 3,
            background: hovered === i ? 'var(--accent)' : 'var(--bg-3)',
            width: `${(tk.value / 48) * 100}%`,
            minWidth: 8,
            transition: 'all .3s cubic-bezier(.16,1,.3,1)',
          }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', fontWeight: 600 }}>{tk.value}px</span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {[0, 2, 6, 12, 20, 999].map((r, i) => (
          <div key={i} style={{
            width: 28,
            height: 28,
            borderRadius: r,
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            transition: 'all .2s',
          }} />
        ))}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', fontWeight: 600, letterSpacing: '.04em' }}>Border Radius</div>
    </div>
  )
}

const FEATURE_DEMOS = [PaletteDemo, FontDemo, IconDemo, TokenDemo]

export default function Landing() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { user, userProfile } = useAuth()
  const loggedIn = !!user
  const firstName = userProfile?.displayName?.split(' ')[0] || user?.email?.split('@')[0]

  const enter = () => {
    try { localStorage.setItem(VISITED_KEY, '1') } catch { /* ignore */ }
    navigate('/dashboard')
  }

  const signIn = () => {
    try { localStorage.setItem(VISITED_KEY, '1') } catch { /* ignore */ }
    navigate('/login')
  }

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand-mark">UIL4B</span>
          <span className="landing-brand-sub">Design Toolkit</span>
        </div>
        <div className="landing-nav-actions">
          <button type="button" className="landing-theme" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            )}
          </button>
          {loggedIn ? (
            <button type="button" className="btn landing-signin" onClick={enter}>Resume</button>
          ) : (
            <button type="button" className="btn landing-signin" onClick={signIn}>Sign in</button>
          )}
        </div>
      </header>

      <main className="landing-main">
        {/* Hero */}
        <section className="landing-hero">
          <span className="landing-eyebrow">A design toolkit for designers and developers</span>
          <h1 className="landing-title">
            Every design tool<br /><em>you reach for</em>, together.
          </h1>
          <p className="landing-lede">
            UIL4B brings your most-used graphic design tools into one fast, unified workspace.
            Build colour systems, pair fonts, convert images, write AI prompts and export a
            complete design system without leaving the page.
          </p>
          <div className="landing-cta-row">
            <button type="button" className="btn btn-accent landing-cta-primary" onClick={enter}>
              {loggedIn ? 'Resume where you left off' : 'Open the toolkit'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
            <button type="button" className="btn landing-cta-secondary" onClick={signIn}>
              {loggedIn ? 'Log in to another account' : 'Create free account'}
            </button>
          </div>
          <span className="landing-cta-note">
            {loggedIn
              ? `Signed in${firstName ? ` as ${firstName}` : ''}. Pick up right where you left off.`
              : 'No signup required to explore. Free tier included.'}
          </span>
        </section>

        {/* Category cards */}
        <Reveal className="landing-cats">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="landing-cat-card">
              <span className="landing-cat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{cat.icon}</svg>
              </span>
              <span className="landing-cat-label">{cat.label}</span>
              <span className="landing-cat-desc">{cat.description}</span>
            </div>
          ))}
        </Reveal>

        {/* Feature sections with interactive demos */}
        {FEATURES.map((f, i) => {
          const Demo = FEATURE_DEMOS[i]
          return (
            <Reveal key={f.title} className={`landing-feature${i % 2 === 1 ? ' landing-feature-reverse' : ''}`}>
              <div className="landing-feature-text">
                <h2>{f.title}</h2>
                <p>{f.body}</p>
              </div>
              <div className="landing-feature-img">
                {Demo && <Demo />}
              </div>
            </Reveal>
          )
        })}

        {/* Value highlights */}
        <Reveal className="landing-highlights">
          {HIGHLIGHTS.map(h => (
            <div key={h.title} className="landing-highlight">
              <span className="landing-highlight-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{h.icon}</svg>
              </span>
              <h3>{h.title}</h3>
              <p>{h.body}</p>
            </div>
          ))}
        </Reveal>

        {/* Closing CTA */}
        <Reveal className="landing-closing">
          <h2>{loggedIn ? 'Pick up where you left off.' : 'Start designing in seconds.'}</h2>
          <p>
            {loggedIn
              ? 'Your projects and design tokens are ready and waiting. Jump back into the toolkit any time.'
              : 'Jump straight into the toolkit. Your work is saved locally, and an account unlocks AI tools and synced projects whenever you are ready.'}
          </p>
          <button type="button" className="btn btn-accent landing-cta-primary" onClick={enter}>
            {loggedIn ? 'Resume where you left off' : 'Open the toolkit'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </Reveal>
      </main>

      <footer className="landing-footer">
        <span>Made by <a href="https://dylan-coleman.com/" target="_blank" rel="noopener noreferrer">Dylan Coleman</a></span>
        <span className="landing-footer-sep">·</span>
        <a href="https://buymeacoffee.com/dylan.coleman" target="_blank" rel="noopener noreferrer">Donate</a>
      </footer>
    </div>
  )
}
