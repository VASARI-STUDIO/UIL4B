import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import usePopover from '../hooks/usePopover'
import { COLOR_FORMATS, formatColor, normalizeHex, parseColor } from '../utils/colorFormats'
import { addRecentColor, getRecentColors } from '../utils/recentColors'

// ── ColorPickerPop ────────────────────────────────────────────────────────────
// Token-styled replacement for the OS-native <input type="color"> popup: a
// swatch trigger that opens a small popover with a saturation/value pad, hue
// slider, hex field, and preset swatches. Controlled: emits normalised
// lowercase #rrggbb through onChange on every committed change.
//
// Dismissal, focus and edge-flipping come from usePopover — the one popover
// contract shared with the nav popovers and the tool micro-menus. This file
// used to hand-roll outside-click and Escape and did neither of the other two:
// opening it left focus on the trigger (so a keyboard user had to tab through
// the page to reach the pad), Escape dropped focus to <body>, and next to the
// right-hand edge of a narrow viewport the panel was simply clipped.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE FOUNDER ASKED FOR, AND WHAT IS HERE
// ─────────────────────────────────────────────────────────────────────────────
// Request (2026-08-08): "Solid / Gradient / Image tabs, an SV field, hue and
// alpha sliders, a format dropdown and saved swatches." The queue item added:
// "Shared component — scope which surfaces adopt it before building."
//
// The SV field, hue slider and preset swatches already existed. Added here:
//
//   FORMAT DROPDOWN — hex / rgb / hsl. A LENS, not a second value: the
//   component still emits `#rrggbb` whatever is on screen. Widening the emit
//   contract is a much larger change than a display preference earns, and every
//   consumer would have to be taught to read it.
//
//   SAVED SWATCHES — the last twelve colours committed from ANY picker in the
//   app, shared across surfaces (utils/recentColors.js). A colour you just
//   mixed is one you are likely to want in the next tool, and matching it again
//   by eye is the tedious part of building a system.
//
// NOT HERE, and both omissions are the same decision rather than an oversight:
// this component has exactly three call sites, and a control none of them can
// consume is dead code that merely looks finished.
//
//   ALPHA SLIDER. Nothing downstream can store an alpha. A gradient STOP is
//   `{ color, position }` and its alpha would have to reach gradientCss,
//   gradientSvg, every export format, the saved-gradient shape and the library
//   data before it meant anything. A PALETTE swatch is worse than unsupported —
//   the contrast maths, the tint scales and the exports all assume an opaque
//   colour, so a translucent one would not be a nicer colour, it would be a
//   corrupt palette. `formatColor` in utils/colorFormats.js already carries
//   alpha and is tested for it, so the day a stop model can hold one, the
//   slider is a small change. Transparent gradient stops are their own feature.
//
//   SOLID / GRADIENT / IMAGE TABS. Nothing can consume a gradient or an image
//   from here either — the three call sites are a palette swatch, a gradient
//   stop (which cannot itself be a gradient) and an icon colour. Which surface
//   should take a gradient or image fill is product direction, not a defect, so
//   it is raised in docs/PROPOSALS.md rather than guessed at.

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

export default function ColorPickerPop({
  value,
  onChange,
  ariaLabel = 'Custom colour',
  swatches = DEFAULT_SWATCHES,
  disabled = false,
  onDisabledClick,
}) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState('hex')
  const [recents, setRecents] = useState(getRecentColors)
  // useId, not a counter: two pickers can be open at once (a gradient has a
  // stop picker per stop) and a duplicated id would point every label at the
  // first list.
  const recentsId = useId()
  const current = normalizeHex(value) || '#000000'
  // hsv is the working state while the popover is open — it preserves hue when
  // the colour passes through black/white (where hue is lost in hex round-trips).
  const [hsv, setHsv] = useState(() => hexToHsv(current))
  const [hexText, setHexText] = useState(current)
  const padRef = useRef(null)
  const draggingRef = useRef(false)
  const close = useCallback(() => setOpen(false), [])
  // Land on the saturation/value pad, not the panel: this popover's whole
  // purpose is that one control, and anything else costs a keyboard user a tab
  // every single time they open it.
  const { triggerRef, popRef } = usePopover(open, close, { initialFocus: '.cpk-pad' })

  // Re-seed the working state each time the popover opens (or the outside value
  // changes while closed) so it always starts from the live colour.
  useEffect(() => {
    if (!open && !draggingRef.current) {
      setHsv(hexToHsv(current))
      setHexText(formatColor(current, format))
    }
  }, [current, open, format])

  // Dragging the pad fires this on every pointermove, so the recents list is
  // NOT written here — it would fill with twelve shades of one drag. It is
  // written on release, on a swatch press and on a typed value: the three
  // moments a colour was actually chosen rather than passed through.
  const commit = (next) => {
    setHsv(next)
    const hex = hsvToHex(next)
    setHexText(formatColor(hex, format))
    onChange?.(hex)
  }

  const remember = useCallback((hex) => {
    const stored = normalizeHex(hex)
    if (stored) setRecents(addRecentColor(stored))
  }, [])

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

  // Accepts hex, rgb() or hsl() whatever the dropdown says — someone pasting a
  // colour out of devtools should not have to change a setting first. An
  // unreadable value snaps back rather than clearing, so a typo never destroys
  // the colour that was already chosen.
  const applyTypedColor = () => {
    const parsed = parseColor(hexText)
    if (!parsed) { setHexText(formatColor(liveHex, format)); return }
    setHsv(hexToHsv(parsed.hex))
    // `parsed.alpha` is deliberately discarded. Pasting `#ff000080` or
    // `rgb(255 0 0 / .5)` sets the COLOUR and drops the transparency, because
    // nothing downstream can store one — see the note at the top. Silently
    // keeping it would produce a value the next export could not represent.
    setHexText(formatColor(parsed.hex, format))
    onChange?.(parsed.hex)
    remember(parsed.hex)
  }

  return (
    <div className="cpk-wrap">
      <button
        type="button"
        className="cpk-trigger"
        ref={triggerRef}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-disabled={disabled}
        onClick={() => {
          // Stay a real (not natively disabled) button when locked so a click
          // still reaches onDisabledClick — the Pro gate wants to raise its modal.
          if (disabled) { onDisabledClick?.(); return }
          setOpen((o) => !o)
        }}
      >
        <span className="cpk-trigger-chip" style={{ background: current }} aria-hidden="true" />
      </button>

      {open && (
        <div className="pop cpk-pop" ref={popRef} role="dialog" aria-label={ariaLabel} tabIndex={-1}>
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
              remember(hsvToHex(hsv))
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
            <span className="cpk-chip" style={{ '--cpk-chip-color': liveHex }} aria-hidden="true" />
            <input
              className="cpk-hex"
              type="text"
              value={hexText}
              spellCheck={false}
              /* Not "Hex colour" any more: the field takes rgb() and hsl() too,
                 and a label that names one notation tells a screen-reader user
                 the other two will be rejected. */
              aria-label="Colour value"
              onChange={(e) => setHexText(e.target.value)}
              onBlur={applyTypedColor}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyTypedColor() } }}
            />
            <select
              className="cpk-format"
              value={format}
              aria-label="Colour notation"
              onChange={(e) => {
                const next = e.target.value
                setFormat(next)
                // Rewrite what is on screen immediately. Waiting for the next
                // commit would leave the field showing hex under a dropdown
                // that says rgb.
                setHexText(formatColor(liveHex, next))
              }}
            >
              {COLOR_FORMATS.map((f) => (
                <option key={f} value={f}>{f.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {recents.length > 0 && (
            <div className="cpk-recents">
              <p className="cpk-recents-label" id={`${recentsId}-label`}>Recent</p>
              <div className="cpk-swatches" role="listbox" aria-labelledby={`${recentsId}-label`}>
                {recents.map((sw) => (
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
                      setHexText(formatColor(sw, format))
                      onChange?.(sw)
                      remember(sw)
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="cpk-recents-label">Presets</p>
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
                  setHexText(formatColor(sw, format))
                  onChange?.(sw)
                  remember(sw)
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
