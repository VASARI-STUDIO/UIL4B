import { useState, useEffect, useCallback, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { CATEGORIES, localiseTools, localiseCategories } from '../data/tools'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useProject } from '../contexts/ProjectContext'

function PinIcon({ filled }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76Z" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

const DEFAULT_PALETTE = ['#2563EB', '#7C3AED', '#EC4899', '#F59E0B', '#10B981']

const CURATED_PALETTES = [
  { name: 'Oceanic', colors: ['#0D1B2A', '#1B263B', '#415A77', '#778DA9', '#E0E1DD'] },
  { name: 'Sunset', colors: ['#F72585', '#B5179E', '#7209B7', '#560BAD', '#480CA8'] },
  { name: 'Forest', colors: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#B7E4C7'] },
  { name: 'Coral', colors: ['#FF6B6B', '#EE6C4D', '#F4845F', '#F7B267', '#F9D56E'] },
  { name: 'Arctic', colors: ['#CAF0F8', '#90E0EF', '#48CAE4', '#0096C7', '#023E8A'] },
  { name: 'Terracotta', colors: ['#D4A373', '#CCD5AE', '#E9EDC9', '#FAEDCD', '#FEFAE0'] },
  { name: 'Neon', colors: ['#7400B8', '#6930C3', '#5E60CE', '#5390D9', '#4EA8DE'] },
  { name: 'Warm Clay', colors: ['#3E2723', '#D4896A', '#FFF8E1', '#8FBC8F', '#5D4037'] },
]

const DESIGN_TIPS = [
  { tip: 'Use no more than 2-3 typefaces in a single project for visual cohesion.', topic: 'Typography' },
  { tip: 'The 60-30-10 rule: 60% dominant colour, 30% secondary, 10% accent.', topic: 'Colour' },
  { tip: 'White space is not empty space — it gives your design room to breathe.', topic: 'Layout' },
  { tip: 'Contrast ratio of at least 4.5:1 ensures text is readable for most users.', topic: 'Accessibility' },
  { tip: 'Align elements to a consistent grid to create order and visual rhythm.', topic: 'Layout' },
  { tip: 'Limit your palette to 5 colours max — constraints breed creativity.', topic: 'Colour' },
  { tip: 'Body text should be 16px minimum on screen for comfortable reading.', topic: 'Typography' },
  { tip: 'Group related items together — proximity implies relationship.', topic: 'Gestalt' },
  { tip: 'Use a modular type scale (e.g. 1.25 ratio) for harmonious heading sizes.', topic: 'Typography' },
  { tip: 'Test your colours in both light and dark mode before finalising.', topic: 'Colour' },
  { tip: 'Icons should be consistent in style — do not mix outlined and filled.', topic: 'Imagery' },
  { tip: 'The golden ratio (1.618) can guide proportions in layout and spacing.', topic: 'Layout' },
  { tip: 'Warm colours advance, cool colours recede — use this for visual depth.', topic: 'Colour' },
  { tip: 'Repetition of visual elements creates unity across your design system.', topic: 'Principles' },
]

/* Generate a random harmonious palette using HSL colour theory */
function generateHarmoniousPalette() {
  const baseHue = Math.random() * 360
  const baseSat = 55 + Math.random() * 30
  const baseLit = 40 + Math.random() * 20
  const strategies = ['analogous', 'triadic', 'splitComp', 'complementary', 'tetradic']
  const strategy = strategies[Math.floor(Math.random() * strategies.length)]
  const hslToHex = (h, s, l) => {
    h = ((h % 360) + 360) % 360
    s /= 100; l /= 100
    const a = s * Math.min(l, 1 - l)
    const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1) }
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0')
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase()
  }
  let hues
  switch (strategy) {
    case 'analogous': hues = [-30, -15, 0, 15, 30]; break
    case 'triadic': hues = [-10, 0, 120, 240, 250]; break
    case 'splitComp': hues = [-15, 0, 15, 150, 210]; break
    case 'complementary': hues = [-15, 0, 15, 165, 180]; break
    case 'tetradic': hues = [0, 90, 180, 270, 315]; break
    default: hues = [0, 30, 60, 90, 120]
  }
  const names = { analogous: 'Analogous', triadic: 'Triadic', splitComp: 'Split-Comp', complementary: 'Complement', tetradic: 'Tetradic' }
  return {
    name: names[strategy] || 'Generated',
    generated: true,
    colors: hues.map((offset, i) => {
      const litShift = (i - 2) * 8
      return hslToHex(baseHue + offset, baseSat + (i % 2 === 0 ? -5 : 5), baseLit + litShift)
    }),
  }
}

/* Build the session palette list: curated + randomly generated, shuffled once per session */
function buildSessionPalettes() {
  const generated = Array.from({ length: 4 }, () => generateHarmoniousPalette())
  const combined = [...CURATED_PALETTES, ...generated]
  // Fisher-Yates shuffle
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[combined[i], combined[j]] = [combined[j], combined[i]]
  }
  return combined
}

const ICON_GLYPHS = [
  <path key="1" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  <><circle key="1" cx="12" cy="12" r="10" /><path key="2" d="M8 14s1.5 2 4 2 4-2 4-2" /><line key="3" x1="9" y1="9" x2="9.01" y2="9" /><line key="4" x1="15" y1="9" x2="15.01" y2="9" /></>,
  <><rect key="1" x="3" y="3" width="18" height="18" rx="2" /><circle key="2" cx="8.5" cy="8.5" r="1.5" /><polyline key="3" points="21 15 16 10 5 21" /></>,
  <><path key="1" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></>,
  <><circle key="1" cx="12" cy="12" r="10" /><polygon key="2" points="10 8 16 12 10 16 10 8" /></>,
  <><path key="1" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline key="2" points="9 22 9 12 15 12 15 22" /></>,
]

export default function Dashboard() {
  const { user, userProfile } = useAuth()
  const { pinned, togglePinned, recent } = useWorkspace()
  const { t } = useI18n()
  const { design } = useProject()
  const [now, setNow] = useState(() => new Date())
  const [featuredIdx, setFeaturedIdx] = useState(0)

  // Build session palettes once per mount (curated + random generated, shuffled)
  const [sessionPalettes] = useState(() => buildSessionPalettes())

  const hasUserPalette = design?.palette?.colors?.length > 0
  const palette = hasUserPalette ? design.palette.colors : sessionPalettes[featuredIdx]?.colors || CURATED_PALETTES[0].colors
  const paletteName = hasUserPalette ? null : (sessionPalettes[featuredIdx]?.name || 'Featured')
  const isGenerated = !hasUserPalette && sessionPalettes[featuredIdx]?.generated
  const headingFont = design?.fonts?.heading?.family || 'Inter'
  const bodyFont = design?.fonts?.body?.family || 'Inter'
  const headingWeight = design?.fonts?.heading?.weight || 700
  const bodyWeight = design?.fonts?.body?.weight || 400
  const typeBase = design?.typeScale?.base || 16
  const typeRatio = design?.typeScale?.ratio || 1.25

  // Daily design tip — rotates based on day of year
  const dailyTip = useMemo(() => {
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
    return DESIGN_TIPS[dayOfYear % DESIGN_TIPS.length]
  }, [now])

  // Design system completion status
  const completionStatus = useMemo(() => {
    const sections = [
      { key: 'colours', label: 'Colours', done: (design?.palette?.colors?.length || 0) > 1 },
      { key: 'typography', label: 'Typography', done: design?.fonts?.heading?.family !== 'Inter' || design?.fonts?.body?.family !== 'Inter' },
      { key: 'typeScale', label: 'Type Scale', done: design?.typeScale?.ratio !== 1.25 || design?.typeScale?.base !== 16 },
      { key: 'tints', label: 'Tints', done: (design?.tints?.scale?.length || 0) > 0 },
      { key: 'gradients', label: 'Gradients', done: design?.gradient?.stops?.some(s => s.color != null) || false },
    ]
    const doneCount = sections.filter(s => s.done).length
    return { sections, doneCount, total: sections.length, pct: Math.round((doneCount / sections.length) * 100) }
  }, [design])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (hasUserPalette) return
    const id = setInterval(() => setFeaturedIdx(i => (i + 1) % sessionPalettes.length), 5000)
    return () => clearInterval(id)
  }, [hasUserPalette, sessionPalettes.length])

  const lTools = localiseTools(t)
  const lCats = localiseCategories(t)

  const greeting = (() => {
    const h = now.getHours()
    if (h < 5) return t('dash.greeting.lateNight')
    if (h < 12) return t('dash.greeting.morning')
    if (h < 18) return t('dash.greeting.afternoon')
    return t('dash.greeting.evening')
  })()

  const firstName = userProfile?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Creator'

  const pinnedTools = pinned.map(id => {
    const tool = lTools.find(tl => tl.id === id)
    if (!tool) return null
    const cat = lCats.find(c => c.id === tool.category)
    return { ...tool, icon: cat?.icon }
  }).filter(Boolean).slice(0, 6)

  const recentTools = recent.map(id => lTools.find(tl => tl.id === id)).filter(Boolean).slice(0, 4)
  const lastTool = recentTools[0]

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })

  const colorCat = lCats.find(c => c.id === 'color')
  const typoCat = lCats.find(c => c.id === 'typography')
  const imgCat = lCats.find(c => c.id === 'imagery')
  const docsCat = lCats.find(c => c.id === 'documentation')

  const togglePin = useCallback((e, id) => {
    e.preventDefault(); e.stopPropagation()
    togglePinned(id)
  }, [togglePinned])

  return (
    <div className="dash">
      <div className="bento">
        {/* HERO - large greeting with design tip, completion, and palette preview */}
        <div className="bento-card bento-hero">
          <div className="bento-hero-meta">
            <span className="bento-pulse" />
            <span>{dateStr}</span>
          </div>
          <h1 className="bento-hero-title">
            {greeting},<br /><em>{firstName}</em>
          </h1>
          <div className="bento-hero-extras">
            {/* Daily design tip */}
            <div className="bento-hero-tip">
              <span className="bento-hero-tip-badge">{dailyTip.topic}</span>
              <span className="bento-hero-tip-text">{dailyTip.tip}</span>
            </div>
            {/* Design system completion */}
            <div className="bento-hero-completion">
              <div className="bento-hero-completion-bar">
                <div className="bento-hero-completion-fill" style={{ width: `${completionStatus.pct}%` }} />
              </div>
              <div className="bento-hero-completion-items">
                {completionStatus.sections.map(s => (
                  <span key={s.key} className={`bento-hero-completion-dot${s.done ? ' done' : ''}`} title={s.label}>
                    {s.done ? '✓' : '·'} {s.label}
                  </span>
                ))}
              </div>
            </div>
            {/* Inline palette preview */}
            {hasUserPalette && (
              <NavLink to="/color" className="bento-hero-palette-preview">
                {design.palette.colors.slice(0, 5).map((c, i) => (
                  <span key={i} className="bento-hero-palette-dot" style={{ background: c }} title={c} />
                ))}
                <span className="bento-hero-palette-label">Your palette</span>
              </NavLink>
            )}
          </div>
          {lastTool && (
            <NavLink to={lastTool.path} className="bento-hero-cta">
              <span>{t('dash.continueWith', { name: lastTool.label })}</span>
              <ArrowIcon />
            </NavLink>
          )}
        </div>

        {/* TIME / STATUS */}
        <div className="bento-card bento-time">
          <div className="bento-label">{t('dash.localTime')}</div>
          <div className="bento-time-big">{timeStr}</div>
          <div className="bento-time-stats">
            <div><span className="bento-time-num">{pinnedTools.length}</span><span className="bento-time-lbl">{t('dash.pinned')}</span></div>
            <div><span className="bento-time-num">{lTools.length}</span><span className="bento-time-lbl">{t('dash.tools')}</span></div>
            <div><span className="bento-time-num">{lCats.length}</span><span className="bento-time-lbl">{t('dash.areas')}</span></div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="bento-card bento-quick">
          <div className="bento-label">{t('dash.jumpBackIn')}</div>
          <div className="bento-quick-list">
            {recentTools.length > 0 ? recentTools.map(tl => (
              <NavLink key={tl.id} to={tl.path} className="bento-quick-item">
                <span className="bento-quick-dot" />
                <span className="bento-quick-label">{tl.label}</span>
                <ArrowIcon />
              </NavLink>
            )) : (
              <div className="bento-quick-empty">{t('dash.visitToolHint')}</div>
            )}
          </div>
        </div>

        {/* COLOR STUDIO featured - palette preview */}
        <NavLink to="/color" className="bento-card bento-feature bento-color">
          <div className="bento-feature-head">
            <div className="bento-label">{paletteName ? `${isGenerated ? 'Generated' : 'Featured'} · ${paletteName}` : t('dash.featured')}</div>
            <span className="bento-feature-num">01</span>
          </div>
          <div className="bento-color-strip" key={featuredIdx}>
            {palette.slice(0, 5).map((c, i) => (
              <div key={i} className="bento-color-swatch" style={{ background: c }}>
                <span>{c.toUpperCase()}</span>
              </div>
            ))}
          </div>
          <div className="bento-feature-body">
            <h2>{colorCat?.label || 'Colour Studio'}</h2>
            <p>{colorCat?.description}</p>
            <span className="bento-feature-link">{t('common.open')} <ArrowIcon /></span>
          </div>
        </NavLink>

        {/* TYPOGRAPHY — live font preview from design state */}
        <NavLink to="/typography" className="bento-card bento-cat bento-typo">
          <div className="bento-typo-preview">
            <span style={{ fontFamily: `'${headingFont}', sans-serif`, fontWeight: headingWeight, fontSize: 36 }}>Aa</span>
            <span style={{ fontFamily: `'${bodyFont}', sans-serif`, fontWeight: bodyWeight, fontSize: 28 }}>Aa</span>
            <span className="bento-typo-meta">{headingFont}{headingFont !== bodyFont ? ` / ${bodyFont}` : ''}</span>
          </div>
          <div className="bento-cat-body">
            <div className="bento-label">{t('dash.category', { num: '02' })}</div>
            <h3>{typoCat?.label || 'Typography'}</h3>
            <p>{typoCat?.description}</p>
          </div>
        </NavLink>

        {/* IMAGERY */}
        <NavLink to="/imagery" className="bento-card bento-cat bento-img">
          <div className="bento-img-preview">
            {ICON_GLYPHS.map((g, i) => (
              <span key={i} className="bento-img-cell">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{g}</svg>
              </span>
            ))}
          </div>
          <div className="bento-cat-body">
            <div className="bento-label">{t('dash.category', { num: '03' })}</div>
            <h3>{imgCat?.label || 'Imagery'}</h3>
            <p>{imgCat?.description}</p>
          </div>
        </NavLink>

        {/* DOCUMENTATION — type scale mini preview */}
        <NavLink to="/docs" className="bento-card bento-cat bento-docs">
          <div className="bento-docs-grid">
            {[3, 2, 1, 0].map(step => {
              const size = Math.round(typeBase * Math.pow(typeRatio, step))
              return (
                <div key={step} className="bento-docs-scale-row">
                  <span className="bento-docs-size">{size}</span>
                  <span className="bento-docs-line" style={{ width: `${100 - step * 12}%` }} />
                </div>
              )
            })}
          </div>
          <div className="bento-cat-body">
            <div className="bento-label">{t('dash.category', { num: '04' })}</div>
            <h3>{docsCat?.label || 'Documentation'}</h3>
            <p>{docsCat?.description}</p>
          </div>
        </NavLink>
      </div>

      {/* Pinned tools horizontal section */}
      <section className="dash-section dash-pinned-section">
        <div className="dash-section-header">
          <h2>{t('dash.yourTools')}</h2>
          <span className="dash-section-meta">{t('dash.pinnedCount', { count: pinnedTools.length })}</span>
        </div>
        {pinnedTools.length === 0 ? (
          <div className="dash-pin-hint">
            <PinIcon />
            <span>{t('dash.pinHint')}</span>
          </div>
        ) : (
          <div className="pinned-strip">
            {pinnedTools.map(tl => (
              <NavLink key={tl.id} to={tl.path} className="pinned-card">
                <div className="pinned-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {tl.icon}
                  </svg>
                </div>
                <div className="pinned-card-body">
                  <span className="pinned-card-label">{tl.label}</span>
                  <span className="pinned-card-desc">{tl.description}</span>
                </div>
                <button
                  type="button"
                  className="pinned-card-pin"
                  onClick={(e) => togglePin(e, tl.id)}
                  aria-label={t('common.unpin', { name: tl.label })}
                >
                  <PinIcon filled />
                </button>
              </NavLink>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
