// The proofs that sit beside the claims on /learn/help and /learn/principles.
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
// ── The written-down hexes, and why they are allowed ──────────────────────
//
// The theme pair shows BOTH themes at once and only one theme is ever mounted,
// so the other theme's values cannot be read out of the running document.
// They are written down here — and read back out of src/styles/global.css by
// tests/unit/help-and-principles-claims.test.js, which fails if any of them
// moves. That check is the reason the constants are allowed to exist at all;
// it is the same arrangement BrandRampTable.jsx uses for the Learn guide, for
// the same reason. Every ratio printed from them is computed, never typed.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { contrastRatio, mixHex } from '../utils/colors'
import { stepName, stepPx } from '../utils/fluidType'
import { DEFAULT_DESIGN } from '../data/designDefaults'
import { documentFormats, freeFormats, proOnlyFormats, unbuiltFormats } from '../config/exportFormats'
import { LIVE_TOOLS, SOON_TOOLS } from '../data/helpStart'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { useTheme } from '../contexts/ThemeContext'

/** The ground, --bg-0, in each theme (src/styles/global.css). */
const LIGHT_GROUND = '#F5F5F2'
const DARK_GROUND = '#060607'
/** The primary ink, --t0. */
const LIGHT_INK = '#0F0F10'
const DARK_INK = '#F2F1EC'
/** The secondary ink, --t1. */
const LIGHT_INK_2 = '#50504A'
const DARK_INK_2 = '#BFBEB6'
/** The tertiary ink, --t3: the quietest ink that still reads as text. */
const LIGHT_INK_3 = '#66665F'
const DARK_INK_3 = '#8E8E88'

const GROUND = { light: LIGHT_GROUND, dark: DARK_GROUND }
const INK = { light: LIGHT_INK, dark: DARK_INK }
const INK_3 = { light: LIGHT_INK_3, dark: DARK_INK_3 }

/** WCAG 2.2 SC 1.4.3 (text). */
const TEXT_MIN = 4.5

/** The theme the page is painted in; dark when no provider is mounted. */
function useThemeName() {
  const ctx = useTheme()
  return ctx?.theme === 'light' ? 'light' : 'dark'
}

/**
 * Principle 1. The product's own ink at two strengths, on the ground of the
 * theme the reader is in, each with the ratio it measures. One strength is the
 * tertiary ink token and clears the text floor; the other is the primary ink at
 * 40% and does not, which is why the product ships a step between them rather
 * than a single value used everywhere.
 *
 * Both ratios are measured on the painted (rounded) hex, so the number printed
 * is the number of the colour on the screen.
 */
export function ContrastProof() {
  const theme = useThemeName()
  const cells = useMemo(() => {
    const ground = GROUND[theme]
    const strong = INK_3[theme]
    const faint = mixHex(ground, INK[theme], 0.4)
    return [
      { id: 'read', label: 'Read this', hex: strong, ratio: contrastRatio(strong, ground) },
      { id: 'not', label: 'Not this', hex: faint, ratio: contrastRatio(faint, ground) },
    ]
  }, [theme])

  return (
    <figure className="prn-cx">
      <div className="prn-cx-cells">
        {cells.map((c) => (
          <div className="prn-cx-cell" key={c.id} data-job={c.id}>
            <span className="prn-cx-sample" style={{ color: c.hex }}>{c.label}</span>
            <span className="prn-cx-read">
              <span className="prn-cx-ratio">{c.ratio.toFixed(2)}:1</span>
              <span className="prn-cx-hex">{c.hex}</span>
            </span>
          </div>
        ))}
      </div>
      <figcaption className="prn-cap">
        The product&rsquo;s own ink at two strengths on its own ground, measured
        here by <code>contrastRatio()</code>. One step decides which of the two
        jobs each value is allowed to take.
      </figcaption>
    </figure>
  )
}

/**
 * Principle 2. One role, two values, one per ground — and each clears the same
 * floor on its own ground, which an inversion of either would not. The role is
 * the secondary ink.
 */
export function ThemeValueProof() {
  const panels = useMemo(() => ([
    { theme: 'Dark', ground: DARK_GROUND, ink: DARK_INK, ink2: DARK_INK_2 },
    { theme: 'Light', ground: LIGHT_GROUND, ink: LIGHT_INK, ink2: LIGHT_INK_2 },
  ].map((p) => ({ ...p, ratio: contrastRatio(p.ink2, p.ground) }))), [])

  return (
    <figure className="prn-th">
      <div className="prn-th-grid">
        {panels.map((p) => (
          <div className="prn-th-panel" key={p.theme} style={{ background: p.ground, color: p.ink }}>
            <span className="prn-th-theme">{p.theme}</span>
            <span className="prn-th-aa" style={{ color: p.ink2 }} aria-hidden="true">Aa</span>
            <span className="prn-th-read">
              <span className="prn-th-ratio">{p.ratio.toFixed(2)}:1</span>
              <span className="prn-th-hex" style={{ color: p.ink2 }}>{p.ink2} on {p.ground}</span>
            </span>
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

/** Rows stagger outward from the base step, this far apart. */
const LADDER_STAGGER_MS = 100
/** Share of the ladder that must be on screen before it plays. */
const LADDER_PLAY_AT = 0.4

/**
 * Principle 3. The ladder is not a list of chosen sizes; it is base × ratio^step
 * evaluated in front of the reader by the type scale's own function.
 *
 * It plays once: the rows are held back until 40% of the ladder is on screen,
 * then each rises and fades in, base first and outward, 100ms apart. The hold
 * is skipped when there is no IntersectionObserver, so the rows can never stay
 * hidden. Under reduced motion the CSS keeps the fade and drops the rise.
 */
export function TypeLadderProof() {
  const { base, ratio } = DEFAULT_DESIGN.typeScale
  const rows = useMemo(() => LADDER_STEPS.map((exp) => ({
    exp,
    name: stepName(exp),
    px: stepPx(base, ratio, exp, 'half'),
  })), [base, ratio])

  const ref = useRef(null)
  const [played, setPlayed] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (played || !el) return undefined
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setPlayed(true)
        io.disconnect()
      }
    }, { threshold: LADDER_PLAY_AT })
    io.observe(el)
    return () => io.disconnect()
  }, [played])

  return (
    <figure className="prn-ty">
      <ol className="prn-ty-rows" ref={ref} data-play={played ? 'on' : 'armed'}>
        {rows.map((r, i) => (
          <li className="prn-ty-row" key={r.name} style={{ '--dl': `${Math.abs(r.exp) * LADDER_STAGGER_MS}ms` }}>
            <span className="prn-ty-spec" style={{ fontSize: `${r.px}px` }}>Ag</span>
            <span className="prn-ty-name">{r.name}</span>
            <span className="prn-ty-step">
              <span className="prn-ty-px">{r.px}px</span>
              {i > 0 && <span className="prn-ty-x" aria-hidden="true">&times;{ratio}</span>}
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="prn-cap">
        <code>{base} &times; {ratio}<sup>step</sup></code>, evaluated by{' '}
        <code>stepPx()</code>. Change either number and every row moves: which is
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
  // Rendered at 1280 in both themes on 2026-09-11, /learn/principles walked its
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
        All {documentFormats().length} formats the export panel knows about, split by
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
  // The "still being built" figure is admin-only: unfinished tools are hidden
  // from everyone else, so a count of them would promise a list they cannot see.
  const { isAdmin } = useIsAdmin()
  return (
    <figure className="prn-sn">
      <div className="prn-sn-figures">
        <span className="prn-sn-fig">
          <b>{LIVE_TOOLS.length}</b>
          <span>open now</span>
        </span>
        {isAdmin && (
          <span className="prn-sn-fig" data-soon="true">
            <b>{SOON_TOOLS.length}</b>
            <span>still being built <span className="soon-badge">Soon</span></span>
          </span>
        )}
      </div>
      <figcaption className="prn-cap">
        Counted from <code>CREATE_GROUPS</code> when this page rendered, not
        written down. The menu, the site map and this figure cannot disagree.
      </figcaption>
    </figure>
  )
}
