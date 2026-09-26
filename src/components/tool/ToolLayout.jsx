// THE TOOL PATTERN — the App design.
//
// A tool page has NO big page title. It is:
//   1. a sticky tool toolbar — back button, the tool's name as a 15px/560
//      label, the tool's own actions, and ONE primary on the right;
//   2. a body, usually a `1fr / 336px` grid: the work on the left and ONE card
//      of hairline-separated sections on the right (never a card
//      inside a card), collapsing to one column at 900px.
//
// THE TOOLBAR NEVER WRAPS, AT ANY WIDTH. ToolToolbar measures
// the row and moves the actions that do not fit into an overflow ("More", or
// whatever the tool calls it): a popover under the button from 768px, a bottom
// sheet below it. The back button (unless a tool makes it an item), the label
// and the primary always stay on the row. Actions leave lowest `priority`
// first, and among equals from the end of the row, so the row keeps its order.
//
// Accessibility contract:
//   · the toolbar label IS the page's h1 (visually 15px). `showTitle={false}`
//     keeps it in the document as `sr-only` for a tool whose drawn toolbar has
//     no label (the palette builder);
//   · the page's <main> belongs to CreateTool; ToolLayout never renders one;
//   · the side panel is an <aside> named by `label`;
//   · the overflow button carries aria-haspopup/expanded/controls; its panel
//     is a labelled dialog that takes focus, closes on Escape (focus returns
//     to the button), on a press outside, and on tabbing past either end.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import usePopover from '../../hooks/usePopover'
import { snapToTarget, stepFromKey } from '../../utils/sliderKeys'
import ToolIcon from './ToolIcon'
import '../../styles/pages/tool-layout.css'

const cx = (...parts) => parts.filter(Boolean).join(' ')
const PHONE = '(max-width: 767px)'

function useMedia(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  const [match, setMatch] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [query])
  return match
}

// ── ToolLayout ────────────────────────────────────────────────────────────
// props:
//   className  page root class; the page sheet scopes every rule under it
//   title, titleId, showTitle, back, items, primary, overflowLabel,
//   overflowIcon — passed straight to ToolToolbar (see below)
//   bleed      true → the body has no padding (a board that runs edge to edge)
//   children   the body
//   ...rest    spread onto the root (data-* instrumentation, etc.)
export function ToolLayout({
  className, title, titleId, showTitle = true, back, items, primary, overflowLabel, overflowIcon,
  bleed = false, children, ...rest
}) {
  return (
    <div className={cx('tl', className)} {...rest}>
      <ToolToolbar
        title={title} titleId={titleId} showTitle={showTitle} back={back}
        items={items} primary={primary} overflowLabel={overflowLabel} overflowIcon={overflowIcon}
      />
      <div className={bleed ? 'tl-body tl-body--bleed' : 'tl-body'}>{children}</div>
    </div>
  )
}

// ── ToolToolbar ───────────────────────────────────────────────────────────
// title        the tool's name — the h1 and the 15px label
// titleId      optional id for the h1
// showTitle    false → the h1 is sr-only
// back         { to, label } | false. Default /projects, "Back to workspace".
//              A tool that wants the back button to collapse on a phone passes
//              false and adds <ToolBack/> as an item instead.
// items        the tool's actions, in row order:
//   { id,                     stable key
//     render: () => node,     the inline form, as drawn
//     menu: {                 how it appears in the overflow; either
//       label, icon, hint,    …a standard row (icon, label, optional right
//       onSelect, disabled,     hint, pressed state), which closes the panel,
//       pressed },
//     menu: (close) => node,  …or any node (a select, a group of pills);
//                             `close()` shuts the panel and returns focus to
//                             its button — call it before opening a dialog
//     priority: 0,            higher stays on the row longer
//     align: 'end',           the first 'end' item starts the right-hand group
//     divider: true }         a 1x24 hairline; never listed in the overflow
//   menu: false               a readout, not an action: it simply leaves
//   inline: false             overflow only — never on the row (the palette's
//                             Explore / Preview / History / Reset)
// primary      node — the one primary action; always on the row
// overflowLabel 'More' by default (the palette says 'Tools')
export function ToolToolbar({
  title, titleId, showTitle = true, back, items = [], primary, overflowLabel = 'More', overflowIcon = 'dots-three', className,
}) {
  const backProps = back === false ? null : { to: '/projects', label: 'Back to workspace', ...(back || {}) }
  const rowRef = useRef(null)
  const widths = useRef(new Map())
  const [hidden, setHidden] = useState(() => new Set())
  const [measuring, setMeasuring] = useState(true)
  const [open, setOpen] = useState(false)
  const phone = useMedia(PHONE)
  const menuId = useId().replace(/:/g, '')
  const close = useCallback(() => setOpen(false), [setOpen])
  const { triggerRef, popRef, closeToTrigger } = usePopover(open, close, { arrowNav: true })

  const itemKey = items.map((it) => it.id).join('|')
  // A new set of items needs a fresh measurement. Derived rather than set from
  // an effect: an effect that set `measuring` back to true in the same commit
  // the measurement set it false batched to "true → true", React bailed out of
  // the re-render, and the row stayed stuck mid-measure (seen on /create/tint).
  const [measuredKey, setMeasuredKey] = useState(null)
  const needsMeasure = measuring || measuredKey !== itemKey

  // Measure the whole row (every item inline), then decide what leaves.
  // Runs before paint, so the all-inline pass is never seen.
  useLayoutEffect(() => {
    if (!needsMeasure) return
    const row = rowRef.current
    if (!row) return
    const cs = getComputedStyle(row)
    const gap = parseFloat(cs.columnGap) || 0
    const avail = row.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)
    const w = (el) => (el ? el.getBoundingClientRect().width : 0)
    const fixedEls = row.querySelectorAll(':scope > [data-tl-fixed]')
    let fixed = 0
    let fixedCount = 0
    fixedEls.forEach((el) => {
      if (el.classList.contains('sr-only')) return
      fixed += el.classList.contains('tl-title') ? el.scrollWidth : w(el)
      fixedCount += 1
    })
    const more = row.querySelector(':scope > [data-tl-more]')
    const moreW = w(more)
    // Overflow-only items keep the More button on the row whatever fits.
    const alwaysMore = items.some((it) => it.inline === false)
    const list = items.filter((it) => it.inline !== false).map((it, idx) => {
      const el = row.querySelector(`:scope > [data-tl-item="${CSS.escape(String(it.id))}"]`)
      const width = el ? w(el) : (widths.current.get(it.id) || 0)
      widths.current.set(it.id, width)
      return { id: it.id, idx, width, priority: it.priority || 0, divider: !!it.divider, menu: !!it.menu }
    })
    const total = (arr, extra) => {
      const n = arr.length + fixedCount + extra
      return fixed + arr.reduce((s, x) => s + x.width, 0) + Math.max(0, n - 1) * gap
    }
    const next = new Set()
    let inline = list.slice()
    const fits = alwaysMore ? total(inline, 1) + moreW <= avail + 0.5 : total(inline, 0) <= avail + 0.5
    if (!fits) {
      // Order of departure: lowest priority first, then the rightmost.
      const order = list.slice().sort((a, b) => (a.priority - b.priority) || (b.idx - a.idx))
      for (const it of order) {
        if (total(inline, 1) + moreW <= avail + 0.5) break
        next.add(it.id)
        inline = inline.filter((x) => x.id !== it.id)
      }
    }
    // A divider left with nothing on one side of it has nothing to divide.
    const visible = list.filter((x) => !next.has(x.id))
    visible.forEach((x, i) => {
      if (!x.divider) return
      const before = visible.slice(0, i).some((y) => !y.divider)
      const after = visible.slice(i + 1).some((y) => !y.divider)
      if (!before || !after) next.add(x.id)
    })
    setHidden(next)
    setMeasuring(false)
    setMeasuredKey(itemKey)
  }, [needsMeasure, itemKey, items])

  // Re-measure when the row's width changes (viewport, sidebar, zoom) and
  // when the set of items changes.
  useEffect(() => {
    const row = rowRef.current
    if (!row || typeof ResizeObserver === 'undefined') return undefined
    let lastW = row.clientWidth
    const ro = new ResizeObserver(() => {
      const nw = row.clientWidth
      if (Math.abs(nw - lastW) < 1) return
      lastW = nw
      setMeasuring(true)
    })
    ro.observe(row)
    return () => ro.disconnect()
  }, [])
  // Webfonts change label widths after first paint.
  useEffect(() => {
    let alive = true
    document.fonts?.ready?.then(() => { if (alive) setMeasuring(true) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const overflow = needsMeasure ? [] : items.filter((it) => (it.inline === false || hidden.has(it.id)) && !it.divider && it.menu !== false)
  const showMore = needsMeasure || overflow.length > 0
  // The menu cannot stay open once its button has left the row.
  if (!showMore && open) setOpen(false)

  const shown = items.filter((it) => it.inline !== false && (needsMeasure || !hidden.has(it.id)))
  const firstEnd = shown.find((it) => it.align === 'end')
  const endStarted = !!firstEnd
  const inlineItems = shown.map((it) => {
    const startEnd = it === firstEnd
    return (
      <div
        key={it.id}
        data-tl-item={it.id}
        className={cx('tl-item', startEnd && 'tl-item--end', it.divider && 'tl-item--divider')}
      >
        {it.divider ? <span className="tl-divider" aria-hidden="true" /> : it.render()}
      </div>
    )
  })

  const panelBody = (
    <div className="tl-menu-list">
      {overflow.map((it) => {
        if (typeof it.menu === 'function') {
          return <div key={it.id} className="tl-menu-custom" data-tl-menu-item={it.id}>{it.menu(closeToTrigger)}</div>
        }
        const m = it.menu || {}
        return (
          <button
            key={it.id}
            type="button"
            className="tl-menu-row"
            data-tl-menu-item={it.id}
            disabled={m.disabled}
            aria-disabled={m.ariaDisabled || undefined}
            aria-pressed={m.pressed == null ? undefined : !!m.pressed}
            title={m.title}
            onClick={() => { closeToTrigger(); m.onSelect?.() }}
          >
            {m.icon && <ToolIcon name={m.icon} size={16} />}
            <span className="tl-menu-row-label">{m.label}</span>
            {m.hint && <span className="tl-menu-row-hint">{m.hint}</span>}
          </button>
        )
      })}
    </div>
  )

  const panel = open && overflow.length > 0 && (phone
    ? createPortal(
      <div className="tl-sheet-layer">
        <div className="tl-sheet-scrim" aria-hidden="true" onClick={close} />
        <div
          id={menuId}
          ref={popRef}
          className="tl-sheet"
          role="dialog"
          aria-label={overflowLabel}
          tabIndex={-1}
        >
          <span className="tl-sheet-grab" aria-hidden="true" />
          <div className="tl-sheet-head">
            <span className="tl-sheet-title">{overflowLabel}</span>
            <button type="button" className="tl-sheet-x" onClick={closeToTrigger} aria-label="Close">
              <ToolIcon name="x" size={16} />
            </button>
          </div>
          {panelBody}
        </div>
      </div>,
      document.body,
    )
    : (
      <div id={menuId} ref={popRef} className="tl-pop" role="dialog" aria-label={overflowLabel} tabIndex={-1}>
        {panelBody}
      </div>
    ))

  return (
    <div
      ref={rowRef}
      className={cx('tl-toolbar', needsMeasure && 'is-measuring', className)}
      data-tool-toolbar=""
    >
      {backProps && <span data-tl-fixed="" className="tl-fixed"><ToolBack to={backProps.to} label={backProps.label} /></span>}
      <h1 id={titleId} data-tl-fixed="" className={showTitle ? 'tl-title' : 'sr-only'}>{title}</h1>
      {inlineItems}
      {showMore && (
        <div data-tl-more="" className={cx('tl-more', !endStarted && 'tl-item--end')}>
          <button
            ref={triggerRef}
            type="button"
            className="tl-btn tl-btn--quiet tl-more-btn"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-label={overflowLabel}
            title={overflowLabel}
            onClick={() => setOpen((v) => !v)}
          >
            <ToolIcon name={overflowIcon} size={16} className="tl-btn-ico" />
            <span className="tl-btn-label tl-btn-label--collapse">{overflowLabel}</span>
          </button>
          {!phone && panel}
        </div>
      )}
      {phone && panel}
      {primary && (
        <div data-tl-fixed="" className={cx('tl-primary', !endStarted && !showMore && 'tl-item--end')}>{primary}</div>
      )}
    </div>
  )
}

// ── ToolBack ──────────────────────────────────────────────────────────────
// The 36px hairline square with the left arrow.
export function ToolBack({ to = '/projects', label = 'Back to workspace' }) {
  return (
    <Link to={to} className="tl-btn tl-btn--square" aria-label={label} title={label}>
      <ToolIcon name="arrow-left" size={15} />
    </Link>
  )
}

// ── ToolButton ────────────────────────────────────────────────────────────
// variant: 'quiet' (hairline, the default) | 'accent' (the one primary) |
//          'square' (36x36 icon-only, needs aria-label) | 'dashed' (add row)
// icon:    a ToolIcon name, drawn before the label
// kbd:     a keycap after the label ("SPACE")
// collapse:true → the text label hides below 768px (icon + aria-label stay)
// as:      'button' (default) or a component such as Link
export function ToolButton({
  variant = 'quiet', icon, iconSize = 15, kbd, collapse = false, className, children, as: As = 'button', ...props
}) {
  const buttonProps = As === 'button' ? { type: 'button', ...props } : props
  // A label that collapses to its icon on a phone leaves a tooltip behind.
  if (collapse && buttonProps.title == null && typeof children === 'string') buttonProps.title = children
  return (
    <As className={cx('tl-btn', `tl-btn--${variant}`, className)} {...buttonProps}>
      {icon && <ToolIcon name={icon} size={iconSize} className="tl-btn-ico" />}
      {children != null && children !== false && (
        <span className={collapse ? 'tl-btn-label tl-btn-label--collapse' : 'tl-btn-label'}>{children}</span>
      )}
      {kbd && <span className="tl-kbd" aria-hidden="true">{kbd}</span>}
    </As>
  )
}

// ── ToolSelect ────────────────────────────────────────────────────────────
// The drawn "System Auto ⇅" control: a muted label, the value in 540, a caret,
// and the native <select> laid over the whole thing at opacity 0 so the OS
// picker, keyboard and screen reader all get a real select.
// options: [{ value, label, disabled }] | string[]
export function ToolSelect({ label, value, options, onChange, ariaLabel, className, disabled }) {
  const opts = (options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const current = opts.find((o) => o.value === value)
  return (
    <label className={cx('tl-select', className)}>
      <span className="tl-select-k">{label}</span>
      <span className="tl-select-v">{current ? current.label : value}</span>
      <ToolIcon name="caret-up-down" size={13} className="tl-select-caret" />
      <select value={value} onChange={(e) => onChange?.(e.target.value)} aria-label={ariaLabel || label} disabled={disabled}>
        {opts.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
    </label>
  )
}

// ── ToolTray ──────────────────────────────────────────────────────────────
// The r14 tray the palette draws around undo/redo.
export function ToolTray({ label, className, children }) {
  return <div className={cx('tl-tray', className)} role="group" aria-label={label}>{children}</div>
}

// ── ToolGrid / ToolMain / ToolPanel / ToolSection ─────────────────────────
// ToolGrid is `minmax(0,1fr) 336px`, one column at ≤900px.
export function ToolGrid({ className, children, ...rest }) {
  return <div className={cx('tl-grid', className)} {...rest}>{children}</div>
}
export function ToolMain({ className, children, ...rest }) {
  return <div className={cx('tl-main', className)} {...rest}>{children}</div>
}
// label → the aside's accessible name. The card is r18 on --card; its
// sections are separated by hairlines, never boxed.
export function ToolPanel({ label, className, children, ...rest }) {
  return <aside className={cx('tl-panel', className)} aria-label={label} {...rest}>{children}</aside>
}
// A labelled block inside a panel: the 9.5px mono caps label ("STOPS",
// "GEOMETRY"), content below, hairline under all but the last.
// heading → the label is an <h2>; otherwise the block is a named group.
// aside   → nodes at the label's right (a lock, a flip).
export function ToolSection({ label, labelId, heading = false, aside, className, children }) {
  const autoId = useId()
  const id = labelId || (label ? `tl-sec-${autoId.replace(/:/g, '')}` : undefined)
  const Label = heading ? 'h2' : 'span'
  return (
    <div className={cx('tl-sec', className)} role={heading ? undefined : 'group'} aria-labelledby={!heading && label ? id : undefined}>
      {(label || aside) && (
        <div className="tl-sec-head">
          {label && <Label id={id} className="tl-sec-label">{label}</Label>}
          {aside}
        </div>
      )}
      {children}
    </div>
  )
}

// ── ToolPills ─────────────────────────────────────────────────────────────
// The drawn chip group (Linear/Radial/Conic, OKLCH/sRGB, 9/11/13 steps).
// Buttons with aria-pressed; the group is named by `label` or `labelledBy`.
// mono:  the 10.5px Geist Mono variant (OKLCH/sRGB, "Step 500").
// shape: 'pill' (999px, default) | 'block' (r12, stretched — Text/Background).
export function ToolPills({ options, value, onChange, label, labelledBy, mono = false, shape = 'pill', className, disabledValues }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <div
      className={cx('tl-pills', shape === 'block' && 'tl-pills--block', className)}
      role="group"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
    >
      {opts.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={cx('tl-pill', mono && 'tl-pill--mono', o.value === value && 'is-on')}
          aria-pressed={o.value === value}
          aria-label={o.ariaLabel}
          disabled={disabledValues?.includes(o.value)}
          onClick={() => onChange?.(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── ToolSlider ────────────────────────────────────────────────────────────
// The drawn slider row: a 12.5px label, a 6px track (any CSS background — a
// hue rainbow, the gradient itself), and the value in 11px mono.
// wide: the label gets its 56px column (the tint/semantic rows).
// snaps / snapRadius: pointer-only magnetism (SnapSlider's format); keys stay
// exact. defaultValue: double-click resets, and the row carries data-edited.
export function ToolSlider({
  label, value, min = 0, max = 100, step = 1, onChange, display, track, ariaLabel, ariaValueText, id, wide = false, disabled, className,
  snaps, snapRadius, defaultValue,
}) {
  // Optional magnetism (`snaps`, as SnapSlider takes them): a POINTER drag is
  // pulled toward a snap point, fading to nothing at its radius; the keyboard
  // is always exact, so a snap point can never trap an arrow key. Nothing is
  // drawn for it. `defaultValue` adds double-click to reset.
  const pointerRef = useRef(false)
  const endPointer = () => { pointerRef.current = false }
  const hasSnaps = Array.isArray(snaps) && snaps.length > 0
  const emit = (raw) => onChange?.(hasSnaps && pointerRef.current
    ? snapToTarget(raw, { snaps, snapRadius, min, max, step })
    : raw)
  return (
    <div className={cx('tl-slider', wide && 'tl-slider--wide', className)} data-edited={defaultValue != null && Number(value) !== Number(defaultValue) ? 'true' : undefined}>
      <span className="tl-slider-k" aria-hidden="true">{label}</span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => emit(Number(e.target.value))}
        onPointerDown={hasSnaps ? () => { pointerRef.current = true } : undefined}
        onPointerUp={hasSnaps ? endPointer : undefined}
        onPointerCancel={hasSnaps ? endPointer : undefined}
        onLostPointerCapture={hasSnaps ? endPointer : undefined}
        onBlur={hasSnaps ? endPointer : undefined}
        onKeyDown={hasSnaps ? (e) => {
          if (e.altKey || e.ctrlKey || e.metaKey) return
          const next = stepFromKey(e.key, { value, min, max, step })
          if (next === null) return
          e.preventDefault()
          pointerRef.current = false
          if (next !== Number(value)) onChange?.(next)
        } : undefined}
        onDoubleClick={defaultValue == null ? undefined : () => onChange?.(defaultValue)}
        aria-label={ariaLabel || label}
        aria-valuetext={ariaValueText}
        ref={(el) => { if (el) el.style.setProperty('--tl-track', track || '') }}
      />
      <span className="tl-slider-v" aria-hidden="true">{display ?? value}</span>
    </div>
  )
}

// ── ToolCode ──────────────────────────────────────────────────────────────
// The mono code well. tone="page" sits on --bg-0 inside a card (semantic).
export function ToolCode({ children, tone = 'card', className, label }) {
  return (
    <pre className={cx('tl-code', tone === 'page' && 'tl-code--page', className)} tabIndex={0} aria-label={label}>
      <code>{children}</code>
    </pre>
  )
}

export { default as ToolIcon } from './ToolIcon'
export default ToolLayout
