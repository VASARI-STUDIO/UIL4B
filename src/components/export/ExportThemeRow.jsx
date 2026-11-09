import { useEffect, useId, useRef, useState } from 'react'
import { PICKER_THEMES, pickerTheme, themeShots, themeThumb, shapeClass } from '../../config/exportThemePicker'

// The Theme step of the Export dialog: the chosen theme with its tier, a line naming the sample brand the pictures come from,
// and a Change button that opens a listbox of the ten themes. Highlighting a row previews it at once (onPreview); Enter or a
// click keeps it, and Escape or Tab returns to the chosen one. Free and Pro are plain words, not pills.
//
// The previews are pictures (public/export-themes), so no theme code is in the page.

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function ThemeStage({ kind, theme, locked, lockText }) {
  const shots = themeShots(kind, theme)
  const cls = kind === 'book' ? 'book' : shapeClass(theme.shape)
  return (
    <div className={`xd-theme-stage xd-theme-stage--${cls}${locked ? ' is-locked' : ''}`}>
      {shots.map((s) => <img key={s.src} src={s.src} alt={s.alt} decoding="async" />)}
      {locked && <span className="xd-theme-lock">{lockText}</span>}
    </div>
  )
}

export default function ExportThemeRow({ value, onChange, onPreview, isPro, checking, yourName }) {
  const uid = useId()
  const theme = pickerTheme(value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const button = useRef(null)
  const list = useRef(null)
  const tier = (t) => (isPro || checking ? '' : t.free ? 'Free' : 'Pro')

  const close = (keep) => {
    setOpen(false)
    if (!keep) onPreview?.(null)
    button.current?.focus()
  }
  const choose = (i) => { onChange(PICKER_THEMES[i].id); onPreview?.(null); setOpen(false); button.current?.focus() }
  const move = (i) => { setActive(i); onPreview?.(PICKER_THEMES[i].id) }

  useEffect(() => {
    if (!open) return undefined
    list.current?.focus()
    const away = (e) => { if (!list.current?.contains(e.target) && !button.current?.contains(e.target)) { setOpen(false); onPreview?.(null) } }
    document.addEventListener('pointerdown', away, true)
    return () => document.removeEventListener('pointerdown', away, true)
  }, [open, onPreview])

  const onKey = (e) => {
    const last = PICKER_THEMES.length - 1
    if (e.key === 'ArrowDown') { e.preventDefault(); move(Math.min(active + 1, last)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(Math.max(active - 1, 0)) }
    else if (e.key === 'Home') { e.preventDefault(); move(0) }
    else if (e.key === 'End') { e.preventDefault(); move(last) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false) }
    else if (e.key === 'Tab') { setOpen(false); onPreview?.(null) }
  }

  return (
    <div className="xd-theme">
      <div className="xd-theme-top">
        <p className="xd-theme-name">
          <span>{theme.name}</span>
          {tier(theme) && <span className="xd-theme-tier">{tier(theme)}</span>}
        </p>
        <button
          type="button"
          className="btn xd-theme-change"
          ref={button}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? `${uid}-list` : undefined}
          aria-label={`Change theme, current ${theme.name}`}
          onClick={() => { if (open) close(false); else { setActive(PICKER_THEMES.findIndex((t) => t.id === value)); setOpen(true) } }}
        >
          Change
        </button>
      </div>
      <p className="xd-theme-sample">Shown with {theme.brand}. Yours uses {yourName}.</p>
      {open && (
        <ul
          className="xd-theme-list"
          id={`${uid}-list`}
          role="listbox"
          aria-label="Theme"
          tabIndex={-1}
          ref={list}
          aria-activedescendant={`${uid}-o${active}`}
          onKeyDown={onKey}
        >
          {PICKER_THEMES.map((t, i) => (
            <li
              key={t.id}
              id={`${uid}-o${i}`}
              role="option"
              aria-selected={t.id === value}
              className={`xd-theme-opt${i === active ? ' is-active' : ''}`}
              onPointerEnter={() => move(i)}
              onClick={() => choose(i)}
            >
              <img className="xd-theme-thumb" src={themeThumb(t)} alt="" loading="lazy" decoding="async" />
              <span className="xd-theme-opt-t"><span className="xd-theme-opt-n">{t.name}</span><span className="xd-theme-opt-b">{t.brand}</span></span>
              <span className="xd-theme-opt-r">
                {t.id === value && <CheckIcon />}
                {tier(t) && <span>{tier(t)}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
