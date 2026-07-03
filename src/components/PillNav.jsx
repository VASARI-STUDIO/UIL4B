import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { NAV_SECTIONS } from '../data/toolTree'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'

// The rebuilt marketing / app nav: a floating pill bar with three mega-menus
// (Create / Discover / Learn) driven entirely by src/data/toolTree.js, so the
// menu can never drift from the router. One shared panel morphs width per
// section (Coolors-footer homage); on mobile it becomes a full-screen sheet with
// accordions. Auth + subscription are read ONLY — to decide account vs. upgrade
// CTA — never written here.
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

// Initials for the avatar fallback when a user has no photo.
function initials(user) {
  const src = user?.displayName || user?.email || ''
  const parts = src.trim().split(/[\s@.]+/).filter(Boolean)
  const first = parts[0]?.[0] || 'U'
  const second = parts.length > 1 ? parts[1][0] : ''
  return (first + second).toUpperCase()
}

// A "Soon" badge for any nav entry still under construction (Phase 1 = all of
// them). The accent variant marks the conversion-adjacent Help entry.
function SoonBadge({ accent }) {
  return <span className={accent ? 'soon-badge soon-badge-accent' : 'soon-badge'}>Soon</span>
}

// One Create group: bold heading (links to the category home) + smaller sub-tool
// links. Discover / Learn groups have no sub-tools, so they render as a single
// headed link with a description.
function MenuGroup({ group, onNavigate }) {
  const hasTools = Array.isArray(group.tools) && group.tools.length > 0
  return (
    <div className="pnav-group" data-hue={group.hue || (group.accent ? 'accent' : undefined)}>
      <Link className="pnav-group-head" to={group.home || group.route} onClick={onNavigate}>
        <span className="fx-dot" aria-hidden="true" />
        <span className="pnav-group-title">{group.label}</span>
        {group.soon && <SoonBadge accent={group.accent} />}
      </Link>
      {group.desc && <p className="pnav-group-desc">{group.desc}</p>}
      {hasTools && (
        <ul className="pnav-sub">
          {group.tools.map((tool) => (
            <li key={tool.id}>
              <Link className="pnav-sublink" to={tool.route} data-soon={tool.soon} onClick={onNavigate}>
                {tool.label}
                {tool.soon && <SoonBadge />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function PillNav() {
  const { user } = useAuth()
  const { isPro } = useSubscription()
  const [open, setOpen] = useState(null) // active mega-menu section id, or null
  const [sheet, setSheet] = useState(false) // mobile sheet open
  const [sheetSection, setSheetSection] = useState('create') // expanded accordion
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef(null)
  const menuRef = useRef(null)
  const closeTimer = useRef(null)

  // Shrink the bar once the page scrolls; listener only, no state-in-effect.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the desktop mega-menu on outside pointer or Escape.
  useEffect(() => {
    const onPointer = (e) => {
      if (navRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      setOpen(null)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(null); setSheet(false) }
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
  const hoverOpen = (id) => { clearClose(); setOpen(id) }
  const hoverLeave = () => { clearClose(); closeTimer.current = setTimeout(() => setOpen(null), 120) }
  const toggle = (id) => setOpen((cur) => (cur === id ? null : id))
  const closeAll = () => { setOpen(null); setSheet(false) }

  const activeSection = NAV_SECTIONS.find((s) => s.id === open) || null

  return (
    <>
      <nav
        ref={navRef}
        className={scrolled ? 'pnav is-scrolled' : 'pnav'}
        aria-label="Primary"
        onMouseLeave={hoverLeave}
      >
        <div className="pnav-inner">
          <Link className="pnav-logo" to="/home" onClick={closeAll} aria-label="UIL4B home">
            <span className="pnav-glyph" aria-hidden="true">U</span>
            <span className="pnav-word">UIL4B</span>
          </Link>

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
            {user ? (
              <>
                {!isPro && (
                  <Link className="ui-pill ui-pill-accent ui-pill-sm" to="/checkout" onClick={closeAll}>
                    Upgrade
                  </Link>
                )}
                <Link className="pnav-account" to="/settings" onClick={closeAll}>
                  {user.photoURL ? (
                    <img className="pnav-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="pnav-avatar" aria-hidden="true">{initials(user)}</span>
                  )}
                  <span>{isPro ? 'Pro' : 'Account'}</span>
                </Link>
              </>
            ) : (
              <>
                <Link className="ui-pill ui-pill-ghost ui-pill-sm" to="/login" onClick={closeAll}>
                  Log in
                </Link>
                <Link className="ui-pill ui-pill-ink ui-pill-sm" to="/login" onClick={closeAll}>
                  Get started
                </Link>
              </>
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

      {/* Desktop mega-menu: one shared panel, morphs width per section. */}
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
            <div className="pnav-grid">
              {activeSection.groups.map((group) => (
                <MenuGroup key={group.id} group={group} onNavigate={closeAll} />
              ))}
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
                        <span className="fx-dot" aria-hidden="true" />
                        {group.label}
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
              <Link className="ui-pill ui-pill-ink ui-pill-lg ui-pill-block" to="/settings" onClick={closeAll}>
                Account
              </Link>
            ) : (
              <>
                <Link className="ui-pill ui-pill-ink ui-pill-lg ui-pill-block" to="/login" onClick={closeAll}>
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
    </>
  )
}
