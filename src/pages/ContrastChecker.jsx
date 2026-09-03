import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import ColorPickerPop from '../components/ColorPickerPop'
import { contrastRatio, fixForeground, fixBackground, textColorForBg } from '../utils/colors'

// Colour Contrast Checker — the standalone /create/contrast page. Test a
// foreground/background pair against WCAG 2.2, see the pair in a live preview,
// and get one-click fixes (binary-searched lightness shifts from
// fixForeground/fixBackground) that actually pass.
//
// Murphy's-law input handling: text fields accept anything but the checker only
// recomputes from the LAST VALID hex per side — garbage never blanks the result.

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

function normaliseHex(raw) {
  const m = HEX_RE.exec((raw || '').trim())
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return `#${hex.toUpperCase()}`
}

// WCAG 2.2 success criteria — the five checks designers actually ask about.
const WCAG_CHECKS = [
  { id: 'aa-normal', label: 'AA · normal text', min: 4.5 },
  { id: 'aa-large', label: 'AA · large text', min: 3 },
  { id: 'aaa-normal', label: 'AAA · normal text', min: 7 },
  { id: 'aaa-large', label: 'AAA · large text', min: 4.5 },
  { id: 'ui', label: 'UI components', min: 3 },
]

// CSS-custom-property refs (the no-inline-styles route). Inline arrow refs
// re-run every render, so the preview and swatches track live edits.
function pairRef(fg, bg) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--cc-fg', fg)
    el.style.setProperty('--cc-bg', bg)
  }
}

function chipRef(color) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--cc-chip', color)
    el.style.setProperty('--cc-chip-ink', textColorForBg(color))
  }
}

// One side of the pair: colour well + hex field with last-valid fallback.
function ColorField({ id, label, raw, valid, committed, onRaw, onBlur }) {
  return (
    <div className="cc-field">
      <label className="seg-label" htmlFor={id}>{label}</label>
      <div className="cc-field-row">
        {/* The shared picker, not `<input type="color">`. `onRaw` already both
            records the text and commits a valid hex, so the picker's emitted
            `#rrggbb` lands exactly where the native control's value did. */}
        <ColorPickerPop
          value={committed}
          onChange={(hex) => onRaw(hex.toUpperCase())}
          // `label` is already "Text colour" / "Background colour", so appending
          // "colour" produced "Pick text colour colour" — which is what a screen
          // reader actually announced.
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
          aria-invalid={!valid}
        />
      </div>
    </div>
  )
}

export default function ContrastChecker({ onCopy }) {
  const [fgInput, setFgInput] = useState('#6B7280')
  const [fg, setFg] = useState('#6B7280')
  const [bgInput, setBgInput] = useState('#FFFFFF')
  const [bg, setBg] = useState('#FFFFFF')

  const fgValid = normaliseHex(fgInput) != null
  const bgValid = normaliseHex(bgInput) != null

  const setSide = (setRaw, setCommitted) => (raw) => {
    setRaw(raw)
    const norm = normaliseHex(raw)
    if (norm) setCommitted(norm)
  }

  const swap = () => {
    setFg(bg); setFgInput(bg)
    setBg(fg); setBgInput(fg)
  }

  const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg])
  const ratioLabel = `${(Math.round(ratio * 100) / 100).toFixed(2)} : 1`

  // Fix suggestions for each unmet tier. Every candidate is re-verified with
  // contrastRatio before it's offered — a fix that can't reach the target (e.g.
  // a mid-grey pair chasing 7:1) is silently dropped, never shown as a lie.
  const fixes = useMemo(() => {
    const out = []
    for (const target of [4.5, 7]) {
      if (ratio >= target) continue
      const tier = target === 4.5 ? 'AA' : 'AAA'
      const newFg = fixForeground(fg, bg, target)
      if (newFg.toUpperCase() !== fg.toUpperCase() && contrastRatio(newFg, bg) >= target) {
        out.push({ key: `fg-${tier}`, side: 'text', tier, target, hex: newFg.toUpperCase() })
      }
      const newBg = fixBackground(fg, bg, target)
      if (newBg.toUpperCase() !== bg.toUpperCase() && contrastRatio(fg, newBg) >= target) {
        out.push({ key: `bg-${tier}`, side: 'background', tier, target, hex: newBg.toUpperCase() })
      }
    }
    return out
  }, [fg, bg, ratio])

  const applyFix = (fix) => {
    if (fix.side === 'text') { setFg(fix.hex); setFgInput(fix.hex) }
    else { setBg(fix.hex); setBgInput(fix.hex) }
  }

  const passesAll = WCAG_CHECKS.every(c => ratio >= c.min)
  const passesAny = ratio >= 3

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Colour</div>
        <h1>Colour Contrast Checker</h1>
        <p>
          Test any text and background pair against WCAG AA and AAA. If a check
          fails, one click nudges either colour just far enough to pass —
          verified before it&rsquo;s offered.
        </p>
      </div>

      <div className="cc-grid">
        {/* ── Inputs + verdicts ── */}
        <div className="card cc-panel">
          <div className="cc-fields">
            <ColorField
              id="cc-fg" label="Text colour"
              raw={fgInput} valid={fgValid} committed={fg}
              onRaw={setSide(setFgInput, setFg)} onBlur={() => setFgInput(fg)}
            />
            <button type="button" className="cc-swap" onClick={swap} aria-label="Swap text and background colours">
              ⇄
            </button>
            <ColorField
              id="cc-bg" label="Background colour"
              raw={bgInput} valid={bgValid} committed={bg}
              onRaw={setSide(setBgInput, setBg)} onBlur={() => setBgInput(bg)}
            />
          </div>
          {(!fgValid || !bgValid) && (
            <p className="cc-hint" role="alert">
              Not a hex colour — still checking {fg} on {bg}.
            </p>
          )}

          <div className="cc-ratio" aria-live="polite">
            <span className="cc-ratio-num">{ratioLabel}</span>
            <span className={passesAll ? 'cc-ratio-verdict cc-pass' : passesAny ? 'cc-ratio-verdict cc-mixed' : 'cc-ratio-verdict cc-fail'}>
              {passesAll ? 'Passes everything' : passesAny ? 'Passes some checks' : 'Fails all checks'}
            </span>
          </div>

          <ul className="cc-checks">
            {WCAG_CHECKS.map(c => {
              const pass = ratio >= c.min
              return (
                <li key={c.id} className={pass ? 'cc-check cc-check--pass' : 'cc-check cc-check--fail'}>
                  <span className="cc-check-mark" aria-hidden="true">{pass ? '✓' : '✕'}</span>
                  <span className="cc-check-label">{c.label}</span>
                  <span className="cc-check-min">≥ {c.min}:1 — {pass ? 'pass' : 'fail'}</span>
                </li>
              )
            })}
          </ul>

          {fixes.length > 0 && (
            <>
              <label className="seg-label">Make it pass</label>
              <div className="cc-fixes">
                {fixes.map(fix => (
                  <div key={fix.key} className="cc-fix">
                    <span className="cc-fix-chip" ref={chipRef(fix.hex)}>{fix.hex}</span>
                    <span className="cc-fix-desc">
                      {fix.tier} ({fix.target}:1) — adjust the {fix.side}
                    </span>
                    <button type="button" className="cc-fix-apply" onClick={() => applyFix(fix)}>Apply</button>
                    <button type="button" className="cc-fix-copy" onClick={() => onCopy?.(fix.hex)}>Copy</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Live preview ── */}
        <div className="card cc-panel">
          <label className="seg-label">Live preview</label>
          <div className="cc-preview" ref={pairRef(fg, bg)}>
            <p className="cc-preview-large">Large heading text (24px)</p>
            <p className="cc-preview-normal">
              Normal body text at 16px. The five checks on the left tell you
              exactly where this pair is safe to use.
            </p>
            <p className="cc-preview-small">Small print at 12px — the hardest test of all.</p>
            <span className="cc-preview-ui">UI component</span>
          </div>
          <p className="cc-hint">
            Large text = 24px+, or 18.5px+ bold. UI components (borders, icons,
            focus rings) need 3:1 against adjacent colours.
          </p>
        </div>
      </div>

      <nav className="cc-more" aria-label="More colour tools">
        <NavLink to="/create/tint" className="cc-more-link">Build a tint scale from this colour →</NavLink>
        <NavLink to="/create/color" className="cc-more-link">Open the full Colour Studio →</NavLink>
      </nav>
    </div>
  )
}
