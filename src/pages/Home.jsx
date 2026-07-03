import { useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import { useReveal } from '../hooks/useReveal'
import { CREATE_GROUPS } from '../data/toolTree'

// The public homepage: a Mobbin-style sales page for UIL4B. It is intentionally
// image-light for Phase 1 — every "screenshot" is a `spec-frame` placeholder the
// founder swaps for real captures later. All structure is driven by the same
// `CREATE_GROUPS` that feeds the nav and router, so the story can never claim a
// tool the product doesn't have.
//
// Motion: the hero animates on load via CSS `fx-rise`; everything below the fold
// reveals on scroll through `useReveal()` (which only toggles a class — no React
// state, so we stay clear of the `set-state-in-effect` advisory). The single bit
// of local state here is the Create category toggle, set from click only.

// The three surfaces, as cards. `to` points at each surface's landing.
const SURFACES = [
  {
    id: 'create',
    hue: 'component',
    title: 'Create',
    desc: 'Build the foundations — colour, type, components, imagery, icons and AI — in one workspace.',
    link: 'Start building',
    to: '/color',
  },
  {
    id: 'discover',
    hue: 'imagery',
    title: 'Discover',
    desc: 'Browse community UI systems and hand-picked resources that actually earn a tab.',
    link: 'Explore Discover',
    to: '/discover',
  },
  {
    id: 'learn',
    hue: 'ai',
    title: 'Learn',
    desc: 'Understand the why — design principles, colour and type guides, and growth playbooks.',
    link: 'Open Learn',
    to: '/learn',
  },
]

// Placeholder community tiles for the horizontal scroller. Real submissions land
// here once Discover ships; for now they set the visual rhythm.
const COMMUNITY = ['System 01', 'System 02', 'System 03', 'System 04', 'System 05', 'System 06']

export default function Home() {
  useReveal()
  const [active, setActive] = useState(CREATE_GROUPS[0].id)
  const activeGroup = CREATE_GROUPS.find((g) => g.id === active) || CREATE_GROUPS[0]

  return (
    <div className="home">
      <PillNav />

      {/* ── Hero ── */}
      <header className="home-hero">
        <span className="home-hero-glyph" aria-hidden="true">U</span>
        <h1 className="home-hero-h1">The workspace for building UI systems.</h1>
        <p className="home-hero-sub">
          Colour, type, components, imagery, icons and AI — build, validate and export your
          interface foundations without tab-hopping across a dozen tools.
        </p>
        <div className="home-hero-cta">
          <Link className="ui-pill ui-pill-ink ui-pill-lg" to="/color">
            Start building
            <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
          </Link>
          <a className="ui-pill ui-pill-out ui-pill-lg" href="#create">
            See how it works
          </a>
        </div>
        <p className="home-hero-hint">Free to start · No credit card · Runs in your browser</p>
      </header>

      {/* ── Trust strip (honest, no fake logos) ── */}
      <div className="home-container">
        <div className="home-trust" data-reveal>
          <p className="home-trust-label">One workspace, every foundation</p>
          <div className="home-stats">
            <span className="home-stat"><b>6</b> tool systems</span>
            <span className="home-stat"><b>200k+</b> icons</span>
            <span className="home-stat"><b>Every</b> emoji</span>
            <span className="home-stat"><b>100%</b> in-browser</span>
            <span className="home-stat"><b>$0</b> to start</span>
          </div>
        </div>
      </div>

      {/* ── Create: interactive category toggle ── */}
      <section className="home-section" id="create">
        <div className="home-container">
          <div className="home-head home-head-center" data-reveal>
            <span className="home-eyebrow">Create</span>
            <h2 className="home-h2">Six systems. One place to build.</h2>
            <p className="home-lede">
              Every foundation you reach for, side by side — so a colour choice, a type scale and a
              component all live in the same file.
            </p>
          </div>

          <div className="home-toggles" role="tablist" aria-label="Create systems" data-reveal>
            {CREATE_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={active === group.id}
                className={active === group.id ? 'home-toggle is-active' : 'home-toggle'}
                data-hue={group.hue}
                onClick={() => setActive(group.id)}
              >
                <span className="fx-dot" aria-hidden="true" />
                {group.label}
              </button>
            ))}
          </div>

          <div className="home-stage" data-reveal>
            <div className="spec-frame" data-hue={activeGroup.hue} aria-live="polite">
              <span className="spec-label">{activeGroup.label} · preview</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three surfaces ── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-head home-head-center" data-reveal>
            <span className="home-eyebrow">Three surfaces</span>
            <h2 className="home-h2">Build, browse, understand.</h2>
            <p className="home-lede">
              One product, one login, three ways in — whether you're making a system, looking for
              one, or learning the craft behind it.
            </p>
          </div>

          <div className="home-surfaces">
            {SURFACES.map((s) => (
              <article className="home-surface fx-lift" key={s.id} data-hue={s.hue} data-reveal>
                <div className="spec-frame">
                  <span className="spec-label">{s.title}</span>
                </div>
                <h3 className="home-surface-title">
                  <span className="fx-dot" aria-hidden="true" />
                  {s.title}
                </h3>
                <p className="home-surface-desc">{s.desc}</p>
                <Link className="home-surface-link" to={s.to}>
                  {s.link} &rarr;
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Validate / Export splits ── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-split" data-reveal>
            <div className="home-split-copy">
              <span className="home-eyebrow">Validate</span>
              <h2 className="home-h2">Ship foundations that actually hold up.</h2>
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
                  Type scales that stay in proportion
                </li>
                <li>
                  <svg className="home-check-mark" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                    <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Tokens that map cleanly to light and dark
                </li>
              </ul>
            </div>
            <div className="home-split-media">
              <div className="spec-frame">
                <span className="spec-label">Contrast · report</span>
              </div>
            </div>
          </div>

          <div className="home-split reverse" data-reveal>
            <div className="home-split-copy">
              <span className="home-eyebrow">Export</span>
              <h2 className="home-h2">Production-ready output, one copy away.</h2>
              <p className="home-lede">
                Everything you build leaves as clean, framework-ready code — no re-typing hex values
                into your stylesheet.
              </p>
              <code className="home-code">:root &#123; --brand: #2563EB; &#125;</code>
            </div>
            <div className="home-split-media">
              <div className="spec-frame">
                <span className="spec-label">CSS · export</span>
              </div>
            </div>
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
            {COMMUNITY.map((label) => (
              <div className="home-card" key={label}>
                <div className="spec-frame">
                  <span className="spec-label">{label}</span>
                </div>
                <p className="home-card-label">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="home-cta">
        <div className="home-cta-dots" aria-hidden="true">
          <span className="home-cta-dot" /><span className="home-cta-dot" /><span className="home-cta-dot" />
          <span className="home-cta-dot" /><span className="home-cta-dot" /><span className="home-cta-dot" />
        </div>
        <div className="home-cta-inner" data-reveal>
          <span className="home-eyebrow">Start free</span>
          <h2 className="home-h2">Build your first system today.</h2>
          <div className="home-hero-cta">
            <Link className="ui-pill ui-pill-ink ui-pill-lg" to="/color">
              Start building
              <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
            </Link>
            <a className="ui-pill ui-pill-out ui-pill-lg" href="#create">
              Explore the tools
            </a>
          </div>
          <p className="home-cta-hint">No credit card · Upgrade only when you're ready</p>
        </div>
      </section>

      {/* ── Footer (Coolors-style tools grid + link columns) ── */}
      <footer className="home-foot">
        <div className="home-container">
          <div className="home-foot-feat">
            {CREATE_GROUPS.map((group) => (
              <Link
                className="home-foot-feat-link"
                key={group.id}
                to={group.home}
                data-hue={group.hue}
              >
                <span className="home-foot-feat-title">
                  <span className="fx-dot" aria-hidden="true" />
                  {group.label}
                </span>
                <span className="home-foot-feat-desc">{group.desc}</span>
              </Link>
            ))}
          </div>

          <div className="home-foot-cols">
            <div>
              <p className="home-foot-colhead">Create</p>
              {CREATE_GROUPS.map((group) => (
                <Link className="home-foot-link" key={group.id} to={group.home}>
                  {group.label}
                </Link>
              ))}
            </div>
            <div>
              <p className="home-foot-colhead">Discover</p>
              <Link className="home-foot-link" to="/discover">Inspiration</Link>
              <Link className="home-foot-link" to="/discover">Community fonts</Link>
              <Link className="home-foot-link" to="/discover">Curated resources</Link>
              <Link className="home-foot-link" to="/discover">Collections</Link>
            </div>
            <div>
              <p className="home-foot-colhead">Learn</p>
              <Link className="home-foot-link" to="/learn">Design principles</Link>
              <Link className="home-foot-link" to="/learn">Colour &amp; type guides</Link>
              <Link className="home-foot-link" to="/learn">SEO &amp; marketing</Link>
              <Link className="home-foot-link" to="/learn">Help &amp; getting started</Link>
            </div>
            <div>
              <p className="home-foot-colhead">Product</p>
              <Link className="home-foot-link" to="/home">Home</Link>
              <Link className="home-foot-link" to="/login">Log in</Link>
              <Link className="home-foot-link" to="/login">Get started</Link>
            </div>
          </div>

          <div className="home-foot-legal">
            <div className="home-foot-brand">
              <span className="pnav-glyph" aria-hidden="true">U</span>
              <span className="pnav-word">UIL4B</span>
            </div>
            <p className="home-foot-copy">© {new Date().getFullYear()} UIL4B · Build UI systems, faster.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
