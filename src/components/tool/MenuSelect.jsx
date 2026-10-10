import { Children, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import usePopover from '../../hooks/usePopover'
import { flattenOptions, listboxKeyAction, listboxSelection, listboxTarget, selectedOptionIndex, typeaheadTarget } from '../../utils/listboxKeys'
import ToolIcon from './ToolIcon'

// Accept option children as well as data so existing option expressions keep
// their labels, order and values. These elements never render native controls.
function childOptions(children) {
  return Children.toArray(children).flatMap(child => {
    if (child.type === 'optgroup') return [{ group: child.props.label, disabled: child.props.disabled, options: childOptions(child.props.children) }]
    if (child.type !== 'option') return []
    return [{ value: child.props.value, label: Children.toArray(child.props.children).join(''), disabled: child.props.disabled }]
  })
}

export default function MenuSelect({ label, value, options, children, onChange, ariaLabel, 'aria-label': ariaName, className = '', disabled, id, toolbar = false }) {
  const uid = useId()
  const triggerId = id || `select-${uid}`
  const listId = `${triggerId}-list`
  const groups = options || childOptions(children)
  const rows = flattenOptions(groups)
  const current = rows.find(option => String(option.value) === String(value))
  const name = ariaLabel || ariaName || label
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  if (disabled && open) setOpen(false)
  const buffer = useRef({ text: '', time: 0 })
  const { triggerRef, popRef } = usePopover(open, () => {
    triggerRef.current?.focus({ preventScroll: true })
    setOpen(false)
  }, { autoFocus: false })
  const close = () => {
    triggerRef.current?.focus({ preventScroll: true })
    setOpen(false)
  }
  const show = () => {
    if (disabled) return
    setActive(selectedOptionIndex(value, rows))
    buffer.current = { text: '', time: 0 }
    setOpen(true)
  }
  const choose = index => {
    if (!rows[index] || rows[index].disabled) return
    const next = listboxSelection(index, rows, value)
    close()
    if (next !== null) onChange?.(next)
  }
  useLayoutEffect(() => {
    if (!open) return
    // A portalled list must sit above the modal or sheet containing its trigger.
    let layer = 130
    for (let node = triggerRef.current; node; node = node.parentElement) {
      layer = Math.max(layer, (Number.parseInt(getComputedStyle(node).zIndex, 10) || 0) + 1)
    }
    popRef.current?.style.setProperty('--select-layer', String(layer))
    popRef.current?.focus({ preventScroll: true })
  }, [open, popRef, triggerRef])
  useEffect(() => {
    if (open && active >= 0) popRef.current?.querySelector(`[data-option-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, popRef])
  // Handle dismissal before enclosing popovers or modal focus traps see it.
  useEffect(() => {
    if (!open) return undefined
    const dismiss = event => {
      if (listboxKeyAction(event.key, true) !== 'close') return
      if (!popRef.current?.contains(event.target) && event.target !== triggerRef.current) return
      triggerRef.current?.focus({ preventScroll: true })
      setOpen(false)
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('keydown', dismiss, true)
    return () => window.removeEventListener('keydown', dismiss, true)
  }, [open, popRef, triggerRef])
  const onKey = event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const action = listboxKeyAction(event.key, true, disabled)
    if (action === 'select') {
      event.preventDefault()
      choose(active)
      return
    }
    const next = action === 'move' ? listboxTarget(event.key, active, rows) : -1
    if (next >= 0) {
      event.preventDefault()
      setActive(next)
      buffer.current = { text: '', time: 0 }
    } else if (action === 'typeahead') {
      event.preventDefault()
      const result = typeaheadTarget(event.key, active, rows, buffer.current)
      buffer.current = result
      setActive(result.index)
    }
  }
  let index = 0
  const renderRow = option => {
    const rowIndex = index++
    return <div key={String(option.value)} id={`${listId}-${rowIndex}`} role="option" aria-selected={String(option.value) === String(value)} aria-disabled={option.disabled || undefined}
      className={`pop-item menu-select-option${active === rowIndex ? ' is-active' : ''}`} data-option-index={rowIndex} data-value={String(option.value)}
      onPointerMove={() => { if (!option.disabled) setActive(rowIndex) }} onClick={() => choose(rowIndex)}>
      <span className="menu-select-text">{option.label}</span>
      {option.mark && <span className="menu-select-mark">{option.mark}</span>}
      <svg className="menu-select-check" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 12 4 4L19 6" /></svg>
    </div>
  }
  return <>
    <button ref={triggerRef} id={triggerId} type="button" className={`menu-select-trigger${toolbar ? ' tl-select' : ''} ${className}`} disabled={disabled}
      value={value} aria-label={name ? `${name}: ${current?.label ?? value}` : undefined} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
      onClick={() => open ? close() : show()} onKeyDown={event => {
        if (listboxKeyAction(event.key, false, disabled) === 'open') { event.preventDefault(); if (!open) show() }
      }}>
      {toolbar && <span className="tl-select-k">{label}</span>}
      <span className={toolbar ? 'tl-select-v' : 'menu-select-text'}>{current?.label ?? value}</span>
      <ToolIcon name="caret-up-down" size={13} className={toolbar ? 'tl-select-caret' : 'menu-select-caret'} />
    </button>
    {open && !disabled && createPortal(<div ref={popRef} id={listId} role="listbox" tabIndex={-1} aria-label={name} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      className="pop menu-select-list" data-pop-fixed="true" data-pop-trigger={triggerId} onKeyDown={onKey}>
      {groups.map((option, groupIndex) => option.options ? <div key={groupIndex} role="group" aria-label={option.group}>
        <div className="pop-head" aria-hidden="true">{option.group}</div>
        {flattenOptions([option]).map(renderRow)}
      </div> : renderRow(typeof option === 'string' ? { value: option, label: option } : option))}
    </div>, document.body)}
  </>
}
