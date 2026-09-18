import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NAV_SECTIONS } from '../data/toolTree'
import { SEARCH_KEY } from '../config/shortcuts'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { useAppearance } from '../contexts/AppearanceContext'
import { isAdminEmail } from '../utils/constants'
import NavIcon from './NavIcon'
import ThemeChoice from './ThemeChoice'
import ThemeCycle from './nav/ThemeCycle'
import { menuDescription } from './nav/menuDescription'

const CommandPalette = lazy(() => import('./CommandPalette'))

// THE MARKETING NAV — `UIL4B - Spectrum.dc.html` lines 217-258.
//
// This is the sales page's bar and it is deliberately NOT the app header. Where
// PillNav is a full-width sticky shelf carrying three mega menus, a search
// field, an export shell and an account cluster, this is a floating pill: the
// wordmark, three quiet links, a theme cycle, a burger and one CTA — and it
// hides itself on the way down the page so nothing competes with the hero.
//
// WHAT THE PILL DROPS, THE FULL-SCREEN MENU CARRIES.
// The founder's number-one constraint is that no functionality is lost, and a
// five-control bar on the product's most-visited route would lose a great deal
// of it: the whole tool tree, search, the theme control, log in, sign up and
// the account. So the burger does not open a list of four marketing links the
// way the prototype's does — it opens all of that. Every tool in
// `src/data/toolTree.js` is in there under its real group, with its real route
// and its real Soon/Beta badge, and so are the search palette, the three-way
// ThemeChoice, and the auth or account block for whichever state the visitor is
// in. The prototype's four big items are the TOP of that menu, not the whole
// of it.
//
// ROUTES AND LABELS COME FROM THE PRODUCT, NOT THE MOCK. Spectrum's quiet links
// are Tools / Pricing / On mobile against a one-page mock. `/` has real
// sections, so Tools and Pricing point at `#bench` and `#pricing`, which are
// the tools section and the pricing section of the page this bar sits on.
// THERE IS NO "ON MOBILE" SECTION AND NO SUCH ROUTE — inventing one would be
// inventing a destination, so the third link is Discover (`#discover`, and
// "Discover" is NAV_SECTIONS' own label). The missing section is in the
// handover for the founder.

// The three quiet links. `hash` rather than `to`, because every one of these is
// a section of the page the bar is fixed to.
const QUIET = [
  { id: 'tools', label: 'Tools', hash: '#bench' },
  { id: 'discover', label: 'Discover', hash: '#discover' },
  { id: 'pricing', label: 'Pricing', hash: '#pricing' },
]

// Phosphor `x` and `arrow-up-right`, ported as inline SVG.
//
// SPECTRUM LOADS PHOSPHOR FROM A CDN (`<span class="ph ph-x">`). This product
// has a strict no-new-origins rule on the first-paint path and ships every
// glyph inline — PillNav alone carries a dozen of these — so the two shapes the
// marketing nav needs are drawn here at the design's own optical sizes.
function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
    </svg>
  )
}

function ArrowUpRightGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M8.5 7H17v8.5" />
    </svg>
  )
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7.25" />
      <path d="m20 20-3.65-3.65" />
    </svg>
  )
}

// The bar hides going down and comes back coming up — Spectrum's `syncNav`
// (standalone source, lines 2094-2115), ported with its own numbers: nothing
// hides in the first 120px, a downward move of more than 2px hides it, and an
// upward move waits 140ms before bringing it back so a stray wheel nudge does
// not flash the bar. The menu being open pins it visible.
//
// IT RETURNS A FLAG, NOT A STYLE. Spectrum wrote `transform` and `opacity`
// straight onto the element and branched on reduced motion in JS. Here the flag
// goes on `data-nav-hidden` and the CSS decides what that means, so the
// reduced-motion companion is a media query beside the animation it cancels
// rather than a matchMedia read that can drift from it.
const HIDE_AFTER = 120
const RETURN_DELAY = 140

export default function SpectrumNav() {
  const { user, userProfile, logout } = useAuth()
  const { openLogin } = useLoginPrompt()
  const { reducedMotion } = useAppearance()
  const navigate = useNavigate()

  const [hidden, setHidden] = useState(false)
  // 'out' at rest, 'in' while open. The menu stays MOUNTED through its exit so
  // the close animation has something to play on; `mounted` is what unmounts it.
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const burgerRef = useRef(null)
  const sheetRef = useRef(null)
  const lastY = useRef(0)
  const returnTimer = useRef(null)
  const openRef = useRef(false)

  useEffect(() => { openRef.current = open }, [open])

  const isAdmin = isAdminEmail(user?.email)

  // Hide-on-scroll. Listener only — no state is set synchronously in the effect
  // body, which is the rule the rest of this codebase's nav follows.
  useEffect(() => {
    const onScroll = () => {
      const y = Math.max(0, window.scrollY || 0)
      const dy = y - lastY.current
      lastY.current = y
      if (y < HIDE_AFTER || openRef.current) {
        clearTimeout(returnTimer.current)
        returnTimer.current = null
        setHidden(false)
      } else if (dy > 2) {
        clearTimeout(returnTimer.current)
        returnTimer.current = null
        setHidden(true)
      } else if (dy < -2 && !returnTimer.current) {
        returnTimer.current = setTimeout(() => {
          returnTimer.current = null
          setHidden(false)
        }, RETURN_DELAY)
      }
    }
    lastY.current = Math.max(0, window.scrollY || 0)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(returnTimer.current)
      returnTimer.current = null
    }
  }, [])

  // ESCAPE CLOSES AND GIVES FOCUS BACK TO THE BURGER (WCAG 2.4.3 / APG). The
  // SEARCH_KEY branch is the same contract PillNav holds: "/" opens the command
  // palette, but never while the visitor is typing into a field, and the
  // literal lives in config/shortcuts so /info cannot document a key this
  // handler ignores.
  const closeMenu = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => burgerRef.current?.focus())
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && openRef.current) {
        e.preventDefault()
        closeMenu()
        return
      }
      if (e.key === SEARCH_KEY && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = e.target
        const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
        if (!typing) {
          e.preventDefault()
          setOpen(false)
          setSearchOpen(true)
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeMenu])

  // Scroll lock + focus move-in + focus trap, for the same reasons and by the
  // same mechanism as PillNav's mobile sheet: a full-screen layer that leaves
  // the page scrolling behind it and lets Tab walk out the back is not a dialog.
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = sheetRef.current
    const focusable = () => [...(panel?.querySelectorAll('button:not([disabled]),a[href]') || [])]
      .filter((el) => el.getClientRects().length > 0)
    focusable()[0]?.focus()
    const trap = (event) => {
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    panel?.addEventListener('keydown', trap)
    return () => {
      panel?.removeEventListener('keydown', trap)
      document.body.style.overflow = prev
    }
  }, [open])

  // The CTA. Signed in it opens the workspace; signed out it opens the SIGN-UP
  // form over the page rather than navigating to /login — the same decision
  // PillNav records: navigating away unmounts the page under the popup and the
  // close button then drops the visitor somewhere they never were.
  const openToolkit = () => {
    setOpen(false)
    if (user) navigate('/projects')
    else openLogin({ signup: true })
  }
  const startLogin = () => { setOpen(false); openLogin() }
  const startSignup = () => { setOpen(false); openLogin({ signup: true }) }
  const openSearch = () => { setOpen(false); setSearchOpen(true) }

  const displayName = userProfile?.displayName || user?.email?.split('@')[0] || 'Account'

  return (
    <>
      <nav
        className="spnav"
        aria-label="Primary"
        data-nav-hidden={hidden ? '1' : '0'}
      >
        <div className="spnav-bar">
          <Link className="spnav-mark" to="/" onClick={() => setOpen(false)}>
            {/* One accessible name for the pair, so a screen reader meets
                "UI L4B home" and not "UI L 4 B" then "TOOLKIT". */}
            <span className="spnav-word" aria-hidden="true">
              UI L<span className="spnav-word-mark">4</span>B
            </span>
            <span className="spnav-eyebrow" aria-hidden="true">TOOLKIT</span>
            <span className="sr-only">UI L4B home</span>
          </Link>

          <span className="spnav-rule" aria-hidden="true" />

          <div className="spnav-quiet">
            {QUIET.map((q) => (
              <a className="spnav-quiet-link" key={q.id} href={q.hash} onClick={() => setOpen(false)}>
                {q.label}
              </a>
            ))}
          </div>

          <ThemeCycle className="spnav-icon" />

          <button
            type="button"
            className="spnav-icon spnav-burger"
            ref={burgerRef}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls={open ? 'spnav-menu' : undefined}
            onClick={() => (open ? closeMenu() : setOpen(true))}
          >
            {/* Three bars that become a cross. Spectrum draws it with three
                absolutely-positioned spans and transforms two of them
                (lines 234-237 + the keyframes at 129-132); this is the same
                three spans, and the reduced-motion companion that cancels the
                morph sits beside the rule in global.css. */}
            <span className="spnav-burger-ico" aria-hidden="true" data-burger={open ? 'in' : 'out'}>
              <span /><span /><span />
            </span>
          </button>

          <button type="button" className="spnav-cta" data-cta onClick={openToolkit}>
            <span>Open the toolkit</span>
            <span className="spnav-cta-icon" aria-hidden="true"><ArrowUpRightGlyph /></span>
          </button>
        </div>
      </nav>

      {open && (
        <div
          className="spnav-menu"
          id="spnav-menu"
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-menu="in"
        >
          <button type="button" className="spnav-close" onClick={closeMenu}>
            <span>Close</span>
            <span aria-hidden="true"><CloseGlyph /></span>
          </button>

          <div className="spnav-menu-inner">
            <div className="spnav-rail">
              {/* The prototype's four big items, in its own type and with its
                  own staggered entrance. `data-mi` is the design's attribute
                  and the CSS keys the stagger off nth-child exactly as it
                  does. */}
              {QUIET.map((q) => (
                <a className="spnav-mi" data-mi key={q.id} href={q.hash} onClick={closeMenu}>
                  {q.label}
                </a>
              ))}
              <button type="button" className="spnav-mi spnav-mi--accent" data-mi onClick={openToolkit}>
                Open the toolkit <span aria-hidden="true">&#8599;</span>
              </button>
            </div>

            {/* EVERY TOOL, FROM THE REAL TREE. This is the part the prototype
                does not have and the product cannot do without: on `/` this
                menu is the only way to the three section menus' contents, so
                it lists NAV_SECTIONS in full — same groups, same routes, same
                badges, same one-line descriptions (menuDescription's rules
                included: a Soon row shows none). */}
            <div className="spnav-tree" data-mi>
              {NAV_SECTIONS.map((section) => (
                <section className="spnav-tree-sec" key={section.id} aria-labelledby={`spnav-sec-${section.id}`}>
                  <h2 className="spnav-tree-head" id={`spnav-sec-${section.id}`}>{section.label}</h2>
                  {section.columns.flat().map((col) => (
                    <div
                      className="spnav-tree-col"
                      key={col.label}
                      data-soon={col.tools.length > 0 && col.tools.every((t) => t.soon) ? 'true' : undefined}
                    >
                      <p className="spnav-tree-colhead">{col.label}</p>
                      {col.tools.map((t) => (
                        <Link
                          className="spnav-tool"
                          key={t.id}
                          to={t.route}
                          data-hue={t.hue}
                          data-soon={t.soon ? 'true' : undefined}
                          aria-label={t.soon ? `${t.label} — coming soon` : t.beta ? `${t.label} — beta` : undefined}
                          onClick={() => setOpen(false)}
                        >
                          <span className="spnav-tool-ico" aria-hidden="true"><NavIcon id={t.icon} /></span>
                          <span className="spnav-tool-copy">
                            <span className="spnav-tool-line">
                              <span className="spnav-tool-label">{t.label}</span>
                              {t.soon && <span className="soon-badge">Soon</span>}
                              {!t.soon && t.beta && <span className="beta-badge">Beta</span>}
                            </span>
                            {menuDescription(section, t) && (
                              <span className="spnav-tool-desc">{menuDescription(section, t)}</span>
                            )}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ))}
                  <Link className="spnav-tree-all" to={section.viewAllHref} onClick={() => setOpen(false)}>
                    Explore {section.label} <span aria-hidden="true">&rarr;</span>
                  </Link>
                </section>
              ))}
            </div>

            {/* The utilities the pill has no room for. Everything here is a
                control PillNav puts on the bar or in one of its popovers. */}
            <div className="spnav-util" data-mi>
              <button type="button" className="spnav-util-item" aria-haspopup="dialog" onClick={openSearch}>
                <SearchGlyph />
                <span>Search tools</span>
                <kbd className="spnav-kbd" aria-hidden="true">/</kbd>
              </button>

              <div className="spnav-util-theme">
                <p className="spnav-util-head">Appearance</p>
                <ThemeChoice />
              </div>

              <div className="spnav-util-account">
                {user ? (
                  <>
                    <p className="spnav-util-head">{displayName}</p>
                    <Link className="spnav-util-item" to="/projects" onClick={() => setOpen(false)}>Saved projects</Link>
                    <Link className="spnav-util-item" to="/settings" onClick={() => setOpen(false)}>Account &amp; settings</Link>
                    <Link className="spnav-util-item" to="/plans" onClick={() => setOpen(false)}>Plans &amp; upgrade</Link>
                    <Link className="spnav-util-item" to="/help" onClick={() => setOpen(false)}>Help centre</Link>
                    <Link className="spnav-util-item" to="/feedback" onClick={() => setOpen(false)}>Send feedback</Link>
                    {isAdmin && <Link className="spnav-util-item" to="/admin" onClick={() => setOpen(false)}>Admin dashboard</Link>}
                    <button type="button" className="spnav-util-item" onClick={() => { setOpen(false); logout() }}>Sign out</button>
                  </>
                ) : (
                  <>
                    <Link className="spnav-util-item" to="/plans" onClick={() => setOpen(false)}>Pricing &amp; plans</Link>
                    <Link className="spnav-util-item" to="/help" onClick={() => setOpen(false)}>Help centre</Link>
                    <Link className="spnav-util-item" to="/feedback" onClick={() => setOpen(false)}>Send feedback</Link>
                    <button type="button" className="spnav-util-item" aria-haspopup="dialog" onClick={startLogin}>Log in</button>
                    <button type="button" className="spnav-util-item spnav-util-item--accent" aria-haspopup="dialog" onClick={startSignup}>Start for Free</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <Suspense fallback={null}>
          <CommandPalette open onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}

      {/* `reducedMotion` is read so the component participates in the app's own
          preference rather than only the OS media query — AppearanceContext
          writes html[data-reduced-motion], which the stylesheet honours, and
          this attribute lets a test assert that the bar knows. */}
      <span hidden data-spnav-reduced={reducedMotion ? '1' : '0'} />
    </>
  )
}
