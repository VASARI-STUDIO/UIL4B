import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import NavIcon from '../components/NavIcon'
import WorldMap from '../components/WorldMap'
import SystemCTA from '../components/SystemCTA'
import { useReveal } from '../hooks/useReveal'
import { DISCOVER_GROUPS, LEARN_GROUPS } from '../data/toolTree'
import { readCommunitySubmissions } from '../utils/communitySubmissions'
import { GALLERY_PALETTES } from '../data/paletteGallery'
import { GALLERY_GRADIENTS, gradientCss } from '../data/gradientGallery'
import { COMMUNITY_PROMPTS } from '../data/communityPrompts'

// ── Card previews: what is actually inside each library ─────────────────────
// The eight cards on /discover were eight identical white rectangles carrying a
// title and a sentence. On a page whose whole job is "come and look at things",
// not one card showed a single thing you could look at — you had to click to
// find out whether a library was worth the click.
//
// Every library card on Mobbin leads with its contents: Webflow's Libraries
// grid is thumbnail-first with a count badge over it, and Tines varies card
// weight so a grid of the same shape still reads as edited rather than
// tabulated. These previews are drawn from the REAL gallery data the tools
// read — 64 palettes, 100 gradients, 20 prompts — so the card cannot advertise
// something the library does not contain, and the count is a fact rather than
// a claim.
//
// Keyed by group id and living here rather than in DISCOVER_GROUPS on purpose:
// this is presentation. The array in toolTree.js stays exactly as it is, which
// also keeps this clear of [handkept-tool-lists-remaining].
const PREVIEWS = {
  'palette-library': () => ({
    meta: `${GALLERY_PALETTES.length} palettes`,
    node: (
      <div className="scp-stack">
        {GALLERY_PALETTES.slice(0, 3).map((p) => (
          <div className="scp-row" key={p.id}>
            {p.colors.map((c, i) => <span className="scp-chip" key={i} style={{ background: c }} />)}
          </div>
        ))}
      </div>
    ),
  }),
  'gradient-gallery': () => ({
    meta: `${GALLERY_GRADIENTS.length} gradients`,
    node: (
      <div className="scp-tiles">
        {GALLERY_GRADIENTS.slice(0, 3).map((g) => (
          <span className="scp-tile" key={g.id} style={{ backgroundImage: gradientCss(g.type, g.angle, g.stops) }} />
        ))}
      </div>
    ),
  }),
  // A specimen BLOCK — display line, reading line, mono line — rather than
  // three faces side by side.
  //
  // The first attempt set three "Ag"s in var(--display), var(--font) and
  // var(--mono), and two of them rendered identically: `--display` in this
  // project resolves to 'Manrope', the same value as `--font`. It is a
  // misnamed token, not a serif. A Font Gallery card whose whole claim is
  // "type variety" showing the same face twice is the kind of preview that is
  // decorative and false, so this shows the two families that ARE installed
  // doing the three jobs type actually does. Nothing here can fall back
  // silently to a system face and pass itself off as the catalogue.
  'font-gallery': () => ({
    meta: 'Live specimens',
    node: (
      <div className="scp-type" aria-hidden="true">
        <span className="scp-type-display">Ag</span>
        <span className="scp-type-body">The quick brown fox</span>
        <span className="scp-type-mono">abcdefgh 0123456</span>
      </div>
    ),
  }),
  'icon-library': () => ({
    meta: '200,000+ icons',
    node: (
      <div className="scp-icons" aria-hidden="true">
        {['palette', 'type', 'icons', 'imagery', 'ai', 'community-prompts'].map((id) => (
          <span className="scp-icon" key={id}><NavIcon id={id} /></span>
        ))}
      </div>
    ),
  }),
  'community-prompts': () => ({
    meta: `${COMMUNITY_PROMPTS.length} prompts`,
    node: (
      <div className="scp-lines" aria-hidden="true">
        {COMMUNITY_PROMPTS.slice(0, 3).map((p, i) => (
          <span className="scp-line" key={p.id || i}>{p.title || p.name || p.label}</span>
        ))}
      </div>
    ),
  }),
}

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
    secondaryTo: '/create/font-gallery',
    hint: 'Four curated libraries are ready now — palettes, gradients, fonts and icons.',
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
    primaryTo: '/create/color',
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
      {/* ── Hero ──
          `home-hero` alone carries min-height:min(100svh,980px), which the
          HOMEPAGE earns: it holds a search field, eleven satellites and the
          workbench. This hero holds an eyebrow, a heading, a line of lede, two
          buttons and a hint — measured at 1440x900 its content ended at 499px
          inside a 900px box, so 401px of the first screen of /discover was
          nothing at all. The modifier lets it be as tall as it is. */}
      <header className="home-hero home-hero--surface">
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
              // Live libraries lead with what is inside them; the ones still on
              // the way stay a plain card, which is the honest difference and
              // also the thing that stops eight identical rectangles.
              const preview = !g.soon && PREVIEWS[g.id] ? PREVIEWS[g.id]() : null
              const body = (
                <>
                  {preview && (
                    <span className="surface-card-preview" aria-hidden="true">{preview.node}</span>
                  )}
                  <h3 className="surface-card-title">
                    <span className="fx-dot" aria-hidden="true" />
                    {g.label}
                  </h3>
                  <p className="surface-card-desc">{g.desc}</p>
                  {/* The meta sits beside the call to action rather than over
                      the preview: these previews are dense (three palettes,
                      three prompt titles), so a badge laid on top of them
                      covered the very thing it was counting. */}
                  <span className="surface-card-foot">
                    {g.soon
                      ? <span className="soon-badge">Soon</span>
                      : <span className="surface-card-go">Browse&nbsp;&rarr;</span>}
                    {preview && <span className="surface-card-meta">{preview.meta}</span>}
                  </span>
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
        primaryTo="/create/color"
        secondaryLabel="Back to home"
        secondaryTo="/home"
      />
      </main>
    </div>
  )
}
