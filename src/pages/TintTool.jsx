import { useEffect, useMemo, useState } from 'react'
import ColorPickerPop from '../components/ColorPickerPop'
import {
  ToolLayout, ToolButton, ToolGrid, ToolMain, ToolPanel, ToolSection, ToolPills, ToolSlider, ToolIcon,
} from '../components/tool/ToolLayout'
import { hexToOklchRaw, oklchToHex } from '../components/tool/oklch'
import { useProject } from '../contexts/ProjectContext'
import { contrastRatio, textColorForBg } from '../utils/colors'
import { consumeTintDraft, readTintDraft } from '../utils/colorHandoff'
// The page's own sheet; every rule is scoped under `.tt`, the page root.
import '../styles/pages/tint.css'

// Tint — /create/tint, rebuilt to the design (UIL4B
// App.dc.html, `isTint`, D:793-869, view model D:1432-1444 and D:1936-1975).
// A sticky tool toolbar with accent "Copy variables"; the scale
// as full-height step columns over a LIGHTNESS PER STEP chart; and one side
// card of HUE AND CHROMA, STEPS / CURVE pills and CONTRAST NOTES.
//
// THE GENERATOR IS THE DESIGN'S: an OKLCH lightness curve from 0.97 down, one
// hue, and a chroma that peaks mid-scale (D:1436-1442), with 9 / 11 / 13 steps
// and Even / Soft ends / High contrast curves.
//
// MULTI-SCALE, FOLDED IN (the previous build's up-to-eight source colours).
// The drawn card is ONE scale; ours can hold several. So the card gains a
// SOURCES section above the drawn one: each source is a row (swatch picker, hex, select,
// copy, remove — the same row shape as the gradient's STOPS), the selected
// source drives the columns, the chart, the sliders and the notes, and "Copy
// variables" exports every scale (`--tint-<step>` for one, `--tint-<n>-<step>`
// for several — the previous build's names). The Hue and Chroma sliders edit
// the SELECTED source's own hue and chroma, so a hex typed or picked there and
// the sliders are one piece of state, not two.

const MAX_SOURCES = 8
const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i
function normaliseHex(raw) {
  const m = HEX_RE.exec((raw || '').trim())
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  return `#${hex.toUpperCase()}`
}

const LABELS = {
  9: ['50', '100', '200', '300', '400', '500', '600', '700', '800'],
  11: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  13: ['25', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950', '975'],
}
const CURVES = ['Even', 'Soft ends', 'High contrast']
const INK_DARK = '#0B0C0E'
const INK_LIGHT = '#F7F7F4'

// The design's ramp, exactly (D:1436-1442).
function buildRamp(hue, chroma, steps, curve) {
  const labels = LABELS[steps]
  return labels.map((label, i) => {
    const t = i / (steps - 1)
    let L = 0.97 - t * 0.78
    if (curve === 1) L = 0.97 - (0.5 - Math.cos(Math.PI * t) / 2) * 0.78
    if (curve === 2) L = 0.97 - Math.pow(t, 0.78) * 0.83
    const c = chroma * (1 - Math.abs(t - 0.5) * 0.9)
    return { label, L, hex: oklchToHex(L, c, hue) }
  })
}

let seq = 0
const mkSource = (hex) => ({ id: ++seq, hex, input: hex })

function cellRef(color) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--tt-c', color)
    el.style.setProperty('--tt-ink', textColorForBg(color))
  }
}
function barRef(color, pct) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--tt-c', color)
    el.style.setProperty('--tt-h', pct)
  }
}

const HUE_TRACK = `linear-gradient(90deg,${[0, 60, 120, 180, 240, 300, 360].map((h) => oklchToHex(0.62, 0.14, h)).join(',')})`

// onCopy only: Tint has no row in src/config/activationExports.js, so it must
// not call the export hook (tests/unit/activation-exports.test.js).
export default function TintTool({ onCopy, toast }) {
  const { design } = useProject()
  const carried = readTintDraft()
  const [sources, setSources] = useState(() => (carried ? carried.colors.map(mkSource) : [mkSource('#2563EB')]))
  const [selectedId, setSelectedId] = useState(() => sources[0].id)
  const [steps, setSteps] = useState(11)
  const [curve, setCurve] = useState(0)
  const [copiedHex, setCopiedHex] = useState('')
  const [copiedAll, setCopiedAll] = useState(false)

  // Commit the Palette Builder hand-off exactly once (effects only run for a
  // committed tree).
  useEffect(() => {
    const draft = readTintDraft()
    if (draft) toast?.(`Opened ${draft.colors[0]} from your palette`)
    consumeTintDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selIndex = Math.max(0, sources.findIndex((s) => s.id === selectedId))
  const selected = sources[selIndex] || sources[0]
  const multi = sources.length > 1

  const scales = useMemo(() => sources.map((s) => {
    const [, C, H] = hexToOklchRaw(s.hex)
    return { id: s.id, hue: H, chroma: C, steps: buildRamp(H, C, steps, curve) }
  }), [sources, steps, curve])
  const scale = scales[selIndex] || scales[0]

  const varName = (ri, label) => (multi ? `--tint-${ri + 1}-${label}` : `--tint-${label}`)
  const cssFor = (ri) => `:root {\n${scales[ri].steps.map((t) => `  ${varName(ri, t.label)}: ${t.hex};`).join('\n')}\n}`
  const allCss = `:root {\n${scales.flatMap((sc, ri) => sc.steps.map((t) => `  ${varName(ri, t.label)}: ${t.hex};`)).join('\n')}\n}`

  const setSourceInput = (id, raw) => setSources((prev) => prev.map((s) => {
    if (s.id !== id) return s
    const norm = normaliseHex(raw)
    return { ...s, input: raw, hex: norm || s.hex }
  }))
  const setSourceHex = (id, hex) => setSources((prev) => prev.map((s) => (s.id === id ? { ...s, hex, input: hex } : s)))
  const blurSource = (id) => setSources((prev) => prev.map((s) => (s.id === id ? { ...s, input: s.hex } : s)))

  // The sliders edit the selected source's own OKLCH hue / chroma, keeping its
  // lightness, so the source hex and the sliders never disagree.
  const setHue = (h) => {
    const [L, C] = hexToOklchRaw(selected.hex)
    setSourceHex(selected.id, oklchToHex(L, C, h))
  }
  const setChroma = (c100) => {
    const [L, , H] = hexToOklchRaw(selected.hex)
    setSourceHex(selected.id, oklchToHex(L, c100 / 100, H))
  }

  const addSource = () => {
    if (sources.length >= MAX_SOURCES) return
    const last = sources[sources.length - 1]?.hex || '#2563EB'
    const [L, C, H] = hexToOklchRaw(last)
    const next = mkSource(oklchToHex(L, C, (H + 47) % 360))
    setSources([...sources, next])
    setSelectedId(next.id)
  }
  const removeSource = (id) => {
    if (sources.length <= 1) return
    const next = sources.filter((s) => s.id !== id)
    setSources(next)
    if (selectedId === id) setSelectedId(next[0].id)
  }

  const importPalette = () => {
    const seen = new Set()
    const cols = (design?.palette?.colors || [])
      .map(normaliseHex)
      .filter((c) => c && !seen.has(c) && seen.add(c))
      .slice(0, MAX_SOURCES)
    if (!cols.length) { toast?.('No palette to import yet — build one in the Palette tool first.'); return }
    const next = cols.map(mkSource)
    setSources(next)
    setSelectedId(next[0].id)
    toast?.(`Imported ${cols.length} colour${cols.length > 1 ? 's' : ''} from your palette`)
  }

  const copyHex = (hex) => {
    onCopy?.(hex)
    setCopiedHex(hex)
    setTimeout(() => setCopiedHex((h) => (h === hex ? '' : h)), 1000)
  }
  const copyAll = async () => {
    const ok = await onCopy?.(allCss)
    if (ok === false) return
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1200)
  }

  const hueDeg = Math.round(scale.hue)
  const chroma100 = Math.round(scale.chroma * 100)
  const chromaTrack = `linear-gradient(90deg,${oklchToHex(0.62, 0, scale.hue)},${oklchToHex(0.62, 0.2, scale.hue)})`

  return (
    <ToolLayout
      className="tt"
      title="Tint"
      titleId="tt-title"
      items={[
        {
          id: 'import', priority: 1,
          render: () => <ToolButton icon="swatches" onClick={importPalette} title="Replace the sources with your palette's colours">Import from palette</ToolButton>,
          menu: { label: 'Import from palette', icon: 'swatches', onSelect: importPalette },
        },
      ]}
      primary={(
        <ToolButton variant="accent" icon="copy" iconSize={14} onClick={copyAll}>
          {copiedAll ? 'Copied' : 'Copy variables'}
        </ToolButton>
      )}
    >
      <ToolGrid>
        <ToolMain>
          <div className="tt-cols" role="group" aria-label={`${multi ? `Scale ${selIndex + 1}, ` : ''}${steps} steps`}>
            {scale.steps.map((t) => (
              <button
                key={t.label}
                type="button"
                className="tt-cell"
                ref={cellRef(t.hex)}
                onClick={() => copyHex(t.hex)}
                title={`${t.label} · ${t.hex}`}
                aria-label={`Copy ${t.label} swatch ${t.hex}`}
              >
                <span className="tt-cell-step">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="tt-chart">
            <span className="tl-sec-label" id="tt-chart-label">Lightness per step</span>
            <div className="tt-bars" role="img" aria-labelledby="tt-chart-label" aria-describedby="tt-chart-desc">
              {scale.steps.map((t) => (
                <span key={t.label} className="tt-bar-slot">
                  <span className="tt-bar" ref={barRef(t.hex, `${Math.round(t.L * 100)}%`)} />
                </span>
              ))}
            </div>
            <span id="tt-chart-desc" className="sr-only">
              {scale.steps.map((t) => `${t.label} ${Math.round(t.L * 100)}%`).join(', ')}
            </span>
          </div>
        </ToolMain>

        <ToolPanel label="Tint controls" className="tt-panel">
          <ToolSection label={multi ? 'Sources' : 'Source'}>
            <div className="tt-srcs" role="radiogroup" aria-label="Select the scale to show">
              {sources.map((s, i) => {
                const on = s.id === selected.id
                const valid = normaliseHex(s.input) != null
                return (
                  <div key={s.id} className={on ? 'tt-src is-on' : 'tt-src'}>
                    <ColorPickerPop
                      value={s.hex}
                      onChange={(hex) => setSourceHex(s.id, hex.toUpperCase())}
                      ariaLabel={`Pick base colour ${i + 1}`}
                      triggerClassName="tt-picker"
                    />
                    <input
                      type="text"
                      className={valid ? 'tt-hex-input' : 'tt-hex-input tt-hex-input--bad'}
                      value={s.input}
                      onChange={(e) => setSourceInput(s.id, e.target.value)}
                      onFocus={() => setSelectedId(s.id)}
                      onBlur={() => blurSource(s.id)}
                      spellCheck="false"
                      autoComplete="off"
                      aria-invalid={!valid}
                      aria-label={`Base colour ${i + 1} hex`}
                    />
                    {multi && (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className="tt-iconbtn tt-src-pick"
                        onClick={() => setSelectedId(s.id)}
                        aria-label={`Show scale ${i + 1}`}
                        title={`Show scale ${i + 1}`}
                      >
                        <span className="tt-dot" aria-hidden="true" />
                      </button>
                    )}
                    <button type="button" className="tt-iconbtn" onClick={() => onCopy?.(cssFor(i))} aria-label={`Copy scale ${i + 1} as CSS`} title="Copy this scale as CSS variables">
                      <ToolIcon name="copy" size={13} />
                    </button>
                    {multi && (
                      <button type="button" className="tt-iconbtn" onClick={() => removeSource(s.id)} aria-label={`Remove base colour ${i + 1}`} title="Remove this source">
                        <ToolIcon name="x" size={12} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {sources.length < MAX_SOURCES && (
              <ToolButton variant="dashed" icon="plus" iconSize={13} className="tt-add" onClick={addSource}>Add a colour</ToolButton>
            )}
          </ToolSection>

          <ToolSection label="Hue and chroma" className="tt-hc">
            <ToolSlider
              wide
              label="Hue"
              min={0}
              max={360}
              step={1}
              value={hueDeg}
              onChange={setHue}
              display={`${hueDeg}°`}
              track={HUE_TRACK}
              ariaLabel="Hue"
              ariaValueText={`${hueDeg} degrees`}
            />
            <ToolSlider
              wide
              label="Chroma"
              min={0}
              max={Math.max(20, chroma100)}
              step={1}
              value={chroma100}
              onChange={setChroma}
              display={(chroma100 / 100).toFixed(2)}
              track={chromaTrack}
              ariaLabel="Chroma"
              ariaValueText={(chroma100 / 100).toFixed(2)}
            />
          </ToolSection>

          <ToolSection label="Steps" className="tt-shape">
            <ToolPills
              label="Steps"
              options={[9, 11, 13].map((n) => ({ value: n, label: `${n} steps` }))}
              value={steps}
              onChange={setSteps}
            />
            <span className="tl-sec-label" id="tt-curve-label">Curve</span>
            <ToolPills
              labelledBy="tt-curve-label"
              options={CURVES.map((c, i) => ({ value: i, label: c }))}
              value={curve}
              onChange={setCurve}
            />
          </ToolSection>

          <ToolSection label="Contrast notes" className="tt-notes">
            {scale.steps.map((t) => {
              const aa = contrastRatio(t.hex, INK_DARK) >= 4.5 ? 'AA on dark' : contrastRatio(t.hex, INK_LIGHT) >= 4.5 ? 'AA on light' : 'Low'
              return (
                <button key={t.label} type="button" className="tt-note" onClick={() => copyHex(t.hex)} aria-label={`Copy ${t.label} ${t.hex}, ${aa}`}>
                  <span className="tt-note-sw" ref={cellRef(t.hex)} aria-hidden="true" />
                  <span className="tt-note-step">{t.label}</span>
                  <span className="tt-note-hex">{copiedHex === t.hex ? 'Copied' : t.hex}</span>
                  <span className="tt-note-aa">{aa}</span>
                </button>
              )
            })}
          </ToolSection>
        </ToolPanel>
      </ToolGrid>
    </ToolLayout>
  )
}
