import { Link, NavLink, useLocation } from 'react-router-dom'
import { categoryDestination } from '../../data/toolTree'
import FounderNote from '../FounderNote'
import PhGlyph from './PhGlyph'
import { PH_ARROW_UP_RIGHT } from './phosphorNav'
import { crossRouteHashClick, salesHref } from './salesLinks'
import '../../styles/pages/spectrum-chrome.css'

// The marketing footer — `UIL4B - Spectrum.dc.html` lines 1595-1633.
//
/// The design's composition, reproduced: the display handoff "Save time, and
// save your mind." over the ink "Open the toolkit" pill, then link columns
// headed in uppercase mono (TOOLS / PROJECT / LEGAL), all in one auto-fit grid
// of 220px floors, and a mono baseline under a hairline carrying the copyright
// line, "© 2026 UI L4B. Spectrum." (the year is computed).
//
// WHERE IT DEPARTS FROM THE FILE, AND WHY:
//
//   · ONE EXTRA COLUMN, EXPLORE. This footer replaces AppFooter on the
//     marketing screens, and every destination AppFooter reaches has to stay
//     reachable (tests/unit/spectrum-structure.test.js holds that). The three
//     drawn columns have no room for Discover, Learn, Community, Principles,
//     Plans, Sitemap, Help, Info and Feedback, so they share one column in the
//     same style, placed before LEGAL. Five cells fit the 220px floor at 1440
//     in one row.
//   · CREDITS SITS IN LEGAL, where Cookies was. There is no cookies page, so
//     Cookies is dropped; /credits is a licence condition (the CC-BY icon sets
//     and OFL faces ask for their notices to be reachable).
//   · THE BASELINE KEEPS THE FOUNDER'S NOTE AND THE BRISBANE CREDIT beside the
//     copyright line. The note never opens by itself: it is a button a person
//     presses.
//
// "Open the toolkit" enters the app directly for everybody, with no sign-up
// gate.

// The designer credit link in the baseline.
const FOUNDER_PORTFOLIO = 'https://dylan-coleman.com/'

// TOOLS — the design's four labels (1609-1612). Each names a CREATE_GROUPS id,
// and categoryDestination() answers where that category actually opens.
const TOOLS = [
  ['colour', 'Colour'],
  ['type', 'Type'],
  ['icons', 'Assets'],
  ['imagery', 'Imagery'],
]

// PROJECT — the design's three (1617-1619): sections of the sales page, by anchor.
const PROJECT = [
  ['#bench', 'The bench'],
  ['#specimens', 'Specimens'],
  ['#index', 'Index'],
]

// EXPLORE — the destinations AppFooter reaches that the drawn columns do not.
const EXPLORE = [
  ['/discover', 'Discover'],
  ['/learn', 'Learn'],
  ['/community', 'Community'],
  ['/principles', 'Design principles'],
  ['/plans', 'Plans'],
  ['/sitemap', 'Sitemap'],
  ['/help', 'Help centre'],
  ['/info', 'Info centre'],
  ['/feedback', 'Send feedback'],
]

// LEGAL — the design's Privacy and Terms (1625-1626), and Credits where Cookies was.
const LEGAL = [
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
  ['/credits', 'Credits'],
]

function Column({ heading, children }) {
  return (
    <div className="sp-footer-col">
      <h2 className="sp-footer-col-h">{heading}</h2>
      <ul>{children}</ul>
    </div>
  )
}

export default function SpectrumFooter({ toolkitTo = '/projects' }) {
  const year = new Date().getFullYear()
  const { pathname } = useLocation()

  return (
    <footer className="sp-footer">
      <div className="sp-footer-inner">
        <div className="sp-footer-grid">
          <div className="sp-footer-brand">
            <p className="sp-footer-say">Save time, and save your mind.</p>
            <Link className="sp-footer-cta" to={toolkitTo}>
              <span>Open the toolkit</span>
              <span className="sp-footer-cta-icon" aria-hidden="true"><PhGlyph d={PH_ARROW_UP_RIGHT} size={13} /></span>
            </Link>
          </div>

          {/* `display:contents`, so the columns are cells of the one grid
              while still sitting inside a Footer navigation landmark. */}
          <nav className="sp-footer-links" aria-label="Footer">
            <Column heading="TOOLS">
              {TOOLS.map(([groupId, label]) => (
                <li key={groupId}><NavLink to={categoryDestination(groupId)}>{label}</NavLink></li>
              ))}
            </Column>
            <Column heading="PROJECT">
              {PROJECT.map(([hash, label]) => {
                const href = salesHref(hash, pathname)
                return (
                  <li key={hash}>
                    {href.startsWith('#')
                      ? <a href={href}>{label}</a>
                      : <Link to={href} onClick={crossRouteHashClick(href)}>{label}</Link>}
                  </li>
                )
              })}
            </Column>
            <Column heading="EXPLORE">
              {EXPLORE.map(([to, label]) => (
                <li key={to}><NavLink to={to}>{label}</NavLink></li>
              ))}
            </Column>
            <Column heading="LEGAL">
              {LEGAL.map(([to, label]) => (
                <li key={to}><NavLink to={to}>{label}</NavLink></li>
              ))}
            </Column>
          </nav>
        </div>

        <div className="sp-footer-legal">
          <span className="sp-footer-copy">© {year} UI L4B. Spectrum.</span>
          <FounderNote />
          <span className="sp-footer-place">
            Built in Brisbane by{' '}
            <a
              className="sp-footer-attrib"
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
