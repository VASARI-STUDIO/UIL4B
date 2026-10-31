// The Palette Builder's preview dialog: one large scene at a time, picked from a
// named list, with a legend that traces every colour role to the elements it
// paints.
//
// The list takes three shapes, chosen once by width and height (useMediaQuery,
// so only one tree is mounted): a grouped rail from 1024px, a "Dashboard"
// button that opens the same list as a popover from 768px, and a chip strip
// docked at the bottom below that, or whenever the window is under 500px tall
// (a phone on its side keeps the strip, which leaves the scene the most room).
// All three are one listbox contract: arrows, Home and End move and select,
// and only the selected option is a tab stop.
//
// The dialog owns its modal contract (useModalDialog). That hook closes on
// Escape in the capture phase, before any handler in the tree, so an open
// popover or sheet registers itself as an Escape layer (useEscapeLayer) that
// consumes the key and closes just itself.
//
// An example (src/components/palette/examples/) is its own chunk. Picking one
// is a transition, so the picture on screen stays until the next has loaded,
// and the Suspense that holds the scene lives in Stage and is never remounted:
// a boundary mounted fresh would show its fallback instead of keeping the old
// picture. Only the chosen option shows a small spinner, and only if the load
// is slow. The neighbours of the open example are fetched when the browser is
// idle, so the next click is usually instant.
import { Suspense, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react'
import PreviewScene from './PalettePreview'
import { EscapeLayerContext, useEscapeLayer } from './escapeLayer'
import { preloadExample } from './examples/registry'
import ToolIcon from '../tool/ToolIcon'
import useMediaQuery from '../../hooks/useMediaQuery'
import useModalDialog from '../../hooks/useModalDialog'
import useBackClosesDialog from '../../hooks/useBackClosesDialog'
import { PREVIEW_GROUPS, PREVIEW_SCENES, sceneById } from '../../data/palettePreviewScenes'
import { statesOf } from '../../data/previewStates'
import { BRAND_ROLES, derivePaletteRoles } from '../../utils/palettePreviewRoles'
import { roleLabel } from '../../utils/paletteRoles'
import { simCvd } from '../../utils/colors'
import { prefersReducedMotion } from '../spectrum/reducedMotion'
import '../../styles/pages/palette-preview-dialog.css'

// Roles the export does not write; the legend labels them as suggestions.
const SUGGESTED = [
  ['success', 'Success'],
  ['warning', 'Warning'],
  ['error', 'Error'],
  ['info', 'Info'],
  ['neutral', 'Neutrals'],
]

// How long a colour tapped in the phone sheet stays outlined in the scene.
const PIN_MS = 3000

// The one line under the list. Each example is its own made-up brand.
const NOTE = 'Sample content. Every brand here is made up.'

const sentence = (s) => s.charAt(0) + s.slice(1).toLowerCase()

function swatchOf(roles, role) {
  if (role === 'neutral') return roles.surface
  if (SUGGESTED.some(([r]) => r === role)) return roles[role].fill
  return roles[role]
}

const IcoX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
)

// useEscapeLayer (./escapeLayer) registers a menu or sheet as the layer Escape
// closes first; the layer ref also goes down to the scene through context.

// ── The scene list ──────────────────────────────────────────────────────────

// `onChoose` fires on a click or Enter/Space on an option, not on the arrow keys
// that also select, so a popover can close on a choice and stay open to browse.
function SceneListbox({ grouped, orientation, sceneId, pendingId, onPick, onChoose, isLocked, label, className, listRef, onScroll }) {
  const uid = useId()
  const innerRef = useRef(null)
  const ref = listRef || innerRef

  const onKeyDown = (e) => {
    const vertical = orientation === 'vertical'
    const prev = vertical ? 'ArrowUp' : 'ArrowLeft'
    const next = vertical ? 'ArrowDown' : 'ArrowRight'
    const last = PREVIEW_SCENES.length - 1
    let i = PREVIEW_SCENES.findIndex((s) => s.id === sceneId)
    if (e.key === next) i = Math.min(i + 1, last)
    else if (e.key === prev) i = Math.max(i - 1, 0)
    else if (e.key === 'Home') i = 0
    else if (e.key === 'End') i = last
    else return
    e.preventDefault()
    const id = PREVIEW_SCENES[i].id
    onPick(id)
    ref.current?.querySelector(`[data-scene-id="${id}"]`)?.focus()
  }

  const option = (s) => {
    const on = s.id === sceneId
    return (
      <button
        key={s.id}
        type="button"
        role="option"
        aria-selected={on}
        tabIndex={on ? 0 : -1}
        data-scene-id={s.id}
        className={on ? 'pvd-opt is-on' : 'pvd-opt'}
        onClick={() => { onPick(s.id); if (onChoose) onChoose() }}
      >
        <span className="pvd-opt-name">{s.name}</span>
        {s.id === pendingId && (
          <>
            <i className="pvd-spin" aria-hidden="true" />
            <span className="sr-only">Loading</span>
          </>
        )}
        {isLocked(s) && (
          <>
            <ToolIcon name="lock-simple" size={13} />
            <span className="sr-only">Pro</span>
          </>
        )}
      </button>
    )
  }

  return (
    <div ref={ref} role="listbox" aria-label={label} aria-orientation={orientation} className={className} onKeyDown={onKeyDown} onScroll={onScroll}>
      {grouped
        ? PREVIEW_GROUPS.map((g) => (
          <div key={g.id} role="group" aria-labelledby={`${uid}-${g.id}`} className="pvd-group">
            <span id={`${uid}-${g.id}`} className="pvd-group-l">{g.label}</span>
            {PREVIEW_SCENES.filter((s) => s.group === g.id).map(option)}
          </div>
        ))
        : PREVIEW_SCENES.map(option)}
    </div>
  )
}

// 768 to 1023: the list behind one button.
function SceneMenu({ scene, sceneId, pendingId, onPick, isLocked, layerRef }) {
  const [open, setOpen] = useState(false)
  const trigRef = useRef(null)
  const popRef = useRef(null)
  const popId = useId()

  const close = useCallback(() => {
    setOpen(false)
    trigRef.current?.focus()
  }, [])
  useEscapeLayer(layerRef, open, close)

  useEffect(() => {
    if (!open) return undefined
    popRef.current?.querySelector('[aria-selected="true"]')?.focus()
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || trigRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open])

  return (
    <div className="pvd-menu">
      <button
        ref={trigRef}
        type="button"
        className="pvd-menu-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{scene.name}</span>
        <ToolIcon name="caret-down" size={14} />
      </button>
      {open && (
        <div id={popId} ref={popRef} className="pvd-pop">
          <SceneListbox
            grouped
            orientation="vertical"
            label="Previews"
            sceneId={sceneId}
            pendingId={pendingId}
            isLocked={isLocked}
            onPick={onPick}
            onChoose={close}
            className="pvd-list"
          />
        </div>
      )}
    </div>
  )
}

// Under 768: chips docked at the bottom. A right-edge fade says there are more.
function SceneStrip({ sceneId, pendingId, onPick, isLocked }) {
  const ref = useRef(null)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.dataset.more = el.scrollWidth - el.clientWidth - el.scrollLeft > 4 ? 'true' : 'false'
  }, [])

  useEffect(() => {
    measure()
    ref.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [measure, sceneId])

  return (
    <SceneListbox
      listRef={ref}
      orientation="horizontal"
      label="Previews"
      sceneId={sceneId}
      pendingId={pendingId}
      isLocked={isLocked}
      onPick={onPick}
      className="pvd-strip"
      onScroll={measure}
    />
  )
}

// ── The State menu ──────────────────────────────────────────────────────────

// One list of states, as radio items: arrows move and select, Enter or Space
// picks. Shared by the header popover (768 and up) and the phone sheet.
function StateList({ states, value, onPick, listRef }) {
  const onKeyDown = (e) => {
    const i = states.findIndex((s) => s.id === value)
    let next = i
    if (e.key === 'ArrowDown') next = Math.min(i + 1, states.length - 1)
    else if (e.key === 'ArrowUp') next = Math.max(i - 1, 0)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = states.length - 1
    else return
    e.preventDefault()
    onPick(states[next].id, false)
    listRef.current?.querySelector(`[data-state-id="${states[next].id}"]`)?.focus()
  }
  return (
    <div ref={listRef} role="menu" aria-label="State" className="pvd-states" onKeyDown={onKeyDown}>
      {states.map((s) => {
        const on = s.id === value
        return (
          <button
            key={s.id}
            type="button"
            role="menuitemradio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-state-id={s.id}
            className={on ? 'pvd-state is-on' : 'pvd-state'}
            onClick={() => onPick(s.id, true)}
          >
            <span>{s.label}</span>
            {on && <ToolIcon name="check" size={14} />}
          </button>
        )
      })}
    </div>
  )
}

// 768 and up: "State: Overview" in the header, the list in a popover under it.
function StateMenu({ states, value, onPick, layerRef }) {
  const [open, setOpen] = useState(false)
  const trigRef = useRef(null)
  const popRef = useRef(null)
  const listRef = useRef(null)
  const popId = useId()
  const current = states.find((s) => s.id === value) || states[0]

  const close = useCallback(() => {
    setOpen(false)
    trigRef.current?.focus()
  }, [])
  useEscapeLayer(layerRef, open, close)

  useEffect(() => {
    if (!open) return undefined
    listRef.current?.querySelector('[aria-checked="true"]')?.focus()
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || trigRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open])

  return (
    <div className="pvd-statemenu">
      <button
        ref={trigRef}
        type="button"
        className="pvd-state-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="pvd-state-k">State</span>
        <span>{current.label}</span>
        <ToolIcon name="caret-down" size={14} />
      </button>
      {open && (
        <div id={popId} ref={popRef} className="pvd-pop pvd-state-pop">
          <StateList states={states} value={value} listRef={listRef} onPick={(id, choose) => { onPick(id); if (choose) close() }} />
        </div>
      )}
    </div>
  )
}

// ── The legend ──────────────────────────────────────────────────────────────

// The width the "+N more" button keeps free at the end of the one-row legend.
const MORE_W = 96
const ROW_GAP = 8

function Legend({ roles, harmony, used, adjusted, hover, pinned, onHover, onPin, sheet, layerRef }) {
  const failFor = (role) => roles.fails.find((f) => f.role === role)
  const unset = new Set(roles.unset)
  const adjId = useId()

  // `compact` is the chip as the one-row legend prints it: swatch, name and a
  // short warning. The hex and the long notes live in the "+N more" popover.
  const chip = (role, label, i, compact = false) => {
    const off = Boolean(used) && !used.includes(role)
    const fail = failFor(role)
    const on = pinned === role
    const mouse = (fn) => (e) => { if (e.pointerType === 'mouse') fn() }
    const hex = swatchOf(roles, role).toUpperCase()
    return (
      <button
        key={role}
        type="button"
        className={`pvd-chip${on ? ' is-on' : ''}${off ? ' is-off' : ''}${fail ? ' is-fail' : ''}`}
        aria-pressed={on}
        aria-disabled={off || undefined}
        title={off ? 'Not in this preview' : compact ? `${label} ${hex}${fail ? `, ${fail.ratio.toFixed(1)}:1 on surface` : ''}` : undefined}
        onPointerEnter={off ? undefined : mouse(() => onHover(role))}
        onPointerLeave={mouse(() => onHover(null))}
        onFocus={off ? undefined : () => onHover(role)}
        onBlur={() => onHover(null)}
        onClick={off ? undefined : () => onPin(role)}
        aria-describedby={adjusted.includes(role) ? adjId : undefined}
      >
        <i className="pvd-sw" style={{ background: swatchOf(roles, role) }} aria-hidden="true" />
        <span className="pvd-chip-t">
          <span className="pvd-chip-l">{label}</span>
          {!compact && <span className="pvd-chip-hex">{hex}</span>}
        </span>
        {fail && (
          <span className="pvd-chip-fail">
            <ToolIcon name="warning-circle" size={14} />
            {compact ? <>{fail.ratio.toFixed(1)}:1<span className="sr-only"> on surface</span></> : `${fail.ratio.toFixed(1)}:1 on surface`}
          </span>
        )}
        {!compact && i != null && unset.has(role) && <span className="pvd-chip-note">Not set, using Primary</span>}
        {off && <span className="sr-only">Not in this preview</span>}
        {hover === role && <span className="sr-only">Outlined in the preview</span>}
      </button>
    )
  }

  // A role's name as its chip prints it.
  const adjustedName = (role) => (BRAND_ROLES.includes(role)
    ? sentence(roleLabel(harmony, BRAND_ROLES.indexOf(role)))
    : SUGGESTED.find(([r]) => r === role)?.[1] ?? role)

  let note = null
  if (roles.empty) note = 'Add colours to see your own roles'
  else if (roles.lowChroma) note = 'Your palette has no strong colour, so buttons use a neutral'

  // ── The one-row legend (desktop and tablet) ──
  // Every chip is measured once in a hidden copy, so the count that fits never
  // depends on what is already showing. Whatever does not fit moves, in order
  // from the end, into the "+N more" popover; the row itself never wraps.
  const items = [
    ...BRAND_ROLES.map((role, i) => ({ role, label: sentence(roleLabel(harmony, i)), i })),
    ...SUGGESTED.map(([role, label]) => ({ role, label, i: null })),
  ]
  const rowRef = useRef(null)
  const ghostRef = useRef(null)
  const moreRef = useRef(null)
  const popRef = useRef(null)
  const popId = useId()
  const [fit, setFit] = useState(items.length)
  const [moreOpen, setMoreOpen] = useState(false)
  const failKey = roles.fails.map((f) => `${f.role}${f.ratio}`).join()

  useLayoutEffect(() => {
    if (sheet) return undefined
    const measure = () => {
      const row = rowRef.current
      const ghost = ghostRef.current
      if (!row || !ghost) return
      const widths = [...ghost.querySelectorAll('.pvd-chip')].map((c) => c.getBoundingClientRect().width)
      const head = ghost.querySelector('.pvd-legend-t').getBoundingClientRect().width
      const room = row.clientWidth - head - ROW_GAP
      // The hairline between the groups takes a gap on each side.
      const total = widths.reduce((t, w) => t + w + ROW_GAP, 0)
      const hasNotes = Boolean(note) || adjusted.length > 0 || roles.errorShifted
      if (total <= room && !hasNotes) { setFit(widths.length); return }
      let left = room - MORE_W
      let n = 0
      for (const w of widths) {
        if (w + ROW_GAP > left) break
        left -= w + ROW_GAP
        n += 1
      }
      setFit(n)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(rowRef.current)
    return () => ro.disconnect()
  }, [sheet, harmony, failKey, note, adjusted.length, roles.errorShifted]) // eslint-disable-line react-hooks/exhaustive-deps

  const closeMore = useCallback(() => {
    setMoreOpen(false)
    moreRef.current?.focus()
  }, [])
  useEscapeLayer(layerRef, moreOpen, closeMore)
  useEffect(() => {
    if (!moreOpen) return undefined
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || moreRef.current?.contains(e.target)) return
      setMoreOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [moreOpen])

  if (!sheet) {
    const shown = items.slice(0, fit)
    const rest = items.slice(fit)
    const brand = shown.filter((it) => BRAND_ROLES.includes(it.role))
    const sugg = shown.filter((it) => !BRAND_ROLES.includes(it.role))
    const hasNotes = Boolean(note) || adjusted.length > 0 || roles.errorShifted
    const moreCount = rest.length
    return (
      <div className="pvd-legend is-row" ref={rowRef}>
        <p className="pvd-legend-t">Where each colour lands</p>
        <div className="pvd-chips" role="group" aria-label="Your colours">
          {brand.map((it) => chip(it.role, it.label, it.i, true))}
        </div>
        {sugg.length > 0 && <span className="pvd-legend-rule" aria-hidden="true" />}
        <div className="pvd-chips" role="group" aria-label="Suggested colours">
          {sugg.map((it) => chip(it.role, it.label, it.i, true))}
        </div>
        {(moreCount > 0 || hasNotes) && (
          <button
            ref={moreRef}
            type="button"
            className="pvd-more"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls={moreOpen ? popId : undefined}
            onClick={() => setMoreOpen((o) => !o)}
          >
            {moreCount > 0 ? `+${moreCount} more` : 'Notes'}
          </button>
        )}
        {moreOpen && (
          <div id={popId} ref={popRef} className="pvd-more-pop" role="dialog" aria-label="More colours">
            {moreCount > 0 && (
              <div className="pvd-chips" role="group" aria-label="More colours">
                {rest.map((it) => chip(it.role, it.label, it.i))}
              </div>
            )}
            {adjusted.length > 0 && (
              <p className="pvd-legend-adj">{adjusted.map(adjustedName).join(', ')}: {roles.mode === 'dark' ? 'lighter' : 'darker'} as text, so it reads</p>
            )}
            {note && <p className="pvd-legend-note">{note}</p>}
            {roles.errorShifted && <p className="pvd-legend-note">Error shifted to stay distinct from your primary</p>}
          </div>
        )}
        {adjusted.length > 0 && (
          <p className="sr-only" id={adjId}>
            {adjusted.map(adjustedName).join(', ')}: {roles.mode === 'dark' ? 'lighter' : 'darker'} as text, so it reads
          </p>
        )}
        <div className="pvd-legend-ghost" ref={ghostRef} aria-hidden="true" inert>
          <p className="pvd-legend-t">Where each colour lands</p>
          {items.map((it) => chip(it.role, it.label, it.i, true))}
        </div>
      </div>
    )
  }

  return (
    <div className={sheet ? 'pvd-legend is-sheet' : 'pvd-legend'}>
      <p className="pvd-legend-t">Where each colour lands</p>
      <div className="pvd-chips" role="group" aria-label="Your colours">
        {BRAND_ROLES.map((role, i) => chip(role, sentence(roleLabel(harmony, i)), i))}
      </div>
      {adjusted.length > 0 && (
        <p className="pvd-legend-adj" id={adjId}>
          {adjusted.map(adjustedName).join(', ')}: {roles.mode === 'dark' ? 'lighter' : 'darker'} as text, so it reads
        </p>
      )}
      <p className="pvd-legend-sub">Suggested, not in your export</p>
      <div className="pvd-chips" role="group" aria-label="Suggested colours">
        {SUGGESTED.map(([role, label]) => chip(role, label, null))}
      </div>
      {note && <p className="pvd-legend-note">{note}</p>}
      {roles.errorShifted && <p className="pvd-legend-note">Error shifted to stay distinct from your primary</p>}
    </div>
  )
}

// ── One scene, gated ────────────────────────────────────────────────────────

function Stage({ scene, roles, labels, highlight, onRoles, gate, onUnlock, state, onState }) {
  const locked = gate !== 'open'
  return (
    <div className={locked ? 'pvd-scene is-locked' : 'pvd-scene'}>
      <div className="pvd-scene-in" inert={locked}>
        <Suspense fallback={<div className="pvd-scene-wait" style={{ background: roles.canvas }} aria-hidden="true" />}>
          <PreviewScene key={scene.id} roles={roles} labels={labels} sceneId={scene.id} highlight={highlight} onRoles={onRoles} state={state} onState={onState} />
        </Suspense>
      </div>
      {locked && (
        <div className="pvd-lock">
          <div className="pvd-lock-card">
            <ToolIcon name="lock-simple" size={20} />
            {gate === 'pending' ? (
              <p>Checking your plan</p>
            ) : (
              <>
                <p>{scene.name} is a Pro preview</p>
                <button type="button" className="btn btn-accent pvd-lock-btn" onClick={() => onUnlock(scene)}>Unlock preview</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── The dialog ──────────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {{mode: 'light'|'dark', scene: string, compare: object|null}} props.preview
 * @param {(patch: object) => void} props.onChange merges a patch into `preview`
 * @param {() => void} props.onClose
 * @param {string[]} props.colors the palette being previewed, in slot order
 * @param {number} props.paletteScore
 * @param {string} props.harmony the colour system, for the slot names
 * @param {string} props.vision a colour-vision mode id; 'normal' paints as is
 * @param {string} props.visionLabel the display name of `vision`
 * @param {() => void} props.onResetVision
 * @param {boolean} props.isPro
 * @param {boolean} props.planKnown false while the plan is still loading
 * @param {(scene: object) => void} props.onUnlock
 * @param {() => void} props.onUse applies the compared palette
 */
export default function PalettePreviewDialog({
  preview, onChange, onClose, colors, paletteScore, harmony, vision, visionLabel,
  onResetVision, isPro, planKnown, onUnlock, onUse,
}) {
  const wide = useMediaQuery('(min-width: 1024px)')
  const mid = useMediaQuery('(min-width: 768px)')
  const tall = useMediaQuery('(min-height: 500px)')
  const layout = !tall ? 'strip' : wide ? 'rail' : mid ? 'menu' : 'strip'
  // The full-screen phone sheet: the system Back button closes it.
  useBackClosesDialog(layout === 'strip', onClose)

  const layerRef = useRef(null)
  const requestClose = useCallback(() => {
    if (layerRef.current) layerRef.current()
    else onClose()
  }, [onClose])
  const dialogRef = useModalDialog(requestClose)

  const { mode, compare } = preview
  const scene = sceneById(preview.scene)

  // The State menu: one state of the open preview at a time, resting first.
  // A choice is kept per preview, so coming back to one finds it as it was left.
  const states = statesOf(scene.id)
  const [stateBy, setStateBy] = useState({})
  const stateId = (states.find((s) => s.id === stateBy[scene.id]) || states[0])?.id
  const pickState = (id) => setStateBy((prev) => ({ ...prev, [scene.id]: id }))
  const [moreOpen, setMoreOpen] = useState(false)
  const moreBtnRef = useRef(null)
  const moreSheetRef = useRef(null)
  const moreListRef = useRef(null)
  const closeMoreSheet = useCallback(() => {
    setMoreOpen(false)
    moreBtnRef.current?.focus()
  }, [])
  useEscapeLayer(layerRef, moreOpen, closeMoreSheet)
  useEffect(() => {
    if (moreOpen) moreListRef.current?.querySelector('[aria-checked="true"]')?.focus()
  }, [moreOpen])

  // Picking is a transition: `preview.scene` (and with it the picture) changes
  // when the chosen example has loaded. `target` is what was picked, so the list
  // moves its selection at once and shows a spinner on the option while it loads.
  const [isPending, startTransition] = useTransition()
  const [target, setTarget] = useState(null)
  const shownId = isPending && target ? target : scene.id
  const pendingId = isPending && target && target !== scene.id ? target : null
  const gate = scene.free || (isPro && planKnown) ? 'open' : planKnown ? 'locked' : 'pending'
  const isLocked = useCallback((s) => !s.free && !(isPro && planKnown), [isPro, planKnown])

  // The palette as the board shows it: through the colour-vision simulation
  // when one is on. Roles are derived once per palette and mode.
  const shown = useMemo(
    () => (vision === 'normal' ? colors : colors.map((c) => simCvd(c, vision))),
    [colors, vision],
  )
  const roles = useMemo(() => derivePaletteRoles(shown, { mode, harmony }), [shown, mode, harmony])
  // The five slot names, which an example may print (a colourway's name).
  const labels = useMemo(() => BRAND_ROLES.map((_, i) => sentence(roleLabel(harmony, i))), [harmony])
  const compareColors = compare?.colors
  const compareRoles = useMemo(() => {
    if (!compareColors) return null
    const cols = vision === 'normal' ? compareColors : compareColors.map((c) => simCvd(c, vision))
    return derivePaletteRoles(cols, { mode, harmony })
  }, [compareColors, vision, mode, harmony])

  // Legend state: hover and focus outline transiently; a click pins.
  const [hover, setHover] = useState(null)
  const [pinned, setPinned] = useState(null)
  const [used, setUsed] = useState(null)
  const [adjusted, setAdjusted] = useState([])
  const onRoles = useCallback((list, shifted = []) => {
    const same = (prev, next) => prev.length === next.length && next.every((r) => prev.includes(r))
    setUsed((prev) => (prev && same(prev, list) ? prev : list))
    setAdjusted((prev) => (same(prev, shifted) ? prev : shifted))
  }, [])
  const live = (r) => (r && (!used || used.includes(r)) ? r : null)
  const highlight = live(hover) || live(pinned)

  // A highlighted role can sit below the fold of a tall scene. When none of its
  // elements is in view, bring the first into view (instantly under reduced
  // motion); when one already is, leave the scene where it is.
  const stageRef = useRef(null)
  useEffect(() => {
    const stage = stageRef.current
    if (!highlight || !stage) return
    const hits = [...stage.querySelectorAll('[data-hit="on"]')]
      .filter((el) => el.getBoundingClientRect().height > 0)
    if (!hits.length) return
    const view = stage.getBoundingClientRect()
    const seen = hits.some((el) => {
      const r = el.getBoundingClientRect()
      const overlap = Math.min(r.bottom, view.bottom) - Math.max(r.top, view.top)
      return overlap >= Math.min(r.height, 24) && r.right > view.left && r.left < view.right
    })
    if (!seen) hits[0].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [highlight, scene.id])

  // The phone sheet of colours.
  const [sheet, setSheet] = useState(false)
  const coloursRef = useRef(null)
  const sheetRef = useRef(null)
  const pinTimer = useRef(0)
  const closeSheet = useCallback(() => {
    setSheet(false)
    coloursRef.current?.focus()
  }, [])
  useEscapeLayer(layerRef, sheet, closeSheet)
  useEffect(() => {
    if (sheet) sheetRef.current?.querySelector('button')?.focus()
  }, [sheet])
  useEffect(() => () => window.clearTimeout(pinTimer.current), [])

  const unpin = useCallback(() => {
    window.clearTimeout(pinTimer.current)
    setPinned(null)
  }, [])
  const pin = (role) => {
    window.clearTimeout(pinTimer.current)
    if (layout === 'strip') {
      setPinned(role)
      setSheet(false)
      coloursRef.current?.focus()
      pinTimer.current = window.setTimeout(() => setPinned(null), PIN_MS)
      return
    }
    setPinned((p) => (p === role ? null : role))
  }

  const pick = useCallback((id) => {
    setTarget(id)
    startTransition(() => onChange({ scene: id }))
  }, [onChange, startTransition, setTarget])

  // Fetch the neighbours of the open example when the browser has nothing else
  // to do, in list order, so stepping with the arrows or a swipe is instant.
  useEffect(() => {
    const i = PREVIEW_SCENES.findIndex((s) => s.id === scene.id)
    const near = [PREVIEW_SCENES[i - 1], PREVIEW_SCENES[i + 1]].filter((s) => s && s.example)
    if (!near.length) return undefined
    const run = () => near.forEach((s) => preloadExample(s.id))
    if (typeof window.requestIdleCallback === 'function') {
      const h = window.requestIdleCallback(run, { timeout: 2000 })
      return () => window.cancelIdleCallback(h)
    }
    const t = window.setTimeout(run, 400)
    return () => window.clearTimeout(t)
  }, [scene.id])

  // Swipe the stage to step through the previews on a phone.
  const touch = useRef(null)
  const onTouchStart = (e) => { touch.current = [e.touches[0].clientX, e.touches[0].clientY] }
  const onTouchEnd = (e) => {
    const start = touch.current
    touch.current = null
    if (!start || compare) return
    const dx = e.changedTouches[0].clientX - start[0]
    const dy = e.changedTouches[0].clientY - start[1]
    if (Math.abs(dx) < 64 || Math.abs(dy) > 40) return
    // Step from what the list shows (the pick in flight, if any), so a second
    // swipe before the first example has loaded goes one further, not to the same place.
    const i = PREVIEW_SCENES.findIndex((s) => s.id === shownId)
    const next = PREVIEW_SCENES[Math.min(Math.max(i + (dx < 0 ? 1 : -1), 0), PREVIEW_SCENES.length - 1)]
    if (next.id !== shownId) pick(next.id)
  }

  const pinnedLabel = pinned
    ? (BRAND_ROLES.includes(pinned)
      ? sentence(roleLabel(harmony, BRAND_ROLES.indexOf(pinned)))
      : SUGGESTED.find(([r]) => r === pinned)?.[1])
    : null

  const list = (props) => (
    <SceneListbox
      orientation="vertical"
      label="Previews"
      sceneId={shownId}
      pendingId={pendingId}
      isLocked={isLocked}
      onPick={pick}
      {...props}
    />
  )

  const legend = !compare && (
    <Legend
      roles={roles}
      harmony={harmony}
      used={used}
      adjusted={adjusted}
      hover={hover}
      pinned={pinned}
      onHover={setHover}
      onPin={pin}
      sheet={layout === 'strip'}
      layerRef={layerRef}
    />
  )

  return (
    <EscapeLayerContext.Provider value={layerRef}>
    <div
      className="plb-modal plb-modal--preview"
      data-layout={layout}
      role="dialog"
      aria-modal="true"
      aria-label="Palette preview"
      tabIndex={-1}
      ref={dialogRef}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="plb-modal-card plb-modal-card--preview">
        <div className="plb-modal-head pvd-head">
          <span className="plb-pop-title">{compare ? 'Compare palettes' : 'Preview'}</span>
          {!compare && states.length > 1 && layout !== 'strip' && (
            <StateMenu states={states} value={stateId} onPick={pickState} layerRef={layerRef} />
          )}
          {!compare && states.length > 1 && layout === 'strip' && (
            <button
              ref={moreBtnRef}
              type="button"
              className="pvd-state-btn pvd-more-btn"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
            >
              More
            </button>
          )}
          <div className="plb-modal-modes" role="group" aria-label="Preview theme">
            {['light', 'dark'].map((m) => (
              <button
                key={m}
                type="button"
                className={mode === m ? 'plb-mode plb-mode--on' : 'plb-mode'}
                aria-pressed={mode === m}
                onClick={() => onChange({ mode: m })}
              >
                {m === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
          <button type="button" className="plb-pop-x pvd-close" aria-label="Close preview" onClick={onClose}><IcoX /></button>
        </div>

        {vision !== 'normal' && (
          <div className="pvd-vision" role="status">
            <span>Seeing it as: <b>{visionLabel}</b></span>
            <button type="button" className="pvd-link" onClick={onResetVision}>Normal</button>
          </div>
        )}

        <div className="pvd-body">
          {layout === 'rail' && (
            <aside className="pvd-rail">
              {list({ grouped: true, className: 'pvd-list' })}
              <p className="pvd-note">{NOTE}</p>
            </aside>
          )}

          <div className="pvd-main">
            {layout === 'menu' && (
              <div className="pvd-pickbar">
                <SceneMenu scene={sceneById(shownId)} sceneId={shownId} pendingId={pendingId} onPick={pick} isLocked={isLocked} layerRef={layerRef} />
                <span className="pvd-note">{NOTE}</span>
              </div>
            )}

            {layout === 'strip' && !compare && (
              <div className="pvd-showing" role="status">
                {pinned ? (
                  <>
                    <span>Showing: <b>{pinnedLabel}</b></span>
                    <button type="button" className="pvd-link" onClick={unpin}>Clear</button>
                  </>
                ) : (
                  <span className="pvd-showing-hint" aria-hidden="true">Tap Colours to trace a colour</span>
                )}
              </div>
            )}

            <div
              ref={stageRef}
              className={compare ? 'pvd-stage is-compare' : 'pvd-stage'}
              style={{ colorScheme: mode }}
              onTouchStart={layout === 'strip' ? onTouchStart : undefined}
              onTouchEnd={layout === 'strip' ? onTouchEnd : undefined}
            >
              {compare ? (
                <>
                  <section className="pvd-pane" aria-label="Current palette">
                    <p className="pvd-pane-l">Current <span>score {paletteScore}</span></p>
                    <Stage scene={scene} roles={roles} labels={labels} highlight={null} gate={gate} onUnlock={onUnlock} />
                  </section>
                  <section className="pvd-pane" aria-label={compare.label}>
                    <p className="pvd-pane-l">{compare.label}{compare.score != null && <span>score {compare.score}</span>}</p>
                    <Stage scene={scene} roles={compareRoles} labels={labels} highlight={null} gate={gate} onUnlock={onUnlock} />
                  </section>
                </>
              ) : (
                <Stage scene={scene} roles={roles} labels={labels} highlight={highlight} onRoles={onRoles} gate={gate} onUnlock={onUnlock} state={stateId} onState={pickState} />
              )}
            </div>

            {layout !== 'strip' && legend}
          </div>
        </div>

        {compare && (
          <div className="plb-modal-actions pvd-actions">
            <button type="button" className="btn btn-s btn-accent" onClick={onUse}>Use {compare.label}</button>
          </div>
        )}

        {layout === 'strip' && (
          <div className="pvd-dock">
            <SceneStrip sceneId={shownId} pendingId={pendingId} onPick={pick} isLocked={isLocked} />
            {!compare && (
              <button
                ref={coloursRef}
                type="button"
                className="pvd-colours"
                aria-haspopup="dialog"
                aria-expanded={sheet}
                onClick={() => setSheet(true)}
              >
                Colours
              </button>
            )}
          </div>
        )}

        {layout === 'strip' && moreOpen && states.length > 1 && (
          <div ref={moreSheetRef} className="pvd-sheet pvd-state-sheet" role="dialog" aria-label="State">
            <button type="button" className="plb-pop-x pvd-close pvd-sheet-x" aria-label="Close state menu" onClick={closeMoreSheet}><IcoX /></button>
            <p className="pvd-sheet-t">State</p>
            <StateList states={states} value={stateId} listRef={moreListRef} onPick={(id, choose) => { pickState(id); if (choose) closeMoreSheet() }} />
          </div>
        )}

        {layout === 'strip' && sheet && (
          <div ref={sheetRef} className="pvd-sheet" role="dialog" aria-label="Where each colour lands">
            <button type="button" className="plb-pop-x pvd-close pvd-sheet-x" aria-label="Close colours" onClick={closeSheet}><IcoX /></button>
            {legend}
            <p className="pvd-note">{NOTE}</p>
          </div>
        )}
      </div>
    </div>
    </EscapeLayerContext.Provider>
  )
}
