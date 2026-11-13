import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { pickerTheme, pickerThemesFor, preloadTheme, themeShots, shapeClass, themedFileIsPro } from '../../config/exportThemePicker'
import { preloadThemeStandins, themeStandinShots } from '../../utils/lockedStandin'

// The Theme step of the Export dialog: the chosen theme with its tier, a line naming the sample brand the pictures come from,
// and a Change button that opens a listbox of the themes that can draw the file (a guidelines-only theme is listed for the
// guidelines only). Highlighting a row previews it at once (onPreview); Enter or a click keeps it, and Escape or Tab returns to
// the chosen one. Free and Pro are plain words, not pills.
//
// Wide: the listbox is a popover over the dialog, 320px, its right edge on the Change button's. It opens below when it fits
// above the dock and above the button otherwise. Narrow (`sheet`): it is a sheet over the whole dialog with a title and a
// close, and choosing a row keeps it and closes the sheet (the preview is behind it, so there is nothing to peek at).
//
// The previews are pictures (public/export-themes), so no theme code is in the page. A theme's pictures are fetched when its
// row gets hover or focus, and the preview swaps once they are in, so a swap never shows a half-loaded page.
//
// A file the viewer cannot export in that theme is previewed from a tiny blurred stand-in (utils/lockedStandin), fetched and drawn
// in place of the real picture, so the real file never reaches the page or the network for that viewer.

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reducedMotion === 'true'
const LEAVE_MS = 120
const GAP = 8
const POP_W = 320
// Frames the list gets to take focus: a popover that has only just been placed can still read as hidden for its first frame.
const FOCUS_FRAMES = 10

// `standin` swaps the real pictures for their stand-ins; `locked` adds the Pro lock over them. They differ while the plan is still
// being read: the pictures are held back at once, and the lock waits until the account is known not to be Pro.
export function ThemeStage({ kind, theme, locked, standin = locked, lockText }) {
  const shots = standin ? themeStandinShots(kind, theme) : themeShots(kind, theme)
  const cls = kind === 'book' ? 'book' : shapeClass(theme.shape)
  return (
    <div className={`xd-theme-stage xd-theme-stage--${cls}${standin ? ' is-locked' : ''}`}>
      {shots.map((s) => <img key={s.src} src={s.src} data-pin-nopin="true" alt={s.alt} decoding="async" />)}
      {locked && <span className="xd-theme-lock">{lockText}</span>}
    </div>
  )
}

export default function ExportThemeRow({ value, onChange, onPreview, isPro, checking, yourName, kind = 'kit', file = 'kit', sheet = false }) {
  const uid = useId()
  const theme = pickerTheme(value)
  const themes = pickerThemesFor(file)
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [active, setActive] = useState(0)
  const [host, setHost] = useState(null)
  const [pos, setPos] = useState(null)
  const button = useRef(null)
  const list = useRef(null)
  const leaveTimer = useRef(0)
  const hot = useRef(-1)
  // Free or Pro for this file in this theme: the dock's own call, so a label never says Free for a file the dock locks.
  const tier = (t) => (isPro || checking ? '' : themedFileIsPro(file, t.id) ? 'Pro' : 'Free')
  const shown = open || leaving

  useEffect(() => () => clearTimeout(leaveTimer.current), [])

  const shut = (keepPreview) => {
    if (!keepPreview) onPreview?.(null)
    hot.current = -1
    setOpen(false)
    clearTimeout(leaveTimer.current)
    if (calm()) { setLeaving(false); return }
    setLeaving(true)
    leaveTimer.current = setTimeout(() => setLeaving(false), LEAVE_MS)
  }
  const close = (keep) => { shut(keep); button.current?.focus() }
  const choose = (i) => { onChange(themes[i].id); close(true); onPreview?.(null) }
  const move = (i) => {
    setActive(i)
    hot.current = i
    const id = themes[i].id
    // A file this account cannot export in that theme preloads its stand-ins, never the real pictures.
    const loading = kind !== 'kit' && !isPro && themedFileIsPro(file, id) ? preloadThemeStandins(kind, id) : preloadTheme(kind, id)
    // The preview follows the row once its pictures are in; a row left before then never swaps.
    if (!sheet) loading.then(() => { if (hot.current === i) onPreview?.(id) })
  }
  const start = () => {
    clearTimeout(leaveTimer.current)
    setLeaving(false)
    setHost(button.current?.closest('.xd-card') || null)
    const at = Math.max(0, themes.findIndex((t) => t.id === value))
    hot.current = at
    setActive(at)
    setOpen(true)
  }

  // Place the popover from the button's box, inside the dialog card, and keep it there as the column scrolls or the window moves.
  useLayoutEffect(() => {
    if (!shown || sheet || !host) { setPos(null); return undefined }
    const place = () => {
      const b = button.current?.getBoundingClientRect()
      const c = host.getBoundingClientRect()
      if (!b) return
      const head = host.querySelector('.xd-head')?.getBoundingClientRect().bottom ?? c.top
      const dock = host.querySelector('.xd-dock')?.getBoundingClientRect().top ?? c.bottom
      const want = list.current?.scrollHeight || 420
      const below = dock - b.bottom - GAP
      const above = b.top - head - GAP
      const up = below < want && above > below
      const height = Math.min(want, Math.max(160, up ? above : below))
      const width = Math.min(POP_W, c.width - 2 * GAP)
      setPos({
        width,
        height,
        left: Math.max(GAP, Math.min(b.right - c.left - width, c.width - width - GAP)),
        top: up ? b.top - c.top - GAP - height : b.bottom - c.top + GAP,
      })
    }
    place()
    window.addEventListener('resize', place)
    document.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); document.removeEventListener('scroll', place, true) }
  }, [shown, sheet, host])

  // The popover is placed hidden until its position is measured, and a hidden element cannot take focus; the sheet is shown at once.
  // Under reduced motion the global rule gives every property change a 0.01ms transition, so the flip from hidden to visible
  // still reads hidden for one frame after the render; focus is asked for again each frame until the list has it.
  const ready = open && (sheet || Boolean(pos))
  useEffect(() => {
    if (!ready) return undefined
    let frame = 0
    let left = FOCUS_FRAMES
    const take = () => {
      const box = list.current
      if (!box) return
      box.focus({ preventScroll: true })
      if (document.activeElement !== box && left-- > 0) frame = requestAnimationFrame(take)
    }
    take()
    return () => cancelAnimationFrame(frame)
  }, [ready])

  useEffect(() => {
    if (!open) return undefined
    const away = (e) => {
      if (list.current?.closest('.xd-theme-pop,.xd-theme-sheet')?.contains(e.target) || button.current?.contains(e.target)) return
      shut(false)
    }
    document.addEventListener('pointerdown', away, true)
    return () => document.removeEventListener('pointerdown', away, true)
    // shut() only reads refs and the latest onPreview; it is not a dependency of the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    // Scroll the list itself, never the page or the dialog behind it (scrollIntoView would move those too).
    const box = list.current
    const row = open ? document.getElementById(`${uid}-o${active}`) : null
    if (!box || !row) return
    if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop - 4
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight + 4
  }, [open, active, uid])

  const onKey = (e) => {
    const last = themes.length - 1
    if (e.key === 'ArrowDown') { e.preventDefault(); move(Math.min(active + 1, last)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(Math.max(active - 1, 0)) }
    else if (e.key === 'Home') { e.preventDefault(); move(0) }
    else if (e.key === 'End') { e.preventDefault(); move(last) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false) }
    else if (e.key === 'Tab') { shut(false) }
  }

  const options = (
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
      {themes.map((t, i) => (
        <li
          key={t.id}
          id={`${uid}-o${i}`}
          role="option"
          aria-selected={t.id === value}
          className={`xd-theme-opt${i === active ? ' is-active' : ''}`}
          onPointerEnter={() => move(i)}
          onClick={() => choose(i)}
        >
          <span className="xd-theme-opt-t"><span className="xd-theme-opt-n">{t.name}</span><span className="xd-theme-opt-b">{t.brand}</span></span>
          <span className="xd-theme-opt-r">
            {t.id === value && <CheckIcon />}
            {tier(t) && <span>{tier(t)}</span>}
          </span>
        </li>
      ))}
    </ul>
  )

  let layer = null
  if (shown) {
    const cls = leaving && !open ? ' is-leaving' : ''
    const inner = sheet ? (
      <div className={`xd-theme-sheet${cls}`} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false) } }}>
        <div className="xd-theme-sheet-head">
          <h3 className="xd-theme-sheet-t">Theme</h3>
          <button type="button" className="xd-x" aria-label="Close theme list" onClick={() => close(false)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {options}
      </div>
    ) : (
      <div
        className={`xd-theme-pop${cls}`}
        style={pos ? { top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.height } : { visibility: 'hidden', top: 0, left: 0 }}
      >
        {options}
      </div>
    )
    layer = host ? createPortal(inner, host) : inner
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
          onClick={() => { if (open) close(false); else start() }}
        >
          Change
        </button>
      </div>
      <p className="xd-theme-sample">Shown with {theme.brand}. Yours uses {yourName}.</p>
      {layer}
    </div>
  )
}
