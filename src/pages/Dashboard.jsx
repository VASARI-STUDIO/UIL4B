import { useState, useEffect, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { CATEGORIES, localiseTools, localiseCategories } from '../data/tools'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'

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

function loadSavedPalette() {
  try {
    const raw = localStorage.getItem('vs-palette')
    if (!raw) return null
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : null
  } catch { return null }
}

const DEFAULT_PALETTE = ['#2563EB', '#7C3AED', '#EC4899', '#F59E0B', '#10B981']

const SAMPLE_FONTS = [
  { family: 'Inter, sans-serif', weight: 800, label: 'Aa' },
  { family: 'Georgia, serif', weight: 400, label: 'Aa' },
  { family: '"Courier New", monospace', weight: 600, label: 'Aa' },
]

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
  const [now, setNow] = useState(() => new Date())
  const [palette, setPalette] = useState(() => loadSavedPalette() || DEFAULT_PALETTE)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const onStorage = () => setPalette(loadSavedPalette() || DEFAULT_PALETTE)
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const lTools = localiseTools(t)
  const lCats = localiseCategories(t)

  const greeting = (() => {
    const h = now.getHours()
    if (h < 5) return t('dash.greeting.lateNight')
    if (h < 12) return t('dash.greeting.morning')
    if (h < 18) return t('dash.greeting.afternoon')
    return t('dash.greeting.evening')
  })()

  const firstName = userProfile?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'maker'

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
        {/* HERO - large greeting */}
        <div className="bento-card bento-hero">
          <div className="bento-hero-meta">
            <span className="bento-pulse" />
            <span>{dateStr}</span>
          </div>
          <h1 className="bento-hero-title">
            {greeting},<br /><em>{firstName}</em>
          </h1>
          <p className="bento-hero-sub">{t('dash.heroSub')}</p>
          {lastTool && (
            <NavLink to={lastTool.path} className="bento-hero-cta">
              <span>Continue with {lastTool.label}</span>
              <ArrowIcon />
            </NavLink>
          )}
        </div>

        {/* TIME / STATUS */}
        <div className="bento-card bento-time">
          <div className="bento-label">Local time</div>
          <div className="bento-time-big">{timeStr}</div>
          <div className="bento-time-stats">
            <div><span className="bento-time-num">{pinnedTools.length}</span><span className="bento-time-lbl">Pinned</span></div>
            <div><span className="bento-time-num">{lTools.length}</span><span className="bento-time-lbl">Tools</span></div>
            <div><span className="bento-time-num">{lCats.length}</span><span className="bento-time-lbl">Areas</span></div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="bento-card bento-quick">
          <div className="bento-label">Jump back in</div>
          <div className="bento-quick-list">
            {recentTools.length > 0 ? recentTools.map(tl => (
              <NavLink key={tl.id} to={tl.path} className="bento-quick-item">
                <span className="bento-quick-dot" />
                <span className="bento-quick-label">{tl.label}</span>
                <ArrowIcon />
              </NavLink>
            )) : (
              <div className="bento-quick-empty">Visit a tool to see it here</div>
            )}
          </div>
        </div>

        {/* COLOR STUDIO featured - palette preview */}
        <NavLink to="/color" className="bento-card bento-feature bento-color">
          <div className="bento-feature-head">
            <div className="bento-label">Featured</div>
            <span className="bento-feature-num">01</span>
          </div>
          <div className="bento-color-strip">
            {palette.slice(0, 5).map((c, i) => (
              <div key={i} className="bento-color-swatch" style={{ background: c }}>
                <span>{c.toUpperCase()}</span>
              </div>
            ))}
          </div>
          <div className="bento-feature-body">
            <h2>Colour Studio</h2>
            <p>Build palettes, tints, gradients, contrast checks and complete design system exports.</p>
            <span className="bento-feature-link">Open studio <ArrowIcon /></span>
          </div>
        </NavLink>

        {/* TYPOGRAPHY */}
        <NavLink to="/typography" className="bento-card bento-cat bento-typo">
          <div className="bento-typo-preview">
            {SAMPLE_FONTS.map((f, i) => (
              <span key={i} style={{ fontFamily: f.family, fontWeight: f.weight }}>{f.label}</span>
            ))}
          </div>
          <div className="bento-cat-body">
            <div className="bento-label">Category 02</div>
            <h3>{typoCat?.label || 'Typography'}</h3>
            <p>Type scales and pairings tuned for readability.</p>
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
            <div className="bento-label">Category 03</div>
            <h3>{imgCat?.label || 'Imagery'}</h3>
            <p>Icons, image tools, video frames, prompts.</p>
          </div>
        </NavLink>

        {/* DOCUMENTATION */}
        <NavLink to="/docs" className="bento-card bento-cat bento-docs">
          <div className="bento-docs-grid">
            <span className="bento-docs-line w-full" />
            <span className="bento-docs-line w-3/4" />
            <span className="bento-docs-line w-5/6" />
            <span className="bento-docs-line w-2/3" />
            <span className="bento-docs-line w-4/5" />
            <span className="bento-docs-mark" />
          </div>
          <div className="bento-cat-body">
            <div className="bento-label">Category 04</div>
            <h3>{docsCat?.label || 'Documentation'}</h3>
            <p>Principles, marketing playbooks, and references — written like real articles.</p>
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
            <span>Pin tools from any category to see them here for quick access.</span>
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
