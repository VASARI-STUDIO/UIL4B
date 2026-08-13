import { Component, useEffect, useRef, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import PillNav from './components/PillNav'
import Toast from './components/Toast'
import AppFooter from './components/AppFooter'
import FeedbackButton from './components/FeedbackButton'
import GoogleOneTap from './components/GoogleOneTap'
import BillingBanner from './components/BillingBanner'
import { useToast } from './hooks/useToast'
import { useClipboard } from './hooks/useClipboard'
import useSmoothScroll, { getLenis } from './hooks/useSmoothScroll'
import { initAnalytics, trackPageView, trackSessionPage } from './utils/analytics'
import { purgeStaleUsage } from './utils/usageTracker'
import { updateRouteMeta, isUnknownRoute } from './utils/routeMeta'
import { useAuth } from './contexts/AuthContext'
import { isAdminEmail } from './utils/constants'
import { DEFAULT_DESCRIPTION, PAGE_DESCRIPTIONS, PAGE_TITLES } from './data/routeMetaMap'
import { LoginPromptProvider, useLoginPrompt } from './contexts/LoginPromptContext'
import { ProModalProvider } from './contexts/ProModalContext'
import { useFirestoreSync } from './hooks/useFirestoreSync'
import { createRoutes } from './data/toolTree'

// Static imports — small or always-visited pages (instant load)
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import CreateTool from './pages/CreateTool'
import SurfaceLanding from './pages/SurfaceLanding'
import ColorLanding from './pages/ColorLanding'

// Lazy imports — the account, billing, legal and system pages (code-split),
// rendered inside the PillNav app-shell. The Create tool pages, Discover and
// Learn route through CreateTool / SurfaceLanding, so their old per-page imports
// are gone until Phase 2 wires each tool's real logic back in.
const Settings = lazy(() => import('./pages/Settings'))
const Community = lazy(() => import('./pages/Community'))
const Feedback = lazy(() => import('./pages/Feedback'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const SiteMap = lazy(() => import('./pages/SiteMap'))
const Admin = lazy(() => import('./pages/Admin'))
const Projects = lazy(() => import('./pages/Projects'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Plans = lazy(() => import('./pages/Plans'))
const CheckoutReturn = lazy(() => import('./pages/CheckoutReturn'))
const StyleGuide = lazy(() => import('./pages/StyleGuide'))
const HelpCentre = lazy(() => import('./pages/HelpCentre'))
const InfoCentre = lazy(() => import('./pages/InfoCentre'))
const SeoInspector = lazy(() => import('./pages/SeoInspector'))
const GradientGallery = lazy(() => import('./pages/GradientGallery'))
const PaletteGallery = lazy(() => import('./pages/PaletteGallery'))
// Moved from Create to Discover: it is a browse-and-take surface, not a tool
// you operate, so it belongs beside the palette and gradient libraries.
const PromptLibrary = lazy(() => import('./pages/PromptLibrary'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Create tool routes come straight from the single tool-tree source, so adding a
// tool never needs a hand-edited <Route>. These paths — plus /discover and
// /learn — render full-screen with their own PillNav (CreateTool / SurfaceLanding
// mount it themselves). Every other route renders inside the shared PillNav
// app-shell below; the old Sidebar + TopBar chrome is retired.
const CREATE_PATHS = createRoutes()
const CHROMELESS_PATHS = new Set([...CREATE_PATHS, '/discover', '/learn'])

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <h2>Something went wrong</h2>
            <p>This page ran into an unexpected error. Reloading usually fixes it.</p>
            <button onClick={() => window.location.reload()}>Reload page</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  // Wait for Firebase auth to resolve before deciding — otherwise a fresh load
  // or refresh of a protected route (e.g. /checkout) bounces a logged-in user
  // to /login because onAuthStateChanged hasn't fired yet.
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="fg-loader" />
      </div>
    )
  }
  // Carry the query with the path. RequireAuth wraps Checkout, so it redirects
  // before Checkout's own `state.from` (which does include ?plan=) can run —
  // pathname alone dropped the chosen plan on every gated checkout link.
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  return children
}

// Admin-only routes. RequireAuth was doing this job for /style-guide, which
// only ever asked "are you signed in?" — so the internal design system was
// readable by every account on the site. A non-admin is sent to the homepage
// rather than /login: they are already signed in, so a login wall would be a
// lie about why they can't be here, and the route's existence is not something
// they need told.
//
// Presentation only — see isAdminEmail in utils/constants.js. Routes holding
// real data verify server-side (/api/verify-admin), which the Admin dashboard
// already does and which this does not replace.
function RequireAdmin({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="fg-loader" />
      </div>
    )
  }
  if (!isAdminEmail(user?.email)) return <Navigate to="/" replace />
  return children
}

// The login "page" is a launcher for the app-wide LoginPopup (topmost z-index),
// kept as a real route so bookmarks, RequireAuth redirects and Checkout's
// `state.from` hand-off keep working. On success we send the user to where they
// were headed (RequireAuth / Checkout set location.state.from); on dismiss we
// return them there too so the URL never gets stuck on /login.
//
// The NAV no longer routes here — its "Log in" / "Start for Free" controls call
// openLogin() in place (see PillNav), so the popup opens over the current page
// and both dismiss and success leave the user exactly where they were. Routing
// to /login for those was the bug: it unmounted the page before the popup
// existed, and `from` defaulted to /home, so the X landed people on the
// dashboard instead of back on the Palette Library.
function LoginRoute() {
  const { openLogin } = useLoginPrompt()
  const { user, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from || '/home'
  // `/login?signup=1` (or `state.signup`) opens the sign-up form. The hero's
  // "Start building free" is a real <Link> so it can be middle-clicked, which
  // means the intent has to survive a full navigation — a prop cannot carry it.
  const wantsSignup = location.state?.signup === true
    || new URLSearchParams(location.search).get('signup') === '1'
  const started = useRef(false)

  useEffect(() => {
    if (loading || started.current) return
    started.current = true
    if (user) {
      navigate(from, { replace: true })
      return
    }
    // `from` is passed through so LoginPromptProvider stashes the intended
    // destination for a brand-new sign-up (AppInner intercepts those into
    // onboarding, which would otherwise discard it — QA Q1). The stash lives in
    // the provider now, so a nav-initiated sign-up that never touches this route
    // resumes correctly too.
    openLogin({ reason: '', from, signup: wantsSignup }).then(() => {
      navigate(from, { replace: true })
    })
  }, [loading, user, from, wantsSignup, navigate, openLogin])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="fg-loader" />
    </div>
  )
}

function AppInner() {
  const { user: authUser, loading: authLoading, pendingOnboarding, clearPendingOnboarding } = useAuth()
  useFirestoreSync(authUser?.uid || null)
  useSmoothScroll()
  const { message, visible, type, toast } = useToast()
  const copy = useClipboard(toast)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // purgeStaleUsage has existed since usageTracker was written and was never
    // called once, so every `vs-usage-<tool>-<date>` key a user ever generated
    // stayed in their localStorage permanently. It only removes keys whose date
    // suffix is before today, so it can never touch a live counter.
    purgeStaleUsage()
    return initAnalytics()
  }, [])

  // Brand-new sign-ups must reach onboarding no matter where they signed up from
  // (the /home logo, a tool's AuthGate, or an in-context save prompt). Auth
  // resolves without a route change, so we route here once, keyed off the
  // account-creation flag — returning users never carry it, so they are never
  // bounced (AUDIT-A1). Idempotent under StrictMode's dev double-invoke:
  // clearPendingOnboarding() flips the flag off before the second run's guard,
  // and a replace-navigation to the path we're already on is a no-op.
  useEffect(() => {
    if (authLoading || !authUser || !pendingOnboarding) return
    clearPendingOnboarding()
    if (location.pathname !== '/onboarding') navigate('/onboarding', { replace: true })
  }, [authLoading, authUser, pendingOnboarding, clearPendingOnboarding, location.pathname, navigate])

  useEffect(() => {
    document.querySelector('.main')?.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Chromeless surfaces (Home / Create tools / Discover / Learn) scroll the
    // window itself, not `.main`, so reset it too. When Lenis owns the scroll we
    // must reset through it (a raw window.scrollTo desyncs its virtual position);
    // when it's absent (reduced motion / teardown) fall back to native.
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    trackPageView(location.pathname)
    trackSessionPage(location.pathname)
    // Titles/descriptions for real destinations only. Legacy redirect-only paths
    // (/dashboard, /resources, /docs-*) are intentionally absent — they render a
    // <Navigate> and inherit their target's metadata, so an entry here would only
    // describe a page that no longer exists (AUDIT-B2).
    // Per-route title/description now live in src/data/routeMetaMap.js — plain
    // data, so scripts/prerender.mjs writes the SAME values into the served
    // HTML at build time and the two cannot drift.

    // A URL that resolves to nothing must not wear the homepage's title. It
    // read "UI L4B | Design Toolkit" in the tab, in history and in a bookmark,
    // so a 404 was indistinguishable from the homepage everywhere except the
    // page body. The strings match scripts/prerender.mjs's 404 shell.
    const missing = isUnknownRoute(location.pathname)
    const title = missing
      ? 'UI L4B | Page not found'
      : PAGE_TITLES[location.pathname] || 'UI L4B | Design Toolkit'
    const description = missing
      ? 'That page does not exist. Browse the tools, or head back to the homepage.'
      : PAGE_DESCRIPTIONS[location.pathname] || DEFAULT_DESCRIPTION
    document.title = title
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute('content', description)
    }
    // Canonical, og:*/twitter:* and the soon-route robots directive all track
    // the same title/description this route already computed (AUDIT B3).
    updateRouteMeta({ pathname: location.pathname, title, description })
  }, [location.pathname])

  // The sales / landing page is the public homepage. It renders full-screen with
  // its own PillNav. The root URL (/) serves it to logged-out visitors so it is
  // the first page that loads and is indexable; logged-in visitors are sent on to
  // /home (the Dashboard is gone).
  // /welcome is the legacy path — redirect it to /home so old links keep working.
  if (location.pathname === '/welcome') {
    return <Navigate to="/home" replace />
  }
  if (location.pathname === '/home') {
    return <><Home /><AppFooter /><GoogleOneTap /></>
  }
  if (location.pathname === '/onboarding') {
    return <Onboarding />
  }
  if (location.pathname.toLowerCase().replace(/\/+$/, '') === '/color/ui') {
    return <Navigate to="/color" replace />
  }
  if (location.pathname === '/') {
    // Render the sales page immediately — first paint must not depend on Firebase
    // auth resolving (otherwise a slow/misconfigured auth init leaves a blank page).
    // Once we positively know the visitor is logged in, canonicalise them onto
    // /home (the Dashboard is gone); new sign-ups still route through onboarding.
    if (!authLoading && authUser) {
      const onboarded = (() => { try { return localStorage.getItem('vs-onboarded') === '1' } catch { return true } })()
      return <Navigate to={onboarded ? '/home' : '/onboarding'} replace />
    }
    return <><Home /><AppFooter /><GoogleOneTap /></>
  }

  // Create tool shells + the Discover / Learn landings render full-screen with the
  // floating PillNav, outside the legacy app chrome. Matched on a normalised path
  // so a trailing slash or casing can't leak a chromeless route into the chrome
  // router below. Discover / Learn get a per-surface key so the scroll-reveal
  // observer re-scans when switching between them (they share one component).
  const bare = location.pathname.toLowerCase().replace(/\/+$/, '') || '/'
  if (CHROMELESS_PATHS.has(bare)) {
    // /color is the colour sales page (the old merged studio is being reworked
    // into the Design System Builder walkthrough); /discover and /learn are the
    // surface landings; everything else is a live Create tool shell.
    const surface = bare === '/discover' ? 'discover' : bare === '/learn' ? 'learn' : null
    return (
      <>
        {bare === '/color'
          ? <><ColorLanding /><AppFooter /></>
          : surface ? <><SurfaceLanding key={surface} surface={surface} /><AppFooter /></> : <CreateTool />}
        <GoogleOneTap />
      </>
    )
  }

  return (
    <div className="app-shell">
      <PillNav />

      <main className="app-page" id="main" tabIndex={-1} key={location.pathname}>
        <ErrorBoundary>
          <Suspense fallback={<div className="page-loading"><div className="fg-loader" /></div>}>
            <Routes location={location}>
              {/* Legacy tool URLs → the merged, canonical routes (all chromeless,
                  caught by the early return above once redirected). */}
              <Route path="/dashboard" element={<Navigate to="/home" replace />} />
              <Route path="/color-studio" element={<Navigate to="/color" replace />} />
              <Route path="/palette" element={<Navigate to="/color/palette" replace />} />
              <Route path="/tints" element={<Navigate to="/color/tint" replace />} />
              <Route path="/gradients" element={<Navigate to="/color/gradient" replace />} />
              <Route path="/contrast" element={<Navigate to="/color/contrast" replace />} />
              <Route path="/export" element={<Navigate to="/color" replace />} />
              <Route path="/imgconvert" element={<Navigate to="/file-converter" replace />} />
              <Route path="/video-frames" element={<Navigate to="/file-converter" replace />} />
              <Route path="/docs" element={<Navigate to="/learn" replace />} />
              <Route path="/docs-design" element={<Navigate to="/learn" replace />} />
              <Route path="/docs-social" element={<Navigate to="/learn" replace />} />
              <Route path="/docs-themes" element={<Navigate to="/learn" replace />} />
              <Route path="/docs-brand" element={<Navigate to="/learn" replace />} />
              <Route path="/docs-seo" element={<Navigate to="/learn" replace />} />
              <Route path="/docs-marketing" element={<Navigate to="/learn" replace />} />
              <Route path="/docs-ai" element={<Navigate to="/learn" replace />} />
              <Route path="/design-reference" element={<Navigate to="/learn" replace />} />
              <Route path="/resources" element={<Navigate to="/discover" replace />} />
              {/* The Prompt Library moved from Create to Discover. Any existing
                  link, bookmark or indexed URL still lands on it. */}
              <Route path="/prompts" element={<Navigate to="/discover/prompts" replace />} />

              {/* Curated gradient gallery — copy CSS or hand a gradient to the
                  Gradient Generator (?gs= scheme). Renders inside the app-shell. */}
              <Route path="/discover/gradients" element={<GradientGallery toast={toast} />} />
              <Route path="/discover/palettes" element={<PaletteGallery toast={toast} />} />
              <Route path="/discover/prompts" element={<PromptLibrary toast={toast} />} />

              {/* Account, billing, legal and system pages — rendered inside the
                  PillNav app-shell (the wrapper return below). */}
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/projects" element={<RequireAuth><Projects toast={toast} /></RequireAuth>} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/pricing" element={<Navigate to="/plans" replace />} />
              <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
              <Route path="/checkout/return" element={<RequireAuth><CheckoutReturn /></RequireAuth>} />
              <Route path="/settings" element={<Settings toast={toast} />} />
              <Route path="/community" element={<Community toast={toast} />} />
              <Route path="/feedback" element={<Feedback toast={toast} />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/sitemap" element={<SiteMap />} />
              <Route path="/site-map" element={<Navigate to="/sitemap" replace />} />
              <Route path="/help" element={<HelpCentre />} />
              <Route path="/info" element={<InfoCentre />} />
              <Route path="/seo" element={<SeoInspector onCopy={copy} toast={toast} />} />
              <Route path="/about" element={<Navigate to="/help#about" replace />} />
              <Route path="/faq" element={<Navigate to="/help#faq" replace />} />
              <Route path="/admin" element={<RequireAuth><Admin toast={toast} /></RequireAuth>} />
              <Route path="/style-guide" element={<RequireAdmin><StyleGuide toast={toast} /></RequireAdmin>} />
              {/* A real 404, not a redirect. The redirect made every typo and
                  dead backlink a 200-status indexable copy of the homepage, and
                  silently teleported the user so a broken link looked like it
                  had worked. See pages/NotFound.jsx. */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <AppFooter />
      <Toast message={message} visible={visible} type={type} />
      <FeedbackButton />
      <GoogleOneTap />
    </div>
  )
}

// Wrap the whole app in the two app-wide overlay providers so every route —
// including the chromeless early-return surfaces above — can open the login
// popup and the Pro-upgrade modal over the current page. LoginPromptProvider is
// the outer of the two so the Pro modal's CTA can call requireLogin. Both sit
// inside AuthProvider (main.jsx), which LoginPromptProvider depends on.
export default function App() {
  return (
    <LoginPromptProvider>
      <ProModalProvider>
        {/* Skip-to-content: first focusable element on every route, so a keyboard
            user's first Tab bypasses the repeated PillNav and jumps to #main
            (WCAG 2.4.1). Each layout tags its content-start with id="main". */}
        <a href="#main" className="skip-link">Skip to content</a>
        <AppInner />
        {/* Mounted out here rather than inside AppInner's shell: every Create
            tool takes the CHROMELESS_PATHS early return, and those are exactly
            the pages where a lapsed subscription is about to be felt. */}
        <BillingBanner />
      </ProModalProvider>
    </LoginPromptProvider>
  )
}
