import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import usePopover, { focusablesIn } from '../../hooks/usePopover'
import { DOWNLOAD_FORMATS, describeFormat, effectiveFormat } from '../../utils/iconDownload'
import FooterGlyph from './FooterGlyph'

// A split Download button for the icon customiser. The main part is labelled
// with the format it will download ("SVG", "PNG 96px") and downloads it; the
// arrow part opens a menu of every format. Picking a row downloads that format
// at once and makes it the one the main part shows from then on.
//
// This component owns the look and the keyboard; the caller owns the file.
//   format        the remembered format id (utils/iconDownload.js)
//   size          the customiser's Size, in px: PNG rows are scales of it
//   disabled      the icon's markup is not there yet (or failed to load)
//   blocked       a Pro preview is on screen: both parts are dimmed with aria-disabled (still
//                 reachable by Tab) and do nothing. `describedBy` is the id of the line saying why.
//   loading       as above, but still arriving: only changes aria-busy
//   onPick(id)    the person chose a format in the menu: remember it
//   onDownload(f) build and hand over the file for the described format `f`;
//                 resolves { status: 'done', file } | { status: 'failed' } |
//                 anything else for "nothing was downloaded" (a dismissed gate)
//
// The menu is portalled to <body> like MenuSelect's list: the dialog panel is
// overflow:hidden and the footer sits in a scroller, so an inline popover would
// be clipped. Its semantics are a menu, not a listbox, because a row acts.

// Every face the main part can show, per width tier. Each is a hidden sizer in
// the same grid cell, so the button is as wide as the widest and never changes.
const SIZER_WIDE = ['SVG', 'PNG 2048px', 'Retry']
const SIZER_PHONE = ['SVG', 'PNG', 'Retry']

export default function SplitDownload({ format, size, disabled = false, blocked = false, describedBy, loading = false, onPick, onDownload }) {
  const uid = useId()
  const menuId = `dl-menu-${uid}`
  const moreId = `dl-more-${uid}`
  const groupRef = useRef(null)
  const mainRef = useRef(null)
  const scrimRef = useRef(null)
  const rowRefs = useRef([])
  const openAtRef = useRef('checked')
  const busyRef = useRef(false)
  const timers = useRef({ done: 0, fail: 0 })
  const [open, setOpen] = useState(false)
  // idle | building | done | failed
  const [phase, setPhase] = useState('idle')
  const [spin, setSpin] = useState(false)
  const [note, setNote] = useState('')

  const rows = useMemo(() => DOWNLOAD_FORMATS.map(f => describeFormat(f.id, size)), [size])
  const current = effectiveFormat(format, size)
  const building = phase === 'building'

  const { triggerRef, popRef } = usePopover(open, () => setOpen(false), { autoFocus: false, portalled: true })

  useEffect(() => {
    const t = timers.current
    return () => { clearTimeout(t.done); clearTimeout(t.fail) }
  }, [])

  const run = useCallback(async (fmt) => {
    // A second press while a file is being built does nothing.
    if (busyRef.current) return
    busyRef.current = true
    clearTimeout(timers.current.done)
    clearTimeout(timers.current.fail)
    setPhase('building')
    setNote('')
    // Under 300ms nothing visible changes; past it the icon becomes a spinner.
    const spinTimer = setTimeout(() => setSpin(true), 300)
    let res
    try { res = await onDownload(fmt) } catch { res = { status: 'failed' } }
    clearTimeout(spinTimer)
    busyRef.current = false
    setSpin(false)
    if (res?.status === 'done') {
      setPhase('done')
      setNote(`Downloaded ${res.file}`)
      timers.current.done = setTimeout(() => setPhase('idle'), 1600)
    } else if (res?.status === 'failed') {
      setPhase('failed')
      setNote(fmt.kind === 'png' ? 'Couldn’t make the PNG. Try again, or pick SVG.' : 'Couldn’t make the file. Try again.')
      timers.current.fail = setTimeout(() => setPhase('idle'), 4000)
    } else {
      setPhase('idle')
    }
  }, [onDownload])

  const choose = (row) => {
    if (row.over) return
    onPick?.(row.id)
    setOpen(false)
    mainRef.current?.focus({ preventScroll: true })
    run(row)
  }

  const closeToTrigger = () => {
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }

  // Above the dialog that holds the trigger, aligned to the split's right edge,
  // and focus on the row the key that opened it asks for.
  useLayoutEffect(() => {
    if (!open) return undefined
    let layer = 130
    for (let node = triggerRef.current; node; node = node.parentElement) {
      layer = Math.max(layer, (Number.parseInt(getComputedStyle(node).zIndex, 10) || 0) + 1)
    }
    popRef.current?.style.setProperty('--select-layer', String(layer))
    scrimRef.current?.style.setProperty('--select-layer', String(layer))
    const align = () => {
      const group = groupRef.current
      const pop = popRef.current
      if (!group || !pop) return
      const box = group.getBoundingClientRect()
      pop.style.setProperty('--dl-right', `${Math.max(8, window.innerWidth - box.right)}px`)
      pop.style.setProperty('--dl-w', `${box.width}px`)
    }
    align()
    const enabled = rows.map((r, i) => (r.over ? -1 : i)).filter(i => i >= 0)
    const at = openAtRef.current
    const checked = rows.findIndex(r => r.id === current.id)
    const first = at === 'first' ? enabled[0] : at === 'last' ? enabled[enabled.length - 1] : checked
    rowRefs.current[first >= 0 ? first : enabled[0]]?.focus({ preventScroll: true })
    window.addEventListener('resize', align)
    return () => window.removeEventListener('resize', align)
    // Opening is the only moment this should run: a Size change while the menu
    // is open re-labels rows without stealing focus.
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const onMenuKey = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const enabled = rows.map((r, i) => (r.over ? -1 : i)).filter(i => i >= 0)
    const at = rowRefs.current.indexOf(document.activeElement)
    const pos = enabled.indexOf(at)
    let next = -1
    if (e.key === 'ArrowDown') next = enabled[(pos + 1) % enabled.length]
    else if (e.key === 'ArrowUp') next = enabled[(pos <= 0 ? enabled.length : pos) - 1]
    else if (e.key === 'Home') next = enabled[0]
    else if (e.key === 'End') next = enabled[enabled.length - 1]
    if (next >= 0) {
      e.preventDefault()
      rowRefs.current[next]?.focus({ preventScroll: true })
      return
    }
    if (e.key === 'Tab') {
      // Rows are not Tab stops and the menu sits at the end of <body>, so the
      // browser's own next stop would be the wrong place. Close, and send focus
      // where an inline menu would have: the neighbour of the arrow part.
      e.preventDefault()
      e.stopPropagation()
      const panel = triggerRef.current?.closest('[role="dialog"]')
      const stops = focusablesIn(panel)
      const here = stops.indexOf(triggerRef.current)
      const target = stops[here + (e.shiftKey ? -1 : 1)] || triggerRef.current
      setOpen(false)
      target?.focus({ preventScroll: true })
    }
  }

  const openMenu = (where) => {
    openAtRef.current = where
    setOpen(true)
  }

  const retry = phase === 'failed'
  const mainName = retry ? `Retry download ${current.name}` : `Download ${current.name}`

  return (
    <div
      ref={groupRef}
      className="dl-split"
      role="group"
      aria-label="Download"
      data-blocked={blocked ? 'true' : undefined}
      data-phase={phase}
      data-spin={spin ? 'true' : undefined}
    >
      <button
        ref={mainRef}
        type="button"
        className="dl-main"
        disabled={disabled}
        aria-disabled={building || blocked || undefined}
        aria-describedby={blocked ? describedBy : undefined}
        aria-busy={loading || building || undefined}
        aria-label={mainName}
        title={mainName}
        onClick={() => { if (!building && !blocked) run(current) }}
      >
        {/* The face is the visible icon and label. The hidden sizers hold every
            face of each width tier (formats and Retry), all in grid cell 1/1, so the button
            never changes width on a format switch or a Size drag, and the face
            sits at the centre of that reserved width. */}
        <span className="dl-face">
          <span className="dl-ico" aria-hidden="true">
            <FooterGlyph name="download" className="dl-i-dl" />
            <FooterGlyph name="check" className="dl-i-check" />
            <FooterGlyph name="circle-notch" className="dl-i-spin" />
          </span>
          <span className="dl-label">
            <span className="dl-show dl-w">{retry ? 'Retry' : current.label}</span>
            <span className="dl-show dl-p">{retry ? 'Retry' : current.short}</span>
          </span>
        </span>
        {SIZER_WIDE.map(t => <span key={`w-${t}`} className="dl-sizer dl-w" aria-hidden="true"><span className="dl-ico" />{t}</span>)}
        {SIZER_PHONE.map(t => <span key={`p-${t}`} className="dl-sizer dl-p" aria-hidden="true"><span className="dl-ico" />{t}</span>)}
      </button>
      <button
        ref={triggerRef}
        id={moreId}
        type="button"
        className="dl-more"
        disabled={disabled || building}
        aria-label="Download formats"
        title="Other formats"
        aria-disabled={blocked || undefined}
        aria-describedby={blocked ? describedBy : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => { if (blocked) return; if (open) closeToTrigger(); else openMenu('checked') }}
        onKeyDown={(e) => {
          if (blocked) return
          if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) openMenu('first') }
          else if (e.key === 'ArrowUp') { e.preventDefault(); if (!open) openMenu('last') }
        }}
      >
        <FooterGlyph name="caret-down" size={14} className="dl-caret" />
      </button>
      <span className="sr-only" role="status">{note}</span>
      {open && createPortal(<>
        <div
          ref={scrimRef}
          className="dl-scrim"
          aria-hidden="true"
          data-pop-trigger={moreId}
          data-pop-scrim={menuId}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); closeToTrigger() }}
        />
        <div
          ref={popRef}
          id={menuId}
          role="menu"
          aria-label="Download format"
          className="pop dl-menu"
          data-pop-fixed="true"
          data-pop-trigger={moreId}
          onKeyDown={onMenuKey}
        >
          {rows.map((row, i) => (
            <Fragment key={row.id}>
              {i === 1 && <div role="separator" className="pop-sep" />}
              <button
                ref={el => { rowRefs.current[i] = el }}
                type="button"
                role="menuitemradio"
                aria-checked={row.id === current.id}
                aria-disabled={row.over || undefined}
                aria-posinset={i + 1}
                aria-setsize={rows.length}
                tabIndex={-1}
                className="pop-item dl-item"
                onClick={() => choose(row)}
              >
                <span className="dl-item-text">{row.label}</span>
                <span className="menu-select-mark">{row.mark}</span>
                <FooterGlyph name="check" className="menu-select-check" />
              </button>
            </Fragment>
          ))}
        </div>
      </>, document.body)}
    </div>
  )
}
