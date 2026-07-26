import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import SystemCTA from '../components/SystemCTA'
import { useReveal } from '../hooks/useReveal'
import { CREATE_GROUPS } from '../data/toolTree'

// The /color sales page (Wave 6 item 24). The old merged Colour Studio at /color
// is being reworked into a guided walkthrough (the Design System Builder), so
// /color now sells the colour system instead of mounting the full studio. It
// mirrors the SurfaceLanding pattern — same hero / pillars / grid / CTA classes —
// but its cards are LIVE tools, so each links straight into its tool (no "Soon"
// badge). The card list is driven by the colour group in toolTree, so the page
// can never promise a tool the nav doesn't list.

const COLOUR_GROUP = CREATE_GROUPS.find((g) => g.id === 'colour')

// Marketing one-liners per tool, keyed by the toolTree id. Kept here (not in the
// nav data) so the tree stays a lean routing source; any tool without copy still
// renders with its tree label + a safe fallback line.
const TOOL_COPY = {
  palette: 'Generate a full palette from one seed — harmony systems, tonal ramps and accessibility built in.',
  semantic: 'Success, warning, error and info colours that stay legible and on-brand in light and dark.',
  tint: 'Turn any colour into a production-ready tint scale. Tune the curve, then copy swatches or CSS.',
  gradient: 'Design linear, radial and conic gradients across your palette and copy the CSS in one click.',
  contrast: 'Free WCAG checker — test any pair against AA and AAA and get one-click fixes that pass.',
}

const PILLARS = [
  { title: 'One system, not five tabs', desc: 'Palette, semantic colours, tints and gradients all run on the same colour maths — so every tool agrees and nothing drifts.' },
  { title: 'Built on real colour science', desc: 'HCT tonal palettes and WCAG contrast under the hood mean the colours you ship stay legible and consistent in light and dark.' },
  { title: 'Export-ready, everywhere', desc: 'Copy CSS variables, Tailwind config, JSON, PNG or SVG — carry your system straight into the build with zero reformatting.' },
]

export default function ColorLanding() {
  useReveal()
  const tools = (COLOUR_GROUP?.tools || []).filter((t) => !t.soon)

  return (
    <div className="home">
      <PillNav />

      <main id="main" tabIndex={-1}>
      {/* ── Hero ── */}
      <header className="home-hero">
        <span className="home-eyebrow">Colour System Generator</span>
        <h1 className="home-hero-h1">One colour system, start to finish.</h1>
        <p className="home-hero-sub">
          Build a palette, derive semantic colours, generate tints and gradients, and
          check contrast — all on the same engine, all export-ready. No more stitching
          five colour tools together.
        </p>
        <div className="home-hero-cta">
          <Link className="ui-pill ui-pill-ink ui-pill-lg" to="/color/palette">
            Start with a palette
            <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
          </Link>
          <Link className="ui-pill ui-pill-out ui-pill-lg" to="/plans">
            See our plans
          </Link>
        </div>
        <p className="home-hero-hint">Free to start — no credit card, build in your browser.</p>
      </header>

      {/* ── Value pillars ── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-head home-head-center" data-reveal>
            <span className="home-eyebrow">Why it helps</span>
            <h2 className="home-h2">A colour workflow that holds together.</h2>
          </div>
          <div className="sl-pillars">
            {PILLARS.map((p, i) => (
              <article className="sl-pillar fx-lift" key={p.title} data-reveal>
                <span className="sl-pillar-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="sl-pillar-title">{p.title}</h3>
                <p className="sl-pillar-desc">{p.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── The tools: each a live link ── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-head home-head-center" data-reveal>
            <span className="home-eyebrow">The tools</span>
            <h2 className="home-h2">Everything colour, in one place.</h2>
            <p className="home-lede">Five focused tools, one shared foundation — jump into any of them and your work carries across.</p>
          </div>

          <div className="surface-grid">
            {tools.map((t) => (
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
                <p className="surface-card-desc">{TOOL_COPY[t.id] || 'Open the tool and start building.'}</p>
                <span className="surface-card-go" aria-hidden="true">Open&nbsp;&rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <SystemCTA
        title="Build a colour system that stays connected."
        description="Start with one decision, validate every role, and leave with production-ready tokens."
        primaryLabel="Start with a palette"
        primaryTo="/color/palette"
        secondaryLabel="Back to home"
        secondaryTo="/home"
      />
      </main>
    </div>
  )
}
