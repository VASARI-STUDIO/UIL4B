import { useState, useEffect, useCallback, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { localiseTools, localiseCategories } from '../data/tools'
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

  const palette = design?.palette?.colors?.length ? design.palette.colors : ['#0051FF']
  const headingFont = design?.fonts?.heading?.family || 'Inter'
  const bodyFont = design?.fonts?.body?.family || 'Inter'
  const headingWeight = design?.fonts?.heading?.weight || 700
  const bodyWeight = design?.fonts?.body?.weight || 400
  const typeBase = design?.typeScale?.base || 16
  const typeRatio = design?.typeScale?.ratio || 1.25

  const dailyTip = useMemo(() => {
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
    return DESIGN_TIPS[dayOfYear % DESIGN_TIPS.length]
  }, [now])

  const completionStatus = useMemo(() => {
    const sections = [
      { key: 'colours', label: 'Colours', done: (design?.palette?.colors?.length || 0) > 1 },
      { key: 'typography', label: 'Fonts', done: design?.fonts?.heading?.family !== 'Inter' || design?.fonts?.body?.family !== 'Inter' },
      { key: 'typeScale', label: 'Scale', done: design?.typeScale?.ratio !== 1.25 || design?.typeScale?.base !== 16 },
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
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  const togglePin = useCallback((e, id) => {
    e.preventDefault(); e.stopPropagation()
    togglePinned(id)
  }, [togglePinned])

  const recentTools = recent.map(id => lTools.find(tl => tl.id === id)).filter(Boolean).slice(0, 4)
  const lastTool = recentTools[0]

  const colorCat = lCats.find(c => c.id === 'color')
  const typoCat = lCats.find(c => c.id === 'typography')
  const imgCat = lCats.find(c => c.id === 'imagery')
  const docsCat = lCats.find(c => c.id === 'documentation')

  const toolsWithMeta = lTools.map(tool => {
    const cat = lCats.find(c => c.id === tool.category)
    return { ...tool, catIcon: cat?.icon, isPinned: pinned.includes(tool.id) }
  })

  return (
    <div className="dash">
      <div className="bento">
        {/* HERO — compact greeting + completion */}
        <div className="bento-card bento-hero">
          <div className="bento-hero-top">
            <div>
              <div className="bento-hero-meta"><span className="bento-pulse" />{dateStr} · {timeStr}</div>
              <h1 className="bento-hero-title">{greeting}, <em>{firstName}</em></h1>
            </div>
            {lastTool && (
              <NavLink to={lastTool.path} className="bento-hero-cta">
                <span>{t('dash.continueWith', { name: lastTool.label })}</span>
                <ArrowIcon />
              </NavLink>
            )}
          </div>
          <div className="bento-hero-foot">
            <div className="bento-hero-completion">
              <div className="bento-hero-completion-bar">
                <div style={{ width: `${completionStatus.pct}%` }} />
              </div>
              <span className="bento-hero-completion-label">{completionStatus.doneCount}/{completionStatus.total} design tokens</span>
            </div>
            <div className="bento-hero-checks">
              {completionStatus.sections.map(s => (
                <span key={s.key} className={`bento-hero-check${s.done ? ' done' : ''}`}>{s.done ? '✓' : '·'} {s.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* WORKSPACE STATS */}
        <div className="bento-card bento-time">
          <div className="bento-label">{t('dash.localTime')}</div>
          <div className="bento-time-big">{timeStr}</div>
          <div className="bento-time-stats">
            <div><span className="bento-time-num">{pinned.length}</span><span className="bento-time-lbl">{t('dash.pinned')}</span></div>
            <div><span className="bento-time-num">{lTools.length}</span><span className="bento-time-lbl">{t('dash.tools')}</span></div>
            <div><span className="bento-time-num">{lCats.length}</span><span className="bento-time-lbl">{t('dash.areas')}</span></div>
          </div>
        </div>

        {/* COLOUR — live palette */}
        <NavLink to="/color" className="bento-card bento-feature bento-color">
          <div className="bento-feature-head">
            <span className="bento-label">Palette</span>
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
            <h2>{colorCat?.label || 'Colour Studio'}</h2>
            <p>{colorCat?.description}</p>
            <span className="bento-feature-link">{t('common.open')} <ArrowIcon /></span>
          </div>
        </NavLink>

        {/* TYPOGRAPHY — live fonts */}
        <NavLink to="/typography" className="bento-card bento-cat bento-typo">
          <div className="bento-typo-preview">
            <span className="bento-typo-h" style={{ fontFamily: `'${headingFont}', sans-serif`, fontWeight: headingWeight }}>Aa</span>
            <span className="bento-typo-b" style={{ fontFamily: `'${bodyFont}', sans-serif`, fontWeight: bodyWeight }}>Aa</span>
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

        {/* DOCUMENTATION — live type scale */}
        <NavLink to="/docs" className="bento-card bento-cat bento-docs">
          <div className="bento-docs-grid">
            {[3, 2, 1, 0].map(step => {
              const size = Math.round(typeBase * Math.pow(typeRatio, step))
              return (
                <div key={step} className="bento-docs-row">
                  <span className="bento-docs-num">{size}</span>
                  <span className="bento-docs-bar" style={{ width: `${100 - step * 14}%` }} />
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

      {/* Daily tip */}
      <div className="dash-tip">
        <span className="dash-tip-badge">{dailyTip.topic}</span>
        <span className="dash-tip-text">{dailyTip.tip}</span>
      </div>

      {/* Recent tools */}
      {recentTools.length > 0 && (
        <section>
          <h2 className="dash-section-title">{t('dash.jumpBackIn')}</h2>
          <div className="dash-recent-row">
            {recentTools.map(tl => (
              <NavLink key={tl.id} to={tl.path} className="dash-recent-item">
                <span className="dash-recent-dot" />
                <span>{tl.label}</span>
                <ArrowIcon />
              </NavLink>
            ))}
          </div>
        </section>
      )}

      {/* All tools */}
      <section>
        <div className="dash-tools-header">
          <h2 className="dash-section-title">{t('dash.yourTools')}</h2>
          <span className="dash-tools-count">{pinned.length} {t('dash.pinned').toLowerCase()}</span>
        </div>
        <div className="dash-tools-grid">
          {toolsWithMeta.map(tl => (
            <NavLink key={tl.id} to={tl.path} className={`dash-tool-card${tl.isPinned ? ' pinned' : ''}`}>
              <div className="dash-tool-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{tl.catIcon}</svg>
              </div>
              <div className="dash-tool-body">
                <span className="dash-tool-name">{tl.label}</span>
                <span className="dash-tool-desc">{tl.description}</span>
              </div>
              <button
                type="button"
                className="dash-tool-pin"
                onClick={(e) => togglePin(e, tl.id)}
                aria-label={tl.isPinned ? t('common.unpin', { name: tl.label }) : t('common.pin', { name: tl.label })}
              >
                <PinIcon filled={tl.isPinned} />
              </button>
            </NavLink>
          ))}
        </div>
      </section>
    </div>
  )
}
