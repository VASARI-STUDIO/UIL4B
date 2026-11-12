import { useState, useEffect, useId, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategory, localiseTools, localiseCategories } from '../data/tools'
import { categoryPillFor, offerableCategories, queryCommandIndex, searchHints } from '../data/toolIndex'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useI18n } from '../contexts/I18nContext'
import { useIsAdmin } from '../hooks/useIsAdmin'
import useModalDialog from '../hooks/useModalDialog'
import { useCloseOnBack, useInertBehind } from '../hooks/useCloseOnBack'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/overlay.css'
import '../styles/deferred/v3-palette.css'

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
  // On a phone, Back closes the palette instead of leaving the
  // page, and the page behind it is inert while it is open.
  useCloseOnBack(!!open, onClose)
  useInertBehind(!!open)
  // A10: on a phone the keyboard shrinks the VISUAL viewport, which dvh does
  // not follow. The panel's max-height reads --vvh, the visual viewport's own
  // height, so the results list ends above the keyboard instead of under it.
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!open || !vv) return undefined
    const root = document.documentElement
    const sync = () => root.style.setProperty('--vvh', `${Math.round(vv.height)}px`)
    sync()
    vv.addEventListener('resize', sync)
    return () => { vv.removeEventListener('resize', sync); root.style.removeProperty('--vvh') }
  }, [open])
  const { recent } = useWorkspace()
  const { t } = useI18n()

  const { isAdmin } = useIsAdmin()
  // Hide tools still in the workshop from search for everyone but admins.
  // `soon` is toolTree.js's own flag, reaching here through the derived index
  // — the same one the mega-menu dims and CreateTool.jsx renders the 🤫
  // state for. It replaced a hand-set `alpha` that disagreed with all three.
  const lTools = useMemo(() => localiseTools(t).filter(tl => isAdmin || !tl.soon), [t, isAdmin])
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
      out.push({ label: t('cmd.allTools'), fallback: true, items: lTools.map(tl => ({ kind: 'tool', ...tl })) })
      const cats = offerableCategories(lCats).map(c => ({ kind: 'category', id: c.id, label: c.label, path: c.path, description: c.description }))
      if (cats.length) out.push({ label: t('cmd.categories'), items: cats })
      out.push({ label: t('cmd.actions'), items: quickActions.map(a => ({ kind: 'action', ...a })) })
      return out
    }

    // One shared query implementation — see queryCommandIndex in data/tools.
    // The homepage command bar calls the same function over the same index.
    const hit = queryCommandIndex(q, { tools: lTools, categories: lCats, actions: quickActions })
    const tools = hit.tools.filter(tl => !tl.guide).map(tl => ({ kind: 'tool', ...tl }))
    const guides = hit.tools.filter(tl => tl.guide).map(tl => ({ kind: 'tool', ...tl }))
    const cats = hit.categories.map(c => ({ kind: 'category', id: c.id, label: c.label, path: c.path, description: c.description }))
    const actions = hit.actions.map(a => ({ kind: 'action', ...a }))

    const out = []
    if (tools.length) out.push({ label: t('common.tools'), items: tools })
    if (guides.length) out.push({ label: 'Guides', items: guides })
    if (cats.length) out.push({ label: t('cmd.categories'), items: cats })
    if (actions.length) out.push({ label: t('cmd.actions'), items: actions })
    // A search that finds nothing still shows where to go next: every tool.
    if (!out.length) out.push({ label: t('cmd.allTools'), fallback: true, items: lTools.map(tl => ({ kind: 'tool', ...tl })) })
    return out
  }, [query, recentTools, lTools, lCats, quickActions, t])

  const flat = useMemo(() => sections.flatMap(s => s.items), [sections])
  // The same terms the nav search used to type into its field, from the one
  // registry list, shown as the Try row while the query is empty.
  const hints = useMemo(() => searchHints(lTools).slice(0, 4), [lTools])
  const noMatch = query.trim() !== '' && sections.some(s => s.fallback)
  // After a search that finds nothing the list below is only a fallback, so no
  // row is armed until the person arrows or hovers: Enter must not jump to
  // whichever tool happens to be first.
  const [moved, setMoved] = useState(false)
  const armed = !noMatch || moved

  // Reset the query per opening. Focus and the body-scroll lock are
  // useModalDialog's job now, so this no longer competes with it for either.
  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlight(0)
      setMoved(false)
    }
  }, [open])

  const safeHighlight = Math.min(highlight, Math.max(flat.length - 1, 0))
  const activeId = flat.length && armed ? `${uid}-opt-${safeHighlight}` : undefined

  const setTerm = (value) => {
    setQuery(value)
    setHighlight(0)
    setMoved(false)
    inputRef.current?.focus()
  }

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
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(armed ? Math.min(safeHighlight + 1, flat.length - 1) : 0); setMoved(true) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(armed ? Math.max(safeHighlight - 1, 0) : 0); setMoved(true) }
    else if (e.key === 'Home') { e.preventDefault(); setHighlight(0); setMoved(true) }
    else if (e.key === 'End') { e.preventDefault(); setHighlight(Math.max(flat.length - 1, 0)); setMoved(true) }
    else if (e.key === 'Enter') { e.preventDefault(); if (armed) select(flat[safeHighlight]) }
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
            onChange={e => { setQuery(e.target.value); setHighlight(0); setMoved(false) }}
            onKeyDown={onKey}
          />
          {/* A real button, not a key hint: a phone has no Esc key. The "esc"
              text shows on a pointer-and-keyboard screen, an X on touch; the
              name is the same either way. */}
          <button type="button" className="cp-kbd" aria-label={t('common.close')} onClick={onClose}>
            <span className="cp-kbd-key" aria-hidden="true">esc</span>
            <svg className="cp-kbd-x" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="cp-results" ref={listRef} id={`${uid}-list`} role="listbox" aria-label={t('common.tools') || 'Results'}>
          {query.trim() === '' && hints.length > 0 && (
            <div className="cp-try" role="group" aria-label="Try">
              <span className="cp-try-label" aria-hidden="true">Try</span>
              {hints.map(h => (
                <button key={h} type="button" className="cp-try-btn" tabIndex={-1} onClick={() => setTerm(h)}>{h}</button>
              ))}
            </div>
          )}
          {noMatch && (
            <div className="cp-empty" role="status">
              <p>{t('cmd.noResults', { query })}</p>
              <button type="button" className="cp-clear" tabIndex={-1} onClick={() => setTerm('')}>Clear search</button>
            </div>
          )}
          {sections.map(section => (
            <div key={section.label} role="group" aria-label={section.label}>
              <div className="cp-section-label" aria-hidden="true">{section.label}</div>
              {section.items.map(item => {
                const idx = runningIdx++
                const cat = item.kind === 'tool' ? getCategory(item.category) : null
                // Same rule as the homepage bar - see categoryPillFor.
                const catLabel = item.kind === 'tool' ? categoryPillFor(item, cat, t) : null
                const icon = item.kind === 'category' ? getCategory(item.id)?.icon : ((item.guide && item.icon) || cat?.icon || (
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
                    aria-selected={armed && idx === safeHighlight}
                    tabIndex={-1}
                    className={`cp-item${armed && idx === safeHighlight ? ' active' : ''}`}
                    // Arms on real pointer movement, not on mouseenter: a list that
                    // re-renders under a resting cursor fires mouseenter without any
                    // movement. Sets state only when it would change.
                    onMouseMove={() => { if (!moved || highlight !== idx) { setHighlight(idx); setMoved(true) } }}
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
                    {(item.kind !== 'tool' || catLabel) && (
                      <span className="cp-item-cat">
                        {item.kind === 'tool' ? catLabel : item.kind === 'category' ? t('common.category') : t('common.action')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="cp-footer">
          <span className="cp-footer-brand">
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
