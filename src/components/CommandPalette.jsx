import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TOOLS, CATEGORIES, getCategory, localiseTools, localiseCategories } from '../data/tools'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useI18n } from '../contexts/I18nContext'

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const { recent } = useWorkspace()
  const { t } = useI18n()

  const lTools = useMemo(() => localiseTools(t), [t])
  const lCats = useMemo(() => localiseCategories(t), [t])

  const quickActions = useMemo(() => [
    { id: 'go-dashboard', label: t('cmd.goToDashboard'), path: '/', keywords: ['home', 'dashboard'] },
    { id: 'go-settings', label: t('cmd.openSettings'), path: '/settings', keywords: ['settings', 'preferences'] },
    { id: 'go-feedback', label: t('cmd.sendFeedback'), path: '/feedback', keywords: ['support', 'feedback', 'help'] },
  ], [t])

  const recentTools = useMemo(() => {
    return recent
      .map(id => lTools.find(tl => tl.id === id))
      .filter(Boolean)
      .slice(0, 4)
  }, [recent, lTools])

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      const out = []
      if (recentTools.length) out.push({ label: t('cmd.recent'), items: recentTools.map(tl => ({ kind: 'tool', ...tl })) })
      out.push({ label: t('cmd.allTools'), items: lTools.map(tl => ({ kind: 'tool', ...tl })) })
      out.push({ label: t('cmd.categories'), items: lCats.map(c => ({ kind: 'category', id: c.id, label: c.label, path: c.path, description: c.description })) })
      out.push({ label: t('cmd.actions'), items: quickActions.map(a => ({ kind: 'action', ...a })) })
      return out
    }

    const tools = lTools.filter(tl =>
      tl.label.toLowerCase().includes(q) ||
      tl.description.toLowerCase().includes(q) ||
      tl.keywords.some(k => k.includes(q))
    ).map(tl => ({ kind: 'tool', ...tl }))

    const cats = lCats.filter(c =>
      c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    ).map(c => ({ kind: 'category', id: c.id, label: c.label, path: c.path, description: c.description }))

    const actions = quickActions.filter(a =>
      a.label.toLowerCase().includes(q) || a.keywords.some(k => k.includes(q))
    ).map(a => ({ kind: 'action', ...a }))

    const out = []
    if (tools.length) out.push({ label: t('common.tools'), items: tools })
    if (cats.length) out.push({ label: t('cmd.categories'), items: cats })
    if (actions.length) out.push({ label: t('cmd.actions'), items: actions })
    return out
  }, [query, recentTools, lTools, lCats, quickActions, t])

  const flat = useMemo(() => sections.flatMap(s => s.items), [sections])

  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlight(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const safeHighlight = Math.min(highlight, Math.max(flat.length - 1, 0))

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  const select = (item) => {
    if (!item) return
    onClose()
    navigate(item.path)
  }

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(Math.min(safeHighlight + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(Math.max(safeHighlight - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); select(flat[safeHighlight]) }
  }

  let runningIdx = 0

  return (
    <div className="cp-overlay" onMouseDown={onClose}>
      <div className="cp-panel" onMouseDown={e => e.stopPropagation()}>
        <div className="cp-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="cp-input"
            placeholder={t('cmd.placeholder')}
            value={query}
            onChange={e => { setQuery(e.target.value); setHighlight(0) }}
            onKeyDown={onKey}
          />
          <span className="cp-kbd">esc</span>
        </div>

        <div className="cp-results" ref={listRef}>
          {flat.length === 0 && (
            <div className="cp-empty">{t('cmd.noResults', { query })}</div>
          )}
          {sections.map(section => (
            <div key={section.label}>
              <div className="cp-section-label">{section.label}</div>
              {section.items.map(item => {
                const idx = runningIdx++
                const cat = item.kind === 'tool' ? getCategory(item.category) : null
                const catLabel = item.kind === 'tool' && cat ? t(cat.labelKey) || cat.label : null
                const icon = item.kind === 'category' ? getCategory(item.id)?.icon : (cat?.icon || (
                  <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></>
                ))
                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type="button"
                    className={`cp-item${idx === safeHighlight ? ' active' : ''}`}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => select(item)}
                  >
                    <div className="cp-item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        {icon}
                      </svg>
                    </div>
                    <div className="cp-item-body">
                      <span className="cp-item-label">{item.label}</span>
                      {item.description && <span className="cp-item-desc">{item.description}</span>}
                    </div>
                    <span className="cp-item-cat">
                      {item.kind === 'tool' ? catLabel : item.kind === 'category' ? t('common.category') : t('common.action')}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="cp-footer">
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)' }}>
            {t('brand.fullToolkit')}
          </span>
          <div className="cp-footer-keys">
            <span><span className="cp-kbd">↑↓</span> {t('common.navigate')}</span>
            <span><span className="cp-kbd">↵</span> {t('common.open')}</span>
            <span><span className="cp-kbd">esc</span> {t('common.close')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
