import { NavLink } from 'react-router-dom'
import { CREATE_GROUPS, DISCOVER_GROUPS, LEARN_ROADMAP } from '../data/toolTree'
import { LEARN_ARTICLES } from '../data/learnIndex'

// The full visual site map — a single page that lays out every destination in
// UIL4B so a visitor (or the founder) can see the whole product at a glance.
//
// The three build surfaces come straight from the tool tree (CREATE_GROUPS +
// the Discover / Learn group lists), so this map can never drift from the nav
// or the router. The account / help / legal areas aren't in the tree — those
// live only in App's route table — so they're described here directly, kept in
// step by hand. Each Create category carries its `data-hue`, matching the
// mega-menu and the in-tool shell, and unfinished tools wear the same "Soon"
// badge as the nav so the map tells the truth about what's live today.

// Non-tool destinations, grouped the way a visitor thinks about them rather
// than the way the router lists them. Kept in sync with App.jsx by hand.
const FLAT_SECTIONS = [
  {
    // `id` is the section anchor and stays as it is — it is a URL, not copy.
    id: 'workspace',
    label: 'Your account',
    desc: 'Where your work and account live.',
    links: [
      { label: 'Home', route: '/home', note: 'The overview and starting point.' },
      { label: 'Projects', route: '/projects', note: 'Saved palettes, fonts and exports.' },
      { label: 'Settings', route: '/settings', note: 'Theme, appearance, account and data.' },
      { label: 'Plans & pricing', route: '/plans', note: 'Compare Free and Pro.' },
      { label: 'Sign in', route: '/login', note: 'Log in or create an account.' },
    ],
  },
  {
    id: 'help',
    label: 'Help & community',
    desc: 'Learn the tools and get unstuck.',
    links: [
      { label: 'Help & Getting Started', route: '/help', note: 'What each tool opens with, and what the free plan covers.' },
      { label: 'Design Principles', route: '/principles', note: 'The rules the tools enforce, with the measurements beside them.' },
      { label: 'Information Centre', route: '/info', note: 'Every tool, shortcuts and a screen inspector.' },
      { label: 'SEO Inspector', route: '/seo', note: 'Live SERP preview and an instant SEO score.' },
      { label: 'Community', route: '/community', note: 'Share designs and find inspiration.' },
      { label: 'Feedback', route: '/feedback', note: 'Report a bug or request a feature.' },
    ],
  },
  {
    id: 'legal',
    label: 'Legal',
    desc: 'The fine print, in plain English.',
    links: [
      { label: 'Privacy', route: '/privacy', note: 'What we store and how we handle data.' },
      { label: 'Terms', route: '/terms', note: 'Usage rules and account policies.' },
    ],
  },
]

// Live destinations are links. Staged destinations keep their route and context
// visible, but are deliberately non-interactive so "Soon" never behaves like a
// shipped action.
function MapLink({ label, route, note, soon }) {
  const content = (
    <>
      <span className="smap-link-label">
        {label}
        {soon && <span className="smap-soon">Soon</span>}
      </span>
      <span className="smap-link-route">{route}</span>
      {note && <span className="smap-link-note">{note}</span>}
    </>
  )

  return (
    <li className="smap-link" data-route={route} data-soon={soon ? 'true' : undefined}>
      {soon ? (
        <div className="smap-link-a smap-link-a--soon">{content}</div>
      ) : (
        <NavLink to={route} className="smap-link-a">{content}</NavLink>
      )}
    </li>
  )
}

export default function SiteMap() {
  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Sitemap</div>
        <h1>The whole <em>map</em>.</h1>
        <p>
          Every page in UIL4B, laid out end to end. Categories still in the workshop
          keep a <span className="smap-soon smap-soon--inline">Soon</span> badge, so
          the map only ever promises what&rsquo;s actually live.
        </p>
      </div>

      {/* ── Create: the build surface, straight from the tool tree ── */}
      <section className="smap-surface" aria-labelledby="smap-create">
        <div className="smap-surface-h">
          <h2 id="smap-create">Create</h2>
          <p>Build colour, type, components, icons, media and AI systems.</p>
        </div>
        <div className="smap-grid">
          {CREATE_GROUPS.map((group) => (
            <div key={group.id} className="smap-cat" data-hue={group.hue}>
              <div className="smap-cat-h">
                <span className="smap-cat-dot" aria-hidden="true" />
                <h3>{group.label}</h3>
                {group.soon && <span className="smap-soon">Soon</span>}
              </div>
              <p className="smap-cat-desc">{group.desc}</p>
              <ul className="smap-links">
                {group.tools.map((tool) => (
                  <MapLink
                    key={tool.id}
                    label={tool.label}
                    route={tool.route}
                    soon={group.soon || tool.soon}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Discover + Learn: browse and understand ── */}
      <section className="smap-surface" aria-labelledby="smap-browse">
        <div className="smap-surface-h">
          <h2 id="smap-browse">Discover &amp; Learn</h2>
          <p>Browse curated inspiration, then dig into the why behind it.</p>
        </div>
        <div className="smap-grid smap-grid--two">
          <div className="smap-cat" data-hue="accent" data-sitemap-section="discover">
            <div className="smap-cat-h">
              <span className="smap-cat-dot" aria-hidden="true" />
              <h3>Discover</h3>
              <span className="smap-stage">
                {DISCOVER_GROUPS.filter((group) => !group.soon).length} live &middot; more coming
              </span>
            </div>
            <p className="smap-cat-desc">Community systems, fonts, prompts and curated resources.</p>
            <ul className="smap-links">
              {DISCOVER_GROUPS.map((g) => (
                <MapLink key={g.id} label={g.label} route={g.route} note={g.desc} soon={g.soon} />
              ))}
            </ul>
          </div>
          {/* Learn carried a category-level "Soon" badge over eight rows that
              all pointed at /learn. The live guides go first with their own
              URLs; the topic roadmap keeps its per-row Soon badges below them,
              so the map states what exists and what does not in one column.

              LEARN_ROADMAP rather than LEARN_GROUPS: a delivered row carries
              the SAME route as the guide that delivered it, so listing both
              would put two .smap-link rows on one data-route — a duplicate for
              the reader and a strict-mode ambiguity for the spec that walks
              this column by route. */}
          <div className="smap-cat" data-hue="accent" data-sitemap-section="learn">
            <div className="smap-cat-h">
              <span className="smap-cat-dot" aria-hidden="true" />
              <h3>Learn</h3>
            </div>
            <p className="smap-cat-desc">Reference guides on colour, type and accessibility, plus the topics still to be written.</p>
            <ul className="smap-links">
              {LEARN_ARTICLES.map((a) => (
                <MapLink key={a.slug} label={a.title} route={`/learn/${a.slug}`} note={a.dek} />
              ))}
              <MapLink label="Learn" route="/learn" note="The section landing, and what is on the way." />
              {LEARN_ROADMAP.map((g) => (
                <MapLink key={g.id} label={g.label} route={g.route} note={g.desc} soon={g.soon} />
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Account, help and legal — hand-kept, not in the tool tree ── */}
      <section className="smap-surface" aria-labelledby="smap-account">
        <div className="smap-surface-h">
          <h2 id="smap-account">Account &amp; more</h2>
          <p>Your account, support and the fine print.</p>
        </div>
        <div className="smap-grid">
          {FLAT_SECTIONS.map((section) => (
            <div key={section.id} className="smap-cat">
              <div className="smap-cat-h">
                <span className="smap-cat-dot" aria-hidden="true" />
                <h3>{section.label}</h3>
              </div>
              <p className="smap-cat-desc">{section.desc}</p>
              <ul className="smap-links">
                {section.links.map((link) => (
                  <MapLink key={link.route} {...link} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
