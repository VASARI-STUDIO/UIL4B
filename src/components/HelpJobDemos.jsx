// The small working pictures inside the Help page's answers (/learn/help).
//
// Each one is drawn by the function the tool itself runs, so the picture is the
// claim: the tint strip is generateTintScale(), the contrast reading is
// contrastRatio(), the type ladder is stepPx(), the allowance bars are
// AI_LIMITS, the counts are the tool lists. Nothing here is a typed number.
import { useId, useMemo, useRef, useState } from 'react'
import { contrastRatio, generateTintScale, T_LABELS } from '../utils/colors'
import { stepName, stepPx } from '../utils/fluidType'
import { DEFAULT_DESIGN, tintConfigFor } from '../data/designDefaults'
import { freeFormats } from '../config/exportFormats'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../config/plans'
import { LIVE_TOOLS, SOON_TOOLS } from '../data/helpStart'
import { SCALE_RATIOS } from './spectrum/spectrumKit'
import { PH_REGULAR } from './spectrum/phosphorRegular'
import PhIcon from './spectrum/PhIcon'

/** The page ink, as a reference for the "text on this stop" reading. */
const INK = '#0F0F10'
const WHITE = '#FFFFFF'
const HEX = /^#[0-9a-f]{6}$/i

function verdict(ratio) {
  if (ratio >= 4.5) return 'passes for body text'
  if (ratio >= 3) return 'large text only'
  return 'fails for text'
}

/**
 * The eleven stops generated from one base colour, pickable, with the contrast
 * a stop gives to white or near-black text. A press or a drag across the strip
 * picks the stop under the pointer.
 */
export function ColourDemo() {
  const base = useMemo(() => tintConfigFor(), [])
  const group = useId()
  const stripRef = useRef(null)
  const dragging = useRef(false)
  const [hex, setHex] = useState(base.hex.toLowerCase())
  const [draft, setDraft] = useState(base.hex.toUpperCase())
  const [pick, setPick] = useState(base.anchor)

  const ramp = useMemo(() => generateTintScale({ ...base, hex }), [base, hex])
  const files = useMemo(() => freeFormats(), [])
  if (ramp.length !== T_LABELS.length) return null

  const stop = ramp[pick]
  const onWhite = contrastRatio(stop, WHITE)
  const onInk = contrastRatio(stop, INK)
  const best = onWhite >= onInk ? { name: 'White', ratio: onWhite } : { name: 'Near-black', ratio: onInk }

  const applyHex = (value) => {
    setDraft(value.toUpperCase())
    if (HEX.test(value)) setHex(value.toLowerCase())
  }
  const pickAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const label = el && el.closest('.hlr-stop')
    if (!label || !stripRef.current?.contains(label)) return
    setPick(Number(label.dataset.index))
  }

  return (
    <div className="hlr-demo">
      <div className="hlr-seed">
        <input
          className="hlr-seed-pick"
          type="color"
          value={hex}
          onChange={(e) => applyHex(e.target.value)}
          aria-label="Base colour"
        />
        <input
          className="hlr-seed-hex"
          type="text"
          value={draft}
          onChange={(e) => applyHex(e.target.value)}
          aria-label="Base colour hex"
          aria-invalid={!HEX.test(draft)}
          spellCheck="false"
          autoComplete="off"
          maxLength={7}
        />
      </div>
      <fieldset
        className="hlr-strip"
        ref={stripRef}
        onPointerDown={(e) => { dragging.current = true; pickAt(e) }}
        onPointerMove={(e) => { if (dragging.current) pickAt(e) }}
        onPointerUp={() => { dragging.current = false }}
        onPointerCancel={() => { dragging.current = false }}
        onPointerLeave={() => { dragging.current = false }}
      >
        <legend className="hlr-vh">Tint stops, {T_LABELS[0]} to {T_LABELS[T_LABELS.length - 1]}</legend>
        {ramp.map((color, i) => (
          <label className="hlr-stop" key={T_LABELS[i]} data-index={i}>
            <input
              type="radio"
              name={group}
              checked={i === pick}
              onChange={() => setPick(i)}
              aria-label={`Stop ${T_LABELS[i]}, ${color.toUpperCase()}`}
            />
            <span className="hlr-stop-sw" style={{ background: color }} aria-hidden="true" />
            <span className="hlr-stop-n">{T_LABELS[i]}</span>
          </label>
        ))}
      </fieldset>
      <p className="hlr-read" aria-live="polite">
        <b>{T_LABELS[pick]} {stop.toUpperCase()}</b>
        <span>{best.name} text on it: {best.ratio.toFixed(2)}:1, {verdict(best.ratio)}</span>
      </p>
      <div className="hlr-leaves">
        <h3>Leaves as</h3>
        <ul>
          {files.map((f) => <li key={f.id}>{f.name}</li>)}
        </ul>
      </div>
    </div>
  )
}

/** The ladder for a base size and a ratio: size = base x ratio^step. */
export function TypeDemo() {
  const { base, ratio: startRatio } = DEFAULT_DESIGN.typeScale
  const [ratio, setRatio] = useState(startRatio)
  const steps = [3, 2, 1, 0, -1]
  return (
    <div className="hlr-demo">
      <div className="hlr-seg" role="group" aria-label="Ratio">
        {SCALE_RATIOS.map((r) => (
          <button key={r} type="button" aria-pressed={r === ratio} onClick={() => setRatio(r)}>{r}</button>
        ))}
      </div>
      <div className="hlr-ladder">
        {steps.map((exp) => {
          const px = stepPx(base, ratio, exp, 'half')
          return (
            <div key={exp}>
              <span>{stepName(exp)} {px}px</span>
              <b style={{ fontSize: `${Math.min(px, 56)}px` }}>Ferry times</b>
            </div>
          )
        })}
      </div>
      <p className="hlr-note">From a {base}px base. Each step is the one before it times the ratio.</p>
    </div>
  )
}

/** Names drawn from the same Phosphor set the library page uses. */
const ICON_SAMPLE = ['arrow-right', 'check', 'magnifying-glass', 'image', 'download-simple', 'plus', 'palette', 'swatches', 'eyedropper', 'cube']
  .filter((name) => PH_REGULAR[name])

export function IconsDemo() {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = ICON_SAMPLE.filter((name) => name.includes(needle))
  return (
    <div className="hlr-demo">
      <label className="hlr-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="arrow" aria-label="Search the sample icons" />
      </label>
      {shown.length > 0 ? (
        <ul className="hlr-icons">
          {shown.map((name) => (
            <li key={name} title={name}>
              <PhIcon name={name} />
              <span className="hlr-vh">{name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hlr-note">No sample icon is called that. The library has many more than these.</p>
      )}
      <p className="hlr-note">A small sample, drawn from the library.</p>
    </div>
  )
}

export function FilesDemo() {
  return (
    <div className="hlr-demo">
      <p className="hlr-drop">The tool opens on an empty drop zone. Drop an image or a video.</p>
    </div>
  )
}

export function SaveDemo() {
  return (
    <div className="hlr-demo hlr-store">
      <div>
        <b>Signed out</b>
        <span>Saved in this browser only.</span>
      </div>
      <div>
        <b>Free account</b>
        <span>{FREE_SAVE_LIMITS.projects} projects and {FREE_SAVE_LIMITS.customIcons} custom icons, on any device.</span>
      </div>
    </div>
  )
}

export function CostDemo() {
  const { free, pro } = AI_LIMITS
  return (
    <div
      className="hlr-demo hlr-allow"
      role="img"
      aria-label={`AI allowance a day: Free ${free.daily}, Pro ${pro.daily}, same model`}
    >
      <div>
        <span>Free</span>
        <span className="hlr-bar"><i style={{ width: `${(free.daily / pro.daily) * 100}%` }} /></span>
        <output>{free.daily} a day</output>
      </div>
      <div>
        <span>Pro</span>
        <span className="hlr-bar"><i style={{ width: '100%' }} /></span>
        <output>{pro.daily} a day</output>
      </div>
    </div>
  )
}

export function SoonDemo() {
  const open = LIVE_TOOLS.length
  const soon = SOON_TOOLS.length
  return (
    <div className="hlr-demo">
      <div
        className="hlr-count"
        role="img"
        aria-label={`${open + soon} tools: ${open} open, ${soon} still being built`}
      >
        {Array.from({ length: open + soon }, (_, i) => <i key={i} className={i >= open ? 'is-soon' : undefined} />)}
      </div>
      <p className="hlr-count-key">
        <span>Filled: {open} open now</span>
        <span>Dashed: {soon} still being built</span>
      </p>
    </div>
  )
}
