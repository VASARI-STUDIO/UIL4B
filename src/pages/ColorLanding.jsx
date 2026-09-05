import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import { useReveal } from '../hooks/useReveal'
import { CREATE_GROUPS } from '../data/toolTree'

// The /create/color landing — the ONE Create category home that renders a page
// rather than redirecting (see CREATE_HOMES_THAT_RENDER in toolTree.js).
//
// COMPRESSED to a value proposition and the links, on the founder's 2026-09-05
// instruction: "i want to compress our secondary sales pages to mostly act as
// linking pages showcasing a tools value proposition then a link". Offered three
// depths, he chose the deepest — value prop plus link, nothing else. So the page
// is now a hero and five tool links, and it stops.
//
// TWO SECTIONS WERE DELETED.
//
//   1. "A colour workflow that holds together" — three numbered pillars. Pitch
//      rather than product, and ONE OF THE THREE WAS FALSE. "Export-ready,
//      everywhere / Copy CSS variables, Tailwind config, JSON, PNG or SVG —
//      carry your system straight into the build with zero reformatting" is not
//      what ships: in ExportPanel.jsx only `book`, `html`, `md`, `png` and
//      `jpeg` carry `live: true`. The CSS tokens, JSON tokens, Tailwind theme
//      and asset-bundle (SVG + PNG) formats all render a "Soon" badge and a
//      disabled button. The page was selling four export formats the product
//      does not yet produce.
//
//      What IS true about export, and is still said where it is checkable: each
//      tool copies its own output — the Tint tool's "Copy CSS" per ramp and its
//      full CSS custom-property hand-off, the Gradient Generator's declaration,
//      the Contrast Checker's fixes. Those claims live in TOOL_COPY below,
//      beside the tool that honours them, which is where a claim can be checked
//      in one click instead of believed two screens early.
//
//      The other two pillars said the tools share one engine and use real colour
//      science. Both are true and neither needed a numbered card: the first is
//      what the page's heading already says, and the second is a mechanism, not
//      a benefit.
//
//   2. The closing SystemCTA — a second, larger copy of the CTA the hero made
//      one scroll earlier.
//
// The card list is driven by the colour group in toolTree, so the page can never
// promise a tool the nav doesn't list.
//
// Reference for the shape: Shopify's "Explore tools" index — heading, one line,
// then every tool as name + one sentence + its own verb link, and nothing after
// the grid. https://mobbin.com/sites/sections/0b61affd-faef-4b8c-b6fd-983b94de9a77

const COLOUR_GROUP = CREATE_GROUPS.find((g) => g.id === 'colour')

// One line per tool, keyed by the toolTree id, and each one a claim you can
// check by opening the link beside it. Kept here (not in the nav data) so the
// tree stays a lean routing source; any tool without copy still renders with its
// tree label + a safe fallback line.
//
// `go` is that tool's own verb, not a shared "Open →". Shopify's tool index does
// the same thing ("Create a logo", "Find a business name", "Discover a slogan"),
// and on a page whose entire remaining job is linking, the link text is the last
// place left to say what happens next.
const TOOL_COPY = {
  palette: {
    desc: 'Generate a full palette from one seed, lock the steps that are already right, and regenerate the rest.',
    go: 'Build a palette',
  },
  semantic: {
    desc: 'Success, warning, error, info and pending colours that stay legible against your surfaces in light and dark.',
    go: 'Set the state colours',
  },
  tint: {
    desc: 'Turn any colour into a tint scale, then copy the whole ramp as CSS custom properties.',
    go: 'Build a tint scale',
  },
  gradient: {
    desc: 'Linear, radial and conic gradients previewed live, with the CSS declaration one click away.',
    go: 'Design a gradient',
  },
  contrast: {
    // The one hard constraint on this page worth stating out loud: it is free
    // and it needs no account. ContrastChecker.jsx has no AuthGate, no isPro
    // read and no usage meter.
    desc: 'Test any text and background pair against WCAG AA and AAA, and take a one-click fix that is re-checked before it is offered. Free, no account.',
    go: 'Check a pair',
  },
}

export default function ColorLanding() {
  useReveal()
  const tools = (COLOUR_GROUP?.tools || []).filter((t) => !t.soon)

  return (
    <div className="home">
      <PillNav />

      <main id="main" tabIndex={-1}>
      {/* ── Hero: what this is for, why it is worth using, one way in ── */}
      <header className="home-hero home-hero--surface">
        <span className="home-eyebrow">Colour System Generator</span>
        <h1 className="home-hero-h1">One colour system, start to finish.</h1>
        <p className="home-hero-sub">
          Palette, semantic colours, tints, gradients and contrast all run on the same
          colour maths, so a hex you change in one is the hex the next one reads.
        </p>
        <div className="home-hero-cta">
          <Link className="ui-pill ui-pill-ink ui-pill-lg" to="/create/palette">
            Start with a palette
            <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <p className="home-hero-hint">Free to start — no card, and it runs in your browser.</p>
      </header>

      {/* ── The five tools. This grid IS the page. ── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-head home-head-center" data-reveal>
            <h2 className="home-h2">Five tools, one set of colours.</h2>
          </div>

          <div className="surface-grid">
            {tools.map((t) => {
              const copy = TOOL_COPY[t.id]
              return (
                <Link
                  className="surface-card surface-card--link fx-lift"
                  key={t.id}
                  to={t.route}
                  data-hue="colour"
                  data-reveal
                >
                  <h3 className="surface-card-title">
                    <span className="fx-dot" aria-hidden="true" />
                    {t.label}
                  </h3>
                  <p className="surface-card-desc">{copy?.desc || 'Open the tool and start building.'}</p>
                  <span className="surface-card-foot">
                    <span className="surface-card-go">{copy?.go || 'Open'}&nbsp;&rarr;</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
      </main>
    </div>
  )
}
