import { Component, useEffect, useRef, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import PillNav from './components/PillNav'
import Toast from './components/Toast'
import AppFooter from './components/AppFooter'
import FeedbackButton from './components/FeedbackButton'
import GoogleOneTap from './components/GoogleOneTap'
import { useToast } from './hooks/useToast'
import { useClipboard } from './hooks/useClipboard'
import useSmoothScroll, { getLenis } from './hooks/useSmoothScroll'
import { initAnalytics, trackPageView, trackSessionPage } from './utils/analytics'
import { updateRouteMeta } from './utils/routeMeta'
import { useAuth } from './contexts/AuthContext'
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
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

// The login "page" is now just a launcher for the app-wide LoginPopup (topmost
// z-index), so every existing `<Link to="/login">` / `navigate('/login')` opens
// the popup over the app instead of a full page. On success we send the user to
// where they were headed (RequireAuth / Checkout set location.state.from); on
// dismiss we return them there too so the URL never gets stuck on /login.
function LoginRoute() {
  const { openLogin } = useLoginPrompt()
  const { user, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from || '/home'
  const started = useRef(false)

  useEffect(() => {
    if (loading || started.current) return
    started.current = true
    if (user) {
      navigate(from, { replace: true })
      return
    }
    // A brand-new sign-up completed from this launcher is intercepted into
    // onboarding by AppInner, which would otherwise discard `from` (QA Q1).
    // Stash the intended destination so onboarding can resume the user there;
    // the /home default needs no stash, and the key is session-scoped and
    // consumed only inside the onboarding flow (harmless for existing logins).
    if (from && from !== '/home') {
      try { sessionStorage.setItem('vs-resume-after-onboarding', from) } catch { /* ignore */ }
    }
    openLogin({ reason: '', from }).then(() => {
      navigate(from, { replace: true })
    })
  }, [loading, user, from, navigate, openLogin])

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
    const PAGE_TITLES = {
      '/': 'UI L4B | Design Toolkit',
      '/home': 'UI L4B | Design Toolkit',
      '/color': 'UI L4B | Colour System Generator',
      '/color/palette': 'UI L4B | Palette Generator',
      '/color/semantic': 'UI L4B | Semantic Colour Generator',
      '/color/tint': 'UI L4B | Tint Scale Generator',
      '/color/gradient': 'UI L4B | Gradient Generator',
      '/color/contrast': 'UI L4B | Colour Contrast Checker',
      '/typography': 'UI L4B | Typography',
      '/typescale': 'UI L4B | Type Scale Generator',
      '/fontpairs': 'UI L4B | Font Pair',
      '/fontgallery': 'UI L4B | Font Gallery',
      '/icons': 'UI L4B | Icon Library',
      '/imagery': 'UI L4B | Imagery',
      '/icons-emoji': 'UI L4B | Icons & Emoji',
      '/discover': 'UI L4B | Discover',
      '/discover/gradients': 'UI L4B | Gradient Library',
      '/learn': 'UI L4B | Learn',
      '/alt-text': 'UI L4B | Alt Text Generator',
      '/ai-prompt': 'UI L4B | AI Image Prompt Generator',
      '/ai-tools': 'UI L4B | AI Tools',
      '/landing-prompts': 'UI L4B | AI Landing Page Prompts',
      '/prompts': 'UI L4B | Prompt Library',
      '/emoji': 'UI L4B | Emoji Library',
      '/ratio': 'UI L4B | Aspect & Resolution Calculator',
      '/box-shadow': 'UI L4B | Box Shadow',
      '/ui-builder': 'UI L4B | UI Builder',
      '/projects': 'UI L4B | Projects',
      '/settings': 'UI L4B | Settings',
      '/login': 'UI L4B | Sign In',
      '/plans': 'UI L4B | Pricing & Plans',
      '/checkout': 'UI L4B | Checkout',
      '/community': 'UI L4B | Community',
      '/feedback': 'UI L4B | Feedback',
      '/help': 'UI L4B | Help Centre',
      '/info': 'UI L4B | Information Centre',
      '/seo': 'UI L4B | SEO Specialist',
      '/privacy': 'UI L4B | Privacy',
      '/terms': 'UI L4B | Terms',
      '/sitemap': 'UI L4B | Sitemap',
      '/admin': 'UI L4B | Admin',
      '/auto-builder': 'UI L4B | UI Auto-Builder',
      '/file-converter': 'UI L4B | File Converter',
    }
    const DEFAULT_DESCRIPTION = 'Free browser-based design toolkit. Colour palettes, type scales, font pairing, icon library, image conversion, video frames, and production-ready CSS exports.'
    const PAGE_DESCRIPTIONS = {
      '/': DEFAULT_DESCRIPTION,
      '/home': DEFAULT_DESCRIPTION,
      '/color': 'Build professional colour systems with palette generation, tint scales, gradient builder, and named colour libraries. Export CSS, Tailwind, PNG and SVG.',
      '/color/palette': 'Generate a professional colour palette from one seed colour. Harmony systems, tonal ramps, accessibility checks, and production-ready CSS exports.',
      '/color/semantic': 'Generate semantic UI colours — success, warning, error, and info — that stay legible and consistent with your palette in light and dark mode.',
      '/color/tint': 'Turn any colour into a production-ready 50–950 tint scale. Tune the curve, hue drift, and end stops, then copy swatches or CSS variables.',
      '/color/gradient': 'Design CSS gradients across your palette. Linear, radial, and conic, with editable stops and angle — copy production-ready CSS in one click.',
      '/color/contrast': 'Free WCAG colour contrast checker. Test text and background pairs against AA and AAA, preview the pair live, and get one-click fixes that pass.',
      '/typography': 'Typography tools for designers and developers. Pair fonts, build type scales, and browse the Google Fonts catalogue.',
      '/typescale': 'Free modular type scale generator. Set a base size and a ratio, preview the whole scale in a real layout, and copy CSS custom properties, Tailwind or SCSS.',
      '/fontpairs': 'Free font pairing tool. Pick a heading face and see which body faces work under it — with the reasoning — previewed as a real page, then copy the import and CSS.',
      '/fontgallery': 'Browse the Google Fonts catalogue with full specimens, category filters and side-by-side comparison, then carry a family into a pairing or a type scale.',
      '/icons': 'Search 200,000+ icons from popular packs. Preview, customize colours, and copy SVG or JSX code instantly.',
      '/imagery': 'Image tools for the web — convert and compress images, extract video frames, and calculate aspect ratios.',
      '/icons-emoji': 'Search 200,000+ icons and browse every emoji by category. Copy SVG or emoji to your clipboard instantly.',
      '/discover': 'Discover the best external design resources — gradients, palettes, fonts, components and inspiration — with a one-tap hand-off into the UI L4B tools that use them.',
      '/discover/gradients': 'A curated library of the best gradient resources on the web. Preview, then bring a gradient straight into the UI L4B Gradient Generator.',
      '/learn': 'Understand the why behind good interfaces — design principles, theme systems, and practical guides for UI foundations that hold up. The Learn library is on the way.',
      '/alt-text': 'Generate accessible alt text for images using AI. Improve SEO and screen-reader support in seconds.',
      '/ai-prompt': 'Generate detailed AI image prompts with style, lighting, and composition controls. Copy-ready for Midjourney, DALL-E, and Stable Diffusion.',
      '/ai-tools': 'AI-powered design tools — image prompt generation, alt text, and landing page copy. Powered by OpenRouter and Gemini.',
      '/landing-prompts': 'Generate AI-powered landing page copy, headlines, and CTAs. Tailored to your product and audience.',
      '/prompts': 'Browse and submit community design prompts for AI image and web generators.',
      '/emoji': 'Browse, search, and copy emojis by category. Preview skin tones and find the perfect emoji for any context.',
      '/ratio': 'Free aspect ratio and resolution calculator. Pick a device, screen, social format or ratio — get exact dimensions, PPI, and diagonal with a live shape preview.',
      '/box-shadow': 'Design layered box shadows with real-time preview. Fine-tune blur, spread, offset, and colour for each layer.',
      '/ui-builder': 'Build complete UI design systems with guided steps. Pick colours, fonts, type scales, and export production-ready CSS.',
      '/auto-builder': 'Automatically generate a full UI design system from a single colour or inspiration URL using AI.',
      '/projects': 'Manage and organise your saved design projects. Access colour palettes, font selections, and exported assets.',
      '/settings': 'Customise your UI L4B experience. Manage theme, appearance, subscription, and account preferences.',
      '/login': 'Sign in to UI L4B to save projects, sync settings, and unlock AI-powered design tools.',
      '/plans': 'Simple, honest pricing for UI L4B. Start free forever — 40 AI generations a day, unlimited palettes and exports — or upgrade to Pro for 1,000 daily AI generations and higher-quality models.',
      '/checkout': 'Upgrade to UI L4B Pro for 1,000 daily AI generations, higher-quality models, and synced projects.',
      '/community': 'Join the UI L4B community. Share designs, discover inspiration, and connect with other designers and developers.',
      '/feedback': 'Share your feedback, report bugs, or request features for UI L4B. We read every submission.',
      '/help': 'Get help with UI L4B. Browse FAQs, learn about features, and find answers to common questions.',
      '/info': 'The UI L4B Information Centre — a single, searchable guide to every tool, keyboard shortcuts, privacy, and a live screen-size inspector.',
      '/seo': 'Free SEO Meta & SERP Inspector. Preview your Google search snippet and social card live, and get an instant, actionable SEO score as you type.',
      '/privacy': 'UI L4B privacy policy. Learn how we handle your data, cookies, and third-party services.',
      '/terms': 'UI L4B terms of service. Usage rules, intellectual property, and account policies.',
      '/sitemap': 'The complete UI L4B sitemap — every page across Create, Discover and Learn, plus your workspace, help and legal, laid out end to end.',
      '/admin': DEFAULT_DESCRIPTION,
      '/file-converter': 'Convert files between formats directly in your browser. Fast, private, client-side processing.',
    }

    const title = PAGE_TITLES[location.pathname] || 'UI L4B | Design Toolkit'
    const description = PAGE_DESCRIPTIONS[location.pathname] || DEFAULT_DESCRIPTION
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

              {/* Curated gradient gallery — copy CSS or hand a gradient to the
                  Gradient Generator (?gs= scheme). Renders inside the app-shell. */}
              <Route path="/discover/gradients" element={<GradientGallery toast={toast} />} />

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
              <Route path="/style-guide" element={<RequireAuth><StyleGuide toast={toast} /></RequireAuth>} />
              <Route path="*" element={<Navigate to="/" replace />} />
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
      </ProModalProvider>
    </LoginPromptProvider>
  )
}
