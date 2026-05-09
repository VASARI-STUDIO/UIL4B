import { useState, useRef, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { CATEGORIES, localiseTools, localiseCategories } from '../data/tools'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'

function PinIcon({ filled }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76Z" />
    </svg>
  )
}

function GripIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="9" cy="5" r="2" /><circle cx="15" cy="5" r="2" />
      <circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" />
      <circle cx="9" cy="19" r="2" /><circle cx="15" cy="19" r="2" />
    </svg>
  )
}

const CAT_ILLUSTRATIONS = {
  color: (
    <svg viewBox="0 0 80 80" fill="none" className="cat-card-art">
      <circle cx="28" cy="32" r="18" fill="rgba(37,99,235,.12)" />
      <circle cx="50" cy="32" r="18" fill="rgba(59,130,246,.10)" />
      <circle cx="39" cy="48" r="18" fill="rgba(236,72,153,.08)" />
      <circle cx="28" cy="32" r="8" fill="rgba(37,99,235,.25)" />
      <circle cx="50" cy="32" r="8" fill="rgba(59,130,246,.2)" />
      <circle cx="39" cy="48" r="8" fill="rgba(236,72,153,.18)" />
    </svg>
  ),
  typography: (
    <svg viewBox="0 0 80 80" fill="none" className="cat-card-art">
      <text x="10" y="42" fontFamily="Inter, sans-serif" fontSize="36" fontWeight="800" fill="rgba(37,99,235,.12)">Aa</text>
      <text x="10" y="42" fontFamily="Inter, sans-serif" fontSize="36" fontWeight="800" fill="none" stroke="rgba(37,99,235,.2)" strokeWidth="1">Aa</text>
      <line x1="10" y1="54" x2="55" y2="54" stroke="rgba(37,99,235,.15)" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="62" x2="40" y2="62" stroke="rgba(37,99,235,.1)" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="70" x2="48" y2="70" stroke="rgba(37,99,235,.07)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  imagery: (
    <svg viewBox="0 0 80 80" fill="none" className="cat-card-art">
      <rect x="10" y="16" width="52" height="40" rx="6" fill="rgba(37,99,235,.06)" stroke="rgba(37,99,235,.15)" strokeWidth="1.5" />
      <circle cx="24" cy="28" r="5" fill="rgba(59,130,246,.15)" />
      <path d="M10 46 28 32 42 44 52 36 62 46" stroke="rgba(37,99,235,.2)" strokeWidth="1.5" fill="rgba(37,99,235,.04)" />
      <rect x="14" y="60" width="20" height="3" rx="1.5" fill="rgba(37,99,235,.1)" />
      <rect x="14" y="66" width="14" height="3" rx="1.5" fill="rgba(37,99,235,.07)" />
    </svg>
  ),
  documentation: (
    <svg viewBox="0 0 80 80" fill="none" className="cat-card-art">
      <rect x="16" y="10" width="40" height="52" rx="4" fill="rgba(37,99,235,.05)" stroke="rgba(37,99,235,.12)" strokeWidth="1.5" />
      <line x1="24" y1="24" x2="48" y2="24" stroke="rgba(37,99,235,.15)" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="32" x2="44" y2="32" stroke="rgba(37,99,235,.1)" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="40" x2="46" y2="40" stroke="rgba(37,99,235,.1)" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="48" x2="36" y2="48" stroke="rgba(37,99,235,.08)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="52" r="10" fill="rgba(59,130,246,.06)" stroke="rgba(59,130,246,.12)" strokeWidth="1" />
      <path d="M45 52h6M48 49v6" stroke="rgba(59,130,246,.2)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
}

function ToolMini({ tool, index, draggable, onDragStart, onDragOver, onDragEnd, onDrop, dragOverIdx }) {
  const { pinned, togglePinned } = useWorkspace()
  const { t } = useI18n()
  const isPinned = pinned.includes(tool.id)
  const isDragOver = dragOverIdx === index

  return (
    <NavLink
      to={tool.path}
      className={`tool-mini${isDragOver ? ' drag-over' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart(e, index) : undefined}
      onDragOver={draggable ? (e) => onDragOver(e, index) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onDrop={draggable ? (e) => onDrop(e, index) : undefined}
    >
      {draggable && (
        <span
          className="tool-mini-drag"
          onMouseDown={e => e.stopPropagation()}
          title="Drag to reorder"
        >
          <GripIcon />
        </span>
      )}
      <div className="tool-mini-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {tool.icon}
        </svg>
      </div>
      <div className="tool-mini-body">
        <span className="tool-mini-label">{tool.label}</span>
        <span className="tool-mini-desc">{tool.description}</span>
      </div>
      <button
        type="button"
        className={`tool-mini-pin${isPinned ? ' pinned' : ''}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePinned(tool.id) }}
        aria-label={isPinned ? t('common.unpin', { name: tool.label }) : t('common.pin', { name: tool.label })}
      >
        <PinIcon filled={isPinned} />
      </button>
    </NavLink>
  )
}

export default function Dashboard() {
  const { user, userProfile } = useAuth()
  const { pinned, togglePinned, reorderPinned } = useWorkspace()
  const { t } = useI18n()
  const [showAllTools, setShowAllTools] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  const lTools = localiseTools(t)
  const lCats = localiseCategories(t)

  const greeting = (() => {
    const h = new Date().getHours()
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
  }).filter(Boolean)

  const unpinnedTools = lTools.filter(tl => !pinned.includes(tl.id)).map(tool => {
    const cat = lCats.find(c => c.id === tool.category)
    return { ...tool, icon: cat?.icon }
  })

  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }, [])

  const handleDrop = useCallback((e, toIdx) => {
    e.preventDefault()
    if (dragIdx !== null && dragIdx !== toIdx) {
      reorderPinned(dragIdx, toIdx)
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }, [dragIdx, reorderPinned])

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setDragOverIdx(null)
  }, [])

  return (
    <div className="dash">
      <div className="dash-hero">
        <h1 className="dash-hero-title">
          {greeting}, <em>{firstName}</em>
        </h1>
        <p className="dash-hero-sub">
          {t('dash.heroSub')}
        </p>
      </div>

      <section className="dash-section">
        <div className="dash-section-header">
          <h2>{t('dash.yourTools')}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="dash-section-meta">{t('dash.pinnedCount', { count: pinnedTools.length })}</span>
            <button className="btn btn-s" onClick={() => setShowAllTools(!showAllTools)} style={{ fontSize: 10, padding: '4px 10px' }}>
              {showAllTools ? 'Done' : '+ Add Tools'}
            </button>
          </div>
        </div>

        {pinnedTools.length === 0 && !showAllTools && (
          <div className="dash-pin-hint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17v5" />
              <path d="M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76Z" />
            </svg>
            Click "+ Add Tools" to pin your favourite tools here, then drag to reorder them.
          </div>
        )}

        <div className="dash-tools-grid">
          {pinnedTools.map((tl, idx) => (
            <ToolMini
              key={tl.id}
              tool={tl}
              index={idx}
              draggable={true}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              dragOverIdx={dragOverIdx}
            />
          ))}
        </div>
      </section>

      {showAllTools && (
        <section className="dash-section">
          <div className="dash-section-header">
            <h2>All Tools</h2>
            <span className="dash-section-meta">Click pin to add or remove</span>
          </div>
          <div className="dash-tools-grid">
            {unpinnedTools.map(tl => (
              <div key={tl.id} className="tool-mini" style={{ cursor: 'default' }}>
                <div className="tool-mini-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    {tl.icon}
                  </svg>
                </div>
                <div className="tool-mini-body">
                  <span className="tool-mini-label">{tl.label}</span>
                  <span className="tool-mini-desc">{tl.description}</span>
                </div>
                <button
                  type="button"
                  className="tool-mini-pin"
                  onClick={() => togglePinned(tl.id)}
                  aria-label={t('common.pin', { name: tl.label })}
                >
                  <PinIcon filled={false} />
                </button>
              </div>
            ))}
            {unpinnedTools.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--t2)', padding: '12px 0' }}>All tools are pinned!</div>
            )}
          </div>
        </section>
      )}

      <section className="dash-section">
        <div className="dash-section-header">
          <h2>{t('dash.explore')}</h2>
          <span className="dash-section-meta">{t('dash.categoryCount', { count: CATEGORIES.length })}</span>
        </div>
        <div className="dash-cats-grid">
          {lCats.map(cat => {
            const tools = lTools.filter(tl => tl.category === cat.id)
            return (
              <NavLink key={cat.id} to={cat.path} className="cat-card">
                <div className="cat-card-visual">
                  {CAT_ILLUSTRATIONS[cat.id]}
                </div>
                <div className="cat-card-content">
                  <div className="cat-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {cat.icon}
                    </svg>
                  </div>
                  <h3 className="cat-card-title">{cat.label}</h3>
                  <p className="cat-card-desc">{cat.description}</p>
                  <span className="cat-card-count">{t('dash.toolCount', { count: tools.length })}</span>
                </div>
              </NavLink>
            )
          })}
        </div>
      </section>
    </div>
  )
}
