import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Toast from './components/Toast'
import CommandPalette from './components/CommandPalette'
import { useToast } from './hooks/useToast'
import { useClipboard } from './hooks/useClipboard'
import { initAnalytics, trackPageView, trackSessionPage } from './utils/analytics'
import { useAuth } from './contexts/AuthContext'

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
import DesignReference from './pages/DesignReference'
import VideoToFrames from './pages/VideoToFrames'
import Admin from './pages/Admin'

function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
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
    window.scrollTo(0, 0)
    trackPageView(location.pathname)
    trackSessionPage(location.pathname)
  }, [location.pathname])

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

  return (
    <div className="app">
      <Sidebar isOpen={menuOpen} onClose={closeMenu} />

      <div className="app-main">
        <TopBar onMenuToggle={toggleMenu} onCommandPalette={openPalette} />

        <main className="main" key={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
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
            <Route path="/fontpairs" element={<FontMatcher onCopy={copy} />} />
            <Route path="/icons" element={<IconLibrary onCopy={copy} />} />
            <Route path="/imgconvert" element={<ImageConverter toast={toast} />} />
            <Route path="/prompts" element={<PromptLibrary onCopy={copy} toast={toast} />} />
            <Route path="/docs-design" element={<DocsDesign />} />
            <Route path="/docs-social" element={<DocsSocial />} />
            <Route path="/video-frames" element={<VideoToFrames toast={toast} />} />
            <Route path="/design-reference" element={<DesignReference onCopy={copy} />} />
            <Route path="/resources" element={<ExternalResources />} />
            <Route path="/login" element={<Login toast={toast} />} />
            <Route path="/settings" element={<RequireAuth><Settings toast={toast} /></RequireAuth>} />
            <Route path="/community" element={<Community />} />
            <Route path="/feedback" element={<Feedback toast={toast} />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/admin" element={<RequireAuth><Admin toast={toast} /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <Toast message={message} visible={visible} />
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  )
}
