import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import { useReveal } from '../hooks/useReveal'
import { DISCOVER_GROUPS, LEARN_GROUPS } from '../data/toolTree'

// The Discover + Learn landing shells. Phase 1 is structure-only: both surfaces
// render a Mobbin-style hero over a grid of the sections that are on the way, each
// carrying an honest "Soon" badge. One component serves both surfaces via the
// `surface` prop, driven by the same DISCOVER_GROUPS / LEARN_GROUPS that feed the
// nav — so the page can never promise a section the menu doesn't list.
//
// Motion mirrors Home: the hero animates on load (CSS fx-rise); the grid reveals
// on scroll through useReveal(), which only toggles a class — no state-in-effect.

const SURFACES = {
  discover: {
    eyebrow: 'Discover',
    title: 'Find systems worth stealing.',
    lede: 'Browse community UI systems and the hand-picked resources that actually earn a tab — then carry what fits straight into your build.',
    sectionTitle: 'Everything worth a tab.',
    sectionLede: 'Inspiration, community fonts and prompts, curated tools and your own collections — organised in one place instead of forty browser tabs.',
    hue: 'imagery',
    groups: DISCOVER_GROUPS,
  },
  learn: {
    eyebrow: 'Learn',
    title: 'Understand the craft, not just the tools.',
    lede: 'Design principles, colour and type guides, and growth playbooks — the why behind every foundation you build in UIL4B.',
    sectionTitle: 'A library that explains itself.',
    sectionLede: 'From first principles to SEO and marketing — short, practical guides that make you measurably better at the work.',
    hue: 'ai',
    groups: LEARN_GROUPS,
  },
}

export default function SurfaceLanding({ surface }) {
  useReveal()
  const s = SURFACES[surface] || SURFACES.discover

  return (
    <div className="home">
      <PillNav />

      {/* ── Hero ── */}
      <header className="home-hero">
        <span className="home-eyebrow">{s.eyebrow}</span>
        <h1 className="home-hero-h1">{s.title}</h1>
        <p className="home-hero-sub">{s.lede}</p>
        <div className="home-hero-cta">
          <Link className="ui-pill ui-pill-ink ui-pill-lg" to="/color">
            Start building
            <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
          </Link>
          <Link className="ui-pill ui-pill-out ui-pill-lg" to="/home">
            Back to home
          </Link>
        </div>
        <p className="home-hero-hint">{s.eyebrow} is coming soon — here&rsquo;s what&rsquo;s on the way.</p>
      </header>

      {/* ── What's coming: the surface's sections as cards ── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-head home-head-center" data-reveal>
            <span className="home-eyebrow">On the way</span>
            <h2 className="home-h2">{s.sectionTitle}</h2>
            <p className="home-lede">{s.sectionLede}</p>
          </div>

          <div className="surface-grid">
            {s.groups.map((g) => (
              <article
                className="surface-card fx-lift"
                key={g.id}
                data-hue={g.accent ? 'accent' : s.hue}
                data-reveal
              >
                <h3 className="surface-card-title">
                  <span className="fx-dot" aria-hidden="true" />
                  {g.label}
                </h3>
                <p className="surface-card-desc">{g.desc}</p>
                <span className="soon-badge">Soon</span>
              </article>
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
            <Link className="ui-pill ui-pill-out ui-pill-lg" to="/home">
              Back to home
            </Link>
          </div>
          <p className="home-cta-hint">No credit card · Build in your browser</p>
        </div>
      </section>
    </div>
  )
}
