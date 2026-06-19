import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { loadFont } from '../utils/googleFonts'
import { CATEGORIES, TOOLS } from '../data/tools'

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

// `Tag` is used as a JSX element below; without eslint-plugin-react's jsx-uses-vars,
// no-unused-vars can't see JSX element usage, so the binding is suppressed here.
// eslint-disable-next-line no-unused-vars
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
    title: 'Replace a dozen browser tabs',
    body: 'Colour palettes, type scales, font pairing, icon search, image conversion, alt text, and CSS export — all in one workspace with zero context switching.',
    icon: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  },
  {
    title: 'Export production-ready code',
    body: 'Generate CSS custom properties, JSON design tokens, and complete style guides from your palette and typography in one click — ready for your codebase.',
    icon: (<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>),
  },
  {
    title: 'AI-powered, privacy-first',
    body: '40 free AI generations daily for alt text and prompts. All core tools run entirely in your browser — your designs never leave your machine.',
    icon: (<><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></>),
  },
]

const FREE_FEATURES = [
  'All core tools — colour, type, icons, images',
  'Unlimited palettes, type scales & CSS exports',
  '40 AI generations per day',
  'Work saved locally in your browser',
  'Light & dark themes, multiple languages',
]

const PRO_FEATURES = [
  'Everything in Free, plus:',
  '1,000 AI generations per day',
  'Higher-quality AI models',
  'Projects synced across devices',
  'Advanced design-system exports',
  'Priority support',
]

function useDynamicPrices() {
  const [prices, setPrices] = useState(null)
  useEffect(() => {
    fetch('/api/get-prices')
      .then(r => r.json())
      .then(d => setPrices(d))
      .catch(() => {})
  }, [])
  return prices
}

function formatPrice(amount, currency = 'usd') {
  const symbols = { usd: '$', eur: '€', gbp: '£', aud: 'A$', nzd: 'NZ$', cad: 'C$', sgd: 'S$', chf: 'Fr' }
  const sym = symbols[currency] || '$'
  return `${sym}${Number(amount).toFixed(2)}`
}

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
  { heading: 'Playfair Display', body: 'Source Sans 3', hWeight: 700, bWeight: 400, note: 'Editorial high-contrast serif over a clean, neutral sans.' },
  { heading: 'Space Grotesk', body: 'Inter', hWeight: 600, bWeight: 400, note: 'Geometric display sans with a workhorse UI body — modern and technical.' },
  { heading: 'DM Serif Display', body: 'DM Sans', hWeight: 400, bWeight: 400, note: 'A serif and sans from the same family — effortless harmony.' },
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
    <div className="landing-demo landing-demo-type">
      <div className="landing-type-tabs">
        {FONT_PAIRS.map((fp, i) => (
          <button
            key={i}
            type="button"
            className={`landing-type-tab${pair === i ? ' is-active' : ''}`}
            onClick={() => setPair(i)}
          >
            {fp.heading.split(' ')[0]} <span>×</span> {fp.body.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="landing-type-stage">
        <div className="landing-type-row">
          <span className="landing-type-role">Heading — {p.heading} {p.hWeight}</span>
          <div className="landing-type-h" style={{ fontFamily: headingFam, fontWeight: p.hWeight }}>
            {word || 'Typography'}
          </div>
        </div>
        <div className="landing-type-row">
          <span className="landing-type-role">Body — {p.body} {p.bWeight}</span>
          <p className="landing-type-b" style={{ fontFamily: bodyFam, fontWeight: p.bWeight }}>
            Body copy carries the reading — it should stay comfortable and even-toned beneath an expressive headline.
          </p>
        </div>
      </div>

      <input
        type="text"
        value={word}
        onChange={e => setWord(e.target.value)}
        placeholder="Type to preview the headline…"
        className="landing-demo-input"
      />
      <div className="landing-type-note">{p.note}</div>
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

const STATS = [
  { value: 40, suffix: '+', label: 'Design tools' },
  { value: 200, suffix: 'K+', label: 'Icons' },
  { value: 1200, suffix: '+', label: 'Google Fonts' },
  { value: 100, suffix: '%', label: 'Client-side' },
]

function AnimatedNumber({ value, suffix = '', duration = 1600 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setDisplay(value); return }
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started.current) return
      started.current = true
      obs.disconnect()
      const start = performance.now()
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplay(Math.round(eased * value))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [value, duration])

  const formatted = value >= 1000 && !suffix.startsWith('K') && !suffix.startsWith('%')
    ? display.toLocaleString()
    : String(display)

  return <span ref={ref} className="landing-stat-num">{formatted}{suffix}</span>
}

function StickyFeatures() {
  const [active, setActive] = useState(0)
  const stepsRef = useRef([])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observers = []
    stepsRef.current.forEach((el, i) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActive(i) },
        { rootMargin: '-35% 0px -35% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  return (
    <section className="landing-sticky">
      <div className="landing-sticky-head">
        <span className="landing-eyebrow">What's inside</span>
        <h2>A toolkit built for real design work.</h2>
        <p>Four categories of tools, each with interactive previews and production-ready exports.</p>
      </div>
      <div className="landing-sticky-grid">
        <div className="landing-sticky-steps">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              ref={el => { stepsRef.current[i] = el }}
              className={`landing-sticky-step${active === i ? ' is-active' : ''}`}
            >
              <span className="landing-sticky-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
        <div className="landing-sticky-visual">
          <div className="landing-sticky-visual-card">
            {FEATURE_DEMOS.map((Demo, i) => (
              <div key={i} className={`landing-sticky-demo${active === i ? ' is-active' : ''}`}>
                <Demo />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
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
  const [query, setQuery] = useState('')
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

  useEffect(() => { doSearch('') }, [doSearch])
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(copyTimer.current) }, [])

  const onChange = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(q), 300)
  }

  const flagCopied = (id) => {
    setCopied(id)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(prev => (prev === id ? null : prev)), 1200)
  }

  const copyIcon = (icon) => {
    if (icon.cdn) {
      fetch(`https://api.iconify.design/${icon.pack}/${icon.name}.svg?width=24&height=24`)
        .then(r => r.text())
        .then(s => { try { navigator.clipboard?.writeText(s) } catch { /* ignore */ } flagCopied(icon.id) })
        .catch(() => { /* ignore */ })
    } else {
      const svg = icon.filled
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="${icon.d}"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon.d}"/></svg>`
      try { navigator.clipboard?.writeText(svg) } catch { /* ignore */ }
      flagCopied(icon.id)
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
            className={`landing-icontool-cell${copied === icon.id ? ' is-copied' : ''}`}
            onClick={() => copyIcon(icon)}
            title={`Copy ${icon.name}`}
          >
            {icon.cdn ? (
              <img src={`https://api.iconify.design/${icon.pack}/${icon.name}.svg?width=24&height=24`} width="24" height="24" style={{ filter: iconFilter(icon.pack) }} loading="lazy" alt={icon.name} />
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill={icon.filled ? 'currentColor' : 'none'} stroke={icon.filled ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon.d} /></svg>
            )}
            {copied === icon.id && (
              <span className="landing-icontool-copied">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="landing-icontool-footer">
        <span className="landing-icontool-hint">Click any icon to copy its SVG</span>
        <button type="button" className="btn btn-accent landing-icontool-cta" onClick={onView}>
          Explore {ICON_TOTAL} icons
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </button>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const { checkout, isPro } = useSubscription()
  const [billing, setBilling] = useState('monthly')
  const [toolsOpen, setToolsOpen] = useState(false)
  const toolsMenuRef = useRef(null)
  const loggedIn = !!user
  const firstName = userProfile?.displayName?.split(' ')[0] || user?.email?.split('@')[0]
  const dynamicPrices = useDynamicPrices()

  const proPrice = useMemo(() => {
    const cur = 'aud'
    if (!dynamicPrices) return { monthly: 'A$4.99', yearly: 'A$3.33', yearlyTotal: 'A$39.99' }
    const m = dynamicPrices.monthly?.[cur]
    const y = dynamicPrices.yearly?.[cur]
    return {
      monthly: m ? formatPrice(m, cur) : 'A$4.99',
      yearly: y ? formatPrice(y / 12, cur) : 'A$3.33',
      yearlyTotal: y ? formatPrice(y, cur) : 'A$39.99',
    }
  }, [dynamicPrices])

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

  const choosePlan = (id) => { if (id === 'pro') goPro(billing); else enter() }

  const viewIcons = () => {
    try { localStorage.setItem(VISITED_KEY, '1') } catch { /* ignore */ }
    navigate('/icons')
  }

  const openTool = (path) => {
    try { localStorage.setItem(VISITED_KEY, '1') } catch { /* ignore */ }
    setToolsOpen(false)
    navigate(path)
  }

  // Close the Tools mega-menu on outside click or Escape.
  useEffect(() => {
    if (!toolsOpen) return
    const onDown = (e) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target)) setToolsOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setToolsOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [toolsOpen])

  const heroRef = useRef(null)
  const heroRaf = useRef(0)
  const onHeroMove = useCallback((e) => {
    const el = heroRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    cancelAnimationFrame(heroRaf.current)
    heroRaf.current = requestAnimationFrame(() => {
      el.style.setProperty('--px', px.toFixed(4))
      el.style.setProperty('--py', py.toFixed(4))
    })
  }, [])
  const onHeroLeave = useCallback(() => {
    cancelAnimationFrame(heroRaf.current)
    const el = heroRef.current
    if (!el) return
    el.style.setProperty('--px', '0')
    el.style.setProperty('--py', '0')
  }, [])
  useEffect(() => () => cancelAnimationFrame(heroRaf.current), [])

  // Hide nav on scroll down, show on scroll up
  const navRef = useRef(null)
  const lastScrollY = useRef(0)
  const navHidden = useRef(false)
  const heroBottom = useRef(0)

  useEffect(() => {
    const hero = heroRef.current
    if (hero) heroBottom.current = hero.offsetTop + hero.offsetHeight

    const onScroll = () => {
      const nav = navRef.current
      if (!nav) return
      const y = window.scrollY
      const pastHero = y > heroBottom.current

      if (!pastHero) {
        nav.classList.remove('landing-nav-hidden')
        nav.classList.remove('landing-nav-solid')
        navHidden.current = false
      } else if (y > lastScrollY.current + 8 && !navHidden.current) {
        nav.classList.add('landing-nav-hidden')
        navHidden.current = true
      } else if (y < lastScrollY.current - 8 && navHidden.current) {
        nav.classList.remove('landing-nav-hidden')
        nav.classList.add('landing-nav-solid')
        navHidden.current = false
      }

      lastScrollY.current = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="landing">
      <header className="landing-nav" ref={navRef}>
        <div className="landing-brand">
          <span className="landing-brand-mark">UIL4B</span>
          <span className="landing-brand-sub">Design Toolkit</span>
        </div>
        <div className="landing-nav-actions">
          <div className="landing-tools-menu" ref={toolsMenuRef}>
            <button
              type="button"
              className={`btn landing-tools-trigger${toolsOpen ? ' open' : ''}`}
              onClick={() => setToolsOpen(o => !o)}
              aria-expanded={toolsOpen}
              aria-haspopup="true"
            >
              Tools
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="landing-tools-chev"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {toolsOpen && (
              <div className="landing-tools-panel" role="menu">
                {CATEGORIES.map(cat => {
                  // Public marketing menu never advertises alpha / not-yet-public tools.
                  const catTools = TOOLS.filter(tl => tl.category === cat.id && !tl.alpha)
                  if (!catTools.length) return null
                  return (
                    <div key={cat.id} className="landing-tools-col">
                      <button type="button" className="landing-tools-cat" onClick={() => openTool(cat.path)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{cat.icon}</svg>
                        {cat.label}
                      </button>
                      {catTools.map(tl => (
                        <button key={tl.id} type="button" className="landing-tools-item" onClick={() => openTool(tl.path)} role="menuitem">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{tl.icon}</svg>
                          <span className="landing-tools-item-text">
                            <span className="landing-tools-item-name">{tl.label}</span>
                            {tl.description && <span className="landing-tools-item-desc">{tl.description}</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {loggedIn ? (
            <button type="button" className="btn landing-signin" onClick={enter}>Resume</button>
          ) : (
            <button type="button" className="btn landing-signin" onClick={signIn}>Sign in</button>
          )}
        </div>
      </header>

      <main className="landing-main">
        <div
          className="landing-hero-wrap"
          ref={heroRef}
          onMouseMove={onHeroMove}
          onMouseLeave={onHeroLeave}
        >
          <div className="landing-hero-bg" aria-hidden="true">
            <span className="landing-hero-grid" />
            <span className="landing-hero-orb landing-hero-orb-1" />
            <span className="landing-hero-orb landing-hero-orb-2" />
            <span className="landing-hero-orb landing-hero-orb-3" />
            <span className="landing-hero-glow" />
          </div>
          <section className="landing-hero">
            <span className="landing-eyebrow landing-eyebrow-live">
              <span className="landing-live-dot" aria-hidden="true" />
              Design toolkit for professionals
            </span>
            <h1 className="landing-title">
              Colours, type, icons, exports.<br />
              <em>One workspace.</em>
            </h1>
            <p className="landing-lede">
              Build production-ready colour systems, pair fonts, search 200K+ icons,
              and export complete design tokens — all in one tool that runs entirely
              in your browser.
            </p>
            <div className="landing-cta-row">
              <button type="button" className="btn btn-accent landing-cta-primary" onClick={enter}>
                {loggedIn ? 'Open your workspace' : 'Start building — free'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
              <button type="button" className="btn landing-cta-secondary" onClick={signIn}>
                {loggedIn ? 'Switch account' : 'Sign in'}
              </button>
            </div>
            <span className="landing-cta-note">
              {loggedIn
                ? `Signed in${firstName ? ` as ${firstName}` : ''}.`
                : 'No account required · Free tier · No credit card'}
            </span>
            <div className="landing-trust">
              <span className="landing-trust-item"><strong>200K+</strong> icons</span>
              <span className="landing-trust-dot" />
              <span className="landing-trust-item"><strong>1,200+</strong> fonts</span>
              <span className="landing-trust-dot" />
              <span className="landing-trust-item"><strong>CSS/JSON/SVG</strong> export</span>
              <span className="landing-trust-dot" />
              <span className="landing-trust-item"><strong>100%</strong> client-side</span>
            </div>
          </section>

          {/* Hero graphic — animated floating tool preview cards */}
          <div className="landing-hero-graphic" aria-hidden="true">
            <div className="landing-hero-card landing-hero-card-1">
              <div className="landing-hero-card-bar" />
              <div className="landing-hero-card-swatches">
                <span style={{ background: '#3B82F6' }} /><span style={{ background: '#0A2540' }} /><span style={{ background: '#00D4AA' }} /><span style={{ background: '#7A73FF' }} />
              </div>
            </div>
            <div className="landing-hero-card landing-hero-card-2">
              <div className="landing-hero-card-bar" />
              <div className="landing-hero-card-lines"><span /><span /><span /></div>
            </div>
            <div className="landing-hero-card landing-hero-card-3">
              <div className="landing-hero-card-bar" />
              <div className="landing-hero-card-grid"><span /><span /><span /><span /><span /><span /></div>
            </div>
          </div>
        </div>

        {/* Stats with animated count-up */}
        <Reveal className="landing-stats">
          {STATS.map(s => (
            <div key={s.label} className="landing-stat">
              <AnimatedNumber value={s.value} suffix={s.suffix} />
              <span className="landing-stat-label">{s.label}</span>
            </div>
          ))}
        </Reveal>

        {/* Sticky scroll feature showcase */}
        <StickyFeatures />

        {/* Interactive icon search */}
        <Reveal className="landing-icontool">
          <div className="landing-icontool-head">
            <span className="landing-eyebrow">Icons &amp; illustrations</span>
            <h2>Search thousands of icons, copy in one click.</h2>
            <p>Try it right here — search and click any icon to copy its SVG. The full tool inside UIL4B adds pack filters, more styles, and {ICON_TOTAL} icons.</p>
          </div>
          <IconSearchDemo onView={viewIcons} />
        </Reveal>

        {/* Value highlights */}
        <Reveal className="landing-highlights">
          {HIGHLIGHTS.map(h => (
            <article key={h.title} className="landing-highlight">
              <span className="landing-highlight-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{h.icon}</svg>
              </span>
              <h3>{h.title}</h3>
              <p>{h.body}</p>
            </article>
          ))}
        </Reveal>

        {/* Pricing tiers — visually differentiated */}
        <Reveal className="landing-pricing" id="pricing">
          <div className="landing-pricing-head">
            <span className="landing-eyebrow">Simple, fair pricing</span>
            <h2>Start free, scale when you're ready.</h2>
            <p>Every core tool is free with no time limit. Pro unlocks 1,000 daily AI generations, higher-quality models, cross-device project sync, and priority support.</p>
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
            {/* Free tier */}
            <article className="landing-tier landing-tier-free">
              <div className="landing-tier-name">Free</div>
              <div className="landing-tier-price">
                <span className="landing-tier-amount">$0</span>
                <span className="landing-tier-period">forever</span>
              </div>
              <p className="landing-tier-tagline">Everything you need for everyday design work.</p>
              <ul className="landing-tier-features">
                {FREE_FEATURES.map((f, i) => (
                  <li key={i}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn landing-tier-cta" onClick={() => choosePlan('free')}>
                Start for free
              </button>
            </article>

            {/* Pro tier — visually prominent */}
            <article className={`landing-tier landing-tier-featured${isPro ? ' landing-tier-active' : ''}`}>
              <span className="landing-tier-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9" /></svg>
                Recommended
              </span>
              <div className="landing-tier-name">Pro</div>
              <div className="landing-tier-price">
                <span className="landing-tier-amount">{billing === 'yearly' ? proPrice.yearly : proPrice.monthly}</span>
                <span className="landing-tier-period">{billing === 'yearly' ? 'per month, billed yearly' : 'per month'}</span>
              </div>
              <div className="landing-tier-note">
                {billing === 'yearly'
                  ? `${proPrice.yearlyTotal} billed once a year`
                  : `or ${proPrice.yearlyTotal} / year — save ~33%`}
              </div>
              <p className="landing-tier-tagline">For designers who lean on AI and want more headroom.</p>
              <ul className="landing-tier-features">
                {PRO_FEATURES.map((f, i) => (
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
                className="btn btn-accent landing-tier-cta"
                onClick={() => choosePlan('pro')}
                disabled={isPro}
              >
                {isPro ? 'Your current plan' : 'Go Pro'}
              </button>
            </article>
          </div>
          <p className="landing-pricing-foot">Prices in AUD. Cancel anytime — your free access never expires.</p>
        </Reveal>

        {/* Closing CTA — redesigned with more personality */}
        <Reveal className="landing-closing">
          <div className="landing-closing-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          </div>
          <h2>{loggedIn ? 'Pick up where you left off.' : 'Start building your design system.'}</h2>
          <p>
            {loggedIn
              ? 'Your projects and design tokens are ready and waiting. Jump back into the toolkit any time.'
              : 'Colour, type, icons, images and AI — all in one workspace. Your work saves locally, and an account unlocks synced projects whenever you are ready.'}
          </p>
          <div className="landing-cta-row">
            <button type="button" className="btn btn-accent landing-cta-primary" onClick={enter}>
              {loggedIn ? 'Resume where you left off' : 'Get started for free'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          </div>
        </Reveal>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-footer-mark">UIL4B</span>
            <span className="landing-footer-tagline">Design toolkit for professionals.</span>
          </div>
          <div className="landing-footer-cols">
            <nav className="landing-footer-col" aria-label="Product">
              <span className="landing-footer-col-title">Product</span>
              <a href="#pricing">Pricing</a>
              <button type="button" className="landing-footer-link-btn" onClick={() => navigate('/color')}>Colour Studio</button>
              <button type="button" className="landing-footer-link-btn" onClick={() => navigate('/fontpairs')}>Font Pair Finder</button>
              <button type="button" className="landing-footer-link-btn" onClick={() => navigate('/icons')}>Icon Library</button>
            </nav>
            <nav className="landing-footer-col" aria-label="Resources">
              <span className="landing-footer-col-title">Resources</span>
              <button type="button" className="landing-footer-link-btn" onClick={() => navigate('/docs-design')}>Design Principles</button>
              <button type="button" className="landing-footer-link-btn" onClick={() => navigate('/help')}>Help Centre</button>
              <button type="button" className="landing-footer-link-btn" onClick={() => navigate('/docs-themes')}>UI Design Themes</button>
            </nav>
            <nav className="landing-footer-col" aria-label="Company">
              <span className="landing-footer-col-title">Company</span>
              <a href="https://dylan-coleman.com/" target="_blank" rel="noopener noreferrer">About</a>
              <button type="button" className="landing-footer-link-btn" onClick={() => navigate('/privacy')}>Privacy</button>
              <button type="button" className="landing-footer-link-btn" onClick={() => navigate('/terms')}>Terms</button>
            </nav>
          </div>
          <div className="landing-footer-bottom">
            <span className="landing-footer-copy">Built by <a href="https://dylan-coleman.com/" target="_blank" rel="noopener noreferrer">Dylan Coleman</a></span>
            <a href="https://buymeacoffee.com/dylan.coleman" target="_blank" rel="noopener noreferrer" className="landing-footer-donate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              Support this project
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
