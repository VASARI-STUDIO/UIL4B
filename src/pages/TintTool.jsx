import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { generateTintScale, textColorForBg, T_LABELS } from '../utils/colors'

// Tint Scale Generator — the standalone /color/tint page. Takes ONE colour and
// turns it into a production-ready 50–950 ramp using the same generateTintScale
// engine (and the same perceived-lightness defaults) as the Colour Studio, so a
// scale built here matches what the studio's per-card tonal undersides produce.
//
// Murphy's-law input handling: the text field accepts anything, but the scale
// only ever recomputes from the LAST VALID hex — garbage input can never blank
// the ramp or leak NaN into the swatches.

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

// '#Abc' / 'aabbcc' → canonical '#AABBCC'; null when the string isn't a hex.
function normaliseHex(raw) {
  const m = HEX_RE.exec((raw || '').trim())
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return `#${hex.toUpperCase()}`
}

// Slider rows are data-driven so the labels, ranges and state keys stay in one
// place. satDecay fans out asymmetrically (darks desaturate twice as fast as
// lights saturate) — the exact split the studio uses.
const SLIDERS = [
  { key: 'hueShift', label: 'Hue shift', min: -45, max: 45, unit: '°', hint: 'Rotate hue toward the light end' },
  { key: 'satDecay', label: 'Saturation drift', min: 0, max: 40, unit: '%', hint: 'How much the ends desaturate' },
  { key: 'lMax', label: 'Lightest stop', min: 80, max: 99, unit: '%', hint: 'Lightness of the 50 swatch' },
  { key: 'lMin', label: 'Darkest stop', min: 0, max: 25, unit: '%', hint: 'Lightness of the 950 swatch' },
]

const DEFAULT_TUNING = { hueShift: 0, satDecay: 12, lMax: 97, lMin: 4 }

// Set the swatch colour + a legible ink through CSS custom properties — the
// no-inline-styles route (same pattern as the studio's pill-nav thumb). Inline
// arrow refs re-run every render, so the tiles track live edits.
function swatchRef(color) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--tt-c', color)
    el.style.setProperty('--tt-ink', textColorForBg(color))
  }
}

export default function TintTool({ onCopy }) {
  const [hexInput, setHexInput] = useState('#2563EB')
  const [hex, setHex] = useState('#2563EB') // last VALID hex — drives the scale
  const [mode, setMode] = useState('perceived')
  const [tuning, setTuning] = useState(DEFAULT_TUNING)

  const inputValid = normaliseHex(hexInput) != null

  const setFromInput = (raw) => {
    setHexInput(raw)
    const norm = normaliseHex(raw)
    if (norm) setHex(norm)
  }

  const setSlider = (key, value) => setTuning(prev => ({ ...prev, [key]: value }))

  const scale = useMemo(() => generateTintScale({
    hex,
    mode,
    anchor: 5, // the seed pins the 500 swatch, exactly like the studio
    hueShift: tuning.hueShift,
    satMin: -tuning.satDecay,
    satMax: tuning.satDecay / 2,
    lMax: tuning.lMax,
    lMin: tuning.lMin,
  }), [hex, mode, tuning])

  const cssExport = useMemo(() => {
    const lines = scale.map((c, i) => `  --colour-${T_LABELS[i]}: ${c};`)
    return `:root {\n${lines.join('\n')}\n}`
  }, [scale])

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Colour</div>
        <h1>Tint Scale Generator</h1>
        <p>
          Turn one colour into a production-ready 50–950 tint scale. Your seed
          pins the 500 swatch; everything else is derived — tune the ends, the
          hue drift and the curve, then copy any swatch or the whole scale as CSS.
        </p>
      </div>

      <div className="tt-grid">
        {/* ── Controls ── */}
        <div className="card tt-panel">
          <label className="seg-label" htmlFor="tt-hex">Seed colour</label>
          <div className="tt-seed-row">
            <input
              type="color"
              className="tt-picker"
              value={hex}
              onChange={(e) => { setHexInput(e.target.value.toUpperCase()); setHex(e.target.value.toUpperCase()) }}
              aria-label="Pick seed colour"
            />
            <input
              id="tt-hex"
              type="text"
              className={inputValid ? 'tt-hex-input' : 'tt-hex-input tt-hex-input--bad'}
              value={hexInput}
              onChange={(e) => setFromInput(e.target.value)}
              onBlur={() => setHexInput(hex)}
              placeholder="#2563EB"
              spellCheck="false"
              autoComplete="off"
              aria-invalid={!inputValid}
              aria-describedby="tt-hex-hint"
            />
          </div>
          <p id="tt-hex-hint" className="tt-hint" role={inputValid ? undefined : 'alert'}>
            {inputValid
              ? 'Any 3- or 6-digit hex works — with or without the #.'
              : `Not a hex colour — still showing ${hex}.`}
          </p>

          <label className="seg-label">Lightness curve</label>
          <div className="tt-seg" role="group" aria-label="Lightness curve">
            {[['perceived', 'Perceived'], ['linear', 'Linear']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={mode === value ? 'tt-seg-btn tt-seg-btn--on' : 'tt-seg-btn'}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="tt-hint">
            Perceived spaces the stops by how light they <em>look</em>; linear
            spaces them by raw lightness.
          </p>

          {SLIDERS.map(({ key, label, min, max, unit, hint }) => (
            <div className="tt-slider-row" key={key}>
              <div className="tt-slider-head">
                <label className="seg-label" htmlFor={`tt-${key}`}>{label}</label>
                <span className="tt-slider-val">{tuning[key]}{unit}</span>
              </div>
              <input
                id={`tt-${key}`}
                type="range"
                min={min}
                max={max}
                value={tuning[key]}
                onChange={(e) => setSlider(key, Number(e.target.value))}
                aria-label={`${label} (${hint})`}
              />
            </div>
          ))}

          <button
            type="button"
            className="tt-reset"
            onClick={() => setTuning(DEFAULT_TUNING)}
          >
            Reset tuning
          </button>
        </div>

        {/* ── Scale ── */}
        <div className="card tt-panel">
          <label className="seg-label">Scale — click any swatch to copy</label>
          <div className="tt-scale">
            {scale.map((c, i) => (
              <button
                key={T_LABELS[i]}
                type="button"
                className="tt-swatch"
                ref={swatchRef(c)}
                onClick={() => onCopy?.(c)}
                aria-label={`Copy ${T_LABELS[i]} swatch ${c}`}
              >
                <span className="tt-swatch-step">{T_LABELS[i]}</span>
                <span className="tt-swatch-hex">{c}</span>
              </button>
            ))}
          </div>

          <div className="tt-export-head">
            <label className="seg-label" htmlFor="tt-export">CSS variables</label>
            <button type="button" className="tt-copy-all" onClick={() => onCopy?.(cssExport)}>
              Copy CSS
            </button>
          </div>
          <pre id="tt-export" className="tt-export"><code>{cssExport}</code></pre>
        </div>
      </div>

      {/* Cross-links keep the standalone page part of the colour suite. */}
      <nav className="tt-more" aria-label="More colour tools">
        <NavLink to="/color/contrast" className="tt-more-link">Check this colour&rsquo;s contrast →</NavLink>
        <NavLink to="/color" className="tt-more-link">Open the full Colour Studio →</NavLink>
      </nav>
    </div>
  )
}
