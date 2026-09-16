import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import usePopover from '../hooks/usePopover'
import { COLOR_FORMATS, formatColor, normalizeHex, parseColor } from '../utils/colorFormats'
import { addRecentColor, getRecentColors } from '../utils/recentColors'

// ── ColorPickerPop ────────────────────────────────────────────────────────────
// THE colour input for this app. Not "a shared component available to surfaces
// that want it" — the only one. Every place a person picks a colour in UIL4B
// opens this panel: the palette seed, the swatch editor, gradient stops in both
// generators, the icon colour, the tint ramps, the contrast pair, the JPEG
// matte, the UI-system seed and the homepage workbench.
//
// Founder request (2026-09-03): "i want a better colour picker maybe even one
// that matches the apps UI, and i want this one used for all colour pickers."
// Before that pass this component had THREE call sites and there were NINE live
// `<input type="color">` elsewhere, so the same act — choose a colour — looked
// and behaved differently depending on which tool you were standing in. A native
// colour input cannot be styled, cannot offer the app's shared recents, and
// opens the operating system's picker, which is the least "part of this app" a
// control can possibly be.
//
// Controlled: emits normalised lowercase `#rrggbb` through onChange on every
// committed change.
//
// Dismissal, focus and edge-flipping come from usePopover — the one popover
// contract shared with the nav popovers and the tool micro-menus. Routing
// through it is also what gives this panel #316's scroll containment for free.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE FOUNDER ASKED FOR, AND WHAT IS HERE
// ─────────────────────────────────────────────────────────────────────────────
// Request (2026-08-08): "Solid / Gradient / Image tabs, an SV field, hue and
// alpha sliders, a format dropdown and saved swatches."
//
// The SV field, hue slider and preset swatches already existed. Added since:
//
//   FORMAT DROPDOWN — hex / rgb / hsl. A LENS, not a second value: the
//   component still emits `#rrggbb` whatever is on screen. Widening the emit
//   contract is a much larger change than a display preference earns, and every
//   consumer would have to be taught to read it. Squarespace, Hex and Zoho all
//   place the notation control immediately beside the value field, which is
//   where ours already was — that reference changed nothing, and saying so is
//   the point of looking.
//
//   SAVED SWATCHES — the last twelve colours committed from ANY picker in the
//   app, shared across surfaces (utils/recentColors.js). A colour you just
//   mixed is one you are likely to want in the next tool, and matching it again
//   by eye is the tedious part of building a system. Now that every surface
//   routes through here, that list finally spans the whole app rather than
//   three tools of it.
//
//   The list is written at the four SETTLE boundaries, and two of them were
//   missing until [colour-picker-ui] closed them: the pad recorded a pointer
//   release but not an arrow-key release, and the hue strip recorded nothing at
//   all. A keyboard user could mix a colour and watch the Recent grid stay
//   empty; so could anyone who only moved hue. See the note on `commit`.
//
//   EYEDROPPER — the one control added in the 2026-09-03 pass, and it is here
//   rather than in the declined list below because of the emit contract, not
//   taste: `EyeDropper.open()` resolves to an opaque `sRGBHex`, which is already
//   exactly what this component emits. Every one of the twelve consumers can
//   store the result unchanged. It is feature-detected and simply ABSENT outside
//   Chromium rather than present and broken, and it is never the only route to a
//   colour — the pad, the field and the swatches all still work without it.
//
// NOT HERE, and both omissions are the same decision rather than an oversight.
// The call-site count that argued it has gone from three to twelve, which
// STRENGTHENS the argument rather than weakening it: a control none of them can
// consume is dead code that merely looks finished, now on twelve surfaces.
//
//   ALPHA SLIDER. Nothing downstream can store an alpha. A gradient STOP is
//   `{ color, position }` and its alpha would have to reach gradientCss,
//   gradientSvg, every export format, the saved-gradient shape and the library
//   data before it meant anything. A PALETTE swatch is worse than unsupported —
//   the contrast maths, the tint scales and the exports all assume an opaque
//   colour, so a translucent one would not be a nicer colour, it would be a
//   corrupt palette. The tint ramps and the contrast checker joined as call
//   sites in this pass and both are pure opaque-colour maths, as is the JPEG
//   matte, which exists precisely BECAUSE the format has no alpha.
//   `formatColor` in utils/colorFormats.js already carries alpha and is tested
//   for it, so the day a stop model can hold one, the slider is a small change.
//   Transparent gradient stops are their own feature.
//
//   SOLID / GRADIENT / IMAGE TABS. Nothing can consume a gradient or an image
//   from here either. Note the shape of the call sites: two of them ARE gradient
//   stops, and a stop cannot itself be a gradient. Which surface should take a
//   gradient or image fill is product direction, not a defect, so it is raised
//   in docs/PROPOSALS.md rather than guessed at. That queue is local-only
//   since 2026-09-16 and is not in this repository (see .gitignore); if you
//   cannot open it, raise the question with the founder rather than deciding.
//
// tests/user-sim/35-colour-picker.spec.js asserts the ABSENCE of both — by
// visible text AND by role, so neither a tab strip nor a bare alpha track can
// reappear without someone deciding to add one.

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

// The keys that MOVE each control, and therefore the only ones whose release is
// a finished choice. Tab and Escape raise keyup on these elements too, and
// recording on those would put a colour nobody picked at the head of the shared
// list — including on a panel that was opened and abandoned.
const PAD_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const HUE_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown',
])

const DEFAULT_SWATCHES = [
  '#18181b', '#f4f4f5', '#ef4444', '#f59e0b', '#22c55e',
  '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#78716c',
]

export default function ColorPickerPop({
  value,
  onChange,
  onClose,
  ariaLabel = 'Custom colour',
  swatches = DEFAULT_SWATCHES,
  // The section's name is BOTH the visible label and the listbox's accessible
  // name. It used to be "Presets" on screen and "Preset colours" to a screen
  // reader, which is two names for one thing.
  swatchesLabel = 'Preset colours',
  disabled = false,
  onDisabledClick,
  triggerClassName = '',
  triggerChildren,
}) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState('hex')
  const [recents, setRecents] = useState(getRecentColors)
  // useId, not a counter: two pickers can be open at once (a gradient has a
  // stop picker per stop) and a duplicated id would point every label at the
  // first list.
  const ids = useId()
  const current = normalizeHex(value) || '#000000'
  // hsv is the working state while the popover is open — it preserves hue when
  // the colour passes through black/white (where hue is lost in hex round-trips).
  const [hsv, setHsv] = useState(() => hexToHsv(current))
  const [hexText, setHexText] = useState(current)
  const padRef = useRef(null)
  const draggingRef = useRef(false)

  // onClose is the "that pick is finished" boundary, and it is the popover's
  // equivalent of the native control's `change` event (onChange being its
  // `input`). ColorStudio's "+ Add" card needs exactly that signal to know one
  // pick has ended and the next should append a new swatch rather than keep
  // rewriting the last one.
  const close = useCallback(() => { setOpen(false); onClose?.() }, [onClose])
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
  // written at the SETTLE BOUNDARIES instead: pointer release, arrow-key
  // release, a swatch press, an eyedropper pick and a typed value — the moments
  // a colour was actually chosen rather than passed through.
  //
  // [colour-picker-ui] Those boundaries used to cover only the pad's POINTER
  // release. Two whole routes to a colour therefore never reached the shared
  // list: mixing on the pad with the arrow keys, and moving the hue slider by
  // any means at all. So the saved-swatches feature this item shipped was
  // unreachable for a keyboard user, and unreachable for anyone who adjusted
  // only hue — the list stayed empty while the colour visibly changed. The fix
  // is to give the hue strip and the pad's keyboard the same release boundary
  // the pad's pointer already had, rather than to widen `commit` (which fires
  // per pixel of drag and would reintroduce the twelve-shades problem).
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

  // One committed choice, wherever it came from: a swatch, a typed value or the
  // screen. Every route has to move the pad, rewrite the field, emit and
  // remember — and writing that out three separate times is how two of the
  // three ended up subtly different from each other.
  const selectColor = (hex) => {
    setHsv(hexToHsv(hex))
    setHexText(formatColor(hex, format))
    onChange?.(hex)
    remember(hex)
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

  // Only ever read while the panel is OPEN, which cannot happen before a click,
  // which cannot happen during the prerender — so this needs no effect (and no
  // set-state-in-effect) and cannot produce a hydration mismatch.
  const canSampleScreen = open && typeof window !== 'undefined' && 'EyeDropper' in window

  const sampleScreen = async () => {
    try {
      const { sRGBHex } = await new window.EyeDropper().open()
      const hex = normalizeHex(sRGBHex)
      if (hex) selectColor(hex)
    } catch {
      // Dismissing the eyedropper rejects. That is a person changing their
      // mind, not a fault, and it must not surface as one.
    }
  }

  // Accepts hex, rgb() or hsl() whatever the dropdown says — someone pasting a
  // colour out of devtools should not have to change a setting first. An
  // unreadable value snaps back rather than clearing, so a typo never destroys
  // the colour that was already chosen.
  const applyTypedColor = () => {
    const parsed = parseColor(hexText)
    if (!parsed) { setHexText(formatColor(liveHex, format)); return }
    // `parsed.alpha` is deliberately discarded. Pasting `#ff000080` or
    // `rgb(255 0 0 / .5)` sets the COLOUR and drops the transparency, because
    // nothing downstream can store one — see the note at the top. Silently
    // keeping it would produce a value the next export could not represent.
    selectColor(parsed.hex)
  }

  const swatchGrid = (list, labelledBy) => (
    <div className="cpk-swatches" role="listbox" aria-labelledby={labelledBy}>
      {list.map((sw) => (
        <button
          key={sw}
          type="button"
          role="option"
          aria-selected={sw === liveHex}
          className={`cpk-swatch${sw === liveHex ? ' is-active' : ''}`}
          style={{ background: sw }}
          aria-label={sw}
          title={sw}
          onClick={() => selectColor(sw)}
        />
      ))}
    </div>
  )

  return (
    <div className="cpk-wrap">
      <button
        type="button"
        className={`cpk-trigger${triggerClassName ? ` ${triggerClassName}` : ''}`}
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
        {triggerChildren || (
          <span className="cpk-trigger-chip" style={{ background: current }} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="pop cpk-pop" ref={popRef} role="dialog" aria-label={ariaLabel} tabIndex={-1}>
          {/* The panel says which colour it is editing, in the shared .pop-head
              voice. Near-free on a surface with one picker; the difference
              between usable and guesswork on a gradient with five stops, a
              contrast pair, or a column of tint ramps — all of which now open
              this same panel. Reference: Google AI Studio, Adobe Express and
              Stitch all title theirs. */}
          <p className="pop-head cpk-head">
            <span className="cpk-head-name">{ariaLabel}</span>
            <span className="cpk-chip" style={{ '--cpk-chip-color': liveHex }} aria-hidden="true" />
          </p>

          {/* Pad and hue are ONE instrument, not two stacked fields: they share
              a bleed to the panel's edges and a single frame, divided by a
              hairline instead of a gap. */}
          <div className="cpk-instrument">
            <div
              className="cpk-pad"
              ref={padRef}
              style={{ backgroundColor: hueHex }}
              role="slider"
              aria-label="Saturation and brightness"
              // `aria-valuenow` is REQUIRED on role="slider" and was absent —
              // a slider without it is an invalid node, and some screen readers
              // announce nothing at all for one. The pad is two-dimensional, so
              // no single number is the whole truth: valuenow carries
              // saturation (the horizontal axis, which is what the arrow keys
              // move first) and `aria-valuetext` keeps saying BOTH, which is
              // what actually gets read aloud when it is present.
              aria-valuenow={Math.round(hsv.s * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
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
              // The keyboard's settle boundary, matching onPointerUp above.
              // Guarded to the four keys that actually move the pad so Tab and
              // Escape — which also raise keyup here — do not record a colour
              // nobody chose.
              onKeyUp={(e) => {
                if (PAD_KEYS.has(e.key)) remember(liveHex)
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
              // A bare number is what a range announces without this; "212" is
              // not a hue to anyone who cannot see the strip it sits on.
              aria-valuetext={`Hue ${Math.round(hsv.h)} degrees`}
              onChange={(e) => commit({ ...hsv, h: +e.target.value })}
              // Same settle boundary as the pad, by both routes a range can be
              // moved. `commit` alone fires per pixel of a drag, so remembering
              // there would spend the whole twelve-slot list on one sweep of
              // the strip.
              onPointerUp={() => remember(liveHex)}
              onKeyUp={(e) => { if (HUE_KEYS.has(e.key)) remember(liveHex) }}
            />
          </div>

          <div className="cpk-row">
            {canSampleScreen && (
              <button
                type="button"
                className="cpk-dropper"
                aria-label="Pick a colour from the screen"
                title="Pick a colour from the screen"
                onClick={sampleScreen}
              >
                {/* Lucide `pipette`, at the thinner stroke #303 made meaningful. */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m2 22 1-1h3l9-9" />
                  <path d="M3 21v-3l9-9" />
                  <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
                </svg>
              </button>
            )}
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

          {/* Two labelled sections rather than two bare grids. Canva, Adobe
              Express and Fiverr all head each swatch group ("Document colors",
              "My library", "Used Colors"); an unheaded second grid is
              indistinguishable from the first, to the eye and to a screen
              reader alike. */}
          {recents.length > 0 && (
            /* `.cpk-recents` is load-bearing, not decorative: it is how
               35-colour-picker.spec.js tells the shared list apart from the
               presets, including across two different tools. */
            <div className="cpk-section cpk-recents">
              <p className="cpk-section-label" id={`${ids}-recent`}>Recent</p>
              {swatchGrid(recents, `${ids}-recent`)}
            </div>
          )}

          {swatches.length > 0 && (
            <div className="cpk-section">
              <p className="cpk-section-label" id={`${ids}-presets`}>{swatchesLabel}</p>
              {swatchGrid(swatches, `${ids}-presets`)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
