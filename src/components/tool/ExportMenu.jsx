import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import usePopover, { popoverArrowTarget } from '../../hooks/usePopover'
import useMediaQuery from '../../hooks/useMediaQuery'
import ToolIcon from './ToolIcon'

// The tool toolbar's "Copy or save" menu: one accent pill that opens a short
// list of ways to take the work away (copy it, keep it in a project, download
// it). It is not called Export because the app header's own Export button
// already means "the whole design system"; this one takes only this tool's output.
//
//   items   [{ id, label, icon, hint, disabled, onSelect }] in menu order.
//           Choosing a row closes the menu, returns focus to the button, then
//           calls onSelect. Anything that needs an account asks for it inside
//           onSelect (useExportGate / requireLogin), so a row is never inert.
//           `hint` is the small mono text at the row's end ("Free account").
//           A disabled row stays focusable (aria-disabled) so a keyboard or
//           screen reader user still finds it; choosing it does nothing.
//   label   the button's text and the menu's accessible name.
//   icon    the button's leading icon; a trailing caret is always drawn.
//
// Placement, dismissal and focus return are usePopover's. From 768px the list
// is a popover under the button; below it the same rows sit in the toolbar
// overflow's bottom sheet (tool-layout.css: .tl-sheet-layer).
//
// Keyboard (the APG menu-button pattern): Enter and Space open it through the
// button's own click, ArrowDown opens onto the first row and ArrowUp onto the
// last, the arrows wrap, Home and End jump, Escape closes and refocuses the
// button, and Tab closes it and moves on.
const PHONE = '(max-width: 767px)'
const ROWS = '[role="menuitem"]'

export default function ExportMenu({ items, label = 'Copy or save', icon = 'copy' }) {
  const [open, setOpen] = useState(false)
  const phone = useMediaQuery(PHONE)
  const menuId = useId().replace(/:/g, '')
  const startAt = useRef('first')
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, popRef, closeToTrigger } = usePopover(open, close, { initialFocus: ROWS })

  const rows = () => Array.from(popRef.current?.querySelectorAll(ROWS) || [])

  // usePopover focuses the first row; ArrowUp asks for the last one instead.
  useEffect(() => {
    if (!open) return
    const wantsLast = startAt.current === 'last'
    startAt.current = 'first'
    if (wantsLast) requestAnimationFrame(() => rows().at(-1)?.focus())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onTriggerKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    if (open) {
      const list = rows()
      list[e.key === 'ArrowUp' ? list.length - 1 : 0]?.focus()
      return
    }
    startAt.current = e.key === 'ArrowUp' ? 'last' : 'first'
    setOpen(true)
  }

  const onMenuKey = (e) => {
    if (e.key === 'Tab') {
      // The sheet is portalled to <body>, so the browser's next stop would be
      // far from the button: hand focus back to it instead.
      if (phone) { e.preventDefault(); triggerRef.current?.focus() }
      setOpen(false)
      return
    }
    const list = rows()
    const next = popoverArrowTarget(e.key, list.indexOf(document.activeElement), list.length)
    if (next < 0) return
    e.preventDefault()
    list[next].focus()
  }

  const choose = (item) => {
    if (item.disabled) return
    closeToTrigger()
    item.onSelect?.()
  }

  const menu = (
    <div id={menuId} role="menu" aria-label={label} className="tl-menu-list tl-export-rows" onKeyDown={onMenuKey}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          tabIndex={-1}
          className="tl-menu-row"
          data-export-item={item.id}
          aria-disabled={item.disabled ? true : undefined}
          onClick={() => choose(item)}
        >
          {item.icon && <ToolIcon name={item.icon} size={16} />}
          <span className="tl-menu-row-label">{item.label}</span>
          {item.hint && <span className="tl-menu-row-hint">{item.hint}</span>}
        </button>
      ))}
    </div>
  )

  const panel = open && (phone
    ? createPortal(
      <div className="tl-sheet-layer">
        <div className="tl-sheet-scrim" aria-hidden="true" onClick={close} />
        <div ref={popRef} className="tl-sheet" role="dialog" aria-label={label} tabIndex={-1}>
          <span className="tl-sheet-grab" aria-hidden="true" />
          <div className="tl-sheet-head">
            <span className="tl-sheet-title">{label}</span>
            <button type="button" className="tl-sheet-x" onClick={closeToTrigger} aria-label="Close">
              <ToolIcon name="x" size={16} />
            </button>
          </div>
          {menu}
        </div>
      </div>,
      document.body,
    )
    : <div ref={popRef} className="tl-pop tl-export-pop">{menu}</div>)

  return (
    <div className="tl-export">
      <button
        ref={triggerRef}
        type="button"
        className="tl-btn tl-btn--accent tl-export-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => { startAt.current = 'first'; setOpen((v) => !v) }}
        onKeyDown={onTriggerKey}
      >
        <ToolIcon name={icon} size={14} className="tl-btn-ico" />
        <span className="tl-btn-label">{label}</span>
        <ToolIcon name="caret-down" size={12} className="tl-btn-ico tl-export-caret" />
      </button>
      {panel}
    </div>
  )
}
