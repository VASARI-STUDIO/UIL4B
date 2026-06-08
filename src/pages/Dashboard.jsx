import { useState, useEffect, useCallback, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { CATEGORIES, TOOLS, localiseTools, localiseCategories } from '../data/tools'
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

export default function Dashboard() {
  const { user, userProfile } = useAuth()
  const { pinned, togglePinned, recent } = useWorkspace()
  const { t } = useI18n()
  const { design } = useProject()
  const [now, setNow] = useState(() => new Date())

  const headingFont = design?.fonts?.heading?.family || 'Inter'
  const bodyFont = design?.fonts?.body?.family || 'Inter'
  const headingWeight = design?.fonts?.heading?.weight || 700
  const bodyWeight = design?.fonts?.body?.weight || 400
  const typeBase = design?.typeScale?.base || 16
  const typeRatio = design?.typeScale?.ratio || 1.25
  const palette = design?.palette?.colors || ['#0051FF']

  const dailyTip = useMemo(() => {
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
    return DESIGN_TIPS[dayOfYear % DESIGN_TIPS.length]
  }, [now])

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

  const toolsWithMeta = lTools.map(tool => {
    const cat = lCats.find(c => c.id === tool.category)
    return { ...tool, catIcon: cat?.icon, isPinned: pinned.includes(tool.id) }
  })

  return (
    <div className="dash">
      {/* ── Header row ── */}
      <header className="dash-header">
        <div className="dash-header-left">
          <h1 className="dash-greeting">{greeting}, <em>{firstName}</em></h1>
          <span className="dash-date">{dateStr} · {timeStr}</span>
        </div>
        <div className="dash-header-right">
          <div className="dash-completion">
            <div className="dash-completion-bar">
              <div className="dash-completion-fill" style={{ width: `${completionStatus.pct}%` }} />
            </div>
            <span className="dash-completion-label">{completionStatus.doneCount}/{completionStatus.total} design tokens</span>
          </div>
        </div>
      </header>

      {/* ── Design system overview ── */}
      <section className="dash-overview">
        <NavLink to="/color" className="dash-ov-card dash-ov-palette">
          <div className="dash-ov-head">
            <span className="dash-ov-label">Palette</span>
            <ArrowIcon />
          </div>
          <div className="dash-ov-swatches">
            {palette.slice(0, 6).map((c, i) => (
              <div key={i} className="dash-ov-swatch" style={{ background: c }} title={c} />
            ))}
          </div>
          <div className="dash-ov-completion">
            {completionStatus.sections.filter(s => ['colours', 'tints', 'gradients'].includes(s.key)).map(s => (
              <span key={s.key} className={`dash-ov-dot${s.done ? ' done' : ''}`}>{s.done ? '✓' : '·'} {s.label}</span>
            ))}
          </div>
        </NavLink>

        <NavLink to="/typography" className="dash-ov-card dash-ov-fonts">
          <div className="dash-ov-head">
            <span className="dash-ov-label">Fonts</span>
            <ArrowIcon />
          </div>
          <div className="dash-ov-font-preview">
            <span className="dash-ov-font-h" style={{ fontFamily: `'${headingFont}', sans-serif`, fontWeight: headingWeight }}>Aa</span>
            <span className="dash-ov-font-b" style={{ fontFamily: `'${bodyFont}', sans-serif`, fontWeight: bodyWeight }}>Aa</span>
          </div>
          <span className="dash-ov-font-meta">{headingFont}{headingFont !== bodyFont ? ` / ${bodyFont}` : ''}</span>
        </NavLink>

        <NavLink to="/typescale" className="dash-ov-card dash-ov-scale">
          <div className="dash-ov-head">
            <span className="dash-ov-label">Type Scale</span>
            <ArrowIcon />
          </div>
          <div className="dash-ov-scale-rows">
            {[3, 2, 1, 0].map(step => {
              const size = Math.round(typeBase * Math.pow(typeRatio, step))
              return (
                <div key={step} className="dash-ov-scale-row">
                  <span className="dash-ov-scale-num">{size}</span>
                  <span className="dash-ov-scale-bar" style={{ width: `${100 - step * 15}%` }} />
                </div>
              )
            })}
          </div>
        </NavLink>
      </section>

      {/* ── Design tip ── */}
      <div className="dash-tip">
        <span className="dash-tip-badge">{dailyTip.topic}</span>
        <span className="dash-tip-text">{dailyTip.tip}</span>
      </div>

      {/* ── Recent tools ── */}
      {recentTools.length > 0 && (
        <section className="dash-recent">
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

      {/* ── Categories ── */}
      <section className="dash-cats">
        <h2 className="dash-section-title">Categories</h2>
        <div className="dash-cats-row">
          {lCats.map(cat => (
            <NavLink key={cat.id} to={cat.path} className="dash-cat-card">
              <div className="dash-cat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{cat.icon}</svg>
              </div>
              <div className="dash-cat-info">
                <span className="dash-cat-name">{cat.label}</span>
                <span className="dash-cat-desc">{cat.description}</span>
              </div>
              <ArrowIcon />
            </NavLink>
          ))}
        </div>
      </section>

      {/* ── All tools ── */}
      <section className="dash-tools">
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
