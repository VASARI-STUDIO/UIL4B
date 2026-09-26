import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PH_ARROW_UP_RIGHT, PH_X } from './spectrum/phosphorNav'
import { crossRouteHashClick, landOnHash, normPath, onSalesPage, salesHref } from './spectrum/salesLinks'
import { useCloseOnBack } from './spectrum/useCloseOnBack'
import { getLenis } from '../hooks/useSmoothScroll'
import { SEARCH_KEY } from '../config/shortcuts'
import { useAppearance } from '../contexts/AppearanceContext'
import ThemeCycle from './nav/ThemeCycle'
import '../styles/pages/spectrum-chrome.css'

const CommandPalette = lazy(() => import('./CommandPalette'))

// THE MARKETING NAV — `UIL4B - Spectrum.dc.html` lines 217-258, reproduced.
//
// The design file is the spec, so this is its bar and its menu, not an
// adaptation of them:
//
//   · the pill — wordmark + TOOLKIT, a rule, the three quiet links, the theme
//     cycle, the burger and the "Open the toolkit" CTA (218-245);
//   · the quiet links are Tools / Pricing / On mobile (226-228), and the one
//     for the screen you are on is painted in ink (`navLanding` /
//     `navPricing` / `navMobile`, 2368-2371) and announced with aria-current;
//   · the full-screen menu is the four big items and the "EVERY CORE TOOL IS
//     FREE, FOREVER" note (248-257), with the design's stagger in and fade out.
//
// IT IS NOT A MEGA MENU: the menu is four items. Every tool is still reachable
// from this page: the bench, the hero's tool search, the footer's Tools column
// and its Sitemap link; the theme is the pill's cycle; signing in happens in
// the app, which "Open the toolkit" enters directly, with no sign-up gate.
// The "/" search shortcut still opens the command palette — it draws nothing.
//
// DESTINATIONS. Tools is the sales page's bench (`#bench`). Pricing is the
// separate Pricing screen, which is the route `/plans`. On mobile is the
// "mobile" screen, `/mobile`. Off the sales page, Tools goes to `/home#bench`
// and lands there (salesLinks.js).
const QUIET = [
  { id: 'tools', label: 'Tools', hash: '#bench' },
  { id: 'pricing', label: 'Pricing', to: '/plans' },
  { id: 'mobile', label: 'On mobile', to: '/mobile' },
]

// Which quiet link names the screen you are on. The sales page's own screen
// is Tools — the design's `goLanding`.
function activeQuiet(pathname) {
  const p = normPath(pathname)
  if (onSalesPage(p)) return 'tools'
  if (p === '/plans') return 'pricing'
  if (p === '/mobile') return 'mobile'
  return null
}

// The design's menu opens over .28s and closes over .24s with the items
// leaving over .2s, then unmounts after 260ms (`menuTimer`, line 2031). The
// same beat here, so the close animation has a layer to play on.
const MENU_EXIT_MS = 260

// Phosphor `x` and `arrow-up-right`, drawn from Phosphor's own outlines
// (phosphorNav.js) at the design's font-sizes, 14px and 12px. The design loads
// Phosphor from a CDN; this product adds no origin to the first paint.
function CloseGlyph() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d={PH_X} />
    </svg>
  )
}

function ArrowUpRightGlyph() {
  return (
    <svg viewBox="0 0 256 256" width="12" height="12" fill="currentColor" aria-hidden="true">
      <path d={PH_ARROW_UP_RIGHT} />
    </svg>
  )
}

// One quiet destination, as the element it has to be: a bare hash on the
// sales page is a plain anchor (Lenis scrolls it); anything that changes route
// is a router <Link>, so it never reloads the app. `current` is the design's
// "this is the screen you are on" — announced, and painted by .is-active.
//
// IN THE MENU (`mi`) a link must not leave a dead history step behind: the
// menu owns one entry while open (useCloseOnBack), so a route link REPLACES
// it, and a same-page section link swaps it for the section's URL and scrolls
// there itself (`onHash`) instead of pushing over it.
function QuietLink({ href, label, className, current, mi, onClick, onHash }) {
  const props = {
    className: current ? `${className} is-active` : className,
    onClick: crossRouteHashClick(href, onClick),
    'aria-current': current ? 'page' : undefined,
    'data-mi': mi ? '' : undefined,
  }
  return href.startsWith('#')
    ? <a href={href} {...props} onClick={onHash ? (e) => onHash(e, href) : props.onClick}>{label}</a>
    : <Link to={href} replace={mi} {...props}>{label}</Link>
}

// The bar hides going down and comes back coming up — the design's `syncNav`
// (lines 2094-2116), with its own numbers: nothing hides in the first 120px, a
// downward move of more than 2px hides it, and an upward move waits 140ms
// before bringing it back so a stray wheel nudge does not flash the bar. The
// menu being open pins it visible.
//
// IT RETURNS A FLAG, NOT A STYLE. The design wrote `transform` and `opacity`
// straight onto the element and branched on reduced motion in JS. Here the flag
// goes on `data-nav-hidden` and the CSS decides what that means, so the
// reduced-motion companion is a media query beside the animation it cancels.
const HIDE_AFTER = 120
const RETURN_DELAY = 140

export default function SpectrumNav() {
  const { reducedMotion } = useAppearance()
  const location = useLocation()
  const active = activeQuiet(location.pathname)
  const quietHref = (q) => q.to || salesHref(q.hash, location.pathname)

  const [hidden, setHidden] = useState(false)
  // 'closed' → 'in' while open → 'out' for the design's exit, then 'closed'.
  // The menu stays MOUNTED through 'out' so the close animation has something
  // to play on.
  const [menu, setMenu] = useState('closed')
  const open = menu === 'in'
  const setOpen = useCallback((next) => {
    setMenu((m) => (next ? 'in' : m === 'in' ? 'out' : m))
  }, [])
  const [searchOpen, setSearchOpen] = useState(false)

  const burgerRef = useRef(null)
  const sheetRef = useRef(null)
  const lastY = useRef(0)
  const returnTimer = useRef(null)
  const openRef = useRef(false)

  useEffect(() => { openRef.current = open }, [open])

  // The exit's unmount. Under reduced motion there is no exit to wait for.
  useEffect(() => {
    if (menu !== 'out') return undefined
    const t = setTimeout(() => setMenu((m) => (m === 'out' ? 'closed' : m)), reducedMotion ? 0 : MENU_EXIT_MS)
    return () => clearTimeout(t)
  }, [menu, reducedMotion])

  // A section link followed from ANOTHER screen (`/mobile` → `/home#bench`)
  // arrives here on a freshly mounted page. Mount-only on purpose: a same-page
  // hash click never remounts the nav, so this never fights Lenis's own smooth
  // anchor scroll. See salesLinks.js for the Lenis limit it has to reset.
  useEffect(() => landOnHash(), [])

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
  // palette, but never while the visitor is typing into a field.
  const closeMenu = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => burgerRef.current?.focus())
  }, [setOpen])

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
  }, [closeMenu, setOpen])

  // Back closes the menu (the phone's back gesture).
  useCloseOnBack(open, closeMenu)

  // A section link inside the open menu: take the menu's history entry over
  // with the section's URL (so nothing is left for back to pop), close, and
  // scroll — through Lenis when it owns the page, honouring the section's
  // scroll-margin so it clears the fixed pill.
  const menuHash = useCallback((e, href) => {
    e.preventDefault()
    const state = { ...(window.history.state || {}) }
    delete state.spnavMenu
    window.history.replaceState(state, '', href)
    setOpen(false)
    const el = document.getElementById(href.slice(1))
    if (!el) return
    const lenis = getLenis()
    // Lenis reads the target's scroll-margin-top itself.
    if (lenis) lenis.scrollTo(el)
    else el.scrollIntoView({ block: 'start' })
  }, [setOpen])

  // Scroll lock + focus move-in + focus trap: a full-screen layer that leaves
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

  // "Open the toolkit" ENTERS THE APP, signed in or not, with no sign-up
  // gate: it lands on /projects, the
  // workspace, and sign-up happens only when the visitor saves or exports. A
  // real <Link>, so it is middle-clickable. The design's `goDashboard`.
  const TOOLKIT = '/projects'

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
              <QuietLink key={q.id} className="spnav-quiet-link" label={q.label} href={quietHref(q)} current={active === q.id} onClick={() => setOpen(false)} />
            ))}
          </div>

          <ThemeCycle className="spnav-icon" glyphs="phosphor" />

          <button
            type="button"
            className="spnav-icon spnav-burger"
            ref={burgerRef}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls={open ? 'spnav-menu' : undefined}
            onClick={() => (open ? closeMenu() : setOpen(true))}
          >
            {/* Three bars that become a cross (lines 234-237 + 129-132). */}
            <span className="spnav-burger-ico" aria-hidden="true" data-burger={open ? 'in' : 'out'}>
              <span /><span /><span />
            </span>
          </button>

          <Link className="spnav-cta" data-cta to={TOOLKIT} onClick={() => setOpen(false)}>
            <span>Open the toolkit</span>
            <span className="spnav-cta-icon" aria-hidden="true"><ArrowUpRightGlyph /></span>
          </Link>
        </div>
      </nav>

      {menu !== 'closed' && (
        <div
          className="spnav-menu"
          id="spnav-menu"
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-menu={open ? 'in' : 'out'}
        >
          <button type="button" className="spnav-close" onClick={closeMenu}>
            <span>Close</span>
            <span aria-hidden="true"><CloseGlyph /></span>
          </button>

          {/* The design's four big items and its note (251-255). `data-mi` is
              the design's attribute and the CSS keys the stagger off
              nth-child exactly as it does — the note is the fifth. */}
          <div className="spnav-rail">
            {QUIET.map((q) => (
              <QuietLink key={q.id} className="spnav-mi" mi label={q.label} href={quietHref(q)} current={active === q.id} onClick={() => setOpen(false)} onHash={menuHash} />
            ))}
            <Link className="spnav-mi spnav-mi--accent" data-mi to={TOOLKIT} replace onClick={() => setOpen(false)}>
              Open the toolkit <span aria-hidden="true">&#8599;</span>
            </Link>
            <p className="spnav-mi-note" data-mi data-mi-note>EVERY CORE TOOL IS FREE, FOREVER</p>
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
