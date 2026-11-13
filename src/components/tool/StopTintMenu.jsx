import { useMemo } from 'react'
import { tintRampForHex } from '../../utils/tintRamp'
import Menu from '../menu/Menu'

// The menu a gradient stop opens on right-click (or from its Tints button): the
// eleven tints of the stop's colour, one press to put a tint on the stop.
//
// Applying a tint is a Pro tool. A free account still sees the ramp, so the menu
// shows what the tool does, but every row is a locked row and pressing it hands
// off to `onGate` (the caller raises the Pro modal) instead of changing the stop.
// The ramp's hex values are the Pro value, so a locked row never carries one:
// the hex slot holds a blurred stand-in and the accessible name has no hex.
//
// It is the shared Menu (components/menu/Menu.jsx), mounted open: one tab stop,
// arrow keys between rows, Escape or a press outside closes it and focus goes
// back to the control that opened it. Placed at the pointer (x, y) or hung off
// the control that opened it (`anchor`).

// What a locked row shows in the hex slot: the width of a hex, no digits.
const LOCKED_HEX = '#••••••'

export default function StopTintMenu({
  color, stopNumber, x, y, isPro, focusFirst = false, returnTo, ignoreDownOn = null, anchor = null, onApply, onGate, onClose,
}) {
  const tints = useMemo(() => tintRampForHex(color, 11), [color])
  const items = useMemo(() => tints.map((t) => ({
    id: `tint-${t.label}`,
    label: t.label,
    chip: t.hex,
    compact: true,
    pro: !isPro,
    value: isPro ? t.hex.toUpperCase() : LOCKED_HEX,
    valueBlur: !isPro,
    ariaLabel: isPro ? `Apply tint ${t.label}, ${t.hex.toUpperCase()}` : `Tint ${t.label} (Pro)`,
    attrs: { 'data-tint': t.label },
    onSelect: () => { if (isPro) onApply(t.hex.toUpperCase(), t.label); else onGate() },
  })), [tints, isPro, onApply, onGate])

  return (
    <Menu
      open
      onClose={onClose}
      anchor={anchor}
      point={anchor ? null : { x, y }}
      returnTo={returnTo}
      ignoreDownOn={ignoreDownOn}
      viaKeyboard={focusFirst}
      label={`Tints of stop ${stopNumber}, ${color.toUpperCase()}`}
      head={{ chips: [color], title: isPro ? `Tints of ${color.toUpperCase()}` : 'Tints are a Pro tool' }}
      items={items}
      className="v3m--tints"
    />
  )
}
