import { Link, NavLink } from 'react-router-dom'
import { categoryDestination } from '../../data/toolTree'
import FounderNote from '../FounderNote'
import SpectrumIcon from './SpectrumIcon'

// The Spectrum footer.
//
// ─────────────────────────────────────────────────────────────────────────────
// THIS REPLACES <AppFooter /> ON THIS ROUTE, AND MUST LOSE NOTHING
// ─────────────────────────────────────────────────────────────────────────────
// App.jsx renders `<Home /><AppFooter />` for `/` and `/home` today. Spectrum
// ships its own footer because the design's is part of the page — a display-size
// handoff line and a CTA sitting in the same band as the link columns, over the
// spectrum rule — and stacking it above AppFooter would put two <footer>
// landmarks and two copyright lines on the front door.
//
// So this file carries EVERY destination AppFooter carries. That is not
// politeness, it is the founder's stated top priority for this whole redesign:
// "make sure to not remove any functionality of the app this is important."
// A footer link is functionality. `tests/unit/spectrum-footer-parity.test.js`
// reads both files and fails the build if AppFooter gains a destination this one
// does not have — so the two can be edited independently without this one
// quietly falling behind.
//
// ── THE FOUNDER'S NOTE IS THE ONE NON-NEGOTIABLE ────────────────────────────
// "i also still want my little about message accessable in the footer" is an
// open founder ask, and `FounderNote` is that message. It keeps the two
// properties its own file spends sixty lines defending:
//
//   · IT NEVER OPENS ITSELF. Nothing here mounts it open, times it, watches
//     scroll depth or remembers a visitor. It renders a <button>; a person
//     presses it. That was his explicit choice over the welcome popup he was
//     offered, and this page — the front door, the single most tempting surface
//     on the site to greet somebody from — does not relitigate it.
//   · IT SITS IN THE LEGAL ROW, beside "Built in Brisbane by Dylan Coleman",
//     exactly where AppFooter puts it. A reader who has just read who built the
//     app finds the longer answer in the same row rather than going looking.
//     Its TRIGGER is restyled to Spectrum (spectrum.css restyles
//     `.app-footer-note` inside this footer); its prose, its label and its
//     behaviour are untouched.
//
// ── CITATION ────────────────────────────────────────────────────────────────
// Footer geometry — link columns above a thin baseline rule carrying the
// copyright on the left and the "Built in …" line on the right — is Sequence's:
// https://mobbin.com/sites/sections/91ab3ff8-d285-4695-8ffd-15c86b43b467
// It is the arrangement that already had a slot for a place-and-people line,
// which is what this footer has to keep, and it is why the attribution and the
// note share the baseline row rather than becoming a fourth column.

// Founder attribution. The URL is a settled decision — CHANGELOG.md, "Founder
// decisions — 2026-08-20", decision 3 — and AppFooter, the Help Centre and
// Settings already link it exactly this way.
const FOUNDER_PORTFOLIO = 'https://dylan-coleman.com/'

// The Create column names CREATE_GROUPS ids, never URLs: `categoryDestination()`
// answers where a category actually opens, which is the trap AppFooter's own
// comment records — "Imagery" pointed at /create/imagery, a category home with
// no screen of its own, and CreateTool.jsx bounced the visitor onward.
const FOOTER_CREATE = [
  ['colour', 'Colour systems'],
  ['type', 'Typography'],
  ['icons', 'Icons & emoji'],
  ['imagery', 'Imagery'],
]

// ── THE COLUMNS ARE THE DESIGN'S, THE DESTINATIONS ARE THE PRODUCT'S ────────
//
// The design draws TOOLS · PROJECT · LEGAL — three short columns with legal
// pulled out into its own — and that shape is what this follows, including
// giving Privacy and Terms a column of their own rather than burying them at the
// foot of Support the way AppFooter does. Those are the two pages a reader goes
// looking for deliberately, and a reader looking for them is not browsing.
//
// WHAT DOES NOT FOLLOW THE DESIGN IS THE COUNT. Its middle column carries three
// invented rows; this product has nine real destinations that exist nowhere else
// in this footer, and dropping one to match a prototype's rhythm would be
// dropping functionality to gain a screenshot. So the middle splits in two —
// Explore for the places you browse, Support for the places you ask — which is
// the design's own logic applied to a bigger inventory rather than a compromise
// with it. `tests/unit/spectrum-structure.test.js` fails if any destination
// AppFooter reaches stops being reachable from here.
const FOOTER_GROUPS = [
  {
    label: 'Tools',
    links: FOOTER_CREATE.map(([groupId, label]) => [categoryDestination(groupId), label]),
  },
  {
    label: 'Explore',
    links: [
      ['/discover', 'Discover'],
      ['/learn', 'Learn'],
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
    ],
  },
  {
    label: 'Legal',
    links: [
      ['/privacy', 'Privacy'],
      ['/terms', 'Terms'],
    ],
  },
]

export default function SpectrumFooter({ onOpenToolkit, toolkitTo }) {
  const year = new Date().getFullYear()

  // The handoff CTA is the same control as the hero's, so it behaves the same
  // way: a signed-out visitor gets the sign-up dialog in place (no unmount, no
  // lost scroll position) and a signed-in one follows a real link. The page owns
  // that decision and hands it down, rather than this file asking auth a second
  // time and answering it slightly differently.
  const handoff = onOpenToolkit
    ? (
      <button type="button" className="sp-cta sp-cta--ink" onClick={onOpenToolkit} aria-haspopup="dialog">
        <span>Open the toolkit</span>
        <span className="sp-cta-icon" aria-hidden="true"><SpectrumIcon name="arrow-up-right" size={13} /></span>
      </button>
      )
    : (
      <Link className="sp-cta sp-cta--ink" to={toolkitTo || '/projects'}>
        <span>Open the toolkit</span>
        <span className="sp-cta-icon" aria-hidden="true"><SpectrumIcon name="arrow-up-right" size={13} /></span>
      </Link>
      )

  return (
    <footer className="sp-footer">
      <div className="sp-footer-inner">
        <div className="sp-footer-grid">
          <div className="sp-footer-brand">
            {/* The design's own line, from the founder's brief. It is the only
                sentence in this footer and it replaces nothing — AppFooter
                deliberately carries no tagline (anti-slop audit, 2026-09-09),
                and this is a handoff above a button rather than a claim under a
                wordmark on every page of the site. */}
            <p className="sp-footer-say">Save time, and save your mind.</p>
            {handoff}
          </div>

          <nav className="sp-footer-links" aria-label="Footer">
            {FOOTER_GROUPS.map((group) => (
              <div className="sp-footer-col" key={group.label}>
                <h2 className="sp-footer-col-h">{group.label}</h2>
                <ul>
                  {group.links.map(([to, label]) => (
                    <li key={to}><NavLink to={to}>{label}</NavLink></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="sp-footer-legal">
          <span className="sp-footer-copy">© {year} UIL4B</span>
          {/* ── THE OPT-IN NOTE. See the block comment at the top of this file,
                and the far longer one in FounderNote.jsx, for why it is a button
                here and never a popup that opens itself. ── */}
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
