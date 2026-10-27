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
// popover or sheet registers itself as an Escape layer and requestClose closes
// that first.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import PreviewScene from './PalettePreview'
import ToolIcon from '../tool/ToolIcon'
import useMediaQuery from '../../hooks/useMediaQuery'
import useModalDialog from '../../hooks/useModalDialog'
import { PREVIEW_GROUPS, PREVIEW_SCENES, sceneById } from '../../data/palettePreviewScenes'
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

// Scenes with no surface to sit on: a ratio "on surface" means nothing there.
const SURFACELESS = new Set(['poster'])

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

// Registers `close` as the layer Escape closes first while `open`.
function useEscapeLayer(layerRef, open, close) {
  useEffect(() => {
    if (!open) return undefined
    layerRef.current = close
    return () => { if (layerRef.current === close) layerRef.current = null }
  }, [layerRef, open, close])
}

// ── The scene list ──────────────────────────────────────────────────────────

// `onChoose` fires on a click or Enter/Space on an option, not on the arrow keys
// that also select, so a popover can close on a choice and stay open to browse.
function SceneListbox({ grouped, orientation, sceneId, onPick, onChoose, isLocked, label, className, listRef, onScroll }) {
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
function SceneMenu({ scene, sceneId, onPick, isLocked, layerRef }) {
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
function SceneStrip({ sceneId, onPick, isLocked }) {
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
      isLocked={isLocked}
      onPick={onPick}
      className="pvd-strip"
      onScroll={measure}
    />
  )
}

// ── The legend ──────────────────────────────────────────────────────────────

function Legend({ roles, harmony, used, hover, pinned, onHover, onPin, sheet }) {
  const failFor = (role) => roles.fails.find((f) => f.role === role)
  const unset = new Set(roles.unset)

  const chip = (role, label, i) => {
    const off = Boolean(used) && !used.includes(role)
    const fail = failFor(role)
    const on = pinned === role
    const mouse = (fn) => (e) => { if (e.pointerType === 'mouse') fn() }
    return (
      <button
        key={role}
        type="button"
        className={`pvd-chip${on ? ' is-on' : ''}${off ? ' is-off' : ''}${fail ? ' is-fail' : ''}`}
        aria-pressed={on}
        aria-disabled={off || undefined}
        title={off ? 'Not in this preview' : undefined}
        onPointerEnter={off ? undefined : mouse(() => onHover(role))}
        onPointerLeave={mouse(() => onHover(null))}
        onFocus={off ? undefined : () => onHover(role)}
        onBlur={() => onHover(null)}
        onClick={off ? undefined : () => onPin(role)}
      >
        <i className="pvd-sw" style={{ background: swatchOf(roles, role) }} aria-hidden="true" />
        <span className="pvd-chip-t">
          <span className="pvd-chip-l">{label}</span>
          <span className="pvd-chip-hex">{swatchOf(roles, role).toUpperCase()}</span>
        </span>
        {fail && (
          <span className="pvd-chip-fail">
            <ToolIcon name="warning-circle" size={14} />
            {fail.ratio.toFixed(1)}:1 on surface
          </span>
        )}
        {i != null && unset.has(role) && <span className="pvd-chip-note">Not set, using Primary</span>}
        {off && <span className="sr-only">Not in this preview</span>}
        {hover === role && <span className="sr-only">Outlined in the preview</span>}
      </button>
    )
  }

  let note = null
  if (roles.empty) note = 'Add colours to see your own roles'
  else if (roles.lowChroma) note = 'Your palette has no strong colour, so buttons use a neutral'

  return (
    <div className={sheet ? 'pvd-legend is-sheet' : 'pvd-legend'}>
      <p className="pvd-legend-t">Where each colour lands</p>
      <div className="pvd-chips" role="group" aria-label="Your colours">
        {BRAND_ROLES.map((role, i) => chip(role, sentence(roleLabel(harmony, i)), i))}
      </div>
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

function Stage({ scene, roles, highlight, onRoles, gate, onUnlock }) {
  const locked = gate !== 'open'
  return (
    <div className={locked ? 'pvd-scene is-locked' : 'pvd-scene'}>
      <div className="pvd-scene-in" inert={locked}>
        <PreviewScene key={scene.id} roles={roles} sceneId={scene.id} highlight={highlight} onRoles={onRoles} />
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

  const layerRef = useRef(null)
  const requestClose = useCallback(() => {
    if (layerRef.current) layerRef.current()
    else onClose()
  }, [onClose])
  const dialogRef = useModalDialog(requestClose)

  const { mode, compare } = preview
  const scene = sceneById(preview.scene)
  const gate = scene.free || (isPro && planKnown) ? 'open' : planKnown ? 'locked' : 'pending'
  const isLocked = useCallback((s) => !s.free && !(isPro && planKnown), [isPro, planKnown])

  // The palette as the board shows it: through the colour-vision simulation
  // when one is on. Roles are derived once per palette and mode.
  const shown = useMemo(
    () => (vision === 'normal' ? colors : colors.map((c) => simCvd(c, vision))),
    [colors, vision],
  )
  // A scene with no surface has no "on surface" floor to fail, so it flags and
  // lists nothing.
  const surfaceless = SURFACELESS.has(scene.id)
  const scoped = useCallback((r) => (surfaceless && r.fails.length ? { ...r, fails: [] } : r), [surfaceless])
  const baseRoles = useMemo(() => derivePaletteRoles(shown, { mode, harmony }), [shown, mode, harmony])
  const roles = useMemo(() => scoped(baseRoles), [scoped, baseRoles])
  const compareColors = compare?.colors
  const compareRoles = useMemo(() => {
    if (!compareColors) return null
    const cols = vision === 'normal' ? compareColors : compareColors.map((c) => simCvd(c, vision))
    return scoped(derivePaletteRoles(cols, { mode, harmony }))
  }, [compareColors, vision, mode, harmony, scoped])

  // Legend state: hover and focus outline transiently; a click pins.
  const [hover, setHover] = useState(null)
  const [pinned, setPinned] = useState(null)
  const [used, setUsed] = useState(null)
  const onRoles = useCallback((list) => {
    setUsed((prev) => (prev && prev.length === list.length && list.every((r) => prev.includes(r)) ? prev : list))
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
    onChange({ scene: id })
  }, [onChange])

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
    const i = PREVIEW_SCENES.findIndex((s) => s.id === scene.id)
    const next = PREVIEW_SCENES[Math.min(Math.max(i + (dx < 0 ? 1 : -1), 0), PREVIEW_SCENES.length - 1)]
    if (next.id !== scene.id) pick(next.id)
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
      sceneId={scene.id}
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
      hover={hover}
      pinned={pinned}
      onHover={setHover}
      onPin={pin}
      sheet={layout === 'strip'}
    />
  )

  return (
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
              <p className="pvd-note">Sample content for a made-up product, Fernway.</p>
            </aside>
          )}

          <div className="pvd-main">
            {layout === 'menu' && (
              <div className="pvd-pickbar">
                <SceneMenu scene={scene} sceneId={scene.id} onPick={pick} isLocked={isLocked} layerRef={layerRef} />
                <span className="pvd-note">Sample content for a made-up product, Fernway.</span>
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
              onTouchStart={layout === 'strip' ? onTouchStart : undefined}
              onTouchEnd={layout === 'strip' ? onTouchEnd : undefined}
            >
              {compare ? (
                <>
                  <section className="pvd-pane" aria-label="Current palette">
                    <p className="pvd-pane-l">Current <span>score {paletteScore}</span></p>
                    <Stage scene={scene} roles={roles} highlight={null} gate={gate} onUnlock={onUnlock} />
                  </section>
                  <section className="pvd-pane" aria-label={compare.label}>
                    <p className="pvd-pane-l">{compare.label}{compare.score != null && <span>score {compare.score}</span>}</p>
                    <Stage scene={scene} roles={compareRoles} highlight={null} gate={gate} onUnlock={onUnlock} />
                  </section>
                </>
              ) : (
                <Stage scene={scene} roles={roles} highlight={highlight} onRoles={onRoles} gate={gate} onUnlock={onUnlock} />
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
            <SceneStrip sceneId={scene.id} onPick={pick} isLocked={isLocked} />
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

        {layout === 'strip' && sheet && (
          <div ref={sheetRef} className="pvd-sheet" role="dialog" aria-label="Where each colour lands">
            <button type="button" className="plb-pop-x pvd-close pvd-sheet-x" aria-label="Close colours" onClick={closeSheet}><IcoX /></button>
            {legend}
            <p className="pvd-note">Sample content for a made-up product, Fernway.</p>
          </div>
        )}
      </div>
    </div>
  )
}
