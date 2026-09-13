import { NavLink, useLocation } from 'react-router-dom'
import { CREATE_GROUPS, DISCOVER_GROUPS, createTools } from '../data/toolTree'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/reading.css'
import '../styles/deferred/tool-shell.css'

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
// else (the tree, the nav, the hero rail and /help all say Palette / Palette
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

export default function NotFound() {
  const { pathname } = useLocation()

  return (
    <div className="sec nf">
      <div className="sec-h">
        <div className="sec-h-eyebrow">404</div>
        <h1>That page doesn&rsquo;t exist</h1>
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

      <p className="nf-more">
        <NavLink to="/">Back to the homepage</NavLink>
        {' · '}
        <NavLink to="/sitemap">See every page</NavLink>
        {' · '}
        {/* The audit found four surfaces pointing here as the way to report a
            problem, so a dead link is exactly the moment to offer it again. */}
        <NavLink to="/feedback">Report a broken link</NavLink>
      </p>
    </div>
  )
}
