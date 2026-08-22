import { NavLink, useLocation } from 'react-router-dom'

// A real 404, replacing `<Route path="*" element={<Navigate to="/" replace />} />`.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE REDIRECT WAS WRONG (docs/audit-2026-08-11.md, P2)
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

const SUGGESTIONS = [
  { to: '/create/palette', label: 'Palette Generator', desc: 'Build a colour system from one seed' },
  { to: '/create/type-scale', label: 'Type Scale', desc: 'A responsive type ladder with real breakpoints' },
  { to: '/create/icons', label: 'Icon Library', desc: 'Search, customise and copy clean SVG' },
  { to: '/discover', label: 'Discover', desc: 'Community palettes, gradients and prompts' },
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
