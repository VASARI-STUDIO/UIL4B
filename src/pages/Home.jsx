import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import CreatePreview from '../components/CreatePreview'
import { useHomeMotion } from '../hooks/useHomeMotion'
import { CREATE_GROUPS } from '../data/toolTree'

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

// Export section content. The format names + descriptions are kept verbatim in
// sync with `ExportPanel`'s FORMATS so the homepage never promises a format the
// real dialog doesn't list. The file names are a decorative faux-output stack.
const EXPORT_FORMATS = [
  { name: 'HTML design system', desc: 'A full page — tokens, components and styles as ready-to-ship HTML + CSS.' },
  { name: 'CSS tokens', desc: 'Custom properties for colour, type, spacing and radii — drop into any stylesheet.' },
  { name: 'JSON tokens', desc: 'Design tokens as JSON for pipelines and Style Dictionary.' },
  { name: 'Tailwind theme', desc: 'A tailwind.config theme extension mapped to your system.' },
  { name: 'Asset bundle', desc: 'Icons and swatches exported together as SVG + PNG.' },
]
const EXPORT_FILES = ['system.html', 'tokens.css', 'tokens.json', 'tailwind.config.js', 'assets.zip']

export default function Home() {
  const rootRef = useRef(null)
  useHomeMotion(rootRef)
  const [active, setActive] = useState(CREATE_GROUPS[0].id)
  const [exportOpen, setExportOpen] = useState(false)
  const activeGroup = CREATE_GROUPS.find((g) => g.id === active) || CREATE_GROUPS[0]

  // Sliding indicator for the Create segmented control. We position a single
  // "thumb" over whichever tab is active by measuring geometry and writing the
  // element's style imperatively (via refs) — never React state — so we keep
  // clear of the `set-state-in-effect` advisory and get a buttery CSS-eased
  // slide. Measured from bounding rects so it stays exact regardless of the
  // reveal transform or varying label widths.
  const segRef = useRef(null)
  const thumbRef = useRef(null)
  const moveThumb = useCallback(() => {
    const seg = segRef.current
    const thumb = thumbRef.current
    if (!seg || !thumb) return
    const btn = seg.querySelector('[data-active="true"]')
    if (!btn) return
    const s = seg.getBoundingClientRect()
    const b = btn.getBoundingClientRect()
    thumb.style.width = `${b.width}px`
    thumb.style.height = `${b.height}px`
    thumb.style.transform = `translate(${b.left - s.left}px, ${b.top - s.top}px)`
    thumb.style.opacity = '1'
  }, [])

  // Reposition on active change (layout effect = no flash) and on resize / font
  // settle (rAF catches width shifts after the webfont swaps in).
  useLayoutEffect(() => { moveThumb() }, [active, moveThumb])
  useEffect(() => {
    const onResize = () => moveThumb()
    window.addEventListener('resize', onResize)
    const raf = requestAnimationFrame(moveThumb)
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf) }
  }, [moveThumb])

  return (
    <div className="home" ref={rootRef}>
      <PillNav />

      {/* ── Hero ── */}
      <header className="home-hero" id="main" tabIndex={-1}>
        <h1 className="home-hero-h1">
          <span className="home-hero-line"><span className="home-hero-line-in">No more tab hoarding.</span></span>
          <span className="home-hero-line"><span className="home-hero-line-in">Every design tool, one workspace.</span></span>
        </h1>
        <p className="home-hero-sub">
          Colour, type, components and icons — built, checked and exported from one
          place instead of seventeen tabs.
        </p>
        <div className="home-hero-cta">
          <Link className="ui-pill ui-pill-ink ui-pill-lg" to="/login">
            Start for Free
            <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
          </Link>
          <Link className="ui-pill ui-pill-out ui-pill-lg" to="/plans">
            See our plans
          </Link>
        </div>
        <p className="home-hero-hint">Free to start · No credit card · Runs in your browser</p>
      </header>

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

          <div className="home-seg-wrap" data-reveal>
            <div className="home-seg" role="tablist" aria-label="Create systems" ref={segRef}>
              <span className="home-seg-thumb" aria-hidden="true" ref={thumbRef} />
              {CREATE_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={active === group.id}
                  data-active={active === group.id}
                  className="home-seg-tab"
                  data-hue={group.hue}
                  onClick={() => setActive(group.id)}
                >
                  <span className="fx-dot" aria-hidden="true" />
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          <div className="home-stage" data-reveal="media" aria-live="polite">
            <CreatePreview group={activeGroup} />
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

          <div className="home-surfaces" data-reveal-group>
            {SURFACES.map((s) => (
              <article className="home-surface fx-lift" key={s.id} data-hue={s.hue}>
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
            <div className="home-split-media" data-reveal="media">
              <div className="spec-frame">
                <span className="spec-label">Contrast · report</span>
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
            <h2 className="home-h2">Export the whole system, not just the swatches.</h2>
            <p className="home-lede">
              Everything you build leaves as clean, framework-ready code — tokens, components and
              assets, in the format your stack already speaks.
            </p>
          </div>
          <div className="home-export">
            <ul className="home-export-list" data-reveal-group>
              {EXPORT_FORMATS.map((f, i) => (
                <li className={i === 0 ? 'home-export-row is-primary' : 'home-export-row'} key={f.name}>
                  <span className="home-export-name">{f.name}</span>
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
            <Link className="ui-pill ui-pill-ink ui-pill-lg" to="/login">
              Start for Free
              <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
            </Link>
            <Link className="ui-pill ui-pill-out ui-pill-lg" to="/plans">
              See our plans
            </Link>
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
              <Link className="home-foot-link" to="/login">Start for Free</Link>
            </div>
          </div>

          <div className="home-foot-legal">
            <div className="home-foot-brand">
              <span className="pnav-word">UIL4B</span>
            </div>
            <p className="home-foot-copy">© {new Date().getFullYear()} UIL4B · Build UI systems, faster.</p>
          </div>
        </div>
      </footer>

      {exportOpen && (
        <Suspense fallback={null}>
          <ExportPanel onClose={() => setExportOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
