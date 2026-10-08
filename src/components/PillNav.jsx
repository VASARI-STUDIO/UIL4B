import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { NAV_SECTIONS } from '../data/toolTree'
import { SEARCH_KEY } from '../config/shortcuts'
import { localiseTools } from '../data/tools'
import { searchHints } from '../data/toolIndex'
// The Create pane is a miniature of the real style-guide export, read from the
// same gallery palette and the same inkFor/grade the exporter uses.
import { GALLERY_PALETTES } from '../data/paletteGallery'
import { inkFor, grade } from '../utils/styleGuideExport'
import usePopover from '../hooks/usePopover'
import useMediaQuery from '../hooks/useMediaQuery'
import { isUntouched } from '../utils/accountSync'
import { useCloseOnBack, useInertBehind } from '../hooks/useCloseOnBack'
import { guideEntry, isGuideActive, startGuide } from '../utils/brandKitGuide'
import { getRecentIcons } from '../utils/recentIcons'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAppearance } from '../contexts/AppearanceContext'
import { useI18n } from '../contexts/I18nContext'
import { isAdminEmail } from '../utils/constants'
import NavIcon from './NavIcon'
import ThemeChoice from './ThemeChoice'
import ThemeCycle from './nav/ThemeCycle'
import PhoneTabBar from './nav/PhoneTabBar'
import FoldersGlyph from './nav/FoldersGlyph'
import SpectrumNav from './SpectrumNav'
import { AccountSwitcher, SignOutRows } from './nav/AccountSwitcher'
import { menuFootNote, menuGuides, menuPromo, menuStacks, menuViewAll } from './nav/menuModel'
// `lazy` in this file is lazyRoute, not React's: if the file for an overlay
// failed to download, it waits for the recovery reload instead of crashing.
import { lazyRoute as lazy } from '../utils/lazyRoute'

// Overlays are code-split: they load the first time a visitor opens them. The
// Discover pane's counts too — the resources list behind one of them is 20 KB
// no other always-loaded module needs.
const CommandPalette = lazy(() => import('./CommandPalette'))
const ExportPanel = lazy(() => import('./ExportPanel'))
const DiscoverCounts = lazy(() => import('./nav/DiscoverCounts'))

// THE APP HEADER — `UIL4B App.dc.html` lines 100-216, rebuilt to the file.
//
// One 64px row: wordmark · search · theme · Create / Discover / Learn, then at
// the far end Export · Dashboard · Upgrade · avatar. It NEVER wraps: below
// 1100px the search field becomes its icon, and below 900px Export and
// Dashboard keep their place as icon-only buttons.
//
// Below 768px it is the compact phone header: wordmark, search, Export, avatar,
// menu — with the bottom tab bar (Dashboard / Create / Discover / You), and
// the menu sheet for the rest.
//
// The mega menus are ONE surface each (no card inside a tray): the columns,
// the promo content and the foot are separated by hairlines and space, never
// by boxes.
//
// Auth and subscription are READ here, to choose between the avatar and the
// sign-in affordances and to hide Upgrade from Pro accounts. Never written.
//
// State changes only in event handlers; effects attach listeners and nothing
// else, which keeps this off the set-state-in-effect advisory.

// Routes where there is nothing to export.
const SALES_PATHS = new Set(['/', '/home', '/plans', '/pricing'])

// How long a pointer rests on a disabled Export before its hint appears.
const HINT_DELAY_MS = 280
// A touch on the logo this soon after a route change is ignored.
const LOGO_GUARD_MS = 600

function Chevron() {
  return (
    <svg className="pnav-chev" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="pnav-search-ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7.25" />
      <path d="m20 20-3.65-3.65" />
    </svg>
  )
}

// An upload tray: the glyph for Export.
function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4 14v4.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V14" />
    </svg>
  )
}

function ArrowRight({ size = 13 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </svg>
  )
}

function MenuGlyph({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  )
}

function MeatballIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8L13.8 21a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6Z" />
      <circle cx="7.5" cy="7.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.8-2.7 2.3-2.7 3.8" />
      <circle cx="12" cy="17.3" r=".5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FeedbackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="8" r="4" />
      <path d="M3 20c1.3-3 3.9-4.5 7-4.5 1.3 0 2.5.3 3.5.8" />
      <path d="M18.5 14v6M15.5 17h6" />
    </svg>
  )
}

function LoginArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  )
}

// The search placeholder's cycling terms are SELECTED FROM THE REGISTRY, never
// typed: a hand-kept list advertised "palette builder" and "contrast checker"
// that returned No results. searchHints() is the homepage hero's rule on the
// same derived index.
function useSearchHints() {
  const { t } = useI18n()
  return useMemo(() => searchHints(localiseTools(t).filter((tl) => !tl.soon)), [t])
}

const TYPE_MS = 55
const ERASE_MS = 28
const HOLD_MS = 1100

// At rest "Search tools…". While hovered or focused it types the terms above.
// Never at load (the timer exists only while `active`), never under reduced
// motion (PillNav gates `active`), and never read by assistive technology (the
// field's accessible name is fixed). Every setState runs inside a timer.
function SearchPlaceholder({ active }) {
  const hints = useSearchHints()
  const [typed, setTyped] = useState('')
  const [term, setTerm] = useState(0)

  useEffect(() => {
    if (!active || !hints.length) return undefined
    let cancelled = false
    let timer
    const word = hints[term % hints.length]
    const step = (i, erasing) => {
      if (cancelled) return
      setTyped(word.slice(0, i))
      if (!erasing && i < word.length) timer = setTimeout(() => step(i + 1, false), TYPE_MS)
      else if (!erasing) timer = setTimeout(() => step(i, true), HOLD_MS)
      else if (i > 0) timer = setTimeout(() => step(i - 1, true), ERASE_MS)
      else setTerm(t => t + 1)
    }
    timer = setTimeout(() => step(0, false), TYPE_MS)
    return () => { cancelled = true; clearTimeout(timer); setTyped('') }
  }, [active, term, hints])

  if (!active) return <span className="pnav-search-ph">Search tools&hellip;</span>
  return (
    <span className="pnav-search-ph pnav-search-ph--typing" aria-hidden="true">
      {typed}
      <i className="pnav-search-caret" />
    </span>
  )
}

// Light / Dark / System, the same ThemeChoice /settings renders.
function ThemeSeg() {
  return (
    <div className="pnav-pop-row">
      <span className="pnav-pop-row-label">Theme</span>
      <ThemeChoice />
    </div>
  )
}

function initials(profile, user) {
  const src = profile?.displayName || user?.email || ''
  const parts = src.trim().split(/[\s@.]+/).filter(Boolean)
  const first = parts[0]?.[0] || 'U'
  const second = parts.length > 1 ? parts[1][0] : ''
  return (first + second).toUpperCase()
}

// THE CREATE PANE'S PICTURE — a page of what an export looks like, set inside
// the pane layout. A miniature of page 2 of the real style guide, with the ink and ratio computed by the
// exporter's own inkFor and grade, so it cannot show a grade the export would
// not print.
function ExportPreview() {
  const palette = GALLERY_PALETTES[0]
  return (
    <div className="pnav-prev" aria-hidden="true">
      <div className="pnav-prev-page">
        <p className="pnav-prev-eyebrow">01 — Colour</p>
        <p className="pnav-prev-title">The palette</p>
        <div className="pnav-prev-grid">
          {palette.colors.map((hex, i) => {
            const { ink, ratio } = inkFor(hex)
            return (
              <div className="pnav-prev-sw" key={`${hex}-${i}`}>
                <span className="pnav-prev-chip" style={{ background: hex, color: ink }}>
                  {hex.toUpperCase()}
                </span>
                <span className="pnav-prev-meta">{grade(ratio)} · {ratio.toFixed(1)}:1</span>
              </div>
            )
          })}
        </div>
        <div className="pnav-prev-foot">
          <span>Colour</span>
          <span>Made with UIL4B</span>
        </div>
      </div>
    </div>
  )
}

// THE ONE MOUNT POINT FOR BOTH NAVS. `variant="spectrum"` renders the
// marketing nav; the prop is written at the call site, so no hook is ever
// called conditionally.
export default function PillNav({ variant }) {
  if (variant === 'spectrum') return <SpectrumNav />
  return <AppHeader />
}

function AppHeader() {
  const { user, userProfile } = useAuth()
  const { openLogin } = useLoginPrompt()
  const { isPro } = useSubscription()
  const { reducedMotion } = useAppearance()
  const { design, projects, loadProject } = useProject()
  const [searchHot, setSearchHot] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // THE FRONT DOOR of the guided brand kit: a fresh start opens step one, a
  // running flow RESUMES at its first unfinished step. A plain <button>,
  // because staging state from a <Link onClick> arms the flow on a modified
  // click that never navigates (utils/handoffSlot.js).
  const brandKitEntry = guideEntry(design, {
    active: isGuideActive(),
    iconsTouched: getRecentIcons().length > 0,
  })
  const launchBrandKit = () => {
    closeAll()
    startGuide()
    navigate(brandKitEntry.path)
  }
  const path = (location.pathname || '/').replace(/\/+$/, '') || '/'
  const isSalesPage = SALES_PATHS.has(path)
  const onDashboard = path === '/projects'
  // Below 900px the labels are hidden, so the icon buttons carry a title.
  const iconOnly = useMediaQuery('(max-width: 899px)')

  // What Export does here. On a project page it exports that project; on the
  // dashboard there is no selected project, so it has nothing to act on; on
  // every other page it exports the working design once that has been changed.
  const projectId = matchPath('/projects/:id', path)?.params.id
  const exportTarget = projectId ? projects.find((p) => p.id === projectId) : null
  const designUntouched = isUntouched('vs-current-design', design)
  const canExport = projectId ? !!exportTarget : !onDashboard && !designUntouched
  const exportHint = onDashboard && (projects.length > 0 || !designUntouched)
    ? 'Open a project to export it'
    : 'Nothing to export yet'
  const [hintOpen, setHintOpen] = useState(false)
  const hintTimer = useRef(null)
  // A logo tap that lands within this long of a route change is the second half
  // of a double tap, not a second request.
  const routeChange = useRef({ path, at: 0 })
  const [open, setOpen] = useState(null) // open mega-menu section id
  const [menu, setMenu] = useState(null) // 'account' | null
  const [sheet, setSheet] = useState(false) // phone menu sheet
  const [sheetSection, setSheetSection] = useState('create')
  const [searchOpen, setSearchOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const navRef = useRef(null)
  const menuRef = useRef(null)
  const sheetRef = useRef(null)
  const mobileBtnRef = useRef(null)
  const closeTimer = useRef(null)
  // Opening or closing can move layout under a still cursor, and Chrome then
  // re-fires mouseenter on whatever trigger lands there. Hover-opens wait for a
  // real mousemove after any open/close.
  const hoverLock = useRef(false)
  // How the open menu was opened: a click on a hover-opened trigger pins it.
  const openedBy = useRef(null)
  // Escape returns focus to the trigger that owns the layer it closed.
  const triggerRefs = useRef({})
  const closeAccountMenu = useCallback(() => setMenu(null), [])
  const { triggerRef: accountBtnRef, popRef: accountPopRef } = usePopover(menu === 'account', closeAccountMenu, { arrowNav: true })
  const stateRef = useRef({ open: null, menu: null, sheet: false })
  useEffect(() => {
    stateRef.current.open = open
    stateRef.current.menu = menu
    stateRef.current.sheet = sheet
  }, [open, menu, sheet])

  useEffect(() => {
    if (routeChange.current.path !== path) routeChange.current = { path, at: Date.now() }
  }, [path])

  // The Export hint is dismissible without moving focus, and its hover delay
  // never outlives the header.
  useEffect(() => {
    if (!hintOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setHintOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [hintOpen])
  useEffect(() => () => clearTimeout(hintTimer.current), [])

  // A3 + A12: the phone sheet is a modal page. Back closes it, and the page
  // behind it is inert while it is open.
  const closeSheet = () => setSheet(false)
  useCloseOnBack(sheet, closeSheet)
  useInertBehind(sheet)

  const isAdmin = isAdminEmail(user?.email)
  const visibleSections = NAV_SECTIONS
  const avatarUrl = userProfile?.photoURL || ''
  const initialsStr = initials(userProfile, user)

  // Outside press or Escape closes the desktop menu and the popovers; the
  // search key opens search unless the visitor is typing in a field.
  useEffect(() => {
    const onPointer = (e) => {
      if (navRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      setOpen(null)
      setMenu(null)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        const { open: wasOpen, sheet: wasSheet } = stateRef.current
        setOpen(null); setSheet(false); setMenu(null)
        // The account popover handles its own Escape (usePopover, capture phase).
        if (wasOpen) triggerRefs.current[wasOpen]?.focus()
        else if (wasSheet) mobileBtnRef.current?.focus()
      }
      if (e.key === SEARCH_KEY && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = e.target
        const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
        if (!typing) {
          e.preventDefault()
          setOpen(null); setMenu(null); setSheet(false); setSearchOpen(true)
        }
      }
    }
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

  // OTHER SURFACES CAN OPEN A MENU: dispatch a cancelable
  //   new CustomEvent('uil4b:open-menu', { detail: { section: 'create' }, cancelable: true })
  // on window. The header opens that section's mega menu (on a phone, the sheet
  // with that section expanded) and calls preventDefault(), so the sender knows
  // it was handled and does not run its own fallback.
  useEffect(() => {
    const onOpenMenu = (event) => {
      const id = event.detail?.section
      if (!NAV_SECTIONS.some((s) => s.id === id)) return
      event.preventDefault()
      setMenu(null)
      if (window.matchMedia('(max-width: 767px)').matches) {
        setOpen(null)
        setSheetSection(id)
        setSheet(true)
      } else {
        openedBy.current = 'click'
        hoverLock.current = true
        setSheet(false)
        setOpen(id)
      }
    }
    window.addEventListener('uil4b:open-menu', onOpenMenu)
    return () => window.removeEventListener('uil4b:open-menu', onOpenMenu)
  }, [])

  // Opened from the You tab, the sheet starts at the account group.
  useEffect(() => {
    if (sheet && sheetSection === 'account') document.getElementById('pnav-sheet-account')?.scrollIntoView({ block: 'start' })
  }, [sheet, sheetSection])

  // The sheet locks the page's scroll and keeps Tab inside itself.
  useEffect(() => {
    if (!sheet) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = sheetRef.current
    const focusable = () => [...(panel?.querySelectorAll('button:not([disabled]),a[href]') || [])]
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
  // Sign-in opens OVER the current page rather than navigating to /login.
  const startLogin = () => { closeAll(); openLogin() }
  // "Add account", below Log in in the account menu. The same sign-up form
  // Spectrum's "Create a free account" opens: the login popup in its signup
  // mode.
  const startSignup = () => { closeAll(); openLogin({ signup: true }) }
  const openSearch = () => { closeAll(); setSearchOpen(true) }
  // On a project page the dialog holds that project, as the page's own export
  // action does.
  const openExport = () => {
    if (exportTarget) loadProject(exportTarget.id)
    closeAll()
    setExportOpen(true)
  }
  // With nothing to export the button explains itself instead of opening the
  // dialog: a toast on a phone, where there is no hover, the hint beneath the
  // button everywhere else.
  const pressExport = () => {
    if (canExport) { openExport(); return }
    if (window.matchMedia('(max-width: 767px)').matches) {
      window.dispatchEvent(new CustomEvent('uil4b:toast', { detail: { message: exportHint, type: 'info' } }))
    } else {
      setHintOpen(true)
    }
  }
  const hintEnter = (e) => {
    if (canExport || e.pointerType !== 'mouse') return
    clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => setHintOpen(true), HINT_DELAY_MS)
  }
  const hintLeave = () => { clearTimeout(hintTimer.current); setHintOpen(false) }
  const onLogoClick = (e) => {
    if (e.nativeEvent?.pointerType === 'touch' && Date.now() - routeChange.current.at < LOGO_GUARD_MS) {
      e.preventDefault()
      return
    }
    closeAll()
  }
  const openSheetAt = (sectionId) => {
    setOpen(null); setMenu(null)
    setSheetSection(sectionId)
    setSheet((cur) => !(cur && sheetSection === sectionId))
  }
  // Only RENDERED items belong in the keyboard ring: a display:none item takes
  // .focus() silently and ArrowDown would appear to do nothing.
  const megaItems = () => [...(menuRef.current?.querySelectorAll('[data-pnav-menuitem]') || [])]
    .filter((el) => el.getClientRects().length > 0)
  // The panel is rendered after </nav>, so these bridge Tab between a trigger
  // and its panel without moving markup. Nothing traps.
  const focusAfterTrigger = (id) => {
    const index = visibleSections.findIndex((s) => s.id === id)
    const next = visibleSections[index + 1]
    const target = next ? triggerRefs.current[next.id] : accountBtnRef.current || mobileBtnRef.current
    target?.focus()
  }
  const onTriggerKeyDown = (event, id, index) => {
    if (event.key === 'Tab' && !event.shiftKey && open === id) {
      const first = megaItems()[0]
      if (first) { event.preventDefault(); first.focus(); return }
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const delta = event.key === 'ArrowRight' ? 1 : -1
      const next = visibleSections[(index + delta + visibleSections.length) % visibleSections.length]
      triggerRefs.current[next.id]?.focus()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openedBy.current = 'click'
      setMenu(null)
      setOpen(id)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const items = megaItems()
        const target = event.key === 'ArrowDown' ? items[0] : items[items.length - 1]
        target?.focus()
      }))
    }
  }
  const onMenuKeyDown = (event) => {
    if (event.key === 'Tab') {
      const items = megaItems()
      if (!items.length || !open) return
      const active = document.activeElement
      if (event.shiftKey && active === items[0]) {
        event.preventDefault()
        triggerRefs.current[open]?.focus()
      } else if (!event.shiftKey && active === items[items.length - 1]) {
        event.preventDefault()
        const id = open
        setOpen(null)
        focusAfterTrigger(id)
      }
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const items = megaItems()
    if (!items.length) return
    event.preventDefault()
    const current = items.indexOf(document.activeElement)
    if (event.key === 'Home') items[0].focus()
    else if (event.key === 'End') items[items.length - 1].focus()
    else {
      const delta = event.key === 'ArrowDown' ? 1 : -1
      items[(current + delta + items.length) % items.length].focus()
    }
  }

  // After a switch the popover closes and focus returns to the avatar, so a
  // keyboard user is not dropped on <body>.
  const closeAccountMenuAndRestoreFocus = () => {
    setMenu(null)
    requestAnimationFrame(() => accountBtnRef.current?.focus())
  }

  const activeSection = NAV_SECTIONS.find((s) => s.id === open) || null
  const showUpgrade = !isPro && path !== '/plans'

  return (
    <>
      <nav
        ref={navRef}
        className={'pnav' + (open || menu ? ' is-expanded' : '')}
        aria-label="Primary"
        onMouseLeave={hoverLeave}
      >
        <div className="pnav-inner">
          {/* 19px / 600 / -.035em with the "4" in the accent (App line 102).
              It goes to the dashboard from every app page, and from the
              dashboard to the sales home page. */}
          <Link
            className="pnav-logo"
            to={onDashboard ? '/home' : '/projects'}
            onClick={onLogoClick}
            aria-label={onDashboard ? 'UIL4B, go to the home page' : 'UIL4B, go to your dashboard'}
          >
            <span className="pnav-word">UIL<span className="pnav-word-mark">4</span>B</span>
          </Link>

          <div className={searchHot ? 'pnav-search is-hot' : 'pnav-search'}>
            <button
              type="button"
              className="pnav-search-field"
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              aria-label="Search UIL4B"
              onClick={openSearch}
              onPointerEnter={() => setSearchHot(true)}
              onPointerLeave={() => setSearchHot(false)}
              onFocus={() => setSearchHot(true)}
              onBlur={() => setSearchHot(false)}
            >
              <SearchIcon />
              <SearchPlaceholder active={searchHot && !reducedMotion} />
              <kbd className="pnav-search-kbd" aria-hidden="true">/</kbd>
            </button>
          </div>

          <ThemeCycle />

          <div className="pnav-items">
            {visibleSections.map((section, index) => (
              <button
                key={section.id}
                type="button"
                className="pnav-trigger"
                ref={(el) => { if (el) triggerRefs.current[section.id] = el }}
                aria-expanded={open === section.id}
                // A disclosure of links (APG disclosure navigation), not a menu:
                // aria-expanded + aria-controls, no aria-haspopup.
                aria-controls={open === section.id ? 'pnav-mega' : undefined}
                onClick={() => toggle(section.id)}
                onMouseEnter={() => hoverOpen(section.id)}
                onKeyDown={(event) => onTriggerKeyDown(event, section.id, index)}
              >
                {section.label}
                <Chevron />
              </button>
            ))}
          </div>

          <div className="pnav-actions">
            {!isSalesPage && (
              <span
                className="pnav-act-wrap"
                onPointerEnter={hintEnter}
                onPointerLeave={hintLeave}
              >
                <button
                  type="button"
                  className="pnav-act pnav-export"
                  aria-haspopup="dialog"
                  aria-expanded={exportOpen}
                  aria-disabled={canExport ? undefined : 'true'}
                  aria-describedby={canExport ? undefined : 'pnav-export-hint'}
                  title={iconOnly && canExport ? 'Export' : undefined}
                  onClick={pressExport}
                  onFocus={(e) => { if (!canExport && e.currentTarget.matches(':focus-visible')) setHintOpen(true) }}
                  onBlur={() => setHintOpen(false)}
                >
                  <ExportIcon />
                  <span className="pnav-act-label">Export</span>
                </button>
                {!canExport && (
                  <span id="pnav-export-hint" role="tooltip" className={'pnav-tip' + (hintOpen ? ' is-open' : '')}>
                    {exportHint}
                  </span>
                )}
              </span>
            )}
            <Link
              className="pnav-act pnav-act--dash"
              to="/projects"
              aria-current={onDashboard ? 'page' : undefined}
              title={iconOnly ? 'Dashboard' : undefined}
              onClick={closeAll}
            >
              <FoldersGlyph size={16} />
              <span className="pnav-act-label" data-text="Dashboard">Dashboard</span>
            </Link>

            {!user && (
              <button type="button" className="pnav-login" aria-haspopup="dialog" onClick={startLogin}>
                Log in
              </button>
            )}
            {/* A pill, as the app design draws it, and every upgrade CTA goes
                to /plans. */}
            {showUpgrade && (
              <Link className="pnav-upgrade" to="/plans" onClick={closeAll}>
                Upgrade
              </Link>
            )}

            {user ? (
              <div className="pnav-pop-wrap">
                <button
                  type="button"
                  className="pnav-avatar-btn"
                  ref={accountBtnRef}
                  aria-expanded={menu === 'account'}
                  aria-controls={menu === 'account' ? 'pnav-account-pop' : undefined}
                  aria-label="Account and settings"
                  onClick={() => toggleMenu('account')}
                >
                  {avatarUrl ? (
                    <img className="pnav-avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="pnav-avatar" aria-hidden="true">{initialsStr}</span>
                  )}
                </button>
                {menu === 'account' && (
                  <div
                    className="pop pnav-pop pnav-pop--account"
                    ref={accountPopRef}
                    id="pnav-account-pop"
                    aria-label="Account and settings"
                    tabIndex={-1}
                  >
                    <AccountSwitcher onDone={closeAccountMenuAndRestoreFocus} />
                    <div className="pnav-pop-sep" />
                    <p className="pnav-pop-head">Appearance</p>
                    <ThemeSeg />
                    <div className="pnav-pop-sep" />
                    <Link className="pnav-pop-item" to="/settings" onClick={closeAll}>
                      <GearIcon />
                      <span>Account &amp; settings</span>
                    </Link>
                    <Link className="pnav-pop-item" to={isPro ? '/settings' : '/plans'} state={isPro ? { section: 'support' } : undefined} onClick={closeAll}>
                      <TagIcon />
                      <span>{isPro ? 'Manage plan' : 'Plans & upgrade'}</span>
                    </Link>
                    <Link className="pnav-pop-item" to="/learn/help" onClick={closeAll}>
                      <HelpIcon />
                      <span>Help centre</span>
                    </Link>
                    <Link className="pnav-pop-item" to="/feedback" onClick={closeAll}>
                      <FeedbackIcon />
                      <span>Send feedback</span>
                    </Link>
                    {isAdmin && (
                      <Link className="pnav-pop-item" to="/admin" onClick={closeAll}>
                        Admin dashboard
                      </Link>
                    )}
                    <div className="pnav-pop-sep" />
                    <SignOutRows onDone={closeAll} />
                  </div>
                )}
              </div>
            ) : (
              // Signed out there is no avatar to open, so the same slot holds
              // the preferences and help this popover would otherwise carry.
              <div className="pnav-pop-wrap pnav-more-wrap">
                <button
                  type="button"
                  className="pnav-more"
                  ref={accountBtnRef}
                  aria-expanded={menu === 'account'}
                  aria-controls={menu === 'account' ? 'pnav-account-pop' : undefined}
                  aria-label="Menu"
                  onClick={() => toggleMenu('account')}
                >
                  <MeatballIcon />
                </button>
                {menu === 'account' && (
                  <div
                    className="pop pnav-pop"
                    ref={accountPopRef}
                    id="pnav-account-pop"
                    aria-label="Menu"
                    tabIndex={-1}
                  >
                    <p className="pnav-pop-head">Appearance</p>
                    <ThemeSeg />
                    <div className="pnav-pop-sep" />
                    <Link className="pnav-pop-item" to="/learn/help" onClick={closeAll}>
                      <HelpIcon />
                      <span>Help centre</span>
                    </Link>
                    <Link className="pnav-pop-item" to="/feedback" onClick={closeAll}>
                      <FeedbackIcon />
                      <span>Send feedback</span>
                    </Link>
                    <div className="pnav-pop-sep" />
                    <Link className="pnav-pop-item" to="/plans" onClick={closeAll}>
                      <TagIcon />
                      <span>Pricing &amp; plans</span>
                    </Link>
                    <button type="button" className="pnav-pop-item" aria-haspopup="dialog" onClick={startLogin}>
                      <LoginArrowIcon />
                      <span>Log in</span>
                    </button>
                    <button type="button" className="pnav-pop-item pnav-pop-signup" aria-haspopup="dialog" onClick={startSignup}>
                      <UserPlusIcon />
                      <span>Create a free account</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="pnav-mobile"
              ref={mobileBtnRef}
              aria-label={sheet ? 'Close menu' : 'Open menu'}
              aria-expanded={sheet}
              onClick={() => setSheet((s) => !s)}
            >
              <MenuGlyph open={sheet} />
            </button>
          </div>
        </div>
      </nav>

      {activeSection && (
        <MegaMenu
          ref={menuRef}
          section={activeSection}
          onMouseEnter={clearClose}
          onMouseLeave={hoverLeave}
          onKeyDown={onMenuKeyDown}
          onPick={closeAll}
          onBrandKit={launchBrandKit}
          brandKitLabel={brandKitEntry.resume ? `Resume: ${brandKitEntry.step.label}` : null}
        />
      )}

      {sheet && (
        <div ref={sheetRef} className="pnav-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          {visibleSections.map((section) => {
            const expanded = sheetSection === section.id
            const promo = menuPromo(section)
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
                    {section.id === 'create' && (
                      <button type="button" className="pnav-acc-cta" onClick={launchBrandKit}>
                        {brandKitEntry.resume ? `Resume: ${brandKitEntry.step.label}` : promo.cta}
                        <ArrowRight />
                      </button>
                    )}
                    {/* Live rows only: a phone menu lists what
                        opens. Soon rows stay in the desktop menu and /sitemap. */}
                    {section.columns.flat().map((col) => {
                      const live = col.tools.filter((t) => !t.soon)
                      if (!live.length) return null
                      return (
                        <div className="pnav-acc-col" key={col.label}>
                          <p className="pnav-acc-colhead">{col.label}</p>
                          {live.map((t) => (
                            <Link key={t.id} className="pnav-acc-link" to={t.route} onClick={closeAll}>
                              <span className="pnav-acc-ico" aria-hidden="true"><NavIcon id={t.icon} /></span>
                              <span className="pnav-acc-label">{t.label}</span>
                              {t.beta && <span className="beta-badge">Beta</span>}
                            </Link>
                          ))}
                        </div>
                      )
                    })}
                    <Link className="pnav-acc-all" to={section.viewAllHref} onClick={closeAll}>
                      {menuViewAll(section)} <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            )
          })}

          <div className="pnav-sheet-group">
            {!user && (
              <Link className="pnav-sheet-row" to="/plans" onClick={closeAll}>
                <TagIcon /><span>Pricing &amp; plans</span>
              </Link>
            )}
            <Link className="pnav-sheet-row" to="/learn/help" onClick={closeAll}>
              <HelpIcon /><span>Help centre</span>
            </Link>
            <Link className="pnav-sheet-row" to="/feedback" onClick={closeAll}>
              <FeedbackIcon /><span>Send feedback</span>
            </Link>
          </div>

          <div className="pnav-sheet-theme">
            <p className="pnav-pop-head">Appearance</p>
            <ThemeChoice />
          </div>

          {/* Not sticky: a sticky row would sit over the last row at 390.
              Signed in, the account lives under the avatar and the You tab;
              here it is one plain row. Signed out, "Start for free" opens the
              workspace, not a sign-up form: an account is asked for only on
              save or export. */}
          <div className="pnav-sheet-group">
            {user ? (
              <div id="pnav-sheet-account">
                <AccountSwitcher onDone={closeAll} />
                <Link className="pnav-sheet-row" to="/settings" onClick={closeAll}>
                  <GearIcon /><span>Account &amp; settings</span>
                </Link>
                {showUpgrade && (
                  <Link className="pnav-sheet-row" to="/plans" onClick={closeAll}>
                    <TagIcon /><span>Upgrade</span>
                  </Link>
                )}
                <SignOutRows onDone={closeAll} />
              </div>
            ) : (
              <div className="pnav-sheet-cta">
                <Link className="pnav-upgrade pnav-upgrade--block" to="/projects" onClick={closeAll}>
                  Start for free
                </Link>
                <button type="button" className="pnav-sheet-login" aria-haspopup="dialog" onClick={startLogin}>
                  Log in
                </button>
                <button type="button" className="pnav-sheet-row pnav-sheet-signup" aria-haspopup="dialog" onClick={startSignup}>
                  <UserPlusIcon /><span>Create a free account</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <PhoneTabBar
        signedIn={!!user}
        createOpen={sheet && sheetSection === 'create'}
        onCreate={() => openSheetAt('create')}
        accountOpen={sheet && sheetSection === 'account'}
        onAccount={() => openSheetAt('account')}
        onSignIn={startLogin}
        onNavigate={closeAll}
      />

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

// THE MEGA MENU — `UIL4B App.dc.html` lines 127-216, as ONE surface.
//
// No card inside the tray: the columns, the
// promo content and the foot sit on the one ground, divided by hairlines. The
// file's measures stay: 7px inset, 26px radius, page .98 under a 30px blur,
// 15px/13px column padding, 9.5px mono sentence-case labels at .16em, one-line
// rows with a 26px neutral tile and a 13.5px label, 8.5px mono badges at 8px
// radius on the right, and a foot of the section's own line and its view-all.
//
// It is a function component with a forwarded ref only in name: React 19
// passes `ref` as a prop.
function MegaMenu({ ref, section, onMouseEnter, onMouseLeave, onKeyDown, onPick, onBrandKit, brandKitLabel }) {
  const stacks = menuStacks(section)
  const promo = menuPromo(section)
  // The file opens every menu with its first row lit (feat = flatNav[0] when
  // nothing is hovered, App line 1414); CSS lights it only while no other row
  // is hovered or focused.
  const featId = stacks[0]?.[0]?.tools?.[0]?.id
  return (
    <div
      ref={ref}
      id="pnav-mega"
      className="pnav-menu"
      data-menu={section.id}
      role="region"
      aria-label={`${section.label} menu`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={onKeyDown}
    >
      <div className="pnav-menu-body">
        <div className="pnav-menu-cols">
          <div className="pnav-grid" data-cols={stacks.length}>
            {stacks.map((stack) => (
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
                            data-soon={t.soon ? 'true' : undefined}
                            data-feat={t.id === featId ? 'true' : undefined}
                            aria-label={t.soon ? `${t.label} — coming soon` : t.beta ? `${t.label} — beta` : undefined}
                            onClick={onPick}
                            data-pnav-menuitem
                          >
                            <span className="pnav-tool-ico" aria-hidden="true"><NavIcon id={t.icon} /></span>
                            <span className="pnav-tool-label">{t.label}</span>
                            {t.soon && <span className="soon-badge">Soon</span>}
                            {!t.soon && t.beta && <span className="beta-badge">Beta</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <aside className="pnav-editorial" data-pane={section.id}>
            <div>
              <p className="pnav-editorial-title">{promo.title}</p>
              <p className="pnav-editorial-blurb">{promo.blurb}</p>
            </div>
            {section.id === 'create' && <ExportPreview />}
            {section.id === 'discover' && (
              <Suspense fallback={<div className="pnav-dcounts pnav-dcounts--wait" />}>
                <DiscoverCounts />
              </Suspense>
            )}
            {section.id === 'learn' && (
              <ul className="pnav-guides">
                {menuGuides().map((g) => (
                  <li className="pnav-guide" key={g.to}>
                    <span className="pnav-guide-label">{g.label}</span>
                    <span className="pnav-guide-mins">{g.mins}</span>
                  </li>
                ))}
              </ul>
            )}
            {section.id === 'create' ? (
              <button type="button" className="pnav-editorial-cta" onClick={onBrandKit} data-pnav-menuitem>
                <span>{brandKitLabel || promo.cta}</span>
                <ArrowRight />
              </button>
            ) : (
              <Link className="pnav-editorial-cta" to={promo.href} onClick={onPick} data-pnav-menuitem>
                <span>{promo.cta}</span>
                <ArrowRight />
              </Link>
            )}
          </aside>
        </div>
      </div>
      <div className="pnav-menu-foot">
        <span className="pnav-menu-foot-note">{menuFootNote(section)}</span>
        <Link className="pnav-menu-foot-link" to={section.viewAllHref} onClick={onPick} data-pnav-menuitem>
          <span>{menuViewAll(section)}</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
