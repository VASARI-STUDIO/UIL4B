import { useEffect, useMemo, useRef, useState } from 'react'

// ── ColorPickerPop ────────────────────────────────────────────────────────────
// Token-styled replacement for the OS-native <input type="color"> popup: a
// swatch trigger that opens a small popover with a saturation/value pad, hue
// slider, hex field, and preset swatches. Controlled: emits normalised
// lowercase #rrggbb through onChange on every committed change.

const HEX_RE = /^#?([0-9a-f]{6})$/i
const SHORT_HEX_RE = /^#?([0-9a-f]{3})$/i

function normalizeHex(raw) {
  if (typeof raw !== 'string') return null
  const long = raw.trim().match(HEX_RE)
  if (long) return `#${long[1].toLowerCase()}`
  const short = raw.trim().match(SHORT_HEX_RE)
  if (short) return `#${short[1].toLowerCase().split('').map((c) => c + c).join('')}`
  return null
}

function hexToHsv(hex) {
  const n = normalizeHex(hex) || '#000000'
  const r = parseInt(n.slice(1, 3), 16) / 255
  const g = parseInt(n.slice(3, 5), 16) / 255
  const b = parseInt(n.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

function hsvToHex({ h, s, v }) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to2 = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${to2(r)}${to2(g)}${to2(b)}`
}

const DEFAULT_SWATCHES = [
  '#18181b', '#f4f4f5', '#ef4444', '#f59e0b', '#22c55e',
  '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#78716c',
]

export default function ColorPickerPop({ value, onChange, ariaLabel = 'Custom colour', swatches = DEFAULT_SWATCHES }) {
  const [open, setOpen] = useState(false)
  const current = normalizeHex(value) || '#000000'
  // hsv is the working state while the popover is open — it preserves hue when
  // the colour passes through black/white (where hue is lost in hex round-trips).
  const [hsv, setHsv] = useState(() => hexToHsv(current))
  const [hexText, setHexText] = useState(current)
  const wrapRef = useRef(null)
  const padRef = useRef(null)
  const draggingRef = useRef(false)

  // Re-seed the working state each time the popover opens (or the outside value
  // changes while closed) so it always starts from the live colour.
  useEffect(() => {
    if (!open && !draggingRef.current) {
      setHsv(hexToHsv(current))
      setHexText(current)
    }
  }, [current, open])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const commit = (next) => {
    setHsv(next)
    const hex = hsvToHex(next)
    setHexText(hex)
    onChange?.(hex)
  }

  const padPointer = (e) => {
    const pad = padRef.current
    if (!pad) return
    const rect = pad.getBoundingClientRect()
    const s = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const v = 1 - Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    commit({ h: hsv.h, s, v })
  }

  const hueHex = useMemo(() => hsvToHex({ h: hsv.h, s: 1, v: 1 }), [hsv.h])
  const liveHex = hsvToHex(hsv)

  const applyHexText = () => {
    const hex = normalizeHex(hexText)
    if (!hex) { setHexText(liveHex); return }
    setHsv(hexToHsv(hex))
    setHexText(hex)
    onChange?.(hex)
  }

  return (
    <div className="cpk-wrap" ref={wrapRef}>
      <button
        type="button"
        className="cpk-trigger"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cpk-trigger-chip" style={{ background: current }} aria-hidden="true" />
      </button>

      {open && (
        <div className="cpk-pop" role="dialog" aria-label={ariaLabel}>
          <div
            className="cpk-pad"
            ref={padRef}
            style={{ backgroundColor: hueHex }}
            role="slider"
            aria-label="Saturation and brightness"
            aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
            tabIndex={0}
            onPointerDown={(e) => {
              draggingRef.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              padPointer(e)
            }}
            onPointerMove={(e) => { if (draggingRef.current) padPointer(e) }}
            onPointerUp={(e) => {
              draggingRef.current = false
              e.currentTarget.releasePointerCapture(e.pointerId)
            }}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.1 : 0.02
              if (e.key === 'ArrowRight') { e.preventDefault(); commit({ ...hsv, s: Math.min(1, hsv.s + step) }) }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); commit({ ...hsv, s: Math.max(0, hsv.s - step) }) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); commit({ ...hsv, v: Math.min(1, hsv.v + step) }) }
              else if (e.key === 'ArrowDown') { e.preventDefault(); commit({ ...hsv, v: Math.max(0, hsv.v - step) }) }
            }}
          >
            <span
              className="cpk-pad-thumb"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: liveHex }}
              aria-hidden="true"
            />
          </div>

          <input
            className="cpk-hue"
            type="range"
            min="0"
            max="360"
            step="1"
            value={Math.round(hsv.h)}
            aria-label="Hue"
            onChange={(e) => commit({ ...hsv, h: +e.target.value })}
          />

          <div className="cpk-row">
            <span className="cpk-chip" style={{ background: liveHex }} aria-hidden="true" />
            <input
              className="cpk-hex"
              type="text"
              value={hexText}
              spellCheck={false}
              aria-label="Hex colour"
              onChange={(e) => setHexText(e.target.value)}
              onBlur={applyHexText}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyHexText() } }}
            />
          </div>

          <div className="cpk-swatches" role="listbox" aria-label="Preset colours">
            {swatches.map((sw) => (
              <button
                key={sw}
                type="button"
                role="option"
                aria-selected={sw === liveHex}
                className={`cpk-swatch${sw === liveHex ? ' is-active' : ''}`}
                style={{ background: sw }}
                aria-label={sw}
                title={sw}
                onClick={() => {
                  setHsv(hexToHsv(sw))
                  setHexText(sw)
                  onChange?.(sw)
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
