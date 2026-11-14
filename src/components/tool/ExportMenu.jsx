import { useMemo, useState } from 'react'
import Menu from '../menu/Menu'
import { menuOpenKey } from '../menu/menuModel'
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
//           `hint` is the small text at the row's end ("Free account"). It is
//           kept out of the row's name (aria-hidden) and read as its description
//           (aria-describedby), so the name stays "Save to project", not
//           "Save to projectFree account".
//           A disabled row stays focusable (aria-disabled) so a keyboard or
//           screen reader user still finds it; choosing it does nothing.
//   label   the button's text and the menu's accessible name.
//   icon    the button's leading icon; a trailing caret is always drawn.
//   variant 'accent' (default, the toolbar's one primary) or 'quiet' (a hairline
//           action that sits beside a different primary).
//
// The list is the shared Menu (components/menu/Menu.jsx): a popover under the
// button from 768px, a bottom action sheet below it. Keys are Menu's: Enter and
// Space open it through the button's own click, ArrowDown opens onto the first
// row and ArrowUp onto the last, the arrows wrap, Home and End jump, a letter
// jumps, Escape closes and refocuses the button, and Tab closes it and moves on.
export default function ExportMenu({ items, label = 'Copy or save', icon = 'copy', variant = 'accent' }) {
  const [open, setOpen] = useState(false)
  const [trigger, setTrigger] = useState(null)
  const [how, setHow] = useState({ keyboard: false, at: 'first' })
  const close = () => setOpen(false)

  const rows = useMemo(() => items.map((item) => ({
    id: item.id,
    label: item.label,
    hint: item.hint,
    disabled: item.disabled,
    icon: item.icon ? <ToolIcon name={item.icon} size={16} /> : null,
    attrs: { 'data-export-item': item.id },
    onSelect: item.onSelect,
  })), [items])

  const onTriggerKey = (e) => {
    const at = menuOpenKey(e)
    if (!at) return
    e.preventDefault()
    if (open) return
    setHow({ keyboard: true, at })
    setOpen(true)
  }

  return (
    <div className="tl-export">
      <button
        ref={setTrigger}
        type="button"
        className={`tl-btn tl-btn--${variant} tl-export-btn`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { setHow({ keyboard: e.detail === 0, at: 'first' }); setOpen((v) => !v) }}
        onKeyDown={onTriggerKey}
      >
        <ToolIcon name={icon} size={14} className="tl-btn-ico" />
        <span className="tl-btn-label">{label}</span>
        <ToolIcon name="caret-down" size={12} className="tl-btn-ico tl-export-caret" />
      </button>
      <Menu open={open} onClose={close} anchor={trigger} label={label} items={rows} viaKeyboard={how.keyboard} startAt={how.at} className="tl-export-pop" />
    </div>
  )
}
