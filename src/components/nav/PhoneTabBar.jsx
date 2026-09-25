import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

// THE PHONE TAB BAR — the phone mockups in `UIL4B - Spectrum.dc.html`
// (lines 1432-1437 and 1552-1557) draw the app with a bottom bar of four tabs:
// Projects, Create, Discover, You. It shows on app routes.
// Sizes are the mockup's scaled to a real 390px screen (it is drawn inside a
// 278px screen): a 21px glyph over a 12px label, ink when current and ink-dim
// otherwise, a hairline above.
//
// Create is a BUTTON, not a link: the tools have no single page to land on, so
// it opens the menu sheet on its Create section, which is where every tool is.
// Visible below 768px only (global.css); from 768 the header carries the menus.

function FoldersGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8v10a1.5 1.5 0 0 0 1.5 1.5h12.5" />
      <path d="M7 15.5V5.5A1.5 1.5 0 0 1 8.5 4h3.3l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5V15.5A1.5 1.5 0 0 1 19 17H8.5A1.5 1.5 0 0 1 7 15.5Z" />
    </svg>
  )
}

function PaletteGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z" />
      <circle cx="7.6" cy="11.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.6" cy="7.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="7.4" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function CompassGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.6 8.4-2.2 5-5 2.2 2.2-5 5-2.2Z" />
    </svg>
  )
}

function UserGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.2 20.2c1.6-3.1 4.5-4.8 7.8-4.8s6.2 1.7 7.8 4.8" />
    </svg>
  )
}

function which(pathname) {
  const p = (pathname || '/').toLowerCase()
  if (p.startsWith('/projects')) return 'projects'
  if (p.startsWith('/create')) return 'create'
  if (p.startsWith('/discover') || p.startsWith('/community')) return 'discover'
  if (p.startsWith('/settings')) return 'you'
  return null
}

export default function PhoneTabBar({ signedIn, onCreate, onAccount, onSignIn, onNavigate, createOpen, accountOpen }) {
  const { pathname } = useLocation()
  const current = which(pathname)

  // The page reserves the bar's height at its foot so the last row of any page
  // can scroll clear of it; the class only exists while the bar is mounted.
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('has-tabbar')
    return () => root.classList.remove('has-tabbar')
  }, [])

  const tab = (id) => ({
    className: 'pnav-tab' + (current === id ? ' is-current' : ''),
    'aria-current': current === id ? 'page' : undefined,
  })

  return (
    <nav className="pnav-tabs" aria-label="App sections">
      <Link {...tab('projects')} to="/projects" onClick={onNavigate}>
        <FoldersGlyph />
        <span>Projects</span>
      </Link>
      <button
        type="button"
        className={'pnav-tab' + (current === 'create' ? ' is-current' : '')}
        aria-haspopup="dialog"
        aria-expanded={!!createOpen}
        onClick={onCreate}
      >
        <PaletteGlyph />
        <span>Create</span>
      </button>
      <Link {...tab('discover')} to="/discover" onClick={onNavigate}>
        <CompassGlyph />
        <span>Discover</span>
      </Link>
      {/* Signed in, You opens the account switcher in the menu
          sheet: this account, the others remembered here, Add account,
          settings and sign-out. */}
      {signedIn ? (
        <button
          type="button"
          className={'pnav-tab' + (current === 'you' ? ' is-current' : '')}
          aria-haspopup="dialog"
          aria-expanded={!!accountOpen}
          onClick={onAccount}
        >
          <UserGlyph />
          <span>You</span>
        </button>
      ) : (
        <button type="button" className="pnav-tab" aria-haspopup="dialog" onClick={onSignIn}>
          <UserGlyph />
          <span>You</span>
        </button>
      )}
    </nav>
  )
}
