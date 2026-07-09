import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { NAV_SECTIONS } from '../data/toolTree'
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

// The rebuilt marketing / app nav: a floating pill bar with three mega-menus
// (Create / Discover / Learn) driven entirely by src/data/toolTree.js, so the
// menu can never drift from the router. One shared panel morphs width per
// section (Coolors-footer homage) and carries a right-hand promo card; on mobile
// it becomes a full-screen sheet with accordions. The right cluster holds a
// hover-expand search (reusing the CommandPalette index), an Export shell, a Gear
// quick-preferences popover (day/night + link to full Settings) and an Avatar
// account popover. Auth + subscription are read ONLY — to decide account vs.
// upgrade CTA and to gate the admin link's *visibility* — never written here.
//
// State is set exclusively from user events (click / hover / scroll / key), never
// synchronously inside an effect, so we stay clear of the `set-state-in-effect`
// advisory. Effects only attach/detach listeners.

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
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M12 15V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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

// Initials for the avatar fallback when a user has no profile photo.
function initials(profile, user) {
  const src = profile?.displayName || user?.email || ''
  const parts = src.trim().split(/[\s@.]+/).filter(Boolean)
  const first = parts[0]?.[0] || 'U'
  const second = parts.length > 1 ? parts[1][0] : ''
  return (first + second).toUpperCase()
}

// A "Soon" badge for any nav entry still under construction (Phase 1 = all bar
// Icons & Emoji). The accent variant marks the conversion-adjacent Help entry.
function SoonBadge({ accent }) {
  return <span className={accent ? 'soon-badge soon-badge-accent' : 'soon-badge'}>Soon</span>
}

// One nav group. The head is an icon tile (hue-tinted) beside a title/description
// column; Create groups then list their sub-tools underneath. Discover / Learn
// groups have no sub-tools, so they render as a self-contained card that lifts on
// hover — the whole tile is the click target.
//
// Soon signalling matches what the router ACTUALLY does: a whole category flagged
// `soon` routes every one of its tools to the 🤫 state (see CreateTool.jsx), so a
// tool reads as coming-soon whenever `group.soon || tool.soon`. The category title
// carries the single "Soon" badge; each tool then shows a status dot — filled in
// its category hue when it's live, hollow when it's still coming — so live vs.
// upcoming is legible at a glance without stamping a redundant pill on every row.
// The per-tool "Soon" pill only appears in the mixed case (a live category with an
// individual tool still unbuilt), which is where the extra signal actually helps.
function MenuGroup({ group, onNavigate }) {
  const hasTools = Array.isArray(group.tools) && group.tools.length > 0
  return (
    <div
      className={hasTools ? 'pnav-group' : 'pnav-group pnav-group--card'}
      data-hue={group.hue || (group.accent ? 'accent' : undefined)}
    >
      <Link className="pnav-group-head" to={group.home || group.route} onClick={onNavigate}>
        <span className="pnav-ico" aria-hidden="true">
          <NavIcon id={group.id} />
        </span>
        <span className="pnav-group-text">
          <span className="pnav-group-title">
            {group.label}
            {group.soon && <SoonBadge accent={group.accent} />}
          </span>
          {group.desc && <span className="pnav-group-desc">{group.desc}</span>}
        </span>
      </Link>
      {hasTools && (
        <ul className="pnav-sub">
          {group.tools.map((tool) => {
            const soon = group.soon || tool.soon
            return (
              <li key={tool.id}>
                <Link
                  className="pnav-sublink"
                  to={tool.route}
                  data-soon={soon ? 'true' : undefined}
                  aria-label={soon ? `${tool.label} — coming soon` : undefined}
                  onClick={onNavigate}
                >
                  <span className="pnav-sub-dot" aria-hidden="true" />
                  <span className="pnav-sub-label">{tool.label}</span>
                  {tool.soon && !group.soon && <SoonBadge />}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function PillNav() {
  const { user, userProfile, logout } = useAuth()
  const { isPro } = useSubscription()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(null) // active mega-menu section id, or null
  const [menu, setMenu] = useState(null) // 'gear' | 'avatar' | null
  const [sheet, setSheet] = useState(false) // mobile sheet open
  const [sheetSection, setSheetSection] = useState('create') // expanded accordion
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const navRef = useRef(null)
  const menuRef = useRef(null)
  const closeTimer = useRef(null)

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  const avatarUrl = userProfile?.photoURL || ''
  const displayName = userProfile?.displayName || user?.email?.split('@')[0] || 'Account'
  const accountEmail = userProfile?.email || user?.email || ''
  const initialsStr = initials(userProfile, user)

  // Shrink the bar once the page scrolls; listener only, no state-in-effect.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
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
  const hoverOpen = (id) => { clearClose(); setMenu(null); setOpen(id) }
  const hoverLeave = () => { clearClose(); closeTimer.current = setTimeout(() => setOpen(null), 120) }
  const toggle = (id) => { setMenu(null); setOpen((cur) => (cur === id ? null : id)) }
  const toggleMenu = (which) => { setOpen(null); setMenu((cur) => (cur === which ? null : which)) }
  const closeAll = () => { setOpen(null); setSheet(false); setMenu(null) }
  const openSearch = () => { closeAll(); setSearchOpen(true) }
  const openExport = () => { closeAll(); setExportOpen(true) }
  const onSignOut = () => { setMenu(null); logout() }

  const activeSection = NAV_SECTIONS.find((s) => s.id === open) || null

  return (
    <>
      <nav
        ref={navRef}
        className={'pnav' + (scrolled ? ' is-scrolled' : '') + (open || menu ? ' is-expanded' : '')}
        aria-label="Primary"
        onMouseLeave={hoverLeave}
      >
        <div className="pnav-inner">
          <div className="pnav-lead">
            <Link className="pnav-logo" to="/home" onClick={closeAll} aria-label="UIL4B home">
              <span className="pnav-word">UIL4B</span>
            </Link>

            {/* Search + Export — revealed on pill hover / focus / when a menu is
                pinned open, sitting to the LEFT of the three triggers. */}
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
                <span className="pnav-search-ph">Search</span>
              </button>
              <button
                type="button"
                className="pnav-export"
                aria-haspopup="dialog"
                aria-expanded={exportOpen}
                onClick={openExport}
              >
                <ExportIcon />
                <span>Export</span>
              </button>
            </div>
          </div>

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
            {user && !isPro && (
              <Link className="ui-pill ui-pill-accent ui-pill-sm" to="/checkout" onClick={closeAll}>
                Upgrade
              </Link>
            )}

            {!user && (
              <>
                <Link className="ui-pill ui-pill-ghost ui-pill-sm" to="/login" onClick={closeAll}>
                  Log in
                </Link>
                <Link className="ui-pill ui-pill-accent ui-pill-sm" to="/login" onClick={closeAll}>
                  Get started
                </Link>
              </>
            )}

            {/* Utility cluster — settings + account sit hidden at rest and reveal
                as the whole pill expands on hover / focus (or when a menu is
                pinned open), so the resting bar stays minimal. */}
            <div className="pnav-util">
              {/* Gear — quick preferences (day/night + link to full settings) */}
              <div className="pnav-pop-wrap">
                <button
                  type="button"
                  className="pnav-icon-btn"
                  aria-haspopup="true"
                  aria-expanded={menu === 'gear'}
                  aria-label="Preferences"
                  onClick={() => toggleMenu('gear')}
                >
                  <GearIcon />
                </button>
                {menu === 'gear' && (
                  <div className="pnav-pop" aria-label="Preferences">
                    <p className="pnav-pop-head">Appearance</p>
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
                    <div className="pnav-pop-sep" />
                    <Link className="pnav-pop-item" to="/settings" onClick={closeAll}>
                      <GearIcon />
                      <span>All settings</span>
                    </Link>
                  </div>
                )}
              </div>

              {user && (
                /* Avatar — account menu */
                <div className="pnav-pop-wrap">
                  <button
                    type="button"
                    className="pnav-avatar-btn"
                    aria-haspopup="true"
                    aria-expanded={menu === 'avatar'}
                    aria-label="Account menu"
                    onClick={() => toggleMenu('avatar')}
                  >
                    {avatarUrl ? (
                      <img className="pnav-avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="pnav-avatar" aria-hidden="true">{initialsStr}</span>
                    )}
                  </button>
                  {menu === 'avatar' && (
                    <div className="pnav-pop pnav-pop--account" role="menu" aria-label="Account">
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
                      <Link className="pnav-pop-item" role="menuitem" to="/settings" onClick={closeAll}>
                        Account
                      </Link>
                      <Link className="pnav-pop-item" role="menuitem" to="/checkout" onClick={closeAll}>
                        {isPro ? 'Manage plan' : 'Plans & upgrade'}
                      </Link>
                      {isAdmin && (
                        <Link className="pnav-pop-item" role="menuitem" to="/admin" onClick={closeAll}>
                          Admin dashboard
                        </Link>
                      )}
                      <div className="pnav-pop-sep" />
                      <button type="button" className="pnav-pop-item pnav-pop-item--danger" role="menuitem" onClick={onSignOut}>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                {activeSection.groups.map((group) => (
                  <MenuGroup key={group.id} group={group} onNavigate={closeAll} />
                ))}
              </div>
              {activeSection.promo && (
                <aside className="pnav-promo">
                  <span className="pnav-promo-eyebrow">{activeSection.promo.eyebrow}</span>
                  <p className="pnav-promo-title">{activeSection.promo.title}</p>
                  <p className="pnav-promo-blurb">{activeSection.promo.blurb}</p>
                  <Link className="pnav-promo-cta" to={activeSection.promo.href} onClick={closeAll}>
                    {activeSection.promo.cta}
                    <span aria-hidden="true"> &rarr;</span>
                  </Link>
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
                    {section.groups.map((group) => (
                      <Link
                        key={group.id}
                        className="pnav-acc-link"
                        to={group.home || group.route}
                        data-hue={group.hue || (group.accent ? 'accent' : undefined)}
                        onClick={closeAll}
                      >
                        <span className="pnav-acc-ico" aria-hidden="true">
                          <NavIcon id={group.id} />
                        </span>
                        <span className="pnav-acc-label">{group.label}</span>
                        {group.soon && <SoonBadge accent={group.accent} />}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <div className="pnav-sheet-cta">
            {user ? (
              <Link className="ui-pill ui-pill-accent ui-pill-lg ui-pill-block" to="/settings" onClick={closeAll}>
                Account
              </Link>
            ) : (
              <>
                <Link className="ui-pill ui-pill-accent ui-pill-lg ui-pill-block" to="/login" onClick={closeAll}>
                  Get started
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
