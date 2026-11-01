import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CREATE_GROUPS, DISCOVER_GROUPS, createTools } from '../data/toolTree'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/reading.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/trail.css'
import { ENTRY_PATH } from '../utils/entryPath'

// A real 404, replacing `<Route path="*" element={<Navigate to="/" replace />} />`.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE REDIRECT WAS WRONG (2026-08-11 site audit, P2 — see CHANGELOG.md)
// ─────────────────────────────────────────────────────────────────────────────
// `curl -o /dev/null -w "%{http_code}" /this-does-not-exist` returned **200**,
// rendering the homepage with `robots: index,follow`. That is a soft 404, and
// it is worse than it sounds:
//
//   • Every typo, dead backlink and hallucinated URL became an indexable
//     "page" whose content was the homepage — so the homepage's own content
//     appeared at unlimited URLs.
//   • The user was silently teleported to `/`, which reads as the link having
//     worked. Nobody reports a broken link they were never shown.
//
// A static SPA cannot return a real 404 status from the client, so this does
// the two things it CAN do: tell the crawler not to index it (the served shell
// carries noindex, see scripts/prerender.mjs), and tell the person what
// happened plus where to go instead.

// WHERE TO GO INSTEAD — read from the tool tree, not typed (anti-slop audit,
// 2026-09-09).
//
// The four cards used to be hand-written, and two of the four were wrong:
// "Palette Generator" is not what the product calls /create/palette anywhere
// else (the tree, the nav, the hero rail and /learn/help all say Palette / Palette
// Builder), and "Community palettes, gradients and prompts" described Discover
// with a word that is false — the palettes are curated and brand, and the
// community half is the group still marked Soon. The one-line descriptions
// were the seventh hand-kept copy of the tool inventory that
// [handkept-tool-lists-remaining] exists to stop.
//
// So a card is a tool's own label over its group's label, and the Discover
// card counts the libraries that actually open, the same derivation the
// /discover hero uses. Nothing here can name a tool the tree does not have:
// an unknown id throws at import, which fails the build.
const TOOLS = createTools()
const GROUP_LABEL = Object.fromEntries(CREATE_GROUPS.map((g) => [g.id, g.label]))
const suggestTool = (id) => {
  const tool = TOOLS.find((t) => t.id === id && !t.soon)
  if (!tool) throw new Error(`NotFound suggests "${id}", which is not a live tool in CREATE_GROUPS`)
  return { to: tool.route, label: tool.label, desc: GROUP_LABEL[tool.group] }
}
const DISCOVER_LIVE = DISCOVER_GROUPS.filter((g) => !g.soon).length
const SUGGESTIONS = [
  suggestTool('palette'),
  suggestTool('type-scale'),
  suggestTool('icons'),
  { to: '/discover', label: 'Discover', desc: `${DISCOVER_LIVE} libraries open` },
]

// Whether the person got here by moving around the app rather than by loading
// this address. A fresh load renders the path the tab first loaded;
// useNavigationType() cannot say this, because the routes below App.jsx's
// <Routes location> always report POP.
function arrivedInApp(pathname) {
  return typeof window !== 'undefined' && pathname !== ENTRY_PATH
}

// The page that linked here, when the browser can say so: a same-site path only
// (never a query string, and never another site), and only on a fresh load.
// After in-app navigation document.referrer still names the page the visit
// started from, which would blame the wrong link.
function linkingPath(pathname) {
  if (typeof document === 'undefined' || !document.referrer || arrivedInApp(pathname)) return ''
  try {
    const from = new URL(document.referrer)
    return from.origin === window.location.origin && from.pathname !== pathname ? from.pathname : ''
  } catch {
    return ''
  }
}

export default function NotFound() {
  const { pathname } = useLocation()
  const headingRef = useRef(null)

  // Arriving here from a link or a redirect leaves focus on a control that is
  // no longer on screen, so move it to the heading. A fresh load keeps the
  // browser's own focus handling.
  useEffect(() => {
    if (arrivedInApp(pathname)) headingRef.current?.focus()
  }, [pathname])

  // The report form opens as a bug report with the broken path filled in.
  const report = new URLSearchParams({ type: 'bug', page: pathname })
  const from = linkingPath(pathname)
  if (from) report.set('referrer', from)

  return (
    <div className="sec nf">
      <div className="sec-h">
        {/* NO TAXONOMY EYEBROW. Founder, 2026-09-14: "remove this text its such a
            common AI trait, scan the whole site and remove alot of them where
            applied." This continues #382 and #386, where he marked this exact
            element "AI" and it was deleted from the Font Gallery, Font Pair,
            the Type Scale and the Tint tool. A 10px mono-caps label restating
            the page's own section, directly above an h1 that names the page,
            on a route the nav already has lit. Hierarchy is a control, not a
            label. */}
        <h1 ref={headingRef} tabIndex={-1}>That page doesn&rsquo;t exist</h1>
        <p>
          Nothing lives at <code className="nf-path">{pathname}</code>. It may have moved,
          or the link may have been mistyped.
        </p>
      </div>

      <nav className="nf-grid" aria-label="Suggested pages">
        {SUGGESTIONS.map((s) => (
          <NavLink key={s.to} to={s.to} className="nf-card">
            <span className="nf-card-label">{s.label}</span>
            <span className="nf-card-desc">{s.desc}</span>
          </NavLink>
        ))}
      </nav>

      <p className="nf-more trail">
        <span className="trail-in">
          <span className="trail-item"><NavLink to="/">Back to the homepage</NavLink></span>
          <span className="trail-item"><NavLink to="/sitemap">See every page</NavLink></span>
          {/* The audit found four surfaces pointing here as the way to report a
              problem, so a dead link is exactly the moment to offer it again. */}
          <span className="trail-item"><NavLink to={`/feedback?${report}`}>Report a broken link</NavLink></span>
        </span>
      </p>
    </div>
  )
}
