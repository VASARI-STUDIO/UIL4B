import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import ColorPickerPop from '../components/ColorPickerPop'
import { contrastRatio, nearestPassingLightness, textColorForBg } from '../utils/colors'
// The `contrast` page stylesheet. Imported here rather than from global.css so
// Vite emits it as this lazy route's own chunk stylesheet — only a visitor who
// opens this page downloads it, and it arrives with the chunk, before paint.
import '../styles/pages/contrast.css'

// Colour Contrast Checker — the standalone /create/contrast page. Test a
// foreground/background pair against WCAG 2.2, see the pair in a live preview,
// and get one-click fixes that actually pass.
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
// THE ONE RULE THE CHIPS MUST OBEY. A verdict chip sits on the user's chosen
// background but never PAINTS with it — page tokens only. This is not fussiness.
// A chip drawn in the pair under test becomes unreadable exactly when the pair
// fails, which is the moment its reader most needs it, and this page has
// already shipped that class of defect once: its own verdict line measured
// 2.94:1 against the 4.5:1 it enforces. The durable fix is not to choose the
// colour carefully, it is to not use the colour. 06-colour-tool-workbenches
// measures `.cc-verdict` in both themes for that reason.
//
// ── LEFT PANEL: the 2026-09-06 overhaul [contrast-checker-overhaul] ───────────
//
// WHAT WAS WRONG WITH IT. The panel stated its five checks as abstract TIER
// NAMES — "AA · normal text", "AAA · large text" — in a list that sat below the
// colour fields and below a verdict reading "Passes some checks". Three separate
// problems in one column. A tier name is jargon standing where a real object
// should be. Five simultaneous tiers is four more than anyone is holding a pair
// to at once, so the reader has to find their own row before the page has told
// them anything. And "Passes some checks" is the least useful true sentence
// available: it withholds the one fact the reader came for, which is what this
// pair can actually be used for.
//
// WHAT IT IS NOW, and which reference drove which decision (Mobbin, web):
//
//   A LEVEL, CHOSEN ONCE. Whereby
//   (mobbin.com/screens/e86cb1da-6690-4693-bff7-5632af4a4f9c) puts an `AA ⌄`
//   control and a measured ratio INLINE beside each colour field, so the
//   standard being applied is a thing you pick rather than a list you scan.
//   That is the mechanism taken here: one AA/AAA radio group sets the target,
//   and the badges, the checks, the preview chips and the fixes all follow it.
//   Whereby prints the same number against two different fields where two
//   colours share one ground; here the two fields ARE the pair, so each badge
//   names the ground it was measured against ("vs background" / "vs text") —
//   the number is the same on both sides and saying which is which is what
//   stops that reading as a duplicate.
//
//   CHECKS AS SENTENCES ABOUT REAL OBJECTS. Typeform
//   (mobbin.com/screens/b78e49a7-bf27-4966-b5f6-e8f7fd5033b9) writes "Buttons
//   have enough color contrast with background", not "AA · non-text". Its
//   checks name the thing on the page and the ground it sits on. The three here
//   do the same, and there are three rather than five because a level is now
//   chosen: body copy, large headings, and non-text.
//
//   NON-TEXT DOES NOT FOLLOW THE LEVEL, and that is why it is stated rather
//   than computed. SC 1.4.11 Non-text Contrast is a AA criterion with no AAA
//   counterpart, so 3:1 is the whole requirement at either setting. Scaling it
//   to 7:1 under AAA would be inventing a rule, which on the page that teaches
//   the rules is the worst available bug.
//
//   THE VERDICT AS A SENTENCE. Hotjar
//   (mobbin.com/screens/043235af-448c-414a-b5b9-94ef3f8376a2) heads its card
//   "The selected colors are AA-OK" — a short headline in words, with the
//   detail underneath. The ratio keeps its 36px numeral, because a number is
//   what people screenshot and paste into a ticket, but the phrase beside it
//   now says what the pair can CARRY. It is deliberately level-independent:
//   "Good for body text at any size" is true whichever radio is lit, and a
//   headline that changed meaning when you changed the setting would be a worse
//   headline, not a more responsive one.
//
//   Miro (mobbin.com/screens/96b4bf05-95bb-4dd3-a26d-1209ed32a626) renders the
//   offending specimen at real size beside a plain-language remedy, which is
//   what the right-hand preview already does. Wix
//   (mobbin.com/screens/13dec8c1-8c8e-4c43-937b-10723c638b10) fixes contrast by
//   moving LIGHTNESS on a labelled slider per side — the same axis the fix row
//   below walks, and the reason it is lightness rather than a jump to black.
//
// ── THE FIX ROW, AND THE DEFECT UNDER IT ─────────────────────────────────────
//
// This page's lede promises that "one click nudges either colour just far
// enough to pass". It did not. The row was built on fixForeground/fixBackground,
// which take their search direction from the OTHER colour's luminance (`bgLum <
// 0.5` means walk the ink lighter) — and 0.5 is not the crossover; black and
// white are equally readable at relative luminance 0.179. So on every ground
// between the two the walk went the wrong way, found nothing, and returned its
// input. Every candidate here is re-verified before it is offered, so the page
// never showed a fix that did not work — it silently showed NO fix instead.
//
// Measured over a 6-level-per-channel grid, 38,594 AA-failing pairs, through
// this component's own `fixes` memo as it was written:
//
//     a TEXT fix existed but was not offered        16,485  (42.7%)
//     a BACKGROUND fix existed but was not offered  16,485  (42.7%)
//     "Make it pass" was EMPTY, with a fix available  6,561  (17.0%)
//
// #000099 on #009900 is one: 3.806:1, black clears 5.56:1, and the row was
// empty because the ground's luminance is 0.228 so the search went looking
// toward white, which tops out at 3.78:1. nearestPassingLightness scans BOTH
// directions and returns the smaller movement, so that pair now offers #000070
// at 4.503:1 — still blue, which a jump to black would not have been. On the
// same grid it solves 38,594 of 38,594, tells no lies, and returns null only
// where no single-side move exists at all.

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

function normaliseHex(raw) {
  const m = HEX_RE.exec((raw || '').trim())
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return `#${hex.toUpperCase()}`
}

// The two conformance levels, and the thresholds each one sets for TEXT.
// `nonText` is absent on purpose — see the note above: SC 1.4.11 is 3:1 at both
// levels, so it lives in CHECKS as a constant rather than being scaled here.
const LEVELS = {
  AA: { id: 'AA', label: 'AA', normal: 4.5, large: 3 },
  AAA: { id: 'AAA', label: 'AAA', normal: 7, large: 4.5 },
}
const NON_TEXT_MIN = 3

// The checks, as sentences about things that exist on a page rather than as
// tier names. `min` is a function of the chosen level so the non-text row can
// decline to move.
const CHECKS = [
  {
    id: 'body',
    name: 'Body copy at 16px is readable on this background.',
    min: (lv) => lv.normal,
  },
  {
    id: 'large',
    name: 'Headings at 24px, or 18.5px bold, are readable.',
    min: (lv) => lv.large,
  },
  {
    id: 'nontext',
    name: 'Buttons, borders and focus rings are visible against it.',
    min: () => NON_TEXT_MIN,
    // Said out loud, because a reader who has just switched to AAA and seen
    // this row keep its 3:1 is entitled to think the page is broken.
    foot: 'Non-text contrast is 3:1 at both levels — AAA adds no stricter rule.',
  },
]

// Hotjar's headline, as a fact about the PAIR rather than about the setting.
// Level-independent on purpose: this sentence should not change meaning when
// the radio does.
function headline(ratio) {
  if (ratio >= 7) return 'Strong enough for anything, AAA body text included.'
  if (ratio >= 4.5) return 'Good for body text at any size.'
  if (ratio >= NON_TEXT_MIN) return 'Large headings and UI only — body text is too faint.'
  return 'Not usable for text at any size.'
}

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

// One side of the pair: colour well + hex field, with Whereby's inline verdict
// under it. `against` names the ground this side was measured on, which is what
// keeps two identical numbers from reading as one repeated twice.
function ColorField({ id, label, raw, valid, committed, against, ratio, level, onRaw, onBlur }) {
  const pass = ratio >= level.normal
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
      <p className={pass ? 'cc-field-badge cc-field-badge--pass' : 'cc-field-badge cc-field-badge--fail'}>
        <span className="cc-field-badge-mark" aria-hidden="true">{pass ? '✓' : '✕'}</span>
        <span>
          {level.label} {ratio.toFixed(2)}:1 <span className="cc-field-badge-vs">vs {against}</span>
        </span>
      </p>
    </div>
  )
}

export default function ContrastChecker({ onCopy }) {
  const [fgInput, setFgInput] = useState('#6B7280')
  const [fg, setFg] = useState('#6B7280')
  const [bgInput, setBgInput] = useState('#FFFFFF')
  const [bg, setBg] = useState('#FFFFFF')
  const [levelId, setLevelId] = useState('AA')
  const level = LEVELS[levelId]

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

  // One fix per side, aimed at the level in force. `nearestPassingLightness`
  // scans BOTH directions along each colour's own lightness axis and returns
  // null — not its input — when the pair cannot be fixed by moving that side,
  // so `null` here means "impossible", never "not looked for". Each candidate
  // is still re-verified before it is offered: the solver is measured over the
  // whole grid in tests/unit/contrast-fixes.test.js, and a fix row on THIS page
  // is not the place to take that on trust.
  const fixes = useMemo(() => {
    const out = []
    const target = level.normal
    if (ratio >= target) return out
    const newFg = nearestPassingLightness(fg, bg, target)
    if (newFg && contrastRatio(newFg, bg) >= target) {
      out.push({ key: 'fg', side: 'text', target, hex: newFg.toUpperCase() })
    }
    const newBg = nearestPassingLightness(bg, fg, target)
    if (newBg && contrastRatio(fg, newBg) >= target) {
      out.push({ key: 'bg', side: 'background', target, hex: newBg.toUpperCase() })
    }
    return out
  }, [fg, bg, ratio, level])

  const applyFix = (fix) => {
    if (fix.side === 'text') { setFg(fix.hex); setFgInput(fix.hex) }
    else { setBg(fix.hex); setBgInput(fix.hex) }
  }

  // Only reachable when BOTH sides came back null, and — measured — that cannot
  // happen at AA. Pure black clears 4.5:1 on every ground at or above relative
  // luminance 0.175 and pure white on every one at or below 0.1833; the ranges
  // OVERLAP, so against a single ground one pole always clears and an AA fix
  // always exists. At 7:1 they separate, and a band of mid greys opens up where
  // neither works — #808080 on #7F7F7F is in it. Saying so is better than the
  // empty space the page used to show for 17% of failing pairs, which meant
  // nothing at all.
  const unfixable = ratio < level.normal && fixes.length === 0

  return (
    <div className="sec">
      <div className="sec-h">
        {/* NO TAXONOMY EYEBROW. It read "Colour" in 10px mono caps at y=102,
            above an h1 whose first word is "Colour", on /create/contrast under
            a lit Create > Colour menu. Third statement of one fact. Removed
            with the rest of the sweep for #surface-headers-read-as-ai. */}
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
              against="background" ratio={ratio} level={level}
              onRaw={setSide(setFgInput, setFg)} onBlur={() => setFgInput(fg)}
            />
            <button type="button" className="cc-swap" onClick={swap} aria-label="Swap text and background colours">
              ⇄
            </button>
            <ColorField
              id="cc-bg" label="Background colour"
              raw={bgInput} valid={bgValid} committed={bg}
              against="text" ratio={ratio} level={level}
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
            <span className={
              ratio >= level.normal ? 'cc-ratio-verdict cc-pass'
                : ratio >= NON_TEXT_MIN ? 'cc-ratio-verdict cc-mixed'
                  : 'cc-ratio-verdict cc-fail'
            }>
              {headline(ratio)}
            </span>
          </div>

          {/* Whereby's `AA ⌄`, as a radio group rather than a select: there are
              exactly two values and both are worth showing at once. */}
          <div className="cc-level">
            <span className="seg-label" id="cc-level-label">Hold it to</span>
            <div className="cc-level-opts" role="radiogroup" aria-labelledby="cc-level-label">
              {Object.values(LEVELS).map(lv => (
                <button
                  key={lv.id}
                  type="button"
                  role="radio"
                  aria-checked={lv.id === levelId}
                  className={lv.id === levelId ? 'cc-level-opt is-on' : 'cc-level-opt'}
                  onClick={() => setLevelId(lv.id)}
                >
                  {lv.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="cc-checks">
            {CHECKS.map(c => {
              const min = c.min(level)
              const pass = ratio >= min
              return (
                <li key={c.id} className={pass ? 'cc-check cc-check--pass' : 'cc-check cc-check--fail'}>
                  <span className="cc-check-mark" aria-hidden="true">{pass ? '✓' : '✕'}</span>
                  <span className="cc-check-body">
                    <span className="cc-check-name">{c.name}</span>
                    {c.foot && <span className="cc-check-foot">{c.foot}</span>}
                  </span>
                  <span className="cc-check-min">
                    <span className="sr-only">{pass ? 'Passes' : 'Fails'}; needs </span>
                    ≥ {min}:1
                  </span>
                </li>
              )
            })}
          </ul>

          {fixes.length > 0 && (
            <>
              <h2 className="seg-label">Make it pass</h2>
              <div className="cc-fixes">
                {fixes.map(fix => (
                  <div key={fix.key} className="cc-fix">
                    <span className="cc-fix-chip" ref={chipRef(fix.hex)}>{fix.hex}</span>
                    <span className="cc-fix-desc">
                      {level.label} ({fix.target}:1) — adjust the {fix.side}
                    </span>
                    <button type="button" className="cc-fix-apply" onClick={() => applyFix(fix)}>Apply</button>
                    <button type="button" className="cc-fix-copy" onClick={() => onCopy?.(fix.hex)}>Copy</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {unfixable && (
            <p className="cc-hint cc-unfixable">
              Neither colour can reach {level.normal}:1 on its own here — they sit
              too close in lightness. Move both, or pick a different pair.
            </p>
          )}
        </div>

        {/* ── Live preview ── */}
        <div className="card cc-panel">
          <h2 className="seg-label">Live preview</h2>
          <p className="cc-lede">
            The pair on a real surface. Each chip is that element&rsquo;s own
            threshold at {level.label}, not the page&rsquo;s — which is why one
            pair can carry a heading and still fail the caption underneath it.
          </p>
          {/* SPECIMEN TEXT, AND IT HAS TO READ AS SPECIMEN TEXT.
              Founder decision, 2026-09-13. The small-print row read "Free while
              in beta. Terms apply." — filler, but claim-shaped, and untrue of
              UIL4B: a visitor reading this page can take it for a real pricing
              statement. The 24px row was a tagline ("Ship a palette you can
              defend") and the 16px row described the product. Half a mockup and
              half product copy is how a mockup gets read as the page.

              Every line is now a pangram, which is what a type specimen has
              used for two centuries precisely BECAUSE it asserts nothing. They
              still do the job the rows exist for — 24px, 16px and 12px of the
              chosen pair, each against its own threshold.

              The 24px row is no longer an <h2>. It was the page's ONLY h2, so
              the whole heading outline a screen-reader user heard was "Colour
              Contrast Checker" followed by a tagline from inside a preview.
              A specimen is not a section of this document. `.cc-spec-h` carries
              the size and weight, and `p` is already margin-zero here — same
              pixels, no heading. */}
          <div className="cc-preview" ref={pairRef(fg, bg)}>
            <div className="cc-spec-row">
              <p className="cc-spec-h">The quick brown fox jumps over the lazy dog</p>
              <Verdict ratio={ratio} min={level.large} what="a 24px heading" />
            </div>
            <div className="cc-spec-row">
              <p className="cc-spec-body">
                Pack my box with five dozen liquor jugs. How vexingly quick daft
                zebras jump.
              </p>
              <Verdict ratio={ratio} min={level.normal} what="16px body text" />
            </div>
            <div className="cc-spec-row">
              <div className="cc-spec-actions">
                <span className="cc-spec-btn">Get started</span>
                <span className="cc-spec-btn cc-spec-btn--ghost">Read the docs</span>
              </div>
              <Verdict ratio={ratio} min={level.normal} what="a button label" />
            </div>
            <div className="cc-spec-row">
              <p className="cc-spec-small">
                Sphinx of black quartz, judge my vow &mdash; and a{' '}
                <span className="cc-spec-link">sample link</span>.
              </p>
              <Verdict ratio={ratio} min={level.normal} what="12px small print" />
            </div>
          </div>
          <p className="cc-hint">
            Large text is 24px+, or 18.5px+ bold, and clears at {level.large}:1 at
            {' '}{level.label} — everything smaller needs {level.normal}:1. The solid
            button inverts the pair, and the ratio is the same either way round.
            Borders, icons and focus rings are non-text: they need {NON_TEXT_MIN}:1
            against whatever is beside them.
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
