import { useEffect, useMemo, useRef, useState } from 'react'
import ColorPickerPop from '../components/ColorPickerPop'
import ExportMenu from '../components/tool/ExportMenu'
import SaveToProjectDialog from '../components/tool/SaveToProjectDialog'
import { useGatedDownload } from '../components/converter/shared'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import {
  ToolLayout, ToolButton, ToolGrid, ToolMain, ToolPanel, ToolSection, ToolPills, ToolSlider, ToolIcon,
} from '../components/tool/ToolLayout'
import { hexToOklchRaw, oklchToHex } from '../components/tool/oklch'
import { useProject } from '../contexts/ProjectContext'
import { textColorForBg } from '../utils/colors'
import { bestPole, contrastNotes, GRADE_WORDS, GRADE_MARKS } from '../utils/tintContrast'
import { getLenis } from '../hooks/useSmoothScroll'
import { refreshScrollLimit } from '../utils/hashLanding'
import { consumeTintDraft, readTintDraft } from '../utils/colorHandoff'
import { partsPresent } from '../utils/userHome'
import { activeColour, tintsFor, tintsNeedWrite } from '../utils/projectTints'
// The ramp is shared with the Palette Builder's swatch tints.
import { buildRamp, LIGHTNESS_RANGE, SATURATION_MAX } from '../utils/tintRamp'
// The page's own sheet; every rule is scoped under `.tt`, the page root.
import '../styles/pages/tint.css'

// Tint — /create/tint, rebuilt to the design (UIL4B
// App.dc.html, `isTint`, D:793-869, view model D:1432-1444 and D:1936-1975).
// A sticky tool toolbar with the accent "Copy or save" menu; the scale
// as full-height step columns over a LIGHTNESS PER STEP chart; and one side
// card of LIGHTNESS AND SATURATION sliders and STEPS / CURVE / SPACING pills.
// CONTRAST NOTES are a grid card under the chart (a list in the side card made
// the page taller than a laptop screen); below 901px everything stacks and they
// follow the controls. Each note is a tint value; hovering, focusing or tapping
// it opens its contrast against white and black.
//
// THE GENERATOR IS THE DESIGN'S: an OKLCH lightness curve from 0.97 down, one
// hue, and a chroma that peaks mid-scale (D:1436-1442), with 9 / 11 / 13 steps
// and Even / Soft ends / High contrast curves.
//
// MULTI-SCALE, FOLDED IN (the previous build's up-to-eight source colours).
// The drawn card is ONE scale; ours can hold several. So the card gains a
// SOURCES section above the drawn one: each source is a row (swatch picker, hex, select,
// copy, remove — the same row shape as the gradient's STOPS), the selected
// source drives the columns, the chart, the sliders and the notes, and the "Copy or save"
// menu (Copy CSS, Save to project, Download) takes every scale (`--tint-<step>` for one,
// `--tint-<n>-<step>` for several — the previous build's names). Hue and chroma
// come from the source colour (its picker and hex field); the Lightness and
// Saturation sliders and the Spacing pills shape every scale, the way Steps and
// Curve do, and sit at their neutral values (0, 100%, Perceived) on open.

const MAX_SOURCES = 8
const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i
function normaliseHex(raw) {
  const m = HEX_RE.exec((raw || '').trim())
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  return `#${hex.toUpperCase()}`
}

const CURVES = ['Even', 'Soft ends', 'High contrast']
const SPACINGS = [
  { value: 'perceived', label: 'Perceived', title: 'Steps look evenly spaced (OKLCH lightness)' },
  { value: 'linear', label: 'Linear', title: 'Steps are evenly spaced in light (linear sRGB)' },
]
// The widest a contrast tooltip gets; tint.css reads the same number.
const TIP_WIDTH = 280
// The tallest the floating tooltip gets (its card and the 6px bridge), so a
// note knows whether it fits below itself.
const TIP_HEIGHT = 230
// The card without the long help paragraph (the head and both rows), border
// and padding included. A squeezed card drops to this before anything else.
const TIP_COMPACT_HEIGHT = 136
// The narrowest a card gets when it sits beside a note with less room than TIP_WIDTH.
const TIP_MIN_WIDTH = 224
// The 6px bridge between a note and its card, and the gap the card keeps from
// the window's bottom edge.
const TIP_BRIDGE = 6
const TIP_EDGE = 12

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

// What a tint's contrast against white and black means, in the words a person
// without the vocabulary can use. Always in the page (hidden until open). The
// note's description is the tooltip body (the head and the rows); the long help
// paragraph sits in the card but outside it, so a screen reader is not read it
// again on every note.
function ContrastTip({ id, step, open, end, above, inline, maxHeight, compact, side, sideStyle }) {
  const notes = contrastNotes(step.hex)
  const cls = ['tt-tip', end && 'tt-tip--end', above && 'tt-tip--above', inline && 'tt-tip--inline', compact && 'tt-tip--compact', side && `tt-tip--${side}`].filter(Boolean).join(' ')
  return (
    <span className={cls} data-open={open ? 'true' : undefined} style={sideStyle}>
      {/* tabIndex -1: a card that scrolls would otherwise be a Tab stop of its own. */}
      <span className="tt-tip-card" tabIndex={-1} style={maxHeight ? { maxHeight } : undefined}>
        <span id={id} role="tooltip" className="tt-tip-body">
          <span className="tt-tip-head">{step.label} · {step.hex}</span>
          {notes.map((n) => (
            <span key={n.key} className="tt-tip-row" data-pass={n.pass ? 'true' : 'false'} data-grade={n.grade}>
              <span className="tt-tip-mark" aria-hidden="true"><ToolIcon name={GRADE_MARKS[n.grade]} size={n.grade === 'large' ? 14 : 12} /></span>
              <span className="tt-tip-who">{n.label}</span>
              <span className="tt-tip-ratio">{n.text}</span>
              <span className="tt-tip-grade">{GRADE_WORDS[n.grade]}</span>
            </span>
          ))}
        </span>
        <span className="tt-tip-help">
          Contrast is how far apart two colours are in lightness, from 1:1 (the same) to 21:1 (black on white). Body text needs 4.5:1 to pass AA; large text needs 3:1.
        </span>
      </span>
    </span>
  )
}

// onCopy only: Tint has no row in src/config/activationExports.js, so it must
// not call the export hook (tests/unit/activation-exports.test.js).
export default function TintTool({ onCopy, toast }) {
  const { design, setTints, saveProject, canSaveProjects } = useProject()
  const { requireLogin } = useLoginPrompt()
  const gatedDownload = useGatedDownload()
  const { lumBias, satDecay, oled } = design?.tints || {}
  const carried = readTintDraft()
  // With no hand-off, a project that already has colours is tinted from its own
  // active colour; the blue below is only the example a blank project opens on.
  const [projectHex] = useState(() => {
    if (!partsPresent(design).palette) return null
    return normaliseHex(activeColour(design))
  })
  const [sources, setSources] = useState(() => (carried ? carried.colors.map(mkSource) : [mkSource(projectHex || '#2563EB')]))
  const [selectedId, setSelectedId] = useState(() => sources[0].id)
  const [steps, setSteps] = useState(11)
  const [curve, setCurve] = useState(0)
  const [spacing, setSpacing] = useState('perceived')
  const [lightness, setLightness] = useState(0)
  const [saturation, setSaturation] = useState(100)
  // The contrast tooltip: which tint is open, whether a tap pinned it (shown
  // inline under the note), whether it opens leftward (a note near the right
  // edge) and whether it opens above the note (it opens below by default).
  const [tip, setTip] = useState(null)
  const pointerTypeRef = useRef('mouse')
  const refocusRef = useRef(false)
  const [copiedHex, setCopiedHex] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)

  // Commit the Palette Builder hand-off exactly once (effects only run for a
  // committed tree).
  useEffect(() => {
    const draft = readTintDraft()
    if (draft) toast?.(`Opened ${draft.colors[0]} from your palette`)
    consumeTintDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lenis re-measures on a debounce, so a wheel in the first moments after the
  // route mounts would stop at the previous page's limit.
  useEffect(() => { refreshScrollLimit(getLenis) }, [])

  const selIndex = Math.max(0, sources.findIndex((s) => s.id === selectedId))
  const selected = sources[selIndex] || sources[0]
  const multi = sources.length > 1

  const scales = useMemo(() => sources.map((s) => {
    const [, C, H] = hexToOklchRaw(s.hex)
    return { id: s.id, hue: H, chroma: C, steps: buildRamp(H, C, steps, curve, { spacing, lightness, saturation }) }
  }), [sources, steps, curve, spacing, lightness, saturation])
  const scale = scales[selIndex] || scales[0]

  // THE PROJECT'S TINTS PART. The ramp the project keeps is eleven stops (the
  // shape every reader of design.tints.scale labels by index) of the selected
  // source, made by the project's own generator (`tintsFor`, the one the Colour
  // Studio uses) with the project's tint settings. That is the WORKING design's
  // ramp, written as the source colour changes. "Save to project" is different:
  // it keeps the ramp on screen (steps and curve included, see saveTints). Only
  // `tints` is written: this tool reads the palette and never writes it. A
  // project with colours and no ramp gets one as soon as this opens, and so
  // does one recorded as made from another colour than the project's own;
  // otherwise it is written when the person changes the source colour. `from`
  // is the colour the ramp was made from.
  // A project with no colours of its own writes nothing at all: the blue it
  // opens on is an example, and a ramp kept from it would mark Tints done for a
  // project that has not chosen a colour yet.
  const keptRamp = useMemo(
    () => tintsFor(selected.hex, { lumBias, satDecay, oled }).scale,
    [selected.hex, lumBias, satDecay, oled],
  )
  const keptKey = `${selected.hex}|${keptRamp.join(',')}`
  const keptFirstRef = useRef(true)
  const ownColoursRef = useRef(false)
  ownColoursRef.current = partsPresent(design).palette
  useEffect(() => {
    const first = keptFirstRef.current
    keptFirstRef.current = false
    if (!ownColoursRef.current) return undefined
    if (first && !(projectHex && !carried && tintsNeedWrite(design?.tints, projectHex))) return undefined
    const from = selected?.hex
    const t = setTimeout(() => setTints({ scale: keptRamp, from }), first ? 0 : 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keptKey])

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

  // A pinned tooltip (opened by a tap) closes on Escape or a press anywhere
  // outside the note that holds it. One that follows hover or focus closes
  // itself when the pointer or focus leaves.
  const tipOpen = tip != null
  useEffect(() => {
    if (!tipOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setTip(null) }
    const onDown = (e) => { if (!e.target.closest?.('.tt-note-wrap')) setTip((cur) => (cur?.pinned ? null : cur)) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [tipOpen])
  const openTip = (label, el, pinned = false) => {
    const rect = el.getBoundingClientRect()
    const end = rect.left + TIP_WIDTH > window.innerWidth - 12
    // The card opens below the note, where the page has room. It flips above
    // only when the window leaves no room below AND there is room above that
    // clears both the sticky bars and the notes header, so it never meets it.
    // When neither side holds the whole card (a short window, the notes near its
    // foot), it drops the help paragraph (the head and both rows stay) and takes
    // the side that holds that. When not even that fits above or below, it sits
    // beside the note, kept inside the window and under the sticky bars and the
    // header. With no room beside either (a very narrow window), it takes the
    // side with more room, cut to fit and scrolling. It never reaches past the
    // window, so the page does not grow.
    const bar = document.querySelector('.tt .tl-toolbar')
    const barBottom = bar
      ? Math.max(bar.getBoundingClientRect().bottom, (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight)
      : 0
    const head = el.closest('.tt-notes')?.querySelector('.tt-notes-head')
    const clearTop = Math.max(barBottom, head ? head.getBoundingClientRect().bottom : 0)
    const roomBelow = window.innerHeight - TIP_EDGE - rect.bottom - TIP_BRIDGE
    const roomAbove = rect.top - TIP_BRIDGE - clearTop
    const full = TIP_HEIGHT - TIP_BRIDGE
    const place = { above: false, compact: false, side: undefined, sideStyle: undefined, maxHeight: undefined }
    if (roomBelow >= full) {
      // Below, whole.
    } else if (roomAbove >= full) {
      place.above = true
    } else if (roomBelow >= TIP_COMPACT_HEIGHT) {
      place.compact = true
    } else if (roomAbove >= TIP_COMPACT_HEIGHT) {
      place.above = true
      place.compact = true
    } else {
      const wide = TIP_WIDTH + TIP_BRIDGE
      const roomRight = window.innerWidth - TIP_EDGE - rect.right
      const roomLeft = rect.left - TIP_EDGE
      const roomTall = window.innerHeight - TIP_EDGE - clearTop
      // The wide card where either side holds it; else the side with more room if
      // the card can narrow to it (it never goes under TIP_MIN_WIDTH).
      const sideRoom = roomRight >= wide ? roomRight : roomLeft >= wide ? roomLeft : Math.max(roomRight, roomLeft)
      if (sideRoom >= TIP_MIN_WIDTH + TIP_BRIDGE) {
        place.side = roomRight >= wide || (roomLeft < wide && roomRight >= roomLeft) ? 'right' : 'left'
        const width = Math.min(wide, Math.floor(sideRoom))
        place.compact = roomTall < full || width < wide
        const h = place.compact ? TIP_COMPACT_HEIGHT : full
        const top = Math.max(clearTop, Math.min(rect.top, window.innerHeight - TIP_EDGE - h))
        place.sideStyle = { top: Math.round(top - rect.top), width }
        if (roomTall < h) place.maxHeight = Math.max(0, Math.floor(roomTall))
      } else {
        place.above = roomAbove > roomBelow
        place.compact = true
        const room = place.above ? roomAbove : roomBelow
        if (room < TIP_COMPACT_HEIGHT) place.maxHeight = Math.max(0, Math.floor(room))
      }
    }
    setTip({ label, pinned, end, ...place })
  }
  const closeTip = (label) => setTip((cur) => (cur && cur.label === label && !cur.pinned ? null : cur))
  // A mouse click or a key press copies. A tap has no hover, so it pins the
  // detail inline under the note instead (a second tap on the same note closes
  // it); copying from there is the Copy button, so one tap never does both.
  const pressNote = (t, el) => {
    if (pointerTypeRef.current === 'touch') {
      if (tip?.label === t.label && tip.pinned) {
        setTip(null)
        return
      }
      openTip(t.label, el, true)
      // The card grows the note downward; bring it into view once it has drawn.
      requestAnimationFrame(() => el.scrollIntoView?.({ block: 'nearest' }))
      return
    }
    copyHex(t.hex)
  }
  // The pinned card's Close button: the card goes and focus returns to the note,
  // without that focus reopening the hover tooltip.
  const closePinned = (e) => {
    const noteBtn = e.currentTarget.closest('.tt-note-wrap')?.querySelector('.tt-note')
    setTip(null)
    if (noteBtn) {
      refocusRef.current = true
      noteBtn.focus()
      refocusRef.current = false
    }
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

  // The Copy or save menu. Copying is free; keeping the tints in a project and taking
  // a file away both need an account, asked for through the shared gates.
  const copyCss = () => { onCopy?.(allCss) }
  const downloadCss = () => {
    const stem = `tint-${selected.hex.replace('#', '').toLowerCase()}${multi ? `-plus-${sources.length - 1}` : ''}`
    return gatedDownload(new Blob([`${allCss}\n`], { type: 'text/css' }), `${stem}.css`, 'download these tints')
  }
  const startSave = async () => {
    if (!canSaveProjects) {
      const user = await requireLogin('save these tints', { free: true, signup: true })
      if (!user) return
    }
    setSaveOpen(true)
  }
  // The selected source's ramp AS DRAWN (its steps, curve, hue and chroma) is
  // folded into the saved copy, so the project keeps exactly what is on screen
  // and copied. `tintsFor` supplies only the three tint settings (with their
  // defaults) and `from`; its own eleven-stop scale is replaced.
  const saveTints = (name) => {
    const tints = { ...tintsFor(selected.hex, { lumBias, satDecay, oled }), scale: scale.steps.map((t) => t.hex) }
    saveProject(name, { patch: { tints } })
    setSaveOpen(false)
    toast?.(`Saved to ${name}. Tints included.`)
  }
  // Signed out, the two rows that need an account say so before they are pressed.
  const accountHint = canSaveProjects ? undefined : 'Free account'
  const exportItems = [
    { id: 'copy-css', label: 'Copy CSS', icon: 'copy', onSelect: copyCss },
    { id: 'save', label: 'Save to project', icon: 'bookmark-simple', hint: accountHint, onSelect: startSave },
    { id: 'download', label: 'Download', icon: 'download-simple', hint: accountHint, onSelect: downloadCss },
  ]

  const lightnessLabel = lightness === 0 ? '0' : `${lightness > 0 ? '+' : '\u2212'}${Math.abs(lightness)}`
  const trackChroma = Math.min(0.12, scale.chroma)
  const lightnessTrack = `linear-gradient(90deg,${oklchToHex(0.3, trackChroma, scale.hue)},${oklchToHex(0.93, trackChroma, scale.hue)})`
  const saturationTrack = `linear-gradient(90deg,${oklchToHex(0.62, 0, scale.hue)},${oklchToHex(0.62, Math.max(0.04, scale.chroma * 1.5), scale.hue)})`

  return (
    <ToolLayout
      className="tt"
      title="Tint"
      titleId="tt-title"
      items={[]}
      primary={<ExportMenu items={exportItems} />}
    >
      {saveOpen && (
        <SaveToProjectDialog
          title="Save tints to a project"
          summary={`The project keeps the ${steps}-step ramp of ${selected.hex}${multi ? ` (scale ${selIndex + 1} of ${sources.length})` : ''}.`}
          defaultName={`Tint ${selected.hex}`}
          onSave={saveTints}
          onClose={() => setSaveOpen(false)}
        />
      )}
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
                      portal
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
            {/* Importing replaces the sources, so it sits with them. */}
            <ToolButton icon="swatches" iconSize={13} className="tt-import" onClick={importPalette} title="Replace the sources with your palette's colours">Import from palette</ToolButton>
          </ToolSection>

          <ToolSection label="Lightness and saturation" className="tt-ls">
            <ToolSlider
              wide
              label="Lightness"
              min={-LIGHTNESS_RANGE}
              max={LIGHTNESS_RANGE}
              step={1}
              value={lightness}
              onChange={setLightness}
              display={lightnessLabel}
              track={lightnessTrack}
              defaultValue={0}
              ariaLabel="Lightness"
              ariaValueText={lightness === 0 ? 'Unchanged' : `${Math.abs(lightness)} ${lightness > 0 ? 'lighter' : 'darker'}`}
            />
            <ToolSlider
              wide
              label="Saturation"
              min={0}
              max={SATURATION_MAX}
              step={1}
              value={saturation}
              onChange={setSaturation}
              display={`${saturation}%`}
              track={saturationTrack}
              defaultValue={100}
              ariaLabel="Saturation"
              ariaValueText={`${saturation} percent of the source colour`}
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
            <span className="tl-sec-label" id="tt-spacing-label">Spacing</span>
            <ToolPills
              labelledBy="tt-spacing-label"
              describedBy="tt-spacing-desc"
              options={SPACINGS}
              value={spacing}
              onChange={setSpacing}
            />
            <span id="tt-spacing-desc" className="tt-spacing-note">Perceived looks even. Linear spaces by light.</span>
          </ToolSection>
        </ToolPanel>
        <div className="tt-notes" role="group" aria-labelledby="tt-notes-label">
          <div className="tt-notes-head">
            <span className="tl-sec-label" id="tt-notes-label">Contrast notes</span>
            <span className="tt-notes-hint">
              <span className="tt-hint-fine">Hover a tint for its contrast. Click to copy.</span>
              <span className="tt-hint-coarse">Tap a tint to see its contrast</span>
            </span>
          </div>
          <div className="tt-notes-list">
            {scale.steps.map((t) => {
              const open = tip?.label === t.label
              const pinned = open && tip.pinned
              const tipId = `tt-tip-${t.label}`
              const best = bestPole(t.hex)
              return (
                <div
                  key={t.label}
                  className={pinned ? 'tt-note-wrap tt-note-wrap--pinned' : 'tt-note-wrap'}
                  onPointerEnter={(e) => { if (e.pointerType !== 'touch' && !tip?.pinned) openTip(t.label, e.currentTarget) }}
                  onPointerLeave={(e) => { if (e.pointerType !== 'touch') closeTip(t.label) }}
                  onFocus={(e) => {
                    // A tap focuses the button too, but opens the detail on its click; only a keyboard focus opens it here.
                    if (refocusRef.current || !e.target.matches(':focus-visible')) return
                    if (!tip?.pinned || tip.label !== t.label) openTip(t.label, e.currentTarget)
                  }}
                  onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) closeTip(t.label) }}
                >
                  <button
                    type="button"
                    className="tt-note"
                    onPointerDown={(e) => { pointerTypeRef.current = e.pointerType }}
                    onKeyDown={() => { pointerTypeRef.current = 'keyboard' }}
                    onClick={(e) => pressNote(t, e.currentTarget.parentElement)}
                    aria-label={`Copy ${t.label} ${t.hex}`}
                    aria-describedby={tipId}
                  >
                    <span className="tt-note-sw" ref={cellRef(t.hex)} aria-hidden="true" />
                    <span className="tt-note-step">{t.label}</span>
                    <span className="tt-note-hex">{copiedHex === t.hex ? 'Copied' : t.hex}</span>
                    <span className="tt-note-best" data-grade={best.grade} aria-hidden="true">{best.word}</span>
                  </button>
                  <ContrastTip id={tipId} step={t} open={open} end={open && tip.end} above={open && tip.above} maxHeight={open && !pinned ? tip.maxHeight : undefined} compact={open && !pinned && tip.compact} side={open && !pinned ? tip.side : undefined} sideStyle={open && !pinned ? tip.sideStyle : undefined} inline={pinned} />
                  {pinned && (
                    <div className="tt-tip-actions">
                      <button type="button" className="tt-tip-copy" onClick={() => copyHex(t.hex)}>
                        {copiedHex === t.hex ? 'Copied' : `Copy ${t.hex}`}
                      </button>
                      <button type="button" className="tt-tip-close" onClick={closePinned}>Close</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </ToolGrid>
    </ToolLayout>
  )
}
