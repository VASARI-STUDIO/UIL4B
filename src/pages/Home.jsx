import { lazy, Suspense, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import CreatePreview from '../components/CreatePreview'
import NavIcon from '../components/NavIcon'
import SystemCTA from '../components/SystemCTA'
import { useHomeMotion } from '../hooks/useHomeMotion'
import { LEARN_GROUPS, LIVE_PREVIEW_GROUPS } from '../data/toolTree'

// The real Export dialog, lazy-loaded so its (and its focus-trap's) code only
// ships when a visitor actually asks to see the export formats.
const ExportPanel = lazy(() => import('../components/ExportPanel'))

// The public homepage: a Mobbin-style sales page for UIL4B. It is intentionally
// image-light for Phase 1 — every "screenshot" is a `spec-frame` placeholder the
// founder swaps for real captures later. All structure is driven by the same
// `CREATE_GROUPS` that feeds the nav and router, so the story can never claim a
// tool the product doesn't have.
//
// Motion: `useHomeMotion()` owns the home page's motion — Lenis smooth-scroll, a
// GSAP hero entrance, scroll-triggered reveals and a light hero parallax — all
// scoped to this route, torn down on unmount, and behind a reduced-motion guard.
// It writes only to the DOM (never React state), so we stay clear of the
// `set-state-in-effect` advisory. The single bit of local state here is the
// Create category toggle, set from click only.

// A small contrast report, drawn as a real card graphic in the Validate section
// (replaces the old `spec-frame` placeholder). Ratios/grades are illustrative.
const REPORT = [
  { pair: 'Ink on surface', fg: '#0F172A', bg: '#FFFFFF', ratio: '15.8', grade: 'AAA', ok: true },
  { pair: 'Accent on tint', fg: '#1D4ED8', bg: '#EFF6FF', ratio: '7.2', grade: 'AAA', ok: true },
  { pair: 'Muted on surface', fg: '#64748B', bg: '#FFFFFF', ratio: '4.9', grade: 'AA', ok: true },
  { pair: 'White on accent', fg: '#FFFFFF', bg: '#3B82F6', ratio: '3.1', grade: 'AA Large', ok: true },
  { pair: 'Grey on grey', fg: '#94A3B8', bg: '#E2E8F0', ratio: '1.8', grade: 'Fail', ok: false },
]

// Community system tiles for the Discover scroller, drawn as real mini-system
// thumbnails (palette + specimen) via `data-hue` (replaces the placeholders).
// Real submissions land here once Discover community ships.
const COMMUNITY = [
  { label: 'Nimbus', meta: 'SaaS · 5 colours', hue: 'colour', pal: ['#0051FF', '#4C8DFF', '#A9C7FF', '#0B1B3A'] },
  { label: 'Amethyst', meta: 'Fintech · 5 colours', hue: 'component', pal: ['#7C3AED', '#A78BFA', '#DDD6FE', '#2E1065'] },
  { label: 'Orchard', meta: 'Wellness · 5 colours', hue: 'imagery', pal: ['#059669', '#34D399', '#A7F3D0', '#022C22'] },
  { label: 'Ember', meta: 'Commerce · 5 colours', hue: 'ai', pal: ['#EA580C', '#FB923C', '#FED7AA', '#431407'] },
  { label: 'Slate', meta: 'Dev tool · 5 colours', hue: 'type', pal: ['#0EA5E9', '#38BDF8', '#BAE6FD', '#0C2A3E'] },
  { label: 'Bloom', meta: 'Editorial · 5 colours', hue: 'icons', pal: ['#DB2777', '#F472B6', '#FBCFE8', '#500724'] },
]

// Export section content. The format names + descriptions are kept verbatim in
// sync with `ExportPanel`'s FORMATS so the homepage never promises a format the
// real dialog doesn't list. The file names are a decorative faux-output stack.
const EXPORT_FORMATS = [
  { name: 'HTML design system', desc: 'Planned: a full page of tokens, components and styles as HTML + CSS.' },
  { name: 'CSS tokens', desc: 'Planned: custom properties for colour, type, spacing and radii.' },
  { name: 'JSON tokens', desc: 'Planned: design tokens for pipelines and Style Dictionary.' },
  { name: 'Tailwind theme', desc: 'Planned: a Tailwind theme extension mapped to your system.' },
  { name: 'Asset bundle', desc: 'Planned: icons and swatches bundled as SVG + PNG.' },
]
const EXPORT_FILES = ['system.html', 'tokens.css', 'tokens.json', 'tailwind.config.js', 'assets.zip']

export default function Home() {
  const rootRef = useRef(null)
  useHomeMotion(rootRef)
  const [exportOpen, setExportOpen] = useState(false)
  const [activePreviewId, setActivePreviewId] = useState(LIVE_PREVIEW_GROUPS[0].id)

  return (
    <div className="home" ref={rootRef}>
      <PillNav />

      <main id="main" tabIndex={-1}>
      {/* ── Hero ── */}
      <div className="home-workspace-intro">
      <header className="home-hero">
        <div className="home-orbit-rings" aria-hidden="true"><i /><i /><i /></div>
        <div className="home-hero-core">
          <p className="home-hero-kicker">
            <span className="home-hero-kicker-dot" aria-hidden="true" />
            The operating workspace for UI systems
          </p>
          <h1 className="home-hero-h1">
            <span className="home-hero-line"><span className="home-hero-line-in">No more tab hoarding.</span></span>
            <span className="home-hero-line home-hero-line--accent"><span className="home-hero-line-in">Build your UI system in one place.</span></span>
          </h1>
          <p className="home-hero-sub">
            Build, validate and hand off live colour systems, icons and imagery in one
            workspace. Typography and component tooling are coming next.
          </p>
          <div className="home-hero-cta">
            <Link className="ui-pill ui-pill-ink ui-pill-lg" to="/login">
              Start building free
              <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
            </Link>
            <a className="ui-pill ui-pill-out ui-pill-lg" href="#create">Explore the workspace</a>
          </div>
          <p className="home-hero-hint">No credit card · No setup · Your first system stays free</p>
        </div>
        <ul className="home-workspace-bridge" aria-label="Choose a live workspace preview">
          {LIVE_PREVIEW_GROUPS.map((group) => (
            <li key={group.id} data-hue={group.hue} data-preview-id={group.id}>
              <button
                type="button"
                className="home-workspace-bridge-tab"
                aria-pressed={activePreviewId === group.id}
                aria-controls="home-preview-panel"
                onClick={() => setActivePreviewId(group.id)}
              >
                <NavIcon id={group.id} />
                <span>{group.previewLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      </header>

      {/* ── Create: the live browser graphic, sat directly under the hero ── */}
      <section className="home-showcase" id="create">
        <div className="home-container">
          <div className="home-stage-shell" data-reveal="media">
            <div className="home-stage-meta">
              <span className="home-stage-status">
                <i aria-hidden="true" />
                Interactive workspace preview
              </span>
              <span className="home-stage-meta-note">Switch tabs · try the live controls</span>
            </div>
            <div className="home-stage">
              <CreatePreview activeId={activePreviewId} onActiveChange={setActivePreviewId} />
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* ── Validate ── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-split">
            <div className="home-split-copy" data-reveal>
              <span className="home-eyebrow">Validate</span>
              <h2 className="home-h2">See it break here, not in production.</h2>
              <p className="home-lede">
                Catch the problems before they reach production — contrast, scale and consistency,
                checked as you build.
              </p>
              <ul className="home-check">
                <li>
                  <svg className="home-check-mark" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                    <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  WCAG contrast checked on every colour pair
                </li>
                <li>
                  <svg className="home-check-mark" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                    <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Colour scales that stay in proportion
                </li>
                <li>
                  <svg className="home-check-mark" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                    <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Tokens that map cleanly to light and dark
                </li>
              </ul>
            </div>
            <div className="home-split-media" data-reveal="media">
              <div className="home-report" data-hue="colour">
                <div className="home-report-bar">
                  <span className="prev-traffic" aria-hidden="true"><i /><i /><i /></span>
                  <span className="home-report-title">Contrast report</span>
                </div>
                <ul className="home-report-list">
                  {REPORT.map((r) => (
                    <li className="home-report-row" key={r.pair}>
                      <span className="home-report-chips" aria-hidden="true">
                        <span className="home-report-chip" style={{ background: r.bg, color: r.fg }}>Aa</span>
                      </span>
                      <span className="home-report-pair">{r.pair}</span>
                      <span className="home-report-ratio">{r.ratio}</span>
                      <span className="home-report-grade" data-ok={r.ok}>{r.grade}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Export ── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-head" data-reveal>
            <span className="home-eyebrow">Export</span>
            <h2 className="home-h2">Preview the export roadmap.</h2>
            <p className="home-lede">
              Copy live colour values from the tools today. Full-system, typography and component
              exports below are clearly marked as coming soon.
            </p>
          </div>
          <div className="home-export">
            <ul className="home-export-list" data-reveal-group>
              {EXPORT_FORMATS.map((f, i) => (
                <li className={i === 0 ? 'home-export-row is-primary' : 'home-export-row'} key={f.name}>
                  <span className="home-export-name">{f.name}</span>
                  <em className="home-export-soon">Soon</em>
                  <span className="home-export-desc">{f.desc}</span>
                </li>
              ))}
            </ul>
            <div className="home-export-stack" data-reveal="media" aria-hidden="true">
              {EXPORT_FILES.map((file) => (
                <div className="home-export-file" key={file}>
                  <span className="home-export-file-dot" />
                  <span className="home-export-file-name">{file}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="home-export-cta">
            <button type="button" className="ui-pill ui-pill-out ui-pill-md" onClick={() => setExportOpen(true)}>
              See the export formats
              <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Community scroller ── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-head" data-reveal>
            <span className="home-eyebrow">Discover</span>
            <h2 className="home-h2">Systems worth stealing.</h2>
            <p className="home-lede">
              Browse UI systems the community actually ships, then save what fits your next build.
            </p>
          </div>
          <div className="home-scroller" data-reveal>
            {COMMUNITY.map((sys) => (
              <Link className="home-card fx-lift" key={sys.label} to="/discover" data-hue={sys.hue}>
                <div className="home-card-art">
                  <div className="home-card-swatches" aria-hidden="true">
                    {sys.pal.map((hex, i) => (
                      <span className="home-card-swatch" key={i} style={{ background: hex }} />
                    ))}
                  </div>
                  <span className="home-card-specimen" aria-hidden="true">Aa</span>
                </div>
                <div className="home-card-foot">
                  <p className="home-card-label">{sys.label}</p>
                  <p className="home-card-meta">{sys.meta}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="home-scroller-cta">
            <Link className="ui-pill ui-pill-out ui-pill-md" to="/discover">
              Explore Discover
              <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Learn ── */}
      <section className="home-section" id="learn">
        <div className="home-container">
          <div className="home-head" data-reveal>
            <span className="home-eyebrow">Learn</span>
            <h2 className="home-h2">Understand the why.</h2>
            <p className="home-lede">
              A growing hub of guides and references — AI workflows, marketing, UI and colour — so
              you know not just what to build, but why it works.
            </p>
          </div>
          <div className="home-learn" data-reveal-group>
            {LEARN_GROUPS.map((g) => (
              <Link className="home-learn-card fx-lift" key={g.id} to={g.route} data-accent={g.accent || undefined}>
                <span className="home-learn-title">
                  <span className="fx-dot" aria-hidden="true" />
                  {g.label}
                </span>
                <span className="home-learn-desc">{g.desc}</span>
                <span className="home-learn-go">{g.soon ? 'Coming soon' : 'Read'} &rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <SystemCTA
        title="From first decision to clean handoff."
        description="Build a coherent UI system in one place, then take it straight into production."
        secondaryLabel="See our plans"
        secondaryTo="/plans"
        hint="No credit card · Upgrade only when you're ready"
      />

      </main>

      {exportOpen && (
        <Suspense fallback={null}>
          <ExportPanel onClose={() => setExportOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
