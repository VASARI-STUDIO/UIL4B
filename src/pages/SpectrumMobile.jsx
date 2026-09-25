import { useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import SpectrumRamp from '../components/spectrum/SpectrumRamp'
import SpectrumWords from '../components/spectrum/SpectrumWords'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import PhGlyph from '../components/spectrum/PhGlyph'
import { PH } from '../components/spectrum/phosphorMobile'
import { PH_ARROW_UP_RIGHT } from '../components/spectrum/phosphorNav'
import { prefersReducedMotion } from '../components/spectrum/reducedMotion'
import { FREE_SAVE_LIMITS } from '../config/plans'
import '../styles/pages/spectrum-mobile.css'

// ═════════════════════════════════════════════════════════════════════════════
// /mobile — the "On mobile" screen of "UIL4B - Spectrum.dc.html".
// ═════════════════════════════════════════════════════════════════════════════
//
// The design file has a separate screen, `s.screen === "mobile"` (standalone
// lines 1344-1591), reached from the nav's third quiet link and from the third
// big item of the full-screen menu. This is that screen, reproduced from the
// source: the two-column hero (headline + sentence, CTA bottom-right), three
// 390x844 phone mock-ups in a row that becomes a scroll-snap strip at 860px and
// under, and the spectrum ramp above the footer. Every size, spacing, radius and
// colour in spectrum-mobile.css is the design's own, with the rule's source
// line beside it.
//
// ── WHAT IS THE DESIGN'S, AND WHAT WAS CHECKED AGAINST THE PRODUCT ──────────
// The copy is the design's, verbatim. The PHONE SCREENS are illustrations of
// the app, so each label on them was checked against the real screen it
// draws. Two changes to what is rendered, both because
// the label states a figure or a feature a customer would take as a claim:
//
//   · "Search 200,000 icons" → "Search icons". The Icon Library never states a
//     catalogue total, and what it can search depends on the visitor's tier
//     (src/data/iconPackTiers.js), so the figure is dropped and the design's own
//     remaining words are kept.
//   · "Recolour to kit" → "Recolour". Recolouring is real (IconLibrary's
//     Colour row takes any colour); linking it to a kit is not.
//
// Everything else is drawn as designed. The RECENT EXPORTS list and the
// Regular / Bold / Fill / Duo tabs stay exactly as drawn, because both are
// real features; and the product's word is "project" everywhere, so the plan
// meter says projects where the mock said kits.
//
// The free-plan meter reads FREE_SAVE_LIMITS, so "3 of 3" is the real cap.

// The Palette Builder rows. Name, role and swatch are the design's
// `mobileRows` (standalone 2856-2867) rendered against its Cobalt ramp; the
// hexes are the values that ramp produces, read off the rendered design. They
// are data, like a swatch — which is why they sit inline.
const ROWS = [
  ['Modernist Slate', '#5B98F2', 'PRIMARY', '#0B0C0E'],
  ['Warm Concrete', '#BFEAFF', 'ACCENT +60', '#0B0C0E'],
  ['Glacial Teal', '#A2D3FF', 'COMPLEMENT', '#0B0C0E'],
  ['Archive Teal', '#7EB6FF', 'PRIMARY SOFT', '#0B0C0E'],
  ['Deepwater', '#2E5A9A', 'PRIMARY DEEP', '#F4F7FF'],
  ['Studio Bathhouse', '#15396D', 'ALTERNATIVE 1', '#F4F7FF'],
  ['Washed Slate', '#011B42', 'ALTERNATIVE 2', '#F4F7FF'],
]
const SEED = { hex: '#4985DE', swatch: '#5B98F2' }

// `mobileAdjust` (2868-2873), tracks as the rendered design paints them.
const ADJUST = [
  ['HUE', '0°', 'linear-gradient(90deg,#7EB6FF,#467AC7,#15396D)'],
  ['SATURATION', '0%', 'linear-gradient(90deg,#9AA0A6,#5B98F2)'],
  ['TONE', '0%', 'linear-gradient(90deg,#011B42,#D3F8FF)'],
  ['TEMPERATURE', '0', 'linear-gradient(90deg,#4FA8E8,#C9C3B6,#E0784E)'],
]

// `ICONS.slice(0, 20)` (1721-1729).
const ICONS = [
  ['palette', 'Palette'], ['swatches', 'Swatches'], ['eyedropper', 'Eyedropper'],
  ['drop-half', 'Tint'], ['gradient', 'Gradient'], ['circles-three', 'Harmonies'],
  ['text-aa', 'Type scale'], ['text-t', 'Font'], ['ruler', 'Measure'],
  ['grid-four', 'Grid'], ['frame-corners', 'Aspect ratio'], ['crop', 'Crop'],
  ['image', 'Image'], ['film-strip', 'Video frame'], ['file-image', 'Export image'],
  ['sliders', 'Controls'], ['magic-wand', 'Generate'], ['selection', 'Selection'],
  ['code', 'Code'], ['brackets-curly', 'JSON'],
]
const WEIGHTS = ['Regular', 'Bold', 'Fill', 'Duo']

// `PROJECTS` (1762-1766) with the `projects` mapping's icon and ramp tint
// (2849-2853): ramp[3], ramp[6], ramp[7].
const PROJECTS = [
  ['Northbeam, marketing site', 'Opened 2 hours ago', 'rocket-launch', '#7EB6FF'],
  ['Halcyon app, dark theme', 'Opened yesterday', 'moon-stars', '#2E5A9A'],
  ['Ferrule, brand refresh', 'Opened last week', 'printer', '#15396D'],
]
// `EXPORTS` (2975 → the const at the top of the script).
const EXPORTS = [
  ['CSS', 'cobalt-marketing-tokens.css', '4.1 KB'],
  ['JSON', 'cobalt-marketing.tokens.json', '6.8 KB'],
  ['SVG', 'icons-sprite-12.svg', '11.4 KB'],
  ['WEBP', 'hero-2400w.webp', '182 KB'],
]

const TABS = [
  ['folders', 'Projects'],
  ['palette', 'Create'],
  ['compass', 'Discover'],
  ['user', 'You'],
]

/* ── the phone ───────────────────────────────────────────────────────────── */

// The hardware: bezel, island, home indicator, status bar and the app header
// every one of the three screens shares (1361-1375). `children` is the screen.
function Phone({ children, tab }) {
  return (
    <div className="spm-phone" aria-hidden="true">
      <div className="spm-screen">
        <div className="spm-status">
          <span>9:41</span>
          <span className="spm-status-ico">
            <PhGlyph d={PH['fill:cell-signal-medium']} size={11} />
            <PhGlyph d={PH['fill:wifi-high']} size={11} />
            <PhGlyph d={PH['fill:battery-high']} size={11} />
          </span>
        </div>
        <span className="spm-island"><span /></span>
        <span className="spm-home" />
        <div className="spm-app">
          <div className="spm-apphead">
            <span className="spm-appword">UI L<span>4</span>B</span>
            <span className="spm-round"><PhGlyph d={PH['magnifying-glass']} size={12} /></span>
            <span className="spm-round spm-round--me">TM</span>
            <span className="spm-round"><PhGlyph d={PH.list} size={12} /></span>
          </div>
          {children}
        </div>
        <div className="spm-tabs">
          {TABS.map(([icon, label]) => (
            <span key={label} className={label === tab ? 'spm-tab is-on' : 'spm-tab'}>
              <PhGlyph d={label === tab ? PH[`fill:${icon}`] : PH[icon]} size={15} />
              <span>{label}</span>
            </span>
          ))}
        </div>
        <div className="spm-chin" />
      </div>
    </div>
  )
}

function PaletteScreen() {
  return (
    <>
      <div className="spm-pb-seedrow">
        <span className="spm-pb-seed">
          <span className="spm-pb-chip" style={{ background: SEED.swatch }} />
          <span className="spm-pb-hex">{SEED.hex}</span>
        </span>
        <span className="spm-pb-system">
          <PhGlyph className="spm-dim" d={PH['gear-six']} size={11} />
          <span className="spm-pb-syslabel">SYSTEM</span>
          <span className="spm-pb-sysval">Custom</span>
          <PhGlyph className="spm-faint" d={PH['caret-down']} size={9} />
        </span>
      </div>
      <div className="spm-pb-actions">
        <span className="spm-pb-btn"><PhGlyph d={PH.shuffle} size={11} /><span>Randomise</span></span>
        <span className="spm-pb-sq spm-dim"><PhGlyph d={PH['arrow-counter-clockwise']} size={11} /></span>
        <span className="spm-pb-sq spm-faint"><PhGlyph d={PH['arrow-clockwise']} size={11} /></span>
        <span className="spm-pb-save"><PhGlyph d={PH['bookmark-simple']} size={11} /><span>Save</span></span>
        <span className="spm-pb-tools"><PhGlyph d={PH['sliders-horizontal']} size={11} /><span>TOOLS</span></span>
      </div>
      <div className="spm-pb-rows">
        {ROWS.map(([name, hex, role, ink]) => (
          <span key={name} className="spm-pb-row" style={{ background: hex, color: ink }}>
            <span className="spm-pb-rowtext">
              <span className="spm-pb-name">{name}</span>
              <span className="spm-pb-rowhex">{hex}</span>
              <span className="spm-pb-role">{role}</span>
            </span>
            <span className="spm-pb-rowico">
              <PhGlyph d={PH['lock-simple-open']} size={9} />
              <PhGlyph d={PH.copy} size={9} />
              <PhGlyph d={PH['dots-three-vertical']} size={9} />
            </span>
          </span>
        ))}
      </div>
      <div className="spm-pb-addrow">
        <span className="spm-pb-add">
          <span className="spm-pb-plus"><PhGlyph d={PH.plus} size={9} /></span>
          <span>ADD</span>
        </span>
      </div>
      <div className="spm-pb-adjust">
        <span className="spm-pb-adjlabel">ADJUST ALL</span>
        <span className="spm-pb-sliders">
          {ADJUST.map(([label, value, track]) => (
            <span key={label} className="spm-pb-slider">
              <span className="spm-pb-slabel">{label}</span>
              <span className="spm-pb-track" style={{ background: track }}><span /></span>
              <span className="spm-pb-sval">{value}</span>
            </span>
          ))}
        </span>
      </div>
    </>
  )
}

function IconScreen() {
  return (
    <>
      <div className="spm-ic-search">
        <PhGlyph className="spm-faint" d={PH['magnifying-glass']} size={13} />
        <span className="spm-ic-query">Search icons</span>
        <span className="spm-ic-fmt">SVG</span>
      </div>
      <div className="spm-ic-weights">
        {WEIGHTS.map((w, i) => (
          <span key={w} className={i === 0 ? 'spm-ic-weight is-on' : 'spm-ic-weight'}>{w}</span>
        ))}
      </div>
      <div className="spm-ic-grid">
        {ICONS.map(([icon, name]) => (
          <span key={icon} className="spm-ic-cell">
            <PhGlyph d={PH[icon]} size={17} />
            <span>{name}</span>
          </span>
        ))}
      </div>
      <div className="spm-ic-foot">
        <span className="spm-ic-recolour">
          <PhGlyph className="spm-accent" d={PH.palette} size={12} />
          <span>Recolour</span>
          <span className="spm-ic-chip" style={{ background: SEED.swatch }} />
        </span>
        <span className="spm-ic-export"><PhGlyph d={PH['download-simple']} size={12} />Export</span>
      </div>
    </>
  )
}

function ProjectsScreen() {
  const cap = FREE_SAVE_LIMITS.projects
  return (
    <>
      <div className="spm-pj-head">
        <span className="spm-pj-title">Projects</span>
        <span className="spm-pj-new"><PhGlyph d={PH.plus} size={11} />New</span>
      </div>
      <div className="spm-pj-list">
        {PROJECTS.map(([name, when, icon, tint]) => (
          <span key={name} className="spm-pj-card">
            <span className="spm-pj-thumb" style={{ background: tint }}>
              <span className="spm-pj-shade" />
              <span className="spm-pj-glyph"><PhGlyph d={PH[icon]} size={12} /></span>
            </span>
            <span className="spm-pj-text">
              <span className="spm-pj-name">{name}</span>
              <span className="spm-pj-when">{when}</span>
            </span>
            <PhGlyph className="spm-faint" d={PH['dots-three-vertical']} size={12} />
          </span>
        ))}
      </div>
      <span className="spm-pj-eyebrow">RECENT EXPORTS</span>
      <div className="spm-pj-exports">
        {EXPORTS.map(([type, name, size]) => (
          <span key={name} className="spm-pj-export">
            <span className="spm-pj-type">{type}</span>
            <span className="spm-pj-file">{name}</span>
            <span className="spm-pj-size">{size}</span>
          </span>
        ))}
      </div>
      <div className="spm-pj-plan">
        <span className="spm-pj-planrow">
          <span className="spm-pj-planname">Free plan</span>
          <span className="spm-pj-planuse">{cap} of {cap} projects</span>
        </span>
        <span className="spm-pj-meter"><span /></span>
        <span className="spm-pj-upgrade">Upgrade to Pro</span>
      </div>
    </>
  )
}

/* ── the page ─────────────────────────────────────────────────────────────── */

export default function SpectrumMobile() {
  // The headline's word entrance, on the same terms as `/`'s hero (see the long
  // note in Spectrum.jsx): the RESTING state is visible, the class starts the
  // keyframes on the first style resolution, and nothing adds it under reduced
  // motion or on a shell whose headline prerender already painted.
  const [heroLit] = useState(() => typeof document !== 'undefined'
    && !document.documentElement.hasAttribute('data-hero-prepainted')
    && !prefersReducedMotion())

  // "Open the toolkit" enters the app for everybody: no sign-up gate; it
  // lands on /projects, the workspace.
  const toolkitTo = '/projects'

  return (
    <div className="spectrum spm">
      <PillNav variant="spectrum" />
      <div className="sp-grain" aria-hidden="true" />

      {/* `data-nav-spacer` (line 217): the fixed pill's height, so the screen
          starts under it rather than behind it. */}
      <div className="spm-spacer" aria-hidden="true" />

      <main id="main" tabIndex={-1}>
        <section className="spm-intro" aria-labelledby="spm-h1">
          <div className={heroLit ? 'spm-hero is-in' : 'spm-hero'}>
            <div className="spm-hero-copy">
              <h1 className="spm-h1" id="spm-h1">
                <SpectrumWords text="The same tools on a phone." />
              </h1>
              <p className="spm-lede">
                Every tool runs the same on a phone. Pick colours on the train, check contrast in a
                meeting, then copy the tokens when you get back to your desk.
              </p>
            </div>
            <div className="spm-hero-side">
              <Link className="spm-cta" to={toolkitTo}>
                <span>Open the toolkit</span>
                <span className="spm-cta-icon" aria-hidden="true"><PhGlyph d={PH_ARROW_UP_RIGHT} size={13} /></span>
              </Link>
            </div>
          </div>

          {/* The phone row. A grid of three above 860px; at 860 and under, the
              design's `[data-phonerow]` strip — 78% columns, x-mandatory snap,
              each figure snapping to centre (lines 119-124). Focusable and
              labelled because at phone width it is a scroll container, and a
              keyboard user has to be able to reach what is off to the side. */}
          <div className="spm-row" role="region" aria-label="Phone screens" tabIndex={0}>
            <figure className="spm-fig">
              <Phone tab="Create"><PaletteScreen /></Phone>
              <figcaption>Palette Builder, full controls</figcaption>
            </figure>
            <figure className="spm-fig">
              <Phone tab="Create"><IconScreen /></Phone>
              <figcaption>Icon Library, recolour and export</figcaption>
            </figure>
            <figure className="spm-fig">
              <Phone tab="Projects"><ProjectsScreen /></Phone>
              <figcaption>Projects and your plan</figcaption>
            </figure>
          </div>
        </section>

        <SpectrumRamp className="sp-ramp--close spm-ramp" />
      </main>

      <SpectrumFooter />
    </div>
  )
}
