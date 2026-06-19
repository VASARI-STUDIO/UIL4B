import { Component, useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Toast from './components/Toast'
import CommandPalette from './components/CommandPalette'
import AppFooter from './components/AppFooter'
import FeedbackButton from './components/FeedbackButton'
import GoogleOneTap from './components/GoogleOneTap'
import { useToast } from './hooks/useToast'
import { useClipboard } from './hooks/useClipboard'
import { initAnalytics, trackPageView, trackSessionPage } from './utils/analytics'
import { useAuth } from './contexts/AuthContext'
import { useFirestoreSync } from './hooks/useFirestoreSync'
import { ADMIN_EMAILS } from './utils/constants'

// Static imports — small or always-visited pages (instant load)
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import Login from './pages/Login'
import CategoryDashboard from './pages/CategoryDashboard'
import Onboarding from './pages/Onboarding'

// Lazy imports — heavy or rarely-visited pages (code-split)
const ColorStudio = lazy(() => import('./pages/ColorStudio'))
const TypeScale = lazy(() => import('./pages/TypeScale'))
const FontMatcher = lazy(() => import('./pages/FontMatcher'))
const IconLibrary = lazy(() => import('./pages/IconLibrary'))
const FileConverter = lazy(() => import('./pages/FileConverter'))
const PromptLibrary = lazy(() => import('./pages/PromptLibrary'))
const DocsDesign = lazy(() => import('./pages/DocsDesign'))
const DocsSocial = lazy(() => import('./pages/DocsSocial'))
const DocsThemes = lazy(() => import('./pages/DocsThemes'))
const DocsBrand = lazy(() => import('./pages/DocsBrand'))
const DocsSEO = lazy(() => import('./pages/DocsSEO'))
const DocsMarketing = lazy(() => import('./pages/DocsMarketing'))
const DocsAI = lazy(() => import('./pages/DocsAI'))
const ExternalResources = lazy(() => import('./pages/ExternalResources'))
const Settings = lazy(() => import('./pages/Settings'))
const Community = lazy(() => import('./pages/Community'))
const Feedback = lazy(() => import('./pages/Feedback'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Admin = lazy(() => import('./pages/Admin'))
const Projects = lazy(() => import('./pages/Projects'))
const Checkout = lazy(() => import('./pages/Checkout'))
const CheckoutReturn = lazy(() => import('./pages/CheckoutReturn'))
const FontGallery = lazy(() => import('./pages/FontGallery'))
const AltTextGenerator = lazy(() => import('./pages/AltTextGenerator'))
const AiPromptGenerator = lazy(() => import('./pages/AiPromptGenerator'))
const LandingPromptGenerator = lazy(() => import('./pages/LandingPromptGenerator'))
const EmojiLibrary = lazy(() => import('./pages/EmojiLibrary'))
const BoxShadowGenerator = lazy(() => import('./pages/BoxShadowGenerator'))
const UIBuilder = lazy(() => import('./pages/UIBuilder'))
const AutoBuilder = lazy(() => import('./pages/AutoBuilder'))
const StyleGuide = lazy(() => import('./pages/StyleGuide'))
const HelpCentre = lazy(() => import('./pages/HelpCentre'))
const RatioCalculator = lazy(() => import('./pages/RatioCalculator'))
const FuturePlans = lazy(() => import('./pages/FuturePlans'))

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

// Gates alpha / not-yet-public tools so they can't be reached by direct URL.
// Only admins (ADMIN_EMAILS) may open them; everyone else is bounced to the
// dashboard. Keeps route access aligned with the hidden nav/dashboard entries.
function RequireAdmin({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="fg-loader" />
      </div>
    )
  }
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function KeyboardShortcutsOverlay({ open, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open, onClose])
  if (!open) return null
  const shortcuts = [
    { keys: ['?'], desc: 'Show keyboard shortcuts' },
    { keys: ['Space'], desc: 'Random palette (Colour Studio)' },
    { keys: ['Ctrl', 'K'], desc: 'Open command palette' },
    { keys: ['Esc'], desc: 'Close modal / popup' },
  ]
  return (
    <div className="kbd-overlay" onMouseDown={onClose}>
      <div className="kbd-panel" ref={ref} onMouseDown={e => e.stopPropagation()}>
        <div className="kbd-header">
          <h3>Keyboard Shortcuts</h3>
          <button className="kbd-close" onClick={onClose} aria-label="Close">&#x2715;</button>
        </div>
        <ul className="kbd-list">
          {shortcuts.map((s, i) => (
            <li key={i} className="kbd-row">
              <span className="kbd-keys">{s.keys.map((k, j) => (
                <span key={j}><kbd className="kbd-key">{k}</kbd>{j < s.keys.length - 1 && <span className="kbd-plus">+</span>}</span>
              ))}</span>
              <span className="kbd-desc">{s.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [kbdOpen, setKbdOpen] = useState(false)
  const { user: authUser, loading: authLoading } = useAuth()
  useFirestoreSync(authUser?.uid || null)
  const { message, visible, toast } = useToast()
  const copy = useClipboard(toast)
  const location = useLocation()

  const toggleMenu = () => setMenuOpen(prev => !prev)
  const closeMenu = () => setMenuOpen(false)
  const openPalette = () => setPaletteOpen(true)
  const closePalette = () => setPaletteOpen(false)

  useEffect(() => {
    return initAnalytics()
  }, [])

  useEffect(() => {
    document.querySelector('.main')?.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    trackPageView(location.pathname)
    trackSessionPage(location.pathname)
    setMenuOpen(false)
    const PAGE_TITLES = {
      '/': 'UI L4B | Design Toolkit',
      '/home': 'UI L4B | Design Toolkit',
      '/dashboard': 'UI L4B | Dashboard',
      '/color': 'UI L4B | Colour Studio',
      '/typography': 'UI L4B | Typography',
      '/typescale': 'UI L4B | Type Scale',
      '/fontpairs': 'UI L4B | Font Pairs',
      '/fontgallery': 'UI L4B | Font Gallery',
      '/icons': 'UI L4B | Icon Library',
      '/imagery': 'UI L4B | Imagery',
      '/icons-emoji': 'UI L4B | Icons & Emoji',
      '/resources': 'UI L4B | Resources',
      '/alt-text': 'UI L4B | Alt Text Generator',
      '/ai-prompt': 'UI L4B | AI Image Prompt Generator',
      '/ai-tools': 'UI L4B | AI Tools',
      '/landing-prompts': 'UI L4B | AI Landing Page Prompts',
      '/prompts': 'UI L4B | Prompt Library',
      '/emoji': 'UI L4B | Emoji Library',
      '/ratio': 'UI L4B | Aspect Ratio Calculator',
      '/box-shadow': 'UI L4B | Box Shadow',
      '/ui-builder': 'UI L4B | UI Builder',
      '/projects': 'UI L4B | Projects',
      '/settings': 'UI L4B | Settings',
      '/login': 'UI L4B | Sign In',
      '/checkout': 'UI L4B | Checkout',
      '/community': 'UI L4B | Community',
      '/feedback': 'UI L4B | Feedback',
      '/help': 'UI L4B | Help Centre',
      '/privacy': 'UI L4B | Privacy',
      '/terms': 'UI L4B | Terms',
      '/admin': 'UI L4B | Admin',
      '/future-plans': 'UI L4B | Future Plans',
      '/docs-themes': 'UI L4B | UI Design Themes',
      '/docs-brand': 'UI L4B | Brand Colour Guide',
      '/docs-seo': 'UI L4B | SEO for Small Business',
      '/docs-marketing': 'UI L4B | Marketing Fundamentals',
      '/docs-ai': 'UI L4B | AI Coding Assistants',
      '/auto-builder': 'UI L4B | UI Auto-Builder',
      '/file-converter': 'UI L4B | File Converter',
    }
    const DEFAULT_DESCRIPTION = 'Free browser-based design toolkit. Colour palettes, type scales, font pairing, icon library, image conversion, video frames, and production-ready CSS exports.'
    const PAGE_DESCRIPTIONS = {
      '/': DEFAULT_DESCRIPTION,
      '/home': DEFAULT_DESCRIPTION,
      '/dashboard': 'Your UI L4B dashboard. Access all design tools, recent projects, and saved palettes in one place.',
      '/color': 'Build professional colour systems with palette generation, tint scales, gradient builder, and named colour libraries. Export CSS, Tailwind, PNG and SVG.',
      '/typography': 'Typography tools for designers and developers. Pair fonts, build type scales, and browse the Google Fonts catalogue.',
      '/typescale': 'Create modular type scales for consistent typography. Preview sizes and export CSS custom properties.',
      '/fontpairs': 'Discover harmonious font combinations for your designs. Preview heading and body pairs with live typography samples.',
      '/fontgallery': 'Browse and preview 1,200+ Google Fonts. Filter by category, weight, and style. Compare fonts side by side.',
      '/icons': 'Search 200,000+ icons from popular packs. Preview, customize colours, and copy SVG or JSX code instantly.',
      '/imagery': 'Image tools for the web — convert and compress images, extract video frames, and calculate aspect ratios.',
      '/icons-emoji': 'Search 200,000+ icons and browse every emoji by category. Copy SVG or emoji to your clipboard instantly.',
      '/resources': 'A curated directory of the best external design resources — fonts, colour tools, AI generators, and inspiration galleries.',
      '/alt-text': 'Generate accessible alt text for images using AI. Improve SEO and screen-reader support in seconds.',
      '/ai-prompt': 'Generate detailed AI image prompts with style, lighting, and composition controls. Copy-ready for Midjourney, DALL-E, and Stable Diffusion.',
      '/ai-tools': 'AI-powered design tools — image prompt generation, alt text, and landing page copy. Powered by DeepSeek and Gemini.',
      '/landing-prompts': 'Generate AI-powered landing page copy, headlines, and CTAs. Tailored to your product and audience.',
      '/prompts': 'Browse and submit community design prompts for AI image and web generators.',
      '/emoji': 'Browse, search, and copy emojis by category. Preview skin tones and find the perfect emoji for any context.',
      '/ratio': 'Free aspect ratio calculator. Lock a ratio, enter one dimension, get the matching size with a live shape preview.',
      '/box-shadow': 'Design layered box shadows with real-time preview. Fine-tune blur, spread, offset, and colour for each layer.',
      '/ui-builder': 'Build complete UI design systems with guided steps. Pick colours, fonts, type scales, and export production-ready CSS.',
      '/auto-builder': 'Automatically generate a full UI design system from a single colour or inspiration URL using AI.',
      '/projects': 'Manage and organise your saved design projects. Access colour palettes, font selections, and exported assets.',
      '/settings': 'Customise your UI L4B experience. Manage theme, appearance, subscription, and account preferences.',
      '/login': 'Sign in to UI L4B to save projects, sync settings, and unlock AI-powered design tools.',
      '/checkout': 'Upgrade to UI L4B Pro for 1,000 daily AI generations, higher-quality models, and synced projects.',
      '/community': 'Join the UI L4B community. Share designs, discover inspiration, and connect with other designers and developers.',
      '/feedback': 'Share your feedback, report bugs, or request features for UI L4B. We read every submission.',
      '/help': 'Get help with UI L4B. Browse FAQs, learn about features, and find answers to common questions.',
      '/privacy': 'UI L4B privacy policy. Learn how we handle your data, cookies, and third-party services.',
      '/terms': 'UI L4B terms of service. Usage rules, intellectual property, and account policies.',
      '/admin': DEFAULT_DESCRIPTION,
      '/future-plans': DEFAULT_DESCRIPTION,
      '/docs-themes': 'Learn about UI design themes — dark mode, light mode, and custom theme systems for modern web applications.',
      '/docs-brand': 'A practical guide to choosing brand colours. Understand colour psychology, contrast, and accessibility basics.',
      '/docs-seo': 'SEO fundamentals for small businesses. Learn keyword strategy, on-page optimisation, and technical SEO basics.',
      '/docs-marketing': 'Marketing fundamentals for designers. Understand positioning, messaging, and visual communication strategies.',
      '/docs-ai': 'A guide to AI coding assistants. Learn how to use AI tools effectively for web development and design.',
      '/file-converter': 'Convert files between formats directly in your browser. Fast, private, client-side processing.',
    }

    document.title = PAGE_TITLES[location.pathname] || 'UI L4B | Design Toolkit'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute('content', PAGE_DESCRIPTIONS[location.pathname] || DEFAULT_DESCRIPTION)
    }
  }, [location.pathname])

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen)
    return () => document.body.classList.remove('menu-open')
  }, [menuOpen])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(prev => !prev)
        return
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = e.target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
        e.preventDefault()
        setKbdOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The sales / landing page is the public homepage. It renders full-screen,
  // outside the app chrome. The root URL (/) serves it to logged-out visitors so
  // it is the first page that loads and is indexable; logged-in users are sent
  // straight to their dashboard but can still reach it via /home.
  // /welcome is the legacy path — redirect it to /home so old links keep working.
  if (location.pathname === '/welcome') {
    return <Navigate to="/home" replace />
  }
  if (location.pathname === '/home') {
    return <><Landing /><GoogleOneTap /></>
  }
  if (location.pathname === '/onboarding') {
    return <Onboarding />
  }
  if (location.pathname === '/') {
    // Render the sales page immediately — first paint must not depend on Firebase
    // auth resolving (otherwise a slow/misconfigured auth init leaves a blank page).
    // Once we positively know the visitor is logged in, send them to their dashboard.
    if (!authLoading && authUser) {
      const onboarded = (() => { try { return localStorage.getItem('vs-onboarded') === '1' } catch { return true } })()
      return <Navigate to={onboarded ? '/dashboard' : '/onboarding'} replace />
    }
    return <><Landing /><GoogleOneTap /></>
  }

  return (
    <div className="app">
      <Sidebar isOpen={menuOpen} onClose={closeMenu} />

      <div className="app-main">
        <TopBar onMenuToggle={toggleMenu} onCommandPalette={openPalette} />

        <main className="main" key={location.pathname}>
          <ErrorBoundary>
          <Suspense fallback={<div className="page-loading"><div className="fg-loader" /></div>}>
            <Routes location={location}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/color" element={<ColorStudio onCopy={copy} toast={toast} />} />
              <Route path="/typography" element={<CategoryDashboard categoryId="typography" />} />
              <Route path="/imagery" element={<CategoryDashboard categoryId="imagery" />} />
              <Route path="/icons-emoji" element={<CategoryDashboard categoryId="icons-emoji" />} />
              <Route path="/ai-tools" element={<CategoryDashboard categoryId="ai" />} />
              <Route path="/ui-builder-cat" element={<CategoryDashboard categoryId="ui-builder" />} />
              <Route path="/docs" element={<CategoryDashboard categoryId="documentation" />} />
              <Route path="/color-studio" element={<Navigate to="/color" replace />} />
              <Route path="/palette" element={<Navigate to="/color" replace />} />
              <Route path="/tints" element={<Navigate to="/color" replace />} />
              <Route path="/gradients" element={<Navigate to="/color" replace />} />
              <Route path="/contrast" element={<Navigate to="/color" replace />} />
              <Route path="/export" element={<Navigate to="/color" replace />} />
              <Route path="/typescale" element={<TypeScale onCopy={copy} />} />
              <Route path="/fontpairs" element={<FontMatcher onCopy={copy} toast={toast} />} />
              <Route path="/fontgallery" element={<FontGallery onCopy={copy} toast={toast} />} />
              <Route path="/icons" element={<IconLibrary onCopy={copy} />} />
              <Route path="/imgconvert" element={<Navigate to="/file-converter" replace />} />
              <Route path="/file-converter" element={<RequireAdmin><FileConverter toast={toast} /></RequireAdmin>} />
              <Route path="/alt-text" element={<RequireAdmin><AltTextGenerator toast={toast} /></RequireAdmin>} />
              <Route path="/ai-prompt" element={<RequireAdmin><AiPromptGenerator toast={toast} /></RequireAdmin>} />
              <Route path="/landing-prompts" element={<RequireAdmin><LandingPromptGenerator toast={toast} /></RequireAdmin>} />
              <Route path="/prompts" element={<PromptLibrary onCopy={copy} toast={toast} />} />
              <Route path="/emoji" element={<EmojiLibrary onCopy={copy} />} />
              <Route path="/ratio" element={<RatioCalculator onCopy={copy} />} />
              <Route path="/docs-design" element={<DocsDesign />} />
              <Route path="/docs-social" element={<DocsSocial />} />
              <Route path="/docs-themes" element={<DocsThemes />} />
              <Route path="/docs-brand" element={<DocsBrand />} />
              <Route path="/docs-seo" element={<DocsSEO />} />
              <Route path="/docs-marketing" element={<DocsMarketing />} />
              <Route path="/docs-ai" element={<DocsAI />} />
              <Route path="/video-frames" element={<Navigate to="/file-converter" replace />} />
              <Route path="/box-shadow" element={<BoxShadowGenerator onCopy={copy} toast={toast} />} />
              <Route path="/ui-builder" element={<UIBuilder onCopy={copy} toast={toast} />} />
              <Route path="/auto-builder" element={<RequireAdmin><AutoBuilder onCopy={copy} toast={toast} /></RequireAdmin>} />
              <Route path="/design-reference" element={<Navigate to="/docs" replace />} />
              <Route path="/resources" element={<ExternalResources />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/login" element={<Login toast={toast} />} />
              <Route path="/projects" element={<RequireAuth><Projects toast={toast} /></RequireAuth>} />
              <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
              <Route path="/checkout/return" element={<RequireAuth><CheckoutReturn /></RequireAuth>} />
              <Route path="/settings" element={<Settings toast={toast} />} />
              <Route path="/community" element={<Community toast={toast} />} />
              <Route path="/feedback" element={<Feedback toast={toast} />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/help" element={<HelpCentre />} />
              <Route path="/about" element={<Navigate to="/help#about" replace />} />
              <Route path="/faq" element={<Navigate to="/help#faq" replace />} />
              <Route path="/admin" element={<RequireAuth><Admin toast={toast} /></RequireAuth>} />
              <Route path="/style-guide" element={<RequireAuth><StyleGuide toast={toast} /></RequireAuth>} />
              <Route path="/future-plans" element={<RequireAdmin><FuturePlans /></RequireAdmin>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
          <AppFooter />
        </main>
      </div>

      <Toast message={message} visible={visible} />
      <FeedbackButton />
      <CommandPalette open={paletteOpen} onClose={closePalette} />
      <KeyboardShortcutsOverlay open={kbdOpen} onClose={() => setKbdOpen(false)} />
      <GoogleOneTap />
    </div>
  )
}
