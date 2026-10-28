import { Suspense, useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ColorPickerPop from '../components/ColorPickerPop'
import ExportMenu from '../components/tool/ExportMenu'
import {
  ToolLayout, ToolButton, ToolGrid, ToolMain, ToolPanel, ToolSection, ToolPills, ToolIcon,
} from '../components/tool/ToolLayout'
import useMediaQuery from '../hooks/useMediaQuery'
import { useProject } from '../contexts/ProjectContext'
import { roleLabel } from '../utils/paletteRoles'
import { autoTonalFromSeed, contrastRatio, generateHarmony, nearestPassingLightness } from '../utils/colors'
import { PAIR_VIEWS, legendLede } from '../utils/palettePairSizes'
import { lazyRoute as lazy } from '../utils/lazyRoute'
import { preloadPairExample } from '../components/contrast/views/registry'
import { trackExampleLoad } from '../components/palette/examples/loading'
import PairLegend from '../components/palette/PairLegend'
// The page's own sheet; every rule is scoped under `.cc`, the page root.
import '../styles/pages/contrast.css'

// The pair views (Interface, Specimen) load only when picked, and so does the
// preview stylesheet they share.
const loadPair = () => import('../components/palette/PairExample')

// Shown where the picture would be when its chunk fails to download. The page
// around it, the colour fields and the numbers all keep working.
function PairUnavailable({ onRetry }) {
  return (
    <div className="cc-pv-fail" role="status">
      <p className="cc-lede">{"This view didn't load."}</p>
      <ToolButton onClick={onRetry}>Try again</ToolButton>
    </div>
  )
}

// A failed chunk resolves to the stub instead of throwing to the route's error
// boundary, which would drop the pair being checked. It is counted as an
// example load so main.jsx does not answer the failure with a page reload
// (see components/palette/examples/loading.js). React keeps a lazy component's
// first result, so a retry swaps in a fresh one.
const makePairExample = () => lazy(() => trackExampleLoad(loadPair).catch(() => ({ default: PairUnavailable })))
let PairExample = makePairExample()

// Contrast Checker — /create/contrast.
// A sticky tool toolbar with the Copy menu; a pair bar (the two colour fields
// and Swap) above the pair painted on a view in a fixed-height frame; "Common
// pairs in this kit"; and one side card holding the ratio, the five WCAG tests,
// the nearest passing colours and the palette swatches. At 900px and below the
// ratio leaves the card and sits under the fields, so the number is on screen
// with the first part of the preview.
//
// TRUTH OVER THE MOCK, and where: the design's eight "common pairs" and nine
// swatches are invented brand values. Here both are read from the person's OWN
// palette (design.palette — what the Palette Builder last wrote, or the colours
// its base and system generate), so "in this kit" is literally true.
//
// Kept because people use them: the hex fields and the shared picker for both
// sides, and "Nearest passing colours" — one-click fixes that move one side
// just far enough, verified before they are offered. Murphy's law on input:
// garbage in a field never blanks the result; the checker recomputes from the
// LAST VALID hex per side.
//
// DISPLAYED RATIOS ARE FLOORED, never rounded. WCAG thresholds are exact, so a
// pair at 4.497:1 must not read "4.50:1" beside a Fail for 4.5. Pass/fail
// always compares the unrounded ratio.
//
// The copy link (?fg=…&bg=…) is read ONCE on load and validated; the address
// bar is never written while typing — the link is built only when copied.

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

function normaliseHex(raw) {
  const m = HEX_RE.exec((raw || '').trim())
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return `#${hex.toUpperCase()}`
}

// Round DOWN to `dp` places, with no epsilon: binary noise can only ever show a
// value a hundredth low, never lift one across a pass/fail step.
const floorTo = (r, dp) => Math.floor(r * 10 ** dp) / 10 ** dp
const ratioStr = (r) => floorTo(r, 2).toFixed(2)

// The five tests, named as WCAG names them. Non-text contrast (1.4.11) is AA
// only; there is no AAA row for it.
const TESTS = [
  { label: 'Normal text, AA', min: 4.5 },
  { label: 'Normal text, AAA', min: 7 },
  { label: 'Large text, AA', min: 3 },
  { label: 'Large text, AAA', min: 4.5 },
  { label: 'UI components and graphics, AA', min: 3 },
]

const VERDICTS = {
  aaa: { tone: 'ok', icon: 'check-circle', head: 'Passes AAA for all text.', note: 'Clears every WCAG 2.2 check.' },
  aa: { tone: 'ok', icon: 'check-circle', head: 'Passes AA for all text.', note: 'AAA needs 7:1.' },
  large: { tone: 'warn', icon: 'warning', head: 'Large text and UI parts only.', note: 'Body text needs 4.5:1.' },
  fail: { tone: 'err', icon: 'x-circle', head: 'Fails every WCAG check.', note: 'Text needs at least 3:1 when large.' },
}
const verdictOf = (r) => VERDICTS[r >= 7 ? 'aaa' : r >= 4.5 ? 'aa' : r >= 3 ? 'large' : 'fail']
// The pair cards' one-word mark; its tone follows the same thresholds.
const markOf = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'Large only' : 'Fails')
const toneOf = (r) => (r >= 4.5 ? 'ok' : r >= 3 ? 'warn' : 'err')
const title = (s) => s.charAt(0) + s.slice(1).toLowerCase()

// A field shows its hint only once the raw value is invalid AND long enough to
// be a finished attempt, so "#6B" mid-typing stays quiet.
const showsHint = (raw, valid) => !valid && (raw || '').trim().length >= 4

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

// One side of the pair: a visible label, then the picker chip and the hex
// input on one row, then a hint that only appears for a finished-looking but
// invalid value. `short` is the phone label ("Text"); the full label stays the
// input's accessible name at every width, so it never reads as just "Text".
// Focusing anything in the field (picker or hex) tells the page which side the
// palette swatches should now fill.
function HexField({ id, label, short, raw, valid, committed, onRaw, onBlur, onTouch }) {
  const hintId = `${id}-hint`
  const bad = showsHint(raw, valid)
  return (
    <div className="cc-field" onFocus={onTouch}>
      <label className="cc-field-k" htmlFor={id}>
        <span className="cc-field-short" aria-hidden="true">{short}</span>
        <span className="cc-field-full">{label}</span>
      </label>
      <div className="cc-field-row">
        <ColorPickerPop
          value={committed}
          onChange={(hex) => { onTouch(); onRaw(hex.toUpperCase()) }}
          ariaLabel={`Pick ${label.toLowerCase()}`}
          triggerClassName="cc-picker"
        />
        <input
          id={id}
          type="text"
          className={bad ? 'cc-hex-input cc-hex-input--bad' : 'cc-hex-input'}
          value={raw}
          onChange={(e) => onRaw(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          inputMode="text"
          autoCapitalize="characters"
          enterKeyHint="done"
          spellCheck="false"
          autoComplete="off"
          aria-invalid={bad}
          aria-describedby={hintId}
        />
      </div>
      <p id={hintId} className="cc-hint cc-hint--bad" aria-live="polite">
        {bad && (
          <>
            <ToolIcon name="warning" size={14} className="cc-hint-ico" />
            <span>Use a hex code like #1F2937. Still checking {committed}.</span>
          </>
        )}
      </p>
    </div>
  )
}

export default function ContrastChecker({ onCopy }) {
  const { design } = useProject()
  // A shared link (?fg=6B7280&bg=FFFFFF) seeds the pair once on load. Each side
  // is validated on its own; an invalid or missing value falls back to the
  // default. The address bar is never written afterwards.
  const [searchParams] = useSearchParams()
  const [seed] = useState(() => ({
    fg: normaliseHex(searchParams.get('fg')) || '#6B7280',
    bg: normaliseHex(searchParams.get('bg')) || '#FFFFFF',
  }))
  const [fgInput, setFgInput] = useState(seed.fg)
  const [fg, setFg] = useState(seed.fg)
  const [bgInput, setBgInput] = useState(seed.bg)
  const [bg, setBg] = useState(seed.bg)
  const [target, setTarget] = useState('text') // which side the swatches set
  // The picture the pair is painted on. `shown` trails `view` while a view
  // loads, so the picture on screen stays until the next one is ready.
  const [view, setViewRaw] = useState('interface')
  const shown = useDeferredValue(view)
  const [pinned, setPinned] = useState(null) // a size class a tap or click holds
  const [hovered, setHovered] = useState(null) // a size class under the pointer or focus
  const setView = (id) => { setViewRaw(id); setPinned(null); setHovered(null) }
  const stacked = useMediaQuery('(max-width: 559px)')
  // One ratio block, rendered in one place: under the fields up to 900px, and
  // at the top of the result card beyond it, so there is one live region.
  const ratioInStrip = useMediaQuery('(max-width: 900px)')

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
  const [, setPairTry] = useState(0)
  const retryPair = () => { PairExample = makePairExample(); setPairTry((n) => n + 1) }
  // Starts the downloads when the pointer or focus reaches the control. The
  // shared preview stylesheet goes first: an example's own sheet must load after
  // it, or the shared reset (`font:inherit`) overrides the example's type sizes.
  const prefetchViews = () => {
    loadPair().then(() => PAIR_VIEWS.forEach((v) => preloadPairExample(v.id)), () => {})
  }

  const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg])
  const ratioText = ratioStr(ratio)
  const verdict = verdictOf(ratio)
  const passes = (min) => ratio >= min

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

  // NEAREST PASSING COLOURS. The next level this pair misses: AA body (4.5:1)
  // first, then AAA body (7:1). nearestPassingLightness scans both directions
  // and returns the smaller move; each candidate is re-verified before it is
  // offered, and carries the pair it produces so the row can show it.
  const goal = ratio < 4.5 ? { min: 4.5, level: 'AA' } : ratio < 7 ? { min: 7, level: 'AAA' } : null
  const goalMin = goal ? goal.min : 0
  const fixes = useMemo(() => {
    if (!goalMin) return []
    const out = []
    const lightness = (hex) => contrastRatio(hex, '#000000')
    const newFg = nearestPassingLightness(fg, bg, goalMin)
    if (newFg && contrastRatio(newFg, bg) >= goalMin) {
      const hex = newFg.toUpperCase()
      out.push({
        key: 'fg', side: 'text', hex, fg: hex, bg,
        ratio: contrastRatio(hex, bg), verb: lightness(hex) > lightness(fg) ? 'Lighten' : 'Darken',
      })
    }
    const newBg = nearestPassingLightness(bg, fg, goalMin)
    if (newBg && contrastRatio(fg, newBg) >= goalMin) {
      const hex = newBg.toUpperCase()
      out.push({
        key: 'bg', side: 'background', hex, fg, bg: hex,
        ratio: contrastRatio(fg, hex), verb: lightness(hex) > lightness(bg) ? 'Lighten' : 'Darken',
      })
    }
    return out
  }, [fg, bg, goalMin])
  const applyFix = (fix) => (fix.side === 'text' ? setFgHex(fix.hex) : setBgHex(fix.hex))

  const current = target === 'text' ? fg : bg

  // ── Taking the result away ──
  const resultText = () => [
    `Text ${fg} on background ${bg}`,
    `Contrast ${ratioText}:1 (WCAG 2.2)`,
    ...TESTS.map((t) => `${t.label} ${t.min}:1: ${passes(t.min) ? 'Pass' : 'Fail'}`),
  ].join('\n')
  const cssText = () => {
    const best = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : null
    const note = best ? `${ratioText}:1, WCAG 2.2 ${best} for normal text` : `${ratioText}:1, below WCAG 2.2 AA for normal text`
    return `--color-text: ${fg};\n--color-background: ${bg}; /* ${note} */`
  }
  const linkText = () => `${window.location.origin}/create/contrast?fg=${fg.slice(1)}&bg=${bg.slice(1)}`
  const copyItems = [
    { id: 'result', label: 'Copy result', icon: 'copy', onSelect: () => onCopy?.(resultText()) },
    { id: 'css', label: 'Copy CSS', icon: 'code', onSelect: () => onCopy?.(cssText()) },
    { id: 'link', label: 'Copy link', icon: 'link', onSelect: () => onCopy?.(linkText()) },
  ]

  // One sentence per change for a screen reader; the visible numeral, verdict
  // and note are hidden from it so nothing is read twice. The unit is a quieter
  // span INSIDE the numeral, so the element's text is one token ("4.83:1").
  const ratioBlock = (
    <div className={ratioInStrip ? 'cc-ratio cc-ratio--strip' : 'tl-sec cc-ratio'}>
      <span className="sr-only" aria-live="polite">{`${ratioText} to 1. ${verdict.head}`}</span>
      <span className={`cc-ratio-num cc-tone--${verdict.tone}`} aria-hidden="true">{ratioText}<span className="cc-ratio-unit">:1</span></span>
      <p className="cc-ratio-verdict" aria-hidden="true">
        <ToolIcon name={verdict.icon} size={16} className={`cc-ico--${verdict.tone}`} />
        <span>{verdict.head}</span>
      </p>
      <p className="cc-ratio-note" aria-hidden="true">{verdict.note}</p>
    </div>
  )

  return (
    <ToolLayout
      className="cc"
      title="Contrast Checker"
      titleId="cc-title"
      primary={<ExportMenu label="Copy" icon="copy" items={copyItems} />}
    >
      <ToolGrid>
        <ToolMain>
          {/* First thing on the page at every width: the two colours being checked. */}
          <div className="cc-pairbar" role="group" aria-label="Colours to check">
            <HexField
              id="cc-fg" label="Text colour" short="Text"
              raw={fgInput} valid={fgValid} committed={fg}
              onRaw={setSide(setFgInput, setFg)} onBlur={() => setFgInput(fg)}
              onTouch={() => setTarget('text')}
            />
            <ToolButton
              variant="square"
              icon={stacked ? 'arrows-down-up' : 'arrows-left-right'}
              iconSize={16}
              className="cc-swap"
              onClick={swap}
              aria-label="Swap text and background"
              title="Swap text and background"
            />
            <HexField
              id="cc-bg" label="Background colour" short="Background"
              raw={bgInput} valid={bgValid} committed={bg}
              onRaw={setSide(setBgInput, setBg)} onBlur={() => setBgInput(bg)}
              onTouch={() => setTarget('background')}
            />
          </div>

          {ratioInStrip && ratioBlock}

          {/* What the pair is painted on. Every view fills the pair as given and
              never corrects it, so a failing pair looks as bad as it is. */}
          <div className="cc-views-wrap" onPointerOver={prefetchViews} onFocus={prefetchViews}>
            <ToolPills
              label="Preview the pair on"
              shape="block"
              className="cc-views"
              options={PAIR_VIEWS.map((v) => ({
                value: v.id,
                ariaLabel: v.name,
                label: v.more ? <span>{v.label}<span className="cc-views-more">{v.more}</span></span> : v.label,
              }))}
              value={view}
              onChange={setView}
            />
          </div>

          {/* The legend sits above the picture it marks, so choosing a test and seeing
              its parts need no scroll between them. It is there for every view, so
              the page does not change height as the view does. Stacked, its lede
              moves under the frame to keep the picture high on the screen. */}
          <PairLegend ratio={ratio} pinned={pinned} onPin={setPinned} onHover={setHovered} lede={!stacked} />

          {/* The frame is a fixed height at each width and holds whatever is in it
              (the view, the loading placeholder or the failure message), so a
              switch moves nothing around it. One boundary round every view, mounted
              from the start, so a switch to a view that is still loading keeps the
              current picture. */}
          <div className="cc-frame" style={{ background: bg }}>
            <Suspense fallback={<div className="cc-pv-wait" aria-hidden="true" />}>
              <PairExample viewId={shown} fg={fg} bg={bg} highlight={hovered || pinned} pinned={pinned} onRetry={retryPair} />
            </Suspense>
          </div>
          {stacked && <p className="cc-lede cc-lg-lede">{legendLede(ratio)}</p>}
        </ToolMain>

        <ToolPanel label="Contrast result" className="cc-panel">
          {!ratioInStrip && ratioBlock}

          <ToolSection label="WCAG 2.2" className="cc-tests-sec">
            <ul className="cc-tests">
              {TESTS.map((t) => {
                const pass = passes(t.min)
                return (
                  <li key={t.label} className={pass ? 'cc-check cc-check--pass' : 'cc-check cc-check--fail'}>
                    <ToolIcon name={pass ? 'check-circle' : 'x-circle'} size={16} className={`cc-check-ico cc-ico--${pass ? 'ok' : 'err'}`} />
                    <span className="cc-check-name">{t.label}</span>
                    <span className="cc-check-need">{t.min}:1</span>
                    <span className={`cc-check-mark cc-tone--${pass ? 'ok' : 'err'}`}>{pass ? 'Pass' : 'Fail'}</span>
                  </li>
                )
              })}
            </ul>
            <div className="cc-note">
              <ul className="cc-explain">
                <li><strong>AA</strong> is the usual target: 4.5:1 for normal text, 3:1 for large text, icons and input borders.</li>
                <li><strong>AAA</strong> is stricter: 7:1 for normal text and 4.5:1 for large text. UI components have no AAA level.</li>
                <li><strong>Large text</strong> is 24px and up, or 18.66px and up if bold.</li>
              </ul>
              {/* A plain anchor: a router Link adds nothing to a new tab. The visible
                  words stay the accessible name, with the new-tab hint appended. */}
              <a className="cc-note-link" href="/learn/colour-contrast" target="_blank" rel="noopener">
                How contrast is measured
                <ToolIcon name="arrow-square-out" size={14} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </ToolSection>

          <ToolSection label="Nearest passing colours" className="cc-fixes-sec">
            {/* The section reserves a fixed height, so the swatches below it do not
                jump as the pair changes: a hidden copy of the fullest state shares
                the cell with what is showing. Its rows use the real classes and
                buttons at the longest real wording ("Lighten", the 4.5:1 lede, and
                "background"), so it wraps wherever a live row wraps. From 901px
                it holds the lede and one row (the page is as tall as its main
                column there, so the panel does not set it); below that it holds
                the lede and two rows, because the panel sits in the page flow.
                Its words are CSS generated content, so they are in no one's page
                text: not a screen reader's, a find, or a test's. */}
            <div className="cc-fixes-body">
              <div className="cc-fixes-ghost" aria-hidden="true">
                <p className="cc-lede" data-t="To reach AA (4.5:1) for body text, change one colour:" />
                <div className="cc-fixes">
                  {['text', 'background'].map((side) => (
                    <div key={side} className="cc-fix">
                      <span className="cc-fix-chip" />
                      <span className="cc-fix-desc">
                        <span className="cc-fix-line"><span data-t={`Lighten ${side} to `} /><strong data-t="#DDDDDD" /></span>
                        <span className="cc-fix-ratio" data-t="4.50:1" />
                      </span>
                      <ToolButton variant="quiet" className="cc-fix-use" tabIndex={-1}><span data-t="Use" /></ToolButton>
                      <ToolButton variant="square" icon="copy" className="cc-fix-copy" tabIndex={-1} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="cc-fixes-live">
                {goal ? (
                  fixes.length > 0 ? (
                    <>
                      <p className="cc-lede">
                        {goal.level === 'AA' ? 'To reach AA (4.5:1) for body text, change one colour:' : 'To reach AAA (7:1), change one colour:'}
                      </p>
                      <div className="cc-fixes">
                        {fixes.map((fix) => (
                          <div key={fix.key} className="cc-fix">
                            <span className="cc-fix-chip" ref={pairRef(fix.fg, fix.bg)} aria-hidden="true">Aa</span>
                            <span className="cc-fix-desc">
                              <span className="cc-fix-line">{fix.verb} {fix.side} to <strong>{fix.hex}</strong></span>
                              <span className="cc-fix-ratio cc-tone--ok">{ratioStr(fix.ratio)}:1</span>
                            </span>
                            <ToolButton variant="quiet" className="cc-fix-use" aria-label={`Use ${fix.hex} for the ${fix.side}`} onClick={() => applyFix(fix)}>Use</ToolButton>
                            <ToolButton variant="square" icon="copy" className="cc-fix-copy" aria-label={`Copy ${fix.hex}`} title={`Copy ${fix.hex}`} onClick={() => onCopy?.(fix.hex)} />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="cc-hint cc-unfixable">
                      Neither colour can reach {goal.min}:1 on its own here: they sit
                      too close in lightness. Change both, or start from a kit pair.
                    </p>
                  )
                ) : (
                  <p className="cc-hint cc-nothing">Passes every WCAG 2.2 check. Nothing to change.</p>
                )}
              </div>
            </div>
          </ToolSection>

          <ToolSection label="From your palette" className="cc-colours">
            <ToolPills
              label="Swatches change the"
              shape="block"
              options={[{ value: 'text', label: 'Text' }, { value: 'background', label: 'Background' }]}
              value={target}
              onChange={setTarget}
            />
            <div className="cc-swatches" role="group" aria-label={`Palette colours for the ${target}`}>
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
          </ToolSection>
        </ToolPanel>

        {/* A third grid child so the result panel comes before the kit pairs on
            tablet and phone, and sits beside them on desktop. */}
        <section className="cc-pairs" aria-labelledby="cc-pairs-title">
          <h2 id="cc-pairs-title" className="tl-sec-label">Common pairs in this kit</h2>
          <p className="cc-lede">Read from your palette. Pick one to check it.</p>
          <div className="cc-pair-grid">
            {pairs.map((p) => {
              const r = ratioStr(p.ratio)
              const isCurrent = p.fg === fg && p.bg === bg
              return (
                <button
                  key={`${p.fg}-${p.bg}`}
                  type="button"
                  className="cc-pair"
                  aria-pressed={isCurrent}
                  onClick={() => { setFgHex(p.fg); setBgHex(p.bg) }}
                  aria-label={`Check ${p.label}, ${r} to 1, ${markOf(p.ratio)}`}
                >
                  <span className="cc-pair-chip" ref={pairRef(p.fg, p.bg)} aria-hidden="true">Aa</span>
                  <span className="cc-pair-body">
                    <span className="cc-pair-label">{p.label}</span>
                    <span className="cc-pair-meta">
                      <span className="cc-pair-ratio">{r}:1</span>
                      <span className={`cc-pair-mark cc-tone--${toneOf(p.ratio)}`}>{markOf(p.ratio)}</span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </ToolGrid>
    </ToolLayout>
  )
}
