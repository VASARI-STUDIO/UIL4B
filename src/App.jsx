import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Toast from './components/Toast'
import CommandPalette from './components/CommandPalette'
import GoogleOneTap from './components/GoogleOneTap'
import { useToast } from './hooks/useToast'
import { useClipboard } from './hooks/useClipboard'
import { initAnalytics, trackPageView, trackSessionPage } from './utils/analytics'
import { useAuth } from './contexts/AuthContext'
import { useFirestoreSync } from './hooks/useFirestoreSync'

import Dashboard from './pages/Dashboard'
import ColorStudio from './pages/ColorStudio'
import TypeScale from './pages/TypeScale'
import FontMatcher from './pages/FontMatcher'
import IconLibrary from './pages/IconLibrary'
import ImageConverter from './pages/ImageConverter'
import PromptLibrary from './pages/PromptLibrary'
import DocsDesign from './pages/DocsDesign'
import DocsSocial from './pages/DocsSocial'
import ExternalResources from './pages/ExternalResources'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Community from './pages/Community'
import Feedback from './pages/Feedback'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import CategoryDashboard from './pages/CategoryDashboard'
import VideoToFrames from './pages/VideoToFrames'
import Admin from './pages/Admin'
import Projects from './pages/Projects'
import FontGallery from './pages/FontGallery'
import AltTextGenerator from './pages/AltTextGenerator'
import EmojiLibrary from './pages/EmojiLibrary'
import About from './pages/About'
import FAQ from './pages/FAQ'
import HelpCentre from './pages/HelpCentre'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'

function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()
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
          <Routes location={location}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/color" element={<ColorStudio onCopy={copy} toast={toast} />} />
            <Route path="/typography" element={<CategoryDashboard categoryId="typography" />} />
            <Route path="/imagery" element={<CategoryDashboard categoryId="imagery" />} />
            <Route path="/docs" element={<CategoryDashboard categoryId="documentation" />} />
            <Route path="/color-studio" element={<Navigate to="/color" replace />} />
            <Route path="/palette" element={<Navigate to="/color" replace />} />
            <Route path="/tints" element={<Navigate to="/color" replace />} />
            <Route path="/gradients" element={<Navigate to="/color" replace />} />
            <Route path="/contrast" element={<Navigate to="/color" replace />} />
            <Route path="/export" element={<Navigate to="/color" replace />} />
            <Route path="/typescale" element={<TypeScale onCopy={copy} />} />
            <Route path="/fontpairs" element={<FontMatcher onCopy={copy} toast={toast} />} />
            <Route path="/fontgallery" element={<FontGallery onCopy={copy} />} />
            <Route path="/icons" element={<IconLibrary onCopy={copy} />} />
            <Route path="/imgconvert" element={<ImageConverter toast={toast} />} />
            <Route path="/alt-text" element={<AltTextGenerator toast={toast} />} />
            <Route path="/prompts" element={<PromptLibrary onCopy={copy} toast={toast} />} />
            <Route path="/emoji" element={<EmojiLibrary onCopy={copy} />} />
            <Route path="/docs-design" element={<DocsDesign />} />
            <Route path="/docs-social" element={<DocsSocial />} />
            <Route path="/video-frames" element={<VideoToFrames toast={toast} />} />
            <Route path="/design-reference" element={<Navigate to="/docs" replace />} />
            <Route path="/resources" element={<ExternalResources />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/login" element={<Login toast={toast} />} />
            <Route path="/projects" element={<RequireAuth><Projects toast={toast} /></RequireAuth>} />
            <Route path="/settings" element={<Settings toast={toast} />} />
            <Route path="/community" element={<Community />} />
            <Route path="/feedback" element={<Feedback toast={toast} />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/help" element={<HelpCentre />} />
            <Route path="/about" element={<Navigate to="/help#about" replace />} />
            <Route path="/faq" element={<Navigate to="/help#faq" replace />} />
            <Route path="/admin" element={<RequireAuth><Admin toast={toast} /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <Toast message={message} visible={visible} />
      <CommandPalette open={paletteOpen} onClose={closePalette} />
      <GoogleOneTap />
    </div>
  )
}
