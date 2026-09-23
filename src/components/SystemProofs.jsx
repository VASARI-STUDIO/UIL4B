// The proofs that sit beside the claims on /help and /principles.
//
// EVERY NUMBER ON BOTH PAGES IS PRODUCED HERE, by the same functions the tools
// themselves run — generateTintScale() from the Colour Studio, contrastRatio()
// from the contrast checker, stepPx() from the type scale. Nothing is typed.
// That is the whole reason these are components rather than copy: a sentence
// claiming "the ramp is generated from one value" is an assertion, and a ramp
// generated from one value in front of the reader is not.
//
// The pattern, and the one Mobbin result worth taking from a corpus that was
// otherwise a catalogue of what to avoid: Hashnode's writing-editor section
// puts the real product surface ABOVE the sentence, so the sentence reads as a
// caption on evidence rather than as a promise.
// https://mobbin.com/sites/sections/ce305258-5218-49f8-8cf0-cc49059d10e4
//
// ── The four written-down hexes, and why they are allowed ─────────────────
//
// Three of these proofs are about BOTH themes at once and only one theme is
// ever mounted, so the other theme's values cannot be read out of the running
// document. They are written down here — and read back out of
// src/styles/global.css by tests/unit/help-and-principles-claims.test.js, which
// fails if either theme's --bg-0 or --accent-strong moves. That check is the
// reason the constants are allowed to exist at all; it is the same arrangement
// BrandRampTable.jsx uses for the Learn guide, for the same reason.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { contrastRatio, generateTintScale, T_LABELS } from '../utils/colors'
import { stepName, stepPx } from '../utils/fluidType'
import { DEFAULT_DESIGN, tintConfigFor } from '../data/designDefaults'
import { EXPORT_FORMATS, freeFormats, proOnlyFormats, unbuiltFormats } from '../config/exportFormats'
import { LIVE_TOOLS, SOON_TOOLS } from '../data/helpStart'

/** --bg-0 in each theme, from the :root blocks in src/styles/global.css. */
const LIGHT_GROUND = '#EFEEE9'
const DARK_GROUND = '#060607'
/** --accent-strong in each theme — the role every link in the app is painted in. */
const LIGHT_LINK = '#0B5ED7'
const DARK_LINK = '#4A90FF'
/** --accent in light: the same blue one step brighter, used for fills and borders. */
const LIGHT_FILL = '#0F6FFF'

/** WCAG 2.2 SC 1.4.3 (text) and SC 1.4.11 (component boundaries). */
const TEXT_MIN = 4.5
const BOUNDARY_MIN = 3

/**
 * /help's opening visual: the value a new project starts from, the eleven
 * stops the product generates out of it, and the files those stops can leave
 * as. One colour in, a system out — shown rather than described.
 *
 * The file names come from freeFormats(), so this strip cannot advertise an
 * export that ExportPanel would render as a disabled Soon button.
 */
export function SystemRunStrip() {
  const cfg = useMemo(() => tintConfigFor(), [])
  const ramp = useMemo(() => generateTintScale(cfg), [cfg])
  const files = freeFormats()

  if (ramp.length !== T_LABELS.length) return null

  return (
    <figure className="hlp-run" data-reveal>
      <div className="hlp-run-seed">
        <span className="hlp-run-chip" style={{ background: cfg.hex }} aria-hidden="true" />
        <span className="hlp-run-seed-text">
          <span className="hlp-run-hex">{cfg.hex.toUpperCase()}</span>
          <span className="hlp-run-cap">what a new project starts from</span>
        </span>
      </div>

      <ol className="hlp-run-ramp" aria-label="The eleven stops generated from that one value">
        {ramp.map((hex, i) => (
          <li className="hlp-run-stop" key={T_LABELS[i]}>
            <span className="hlp-run-bar" style={{ background: hex }} aria-hidden="true" />
            <span className="hlp-run-stop-name">{T_LABELS[i]}</span>
            <span className="hlp-run-stop-hex">{hex.toUpperCase()}</span>
          </li>
        ))}
      </ol>

      <div className="hlp-run-out">
        <span className="hlp-run-cap">leaves as</span>
        <ul className="hlp-run-files">
          {files.map((f) => <li key={f.id}>{f.name}</li>)}
        </ul>
      </div>

      <figcaption className="hlp-run-note">
        Generated on this page by <code>generateTintScale()</code> — the function
        behind <Link to="/create/tint">the tint tool</Link> — from the one value on
        the left. Nothing here was typed out.
      </figcaption>
    </figure>
  )
}

/** Light --t0. The ink both samples' own labels are set in, so the proof about
 *  contrast does not itself ship text below its floor. */
const LIGHT_INK = '#0F0F10'

/**
 * Principle 1. The same blue, one step apart, each shown doing the job its
 * measured ratio permits — which is the reason the product ships two roles
 * rather than one value used everywhere.
 *
 * THE SECOND ROW IS NOT RENDERED AS TEXT, deliberately. --accent measures
 * 3.82:1 on the light ground: above SC 1.4.11's 3:1 floor for a boundary,
 * below SC 1.4.3's 4.5:1 for text. Painting the words in it to illustrate the
 * shortfall would have put a genuinely unreadable line on a page whose whole
 * argument is that the threshold is not negotiable. So it is drawn as the
 * boundary it is allowed to be, and the sentence beside it does the explaining.
 */
export function ContrastProof() {
  const rows = useMemo(() => ([
    {
      hex: LIGHT_LINK,
      job: 'text',
      role: 'Links and body text',
      ratio: contrastRatio(LIGHT_LINK, LIGHT_GROUND),
    },
    {
      hex: LIGHT_FILL,
      job: 'boundary',
      role: 'Fills, borders and focus rings',
      ratio: contrastRatio(LIGHT_FILL, LIGHT_GROUND),
    },
  ]), [])

  return (
    <figure className="prn-cx">
      <ul className="prn-cx-rows">
        {rows.map((r) => {
          const floor = r.job === 'text' ? TEXT_MIN : BOUNDARY_MIN
          return (
            <li className="prn-cx-row" key={r.hex} data-job={r.job}>
              {r.job === 'text' ? (
                <span
                  className="prn-cx-sample"
                  style={{ background: LIGHT_GROUND, color: r.hex }}
                >
                  Read this
                </span>
              ) : (
                <span
                  className="prn-cx-sample"
                  style={{ background: LIGHT_GROUND, borderColor: r.hex, color: LIGHT_INK }}
                  data-boundary="true"
                >
                  Not this
                </span>
              )}
              <span className="prn-cx-read">
                <span className="prn-cx-ratio">{r.ratio.toFixed(2)}:1</span>
                <span className="prn-cx-verdict">
                  {r.job === 'text'
                    ? `over ${floor}:1, the floor for text`
                    : `over ${floor}:1 but under ${TEXT_MIN}:1 — a boundary, never a word`}
                </span>
              </span>
              <span className="prn-cx-role">
                <b>{r.hex}</b>
                {r.role}
              </span>
            </li>
          )
        })}
      </ul>
      <figcaption className="prn-cap">
        The product&rsquo;s own blue at two lightnesses on its own light ground,
        measured here by <code>contrastRatio()</code>. One step decides which of
        the two jobs each value is allowed to take.
      </figcaption>
    </figure>
  )
}

/**
 * Principle 2. One role, one name, two values — and both clear the same floor
 * on their own ground, which an inversion of either would not.
 */
export function ThemeValueProof() {
  const panels = useMemo(() => ([
    { theme: 'Light', ground: LIGHT_GROUND, ink: LIGHT_LINK, ratio: contrastRatio(LIGHT_LINK, LIGHT_GROUND) },
    { theme: 'Dark', ground: DARK_GROUND, ink: DARK_LINK, ratio: contrastRatio(DARK_LINK, DARK_GROUND) },
  ]), [])

  return (
    <figure className="prn-th">
      <div className="prn-th-grid">
        {panels.map((p) => (
          <div className="prn-th-panel" key={p.theme} style={{ background: p.ground }}>
            <span className="prn-th-theme" style={{ color: p.ink }}>{p.theme}</span>
            <span className="prn-th-token" style={{ color: p.ink }}>--accent-strong</span>
            <span className="prn-th-hex" style={{ color: p.ink }}>{p.ink}</span>
            <span className="prn-th-ratio" style={{ color: p.ink }}>{p.ratio.toFixed(2)}:1</span>
          </div>
        ))}
      </div>
      <figcaption className="prn-cap">
        One token name. Two values, neither derived from the other, both above{' '}
        {TEXT_MIN}:1 on the ground they are painted on.
      </figcaption>
    </figure>
  )
}

/** The steps the ladder shows. Enough to see the ratio compounding, no more. */
const LADDER_STEPS = [3, 2, 1, 0, -1]

/**
 * Principle 3. The ladder is not a list of chosen sizes; it is base × ratio^step
 * evaluated in front of the reader by the type scale's own function.
 */
export function TypeLadderProof() {
  const { base, ratio } = DEFAULT_DESIGN.typeScale
  const rows = useMemo(() => LADDER_STEPS.map((exp) => ({
    exp,
    name: stepName(exp),
    px: stepPx(base, ratio, exp, 'half'),
  })), [base, ratio])

  return (
    <figure className="prn-ty">
      <ol className="prn-ty-rows">
        {rows.map((r) => (
          <li className="prn-ty-row" key={r.name}>
            <span className="prn-ty-spec" style={{ fontSize: `${r.px}px` }}>Ag</span>
            <span className="prn-ty-name">{r.name}</span>
            <span className="prn-ty-px">{r.px}px</span>
          </li>
        ))}
      </ol>
      <figcaption className="prn-cap">
        <code>{base} &times; {ratio}<sup>step</sup></code>, evaluated by{' '}
        <code>stepPx()</code>. Change either number and every row moves — which is
        why a scale hands over as two numbers rather than five.
      </figcaption>
    </figure>
  )
}

/**
 * Principle 4. The export offer, read off the flags that decide whether each
 * button works — see the long note at the top of src/config/exportFormats.js
 * for the $48 file the product could not make.
 */
export function ExportProof() {
  const free = freeFormats()
  const pro = proOnlyFormats()
  const unbuilt = unbuiltFormats()

  // THESE THREE LABELS ARE NOT HEADINGS, and used to be <h4>.
  //
  // Rendered at 1280 in both themes on 2026-09-11, /principles walked its
  // headings as H1, H2, H2, H2, **H4, H4, H4**, H2, H2 — a two-level skip
  // (WCAG 1.3.1), and the only such skip on any marketing surface.
  //
  // Promoting them to <h3> would have silenced the skip and left something
  // worse behind. .prn-proof is rendered BEFORE .prn-say in every .prn-item, so
  // a proof's own sub-headings come earlier in the DOM than the <h2> rule they
  // belong to: as <h3> they would have nested under "A type scale is
  // arithmetic." — the PRECEDING principle — and told a screen-reader user the
  // export columns were part of the type-scale rule. A heading that is
  // structurally valid and semantically wrong is not a fix.
  //
  // They are column labels inside a <figure> that already carries a
  // <figcaption>, which is what every sibling proof in this file uses for the
  // same job — TypeLadderProof labels its rows with plain <span>s and explains
  // itself in the figcaption, and ContrastProof, ThemeValueProof and SoonProof
  // carry no heading at all. ExportProof was the one exception, so this also
  // puts it back in step with the other four.
  //
  // aria-labelledby keeps the grouping a heading was doing the useful half of:
  // each list still announces which column it is, without claiming a level in
  // the document outline it does not own.
  return (
    <figure className="prn-ex">
      <div className="prn-ex-cols">
        <div className="prn-ex-col">
          <p className="prn-ex-h" id="prn-ex-free">Built, free</p>
          <ul aria-labelledby="prn-ex-free">{free.map((f) => <li key={f.id}>{f.name}</li>)}</ul>
        </div>
        <div className="prn-ex-col">
          <p className="prn-ex-h" id="prn-ex-pro">Built, Pro</p>
          <ul aria-labelledby="prn-ex-pro">{pro.map((f) => <li key={f.id}>{f.name}</li>)}</ul>
        </div>
        <div className="prn-ex-col" data-unbuilt="true">
          <p className="prn-ex-h" id="prn-ex-unbuilt">Not built</p>
          <ul aria-labelledby="prn-ex-unbuilt">
            {unbuilt.map((f) => (
              <li key={f.id}>{f.name} <span className="soon-badge">Soon</span></li>
            ))}
          </ul>
        </div>
      </div>
      <figcaption className="prn-cap">
        All {EXPORT_FORMATS.length} formats the export panel knows about, split by
        the same <code>live</code> flag that decides whether its button does
        anything. The third column cannot be sold on any plan.
      </figcaption>
    </figure>
  )
}

/**
 * Principle 5. The two counts, off the registry the navigation reads, beside the
 * badge a visitor actually meets on the ones that are not ready.
 */
export function SoonProof() {
  return (
    <figure className="prn-sn">
      <div className="prn-sn-figures">
        <span className="prn-sn-fig">
          <b>{LIVE_TOOLS.length}</b>
          <span>open now</span>
        </span>
        <span className="prn-sn-fig" data-soon="true">
          <b>{SOON_TOOLS.length}</b>
          <span>still being built <span className="soon-badge">Soon</span></span>
        </span>
      </div>
      <figcaption className="prn-cap">
        Counted from <code>CREATE_GROUPS</code> when this page rendered, not
        written down. The menu, the site map and this figure cannot disagree.
      </figcaption>
    </figure>
  )
}
