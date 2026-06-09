import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
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

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Tools', href: '#tools' },
  { label: 'Pricing', href: '#pricing' },
]

const MARQUEE = [
  'Colour systems', 'Type scales', 'Font pairing', 'Icon library', 'Image converter',
  'Alt-text AI', 'Gradients', 'Design tokens', 'CSS export', 'Prompt library',
  'Emoji library', 'Video frames', 'Contrast checker', 'Tint generator',
]

const STATS = [
  { n: '200k+', l: 'Icons to search' },
  { n: '1,500+', l: 'Google Fonts' },
  { n: '15+', l: 'Pro-grade tools' },
  { n: '$0', l: 'To get started' },
]

const HIGHLIGHTS = [
  {
    title: 'Everything in one canvas',
    body: 'Colour, type, icons, images, AI generators and design references — no more juggling a dozen browser tabs.',
    icon: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  },
  {
    title: 'Mostly free, always fair',
    body: 'Explore the full toolkit for free. Upgrade for AI tools, more prompts, and advanced exports — from just $4.99/month.',
    icon: (<><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></>),
  },
  {
    title: 'Built for real workflows',
    body: 'Export production-ready design systems, generate palettes from colour theory, and reference the tokens you actually use.',
    icon: (<><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></>),
  },
]

const PRICING = [
  {
    id: 'free',
    name: 'Free',
    monthly: '$0',
    yearly: '$0',
    period: 'forever',
    tagline: 'Everything you need for everyday design work.',
    features: [
      'All core tools — colour, type, icons, images',
      'Unlimited palettes, type scales & CSS exports',
      '40 AI generations per day',
      'Work saved locally in your browser',
      'Light & dark themes, multiple languages',
    ],
    cta: 'Start for free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: '$4.99', yearly: '$3.33' },
    period: { monthly: 'per month', yearly: 'per month, billed yearly' },
    note: { monthly: 'or $39.99 / year — save ~33%', yearly: '$39.99 billed once a year' },
    tagline: 'For designers who lean on AI and want more headroom.',
    featured: true,
    features: [
      'Everything in Free, plus:',
      '1,000 AI generations per day',
      'Higher-quality AI models',
      'Projects synced across devices',
      'Advanced design-system exports',
      'Priority support',
    ],
    cta: 'Go Pro',
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

const ICON_DEMO_LIMIT = 23
const ICON_TOTAL = '200,000+'

// Iconify collections that ship multi-colour artwork (brand logos, flags,
// flat/emoji icons). These must NOT be colour-inverted in dark mode — only
// monochrome icons get the --icon-inv treatment so black icons stay visible.
const COLORED_PACKS = new Set([
  'logos', 'flat-color-icons', 'fxemoji', 'noto', 'noto-v1', 'twemoji', 'emojione',
  'emojione-v1', 'openmoji', 'fluent-emoji', 'fluent-emoji-flat', 'circle-flags',
  'flag', 'flagpack', 'cif', 'skill-icons', 'devicon', 'vscode-icons', 'unjs',
  'logos-light', 'token-branded',
])
const iconFilter = (pack) => (COLORED_PACKS.has(pack) ? 'none' : 'var(--icon-inv)')

// A mini version of the in-app Icon Library — live search via Iconify with an
// embedded fallback, click-to-copy, and a final tile that funnels into the full tool.
function IconSearchDemo({ onView }) {
  const [query, setQuery] = useState('arrow')
  const [icons, setIcons] = useState([])
  const [copied, setCopied] = useState(null)
  const timer = useRef(null)
  const cdnOk = useRef(null)
  const copyTimer = useRef(null)

  const renderLocal = useCallback((q) => {
    const localIcons = window.icons || []
    const PACKS = window.PACKS || {}
    const ql = (q || '').toLowerCase()
    const filtered = localIcons.filter(i => !ql || i.n.indexOf(ql) !== -1 || i.c.indexOf(ql) !== -1).slice(0, ICON_DEMO_LIMIT)
    setIcons(filtered.map(i => ({ id: i.n, name: i.n, pack: PACKS[i.p] || i.p, d: i.d, filled: i.p === 'S', cdn: false })))
  }, [])

  const doSearch = useCallback((q) => {
    const qt = (q || '').trim()
    if (qt.length < 2 || cdnOk.current === false) { renderLocal(qt); return }
    fetch(`https://api.iconify.design/search?query=${encodeURIComponent(qt)}&limit=${ICON_DEMO_LIMIT}`, { signal: AbortSignal.timeout(4000) })
      .then(r => r.json())
      .then(d => {
        cdnOk.current = true
        if (!d.icons?.length) { renderLocal(qt); return }
        setIcons(d.icons.slice(0, ICON_DEMO_LIMIT).map(id => { const [p, name] = id.split(':'); return { id, pack: p, name, cdn: true } }))
      })
      .catch(() => { cdnOk.current = false; renderLocal(qt) })
  }, [renderLocal])

  useEffect(() => { doSearch('arrow') }, [doSearch])
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(copyTimer.current) }, [])

  const onChange = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(q), 300)
  }

  const flagCopied = (name) => {
    setCopied(name)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(prev => (prev === name ? null : prev)), 1200)
  }

  const copyIcon = (icon) => {
    if (icon.cdn) {
      fetch(`https://api.iconify.design/${icon.pack}/${icon.name}.svg?width=24&height=24`)
        .then(r => r.text())
        .then(s => { try { navigator.clipboard?.writeText(s) } catch { /* ignore */ } flagCopied(icon.name) })
        .catch(() => { /* ignore */ })
    } else {
      const svg = icon.filled
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="${icon.d}"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon.d}"/></svg>`
      try { navigator.clipboard?.writeText(svg) } catch { /* ignore */ }
      flagCopied(icon.name)
    }
  }

  return (
    <div className="landing-icontool-panel">
      <div className="landing-icontool-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input type="text" value={query} onChange={onChange} placeholder="Search icons — try ‘arrow’, ‘home’, ‘heart’…" aria-label="Search icons" />
      </div>
      <div className="landing-icontool-grid">
        {icons.map((icon, idx) => (
          <button
            key={`${idx}-${icon.id}`}
            type="button"
            className={`landing-icontool-cell${copied === icon.name ? ' is-copied' : ''}`}
            onClick={() => copyIcon(icon)}
            title={`Copy ${icon.name}`}
          >
            {icon.cdn ? (
              <img src={`https://api.iconify.design/${icon.pack}/${icon.name}.svg?width=24&height=24`} width="24" height="24" style={{ filter: iconFilter(icon.pack) }} loading="lazy" alt={icon.name} />
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill={icon.filled ? 'currentColor' : 'none'} stroke={icon.filled ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon.d} /></svg>
            )}
            {copied === icon.name && (
              <span className="landing-icontool-copied">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
            )}
          </button>
        ))}
        <button type="button" className="landing-icontool-more" onClick={onView}>
          <span className="landing-icontool-more-count">{ICON_TOTAL}</span>
          <span className="landing-icontool-more-label">View all icons</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </button>
      </div>
      <div className="landing-icontool-hint">Click any icon to copy its SVG · {ICON_TOTAL} icons and pack filters inside the app</div>
    </div>
  )
}

// A stylised "app window" screenshot for the hero — a fake browser frame wrapping
// a mini composition of the toolkit so visitors see the product before signing in.
function HeroWindow() {
  const swatches = ['#635BFF', '#0A2540', '#00D4AA', '#7A73FF', '#FF8E72']
  const navItems = ['Colour', 'Typography', 'Icons', 'Imagery', 'Docs']
  return (
    <div className="landing-window">
      <div className="landing-window-bar">
        <span className="landing-window-dots"><i /><i /><i /></span>
        <span className="landing-window-url">uil4b.com/dashboard</span>
        <span className="landing-window-spacer" />
      </div>
      <div className="landing-window-body">
        <aside className="landing-window-side">
          <div className="landing-window-side-brand">UIL4B</div>
          {navItems.map((n, i) => (
            <div key={n} className={`landing-window-side-item${i === 0 ? ' is-active' : ''}`}>
              <span className="landing-window-side-dot" />{n}
            </div>
          ))}
        </aside>
        <div className="landing-window-canvas">
          <div className="landing-window-card landing-window-card-wide">
            <span className="landing-window-card-label">Palette</span>
            <div className="landing-window-swatches">
              {swatches.map(c => <span key={c} style={{ background: c }} />)}
            </div>
            <div className="landing-window-tints">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} style={{ background: `hsl(244,72%,${92 - i * 8}%)` }} />
              ))}
            </div>
          </div>
          <div className="landing-window-card">
            <span className="landing-window-card-label">Type</span>
            <div className="landing-window-type">Aa</div>
            <div className="landing-window-typemeta">Space Grotesk · 600</div>
          </div>
          <div className="landing-window-card">
            <span className="landing-window-card-label">Icons</span>
            <div className="landing-window-icons">
              {DEMO_ICONS.slice(0, 6).map((g, i) => (
                <span key={i}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{g}</svg></span>
              ))}
            </div>
          </div>
          <div className="landing-window-card landing-window-card-wide">
            <span className="landing-window-card-label">Spacing tokens</span>
            <div className="landing-window-bars">
              {[20, 35, 55, 78, 100].map((w, i) => (
                <div key={i} className="landing-window-bar"><span style={{ width: `${w}%` }} /></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { user, userProfile } = useAuth()
  const { checkout, isPro } = useSubscription()
  const [billing, setBilling] = useState('monthly')
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

  const goPro = async (interval = billing) => {
    if (!loggedIn) { signIn(); return }
    try { await checkout(interval) } catch { navigate('/settings', { state: { section: 'support' } }) }
  }

  // "Start for free" drops the visitor straight into the dashboard; Pro opens checkout.
  const choosePlan = (id) => { if (id === 'pro') goPro(billing); else enter() }

  const viewIcons = () => {
    try { localStorage.setItem(VISITED_KEY, '1') } catch { /* ignore */ }
    navigate('/icons')
  }

  return (
    <div className="landing">
      <div className="landing-aurora" aria-hidden="true">
        <span className="landing-orb landing-orb-1" />
        <span className="landing-orb landing-orb-2" />
        <span className="landing-orb landing-orb-3" />
        <span className="landing-grid-lines" />
      </div>

      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand-mark">UIL4B</span>
          <span className="landing-brand-sub">Design Toolkit</span>
        </div>
        <nav className="landing-nav-links">
          {NAV_LINKS.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>
        <div className="landing-nav-actions">
          <button type="button" className="landing-theme" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            )}
          </button>
          <button type="button" className="landing-signin-text" onClick={loggedIn ? enter : signIn}>
            {loggedIn ? 'Open app' : 'Sign in'}
          </button>
          <button type="button" className="landing-btn-grad" onClick={loggedIn ? enter : signIn}>
            {loggedIn ? 'Resume' : 'Start for free'}
          </button>
        </div>
      </header>

      <main className="landing-main">
        {/* Hero */}
        <section className="landing-hero">
          <span className="landing-eyebrow">
            <span className="landing-eyebrow-dot" />
            The all-in-one toolkit for designers &amp; developers
          </span>
          <h1 className="landing-title">
            Every design tool<br />you reach for, <span className="landing-grad">in one place.</span>
          </h1>
          <p className="landing-lede">
            UIL4B brings your most-used graphic design tools into one fast, unified workspace.
            Build colour systems, pair fonts, convert images, write AI prompts and export a
            complete design system — without leaving the page.
          </p>
          <div className="landing-cta-row">
            <button type="button" className="landing-btn-grad landing-btn-lg" onClick={enter}>
              {loggedIn ? 'Resume where you left off' : 'Start for free'}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
            <button type="button" className="landing-btn-ghost landing-btn-lg" onClick={loggedIn ? signIn : signIn}>
              {loggedIn ? 'Log in to another account' : 'Create an account'}
            </button>
          </div>
          <span className="landing-cta-note">
            {loggedIn
              ? `Signed in${firstName ? ` as ${firstName}` : ''}. Pick up right where you left off.`
              : 'No credit card required · Free tier included · Cancel anytime'}
          </span>
        </section>

        {/* Hero product window */}
        <Reveal className="landing-window-wrap">
          <HeroWindow />
        </Reveal>

        {/* Marquee */}
        <section className="landing-marquee" aria-hidden="true">
          <div className="landing-marquee-fade landing-marquee-fade-l" />
          <div className="landing-marquee-fade landing-marquee-fade-r" />
          <div className="landing-marquee-track">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="landing-marquee-item">{m}<i>·</i></span>
            ))}
          </div>
        </section>

        {/* Bento tools */}
        <Reveal as="section" id="tools" className="landing-section">
          <header className="landing-section-head">
            <span className="landing-kicker">The toolkit</span>
            <h2>One canvas. Every tool you need.</h2>
            <p>Each tool below is live — play with it right here. The full workspace adds saving, AI, and exports.</p>
          </header>
          <div className="landing-bento">
            <div className="landing-bento-tile landing-bento-wide">
              <div className="landing-bento-head">
                <h3>Build complete colour systems</h3>
                <p>Generate harmonious palettes, tints and gradients — export production-ready CSS or JSON.</p>
              </div>
              <div className="landing-bento-demo"><PaletteDemo /></div>
            </div>
            <div className="landing-bento-tile">
              <div className="landing-bento-head">
                <h3>Pair &amp; preview type</h3>
                <p>Curated font pairings with live preview.</p>
              </div>
              <div className="landing-bento-demo"><FontDemo /></div>
            </div>
            <div className="landing-bento-tile">
              <div className="landing-bento-head">
                <h3>Design tokens, ready</h3>
                <p>Spacing, radius and scale references.</p>
              </div>
              <div className="landing-bento-demo"><TokenDemo /></div>
            </div>
            <div className="landing-bento-tile landing-bento-wide">
              <div className="landing-bento-head">
                <h3>Icons, images &amp; AI tools</h3>
                <p>Search {ICON_TOTAL} icons, convert images locally, and generate accessible alt text with AI.</p>
              </div>
              <div className="landing-bento-demo landing-bento-demo-pad"><IconDemo /></div>
            </div>
          </div>
        </Reveal>

        {/* Interactive icon search */}
        <Reveal as="section" id="features" className="landing-icontool">
          <header className="landing-section-head">
            <span className="landing-kicker">Try it now</span>
            <h2>Search thousands of icons, copy in one click.</h2>
            <p>Search and click any icon to copy its SVG. The full tool adds pack filters, more styles, and {ICON_TOTAL} icons.</p>
          </header>
          <IconSearchDemo onView={viewIcons} />
        </Reveal>

        {/* Stats band */}
        <Reveal className="landing-stats">
          {STATS.map(s => (
            <div key={s.l} className="landing-stat">
              <span className="landing-stat-num">{s.n}</span>
              <span className="landing-stat-label">{s.l}</span>
            </div>
          ))}
        </Reveal>

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

        {/* Pricing */}
        <Reveal className="landing-pricing" id="pricing">
          <div className="landing-pricing-head">
            <span className="landing-eyebrow">Simple, fair pricing</span>
            <h2>Most of UIL4B is free. Upgrade only when you need more AI.</h2>
            <p>Every core tool is free forever. Pro unlocks higher daily AI limits, better models, and synced projects — for less than a coffee a month.</p>
          </div>
          <div className="landing-billing-toggle" data-interval={billing} role="group" aria-label="Billing period">
            <span className="landing-billing-thumb" aria-hidden="true" />
            <button type="button" className={`landing-billing-opt${billing === 'monthly' ? ' is-active' : ''}`} onClick={() => setBilling('monthly')} aria-pressed={billing === 'monthly'}>
              Monthly
            </button>
            <button type="button" className={`landing-billing-opt${billing === 'yearly' ? ' is-active' : ''}`} onClick={() => setBilling('yearly')} aria-pressed={billing === 'yearly'}>
              Yearly <span className="landing-billing-save">Save 33%</span>
            </button>
          </div>
          <div className="landing-pricing-grid">
            {PRICING.map(tier => {
              const isCurrentPro = tier.id === 'pro' && isPro
              const price = typeof tier.price === 'object' ? tier.price[billing] : tier.price
              const period = typeof tier.period === 'object' ? tier.period[billing] : tier.period
              const note = typeof tier.note === 'object' ? tier.note?.[billing] : tier.note
              return (
                <div key={tier.id} className={`landing-tier${tier.featured ? ' landing-tier-featured' : ''}`}>
                  {tier.featured && <span className="landing-tier-badge">Most popular</span>}
                  <div className="landing-tier-name">{tier.name}</div>
                  <div className="landing-tier-price">
                    <span className="landing-tier-amount">{price}</span>
                    <span className="landing-tier-period">{period}</span>
                  </div>
                  {note && <div className="landing-tier-note">{note}</div>}
                  <p className="landing-tier-tagline">{tier.tagline}</p>
                  <ul className="landing-tier-features">
                    {tier.features.map((f, i) => (
                      <li key={i} className={f.endsWith('plus:') ? 'landing-tier-feature-head' : ''}>
                        {!f.endsWith('plus:') && (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={tier.featured ? 'landing-btn-grad landing-tier-cta' : 'landing-btn-ghost landing-tier-cta'}
                    onClick={() => choosePlan(tier.id)}
                    disabled={isCurrentPro}
                  >
                    {isCurrentPro ? 'Your current plan' : tier.cta}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="landing-pricing-foot">Prices in AUD. Cancel anytime — your free access never expires.</p>
        </Reveal>

        {/* Closing CTA */}
        <Reveal className="landing-closing">
          <div className="landing-closing-glow" aria-hidden="true" />
          <h2>{loggedIn ? 'Pick up where you left off.' : 'Start designing in seconds.'}</h2>
          <p>
            {loggedIn
              ? 'Your projects and design tokens are ready and waiting. Jump back into the toolkit any time.'
              : 'Jump straight into the toolkit. Your work is saved locally, and an account unlocks AI tools and synced projects whenever you are ready.'}
          </p>
          <button type="button" className="landing-btn-grad landing-btn-lg" onClick={enter}>
            {loggedIn ? 'Resume where you left off' : 'Start for free'}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </Reveal>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-brand-mark">UIL4B</span>
            <p>The all-in-one design toolkit for the modern web.</p>
          </div>
          <div className="landing-footer-cols">
            <div className="landing-footer-col">
              <span className="landing-footer-col-title">Product</span>
              <a href="#tools">Tools</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="landing-footer-col">
              <span className="landing-footer-col-title">Get started</span>
              <button type="button" onClick={enter}>Open the app</button>
              <button type="button" onClick={signIn}>Sign in</button>
            </div>
            <div className="landing-footer-col">
              <span className="landing-footer-col-title">Made by</span>
              <a href="https://dylan-coleman.com/" target="_blank" rel="noopener noreferrer">Dylan Coleman</a>
              <a href="https://buymeacoffee.com/dylan.coleman" target="_blank" rel="noopener noreferrer">Donate</a>
            </div>
          </div>
        </div>
        <div className="landing-footer-base">
          <span>© {new Date().getFullYear()} UIL4B</span>
          <span className="landing-footer-sep">·</span>
          <span>Made for designers &amp; developers</span>
        </div>
      </footer>
    </div>
  )
}
