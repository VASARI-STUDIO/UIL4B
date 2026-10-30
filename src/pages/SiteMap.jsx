import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import SpectrumWords from '../components/spectrum/SpectrumWords'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import ToolArt from '../components/spectrum/ToolArt'
import NavIcon from '../components/NavIcon'
import PhIcon from '../components/spectrum/PhIcon'
import { prefersReducedMotion } from '../components/spectrum/reducedMotion'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { CREATE_GROUPS, DISCOVER_GROUPS, LEARN_ROADMAP, listedTools } from '../data/toolTree'
import { CREATE_TOOL_SEARCH } from '../data/toolIndex'
import { LEARN_ARTICLES } from '../data/learnIndex'
import '../styles/pages/spectrum-mobile.css'
import '../styles/pages/spectrum-tools.css'
// This page's own rules, imported last so they follow the /tools sheet they build on.
import '../styles/pages/sitemap.css'

// The full visual site map: every destination in UIL4B on one page, in the /tools
// page's visual language (Spectrum nav and footer, hue-tile group rails, rows with
// a drawn thumbnail).
//
// The three build surfaces come straight from the tool tree (CREATE_GROUPS and
// the Discover / Learn group lists), so this map can never drift from the nav or
// the router. The account / help / legal areas aren't in the tree: they live only
// in App's route table, so they're described here directly, kept in step by hand.
// Unfinished pages are listed, badged and not linked, for admins only.

// Non-tool destinations, grouped the way a visitor thinks about them rather
// than the way the router lists them. Kept in sync with App.jsx by hand.
const FLAT_SECTIONS = [
  {
    // `id` is the section anchor and stays as it is: it is a URL, not copy.
    id: 'workspace',
    icon: 'user',
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
    icon: 'help',
    label: 'Help & community',
    desc: 'Learn the tools and get unstuck.',
    links: [
      { label: 'Help & Getting Started', route: '/learn/help', note: 'What each tool opens with, and what the free plan covers.' },
      { label: 'Design Principles', route: '/learn/principles', note: 'The rules the tools enforce, with the measurements beside them.' },
      { label: 'Information Centre', route: '/info', note: 'Every tool, shortcuts and a screen inspector.' },
      { label: 'SEO Inspector', route: '/seo', note: 'Live SERP preview and an instant SEO score.' },
      { label: 'Community', route: '/community', note: 'Share designs and find inspiration.' },
      { label: 'Feedback', route: '/feedback', note: 'Report a bug or request a feature.' },
    ],
  },
  {
    id: 'legal',
    icon: 'legal',
    label: 'Legal',
    desc: 'The fine print, in plain English.',
    links: [
      { label: 'Privacy', route: '/privacy', note: 'What we store and how we handle data.' },
      { label: 'Terms', route: '/terms', note: 'Usage rules and account policies.' },
      // CREDITS IS A LIVE ROUTE AND CARRIES NO `soon`. It is in routeMetaMap,
      // sitemap.xml, vercel.json, llms.txt and both footers. Several of the packs
      // and faces it names legally require visible attribution, so a map that
      // promises "every page in UIL4B" must list it. The note is the first clause
      // of the route's own meta description in `src/data/routeMetaMap.js`.
      { label: 'Credits', route: '/credits', note: 'Every icon set, typeface and package UI L4B is built on, with its licence.' },
    ],
  },
]

// A route as segments that each end on a slash ("/create/semantic-color" becomes
// "/create/" and "semantic-color"; the leading slash stays with the first word).
const routeSegments = (route) => route.match(/\/?[^/]+\/?|\//g) || [route]

// Each segment is an unbreakable unit with a <wbr> after its slash, so a line only
// breaks after a "/" and never at a hyphen.
function RouteLine({ route }) {
  return (
    <span className="spt-route">
      {routeSegments(route).map((seg, i) => (
        <Fragment key={`${seg}-${i}`}>
          {i > 0 && <wbr />}
          <span className="spt-seg">{seg}</span>
        </Fragment>
      ))}
    </span>
  )
}

const SoonPill = ({ inline }) => <span className={inline ? 'spt-soon spt-soon--inline' : 'spt-soon'}>Soon</span>

// Live destinations are links. Staged destinations keep their route and context
// visible, but are deliberately non-interactive so "Soon" never behaves like a
// shipped action.
function MapRow({ label, route, note, soon, thumb }) {
  const cls = `spt-row${thumb ? '' : ' spt-row--text'}${soon ? ' spt-row--soon' : ''}`
  const inner = (
    <>
      {thumb}
      <span className="spt-row-text">
        <span className="spt-lbl">
          <b>{label}</b>
          {soon && <SoonPill />}
        </span>
        {note && <span className="spt-note">{note}</span>}
        <RouteLine route={route} />
      </span>
      <span className="spt-row-go" aria-hidden="true">{soon ? null : <PhIcon name="arrow-up-right" />}</span>
    </>
  )
  return (
    <li data-route={route} data-soon={soon ? 'true' : undefined}>
      {soon ? <div className={cls}>{inner}</div> : <Link className={cls} to={route}>{inner}</Link>}
    </li>
  )
}

function Rail({ icon, hue, label, meta, desc }) {
  return (
    <div className="spt-rail">
      <h3>
        <span className="spt-gtile" data-hue={hue} aria-hidden="true"><NavIcon id={icon} /></span>
        <span>{label}</span>
      </h3>
      {meta && <p className="spt-gmeta">{meta}</p>}
      {desc && <p className="spt-gdesc">{desc}</p>}
    </div>
  )
}

export default function SiteMap() {
  // Unfinished pages are listed, badged, for admins only; everyone else gets a
  // map of what opens.
  const { isAdmin } = useIsAdmin()
  const showSoon = (flag) => isAdmin || !flag
  const createGroups = CREATE_GROUPS
    .map((group) => ({
      group,
      tools: listedTools(group).filter((tool) => showSoon(group.soon || tool.soon)),
    }))
    .filter(({ tools }) => tools.length)
  const discoverGroups = DISCOVER_GROUPS.filter((g) => showSoon(g.soon))
  const learnRoadmap = LEARN_ROADMAP.filter((g) => showSoon(g.soon))
  const [heroLit] = useState(() => typeof document !== 'undefined'
    && !document.documentElement.hasAttribute('data-hero-prepainted')
    && !prefersReducedMotion())

  return (
    <div className="spectrum spm spt spt-sitemap">
      <PillNav variant="spectrum" />
      <div className="sp-grain" aria-hidden="true" />
      <div className="spm-spacer" aria-hidden="true" />
      <main id="main" tabIndex={-1}>
        <section className="spm-intro" aria-labelledby="smap-h1">
          <div className={heroLit ? 'spm-hero is-in' : 'spm-hero'}>
            <div className="spm-hero-copy">
              {/* No taxonomy eyebrow above the h1, and no count in it: a count is a number that can be wrong. */}
              <h1 className="spm-h1" id="smap-h1"><SpectrumWords text="The whole map." /></h1>
              <p className="spm-lede">
                {isAdmin ? (
                  <>
                    Every page in UIL4B, laid out end to end. Categories still in the workshop
                    keep a <SoonPill inline /> badge, so the map only ever promises what&rsquo;s actually live.
                  </>
                ) : 'Every page in UIL4B, laid out end to end.'}{' '}
                Jump to <a href="#create">Create</a>, <a href="#browse">Discover &amp; Learn</a> or <a href="#account">Account &amp; more</a>.
              </p>
            </div>
          </div>
        </section>

        {/* Create: the build surface, straight from the tool tree */}
        <section className="spt-section" id="create" aria-labelledby="smap-create">
          <h2 className="spt-h2" id="smap-create">Create</h2>
          {/* "components" is not in this list: the `component` group is soon:true and
              the page only ever promises what is live. */}
          <p className="spt-sub">Build colour, type, icons, media and AI systems.</p>
          {createGroups.map(({ group, tools }) => (
            <div key={group.id} className="spt-group" data-hue={group.hue}>
              <Rail icon={group.hue} hue={group.hue} label={group.label} meta={group.soon ? <SoonPill /> : null} desc={group.desc} />
              <ul className="spt-rows">
                {tools.map((tool) => {
                  const soon = !!(group.soon || tool.soon)
                  return (
                    <MapRow
                      key={tool.id}
                      label={tool.label}
                      route={tool.route}
                      note={CREATE_TOOL_SEARCH[tool.id]?.description}
                      soon={soon}
                      thumb={<span className="spt-thumb"><ToolArt id={tool.id} size="thumb" soon={soon} /></span>}
                    />
                  )
                })}
              </ul>
            </div>
          ))}
        </section>

        {/* Discover and Learn: browse and understand */}
        <section className="spt-section" id="browse" aria-labelledby="smap-browse">
          <h2 className="spt-h2" id="smap-browse">Discover &amp; Learn</h2>
          <p className="spt-sub">Browse curated inspiration, then dig into the why behind it.</p>
          <div className="spt-group" data-hue="accent" data-sitemap-section="discover">
            <Rail icon="inspiration" hue="accent" label="Discover" meta={<>{DISCOVER_GROUPS.filter((group) => !group.soon).length} live{isAdmin && <> &middot; more coming</>}</>} />
            {/* Nothing typed here: every row carries its own `desc` from the registry,
                so the column cannot promise a group the registry does not list. */}
            <ul className="spt-rows">
              {discoverGroups.map((g) => (
                <MapRow key={g.id} label={g.label} route={g.route} note={g.desc} soon={g.soon} />
              ))}
            </ul>
          </div>
          {/* LEARN_ROADMAP rather than LEARN_GROUPS: a delivered row carries the SAME
              route as the guide that delivered it, so listing both would put two rows
              on one data-route. */}
          <div className="spt-group" data-hue="accent" data-sitemap-section="learn">
            <Rail
              icon="principles"
              hue="accent"
              label="Learn"
              desc={isAdmin
                ? 'Reference guides on colour, type and accessibility, plus the topics still to be written.'
                : 'Reference guides on colour, type and accessibility.'}
            />
            <ul className="spt-rows">
              {LEARN_ARTICLES.map((a) => (
                <MapRow key={a.slug} label={a.title} route={`/learn/${a.slug}`} note={a.dek} />
              ))}
              <MapRow label="Learn" route="/learn" note={isAdmin ? 'The section landing, and what is on the way.' : 'The section landing.'} />
              {learnRoadmap.map((g) => (
                <MapRow key={g.id} label={g.label} route={g.route} note={g.desc} soon={g.soon} />
              ))}
            </ul>
          </div>
        </section>

        {/* Account, help and legal: hand-kept, not in the tool tree */}
        <section className="spt-section spt-section--last" id="account" aria-labelledby="smap-account">
          <h2 className="spt-h2" id="smap-account">Account &amp; more</h2>
          <p className="spt-sub">Your account, support and the fine print.</p>
          <div className="spt-cols">
            {FLAT_SECTIONS.map((section) => (
              <div key={section.id} className="spt-col" data-hue="none">
                <Rail icon={section.icon} hue="none" label={section.label} desc={section.desc} />
                <ul className="spt-rows">
                  {section.links.map((link) => (
                    <MapRow key={link.route} {...link} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SpectrumFooter />
    </div>
  )
}
