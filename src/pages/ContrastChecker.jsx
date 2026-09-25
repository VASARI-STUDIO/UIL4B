import { useMemo, useState } from 'react'
import ColorPickerPop from '../components/ColorPickerPop'
import {
  ToolLayout, ToolButton, ToolGrid, ToolMain, ToolPanel, ToolSection, ToolPills, ToolIcon,
} from '../components/tool/ToolLayout'
import { useProject } from '../contexts/ProjectContext'
import { roleLabel } from '../utils/paletteRoles'
import { autoTonalFromSeed, contrastRatio, generateHarmony, nearestPassingLightness, textColorForBg } from '../utils/colors'
// The page's own sheet; every rule is scoped under `.cc`, the page root.
import '../styles/pages/contrast.css'

// Contrast Checker — /create/contrast, rebuilt to the design
// (UIL4B App.dc.html, `isContrast`, D:718-791, view model D:1899-1934).
// A sticky tool toolbar with Swap; the pair painted on a specimen
// card; "Common pairs in this kit"; and one side card holding the ratio, the
// five WCAG tests, the Text/Background target, the swatches and the pair.
//
// TRUTH OVER THE MOCK, and where: the design's eight "common pairs" and nine
// swatches are invented brand values. Here both are read from the person's OWN
// palette (design.palette — what the Palette Builder last wrote, or the colours
// its base and system generate), so "in this kit" is literally true.
//
// Kept from the previous build because people use them: the hex fields and the
// shared picker for both sides (the drawn footer "Text #… / On #…" is made
// editable in place), and "Make it pass" — one-click fixes that move one side
// just far enough, verified before they are offered. Murphy's law on input:
// garbage in a field never blanks the result; the checker recomputes from the
// LAST VALID hex per side.

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

function normaliseHex(raw) {
  const m = HEX_RE.exec((raw || '').trim())
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return `#${hex.toUpperCase()}`
}

// The five tests, as drawn (D:1903-1906). Non-text contrast (1.4.11) is AA
// only; there is no AAA row for it, which the design gets right.
const TESTS = [
  { label: 'Body text, 16px', min: 4.5, level: 'AA' },
  { label: 'Body text, enhanced', min: 7, level: 'AAA' },
  { label: 'Large text, 24px', min: 3, level: 'AA' },
  { label: 'Large text, enhanced', min: 4.5, level: 'AAA' },
  { label: 'UI borders and icons', min: 3, level: 'AA' },
]

const verdictOf = (r) => (r >= 7 ? 'Passes AAA' : r >= 4.5 ? 'Passes AA' : r >= 3 ? 'Large text only' : 'Fails')
const toneOf = (r) => (r >= 4.5 ? 'ok' : r >= 3 ? 'warn' : 'bad')
const title = (s) => s.charAt(0) + s.slice(1).toLowerCase()

// The kit: the person's palette, named by its role. Falls back to the colours
// the saved base + system generate, which is what the Palette Builder would
// show them, so the list is never empty and never invented.
function kitFrom(palette) {
  const harmony = palette?.harmony || 'auto'
  const named = (list) => {
    const seen = new Set()
    return list.map(normaliseHex).slice(0, 7)
      .map((hex, i) => ({ hex, name: title(roleLabel(harmony, i)) }))
      .filter((c) => c.hex && (seen.has(c.hex) ? false : (seen.add(c.hex), true)))
  }
  const own = named(palette?.colors || [])
  if (own.length >= 2) return own
  const base = normaliseHex(palette?.base) || '#0051FF'
  const generated = harmony === 'auto' ? autoTonalFromSeed(base) : generateHarmony(base, harmony)
  return named(generated)
}

// Pairs drawn from the kit: every colour on its lightest and darkest member,
// and the lightest on the darkest — the pairings a UI actually uses.
function pairsFrom(kit) {
  if (kit.length < 2) return []
  const lum = (hex) => contrastRatio(hex, '#000000')
  const sorted = [...kit].sort((a, b) => lum(a.hex) - lum(b.hex))
  const dark = sorted[0]
  const light = sorted[sorted.length - 1]
  const out = []
  const push = (fg, bg) => {
    if (fg.hex === bg.hex || out.some((p) => p.fg === fg.hex && p.bg === bg.hex)) return
    out.push({ label: `${fg.name} on ${bg.name.toLowerCase()}`, fg: fg.hex, bg: bg.hex, ratio: contrastRatio(fg.hex, bg.hex) })
  }
  push(light, dark)
  push(dark, light)
  for (const c of kit) { push(c, dark); push(c, light) }
  return out.slice(0, 8)
}

function pairRef(fg, bg) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--cc-fg', fg)
    el.style.setProperty('--cc-bg', bg)
  }
}
function swatchRef(hex, ink) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--cc-sw', hex)
    if (ink) el.style.setProperty('--cc-sw-ink', ink)
  }
}

function HexField({ id, label, short, raw, valid, committed, onRaw, onBlur }) {
  return (
    <div className="cc-field">
      <label className="cc-field-k" htmlFor={id}>{short}</label>
      <ColorPickerPop
        value={committed}
        onChange={(hex) => onRaw(hex.toUpperCase())}
        ariaLabel={`Pick ${label.toLowerCase()}`}
        triggerClassName="cc-picker"
      />
      <input
        id={id}
        type="text"
        className={valid ? 'cc-hex-input' : 'cc-hex-input cc-hex-input--bad'}
        value={raw}
        onChange={(e) => onRaw(e.target.value)}
        onBlur={onBlur}
        spellCheck="false"
        autoComplete="off"
        aria-label={label}
        aria-invalid={!valid}
      />
    </div>
  )
}

export default function ContrastChecker({ onCopy }) {
  const { design } = useProject()
  const [fgInput, setFgInput] = useState('#6B7280')
  const [fg, setFg] = useState('#6B7280')
  const [bgInput, setBgInput] = useState('#FFFFFF')
  const [bg, setBg] = useState('#FFFFFF')
  const [target, setTarget] = useState('text') // which side the swatches set

  const fgValid = normaliseHex(fgInput) != null
  const bgValid = normaliseHex(bgInput) != null

  const setSide = (setRaw, setCommitted) => (raw) => {
    setRaw(raw)
    const norm = normaliseHex(raw)
    if (norm) setCommitted(norm)
  }
  const setFgHex = (hex) => { setFg(hex); setFgInput(hex) }
  const setBgHex = (hex) => { setBg(hex); setBgInput(hex) }

  const swap = () => { setFgHex(bg); setBgHex(fg) }

  const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg])
  const ratioText = (Math.round(ratio * 100) / 100).toFixed(2)

  const kit = useMemo(() => kitFrom(design?.palette), [design?.palette])
  const pairs = useMemo(() => pairsFrom(kit), [kit])
  // Nine swatches, as drawn: the kit, then the two poles every kit is read
  // against.
  const swatches = useMemo(() => {
    const out = kit.map((c) => ({ hex: c.hex, name: c.name }))
    for (const pole of [{ hex: '#FFFFFF', name: 'White' }, { hex: '#0B0C0E', name: 'Near black' }]) {
      if (!out.some((s) => s.hex === pole.hex)) out.push(pole)
    }
    return out.slice(0, 9)
  }, [kit])

  // MAKE IT PASS. The next level this pair misses: AA body (4.5:1) first, then
  // AAA body (7:1). nearestPassingLightness scans both directions and returns
  // the smaller move; each candidate is re-verified before it is offered.
  const goal = ratio < 4.5 ? { min: 4.5, level: 'AA' } : ratio < 7 ? { min: 7, level: 'AAA' } : null
  const goalMin = goal ? goal.min : 0
  const fixes = useMemo(() => {
    if (!goalMin) return []
    const out = []
    const newFg = nearestPassingLightness(fg, bg, goalMin)
    if (newFg && contrastRatio(newFg, bg) >= goalMin) out.push({ key: 'fg', side: 'text', hex: newFg.toUpperCase() })
    const newBg = nearestPassingLightness(bg, fg, goalMin)
    if (newBg && contrastRatio(fg, newBg) >= goalMin) out.push({ key: 'bg', side: 'background', hex: newBg.toUpperCase() })
    return out
  }, [fg, bg, goalMin])
  const applyFix = (fix) => (fix.side === 'text' ? setFgHex(fix.hex) : setBgHex(fix.hex))

  const current = target === 'text' ? fg : bg

  return (
    <ToolLayout
      className="cc"
      title="Contrast Checker"
      titleId="cc-title"
      primary={(
        <ToolButton icon="arrows-down-up" iconSize={14} onClick={swap} aria-label="Swap text and background colours" title="Swap text and background">
          Swap
        </ToolButton>
      )}
    >
      <ToolGrid>
        <ToolMain>
          {/* The pair, on a specimen. The design's copy (D:731-734). It is a picture of
              text, so it is a depiction rather than a heading outline. */}
          <section className="cc-preview" ref={pairRef(fg, bg)} aria-label="Preview of the pair">
            <p className="cc-spec-h">Sample heading</p>
            <p className="cc-spec-large">Large text at 19px, the size WCAG treats as large once it is bold.</p>
            <p className="cc-spec-body">Body copy at 14px. This is the size most interfaces actually use for paragraphs, table cells and helper text, and the size that decides whether the pair is usable.</p>
            <span className="cc-spec-btn">Button label</span>
          </section>

          <section className="cc-pairs" aria-labelledby="cc-pairs-title">
            <h2 id="cc-pairs-title" className="tl-sec-label">Common pairs in this kit</h2>
            <div className="cc-pair-grid">
              {pairs.map((p) => {
                const tone = toneOf(p.ratio)
                return (
                  <button
                    key={`${p.fg}-${p.bg}`}
                    type="button"
                    className="cc-pair"
                    onClick={() => { setFgHex(p.fg); setBgHex(p.bg) }}
                    aria-label={`Check ${p.label}, ${p.ratio.toFixed(1)} to 1`}
                  >
                    <span className="cc-pair-chip" ref={pairRef(p.fg, p.bg)} aria-hidden="true">Aa</span>
                    <span className="cc-pair-body">
                      <span className="cc-pair-label">{p.label}</span>
                      <span className="cc-pair-ratio">{p.ratio.toFixed(1)}:1</span>
                    </span>
                    <span className={`cc-pair-mark cc-tone--${tone}`}>{p.ratio >= 4.5 ? 'AA' : p.ratio >= 3 ? '3:1' : 'Fail'}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </ToolMain>

        <ToolPanel label="Contrast result" className="cc-panel">
          <div className="tl-sec cc-ratio" aria-live="polite">
            {/* The unit is a quieter span INSIDE the numeral, so the element's
                text is one token for a reader ("4.83:1"). */}
            <span className="cc-ratio-num">{ratioText}<span className="cc-ratio-unit">:1</span></span>
            <span className={`cc-ratio-verdict cc-tone--${toneOf(ratio)}`}>{verdictOf(ratio)}</span>
          </div>

          <ToolSection label="WCAG 2.2" className="cc-tests-sec">
            <ul className="cc-tests">
              {TESTS.map((t) => {
                const pass = ratio >= t.min
                return (
                  <li key={t.label} className={pass ? 'cc-check cc-check--pass' : 'cc-check cc-check--fail'}>
                    <ToolIcon name={pass ? 'check-circle' : 'x-circle'} size={15} className={`cc-check-ico cc-tone--${pass ? 'ok' : 'bad'}`} />
                    <span className="cc-check-name">{t.label}</span>
                    <span className="cc-check-level">{t.level}</span>
                    <span className={`cc-check-mark cc-tone--${pass ? 'ok' : 'bad'}`}>
                      {pass ? 'Pass' : 'Fail'}
                      <span className="sr-only"> — needs {t.min} to 1</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </ToolSection>

          <ToolSection label="Colours" className="cc-colours">
            <ToolPills
              label="Swatches set the"
              shape="block"
              options={[{ value: 'text', label: 'Text' }, { value: 'background', label: 'Background' }]}
              value={target}
              onChange={setTarget}
            />
            <div className="cc-swatches" role="group" aria-label={`Kit colours for the ${target}`}>
              {swatches.map((s) => {
                const on = s.hex === current
                return (
                  <button
                    key={s.hex}
                    type="button"
                    className={on ? 'cc-swatch is-on' : 'cc-swatch'}
                    ref={swatchRef(s.hex)}
                    aria-label={`${s.name}, ${s.hex}`}
                    aria-pressed={on}
                    title={s.name}
                    onClick={() => (target === 'text' ? setFgHex(s.hex) : setBgHex(s.hex))}
                  />
                )
              })}
            </div>
            <div className="cc-fields">
              <HexField
                id="cc-fg" label="Text colour" short="Text"
                raw={fgInput} valid={fgValid} committed={fg}
                onRaw={setSide(setFgInput, setFg)} onBlur={() => setFgInput(fg)}
              />
              <HexField
                id="cc-bg" label="Background colour" short="On"
                raw={bgInput} valid={bgValid} committed={bg}
                onRaw={setSide(setBgInput, setBg)} onBlur={() => setBgInput(bg)}
              />
            </div>
            {(!fgValid || !bgValid) && (
              <p className="cc-hint" role="alert">Not a hex colour — still checking {fg} on {bg}.</p>
            )}
          </ToolSection>

          {goal && (
            <ToolSection label="Make it pass" className="cc-fixes-sec">
              {fixes.length > 0 ? (
                <div className="cc-fixes">
                  {fixes.map((fix) => (
                    <div key={fix.key} className="cc-fix">
                      <span className="cc-fix-chip" ref={swatchRef(fix.hex, textColorForBg(fix.hex))}>{fix.hex}</span>
                      <span className="cc-fix-desc">{goal.level} ({goal.min}:1) — move the {fix.side}</span>
                      <button type="button" className="cc-fix-btn" onClick={() => applyFix(fix)}>Apply</button>
                      <button type="button" className="cc-fix-btn" onClick={() => onCopy?.(fix.hex)}>Copy</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="cc-hint cc-unfixable">
                  Neither colour can reach {goal.min}:1 on its own here — they sit
                  too close in lightness. Move both, or pick a different pair.
                </p>
              )}
            </ToolSection>
          )}
        </ToolPanel>
      </ToolGrid>
    </ToolLayout>
  )
}
