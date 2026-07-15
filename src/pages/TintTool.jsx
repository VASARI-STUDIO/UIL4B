import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import SnapSlider from '../components/SnapSlider'
import { useProject } from '../contexts/ProjectContext'
import {
  hexToHct, hctToHex, hexToHsl, hslToHex, textColorForBg,
} from '../utils/colors'

// Tint Scale Generator — the standalone /color/tint page. Turns one OR MORE base
// colours into production-ready tonal ramps. Every ramp shares one set of
// controls (mode, hue drift, chroma, step range) so a multi-colour system stays
// internally consistent — the same ethos as the rest of the colour suite.
//
// Two genuinely different curves (this is the fix for the old dead toggle):
//   • Perceived — spaced by HCT tone. The base's hue + chroma are held and only
//     the tone changes, so mids stay vivid and the ends desaturate the way the
//     eye expects (the Material-3 tonal-palette look).
//   • Linear — even lightness in HSL. Hue + saturation are held flat and only
//     the L channel steps evenly, so the ends stay fully saturated. Deliberately
//     the "naive" ramp, and it reads visibly different from Perceived.
//
// Murphy's-law input handling: each hex field accepts anything, but a ramp only
// ever recomputes from the LAST VALID hex — garbage input can never blank a ramp
// or leak NaN into the swatches.

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i
const MAX_RAMPS = 8

// '#Abc' / 'aabbcc' → canonical '#AABBCC'; null when the string isn't a hex.
function normaliseHex(raw) {
  const m = HEX_RE.exec((raw || '').trim())
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return `#${hex.toUpperCase()}`
}

// A numeric step label (0…1000) maps to a target tone (0…100): 0 → 100 (white),
// 500 → 50, 1000 → 0 (black). The whole ramp system runs off this single map, so
// perceived tone and linear lightness are always asking for the same targets and
// only the colour maths that answers them differs.
const toneForLabel = (label) => 100 - label / 10

// Build one ramp: a hex per step label, on the chosen curve.
function buildRamp(baseHex, labels, mode, hueShift, chromaScale) {
  if (mode === 'perceived') {
    const [h0, c0] = hexToHct(baseHex)
    return labels.map((label) => {
      const tone = toneForLabel(label)
      const bias = tone / 100 * 2 - 1 // +1 at the light end, −1 at the dark end
      const hue = ((h0 + hueShift * bias) % 360 + 360) % 360
      return hctToHex(hue, Math.max(0, c0 * chromaScale), tone)
    })
  }
  const [h0, s0] = hexToHsl(baseHex)
  return labels.map((label) => {
    const L = toneForLabel(label)
    const bias = L / 100 * 2 - 1
    const hue = ((h0 + hueShift * bias) % 360 + 360) % 360
    const sat = Math.max(0, Math.min(100, s0 * chromaScale))
    return hslToHex(hue, sat, L)
  })
}

// Step presets. 'tailwind' is the familiar 50–950 set; the numeric options walk
// 0→1000 by that increment (founder wants granularity down to 5). 0 and 1000 are
// the pure white/black endpoints, added only when the endpoints toggle is on.
const STEP_OPTIONS = [
  { id: 'tailwind', label: 'Standard (50–950)' },
  { id: '100', label: 'Every 100' },
  { id: '50', label: 'Every 50' },
  { id: '25', label: 'Every 25' },
  { id: '10', label: 'Every 10' },
  { id: '5', label: 'Every 5' },
]

function stepLabels(stepMode, includeEnds) {
  let labels
  if (stepMode === 'tailwind') {
    labels = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
  } else {
    const inc = Number(stepMode)
    labels = []
    for (let v = inc; v < 1000; v += inc) labels.push(v)
  }
  labels = labels.filter((v) => v !== 0 && v !== 1000)
  return includeEnds ? [0, ...labels, 1000] : labels
}

const DEFAULT_TUNING = { mode: 'perceived', hueShift: 0, chroma: 100, stepMode: 'tailwind', includeEnds: false }

let seq = 0
const mkBase = (hex) => ({ id: ++seq, hex, input: hex })

// Set the swatch colour + a legible ink through CSS custom properties — the
// no-inline-styles route (same pattern as the studio's pill-nav thumb). Inline
// arrow refs re-run every render, so the tiles track live edits.
function cellRef(color) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--tt-c', color)
    el.style.setProperty('--tt-ink', textColorForBg(color))
  }
}

export default function TintTool({ onCopy, toast }) {
  const { design } = useProject()
  const [bases, setBases] = useState(() => [mkBase('#2563EB')])
  const [mode, setMode] = useState(DEFAULT_TUNING.mode)
  const [hueShift, setHueShift] = useState(DEFAULT_TUNING.hueShift)
  const [chroma, setChroma] = useState(DEFAULT_TUNING.chroma)
  const [stepMode, setStepMode] = useState(DEFAULT_TUNING.stepMode)
  const [includeEnds, setIncludeEnds] = useState(DEFAULT_TUNING.includeEnds)

  const labels = useMemo(() => stepLabels(stepMode, includeEnds), [stepMode, includeEnds])
  const dense = labels.length > 24 // thin bars — hide per-cell text, keep hover titles

  // One ramp per valid base, all on the same curve + step set.
  const ramps = useMemo(
    () => bases.map((b) => ({ id: b.id, hex: b.hex, colors: buildRamp(b.hex, labels, mode, hueShift, chroma / 100) })),
    [bases, labels, mode, hueShift, chroma],
  )

  const multi = ramps.length > 1

  const setBaseInput = (id, raw) => setBases((prev) => prev.map((b) => {
    if (b.id !== id) return b
    const norm = normaliseHex(raw)
    return { ...b, input: raw, hex: norm || b.hex }
  }))
  const setBaseHex = (id, hex) => setBases((prev) => prev.map((b) => (b.id === id ? { ...b, hex, input: hex } : b)))
  const blurBase = (id) => setBases((prev) => prev.map((b) => (b.id === id ? { ...b, input: b.hex } : b)))

  const addBase = () => setBases((prev) => {
    if (prev.length >= MAX_RAMPS) return prev
    const [h, s, l] = hexToHsl(prev[prev.length - 1]?.hex || '#2563EB')
    return [...prev, mkBase(hslToHex((h + 47) % 360, s, l))]
  })
  const removeBase = (id) => setBases((prev) => (prev.length > 1 ? prev.filter((b) => b.id !== id) : prev))

  // Pull the live Palette Builder palette (shared through ProjectContext) straight
  // in as base colours — the "import from palette" bridge, deduped + capped.
  const importPalette = () => {
    const seen = new Set()
    const cols = (design?.palette?.colors || [])
      .map(normaliseHex)
      .filter((c) => c && !seen.has(c) && seen.add(c))
      .slice(0, MAX_RAMPS)
    if (!cols.length) { toast?.('No palette to import yet — build one in the Palette tool first.'); return }
    setBases(cols.map(mkBase))
    toast?.(`Imported ${cols.length} colour${cols.length > 1 ? 's' : ''} from your palette`)
  }

  const resetTuning = () => {
    setMode(DEFAULT_TUNING.mode)
    setHueShift(DEFAULT_TUNING.hueShift)
    setChroma(DEFAULT_TUNING.chroma)
    setStepMode(DEFAULT_TUNING.stepMode)
    setIncludeEnds(DEFAULT_TUNING.includeEnds)
  }

  // CSS custom-property name for a swatch. Multiple ramps get a 1-based prefix so
  // the exported variables never collide.
  const varName = (rampIdx, label) => (multi ? `--tint-${rampIdx + 1}-${label}` : `--tint-${label}`)

  const rampRow = (colors) => colors.join(', ')
  const rampCss = (colors, rampIdx) =>
    `:root {\n${colors.map((c, i) => `  ${varName(rampIdx, labels[i])}: ${c};`).join('\n')}\n}`
  const allCss = useMemo(() => {
    const lines = ramps.flatMap((r, ri) => r.colors.map((c, i) => {
      const name = multi ? `--tint-${ri + 1}-${labels[i]}` : `--tint-${labels[i]}`
      return `  ${name}: ${c};`
    }))
    return `:root {\n${lines.join('\n')}\n}`
  }, [ramps, labels, multi])

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Colour</div>
        <h1>Tint Scale Generator</h1>
        <p>
          Turn one colour &mdash; or a whole palette &mdash; into production-ready
          tonal ramps. Pick <em>Perceived</em> for evenly-lit, on-brand tones or
          <em> Linear</em> for a flat lightness sweep, choose your step range, then
          copy any swatch, row or the whole set as CSS.
        </p>
      </div>

      <div className="tt-grid">
        {/* ── Controls ── */}
        <div className="card tt-panel">
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
            {mode === 'perceived'
              ? 'Spaced by HCT tone — hue and chroma stay put, so mids stay vivid and the ends ease off naturally.'
              : 'Even lightness in HSL — saturation stays flat, so the ends stay fully saturated. The naive, punchier sweep.'}
          </p>

          <div className="tt-slider-row">
            <div className="tt-slider-head">
              <label className="seg-label" htmlFor="tt-hue">Hue shift</label>
            </div>
            <SnapSlider
              id="tt-hue"
              min={-45}
              max={45}
              value={hueShift}
              defaultValue={DEFAULT_TUNING.hueShift}
              snaps={[-30, -15, 0, 15, 30]}
              unit="°"
              onChange={setHueShift}
              ariaLabel="Hue shift — rotate hue toward the light end"
            />
          </div>
          <div className="tt-slider-row">
            <div className="tt-slider-head">
              <label className="seg-label" htmlFor="tt-chroma">Chroma</label>
            </div>
            <SnapSlider
              id="tt-chroma"
              min={0}
              max={150}
              value={chroma}
              defaultValue={DEFAULT_TUNING.chroma}
              snaps={[0, 50, 100, 125]}
              unit="%"
              onChange={setChroma}
              ariaLabel="Chroma — scale the colourfulness of every stop"
            />
          </div>

          <label className="seg-label" htmlFor="tt-steps">Steps</label>
          <select
            id="tt-steps"
            className="tt-select"
            value={stepMode}
            onChange={(e) => setStepMode(e.target.value)}
          >
            {STEP_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>

          <label className="tt-check">
            <input
              type="checkbox"
              checked={includeEnds}
              onChange={(e) => setIncludeEnds(e.target.checked)}
            />
            <span>Add 0 &amp; 1000 endpoints (pure white &amp; black)</span>
          </label>
          <p className="tt-hint">{labels.length} stops per ramp.</p>

          <button type="button" className="tt-reset" onClick={resetTuning}>
            Reset tuning
          </button>
        </div>

        {/* ── Ramps ── */}
        <div className="card tt-panel">
          <div className="tt-bases-head">
            <label className="seg-label">Base colours</label>
            <div className="tt-bases-actions">
              <button type="button" className="tt-copy-all" onClick={importPalette}>
                Import from palette
              </button>
              <button
                type="button"
                className="tt-copy-all"
                onClick={addBase}
                disabled={bases.length >= MAX_RAMPS}
              >
                Add colour
              </button>
            </div>
          </div>

          <div className="tt-ramps">
            {bases.map((b, ri) => {
              const colors = ramps[ri]?.colors || []
              const valid = normaliseHex(b.input) != null
              return (
                <div className="tt-ramp-block" key={b.id}>
                  <div className="tt-ramp-head">
                    <input
                      type="color"
                      className="tt-picker tt-picker--s"
                      value={b.hex}
                      onChange={(e) => setBaseHex(b.id, e.target.value.toUpperCase())}
                      aria-label={`Pick base colour ${ri + 1}`}
                    />
                    <input
                      type="text"
                      className={valid ? 'tt-hex-input' : 'tt-hex-input tt-hex-input--bad'}
                      value={b.input}
                      onChange={(e) => setBaseInput(b.id, e.target.value)}
                      onBlur={() => blurBase(b.id)}
                      placeholder="#2563EB"
                      spellCheck="false"
                      autoComplete="off"
                      aria-invalid={!valid}
                      aria-label={`Base colour ${ri + 1} hex`}
                    />
                    <button type="button" className="tt-mini" onClick={() => onCopy?.(rampRow(colors))} title="Copy this ramp as a row of hex values">Copy row</button>
                    <button type="button" className="tt-mini" onClick={() => onCopy?.(rampCss(colors, ri))} title="Copy this ramp as CSS variables">Copy CSS</button>
                    {bases.length > 1 && (
                      <button type="button" className="tt-mini tt-mini--x" onClick={() => removeBase(b.id)} aria-label={`Remove base colour ${ri + 1}`}>×</button>
                    )}
                  </div>

                  <div className={dense ? 'tt-ramp tt-ramp--dense' : 'tt-ramp'}>
                    {colors.map((c, i) => (
                      <button
                        key={labels[i]}
                        type="button"
                        className="tt-cell"
                        ref={cellRef(c)}
                        onClick={() => onCopy?.(c)}
                        title={`${labels[i]} · ${c}`}
                        aria-label={`Copy ${labels[i]} swatch ${c}`}
                      >
                        {!dense && (
                          <>
                            <span className="tt-cell-step">{labels[i]}</span>
                            <span className="tt-cell-hex">{c}</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="tt-export-head">
            <label className="seg-label" htmlFor="tt-export">CSS variables</label>
            <button type="button" className="tt-copy-all" onClick={() => onCopy?.(allCss)}>
              Copy all CSS
            </button>
          </div>
          <pre id="tt-export" className="tt-export"><code>{allCss}</code></pre>
        </div>
      </div>

      {/* Cross-links keep the standalone page part of the colour suite. */}
      <nav className="tt-more" aria-label="More colour tools">
        <NavLink to="/color/palette" className="tt-more-link">Build a full palette &rarr;</NavLink>
        <NavLink to="/color/contrast" className="tt-more-link">Check this colour&rsquo;s contrast &rarr;</NavLink>
        <NavLink to="/color" className="tt-more-link">All colour tools &rarr;</NavLink>
      </nav>
    </div>
  )
}
