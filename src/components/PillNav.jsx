import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { NAV_SECTIONS } from '../data/toolTree'
import { UIKIT_GUIDE_KEY } from './UIKitGuide'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useTheme } from '../contexts/ThemeContext'
import { ADMIN_EMAILS } from '../utils/constants'
import NavIcon from './NavIcon'

// Overlays are code-split: the command palette and the export shell only load
// the first time a visitor actually opens them, so they never weigh on the nav's
// first paint.
const CommandPalette = lazy(() => import('./CommandPalette'))
const ExportPanel = lazy(() => import('./ExportPanel'))

// The marketing / app nav: a fixed, full-width standard-SaaS top bar with three
// mega-menus (Create / Discover / Learn) driven entirely by src/data/toolTree.js,
// so the menu can never drift from the router. One shared panel morphs width per
// section (Coolors-footer homage) and carries a right-hand promo card; on mobile
// it becomes a full-screen sheet with accordions. The centre holds the search
// field (reusing the CommandPalette index); the right cluster holds the Export
// shell, the auth/upgrade CTAs and the Avatar account popover. Auth +
// subscription are read ONLY — to decide account vs. upgrade CTA and to gate the
// admin link's *visibility* — never written here.
//
// State is set exclusively from user events (click / hover / scroll / key), never
// synchronously inside an effect, so we stay clear of the `set-state-in-effect`
// advisory. Effects only attach/detach listeners.

// Marketing / conversion routes where there's nothing to export — the resting
// bar drops the Export shell and leads with the "Get Pro" conversion pill
// instead (matches the sales-page nav reference).
const SALES_PATHS = new Set(['/', '/home', '/plans', '/pricing'])

// Small inline chevron so the nav has zero asset dependencies.
function Chevron() {
  return (
    <svg className="pnav-chev" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="pnav-search-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7.25" />
      <path d="m20 20-3.65-3.65" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5" />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-4.5L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function MeatballIcon() {
  // Horizontal 3-dot "more" affordance — the resting utility button. Reads as
  // "additional options" and stays crisp at nav size.
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  )
}

function GearIcon() {
  // Canonical Lucide "settings" cog — even, well-formed teeth that stay crisp at
  // nav size (the previous hand-rolled path rendered lumpy/asymmetric).
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8L13.8 21a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6Z" />
      <circle cx="7.5" cy="7.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.8-2.7 2.3-2.7 3.8" />
      <circle cx="12" cy="17.3" r=".5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FeedbackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function LoginArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// The day/night segmented control, shared by the account popover (signed in) and
// the compact menu popover (signed out) so the theme toggle reads identically in
// both places.
function ThemeSeg({ theme, setTheme }) {
  return (
    <div className="pnav-pop-row">
      <span className="pnav-pop-row-label">Theme</span>
      <div className="pnav-seg" role="group" aria-label="Theme">
        <button
          type="button"
          className="pnav-seg-btn"
          aria-pressed={theme === 'light'}
          onClick={() => setTheme('light')}
        >
          <SunIcon />
          Day
        </button>
        <button
          type="button"
          className="pnav-seg-btn"
          aria-pressed={theme === 'dark'}
          onClick={() => setTheme('dark')}
        >
          <MoonIcon />
          Night
        </button>
      </div>
    </div>
  )
}

// Initials for the avatar fallback when a user has no profile photo.
function initials(profile, user) {
  const src = profile?.displayName || user?.email || ''
  const parts = src.trim().split(/[\s@.]+/).filter(Boolean)
  const first = parts[0]?.[0] || 'U'
  const second = parts.length > 1 ? parts[1][0] : ''
  return (first + second).toUpperCase()
}

// Inline mini design-system mock for the promo card — zero external assets (strict
// CSP compliant). Every fill/stroke references a design token, so the visual
// re-themes with the app and stays crisp at any DPI. Keyed by section so each
// mega-menu gets a distinct picture: Create = a swatch/type card, Discover =
// stacked inspiration cards, Learn = an open book. Purely decorative → aria-hidden
// is set by the wrapping `.pnav-promo-visual`.
function PromoMock({ section }) {
  if (section === 'discover') {
    return (
      <svg className="pnav-promo-svg" viewBox="0 0 200 120" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect x="8" y="8" width="184" height="104" rx="10" fill="var(--bg-1)" stroke="var(--border)" />
        <rect x="26" y="32" width="98" height="66" rx="8" fill="var(--bg-2)" stroke="var(--border)" />
        <rect x="46" y="22" width="98" height="66" rx="8" fill="var(--bg-1)" stroke="var(--border)" />
        <rect x="58" y="34" width="30" height="18" rx="5" fill="var(--hue-colour)" />
        <rect x="94" y="34" width="30" height="18" rx="5" fill="var(--hue-ai)" />
        <rect x="58" y="60" width="72" height="7" rx="3.5" fill="var(--t2)" />
        <rect x="58" y="73" width="48" height="7" rx="3.5" fill="var(--t3)" />
      </svg>
    )
  }
  if (section === 'learn') {
    return (
      <svg className="pnav-promo-svg" viewBox="0 0 200 120" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect x="8" y="8" width="184" height="104" rx="10" fill="var(--bg-1)" stroke="var(--border)" />
        <path d="M100 28c-13-8-29-8-42-4v64c13-4 29-4 42 4z" fill="var(--bg-2)" stroke="var(--border)" strokeLinejoin="round" />
        <path d="M100 28c13-8 29-8 42-4v64c-13-4-29-4-42 4z" fill="var(--bg-2)" stroke="var(--border)" strokeLinejoin="round" />
        <path d="M100 28v64" stroke="var(--border)" />
        <rect x="66" y="42" width="26" height="6" rx="3" fill="var(--t3)" />
        <rect x="66" y="56" width="22" height="6" rx="3" fill="var(--t3)" />
        <rect x="66" y="70" width="24" height="6" rx="3" fill="var(--t3)" />
        <rect x="108" y="42" width="26" height="6" rx="3" fill="var(--t3)" />
        <rect x="108" y="56" width="18" height="6" rx="3" fill="var(--t3)" />
        <rect x="118" y="18" width="14" height="26" rx="2" fill="var(--accent)" />
      </svg>
    )
  }
  // create (default) — swatch row, type ramp, one outlined component chip.
  return (
    <svg className="pnav-promo-svg" viewBox="0 0 200 120" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect x="8" y="8" width="184" height="104" rx="10" fill="var(--bg-1)" stroke="var(--border)" />
      <rect x="20" y="20" width="34" height="22" rx="6" fill="var(--hue-colour)" />
      <rect x="61" y="20" width="34" height="22" rx="6" fill="var(--hue-type)" />
      <rect x="102" y="20" width="34" height="22" rx="6" fill="var(--hue-component)" />
      <rect x="143" y="20" width="34" height="22" rx="6" fill="var(--hue-ai)" />
      <rect x="20" y="56" width="120" height="8" rx="4" fill="var(--t2)" />
      <rect x="20" y="72" width="80" height="8" rx="4" fill="var(--t3)" />
      <rect x="20" y="90" width="66" height="16" rx="8" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  )
}

export default function PillNav() {
  const { user, userProfile, logout, knownAccounts, switchAccount } = useAuth()
  const { isPro } = useSubscription()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  // Launch the guided brand-kit builder (colour → fonts → type → icons) from the
  // Create mega-menu promo card. Mirrors the dashboard's "Build a UI Kit" action:
  // set the session flag, then enter at the colour step.
  const launchBrandKit = () => {
    closeAll()
    try { sessionStorage.setItem(UIKIT_GUIDE_KEY, '1') } catch { /* ignore */ }
    navigate('/color')
  }
  // On marketing/sales routes there's nothing to export, so the bar leads with
  // the conversion pill instead of the Export shell.
  const isSalesPage = SALES_PATHS.has((location.pathname || '/').replace(/\/+$/, '') || '/')
  const [open, setOpen] = useState(null) // active mega-menu section id, or null
  const [menu, setMenu] = useState(null) // 'account' | null (merged profile + settings popover)
  const [sheet, setSheet] = useState(false) // mobile sheet open
  const [sheetSection, setSheetSection] = useState('create') // expanded accordion
  const [scrolled, setScrolled] = useState(false)
  // Sales pages hide the signed-out "Start for Free" pill until the visitor has
  // scrolled down to section 2 (#create); routes without that section show it
  // straight away.
  const [ctaReady, setCtaReady] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const navRef = useRef(null)
  const menuRef = useRef(null)
  const closeTimer = useRef(null)
  // If opening/closing the menu ever shifts layout under a stationary cursor,
  // Chrome re-fires mouseenter for whichever trigger lands there, flipping the
  // menu the user never pointed at. Arm this lock on any open/close and ignore
  // hover-opens until a real mousemove proves the cursor actually travelled.
  const hoverLock = useRef(false)
  // How the current mega-menu got opened ('hover' | 'click') — a click on a
  // hover-opened trigger must pin the menu, not toggle it shut (see toggle()).
  const openedBy = useRef(null)

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  const avatarUrl = userProfile?.photoURL || ''
  const displayName = userProfile?.displayName || user?.email?.split('@')[0] || 'Account'
  const accountEmail = userProfile?.email || user?.email || ''
  const initialsStr = initials(userProfile, user)

  // Firm up the bar (opaque glass + shadow) once the page scrolls; listener
  // only, no state-in-effect.
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12)
      const sec = document.getElementById('create')
      setCtaReady(!sec || window.scrollY + window.innerHeight * 0.6 >= sec.offsetTop)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.pathname])

  // Close the desktop mega-menu and the gear/avatar popovers on outside pointer
  // or Escape. The popovers live inside the nav, so an inside pointer is ignored.
  useEffect(() => {
    const onPointer = (e) => {
      if (navRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      setOpen(null)
      setMenu(null)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(null); setSheet(false); setMenu(null) }
      // "/" opens search — but never while the visitor is typing in a field.
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = e.target
        const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
        if (!typing) {
          e.preventDefault()
          setOpen(null); setMenu(null); setSheet(false); setSearchOpen(true)
        }
      }
    }
    // Any genuine cursor movement releases the hover lock (see hoverLock above).
    const onMove = () => { hoverLock.current = false }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousemove', onMove)
    }
  }, [])

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    if (!sheet) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [sheet])

  const clearClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null } }
  const hoverOpen = (id) => {
    clearClose()
    if (hoverLock.current) return
    if (open === null) hoverLock.current = true
    openedBy.current = 'hover'
    setMenu(null)
    setOpen(id)
  }
  const hoverLeave = () => { clearClose(); closeTimer.current = setTimeout(() => setOpen(null), 120) }
  const toggle = (id) => {
    hoverLock.current = true
    setMenu(null)
    setOpen((cur) => {
      // Hover already opened this menu, so the user's click means "open it" —
      // closing here makes the menu flash shut under the click. Pin it open
      // instead; the NEXT click (now 'click'-owned) toggles it closed.
      if (cur === id && openedBy.current === 'hover') {
        openedBy.current = 'click'
        return cur
      }
      openedBy.current = 'click'
      return cur === id ? null : id
    })
  }
  const toggleMenu = (which) => { setOpen(null); setMenu((cur) => (cur === which ? null : which)) }
  const closeAll = () => { setOpen(null); setSheet(false); setMenu(null) }
  const openSearch = () => { closeAll(); setSearchOpen(true) }
  const openExport = () => { closeAll(); setExportOpen(true) }
  const onSignOut = () => { setMenu(null); logout() }

  // Other accounts previously signed in on this device (display data only —
  // switching re-authenticates through Firebase, see AuthContext).
  const otherAccounts = (knownAccounts || []).filter((a) => a.uid !== user?.uid)
  const onSwitchAccount = async (acct) => {
    closeAll()
    const res = await switchAccount(acct)
    if (res?.needsLogin) {
      // Password account, or the Google popup was dismissed — finish on /login
      // with the email prefilled and return the user here afterwards.
      navigate('/login', { state: { email: res.email, from: location.pathname } })
    }
  }

  const activeSection = NAV_SECTIONS.find((s) => s.id === open) || null
  // Mobile sheet promo = the currently-expanded accordion's promo (or none).
  const sheetPromo = NAV_SECTIONS.find((s) => s.id === sheetSection)?.promo || null

  return (
    <>
      <nav
        ref={navRef}
        className={'pnav' + (scrolled ? ' is-scrolled' : '') + (open || menu ? ' is-expanded' : '') + (isSalesPage ? ' pnav--sales' : '')}
        aria-label="Primary"
        onMouseLeave={hoverLeave}
      >
        <div className="pnav-inner">
          <div className="pnav-lead">
            <Link className="pnav-logo" to="/home" onClick={closeAll} aria-label="UIL4B home">
              <span className="pnav-word">UIL4B</span>
            </Link>

            {/* Search — lives beside the logo so the three section menus can sit
                dead-centre in the bar. Clicking it opens the full command
                palette, which reuses the same search index. On sales routes the
                field hides on desktop (the bar leads with the three menus +
                Get Pro); the / shortcut still works. */}
            <div className="pnav-search">
              <button
                type="button"
                className="pnav-search-field"
                aria-haspopup="dialog"
                aria-expanded={searchOpen}
                aria-label="Search UIL4B"
                onClick={openSearch}
              >
                <SearchIcon />
                <span className="pnav-search-ph">Search tools&hellip;</span>
                <kbd className="pnav-search-kbd" aria-hidden="true">/</kbd>
              </button>
            </div>
          </div>

          {/* The three section menus — centred in the bar (grid middle column). */}
          <div className="pnav-items">
            {NAV_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className="pnav-trigger"
                aria-expanded={open === section.id}
                aria-haspopup="true"
                onClick={() => toggle(section.id)}
                onMouseEnter={() => hoverOpen(section.id)}
              >
                {section.label}
                <Chevron />
              </button>
            ))}
          </div>

          <div className="pnav-actions">
            {/* Right cluster (Mobbin reference): always-visible icon-only
                buttons — Saved projects (bookmark), then Export — ahead of the
                conversion pill and the avatar. On marketing/sales routes
                there's nothing to export, so the Export shell is dropped and
                the bar leads with "Get Pro" instead. */}
            {user && (
              <Link
                className="pnav-iconbtn"
                to="/projects"
                aria-label="Saved projects"
                title="Saved projects"
                onClick={closeAll}
              >
                <BookmarkIcon />
              </Link>
            )}
            {!isSalesPage && (
              <button
                type="button"
                className="pnav-iconbtn pnav-export"
                aria-haspopup="dialog"
                aria-expanded={exportOpen}
                aria-label="Export"
                title="Export"
                onClick={openExport}
              >
                <ExportIcon />
              </button>
            )}

            {/* Conversion + auth CTAs — always visible on the fixed bar. Sales
                pages label the upgrade path "Get Pro" (the primary action there);
                app routes call it "Upgrade". */}
            {user && !isPro && (
              isSalesPage ? (
                <Link className="ui-pill ui-pill-accent ui-pill-sm" to="/plans" onClick={closeAll}>
                  Get Pro
                </Link>
              ) : (
                <Link className="ui-pill ui-pill-accent ui-pill-sm" to="/plans" onClick={closeAll}>
                  Upgrade
                </Link>
              )
            )}

            {!user && (
              <>
                <Link className="ui-pill ui-pill-ghost ui-pill-sm" to="/login" onClick={closeAll}>
                  Log in
                </Link>
                <Link
                  className={'ui-pill ui-pill-accent ui-pill-sm pnav-cta' + (ctaReady ? '' : ' is-waiting')}
                  to="/login"
                  onClick={closeAll}
                  tabIndex={ctaReady ? undefined : -1}
                  aria-hidden={ctaReady ? undefined : 'true'}
                >
                  Start for Free
                </Link>
              </>
            )}

            {/* Profile — hovering the avatar darkens/blurs the photo and overlays
                a settings cog to signal that account AND preferences live behind
                it. It opens the merged account+settings popover. */}
            {user && (
              <div className="pnav-util">
                <div className="pnav-pop-wrap">
                  <button
                    type="button"
                    className="pnav-avatar-btn"
                    aria-haspopup="true"
                    aria-expanded={menu === 'account'}
                    aria-label="Account and settings"
                    onClick={() => toggleMenu('account')}
                  >
                    {avatarUrl ? (
                      <img className="pnav-avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="pnav-avatar" aria-hidden="true">{initialsStr}</span>
                    )}
                    <span className="pnav-avatar-cog" aria-hidden="true">
                      <GearIcon />
                    </span>
                  </button>
                  {menu === 'account' && (
                    <div className="pnav-pop pnav-pop--account" role="menu" aria-label="Account and settings">
                      <div className="pnav-pop-id">
                        {avatarUrl ? (
                          <img className="pnav-pop-avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="pnav-pop-avatar" aria-hidden="true">{initialsStr}</span>
                        )}
                        <span className="pnav-pop-id-text">
                          <span className="pnav-pop-id-name">
                            {displayName}
                            {isPro && <em className="pnav-pop-tag">Pro</em>}
                          </span>
                          {accountEmail && <span className="pnav-pop-id-email">{accountEmail}</span>}
                        </span>
                      </div>
                      <div className="pnav-pop-sep" />
                      <p className="pnav-pop-head">Appearance</p>
                      <ThemeSeg theme={theme} setTheme={setTheme} />
                      <div className="pnav-pop-sep" />
                      <Link className="pnav-pop-item" role="menuitem" to="/settings" onClick={closeAll}>
                        <GearIcon />
                        <span>Account &amp; settings</span>
                      </Link>
                      <Link className="pnav-pop-item" role="menuitem" to={isPro ? '/settings' : '/plans'} state={isPro ? { section: 'support' } : undefined} onClick={closeAll}>
                        <TagIcon />
                        <span>{isPro ? 'Manage plan' : 'Plans & upgrade'}</span>
                      </Link>
                      <Link className="pnav-pop-item" role="menuitem" to="/help" onClick={closeAll}>
                        <HelpIcon />
                        <span>Help centre</span>
                      </Link>
                      <Link className="pnav-pop-item" role="menuitem" to="/feedback" onClick={closeAll}>
                        <FeedbackIcon />
                        <span>Send feedback</span>
                      </Link>
                      {isAdmin && (
                        <Link className="pnav-pop-item" role="menuitem" to="/admin" onClick={closeAll}>
                          Admin dashboard
                        </Link>
                      )}
                      {otherAccounts.length > 0 && (
                        <>
                          <div className="pnav-pop-sep" />
                          <p className="pnav-pop-head">Switch account</p>
                          {otherAccounts.map((acct) => (
                            <button key={acct.uid} type="button" className="pnav-pop-item pnav-pop-acct" role="menuitem" onClick={() => onSwitchAccount(acct)}>
                              {acct.photoURL ? (
                                <img className="pnav-pop-acct-avatar" src={acct.photoURL} alt="" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="pnav-pop-acct-avatar" aria-hidden="true">{initials(acct, acct)}</span>
                              )}
                              <span className="pnav-pop-acct-text">
                                <span className="pnav-pop-acct-name">{acct.displayName || acct.email.split('@')[0] || 'Account'}</span>
                                {acct.email && <span className="pnav-pop-acct-email">{acct.email}</span>}
                              </span>
                            </button>
                          ))}
                        </>
                      )}
                      <div className="pnav-pop-sep" />
                      <button type="button" className="pnav-pop-item pnav-pop-item--danger" role="menuitem" onClick={onSignOut}>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Compact "more" affordance — signed-out only. Signed-in users get the
                always-visible avatar instead (Mobbin pattern), so the meatball here
                carries the theme toggle + auth links so preferences stay reachable
                for visitors. */}
            {!user && (
              <div className="pnav-pop-wrap pnav-more-wrap">
                <button
                  type="button"
                  className="pnav-more"
                  aria-haspopup="true"
                  aria-expanded={menu === 'account'}
                  aria-label="Menu"
                  onClick={() => toggleMenu('account')}
                >
                  <MeatballIcon />
                </button>
                {menu === 'account' && (
                  <div className="pnav-pop" aria-label="Menu">
                    <p className="pnav-pop-head">Appearance</p>
                    <ThemeSeg theme={theme} setTheme={setTheme} />
                    <div className="pnav-pop-sep" />
                    <button type="button" className="pnav-pop-item" onClick={openSearch}>
                      <SearchIcon />
                      <span>Search tools</span>
                      <kbd className="pnav-search-kbd pnav-pop-kbd" aria-hidden="true">/</kbd>
                    </button>
                    <Link className="pnav-pop-item" to="/plans" onClick={closeAll}>
                      <TagIcon />
                      <span>Pricing &amp; plans</span>
                    </Link>
                    <Link className="pnav-pop-item" to="/help" onClick={closeAll}>
                      <HelpIcon />
                      <span>Help centre</span>
                    </Link>
                    <Link className="pnav-pop-item" to="/feedback" onClick={closeAll}>
                      <FeedbackIcon />
                      <span>Send feedback</span>
                    </Link>
                    <div className="pnav-pop-sep" />
                    <Link className="pnav-pop-item" to="/login" onClick={closeAll}>
                      <LoginArrowIcon />
                      <span>Log in</span>
                    </Link>
                    <Link className="pnav-pop-item pnav-pop-item--accent" to="/login" onClick={closeAll}>
                      <SparkIcon />
                      <span>Start for Free</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="pnav-mobile"
              aria-label={sheet ? 'Close menu' : 'Open menu'}
              aria-expanded={sheet}
              onClick={() => setSheet((s) => !s)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                {sheet ? (
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Desktop mega-menu: one shared panel, morphs width per section, with a
          data-driven promo card on the right. */}
      {activeSection && (
        <div
          ref={menuRef}
          className="pnav-menu"
          data-menu={activeSection.id}
          role="region"
          aria-label={`${activeSection.label} menu`}
          onMouseEnter={clearClose}
          onMouseLeave={hoverLeave}
        >
          <div className="pnav-menu-body">
            <div className="pnav-menu-cols">
              <div className="pnav-grid">
                {/* Each stack = one grid column; a stack can hold several
                    captioned groups top-to-bottom (Create: Icons above
                    Media & AI) so a small subcategory never forces an extra
                    cramped grid column. */}
                {activeSection.columns.map((stack) => (
                  <div className="pnav-colstack" key={stack[0].label}>
                    {stack.map((col) => (
                      <div className="pnav-col" key={col.label}>
                        <p className="pnav-col-label">{col.label}</p>
                        <ul className="pnav-toollist">
                          {col.tools.map((t) => (
                            <li key={t.id}>
                              <Link
                                className="pnav-tool"
                                to={t.route}
                                data-hue={t.hue}
                                data-soon={t.soon ? 'true' : undefined}
                                aria-label={t.soon ? `${t.label} — coming soon` : undefined}
                                onClick={closeAll}
                              >
                                <span className="pnav-tool-ico" aria-hidden="true"><NavIcon id={t.icon} /></span>
                                <span className="pnav-tool-label">{t.label}</span>
                                {t.soon && <span className="soon-badge">Soon</span>}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
                <Link className="pnav-viewall" to={activeSection.viewAllHref} onClick={closeAll}>
                  View all {activeSection.label} tools <span aria-hidden="true">→</span>
                </Link>
              </div>
              {activeSection.promo && (
                <aside className="pnav-promo">
                  <div className="pnav-promo-visual" aria-hidden="true"><PromoMock section={activeSection.id} /></div>
                  <span className="pnav-promo-eyebrow">{activeSection.promo.eyebrow}</span>
                  <p className="pnav-promo-title">{activeSection.promo.title}</p>
                  <p className="pnav-promo-blurb">{activeSection.promo.blurb}</p>
                  <div className="pnav-promo-actions">
                    {activeSection.promo.guide ? (
                      <>
                        <button type="button" className="ui-pill ui-pill-accent ui-pill-sm" onClick={launchBrandKit}>
                          {activeSection.promo.cta || 'Start building'}
                        </button>
                        <Link className="ui-pill ui-pill-ghost ui-pill-sm" to={activeSection.promo.href} onClick={closeAll}>Learn more</Link>
                      </>
                    ) : (
                      <>
                        <Link className="ui-pill ui-pill-ghost ui-pill-sm" to={activeSection.promo.href} onClick={closeAll}>Learn more</Link>
                        <Link className="ui-pill ui-pill-accent ui-pill-sm" to={activeSection.promo.docsHref} onClick={closeAll}>View docs</Link>
                      </>
                    )}
                  </div>
                </aside>
              )}
            </div>
          </div>
          <div className="pnav-menu-foot">
            <span className="pnav-menu-foot-note">Every {activeSection.label} tool · one workspace</span>
            <Link className="pnav-menu-foot-link" to="/home" onClick={closeAll}>
              How UIL4B works &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Mobile sheet */}
      {sheet && (
        <div className="pnav-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          {NAV_SECTIONS.map((section) => {
            const expanded = sheetSection === section.id
            return (
              <div className="pnav-acc" key={section.id}>
                <button
                  type="button"
                  className="pnav-acc-trigger"
                  aria-expanded={expanded}
                  onClick={() => setSheetSection(expanded ? '' : section.id)}
                >
                  {section.label}
                  <Chevron />
                </button>
                {expanded && (
                  <div className="pnav-acc-panel">
                    {section.columns.flat().map((col) => (
                      <div className="pnav-acc-col" key={col.label}>
                        <p className="pnav-acc-colhead">{col.label}</p>
                        {col.tools.map((t) => (
                          <Link
                            key={t.id}
                            className="pnav-acc-link"
                            to={t.route}
                            data-hue={t.hue}
                            data-soon={t.soon ? 'true' : undefined}
                            aria-label={t.soon ? `${t.label} — coming soon` : undefined}
                            onClick={closeAll}
                          >
                            <span className="pnav-acc-ico" aria-hidden="true">
                              <NavIcon id={t.icon} />
                            </span>
                            <span className="pnav-acc-label">{t.label}</span>
                            {t.soon && <span className="soon-badge">Soon</span>}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {sheetPromo && (
            <div className="pnav-sheet-promo">
              <span className="pnav-promo-eyebrow">{sheetPromo.eyebrow}</span>
              <p className="pnav-promo-title">{sheetPromo.title}</p>
              <p className="pnav-promo-blurb">{sheetPromo.blurb}</p>
              <div className="pnav-promo-actions">
                {sheetPromo.guide ? (
                  <>
                    <button type="button" className="ui-pill ui-pill-accent ui-pill-sm" onClick={launchBrandKit}>
                      {sheetPromo.cta || 'Start building'}
                    </button>
                    <Link className="ui-pill ui-pill-ghost ui-pill-sm" to={sheetPromo.href} onClick={closeAll}>Learn more</Link>
                  </>
                ) : (
                  <>
                    <Link className="ui-pill ui-pill-ghost ui-pill-sm" to={sheetPromo.href} onClick={closeAll}>Learn more</Link>
                    <Link className="ui-pill ui-pill-accent ui-pill-sm" to={sheetPromo.docsHref} onClick={closeAll}>View docs</Link>
                  </>
                )}
              </div>
            </div>
          )}
          <div className="pnav-sheet-cta">
            {user ? (
              <Link className="ui-pill ui-pill-accent ui-pill-lg ui-pill-block" to="/settings" onClick={closeAll}>
                Account
              </Link>
            ) : (
              <>
                <Link className="ui-pill ui-pill-accent ui-pill-lg ui-pill-block" to="/login" onClick={closeAll}>
                  Start for Free
                </Link>
                <Link className="ui-pill ui-pill-out ui-pill-lg ui-pill-block" to="/login" onClick={closeAll}>
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {searchOpen && (
        <Suspense fallback={null}>
          <CommandPalette open onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
      {exportOpen && (
        <Suspense fallback={null}>
          <ExportPanel onClose={() => setExportOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
