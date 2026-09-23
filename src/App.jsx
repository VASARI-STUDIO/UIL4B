import { Component, useEffect, useRef, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import PillNav from './components/PillNav'
import Toast from './components/Toast'
import AppFooter from './components/AppFooter'
import FeedbackButton from './components/FeedbackButton'
import GoogleOneTap from './components/oneTapMount'
import BillingBanner from './components/BillingBanner'
import NoticeStack from './components/NoticeStack'
import { useToast } from './hooks/useToast'
import { useClipboard } from './hooks/useClipboard'
import useSmoothScroll, { getLenis } from './hooks/useSmoothScroll'
import { initAnalytics, trackPageView, trackSessionPage } from './utils/analytics'
import { purgeStaleUsage } from './utils/usageTracker'
import { onboardingDestination } from './utils/onboardingState'
import { readSessionHint, rootDestination } from './utils/sessionHint'
import { openFirebaseGate } from './utils/firebaseAccess'
import { updateRouteMeta, isUnknownRoute } from './utils/routeMeta'
import { useAuth } from './contexts/AuthContext'
import { isAdminEmail } from './utils/constants'
import { DEFAULT_DESCRIPTION, PAGE_DESCRIPTIONS, PAGE_TITLES } from './data/routeMetaMap'
import { LoginPromptProvider, useLoginPrompt } from './contexts/LoginPromptContext'
import { ProModalProvider } from './contexts/ProModalContext'
import { useFirestoreSync } from './hooks/useFirestoreSync'
import { useSessionHint } from './hooks/useSessionHint'
import { chromelessRoutes } from './data/toolTree'
import { CLIENT_REDIRECT_ROUTES } from './data/legacyRoutes'

// Static imports — small or always-visited pages (instant load)
//
// SPECTRUM IS THE FRONT DOOR AND THEREFORE STATIC. It was `lazy()` while it
// lived on a preview route; the front door is the first paint and must not wait
// on a chunk, which is the same reason <Home /> was static here for as long as
// it existed. Its sheet moved out of `styles/deferred/` in the same commit, and
// the ~22 KB of `.home-*` rules that were deleted from global.css alongside it
// are what pays for that on the render-blocking budget.
import Spectrum from './pages/Spectrum'
import Onboarding from './pages/Onboarding'
import CreateTool from './pages/CreateTool'

// Lazy imports — the account, billing, legal and system pages (code-split),
// rendered inside the PillNav app-shell. The Create tool pages, Discover and
// Learn route through CreateTool / SurfaceIndex, so their old per-page imports
// are gone until Phase 2 wires each tool's real logic back in.
const Settings = lazy(() => import('./pages/Settings'))
const Community = lazy(() => import('./pages/Community'))
const Feedback = lazy(() => import('./pages/Feedback'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
// /credits — the colophon. Lazy for the same reason /privacy and /terms are:
// it is a reading surface nobody arrives on, and it pulls the whole credits
// manifest (every font notice, every package licence) with it. That manifest
// must never reach the entry chunk — see tests/unit/home-asset-budget.test.js.
const Credits = lazy(() => import('./pages/Credits'))
const SiteMap = lazy(() => import('./pages/SiteMap'))
const Admin = lazy(() => import('./pages/Admin'))
const Projects = lazy(() => import('./pages/Projects'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Plans = lazy(() => import('./pages/Plans'))
const CheckoutReturn = lazy(() => import('./pages/CheckoutReturn'))
const StyleGuide = lazy(() => import('./pages/StyleGuide'))
const HelpCentre = lazy(() => import('./pages/HelpCentre'))
// /principles — the product's design positions, each beside the screen that
// enforces it. Inside the app shell rather than chromeless: it is a reading
// surface like a Learn article, not a surface landing that mounts its own nav.
const DesignPrinciples = lazy(() => import('./pages/DesignPrinciples'))
const InfoCentre = lazy(() => import('./pages/InfoCentre'))
const SeoInspector = lazy(() => import('./pages/SeoInspector'))
const GradientGallery = lazy(() => import('./pages/GradientGallery'))
const PaletteGallery = lazy(() => import('./pages/PaletteGallery'))
// Moved from Create to Discover: it is a browse-and-take surface, not a tool
// you operate, so it belongs beside the palette and gradient libraries.
const PromptLibrary = lazy(() => import('./pages/PromptLibrary'))
const CuratedResources = lazy(() => import('./pages/CuratedResources'))
// One Learn article, rendered inside the PillNav app-shell. /learn itself is
// chromeless (SurfaceIndex mounts its own nav); its articles are not, the same
// way /discover is chromeless and /discover/palettes is not.
const LearnArticle = lazy(() => import('./pages/LearnArticle'))
const NotFound = lazy(() => import('./pages/NotFound'))
// /discover and /learn — the two surface INDEXES, in one component.
//
// STATIC UNTIL 2026-09-18, and it was static for a reason that expired: it
// shared `.home-*` with the homepage, so its rules were in the render-blocking
// sheet whether it was eager or not and laziness bought nothing. Home is gone,
// those rules moved into src/styles/pages/surface.css, and an eager import
// would drag that sheet straight back into the entry chunk. Neither of these
// routes is a first paint.
const SurfaceIndex = lazy(() => import('./pages/SurfaceIndex'))

// Create tool routes come straight from the single tool-tree source, so adding a
// tool never needs a hand-edited <Route>. These paths — plus /discover and
// /learn — render full-screen with their own PillNav (CreateTool / SurfaceIndex
// mount it themselves). Every other route renders inside the shared PillNav
// app-shell below; the old Sidebar + TopBar chrome is retired.
// Same membership it always had (the Create routes plus /discover and /learn),
// now read from the ONE exported list rather than rebuilt here, so this early
// return and the app-wide feedback mount at the bottom of the file cannot drift
// apart when a tool is added. tests/unit/feedback-reach.test.js fails if they do.
const CHROMELESS_PATHS = new Set(chromelessRoutes())

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
  // URGENT. Under VITE_DEFER_FIREBASE the auth listener is patient by default —
  // it waits for LCP or idle before fetching the SDK — and that is right for
  // the sales page, where nothing is waiting on the answer. Here something is:
  // this component renders a spinner until `loading` clears. Opening the gate
  // makes the wait exactly what it is today. A no-op in an unflagged build.
  useEffect(() => { openFirebaseGate() }, [])
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
  useEffect(() => { openFirebaseGate() }, [])
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
    // isPageTitle: this route renders null below, so the dialog is the only
    // thing in the document and its title has to be the h1. Measured before:
    // /login served zero h1 and an empty <main>.
    openLogin({ reason: '', from, signup: wantsSignup, isPageTitle: true }).then(() => {
      navigate(from, { replace: true })
    })
  }, [loading, user, from, wantsSignup, navigate, openLogin])

  // ── The spinner belongs to the ONE state that is still resolving ──────────
  //
  // This route painted a turning `.fg-loader` unconditionally, so it kept
  // turning for as long as the dialog was open — which is until the visitor
  // acts, i.e. indefinitely. Rendered at 320 through 1920 in both themes, it
  // sits 146px from the top of the viewport, behind a 6px backdrop blur, as a
  // grey smudge above the dialog: a loading indicator for a page that has
  // finished loading, and the one thing on screen behind the sign-in form.
  // `principle-ai-slop-diagnostic` names this exactly — "loading effects imply
  // intelligence without explaining system state" — and it is the only motif on
  // this route that carries no meaning.
  //
  // While `loading` is true there IS something to wait for: AuthContext has not
  // yet said whether there is a session, and the popup has not been raised. The
  // spinner is honest there and is kept, unchanged. After that, this route has
  // no work left — it either navigates away or the dialog IS the page — so it
  // draws nothing. `renderState()` in tests/user-sim/helpers.js already counts
  // an open `[role="dialog"]` as the route's own content, which is why an empty
  // `main` here is a rendered page rather than a blank one.
  if (!loading) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="fg-loader" />
    </div>
  )
}

function AppInner() {
  const { user: authUser, userProfile, loading: authLoading, pendingOnboarding, clearPendingOnboarding } = useAuth()
  useFirestoreSync(authUser?.uid || null)
  // Records what auth resolved to, so the NEXT cold load can pick the right
  // page before Firebase has finished loading. See utils/sessionHint.js.
  useSessionHint()
  useSmoothScroll()
  const { message, visible, type, toast, dismiss } = useToast()
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
    // `fresh` tells Onboarding this is a brand-new account: it must render the
    // flow even if this browser holds another account's completion flag.
    if (location.pathname !== '/onboarding') navigate('/onboarding', { replace: true, state: { fresh: true } })
  }, [authLoading, authUser, pendingOnboarding, clearPendingOnboarding, location.pathname, navigate])

  useEffect(() => {
    document.querySelector('.main')?.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Chromeless surfaces (the sales page / Create tools / Discover / Learn) scroll the
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
    // THE LOOKUP KEY IS NORMALISED, and it has to be, because the other two
    // readers of this same pathname already are: canonicalUrl() strips a
    // trailing slash (routeMeta.js) and so does isUnknownRoute() one line
    // above. PAGE_TITLES did not, so "/learn/" missed the map and fell through
    // to the homepage default — measured on the built preview, every route:
    // /learn/, /discover/, /discover/palettes/, /community/ and
    // /learn/colour-contrast/ all rendered "UI L4B | Design Toolkit" and the
    // homepage's description, while their canonical tag correctly pointed at
    // the unslashed URL. Both spellings are served 200 (vercel.json sets no
    // trailingSlash), so this reached a real visitor's tab, bookmark and any
    // crawler that runs JS.
    const metaPath = location.pathname.replace(/\/+$/, '') || '/'
    const title = missing
      ? 'UI L4B | Page not found'
      : PAGE_TITLES[metaPath] || 'UI L4B | Design Toolkit'
    const description = missing
      ? 'That page does not exist. Browse the tools, or head back to the homepage.'
      : PAGE_DESCRIPTIONS[metaPath] || DEFAULT_DESCRIPTION
    document.title = title
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute('content', description)
    }
    // Canonical, og:*/twitter:* and the soon-route robots directive all track
    // the same title/description this route already computed (AUDIT B3).
    updateRouteMeta({ pathname: location.pathname, title, description })
  }, [location.pathname])

  // ── THE FRONT DOOR ────────────────────────────────────────────────────
  //
  // `/` decides; `/home` never does. That split is the whole routing change, and
  // it is the founder's own wording, approved explicitly on 2026-09-05:
  //
  //     “i want the sales page to mostly be for new users if a user is already
  //      logged in and navigates to the website it takes them to the dashboard
  //      page unless they click they home button or navigate to specifly /home”
  //
  // So there are two URLs for one page and they answer different questions:
  //
  //   /home  is the sales page, unconditionally, for everybody. It is what the
  //          nav logo links to (PillNav), it is prerendered, and the branch below
  //          reads no auth state at all — there is no code path on which a signed-in
  //          visitor at /home is sent anywhere. That is the founder's exception,
  //          and tests/unit/user-home.test.js asserts it structurally.
  //
  //   /      is the decision. Signed out it renders the same sales page (so the
  //          indexable root is unchanged and first paint is unchanged). Signed in
  //          it hands over to the User Home.
  //
  // THE SALES PAGE IS SPECTRUM, AND IT RENDERS ITS OWN FOOTER.
  //
  // No <AppFooter /> beside it, deliberately: <SpectrumFooter /> is part of the
  // page. Mounting both would give the front door two `contentinfo` landmarks
  // and two copyright lines, which is a defect a landmark list shows
  // immediately and a screenshot does not. The one thing AppFooter carried that
  // had to survive is <FounderNote />, and SpectrumFooter mounts it.
  //
  // The '/spectrum' preview route is GONE. It existed only so the page could be
  // built and reviewed while Home still owned '/'; keeping it would leave a
  // second URL serving the front door, indexable, with no canonical of its own.
  //
  // /welcome is the legacy path — redirect it to /home so old links keep working.
  if (location.pathname === '/welcome') {
    return <Navigate to="/home" replace />
  }
  if (location.pathname === '/home') {
    return <><Spectrum /><GoogleOneTap /></>
  }
  if (location.pathname === '/onboarding') {
    return <Onboarding />
  }
  // Retargeted with the colour landing's deletion: /create/color is no longer a
  // page, it is a category home that bounces to its first tool like the other
  // four. Pointing this at it would have been a two-hop redirect, which is the
  // exact defect src/data/legacyRoutes.js exists to prevent — so both this early
  // return and the table's four other entries now name /create/palette.
  if (location.pathname.toLowerCase().replace(/\/+$/, '') === '/color/ui') {
    return <Navigate to="/create/palette" replace />
  }
  if (location.pathname === '/') {
    // FIRST PAINT MUST NOT WAIT ON FIREBASE. The obvious implementation of this
    // redirect — hold a loader until onAuthStateChanged fires, then decide — has a
    // cost already measured in this repo and written into
    // tests/user-sim/20-billing-banner.spec.js: that wait is “measured at ~1s here”.
    // A second of blank loader in front of the front door, for the people who use
    // the product most, is a worse product than the sales page it replaced — and
    // [firebase-critical-path] is open precisely because Firebase sits on this path.
    // Rendering the sales page first and swapping once auth resolves is no better:
    // that is a second of the WRONG page, followed by a jump.
    //
    // So the decision is made from a synchronous localStorage hint written the last
    // time auth resolved (utils/sessionHint.js), which costs microseconds and is
    // right for every returning visitor and every first-time visitor. Resolved auth
    // overrides it in both directions, so a stale hint survives exactly one paint.
    //
    // Onboarding is a property of the ACCOUNT, not of this browser — which is why
    // the destination comes from onboardingDestination(userProfile) rather than from
    // localStorage. It used to read localStorage alone, so a returning user on a new
    // device, a second browser, an incognito window or after clearing site data was
    // sent back through onboarding every time. Brand-new sign-ups do not depend on
    // this path at all: `pendingOnboarding` routes them from the auth event itself
    // (see the effect above).
    const destination = rootDestination({
      loading: authLoading,
      signedIn: !!authUser,
      hint: readSessionHint(),
      appHome: onboardingDestination(userProfile),
      salesPage: '/home',
    })
    // '/home' is the one destination we render in place rather than navigate to:
    // it is byte-identical to this URL, and redirecting `/` to `/home` would move
    // every signed-out visitor and every crawler off the canonical root.
    if (destination !== '/home') return <Navigate to={destination} replace />
    return <><Spectrum /><GoogleOneTap /></>
  }

  // Create tool shells + the Discover / Learn indexes render full-screen with the
  // floating PillNav, outside the legacy app chrome. Matched on a normalised path
  // so a trailing slash or casing can't leak a chromeless route into the chrome
  // router below. Discover / Learn get a per-surface key so the scroll-reveal
  // observer re-scans when switching between them (they share one component).
  const bare = location.pathname.toLowerCase().replace(/\/+$/, '') || '/'
  if (CHROMELESS_PATHS.has(bare)) {
    // /discover and /learn are the two surface INDEXES; everything else here is a
    // live Create tool shell.
    //
    // /create/color IS NO LONGER INTERCEPTED. It was the one Create category home
    // that rendered a page — ColorLanding, the colour sales page — and the founder
    // deleted it with the other two landings. It now falls through to <CreateTool />
    // and bounces to /create/palette exactly like /create/typography,
    // /create/imagery, /create/ai-tools and /create/icons-emoji already do.
    // CREATE_HOMES_THAT_RENDER in toolTree.js is the fact that says so, and it is
    // now empty; tests/unit/prerender-routes.test.js reads it against this file.
    const surface = bare === '/discover' ? 'discover' : bare === '/learn' ? 'learn' : null
    return (
      <>
        {surface
          // Its own Suspense boundary: this branch returns ABOVE the app shell,
          // and the shell's <Suspense> is what every other lazy page leans on.
          ? (
            <Suspense fallback={<div className="page-loading"><div className="fg-loader" /></div>}>
              <SurfaceIndex key={surface} surface={surface} />
              <AppFooter />
            </Suspense>
          )
          : <CreateTool />}
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
              {/* Every retired URL → its live replacement, rendered from the one
                  table in src/data/legacyRoutes.js that also generates
                  vercel.json's 301s. Two answers to the same question used to be
                  written out twice; now the edge and the client cannot disagree,
                  and a unit test fails the build if they do.

                  These are the FALLBACK, not the primary answer: in production
                  the 301 fires at the edge and the visitor never reaches this
                  router. They still matter — `vite preview` does not apply
                  vercel.json, so this is the only redirect the browser-acceptance
                  suite can observe, and it is what catches an in-app <Link> that
                  still names a retired path. */}
              {CLIENT_REDIRECT_ROUTES.map(([from, to]) => (
                <Route key={from} path={from} element={<Navigate to={to} replace />} />
              ))}

              {/* Curated gradient gallery — copy CSS or hand a gradient to the
                  Gradient Generator (?gs= scheme). Renders inside the app-shell. */}
              <Route path="/discover/gradients" element={<GradientGallery toast={toast} />} />
              <Route path="/discover/palettes" element={<PaletteGallery toast={toast} />} />
              {/* `onCopy` is not optional here. PromptLibrary destructures it
                  and copyPrompt calls it bare, so without it BOTH copy paths in
                  the modal — the body click and the "Copy prompt" button —
                  threw `onCopy is not a function`, silently: no text, no toast,
                  no visible error, on the page whose whole product is the text
                  you came to copy. Same helper /seo is given below. */}
              <Route path="/discover/prompts" element={<PromptLibrary onCopy={copy} toast={toast} />} />
              {/* Curated Resources — the hand-picked external set in
                  src/data/discoverResources.js. The nav has advertised this as
                  “Soon” since Slice 2 while the data sat unrendered; this is the
                  route that makes the menu entry true. */}
              <Route path="/discover/resources" element={<CuratedResources />} />

              {/* Learn articles. An unknown slug renders NotFound from inside
                  LearnArticle rather than matching here, so /learn/nonsense is a
                  real 404 instead of a 200 with the landing page's content. */}
              <Route path="/learn/:slug" element={<LearnArticle />} />

              {/* Account, billing, legal and system pages — rendered inside the
                  PillNav app-shell (the wrapper return below). */}
              <Route path="/login" element={<LoginRoute />} />
              {/* THE USER HOME, and deliberately NOT behind RequireAuth any more.

                  RequireAuth holds a loader until Firebase resolves and then sends a
                  signed-out visitor to /login. Both halves are wrong for the page
                  that signed-in visitors now land on:

                  · THE LOADER is the ~1s wait this whole change exists to remove.
                    The page has plenty it can render without knowing who you are —
                    the tip, the day's starters, the whole frame — and it renders
                    them immediately, resolving only the project list.

                  · THE REDIRECT could loop. A visitor whose session lapsed between
                    page loads still carries the session hint, so `/` sends them
                    here; RequireAuth would send them to /login; dismissing the
                    popup returns them to /projects, which redirects again. Making
                    the page render its own signed-out state removes the loop by
                    construction rather than by guarding against it.

                  Nothing private is exposed by that: with no user the project list
                  is empty, and the free-plan allowance stays behind the same
                  `canSaveProjects` early return it always did — which is the
                  property tests/user-sim/20-billing-banner.spec.js actually
                  guards, and it still guards it. */}
              <Route path="/projects" element={<Projects toast={toast} />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
              <Route path="/checkout/return" element={<RequireAuth><CheckoutReturn /></RequireAuth>} />
              <Route path="/settings" element={<Settings toast={toast} />} />
              <Route path="/community" element={<Community toast={toast} />} />
              <Route path="/feedback" element={<Feedback toast={toast} />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/credits" element={<Credits />} />
              <Route path="/sitemap" element={<SiteMap />} />
              <Route path="/help" element={<HelpCentre />} />
              <Route path="/principles" element={<DesignPrinciples />} />
              <Route path="/info" element={<InfoCentre />} />
              <Route path="/seo" element={<SeoInspector onCopy={copy} toast={toast} />} />
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
      <Toast message={message} visible={visible} type={type} onDismiss={dismiss} />
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
        {/* Same reasoning as the billing banner, for the offline and sync
            notices: mounted outside AppInner's shell so they also reach the
            chromeless Create tools. The sync notice was originally inside the
            shell beside <Toast>, under a comment explaining it belonged on
            every route because "the person whose sync has stopped is, by
            definition, busy editing — and the surface they are editing on is a
            tool page". Every tool page takes the CHROMELESS_PATHS early return
            above the shell, so those were exactly the routes it never reached:
            measured 2026-09-08, a refused sync showed on /projects and
            /discover/palettes and was absent from the DOM on /create/palette,
            /create/type-scale, /create/font-pair, /create/contrast,
            /create/tint and /create/auto-builder. See
            tests/user-sim/65-new-surfaces-breakpoints.spec.js.

            Both now render as rows inside <NoticeStack>, which reserves the
            height they occupy instead of floating them over the toolbar of
            whatever tool is open — founder decision, 2026-09-14. */}
        <NoticeStack />
        {/* And the feedback entry points, for the same reason a fourth time —
            except that this one is about the RIGHT-CLICK menu rather than a
            banner. Mounted inside AppInner's shell it was absent from every
            chromeless route, which is most of the product and all of the
            Create tools: measured 2026-09-10, a right-click offered to report
            the element on /projects, /settings and /feedback and did nothing
            at all on /create/palette, /create/type-scale, /create/contrast,
            /discover, /learn and /home — the pages where a tool misbehaving is
            the thing someone actually wants to report.
            The floating button's own reach is deliberately UNCHANGED: the
            component hides it on exactly the routes this mount newly reaches,
            so no Create tool gains a fixed bottom-right button. That corner has
            documented collisions (see the .global-feedback-btn notes in
            global.css), and widening the button was never the ask.
            See tests/user-sim/74-right-click-feedback-reach.spec.js. */}
        <FeedbackButton />
      </ProModalProvider>
    </LoginPromptProvider>
  )
}
