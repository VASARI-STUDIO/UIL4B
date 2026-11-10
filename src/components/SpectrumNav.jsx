import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PH_X } from './spectrum/phosphorNav'
import { crossRouteHashClick, normPath, onSalesPage } from './spectrum/salesLinks'
import { jumpToSection } from './spectrum/usePageAnchors'
import { useCloseOnBack } from './spectrum/useCloseOnBack'
import { SEARCH_KEY } from '../config/shortcuts'
import { useAppearance } from '../contexts/AppearanceContext'
import '../styles/pages/spectrum-chrome.css'
// `lazy` in this file is lazyRoute, not React's: if the file for an overlay
// failed to download, it waits for the recovery reload instead of crashing.
import { lazyRoute as lazy } from '../utils/lazyRoute'
import { lockScroll } from '../utils/scrollLock'
import { markScrollContainers } from '../utils/scrollContainment.js'
import { BrandLockup } from './BrandLogo'
import { useShortcutHint } from '../hooks/useShortcutHint'

const CommandPalette = lazy(() => import('./CommandPalette'))

// The marketing nav: a flat, full-width bar. On a wide screen it holds the
// logo, three links and a search pill. At 767px and under the links move into
// a full-screen menu, opened from a button that sits beside a search button.
//
// It is not a mega menu. Every tool is still reachable from the page's own
// sections, the hero's tool search and the footer. Entering the app is the
// hero's call to action, so the bar carries none.
//
// Tools is the page's `#try` section on the sales page and the `/tools` page
// anywhere else. Plans is `/plans`, On mobile is `/mobile`.
const QUIET = [
  { id: 'tools', label: 'Tools', to: '/tools', hash: '#try' },
  { id: 'pricing', label: 'Plans', to: '/plans' },
  { id: 'mobile', label: 'On mobile', to: '/mobile' },
]

// The sales page's sections in page order: the phone menu's second list.
const PAGE_ANCHORS = [
  { id: 'bookmarks', label: 'Bookmarks' },
  { id: 'try', label: 'Try the tools' },
  { id: 'exports', label: 'Exports' },
  { id: 'examples', label: 'Examples' },
  { id: 'plans', label: 'Plans' },
]

// Which quiet link names the screen you are on. The sales page has none: its
// Tools link jumps within the page and does not name a screen.
function activeQuiet(pathname) {
  const p = normPath(pathname)
  if (p === '/tools') return 'tools'
  if (p === '/plans') return 'pricing'
  if (p === '/mobile') return 'mobile'
  return null
}

// The menu fades in over .28s and out over .24s, the items leaving over .2s,
// then unmounts after 260ms so the close animation has a layer to play on.
const MENU_EXIT_MS = 260

// Where the phone layout ends. Past it the menu is not drawn, so an open menu
// is closed when the window grows beyond it.
const WIDE = '(min-width: 768px)'

function CloseGlyph() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d={PH_X} />
    </svg>
  )
}

function SearchGlyph({ size }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

// One destination, as the element it has to be: a bare hash on the sales page
// is a plain anchor (the page's anchor handler scrolls it and focuses the
// section heading); anything that changes route is a router <Link>, so it
// never reloads the app. `current` is "this is the screen you are on":
// announced, and painted by .is-active.
//
// IN THE MENU (`mi`) a link must not leave a dead history step behind: the
// menu owns one entry while open (useCloseOnBack), so a route link REPLACES
// it, and a same-page section link swaps it for the section's URL and scrolls
// there itself (`onHash`) instead of pushing over it.
function QuietLink({ href, label, className, current, mi, index, onClick, onHash }) {
  const props = {
    className: current ? `${className} is-active` : className,
    onClick: crossRouteHashClick(href, onClick),
    'aria-current': current ? 'page' : undefined,
    'data-mi': mi ? '' : undefined,
    style: mi ? { '--i': index } : undefined,
  }
  return href.startsWith('#')
    ? <a href={href} {...props} onClick={onHash ? (e) => onHash(e, href) : props.onClick}>{label}</a>
    : <Link to={href} replace={mi} {...props}>{label}</Link>
}

// The bar hides going down and comes back coming up: nothing hides in the
// first 120px, a downward move of more than 2px hides it, and an upward move
// waits 140ms before bringing it back so a stray wheel nudge does not flash
// the bar. The menu being open pins it visible, and so does keyboard focus
// inside the bar: a bar that hides while a control in it holds focus leaves
// the focus indicator off screen (WCAG 2.4.7 / 2.4.11).
//
// IT KEEPS A FLAG, NOT A STYLE. The flag goes on `data-nav-hidden` and the CSS
// decides what that means, so the reduced-motion companion is a media query
// beside the animation it cancels.
const HIDE_AFTER = 120
const RETURN_DELAY = 140

// A pinned stage (the tools column, the exports stack) marks its root with
// `data-pins`. While the top of the viewport is inside one, the bar is hidden
// whichever way the page scrolls: a bar that is showing when the box is entered
// from below goes away, and scrolling up does not bring it back. Keyboard focus
// into the bar, a skip-link jump and leaving the box still do.
function viewportTopInPinnedBox() {
  return [...document.querySelectorAll('[data-pins]')].some((el) => {
    const r = el.getBoundingClientRect()
    return r.top <= 0 && r.bottom > 0
  })
}

export default function SpectrumNav() {
  const { reducedMotion } = useAppearance()
  const location = useLocation()
  const active = activeQuiet(location.pathname)
  const onSales = onSalesPage(location.pathname)
  const quietHref = (q) => (onSales && q.hash ? q.hash : q.to)
  const shortcut = useShortcutHint()

  const [hidden, setHidden] = useState(false)
  // True while a pinned stage holds the bar away. Its own flag, because the
  // reduced-motion rules switch the scroll-hide off but must still clear the
  // bar from a pinned stage's sticky content.
  const [pinHidden, setPinHidden] = useState(false)
  // True once the page has scrolled, so the bar draws its lower edge only when
  // content passes under it.
  const [scrolled, setScrolled] = useState(false)
  // 'closed' → 'in' while open → 'out' for the exit, then 'closed'. The menu
  // stays MOUNTED through 'out' so the close animation has something to play on.
  const [menu, setMenu] = useState('closed')
  const open = menu === 'in'
  const setOpen = useCallback((next) => {
    setMenu((m) => (next ? 'in' : m === 'in' ? 'out' : m))
  }, [])
  const [searchOpen, setSearchOpen] = useState(false)

  const navRef = useRef(null)
  const burgerRef = useRef(null)
  const sheetRef = useRef(null)
  const lastY = useRef(0)
  const returnTimer = useRef(null)
  const openRef = useRef(false)

  useEffect(() => { openRef.current = open }, [open])

  // Keyboard focus arriving in the bar while it is hidden brings it back at
  // once. :focus-visible, not any focus, so a mouse click on a control does
  // not pin the bar open. The stylesheet's :has(:focus-visible) shows it on
  // the same frame; this keeps the hidden flag in step.
  const onNavFocus = (e) => {
    if (!e.target.matches(':focus-visible')) return
    clearTimeout(returnTimer.current)
    returnTimer.current = null
    setHidden(false)
  }

  // The exit's unmount. Under reduced motion there is no exit to wait for.
  useEffect(() => {
    if (menu !== 'out') return undefined
    const t = setTimeout(() => setMenu((m) => (m === 'out' ? 'closed' : m)), reducedMotion ? 0 : MENU_EXIT_MS)
    return () => clearTimeout(t)
  }, [menu, reducedMotion])

  // Hide-on-scroll. Listener only: no state is set synchronously in the effect
  // body, which is the rule the rest of this codebase's nav follows.
  useEffect(() => {
    const onScroll = () => {
      const y = Math.max(0, window.scrollY || 0)
      const dy = y - lastY.current
      lastY.current = y
      setScrolled(y > 8)
      const focused = document.activeElement
      const focusInBar = !!(focused && navRef.current?.contains(focused) && focused.matches(':focus-visible'))
      const inPinnedBox = y >= HIDE_AFTER && !openRef.current && !focusInBar && viewportTopInPinnedBox()
      setPinHidden(inPinnedBox)
      if (y < HIDE_AFTER || openRef.current || focusInBar) {
        clearTimeout(returnTimer.current)
        returnTimer.current = null
        setHidden(false)
      } else if (dy > 2 || (dy < -2 && inPinnedBox)) {
        clearTimeout(returnTimer.current)
        returnTimer.current = null
        setHidden(true)
      } else if (dy < -2 && !returnTimer.current) {
        returnTimer.current = setTimeout(() => {
          returnTimer.current = null
          if (!viewportTopInPinnedBox()) setHidden(false)
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

  // The phone menu is not drawn on a wide window, so growing past the phone
  // layout closes it.
  useEffect(() => {
    const mq = window.matchMedia(WIDE)
    const onChange = (e) => { if (e.matches) setOpen(false) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [setOpen])

  // ESCAPE CLOSES AND GIVES FOCUS BACK TO THE BURGER (WCAG 2.4.3 / APG).
  const closeMenu = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => burgerRef.current?.focus())
  }, [setOpen])

  // The keys that open the command palette. "/" opens it, but never while the
  // visitor is typing into a field. Control or Command K opens it too, unless
  // the page has a hero command bar: that bar binds the same chord to focus
  // itself, and one chord has one handler.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && openRef.current) {
        e.preventDefault()
        closeMenu()
        return
      }
      const chord = (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')
      if (chord) {
        if (document.querySelector('.hcmd-input')) return
        e.preventDefault()
        setOpen(false)
        setSearchOpen(true)
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
  // jump to the section, which scrolls through Lenis when it owns the page and
  // moves focus to the section's heading.
  const menuHash = useCallback((e, href) => {
    e.preventDefault()
    const state = { ...(window.history.state || {}) }
    delete state.spnavMenu
    window.history.replaceState(state, '', href)
    setOpen(false)
    // The open menu holds the page's scroll lock, which keeps Lenis stopped, and
    // a stopped Lenis ignores scrollTo. The lock is released when the close
    // commits, so the jump waits one frame. The link that held focus has just
    // unmounted, so the heading takes focus rather than the body.
    requestAnimationFrame(() => jumpToSection(href.slice(1)))
  }, [setOpen])

  // Scroll lock + focus move-in + focus trap: a full-screen layer that leaves
  // the page scrolling behind it and lets Tab walk out the back is not a dialog.
  useEffect(() => {
    if (!open) return undefined
    const unlockScroll = lockScroll()
    const panel = sheetRef.current
    // The page is locked and Lenis stopped; marking the panel's scroll boxes lets the wheel still scroll them.
    const unmark = markScrollContainers(panel)
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
      unlockScroll()
      unmark()
    }
  }, [open])

  const openSearch = () => {
    setOpen(false)
    setSearchOpen(true)
  }

  return (
    <>
      <nav
        className="spnav"
        ref={navRef}
        onFocus={onNavFocus}
        aria-label="Primary"
        data-nav-hidden={hidden ? '1' : '0'}
        data-nav-pinned={pinHidden ? '1' : '0'}
        data-scrolled={scrolled ? '1' : '0'}
      >
        <div className="spnav-bar">
          <Link className="spnav-mark" to="/" onClick={() => setOpen(false)}>
            {/* One accessible name for the logo, so a screen reader meets
                "UIL4B home" and not "UI L 4 B". */}
            <span className="spnav-word" aria-hidden="true">
              <BrandLockup className="brand-logo-wide" />
            </span>
            <span className="sr-only">UIL4B home</span>
          </Link>

          <div className="spnav-end">
            <div className="spnav-quiet">
              {QUIET.map((q) => (
                <QuietLink key={q.id} className="spnav-quiet-link" label={q.label} href={quietHref(q)} current={active === q.id} onClick={() => setOpen(false)} />
              ))}
            </div>

            <button type="button" className="spnav-search" aria-keyshortcuts={shortcut === 'Ctrl K' ? 'Control+K' : 'Meta+K'} onClick={openSearch}>
              <SearchGlyph size={15} />
              <span>Search tools</span>
              <kbd aria-hidden="true">{shortcut}</kbd>
            </button>

            <div className="spnav-phone">
              <button type="button" className="spnav-icon" aria-label="Search tools" onClick={openSearch}>
                <SearchGlyph size={17} />
              </button>
              <button
                type="button"
                className="spnav-icon spnav-burger"
                ref={burgerRef}
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                aria-controls={open ? 'spnav-menu' : undefined}
                onClick={() => (open ? closeMenu() : setOpen(true))}
              >
                {/* Two bars that become a cross. */}
                <span className="spnav-burger-ico" aria-hidden="true" data-burger={open ? 'in' : 'out'}>
                  <span /><span />
                </span>
              </button>
            </div>
          </div>
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

          {/* `data-mi` marks what staggers in; `--i` is its place in the order. */}
          <div className="spnav-rail">
            {QUIET.map((q, i) => (
              <QuietLink key={q.id} className="spnav-mi" mi index={i} label={q.label} href={quietHref(q)} current={active === q.id} onClick={() => setOpen(false)} onHash={menuHash} />
            ))}
            {onSales && (
              <>
                <p className="spnav-mi-label" id="spnav-menu-page" data-mi style={{ '--i': QUIET.length }}>This page</p>
                <div className="spnav-mi-group" role="group" aria-labelledby="spnav-menu-page">
                  {PAGE_ANCHORS.map((a, i) => (
                    <QuietLink key={a.id} className="spnav-mi spnav-mi--sub" mi index={QUIET.length + 1 + i} label={a.label} href={`#${a.id}`} onClick={() => setOpen(false)} onHash={menuHash} />
                  ))}
                </div>
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

      {/* `reducedMotion` is read so the component participates in the app's own
          preference rather than only the OS media query. AppearanceContext
          writes html[data-reduced-motion], which the stylesheet honours, and
          this attribute lets a test assert that the bar knows. */}
      <span hidden data-spnav-reduced={reducedMotion ? '1' : '0'} />
    </>
  )
}
