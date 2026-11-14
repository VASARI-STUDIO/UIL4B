import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useMediaQuery from '../../hooks/useMediaQuery'
import { anchorOutOfView, bottomObstruction, topObstruction } from '../../hooks/usePopover'
import { menuKeyTarget, menuTypeahead, placeMenu, reachableRows } from './menuModel'

/*
 * The one menu. Every action menu, context menu and (later) select in the app
 * is this component in one skin (styles/v3-menus.css): a 300px popover on
 * desktop, a bottom action sheet under 768px. It is controlled, so keep it
 * mounted and flip `open`; that is what lets it play its short exit.
 *
 *   <Menu open={open} onClose={() => setOpen(false)} anchor={btnRef.current}
 *         label="Actions for Brand" items={[...]} />
 *
 * Props
 *   open, onClose      controlled state. onClose runs for every dismissal.
 *   anchor             the trigger element. The panel hangs off it (below, 8px
 *                      gap), and focus returns to it. Omit for a context menu.
 *   point              { x, y } viewport coordinates for a context menu.
 *   returnTo           element that gets focus back (default: anchor). A context
 *                      menu passes the element it was opened on.
 *   viaKeyboard        true when a key opened it: no animation, and the first row
 *                      (or the last, with startAt="last") takes focus at once.
 *   label              the menu's accessible name.
 *   head               { chips: [css colour], title, sub } names what the menu is about.
 *   items              rows, in order. A row is { id, label, icon, chip, value,
 *                      hint, detail, role, checked, disabled, reason, danger, pro,
 *                      onSelect, attrs }. Strings 'sep' / { type: 'section', label } /
 *                      { type: 'note', text } make a hairline, a section label, a note.
 *                      role is 'menuitem' (default), 'menuitemradio' (tick at the
 *                      end) or 'menuitemcheckbox' (box at the start; stays open).
 *                      disabled is aria-disabled: still focusable, `reason` shown.
 *   doneLabel          the phone sheet's closing block: 'Cancel' (default) or 'Done'.
 *   ignoreDownOn       an element whose own press must not count as outside.
 *   width, className, attrs   panel width in px, extra class, extra attributes.
 * Helpers (menuModel.js): menuOpenKey(event) for a trigger's onKeyDown,
 * keyboardPoint(el) for the Menu key / Shift+F10.
 *
 * Keys: Down/Up wrap, Home/End jump, a letter jumps to the next row starting with
 * it (500ms buffer, a repeated letter cycles). Enter or Space runs the row with
 * focus already back on the trigger. Escape closes and returns focus; Tab closes
 * and carries on from the trigger; an outside press or window blur closes and
 * leaves focus alone. Opening a menu from its trigger by key is the caller's:
 * use menuOpenKey() below on the trigger's onKeyDown.
 */

const LAYER_MIN = 1000
const PHONE = '(max-width: 767px)'

function layerEl(above) {
  let el = document.querySelector('[data-menu-layer]')
  if (!el) {
    el = document.createElement('div')
    el.setAttribute('data-menu-layer', '')
    el.className = 'v3m-layer'
    document.body.appendChild(el)
  }
  let z = LAYER_MIN
  for (let node = above; node; node = node.parentElement) z = Math.max(z, (Number.parseInt(getComputedStyle(node).zIndex, 10) || 0) + 1)
  el.style.zIndex = String(z)
  return el
}

const Tick = () => <svg className="v3m-tick" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
const Lock = () => <svg className="v3m-lk" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>

export default function Menu({
  open, onClose, items, anchor = null, point = null, returnTo = null, viaKeyboard = false, startAt = 'first',
  label, head = null, doneLabel = 'Cancel', ignoreDownOn = null, width, className = '', attrs = null,
}) {
  const uid = useId().replace(/:/g, '')
  const phone = useMediaQuery(PHONE)
  const panelRef = useRef(null)
  const [present, setPresent] = useState(open)
  const [leaving, setLeaving] = useState(false)
  if (open && (!present || leaving)) { setPresent(true); setLeaving(false) }
  if (!open && present && !leaving) setLeaving(true)
  useEffect(() => {
    if (!leaving) return undefined
    const timer = window.setTimeout(() => { setPresent(false); setLeaving(false) }, phone ? 150 : 120)
    return () => window.clearTimeout(timer)
  }, [leaving, phone])

  // Everything the listeners need, read through a ref so they bind once per open.
  const live = useRef({})
  useLayoutEffect(() => { live.current = { onClose, anchor, point, returnTo, items, phone, ignoreDownOn } })
  const buffer = useRef({ text: '', time: 0 })

  const rowEls = () => Array.from(panelRef.current?.querySelectorAll('[data-menu-row]') || [])
  const closeToTrigger = useCallback(() => {
    const { returnTo: back, anchor: from, onClose: done } = live.current
    const target = back || from
    if (target?.isConnected) target.focus({ preventScroll: true })
    done?.()
  }, [])

  // Place before paint, in viewport coordinates, clear of the fixed bars.
  const place = useCallback(() => {
    const el = panelRef.current
    const { anchor: from, point: at, phone: sheet } = live.current
    if (!el || sheet) return
    el.style.maxHeight = ''
    const box = from?.isConnected ? from.getBoundingClientRect() : null
    const spot = at || (box ? null : { x: 16, y: 16 })
    const out = placeMenu({
      anchor: box && !at ? box : null,
      point: spot,
      width: el.offsetWidth,
      height: el.offsetHeight,
      band: { vw: window.innerWidth, minTop: topObstruction() + 8, maxBottom: bottomObstruction() },
    })
    el.style.left = `${out.left}px`
    el.style.top = `${out.top}px`
    el.style.maxHeight = `${out.maxHeight}px`
    el.style.transformOrigin = `${out.originX}px ${out.originY}px`
    el.dataset.side = out.side
  }, [])
  useLayoutEffect(() => {
    if (!present) return
    layerEl(anchor || returnTo)
    place()
  }, [present, phone, items, anchor, point, returnTo, width, head, place])

  // Focus in on open: the keyboard lands on a row, a pointer on the panel itself
  // so no row looks pressed.
  useEffect(() => {
    if (!open || !present) return
    const rows = rowEls()
    const row = startAt === 'last' ? rows.at(-1) : rows[0]
    ;(viaKeyboard ? row : panelRef.current)?.focus({ preventScroll: true })
    buffer.current = { text: '', time: 0 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, present])

  useEffect(() => {
    if (!open || !present) return undefined
    const inside = (node) => node?.closest?.('.v3m, .v3m-sheet') || live.current.ignoreDownOn?.contains?.(node)
    const onDown = (e) => { if (!inside(e.target) && !live.current.anchor?.contains?.(e.target)) live.current.onClose?.() }
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const here = inside(e.target) || e.target === live.current.anchor
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeToTrigger(); return }
      if (e.key === 'Tab') {
        // Hand focus back to the trigger and let this Tab carry on from there.
        const target = live.current.returnTo || live.current.anchor
        if (target?.isConnected) target.focus({ preventScroll: true })
        live.current.onClose?.()
        return
      }
      if (!here) return
      const rows = rowEls()
      const at = rows.indexOf(document.activeElement)
      const next = menuKeyTarget(e.key, at, rows.length)
      if (next >= 0) { e.preventDefault(); rows[next].focus({ preventScroll: true }); buffer.current = { text: '', time: 0 }; return }
      if (e.key.length === 1 && e.key !== ' ' && /\S/.test(e.key)) {
        e.preventDefault()
        const model = reachableRows(live.current.items)
        const hit = menuTypeahead(e.key, at, model, buffer.current, Date.now())
        buffer.current = hit
        rows[hit.index]?.focus({ preventScroll: true })
      }
    }
    // A pointer-placed menu would float away from its target, so scrolling
    // closes it. A menu hung off a control follows it, and closes once the
    // control has left the visible band.
    const follow = (e) => {
      if (e?.target instanceof Node && panelRef.current?.contains(e.target)) return
      const { anchor: from, point: at, phone: sheet } = live.current
      if (sheet) return
      if (at || !from?.isConnected || anchorOutOfView(from)) { live.current.onClose?.(); return }
      place()
    }
    const onBlur = () => live.current.onClose?.()
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', follow)
    window.addEventListener('scroll', follow, { capture: true, passive: true })
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', follow)
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('blur', onBlur)
    }
  }, [open, present, closeToTrigger, place])

  if (!present || typeof document === 'undefined') return null

  const run = (item) => (event) => {
    if (item.disabled) { event.preventDefault(); return }
    // A checkbox row toggles and the menu stays open.
    if (item.role === 'menuitemcheckbox') { item.onSelect?.(); return }
    // Focus is back on the trigger before the action runs, so a keyboard user is
    // never stranded on a row that just unmounted.
    closeToTrigger()
    item.onSelect?.()
  }

  const headId = `${uid}-head`
  const noteEntry = items.find((entry) => entry?.type === 'note')
  const noteId = noteEntry ? `${uid}-note` : undefined
  const body = items.map((entry, i) => {
    if (entry === 'sep' || entry?.type === 'sep') return <div key={`sep${i}`} className="v3m-ln" role="separator" />
    if (entry?.type === 'section') return <div key={`sec${i}`} className="v3m-sec" role="presentation">{entry.label}</div>
    if (entry?.type === 'note') return <div key={`note${i}`} id={noteId} className="v3m-note">{entry.text}</div>
    const role = entry.role || 'menuitem'
    const reasonId = entry.disabled && entry.reason ? `${uid}-${entry.id}-why` : undefined
    const hintId = entry.hint ? `${uid}-${entry.id}-hint` : undefined
    return (
      <button
        key={entry.id}
        type="button"
        role={role}
        tabIndex={-1}
        data-menu-row=""
        className={`v3m-i${entry.detail || (entry.disabled && entry.reason) ? ' v3m-i--two' : ''}${entry.danger ? ' v3m-i--danger' : ''}${entry.compact ? ' v3m-i--compact' : ''}`}
        aria-checked={role === 'menuitem' ? undefined : !!entry.checked}
        aria-disabled={entry.disabled ? true : undefined}
        aria-label={entry.ariaLabel}
        aria-describedby={reasonId || hintId}
        {...(entry.attrs || {})}
        onClick={run(entry)}
      >
        {role === 'menuitemcheckbox' && <span className={`v3m-box${entry.checked ? ' on' : ''}`} aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg></span>}
        {entry.chip && <span className="v3m-sw" style={{ background: entry.chip }} aria-hidden="true" />}
        {entry.icon && <span className="v3m-ic" aria-hidden="true">{entry.icon}</span>}
        <span className="v3m-tx">
          <span className="v3m-l">{entry.label}</span>
          {entry.disabled && entry.reason
            ? <span id={reasonId} className="v3m-l2">{entry.reason}</span>
            : entry.detail && <span className="v3m-l2">{entry.detail}</span>}
        </span>
        {(entry.value || entry.hint || entry.pro || (role === 'menuitemradio' && entry.checked)) && (
          <span className="v3m-tr">
            {entry.hint && <span id={hintId} className="v3m-hint" aria-hidden="true">{entry.hint}</span>}
            {entry.value && <span className={`v3m-val${entry.valueBlur ? ' bl' : ''}`} aria-hidden={entry.valueBlur ? true : undefined}>{entry.value}</span>}
            {entry.pro && <Lock />}
            {role === 'menuitemradio' && entry.checked && <Tick />}
          </span>
        )}
      </button>
    )
  })

  const chips = head?.chips || []
  const headRow = head && (
    <div className="v3m-h" role="presentation">
      {chips.length > 0 && <span className="v3m-hc" aria-hidden="true">{chips.map((c, i) => <span key={i} className="v3m-chip" style={{ background: c }} />)}</span>}
      <span className="v3m-ht">
        <span id={headId} className="v3m-t">{head.title}</span>
        {head.sub && <span className="v3m-s">{head.sub}</span>}
      </span>
    </div>
  )

  const panel = (
    <div
      ref={panelRef}
      className={`v3m${phone ? ' v3m--sheet' : ''}${leaving ? ' out' : ''}${viaKeyboard ? ' kb' : ''}${className ? ` ${className}` : ''}`}
      role="menu"
      tabIndex={-1}
      aria-label={label}
      aria-labelledby={label ? undefined : head ? headId : undefined}
      aria-describedby={noteId}
      style={!phone && width ? { width } : undefined}
      onContextMenu={(e) => e.preventDefault()}
      {...(attrs || {})}
    >
      {headRow}
      {body}
    </div>
  )

  const node = phone ? (
    <div className={`v3m-sheetwrap${leaving ? ' out' : ''}`}>
      <div className="v3m-scrim" aria-hidden="true" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClose?.() }} />
      <div className="v3m-sheet">
        {panel}
        <button type="button" className="v3m-cancel" onClick={() => closeToTrigger()}>{doneLabel}</button>
      </div>
    </div>
  ) : panel

  return createPortal(node, layerEl(anchor || returnTo))
}
