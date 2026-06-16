import { useState, useEffect, lazy, Suspense } from 'react'
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
const ImageConverter = lazy(() => import('./pages/ImageConverter'))
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
const VideoToFrames = lazy(() => import('./pages/VideoToFrames'))
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

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
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
      '/welcome': 'UI L4B | Design Toolkit',
      '/dashboard': 'UI L4B | Dashboard',
      '/color': 'UI L4B | Colour Studio',
      '/typography': 'UI L4B | Typography',
      '/typescale': 'UI L4B | Type Scale',
      '/fontpairs': 'UI L4B | Font Pairs',
      '/fontgallery': 'UI L4B | Font Gallery',
      '/icons': 'UI L4B | Icon Library',
      '/imgconvert': 'UI L4B | Image Converter',
      '/alt-text': 'UI L4B | Alt Text Generator',
      '/ai-prompt': 'UI L4B | AI Image Prompt Generator',
      '/ai-tools': 'UI L4B | AI Tools',
      '/landing-prompts': 'UI L4B | AI Landing Page Prompts',
      '/prompts': 'UI L4B | Prompt Library',
      '/emoji': 'UI L4B | Emoji Library',
      '/video-frames': 'UI L4B | Video to Frames',
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
      '/docs-themes': 'UI L4B | UI Design Themes',
      '/docs-brand': 'UI L4B | Brand Colour Guide',
      '/docs-seo': 'UI L4B | SEO for Small Business',
      '/docs-marketing': 'UI L4B | Marketing Fundamentals',
      '/docs-ai': 'UI L4B | AI Coding Assistants',
      '/auto-builder': 'UI L4B | UI Auto-Builder',
      '/file-converter': 'UI L4B | File Converter',
    }
    document.title = PAGE_TITLES[location.pathname] || 'UI L4B | Design Toolkit'
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
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The sales / landing page is the public homepage. It renders full-screen,
  // outside the app chrome. The root URL (/) serves it to logged-out visitors so
  // it is the first page that loads and is indexable; logged-in users are sent
  // straight to their dashboard but can still reach it via /welcome.
  if (location.pathname === '/welcome') {
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
          <Suspense fallback={<div className="page-loading"><div className="fg-loader" /></div>}>
            <Routes location={location}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/color" element={<ColorStudio onCopy={copy} toast={toast} />} />
              <Route path="/typography" element={<CategoryDashboard categoryId="typography" />} />
              <Route path="/imagery" element={<CategoryDashboard categoryId="imagery" />} />
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
              <Route path="/imgconvert" element={<ImageConverter toast={toast} />} />
              <Route path="/file-converter" element={<FileConverter onCopy={copy} toast={toast} />} />
              <Route path="/alt-text" element={<AltTextGenerator toast={toast} />} />
              <Route path="/ai-prompt" element={<AiPromptGenerator toast={toast} />} />
              <Route path="/landing-prompts" element={<LandingPromptGenerator toast={toast} />} />
              <Route path="/prompts" element={<PromptLibrary onCopy={copy} toast={toast} />} />
              <Route path="/emoji" element={<EmojiLibrary onCopy={copy} />} />
              <Route path="/docs-design" element={<DocsDesign />} />
              <Route path="/docs-social" element={<DocsSocial />} />
              <Route path="/docs-themes" element={<DocsThemes />} />
              <Route path="/docs-brand" element={<DocsBrand />} />
              <Route path="/docs-seo" element={<DocsSEO />} />
              <Route path="/docs-marketing" element={<DocsMarketing />} />
              <Route path="/docs-ai" element={<DocsAI />} />
              <Route path="/video-frames" element={<VideoToFrames toast={toast} />} />
              <Route path="/box-shadow" element={<BoxShadowGenerator onCopy={copy} toast={toast} />} />
              <Route path="/ui-builder" element={<UIBuilder onCopy={copy} toast={toast} />} />
              <Route path="/auto-builder" element={<AutoBuilder onCopy={copy} toast={toast} />} />
              <Route path="/design-reference" element={<Navigate to="/docs" replace />} />
              <Route path="/resources" element={<ExternalResources />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/login" element={<Login toast={toast} />} />
              <Route path="/projects" element={<RequireAuth><Projects toast={toast} /></RequireAuth>} />
              <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
              <Route path="/checkout/return" element={<RequireAuth><CheckoutReturn /></RequireAuth>} />
              <Route path="/settings" element={<Settings toast={toast} />} />
              <Route path="/community" element={<Community />} />
              <Route path="/feedback" element={<Feedback toast={toast} />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/help" element={<HelpCentre />} />
              <Route path="/about" element={<Navigate to="/help#about" replace />} />
              <Route path="/faq" element={<Navigate to="/help#faq" replace />} />
              <Route path="/admin" element={<RequireAuth><Admin toast={toast} /></RequireAuth>} />
              <Route path="/style-guide" element={<RequireAuth><StyleGuide toast={toast} /></RequireAuth>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <AppFooter />
        </main>
      </div>

      <Toast message={message} visible={visible} />
      <FeedbackButton />
      <CommandPalette open={paletteOpen} onClose={closePalette} />
      <GoogleOneTap />
    </div>
  )
}
