import { NavLink } from 'react-router-dom'

// Consistent footer shared across all in-app pages. Kept lightweight — quick
// links to the key destinations plus legal/attribution.
export default function AppFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="app-footer-brand">
          <span className="app-footer-mark">UIL4B</span>
          <span className="app-footer-tagline">Design toolkit for everyone.</span>
        </div>
        <nav className="app-footer-links">
          <NavLink to="/color">Colour</NavLink>
          <NavLink to="/typography">Typography</NavLink>
          <NavLink to="/icons">Icons</NavLink>
          <NavLink to="/ui-builder">UI Builder</NavLink>
          <NavLink to="/help">Help</NavLink>
          <NavLink to="/feedback">Feedback</NavLink>
        </nav>
        <nav className="app-footer-legal">
          <NavLink to="/privacy">Privacy</NavLink>
          <NavLink to="/terms">Terms</NavLink>
          <span className="app-footer-copy">© {year} UIL4B</span>
        </nav>
      </div>
    </footer>
  )
}
