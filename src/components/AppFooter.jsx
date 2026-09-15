import { Link, NavLink } from 'react-router-dom'
import { categoryDestination } from '../data/toolTree'
import FounderNote from './FounderNote'

// Founder attribution. The URL is a settled decision — CHANGELOG.md, "Founder
// decisions — 2026-08-20", decision 3 — and the Help Centre and Settings already
// link it exactly this way. Like those two it stays a literal rather than going
// through safeHttpUrl(): that guard is for URLs arriving at RUNTIME (community
// submissions, prompt profile links), and a constant in this file has no
// untrusted path to guard. No rel="nofollow" either — that is for the curated
// and member-submitted third-party links in Discover and Community. This one is
// ours, and we want it followed.
const FOUNDER_PORTFOLIO = 'https://dylan-coleman.com/'

// The Create column names CREATE_GROUPS ids, not URLs.
//
// The LABEL is the footer own — "Colour systems" is not what the nav calls that
// group — but the DESTINATION belongs to the tool tree, and typing it out here
// is how three of these four rows ended up correct by hand and one did not:
// "Imagery" pointed at /create/imagery, a category home with no screen of its
// own, so CreateTool.jsx bounced the visitor on to /create/file-converter. The
// comment that used to sit on the Typography row explained that exact hazard
// while the row below it walked into it.
//
// categoryDestination() answers it once, from CreateTool.jsx own rule.
const FOOTER_CREATE = [
  ['colour', 'Colour systems'],
  ['type', 'Typography'],
  ['icons', 'Icons & emoji'],
  ['imagery', 'Imagery'],
]

const FOOTER_GROUPS = [
  {
    label: 'Create',
    links: FOOTER_CREATE.map(([groupId, label]) => [categoryDestination(groupId), label]),
  },
  {
    label: 'Explore',
    links: [
      ['/discover', 'Discover'],
      ['/learn', 'Learn'],
      // PROMOTED 2026-09-15, and this is a judgement call rather than a fix.
      // /community and /info were already reachable — SiteMap.jsx lists both,
      // and the Sitemap link is in the Explore column below. But Community is a
      // whole public section of the product and /info is the searchable guide
      // to every tool, and two clicks by way of a sitemap page is a poor way to
      // meet either. Revert by deleting this row and the /info row in Support.
      ['/community', 'Community'],
      ['/principles', 'Design principles'],
      ['/plans', 'Plans'],
      ['/sitemap', 'Sitemap'],
    ],
  },
  {
    label: 'Support',
    links: [
      ['/help', 'Help centre'],
      ['/info', 'Info centre'],
      ['/feedback', 'Send feedback'],
      ['/privacy', 'Privacy'],
      ['/terms', 'Terms'],
    ],
  },
]

export default function AppFooter({ compact = false }) {
  const year = new Date().getFullYear()
  return (
    <footer className={compact ? 'app-footer app-footer--compact' : 'app-footer'}>
      <div className="app-footer-inner">
        <div className="app-footer-brand">
          <span className="app-footer-mark">UIL4B</span>
          {/* THE TAGLINE IS GONE — anti-slop audit, 2026-09-09. Under the
              wordmark sat "The operating workspace for building, validating
              and exporting interface foundations." on every page of the site:
              a tagline (the founder's word for the "UI system toolkit" line he
              retired as "a huge AI Slop feature"), and a value claim typed by
              an agent rather than read from positioning.js, which is exactly
              what positioning-truth.test.js exists to stop. Nothing replaces
              it — the four founder lines each already have a surface, and a
              footer that repeats one of them under every page would be the
              "all over the place" he named. The wordmark and the way in stay. */}
          <Link className="app-footer-start" to="/create/color">
            Start with colour <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <nav className="app-footer-links" aria-label="Footer">
          {FOOTER_GROUPS.map((group) => (
            <div className="app-footer-group" key={group.label}>
              <p>{group.label}</p>
              {group.links.map(([to, label, soon]) => (
                soon ? (
                  <span className="app-footer-soon-link" key={to} aria-label={`${label} — coming soon`}>
                    {label} <em>Soon</em>
                  </span>
                ) : <NavLink key={to} to={to}>{label}</NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="app-footer-legal">
          <span className="app-footer-copy">© {year} UIL4B</span>
          {/* The opt-in note about this project — see FounderNote.jsx for why it
              is a link here and not a popup that opens itself.

              It sits in the legal row rather than in the Support column above
              because that is where this footer already says who built the app:
              "Built in Brisbane by Dylan Coleman" is one item to the right, and
              a reader who wants more after reading that has it in the same row
              instead of having to go looking. It is also the row least likely to
              collide — the Support column's four links are ordinary NavLinks
              generated from FOOTER_GROUPS, and a <button> spliced into that map
              would have to special-case one group to say something none of the
              others say. */}
          <FounderNote />
          <span>
            Built in Brisbane by{' '}
            <a
              className="app-footer-attrib"
              href={FOUNDER_PORTFOLIO}
              target="_blank"
              rel="noopener noreferrer"
            >
              Dylan Coleman<span aria-hidden="true"> ↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
