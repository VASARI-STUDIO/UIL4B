import { useRef } from 'react'

// A row of mutually exclusive choices that all show at once: a radiogroup, one
// Tab stop, arrow keys move AND select (the same keys as the mode tabs).
// Disabled options keep aria-disabled rather than `disabled`, so they stay
// discoverable and the note under the control can say why they are off.
//
// options: [{ id, label, name?, glyph? }]. `name` is the accessible name when
// the visible label is a symbol ("¼×"). `className` adds a modifier on the tray.
export default function Segmented({
  id, label, options, value, onChange, disabled = false, isOptionDisabled, className = '',
}) {
  const refs = useRef({})
  const off = (o) => disabled || !!(isOptionDisabled && isOptionDisabled(o))
  const enabled = options.filter((o) => !off(o))

  const onKey = (e, i) => {
    if (!enabled.length) return
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
      for (let k = 1; k <= options.length; k++) {
        const cand = options[(i + step * k + options.length * k) % options.length]
        if (!off(cand)) { next = cand; break }
      }
    } else if (e.key === 'Home') next = enabled[0]
    else if (e.key === 'End') next = enabled[enabled.length - 1]
    if (!next) return
    e.preventDefault()
    onChange(next.id)
    refs.current[next.id]?.focus()
  }

  // The tab stop sits on the selected option, or the first usable one when the
  // selection is disabled or absent.
  const stop = options.find((o) => o.id === value && !off(o)) || enabled[0]

  return (
    <div className="fc-seg-wrap">
      <span className="fc-eyebrow" id={`${id}-label`}>{label}</span>
      <div className={`fc-seg ${className}`.trim()} role="radiogroup" aria-labelledby={`${id}-label`}>
        {options.map((o, i) => {
          const selected = o.id === value
          const isOff = off(o)
          return (
            <button
              key={String(o.id)}
              ref={(el) => { refs.current[o.id] = el }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={isOff || undefined}
              aria-label={o.name}
              tabIndex={stop && stop.id === o.id ? 0 : -1}
              className="fc-seg-opt"
              onClick={() => { if (!isOff && !selected) onChange(o.id) }}
              onKeyDown={(e) => onKey(e, i)}
            >
              {o.glyph}
              <span>{o.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
