import { Children, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import usePopover, { placePopover } from '../../hooks/usePopover'
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

// An option may also carry `icon` (a node drawn before the label), `triggerIcon`
// (the smaller node the toolbar trigger shows), `short` (the trigger's text) and
// `divider` (a hairline above the row) and `note` (a quiet word after the name in
// the list row only; the trigger leaves it out). Any `icon` turns the whole list into the
// two-line "rich" form; `footnote` is a note under the rows. A list that passes
// none of these renders as it always has.
export default function MenuSelect({ label, value, options, children, onChange, ariaLabel, 'aria-label': ariaName, className = '', disabled, id, toolbar = false, footnote }) {
  const uid = useId()
  const triggerId = id || `select-${uid}`
  const listId = `${triggerId}-list`
  const footId = `${listId}-foot`
  const groups = options || childOptions(children)
  const rows = flattenOptions(groups)
  const current = rows.find(option => String(option.value) === String(value))
  const currentMark = current?.mark || groups.find(option => option.options && flattenOptions([option]).some(row => String(row.value) === String(value)))?.mark
  const currentLabel = `${current?.label ?? value}${currentMark ? `, ${currentMark}` : ''}`
  const rich = rows.some(option => option.icon)
  const name = ariaLabel || ariaName || label
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  if (disabled && open) setOpen(false)
  const buffer = useRef({ text: '', time: 0 })
  const scrimRef = useRef(null)
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
    let above = 0
    for (let node = triggerRef.current; node; node = node.parentElement) {
      const z = Number.parseInt(getComputedStyle(node).zIndex, 10) || 0
      above = Math.max(above, z)
      layer = Math.max(layer, z + 1)
    }
    popRef.current?.style.setProperty('--select-layer', String(layer))
    scrimRef.current?.style.setProperty('--select-layer', String(layer))
    // A list opened from inside a sheet or dialog that already covers the phone
    // tab bar must not leave room for it (see global.css).
    const tabs = document.querySelector('.pnav-tabs')
    const tabsZ = tabs ? Number.parseInt(getComputedStyle(tabs).zIndex, 10) || 0 : Infinity
    popRef.current?.toggleAttribute('data-in-sheet', above > tabsZ)
    popRef.current?.focus({ preventScroll: true })
  }, [open, popRef, triggerRef])
  useLayoutEffect(() => {
    if (!open) return undefined
    const size = () => {
      const panel = popRef.current
      if (!panel) return
      panel.style.removeProperty('--select-scroll-max-h')
      placePopover(triggerRef.current, panel)
      if (panel.scrollHeight <= panel.clientHeight) return
      // End the scrollport halfway through a row, including grouped lists.
      const limit = panel.offsetHeight
      const midpoints = Array.from(panel.querySelectorAll('[role="option"]'), row => row.offsetTop + row.offsetHeight / 2 + panel.clientTop)
      const height = midpoints.filter(midpoint => midpoint <= limit).at(-1)
      if (height) {
        panel.style.setProperty('--select-scroll-max-h', `${height}px`)
        placePopover(triggerRef.current, panel)
      }
    }
    size()
    window.addEventListener('resize', size)
    return () => window.removeEventListener('resize', size)
  }, [open, options, children, popRef, triggerRef])
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
  const renderRow = (option, groupMark = '') => {
    const rowIndex = index++
    // An option may carry a one-line `desc`: visible text under the label, which
    // the option points at with aria-describedby so a screen reader reads it as
    // the option's description after its name. The name is set to the label
    // alone, so the description is not also read as part of the name.
    const descId = option.desc ? `${listId}-${rowIndex}-desc` : undefined
    // The note is spoken after the name ("Auto, recommended"), then any mark.
    const spoken = [option.label, option.note && option.note.toLowerCase(), option.mark || groupMark].filter(Boolean)
    return <div key={String(option.value)} id={`${listId}-${rowIndex}`} role="option" aria-label={spoken.length > 1 || option.desc ? spoken.join(', ') : undefined} aria-describedby={descId} aria-selected={String(option.value) === String(value)} aria-disabled={option.disabled || undefined}
      className={`pop-item menu-select-option${option.desc ? ' menu-select-option--desc' : ''}${option.icon ? ' menu-select-option--rich' : ''}${option.divider ? ' menu-select-option--divider' : ''}${active === rowIndex ? ' is-active' : ''}`} data-option-index={rowIndex} data-value={String(option.value)}
      onPointerMove={() => { if (!option.disabled) setActive(rowIndex) }} onClick={() => choose(rowIndex)}>
      {option.icon && <span className="menu-select-icon" aria-hidden="true">{option.icon}</span>}
      {option.desc
        ? <span className="menu-select-body"><span className="menu-select-text">{option.label}{option.note && <span className="menu-select-note"> ({option.note})</span>}</span><span id={descId} className="menu-select-desc">{option.desc}</span></span>
        : <span className="menu-select-text">{option.label}{option.note && <span className="menu-select-note"> ({option.note})</span>}</span>}
      {option.mark && <span className="menu-select-mark">{option.mark}</span>}
      <svg className="menu-select-check" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 12 4 4L19 6" /></svg>
    </div>
  }
  return <>
    <button ref={triggerRef} id={triggerId} type="button" className={`menu-select-trigger${toolbar ? ' tl-select' : ''} ${className}`} disabled={disabled}
      value={value} aria-label={name ? `${name}: ${currentLabel}` : undefined} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
      onClick={() => open ? close() : show()} onKeyDown={event => {
        if (listboxKeyAction(event.key, false, disabled) === 'open') { event.preventDefault(); if (!open) show() }
      }}>
      {toolbar && <span className="tl-select-k">{label}</span>}
      {toolbar && current?.triggerIcon}
      <span className={toolbar ? 'tl-select-v' : 'menu-select-text'}>{toolbar && current?.short ? current.short : currentLabel}</span>
      <ToolIcon name="caret-up-down" size={13} className={toolbar ? 'tl-select-caret' : 'menu-select-caret'} />
    </button>
    {open && !disabled && createPortal(<>
      <div ref={scrimRef} className="menu-select-scrim" aria-hidden="true" data-pop-trigger={triggerId} data-pop-scrim={listId}
        onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); close() }} />
      <div ref={popRef} id={listId} role="listbox" tabIndex={-1} aria-label={name} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      aria-describedby={footnote ? footId : undefined}
      className={`pop menu-select-list${rich ? ' menu-select-list--rich' : ''}`} data-pop-fixed="true" data-pop-trigger={triggerId} onKeyDown={onKey}>
      {groups.map((option, groupIndex) => option.options ? <div key={groupIndex} role="group" aria-label={option.mark ? `${option.group}, ${option.mark}` : option.group}>
        <div className="pop-head" aria-hidden="true"><span>{option.group}</span>{option.mark && <span className="menu-select-mark">{option.mark}</span>}</div>
        {flattenOptions([option]).map(row => renderRow(row, option.mark))}
      </div> : renderRow(typeof option === 'string' ? { value: option, label: option } : option))}
      {footnote && <p id={footId} className="menu-select-foot" aria-hidden="true">{footnote}</p>}
    </div></>, document.body)}
  </>
}
