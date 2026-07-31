import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import SnapSlider from '../components/SnapSlider'
import { useProject } from '../contexts/ProjectContext'
import {
  hexToHct, hctToHex, hexToHsl, hslToHex, textColorForBg,
} from '../utils/colors'
import { consumeTintDraft, readTintDraft } from '../utils/colorHandoff'

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

function closestStop(labels, colors, target) {
  if (!colors.length) return { label: target, color: '#000000' }
  let closestIndex = 0
  labels.forEach((label, index) => {
    if (Math.abs(label - target) < Math.abs(labels[closestIndex] - target)) closestIndex = index
  })
  return { label: labels[closestIndex], color: colors[closestIndex] }
}

function previewRef(labels, colors) {
  return (el) => {
    if (!el || !colors.length) return
    const canvas = closestStop(labels, colors, 50).color
    const surface = closestStop(labels, colors, 100).color
    const border = closestStop(labels, colors, 200).color
    const accent = closestStop(labels, colors, 600).color
    const accentHover = closestStop(labels, colors, 700).color
    const muted = closestStop(labels, colors, 700).color
    const text = closestStop(labels, colors, 900).color
    el.style.setProperty('--tt-pv-canvas', canvas)
    el.style.setProperty('--tt-pv-surface', surface)
    el.style.setProperty('--tt-pv-border', border)
    el.style.setProperty('--tt-pv-accent', accent)
    el.style.setProperty('--tt-pv-accent-hover', accentHover)
    el.style.setProperty('--tt-pv-on-accent', textColorForBg(accent))
    el.style.setProperty('--tt-pv-muted', muted)
    el.style.setProperty('--tt-pv-text', text)
  }
}

export default function TintTool({ onCopy, toast }) {
  const { design } = useProject()
  // A colour handed over from the Palette Builder's tints preview ("Open in Tint
  // Generator"). Read — never consumed — during render, so a render React throws
  // away can't lose it; the mount effect below empties the slot exactly once. A
  // reload or a direct visit reads nothing and the tool opens on its default base.
  const carriedColors = readTintDraft()
  const [bases, setBases] = useState(() => (carriedColors ? carriedColors.colors.map(mkBase) : [mkBase('#2563EB')]))
  const [mode, setMode] = useState(DEFAULT_TUNING.mode)
  const [hueShift, setHueShift] = useState(DEFAULT_TUNING.hueShift)
  const [chroma, setChroma] = useState(DEFAULT_TUNING.chroma)
  const [stepMode, setStepMode] = useState(DEFAULT_TUNING.stepMode)
  const [includeEnds, setIncludeEnds] = useState(DEFAULT_TUNING.includeEnds)
  const [audience, setAudience] = useState('designer')
  const [selectedBaseId, setSelectedBaseId] = useState(() => bases[0].id)
  const [selectedStopIndex, setSelectedStopIndex] = useState(0)

  // Commit the Palette Builder hand-off. Effects only run for a committed tree,
  // so the slot empties exactly once — a remount or a second visit inherits nothing.
  useEffect(() => {
    const carried = readTintDraft()
    if (carried) toast?.(`Opened ${carried.colors[0]} from your palette`)
    consumeTintDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const labels = useMemo(() => stepLabels(stepMode, includeEnds), [stepMode, includeEnds])
  const dense = labels.length > 24 // thin bars — hide per-cell text, keep hover titles

  // One ramp per valid base, all on the same curve + step set.
  const ramps = useMemo(
    () => bases.map((b) => ({ id: b.id, hex: b.hex, colors: buildRamp(b.hex, labels, mode, hueShift, chroma / 100) })),
    [bases, labels, mode, hueShift, chroma],
  )

  const multi = ramps.length > 1
  const selectedRampIndex = Math.max(0, bases.findIndex((base) => base.id === selectedBaseId))
  const selectedRamp = ramps[selectedRampIndex] || ramps[0]
  const selectedDenseIndex = Math.min(selectedStopIndex, Math.max(0, labels.length - 1))

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
  const removeBase = (id) => {
    if (bases.length <= 1) return
    const next = bases.filter((base) => base.id !== id)
    setBases(next)
    if (selectedBaseId === id) setSelectedBaseId(next[0].id)
  }

  // Pull the live Palette Builder palette (shared through ProjectContext) straight
  // in as base colours — the "import from palette" bridge, deduped + capped.
  const importPalette = () => {
    const seen = new Set()
    const cols = (design?.palette?.colors || [])
      .map(normaliseHex)
      .filter((c) => c && !seen.has(c) && seen.add(c))
      .slice(0, MAX_RAMPS)
    if (!cols.length) { toast?.('No palette to import yet — build one in the Palette tool first.'); return }
    const next = cols.map(mkBase)
    setBases(next)
    setSelectedBaseId(next[0].id)
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
  const selectedCss = selectedRamp ? rampCss(selectedRamp.colors, selectedRampIndex) : ':root {\n}'
  const allCss = useMemo(() => {
    const lines = ramps.flatMap((r, ri) => r.colors.map((c, i) => {
      const name = multi ? `--tint-${ri + 1}-${labels[i]}` : `--tint-${labels[i]}`
      return `  ${name}: ${c};`
    }))
    return `:root {\n${lines.join('\n')}\n}`
  }, [ramps, labels, multi])

  const primaryRamp = selectedRamp?.colors || []
  const roleSamples = [
    ['Canvas', closestStop(labels, primaryRamp, 50)],
    ['Surface', closestStop(labels, primaryRamp, 100)],
    ['Border', closestStop(labels, primaryRamp, 200)],
    ['Primary', closestStop(labels, primaryRamp, 600)],
    ['Hover', closestStop(labels, primaryRamp, 700)],
    ['Text', closestStop(labels, primaryRamp, 900)],
  ]
  const handleAudienceKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'ArrowLeft' || event.key === 'Home' ? 'designer' : 'developer'
    setAudience(next)
    requestAnimationFrame(() => document.getElementById(`tt-tab-${next}`)?.focus())
  }
  const handleRampKeyDown = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const last = bases.length - 1
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? last
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? (index - 1 + bases.length) % bases.length
          : (index + 1) % bases.length
    setSelectedBaseId(bases[nextIndex].id)
    requestAnimationFrame(() => document.getElementById(`tt-ramp-select-${bases[nextIndex].id}`)?.focus())
  }
  const handleDenseStopKeyDown = (event, rampId, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? labels.length - 1
        : event.key === 'ArrowLeft'
          ? Math.max(0, index - 1)
          : Math.min(labels.length - 1, index + 1)
    setSelectedStopIndex(nextIndex)
    requestAnimationFrame(() => document.getElementById(`tt-stop-${rampId}-${nextIndex}`)?.focus())
  }

  return (
    <div className="sec tt-page">
      <header className="tt-hero">
        <NavLink to="/color/palette" className="tt-back" aria-label="Back to Palette Builder">
          <span aria-hidden="true">←</span> Palette Builder
        </NavLink>
        <div className="sec-h-eyebrow">Colour system workspace</div>
        <div className="tt-hero-copy">
          <h1>Tint Scale Generator</h1>
          <p>
            Build a tonal system that designers can evaluate and developers can
            ship. Start with one colour or import a palette, tune the curve, then
            inspect real interface roles or copy production-ready tokens.
          </p>
        </div>
        <div className="tt-audience" role="tablist" aria-label="Choose your tint scale workflow">
          <button
            type="button"
            role="tab"
            id="tt-tab-designer"
            aria-selected={audience === 'designer'}
            aria-controls="tt-audience-panel"
            tabIndex={audience === 'designer' ? 0 : -1}
            className={audience === 'designer' ? 'tt-audience-tab tt-audience-tab--on' : 'tt-audience-tab'}
            onClick={() => setAudience('designer')}
            onKeyDown={handleAudienceKeyDown}
          >
            <span className="tt-audience-kicker">For designers</span>
            <strong>Preview the system</strong>
            <span>See hierarchy and semantic roles in context.</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tt-tab-developer"
            aria-selected={audience === 'developer'}
            aria-controls="tt-audience-panel"
            tabIndex={audience === 'developer' ? 0 : -1}
            className={audience === 'developer' ? 'tt-audience-tab tt-audience-tab--on' : 'tt-audience-tab'}
            onClick={() => setAudience('developer')}
            onKeyDown={handleAudienceKeyDown}
          >
            <span className="tt-audience-kicker">For developers</span>
            <strong>Ship the tokens</strong>
            <span>Inspect names and copy a complete CSS handoff.</span>
          </button>
        </div>
      </header>

      <div className="tt-status" aria-live="polite">
        <span><strong>{bases.length}</strong> base colour{bases.length > 1 ? 's' : ''}</span>
        <span><strong>{labels.length}</strong> stops per scale</span>
        <span><strong>{mode === 'perceived' ? 'HCT' : 'HSL'}</strong> lightness curve</span>
        <span><strong>{ramps.length * labels.length}</strong> generated tokens</span>
      </div>

      <div className="tt-grid">
        {/* ── Ramps ── */}
        <section className="card tt-panel tt-output" aria-labelledby="tt-output-title">
          <div className="tt-section-head tt-section-head--output">
            <span className="tt-section-num">01</span>
            <div>
              <h2 id="tt-output-title">Choose source colours</h2>
              <p>Add up to eight sources, then select the scale that drives the preview and handoff.</p>
            </div>
          </div>

          <div className="tt-bases-head">
            <span className="seg-label">Source colours</span>
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

          <div className="tt-ramps" role="radiogroup" aria-label="Select the active tint scale">
            {bases.map((b, ri) => {
              const colors = ramps[ri]?.colors || []
              const valid = normaliseHex(b.input) != null
              const selected = b.id === selectedBaseId
              return (
                <div className={selected ? 'tt-ramp-block tt-ramp-block--selected' : 'tt-ramp-block'} key={b.id}>
                  <div className="tt-ramp-meta">
                    <button
                      type="button"
                      id={`tt-ramp-select-${b.id}`}
                      className="tt-ramp-select"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setSelectedBaseId(b.id)}
                      onKeyDown={(event) => handleRampKeyDown(event, ri)}
                    >
                      <span className="tt-ramp-select-dot" aria-hidden="true" />
                      <span>
                        <strong>Scale {ri + 1}</strong>
                        <small>{b.hex} source</small>
                      </span>
                      <em>{selected ? 'Active output' : 'Use this scale'}</em>
                    </button>
                  </div>
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
                        id={`tt-stop-${b.id}-${i}`}
                        type="button"
                        className="tt-cell"
                        ref={cellRef(c)}
                        onClick={() => onCopy?.(c)}
                        onFocus={() => { if (dense) setSelectedStopIndex(i) }}
                        onKeyDown={(event) => { if (dense) handleDenseStopKeyDown(event, b.id, i) }}
                        tabIndex={dense ? (i === selectedDenseIndex ? 0 : -1) : 0}
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
                  {dense && (
                    <div className="tt-dense-inspector" aria-live="polite">
                      <span>Selected stop <strong>{labels[selectedDenseIndex]}</strong></span>
                      <code>{colors[selectedDenseIndex]}</code>
                      <span>Use left and right arrow keys to inspect.</span>
                    </div>
                  )}
                  <p className="tt-ramp-scroll">{dense ? 'Dense scale: scroll horizontally; one swatch per ramp stays in the Tab order.' : 'Scroll horizontally to inspect every stop.'}</p>
                </div>
              )
            })}
          </div>

          <div className="tt-delivery">
            <div className="tt-delivery-head">
              <div>
                <span className="tt-section-num">03</span>
                <div>
                  <h2>{audience === 'designer' ? 'Evaluate the system' : 'Prepare the handoff'}</h2>
                  <p>
                    {audience === 'designer'
                      ? `Scale ${selectedRampIndex + 1} is mapped to common interface roles.`
                      : `Scale ${selectedRampIndex + 1} is named and ready to paste.`}
                  </p>
                </div>
              </div>
              <div className="tt-view-switch" aria-label="Output view">
                <button
                  type="button"
                  className={audience === 'designer' ? 'tt-view-btn tt-view-btn--on' : 'tt-view-btn'}
                  aria-pressed={audience === 'designer'}
                  onClick={() => setAudience('designer')}
                >
                  Design preview
                </button>
                <button
                  type="button"
                  className={audience === 'developer' ? 'tt-view-btn tt-view-btn--on' : 'tt-view-btn'}
                  aria-pressed={audience === 'developer'}
                  onClick={() => setAudience('developer')}
                >
                  Developer handoff
                </button>
              </div>
            </div>

            <div
              id="tt-audience-panel"
              role="tabpanel"
              aria-labelledby={audience === 'designer' ? 'tt-tab-designer' : 'tt-tab-developer'}
            >
              {audience === 'designer' ? (
                <div className="tt-design-view">
                  <div className="tt-preview" ref={previewRef(labels, primaryRamp)}>
                    <div className="tt-preview-bar">
                      <span className="tt-preview-mark" aria-hidden="true" />
                      <span>Interface preview</span>
                      <span className="tt-preview-status">Role mapping</span>
                    </div>
                    <div className="tt-preview-body">
                      <div className="tt-preview-copy">
                        <span className="tt-preview-eyebrow">Release-ready colour</span>
                        <h3>One scale, clear hierarchy.</h3>
                        <p>
                          Test surfaces, borders, text and actions together before
                          handing the tokens to engineering.
                        </p>
                        <div className="tt-preview-actions">
                          <span className="tt-preview-primary">Primary action</span>
                          <span className="tt-preview-secondary">Secondary</span>
                        </div>
                      </div>
                      <div className="tt-preview-card">
                        <span className="tt-preview-card-k">Token coverage</span>
                        <strong>{roleSamples.length} roles</strong>
                        <span>{labels.length} stops available</span>
                        <div className="tt-preview-spectrum" aria-hidden="true">
                          {roleSamples.map(([name, sample]) => (
                            <span key={name} ref={cellRef(sample.color)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="tt-role-map" aria-label="Suggested semantic role mapping">
                    {roleSamples.map(([name, sample]) => (
                      <button
                        key={name}
                        type="button"
                        className="tt-role-sample"
                        ref={cellRef(sample.color)}
                        onClick={() => onCopy?.(sample.color)}
                        aria-label={`Copy ${name} role colour ${sample.color}`}
                      >
                        <span>{name}</span>
                        <strong>{sample.label}</strong>
                        <code>{sample.color}</code>
                      </button>
                    ))}
                  </div>
                  {ramps.length > 1 && (
                    <p className="tt-view-note">Previewing Scale {selectedRampIndex + 1}. Select any source scale above to compare it in the same interface.</p>
                  )}
                </div>
              ) : (
                <div className="tt-developer-view">
                  <div className="tt-code-meta">
                    <div>
                      <span className="seg-label">CSS custom properties</span>
                      <p>Scale {selectedRampIndex + 1} · {labels.length} variables · deterministic names</p>
                    </div>
                    <div className="tt-code-actions">
                      {ramps.length > 1 && (
                        <button type="button" className="tt-copy-all" onClick={() => onCopy?.(allCss)}>
                          Copy all scales
                        </button>
                      )}
                      <button type="button" className="tt-copy-primary" onClick={() => onCopy?.(selectedCss)}>
                        Copy selected CSS
                      </button>
                    </div>
                  </div>
                  <pre id="tt-export" className="tt-export" tabIndex="0"><code>{selectedCss}</code></pre>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Controls ── */}
        <section className="card tt-panel tt-config" aria-labelledby="tt-config-title">
          <div className="tt-section-head">
            <span className="tt-section-num">02</span>
            <div>
              <h2 id="tt-config-title">Tune the system</h2>
              <p>One rule set keeps every colour ramp consistent.</p>
            </div>
          </div>

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
        </section>
      </div>

      {/* Cross-links keep the standalone page part of the colour suite. */}
      <nav className="tt-more" aria-label="More colour tools">
        <div>
          <span className="tt-more-kicker">Continue your colour system</span>
          <strong>Move from a useful scale to a complete interface foundation.</strong>
        </div>
        <div className="tt-more-links">
          <NavLink to="/color/palette" className="tt-more-link">Build a full palette &rarr;</NavLink>
          <NavLink to="/color/contrast" className="tt-more-link">Check contrast &rarr;</NavLink>
          <NavLink to="/color" className="tt-more-link">All colour tools &rarr;</NavLink>
        </div>
      </nav>
    </div>
  )
}
