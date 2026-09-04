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
//
// ── LIVE PREVIEW: the design specification [contrast-checker-overhaul] ────────
//
// THE DEFECT. The preview used to render four lines that DESCRIBED a test
// rather than BEING one: "Large heading text (24px)", "Normal body text at
// 16px…", "Small print at 12px — the hardest test of all", and a bordered pill
// reading "UI component". Every line was a caption about itself. No product
// looks like that, so it answered "what does 4.5:1 actually look like?" with a
// specimen of nothing, and it put the sizes in WORDS while leaving the reader to
// cross-reference the checklist in the other panel to find out which of those
// four lines was the one failing.
//
// WHAT REPLACES IT. A real surface — heading, body copy, a solid button, an
// outline button, small print with a link — rendered in the pair, with each
// element carrying ITS OWN threshold as a chip. The thresholds genuinely
// differ, and that difference is the single most useful thing this page can
// teach: one pair can carry a 24px heading at 3:1 and fail the caption beneath
// it at 4.5:1, and until the verdicts sat ON the elements that was invisible.
// The solid button earns its place twice over — it inverts the pair, and shows
// that the ratio is identical either way round, which is not obvious.
//
// REFERENCES (Mobbin, platform web). Whereby
// (mobbin.com/screens/e86cb1da-6690-4693-bff7-5632af4a4f9c) is the model: it
// puts the ratio and an AA badge inline beside each colour, and previews the
// pair on the ACTUAL product surface — a real primary action, a real chat
// input — not on lorem. Miro
// (mobbin.com/screens/96b4bf05-95bb-4dd3-a26d-1209ed32a626) renders the
// offending specimen itself at real size next to a plain-language remedy.
// Typeform (mobbin.com/screens/b78e49a7-bf27-4966-b5f6-e8f7fd5033b9) writes its
// checks as sentences about real objects rather than tier names, and Hotjar
// (mobbin.com/screens/043235af-448c-414a-b5b9-94ef3f8376a2) makes the verdict a
// short headline in words. Linktree
// (mobbin.com/screens/351c283b-da2e-437a-860a-d68c5a0da8e7) offers the one-click
// remedy this page already has, which is why the fix row is kept as it stands.
//
// THE ONE RULE THE CHIPS MUST OBEY. A verdict chip sits on the user's chosen
// background but never PAINTS with it — page tokens only. This is not fussiness.
// A chip drawn in the pair under test becomes unreadable exactly when the pair
// fails, which is the moment its reader most needs it, and this page has
// already shipped that class of defect once: its own verdict line measured
// 2.94:1 against the 4.5:1 it enforces. The durable fix is not to choose the
// colour carefully, it is to not use the colour. 06-colour-tool-workbenches
// measures `.cc-verdict` in both themes for that reason.
//
// STILL OPEN, deliberately: the left panel keeps its abstract five-tier list.
// Whereby's inline per-field ratio badge and Typeform's plain-language checks
// belong there and are not done here — see [contrast-checker-overhaul].

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

// A per-element verdict. `min` is that element's OWN WCAG threshold, which is
// the whole point of showing it on the element rather than in a list.
//
// Page tokens only — never --cc-fg/--cc-bg. See the rule in the header block.
function Verdict({ ratio, min, what }) {
  const pass = ratio >= min
  return (
    <span className={pass ? 'cc-verdict cc-verdict--pass' : 'cc-verdict cc-verdict--fail'}>
      <span className="cc-verdict-mark" aria-hidden="true">{pass ? '✓' : '✕'}</span>
      <span aria-hidden="true">{min}:1</span>
      <span className="sr-only">
        {what} needs {min} to 1; this pair is {ratio.toFixed(2)} to 1 — {pass ? 'passes' : 'fails'}
      </span>
    </span>
  )
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
          <p className="cc-lede">
            The pair on a real surface. Each chip is that element&rsquo;s own
            threshold, not the page&rsquo;s — which is why one pair can carry a
            heading and still fail the caption underneath it.
          </p>
          <div className="cc-preview" ref={pairRef(fg, bg)}>
            <div className="cc-spec-row">
              <h2 className="cc-spec-h">Ship a palette you can defend</h2>
              <Verdict ratio={ratio} min={3} what="a 24px heading" />
            </div>
            <div className="cc-spec-row">
              <p className="cc-spec-body">
                Every colour is checked against what sits behind it, at the size
                it is really used. That is the whole job.
              </p>
              <Verdict ratio={ratio} min={4.5} what="16px body text" />
            </div>
            <div className="cc-spec-row">
              <div className="cc-spec-actions">
                <span className="cc-spec-btn">Get started</span>
                <span className="cc-spec-btn cc-spec-btn--ghost">Read the docs</span>
              </div>
              <Verdict ratio={ratio} min={4.5} what="a button label" />
            </div>
            <div className="cc-spec-row">
              <p className="cc-spec-small">
                Free while in beta. <span className="cc-spec-link">Terms apply</span>.
              </p>
              <Verdict ratio={ratio} min={4.5} what="12px small print" />
            </div>
          </div>
          <p className="cc-hint">
            Large text is 24px+, or 18.5px+ bold, and clears at 3:1 — everything
            smaller needs 4.5:1. The solid button inverts the pair, and the ratio
            is the same either way round. Borders, icons and focus rings are
            non-text: they need 3:1 against whatever is beside them.
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
