import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import HomeWorkbench from '../components/HomeWorkbench'
import HomeCommandBar from '../components/HomeCommandBar'
import NavIcon from '../components/NavIcon'
import SystemCTA from '../components/SystemCTA'
import { useHomeMotion } from '../hooks/useHomeMotion'
import { CREATE_GROUPS, HOME_SATELLITES, HOME_WORKBENCH_TABS } from '../data/toolTree'
import { COMMUNITY_DESIGNS } from '../data/communityDesigns'

// ── The V2 homepage ──────────────────────────────────────────────────────────
//
// A sales page built around the real product, in the order the visitor's
// questions arrive: what is this (hero + command bar) → show me it working
// (sticky scroll over the live workbench) → what else is in it (tools grid) →
// who else uses it (community) → what does it cost (pricing) → start.
//
// Three things the founder asked to keep, and this page keeps all three:
//   · PillNav is the navigation system, untouched;
//   · HomeWorkbench IS the demo — the sticky panel re-houses the real
//     component, not a re-implementation of it;
//   · useHomeMotion() owns motion — Lenis smooth scroll, the CSS hero
//     entrance, scroll reveals and the sticky step sync, all reduced-motion
//     guarded.
//
// The command bar searches the real tool registry through the same
// `queryCommandIndex` the ⌘K palette uses. There is no second index.

/* ── Hero stat line — every number derived, none invented ─────────────────── */

// Counted from the tool tree at module load, so the claim can never drift from
// the product. The mock's "40+ TOOLS" was invented; this is what is live.
const LIVE_TOOL_COUNT = CREATE_GROUPS
  .flatMap((g) => g.tools)
  .filter((t) => !t.soon).length

// 200k icons: the Iconify catalogue behind /icons, already claimed in
// toolTree.js and in the workbench's Icon panel.
// 1,500+ fonts: the Google Fonts catalogue behind /fontgallery, as described in
// discoverResources.js. Both are the real libraries the tools read.
const HERO_STATS = [
  `${LIVE_TOOL_COUNT} LIVE TOOLS`,
  '200K ICONS',
  '1,500+ FONTS',
  'ONE ACCOUNT',
]

/* ── The sticky scroll narrative ──────────────────────────────────────────── */

// One step per workbench mode, in tab order — the left column narrates, the
// right column IS that mode of the real workbench. `tab` is the binding.
const STEPS = [
  {
    tab: 'palette',
    num: '01',
    kicker: 'COLOUR',
    title: 'Start with a palette you can defend.',
    body: 'Generate a five-step ramp, lock the colours that are already right, and regenerate the rest. Every value is a real hex you can copy straight out.',
    points: ['Lock and regenerate individual steps', 'Copy any value to the clipboard', 'Carries into the full builder on the free Auto system'],
    cta: { label: 'Open Palette Builder', to: '/color/palette' },
  },
  {
    tab: 'gradient',
    num: '02',
    kicker: 'GRADIENT',
    title: 'Tune a gradient and take the CSS.',
    body: 'Two stops and an angle, previewed live. A half-typed hex never destroys the preview — the field tells you what to correct and keeps the last valid value.',
    points: ['Live preview from real CSS', 'Invalid input explains itself', 'Copy the declaration, not a screenshot'],
    cta: { label: 'Open Gradient Generator', to: '/color/gradient' },
  },
  {
    tab: 'image',
    num: '03',
    kicker: 'IMAGERY',
    title: 'Decide the output before you convert.',
    body: 'Set resolution, file type and compression against a reference image, then hand your own files to the converter with that draft already applied.',
    points: ['Honest limits — WebP cannot store lossless, and says so', 'Nothing is encoded here; File Converter does the work', 'Your files never touch storage or the URL'],
    cta: { label: 'Open File Converter', to: '/file-converter' },
  },
  {
    tab: 'icon',
    num: '04',
    kicker: 'ICONS',
    title: 'Size and weight an icon before you commit.',
    body: 'Twelve bundled glyphs, three sizes, four stroke widths — a free taste of the editor. Nothing saves, downloads or counts against a plan.',
    points: ['No catalogue call — the preview is local', 'Opens your draft in the real editor', '200k icons once you are there'],
    cta: { label: 'Open Icon Library', to: '/icons' },
  },
  {
    tab: 'typography',
    num: '05',
    kicker: 'TYPE',
    title: 'Build a scale that actually computes.',
    body: 'Real modular-scale maths from your base size and ratio, previewed at every step, then carried into the full Type Scale generator.',
    points: ['Display, heading, body and caption computed live', 'Edit the specimen text', 'Family choices survive the hand-off'],
    cta: { label: 'Open Type Scale', to: '/typescale' },
  },
]

/* ── Pricing ──────────────────────────────────────────────────────────────────
 *
 * ⚠️ DISPLAY VALUES ONLY — NOT WIRED TO STRIPE.
 *
 * These are the founder-approved marketing ladder recorded in
 * docs/reference/design-language-v2.md ("Deviations from the mock", 2026-08-16):
 * monthly $7 · quarterly $18 ($6/mo) · yearly $48 ($4/mo), headline "from
 * $4/month".
 *
 * The live price service (`useProPrice` / `api/_lib/pricing.js`) knows only
 * MONTHLY and YEARLY — there is no quarterly price object — and its amounts are
 * whatever Stripe currently returns, which is not guaranteed to be this ladder.
 * Reading half the panel from the service and hard-coding the other half would
 * put two different numbers for the same plan on one page.
 *
 * So this panel is marketing copy: it names the ladder, links to /plans, and
 * /plans remains the only surface that quotes a live, currency-correct,
 * checkout-backed price. Pricing, Stripe and plan files are founder-gated and
 * owned by a separate workstream — nothing here touches them.
 *
 * TO WIRE LATER: add a quarterly price to the price service, then replace
 * PRICE_LADDER with useProPrice() output and delete this comment.
 */
const PRICE_LADDER = [
  { id: 'monthly', cadence: 'Monthly', perMonth: '$7', total: '$7 billed monthly', note: 'Cancel any time' },
  { id: 'quarterly', cadence: 'Quarterly', perMonth: '$6', total: '$18 billed every 3 months', note: 'Save $3 a quarter' },
  { id: 'yearly', cadence: 'Yearly', perMonth: '$4', total: '$48 billed yearly', note: 'Best value · 7-day free trial', best: true },
]

const PRO_INCLUDES = [
  'Every colour, type, icon and image tool',
  'Saved projects and full system exports',
  'Higher AI generation limits',
  'Community submissions and the full prompt library',
]

/* ── Community ────────────────────────────────────────────────────────────────
 * The seam for the community rebuild. `COMMUNITY_DESIGNS` is today's source —
 * curated platform links with REAL save counts, which start at zero. There are
 * no trending or recency signals in it yet, so `orderDesigns` returns the seed
 * order for those two modes and the strip says so rather than inventing a rank.
 * When the community backend lands, this function is the single place that
 * changes.
 */
const COMMUNITY_TABS = [
  { id: 'trending', label: 'Trending' },
  { id: 'newest', label: 'Newest' },
  { id: 'saved', label: 'Most saved' },
]

function orderDesigns(items, mode) {
  if (mode === 'saved') return [...items].sort((a, b) => (b.saves || 0) - (a.saves || 0))
  if (mode === 'newest') return [...items].slice().reverse()
  return items
}

// True only for `saved`, which sorts on a real field. The other two have no
// signal in today's data and must not pretend otherwise.
const RANK_IS_REAL = { trending: false, newest: false, saved: true }

/* ── Tool → workbench-mode relationship ──────────────────────────────────────
 * The old hero carried this with `aria-describedby` on each of eleven satellite
 * links. The satellites are gone, but the RELATIONSHIP is not — a screen-reader
 * user still needs to hear which workbench mode a tool resolves into, so the
 * same descriptions move onto the tools grid.
 */
const FAMILY_BY_ROUTE = Object.fromEntries(HOME_SATELLITES.map((s) => [s.route, s.family]))

export default function Home() {
  const rootRef = useRef(null)
  const [mode, setMode] = useState(HOME_WORKBENCH_TABS[0].id)
  // Once the visitor drives the tablist themselves, scroll stops overriding
  // them. Nothing is more irritating than a control that keeps changing back.
  const pinnedRef = useRef(false)
  const [community, setCommunity] = useState('trending')

  const onStepChange = useCallback((tab) => {
    if (pinnedRef.current) return
    setMode(tab)
  }, [])

  const onTabChange = useCallback((tab) => {
    pinnedRef.current = true
    setMode(tab)
  }, [])

  useHomeMotion(rootRef, { onStepChange })

  const designs = useMemo(
    () => orderDesigns(COMMUNITY_DESIGNS, community).slice(0, 6),
    [community],
  )

  const activeStep = STEPS.findIndex((s) => s.tab === mode)

  return (
    <div className="home" ref={rootRef}>
      <PillNav />

      <main id="main" tabIndex={-1}>
        {/* ── Hero ──
            Reading order is the argument: what is live (stats), the promise
            (headline), the qualifier (sub), the way in (command bar), the two
            actions, the honest terms. Nothing here waits on GSAP — the
            entrance is CSS keyframes and the command bar is plain React. */}
        <header className="home-hero">
          <div className="home-hero-core">
            <p className="home-hero-stats">
              {HERO_STATS.map((stat, i) => (
                <span className="home-hero-stat" key={stat}>
                  {i > 0 && <span className="home-hero-stat-sep" aria-hidden="true">·</span>}
                  {stat}
                </span>
              ))}
            </p>

            {/* The headline and the command bar below it are ONE idea: the
                highlighted phrase IS the input sitting directly beneath it, so
                the hero explains itself and the --hi mark has a referent on
                screen. Copy is the design project's, verbatim. */}
            <h1 className="home-hero-h1">
              <span className="home-hero-line"><span className="home-hero-line-in">Every design tool,</span></span>
              <span className="home-hero-line"><span className="home-hero-line-in">
                one <mark className="home-mark">search box</mark> away.
              </span></span>
            </h1>

            <p className="home-hero-sub">
              Stop hunting through twelve bookmarked tabs. Type what you need — colour, type,
              icons, tokens — and start working. Nothing to install.
            </p>

            <HomeCommandBar />

            <div className="home-hero-cta">
              {/* ?signup=1 so the popup opens on the sign-up form. A real
                  <Link> rather than a button, so it stays middle-clickable —
                  which is why the intent travels in the URL, not in a prop. */}
              <Link className="ui-pill ui-pill-accent ui-pill-lg" to="/login?signup=1">
                Start building free
                <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
              </Link>
              <a className="ui-pill ui-pill-quiet ui-pill-lg" href="#workbench">See it working</a>
            </div>

            <p className="home-hero-hint">No credit card · No setup · Your first system stays free</p>
          </div>
        </header>

        {/* ── The working half: five steps, one live workbench ──
            The left column narrates; the right column is the REAL
            HomeWorkbench, sticky, swapping mode as the steps pass. The
            tablist inside it stays the authoritative control — scroll is an
            enhancement, and touching a tab pins it. */}
        <section className="hsteps" id="workbench" aria-labelledby="hsteps-title">
          <div className="home-container">
            <div className="hsteps-head" data-reveal>
              <span className="hbrow">[ CREATE ]</span>
              <h2 className="hh2" id="hsteps-title">
                Not a screenshot. The actual tools, running here.
              </h2>
              <p className="hlede">
                Everything below is live: real generated values, real keyboard handling, real
                clipboard. Nothing saves, nothing needs an account, and every panel names where
                it hands off before you press it.
              </p>
            </div>

            <div className="hsteps-grid">
              <ol className="hsteps-rail">
                {STEPS.map((step, index) => (
                  <li
                    className="hstep"
                    key={step.tab}
                    data-step={step.tab}
                    data-active={index === activeStep}
                  >
                    <p className="hstep-num">
                      <span>{step.num}</span>
                      <span className="hstep-num-sep" aria-hidden="true">/</span>
                      <span>{step.kicker}</span>
                    </p>
                    <h3 className="hstep-title">{step.title}</h3>
                    <p className="hstep-body">{step.body}</p>
                    <ul className="hstep-points">
                      {step.points.map((point) => (
                        <li key={point}>
                          <svg className="hstep-tick" viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                            <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {point}
                        </li>
                      ))}
                    </ul>
                    <Link className="hstep-cta" to={step.cta.to}>
                      {step.cta.label}
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </li>
                ))}
              </ol>

              <div className="hsteps-sticky">
                <HomeWorkbench variant="sticky" activeTab={mode} onTabChange={onTabChange} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Tools grid ──
            Six categories, and every tool route the product has — a superset
            of the eleven links the old hero exposed, so nothing is orphaned.
            Unbuilt tools carry the same Soon badge the nav uses rather than
            being hidden or claimed as live. */}
        <section className="htools" aria-labelledby="htools-title">
          <div className="home-container">
            <div className="htools-head" data-reveal>
              <span className="hbrow">[ THE TOOLSET ]</span>
              <h2 className="hh2" id="htools-title">Six categories. One account.</h2>
              {/* Canonical founder direction (uil4b-brand-design →
                  surface-principles.md): component tooling must be NAMED as
                  coming next, and must never appear as a live preview mode. It
                  used to ride in the hero sub-copy; the V2 hero is about search,
                  so the claim moves here — beside the card that carries the Soon
                  badge, which is where it is actually useful. */}
              <p className="hlede">
                Every tool reads and writes the same system, so a colour decision in one place
                is the same colour decision everywhere else. Component tooling is coming next.
              </p>
            </div>

            <ul className="htools-grid" data-reveal-group>
              {CREATE_GROUPS.map((group) => (
                <li className="htool" key={group.id} data-hue={group.hue}>
                  <Link className="htool-head" to={group.home}>
                    <span className="htool-glyph" aria-hidden="true">
                      <NavIcon id={group.id} />
                    </span>
                    <h3 className="htool-title">{group.label}</h3>
                    {group.soon && <em className="htool-soon">Soon</em>}
                  </Link>
                  <p className="htool-desc">{group.desc}</p>
                  <ul className="htool-links">
                    {group.tools.map((tool) => {
                      const family = FAMILY_BY_ROUTE[tool.route]
                      return (
                        <li key={tool.id}>
                          <Link
                            className="htool-link"
                            to={tool.route}
                            data-tool={tool.id}
                            aria-describedby={family ? `htool-fam-${family}` : undefined}
                          >
                            {tool.label}
                            {tool.soon && <em className="htool-soon">Soon</em>}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                  <span className="htool-open" aria-hidden="true">open &rarr;</span>
                </li>
              ))}
            </ul>

            {/* One description per workbench mode, referenced by every tool that
                resolves into it. Assistive technology hears the same
                many-tools-into-five-modes relationship the old satellite field
                carried; the destination of every link is unchanged. */}
            <div className="sr-only">
              {HOME_WORKBENCH_TABS.map((tab) => (
                <span id={`htool-fam-${tab.id}`} key={tab.id}>
                  Also available as the {tab.label} mode of the live workbench above.
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Community ── */}
        <section className="hcomm" aria-labelledby="hcomm-title">
          <div className="home-container">
            <div className="hcomm-head" data-reveal>
              <div>
                <span className="hbrow">[ COMMUNITY ]</span>
                <h2 className="hh2" id="hcomm-title">Systems worth stealing.</h2>
              </div>
              <div className="hcomm-tabs" role="tablist" aria-label="Community ordering">
                {COMMUNITY_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    className="hcomm-tab"
                    aria-selected={tab.id === community}
                    tabIndex={tab.id === community ? 0 : -1}
                    onClick={() => setCommunity(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Honest about what the ordering can and cannot do yet. */}
            <p className="hcomm-note">
              {RANK_IS_REAL[community]
                ? 'Ordered by real saves. Counts start at zero — nothing here is inflated.'
                : 'Ranking arrives with member submissions. Until then these are curated starting points, in a fixed order.'}
            </p>

            <ul className="hcomm-grid" data-reveal-group>
              {designs.map((design) => (
                <li className="hcomm-card" key={design.id}>
                  <a
                    className="hcomm-card-link"
                    href={design.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    <span
                      className="hcomm-card-art"
                      aria-hidden="true"
                      ref={(node) => {
                        // Generated gradient thumbnails — no external assets, no
                        // Storage dependency, renders offline. The two stops are
                        // data, so they arrive as custom properties rather than
                        // as an inline background declaration.
                        if (!node) return
                        node.style.setProperty('--hcomm-c1', design.c1)
                        node.style.setProperty('--hcomm-c2', design.c2)
                      }}
                    />
                    <span className="hcomm-card-body">
                      <span className="hcomm-card-name">{design.name}</span>
                      <span className="hcomm-card-meta">
                        <span className="hcomm-card-source">{design.source}</span>
                        <span className="hcomm-card-cat">{design.category}</span>
                      </span>
                    </span>
                    <span className="hcomm-card-foot">
                      <span className="hcomm-card-saves">{design.saves} saves</span>
                      {design.curated && <span className="hcomm-card-tag">Curated</span>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="hcomm-cta">
              <Link className="ui-pill ui-pill-quiet ui-pill-md" to="/discover">
                Explore Discover
                <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Pricing — the inverted panel, the strongest emphasis in the
            system, used exactly once. Display values only; /plans quotes the
            live, currency-correct price. See PRICE_LADDER above. ── */}
        <section className="hprice" aria-labelledby="hprice-title">
          <div className="home-container">
            <div className="hprice-panel" data-reveal>
              <div className="hprice-lead">
                <span className="hbrow hprice-eyebrow">[ PRICING ]</span>
                <h2 className="hh2 hprice-title" id="hprice-title">
                  Pro from <span className="hprice-hi">$4/month</span>.
                </h2>
                <p className="hprice-lede">
                  Free covers the complete core toolkit with no card and no trial clock. Pro
                  raises the AI limits and unlocks saved projects, exports and submissions.
                </p>
                <ul className="hprice-includes">
                  {PRO_INCLUDES.map((item) => (
                    <li key={item}>
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                        <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hprice-ladder">
                <ul className="hprice-rows">
                  {PRICE_LADDER.map((row) => (
                    <li className="hprice-row" key={row.id} data-best={row.best || undefined}>
                      <span className="hprice-cadence">{row.cadence}</span>
                      <span className="hprice-amount">
                        <strong>{row.perMonth}</strong>
                        <span className="hprice-per">/month</span>
                      </span>
                      <span className="hprice-total">{row.total}</span>
                      <span className="hprice-note">{row.note}</span>
                    </li>
                  ))}
                </ul>
                <Link className="ui-pill ui-pill-hi ui-pill-lg hprice-cta" to="/plans">
                  See plans and start free
                  <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
                </Link>
                <p className="hprice-fine">
                  Prices shown in USD. Your local currency and the exact amount are confirmed on
                  the plans page and again at checkout.
                </p>
              </div>
            </div>
          </div>
        </section>

        <SystemCTA
          title="From first decision to clean handoff."
          description="Build a coherent UI system in one place, then take it straight into production."
          secondaryLabel="See our plans"
          secondaryTo="/plans"
          hint="No credit card · Upgrade only when you're ready"
        />
      </main>
    </div>
  )
}
