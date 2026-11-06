import { useCallback, useEffect, useRef, useState } from 'react'
import { route } from '../../spectrum/spectrumFacts'
import { ratio } from '../../spectrum/spectrumKit'
import { Radios, ToolLink } from './tryParts'
import { useNear } from './useNear'
import { ADJ, KB_NAMES, ROLES, SAMPLE, TEMP, VISIONS, build, mix, snap, statusLine } from './paletteLogic'

// PALETTE BUILDER. Kerbside's five colours in the five roles the full tool uses,
// with lock, Randomise, Adjust all and Vision. "Open in Palette Builder" carries
// the colours on screen as ?c=, which the full tool reads for any visitor, so a
// free visitor lands on the same colours. The colour engine (the app's own adjust,
// vision, ramp and naming) is read in once the frame is near the window.

const LOCK_OPEN = 'M208 80H96V56a32 32 0 0 1 32-32c15.37 0 29.2 11 32.16 25.59a8 8 0 0 0 15.68-3.18C171.32 24.15 151.2 8 128 8a48.05 48.05 0 0 0-48 48v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16m0 128H48V96h160z'
const LOCK_FILL = 'M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Z'
const CHEVRON = 'M213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32'
const ZERO = { h: 0, s: 0, b: 0, temp: 0 }
const RAMP_TONES = [30, 45, 60, 75, 90]
const PHONE_MODES = ['Locks', 'Temperature', 'Vision']
const ROW_KEYS = ['Home', 'End', 'PageUp', 'PageDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']

const inkOn = (hex) => (ratio('#EFEEEA', hex) >= ratio('#0B0C0E', hex) ? '#EFEEEA' : '#0B0C0E')

let enginePromise
/** The app's colour engine, read once. */
function loadEngine() {
  if (!enginePromise) {
    enginePromise = Promise.all([import('../../../utils/colors.js'), import('../../../utils/paletteNames.js')]).then(([c, n]) => ({
      applyAdjust: c.applyAdjust,
      simCvd: c.simCvd,
      colorName: n.colorName,
      ramp(hex) {
        try {
          const [h, ch] = c.hexToHct(hex)
          return RAMP_TONES.map((t) => c.hctToHex(h, ch, t))
        } catch {
          const [h, s] = c.hexToHsl(hex)
          return RAMP_TONES.map((t) => c.hslToHex(h, Math.min(100, s * 0.6), t))
        }
      },
    }))
  }
  return enginePromise
}

export default function PaletteTool() {
  const root = useRef(null)
  const timer = useRef(0)
  const kb = useRef(false)
  const [engine, setEngine] = useState(null)
  const [base, setBase] = useState(SAMPLE)
  const [locked, setLocked] = useState([false, false, false, false, false])
  const [adj, setAdj] = useState(ZERO)
  const [vis, setVis] = useState('normal')
  const [copied, setCopied] = useState('')
  const [failed, setFailed] = useState(false)
  const [note, setNote] = useState({ text: '', vision: false })
  // `carried`: a move that carries the colours over has been made. `fresh`: the carry-over line is waiting to be read.
  const [flow, setFlow] = useState({ carried: false, fresh: false })
  const [mode, setMode] = useState(0)

  useEffect(() => () => clearTimeout(timer.current), [])
  const fetchEngine = useCallback(() => { loadEngine().then(setEngine).catch(() => {}) }, [])
  useNear(root, fetchEngine)

  // A move that counts: the first one that carries opens the carry-over line, the next clears it.
  const moved = useCallback((carries) => setFlow((f) => (!f.carried && carries ? { carried: true, fresh: true } : f.fresh ? { ...f, fresh: false } : f)), [])

  const adjusted = engine && (adj.h || adj.s || adj.b || adj.temp) ? engine.applyAdjust(base, adj).map((x) => x.toUpperCase()) : base
  const sim = engine && vis !== 'normal' ? adjusted.map((x) => engine.simCvd(x, vis).toUpperCase()) : adjusted
  const names = adjusted.map((hex, i) => KB_NAMES[hex.toUpperCase()] || (engine ? engine.colorName(hex) : ROLES[i]))

  const randomise = useCallback(() => {
    setBase((b) => mix(b, locked, build(Math.floor(Math.random() * 360))))
    setNote({ text: '', vision: false })
    moved(!locked.every(Boolean))
  }, [locked, moved])

  // Space on the tool itself (not on a control) randomises, as in the full tool.
  useEffect(() => {
    const stage = root.current?.closest('article')
    if (!stage) return undefined
    const onKey = (e) => {
      if (e.target !== stage || (e.code !== 'Space' && e.key !== ' ')) return
      e.preventDefault()
      if (!e.repeat) randomise()
    }
    stage.addEventListener('keydown', onKey)
    return () => stage.removeEventListener('keydown', onKey)
  }, [randomise])

  const copy = (hex, key) => {
    // Clipboard access can be refused; the label then says so.
    const done = (bad) => {
      setFailed(bad)
      setCopied(key)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => { setCopied(''); setFailed(false) }, 2000)
    }
    if (!navigator.clipboard?.writeText) { done(true); return }
    navigator.clipboard.writeText(hex).then(() => done(false), () => done(true))
  }

  const toggleLock = (i, e) => {
    // A pointer press hands focus back to the tool, so Space randomises rather than re-pressing the lock.
    if (e.detail > 0) root.current?.closest('article')?.focus({ preventScroll: true })
    const next = locked.slice()
    next[i] = !next[i]
    setLocked(next)
    setNote({ text: '', vision: false })
    if (next[i]) moved(false)
  }

  const onAdj = (field, e) => {
    let v = parseInt(e.target.value, 10)
    // A key press moves one step, or the slider could never leave a detent.
    if (!kb.current) v = snap(field, v)
    if (v !== adj[field.k]) { setAdj((a) => ({ ...a, [field.k]: v })); setNote({ text: field.note(v), vision: false }) }
  }
  const release = (e) => { if (!e || e.type === 'pointerup' || ROW_KEYS.includes(e.key)) moved(true) }
  const onVis = (key) => {
    if (key === vis) return
    setVis(key)
    setNote({ text: key === 'normal' ? 'Pick one to split each colour in two.' : `Bottom halves show ${key}.`, vision: true })
  }

  const hexes = adjusted
  const line = statusLine({ copied, failed, locked, carried: flow.carried, fresh: flow.fresh, note: note.text, noteIsVision: note.vision, hexes })
  const href = `${route('palette')}?c=${hexes.map((h) => h.slice(1)).join(',')}`

  const slider = (f, cls) => (
    <input
      id={`ht-adj-${cls}${f.k}`}
      className="ht-rng"
      type="range"
      min={f.min}
      max={f.max}
      step={1}
      value={adj[f.k]}
      aria-label={cls ? f.label : undefined}
      aria-valuetext={f.text(adj[f.k])}
      onChange={(e) => onAdj(f, e)}
      onPointerDown={() => { kb.current = false }}
      onPointerUp={release}
      onKeyDown={() => { kb.current = true }}
      onKeyUp={(e) => { kb.current = false; release(e) }}
    />
  )
  const visionSelect = (id) => (
    <span className="ht-selw">
      <label htmlFor={id}>Vision</label>
      <select id={id} className="ht-sel" value={vis} onChange={(e) => onVis(e.target.value)}>
        {VISIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <svg className="ht-chev" width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d={CHEVRON} /></svg>
    </span>
  )

  return (
    <>
      <div className="ht-tool ht-pal" ref={root}>
        <div className="ht-tb ht-pal-tb">
          <button type="button" className="ht-btn" aria-keyshortcuts="Space" onClick={randomise}>
            Randomise<span className="ht-key" aria-hidden="true">Space</span>
          </button>
          {visionSelect('ht-vis')}
        </div>

        <div className="ht-pal-cols" role="group" aria-label="Palette, five colours">
          {ROLES.map((role, i) => {
            const hex = adjusted[i]
            const shown = sim[i]
            return (
              <div key={role} className="ht-pal-col" style={{ '--ci': inkOn(hex), '--si': inkOn(shown) }}>
                <i className="ht-pal-gr ht-pal-gr--t" aria-hidden="true" style={{ background: hex }} />
                <i className="ht-pal-gr ht-pal-gr--b" aria-hidden="true" style={{ background: shown }} />
                <button
                  type="button"
                  className="ht-lock"
                  aria-pressed={locked[i]}
                  aria-label={`${locked[i] ? 'Unlock' : 'Lock'} ${role}, ${names[i]}`}
                  onClick={(e) => toggleLock(i, e)}
                >
                  <span className="ht-lk"><svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d={locked[i] ? LOCK_FILL : LOCK_OPEN} /></svg></span>
                </button>
                <div className="ht-pal-bot">
                  <span className="ht-pal-ramp" aria-hidden="true">
                    {(engine ? engine.ramp(hex) : []).map((t, k) => <i key={RAMP_TONES[k]} style={{ background: t }} />)}
                  </span>
                  <b className="ht-pal-nm">{names[i]}</b>
                  <span className="ht-pal-l2">
                    <button type="button" className="ht-pal-hex" aria-label={`Copy ${role} hex ${hex}`} onClick={() => copy(hex, `hex-${i}`)}>
                      <span className="ht-pal-swap">
                        <span style={{ opacity: copied === `hex-${i}` ? 0 : 1 }}>{hex}</span>
                        <span aria-hidden="true" style={{ opacity: copied === `hex-${i}` ? 1 : 0 }}>{failed ? 'Copy failed' : 'Copied'}</span>
                      </span>
                    </button>
                    <span className="ht-pal-role">{role}</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="ht-adj" role="group" aria-label="Adjust all">
          {ADJ.map((f) => (
            <div key={f.k} className="ht-adj-c">
              <div className="ht-adj-l"><label htmlFor={`ht-adj-${f.k}`}>{f.label}</label><span className="ht-val">{f.fmt(adj[f.k])}</span></div>
              {slider(f, '')}
            </div>
          ))}
        </div>

        {/* Phone: the toolbar and the four sliders become one control under a three-way choice. */}
        <div className="ht-well">
          <Radios label="What the Palette Builder can do" items={PHONE_MODES} value={mode} onPick={setMode} className="ht-ab" />
          <div className="ht-ctl">
            {mode === 0 && <button type="button" className="ht-btn ht-grow" onClick={randomise}>Randomise the rest</button>}
            {mode === 1 && (
              <>
                <span className="ht-end" aria-hidden="true">Cooler</span>
                {slider(TEMP, 'p-')}
                <span className="ht-end" aria-hidden="true">Warmer</span>
              </>
            )}
            {mode === 2 && visionSelect('ht-vis-p')}
          </div>
        </div>
      </div>
      <ToolLink to={href} fill={flow.carried} line={line} short={line}>Open in Palette Builder</ToolLink>
    </>
  )
}
