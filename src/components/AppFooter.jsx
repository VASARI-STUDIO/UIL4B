import { Link, NavLink } from 'react-router-dom'

const FOOTER_GROUPS = [
  {
    label: 'Create',
    links: [
      ['/color', 'Colour systems'],
      ['/typography', 'Typography', true],
      ['/icons', 'Icons & emoji'],
      ['/imagery', 'Imagery'],
    ],
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
          <Link className="app-footer-start" to="/color">
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
          <span>Built in Brisbane for people who ship interfaces.</span>
        </div>
      </div>
    </footer>
  )
}
