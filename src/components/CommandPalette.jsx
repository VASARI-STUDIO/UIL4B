import { useState, useEffect, useId, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategory, localiseTools, localiseCategories, queryCommandIndex } from '../data/tools'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_EMAILS } from '../utils/constants'
import useModalDialog from '../hooks/useModalDialog'

// The command bar. V2 gives it a front door in the nav, which makes its
// keyboard contract load-bearing rather than a power-user extra.
//
// It was an unlabelled <div> overlay: no dialog role, no focus trap, no focus
// restore, and an arrow-key highlight that existed only as a CSS class — a
// screen-reader user arrowing through results heard nothing change. It is now a
// real modal dialog wrapping a real combobox, so the highlighted row is
// announced through aria-activedescendant as it moves.
export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const uid = useId()
  const dialogRef = useModalDialog(onClose, { enabled: !!open, initialFocus: '.cp-input' })
  const { recent } = useWorkspace()
  const { user } = useAuth()
  const { t } = useI18n()

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  // Hide alpha / not-yet-public tools from search for everyone but admins.
  const lTools = useMemo(() => localiseTools(t).filter(tl => isAdmin || !tl.alpha), [t, isAdmin])
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

    // One shared query implementation — see queryCommandIndex in data/tools.
    // The homepage command bar calls the same function over the same index.
    const hit = queryCommandIndex(q, { tools: lTools, categories: lCats, actions: quickActions })
    const tools = hit.tools.map(tl => ({ kind: 'tool', ...tl }))
    const cats = hit.categories.map(c => ({ kind: 'category', id: c.id, label: c.label, path: c.path, description: c.description }))
    const actions = hit.actions.map(a => ({ kind: 'action', ...a }))

    const out = []
    if (tools.length) out.push({ label: t('common.tools'), items: tools })
    if (cats.length) out.push({ label: t('cmd.categories'), items: cats })
    if (actions.length) out.push({ label: t('cmd.actions'), items: actions })
    return out
  }, [query, recentTools, lTools, lCats, quickActions, t])

  const flat = useMemo(() => sections.flatMap(s => s.items), [sections])

  // Reset the query per opening. Focus and the body-scroll lock are
  // useModalDialog's job now, so this no longer competes with it for either.
  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlight(0)
    }
  }, [open])

  const safeHighlight = Math.min(highlight, Math.max(flat.length - 1, 0))
  const activeId = flat.length ? `${uid}-opt-${safeHighlight}` : undefined

  if (!open) return null

  const select = (item) => {
    if (!item) return
    onClose()
    navigate(item.path)
  }

  // Escape belongs to useModalDialog, which listens in the capture phase and
  // also restores focus to whatever opened the palette. Handling it here too
  // would close it twice and skip the restore.
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(Math.min(safeHighlight + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(Math.max(safeHighlight - 1, 0)) }
    else if (e.key === 'Home') { e.preventDefault(); setHighlight(0) }
    else if (e.key === 'End') { e.preventDefault(); setHighlight(Math.max(flat.length - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); select(flat[safeHighlight]) }
  }

  let runningIdx = 0

  return (
    <div className="cp-overlay" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="cp-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('cmd.placeholder') || 'Search UIL4B'}
        tabIndex={-1}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="cp-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="cp-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${uid}-list`}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck="false"
            aria-label={t('cmd.placeholder') || 'Search UIL4B'}
            placeholder={t('cmd.placeholder')}
            value={query}
            onChange={e => { setQuery(e.target.value); setHighlight(0) }}
            onKeyDown={onKey}
          />
          <span className="cp-kbd" aria-hidden="true">esc</span>
        </div>

        <div className="cp-results" ref={listRef} id={`${uid}-list`} role="listbox" aria-label={t('common.tools') || 'Results'}>
          {flat.length === 0 && (
            <div className="cp-empty" role="status">{t('cmd.noResults', { query })}</div>
          )}
          {sections.map(section => (
            <div key={section.label} role="group" aria-label={section.label}>
              <div className="cp-section-label" aria-hidden="true">{section.label}</div>
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
                    id={`${uid}-opt-${idx}`}
                    // role="option" inside the listbox is what lets
                    // aria-activedescendant announce this row as the arrow keys
                    // move over it. It stays a real <button> so a mouse user
                    // gets a real click target, not a div with a handler.
                    role="option"
                    aria-selected={idx === safeHighlight}
                    tabIndex={-1}
                    className={`cp-item${idx === safeHighlight ? ' active' : ''}`}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => select(item)}
                  >
                    <div className="cp-item-icon" aria-hidden="true">
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
