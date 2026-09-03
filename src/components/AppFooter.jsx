import { Link, NavLink } from 'react-router-dom'
import { categoryDestination } from '../data/toolTree'

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
      ['/plans', 'Plans'],
      ['/sitemap', 'Sitemap'],
    ],
  },
  {
    label: 'Support',
    links: [
      ['/help', 'Help centre'],
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
          <p className="app-footer-tagline">
            The operating workspace for building, validating and exporting interface foundations.
          </p>
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
