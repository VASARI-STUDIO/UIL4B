import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import WorldMap from '../components/WorldMap'
import SystemCTA from '../components/SystemCTA'
import { useReveal } from '../hooks/useReveal'
import { DISCOVER_GROUPS, LEARN_GROUPS } from '../data/toolTree'
import { readCommunitySubmissions } from '../utils/communitySubmissions'

// The Discover + Learn landing shells. Phase 1 is structure-only: both surfaces
// render a hero band over a grid of the sections that are on the way, each
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
    pillarsTitle: 'Everything you find, in one place.',
    pillars: [
      { title: 'Browse, don’t bookmark', desc: 'Community UI systems and hand-picked resources in one searchable place — no more forty-tab research sessions that you never revisit.' },
      { title: 'One-tap hand-off', desc: 'See a gradient, palette or font you like and carry it straight into the matching UIL4B tool — already loaded and ready to tweak.' },
      { title: 'Save what earns a tab', desc: 'Build collections of the systems and resources you actually reuse, so your best references are always one click away.' },
    ],
    sectionTitle: 'Everything worth a tab.',
    sectionLede: 'Inspiration, community fonts and prompts, curated tools and your own collections — organised in one place instead of forty browser tabs.',
    mapEyebrow: 'A global craft',
    mapTitle: 'Great UI is built everywhere.',
    mapLede: 'From a studio in Brisbane to design hubs on every continent — UIL4B is made for the way people build interfaces the world over.',
    hue: 'imagery',
    groups: DISCOVER_GROUPS,
    primaryLabel: 'Browse palettes',
    primaryTo: '/discover/palettes',
    secondaryLabel: 'Explore fonts',
    secondaryTo: '/fontgallery',
    hint: 'Three curated libraries are ready now — palettes, gradients and fonts.',
  },
  learn: {
    eyebrow: 'Learn',
    title: 'Understand the craft, not just the tools.',
    lede: 'Design principles, colour and type guides, and growth playbooks — the why behind every foundation you build in UIL4B.',
    pillarsTitle: 'Get measurably better at the work.',
    pillars: [
      { title: 'The why, not just the how', desc: 'Short, practical guides that explain the reasoning behind interfaces that work — so the lesson sticks well past a single project.' },
      { title: 'From colour to conversion', desc: 'Principles, colour and type, plus SEO and marketing playbooks — the full path from a good-looking UI to one that performs.' },
      { title: 'Built into your workflow', desc: 'Every guide links back to the tool that puts it into practice, so you learn and apply in the very same place.' },
    ],
    sectionTitle: 'A library that explains itself.',
    sectionLede: 'From first principles to SEO and marketing — short, practical guides that make you measurably better at the work.',
    mapEyebrow: 'A worldwide classroom',
    mapTitle: 'Designers everywhere, leveling up.',
    mapLede: 'Built in Brisbane for a community that spans every continent — practical craft that travels as far as your work does.',
    hue: 'ai',
    groups: LEARN_GROUPS,
    primaryLabel: 'Start building',
    primaryTo: '/color',
    secondaryLabel: 'Back to home',
    secondaryTo: '/home',
    hint: 'Learn is coming soon — here’s what’s on the way.',
  },
}

export default function SurfaceLanding({ surface }) {
  useReveal()
  const s = SURFACES[surface] || SURFACES.discover
  useEffect(() => {
    if (surface === 'discover') readCommunitySubmissions()
  }, [surface])

  return (
    <div className="home">
      <PillNav />

      <main id="main" tabIndex={-1}>
      {/* ── Hero ── */}
      <header className="home-hero">
        <span className="home-eyebrow">{s.eyebrow}</span>
        <h1 className="home-hero-h1">{s.title}</h1>
        <p className="home-hero-sub">{s.lede}</p>
        <div className="home-hero-cta">
          <Link className="ui-pill ui-pill-ink ui-pill-lg" to={s.primaryTo}>
            {s.primaryLabel}
            <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
          </Link>
          <Link className="ui-pill ui-pill-out ui-pill-lg" to={s.secondaryTo}>
            {s.secondaryLabel}
          </Link>
        </div>
        <p className="home-hero-hint">{s.hint}</p>
      </header>

      {/* ── Value pillars: why this surface is worth it ── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-head home-head-center" data-reveal>
            <span className="home-eyebrow">Why it helps</span>
            <h2 className="home-h2">{s.pillarsTitle}</h2>
          </div>
          <div className="sl-pillars">
            {s.pillars.map((p, i) => (
              <article className="sl-pillar fx-lift" key={p.title} data-reveal>
                <span className="sl-pillar-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="sl-pillar-title">{p.title}</h3>
                <p className="sl-pillar-desc">{p.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's coming: the surface's sections as cards ── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-head home-head-center" data-reveal>
            <span className="home-eyebrow">{surface === 'discover' ? 'Live libraries & roadmap' : 'On the way'}</span>
            <h2 className="home-h2">{s.sectionTitle}</h2>
            <p className="home-lede">{s.sectionLede}</p>
          </div>

          <div className="surface-grid">
            {s.groups.map((g) => {
              const hue = g.accent ? 'accent' : s.hue
              const body = (
                <>
                  <h3 className="surface-card-title">
                    <span className="fx-dot" aria-hidden="true" />
                    {g.label}
                  </h3>
                  <p className="surface-card-desc">{g.desc}</p>
                  {g.soon
                    ? <span className="soon-badge">Soon</span>
                    : <span className="surface-card-go">Browse&nbsp;&rarr;</span>}
                </>
              )
              // Live groups (soon:false) link to their real page; everything else
              // stays a static "on the way" card — no dead links either way.
              return g.soon ? (
                <article className="surface-card fx-lift" key={g.id} data-hue={hue} data-reveal>
                  {body}
                </article>
              ) : (
                <Link className="surface-card surface-card--link fx-lift" key={g.id} to={g.route} data-hue={hue} data-reveal>
                  {body}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Global craft: stylized world map (decorative, no user data) ── */}
      <section className="home-section">
        <div className="home-container">
          <div className="home-head home-head-center" data-reveal>
            <span className="home-eyebrow">{s.mapEyebrow}</span>
            <h2 className="home-h2">{s.mapTitle}</h2>
            <p className="home-lede">{s.mapLede}</p>
          </div>
          <div data-reveal>
            <WorldMap />
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <SystemCTA
        eyebrow={`${s.eyebrow} meets Create`}
        title="Turn what you find into a system you can ship."
        description="Move from reference to real interface foundations without rebuilding the context in another app."
        primaryLabel="Start building"
        primaryTo="/color"
        secondaryLabel="Back to home"
        secondaryTo="/home"
      />
      </main>
    </div>
  )
}
