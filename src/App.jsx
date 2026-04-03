import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Toast from './components/Toast'
import { useToast } from './hooks/useToast'
import { useClipboard } from './hooks/useClipboard'

import Dashboard from './pages/Dashboard'
import PaletteBuilder from './pages/PaletteBuilder'
import TintGenerator from './pages/TintGenerator'
import GradientTool from './pages/GradientTool'
import ContrastChecker from './pages/ContrastChecker'
import TypeScale from './pages/TypeScale'
import FontMatcher from './pages/FontMatcher'
import ButtonCatalogue from './pages/ButtonCatalogue'
import SectionLayouts from './pages/SectionLayouts'
import IconLibrary from './pages/IconLibrary'
import ImageConverter from './pages/ImageConverter'
import PromptLibrary from './pages/PromptLibrary'
import DocsDesign from './pages/DocsDesign'
import DocsSocial from './pages/DocsSocial'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Community from './pages/Community'
import Feedback from './pages/Feedback'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Resources from './pages/Resources'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { message, visible, toast } = useToast()
  const copy = useClipboard(toast)

  const toggleMenu = () => setMenuOpen(prev => !prev)
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="app">
      <Sidebar isOpen={menuOpen} onClose={closeMenu} />

      <div className="app-main">
        <TopBar onMenuToggle={toggleMenu} />

        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/palette" element={<PaletteBuilder onCopy={copy} />} />
            <Route path="/projects" element={<Dashboard />} />
            <Route path="/tints" element={<TintGenerator onCopy={copy} />} />
            <Route path="/gradients" element={<GradientTool onCopy={copy} />} />
            <Route path="/contrast" element={<ContrastChecker />} />
            <Route path="/typescale" element={<TypeScale onCopy={copy} />} />
            <Route path="/fontpairs" element={<FontMatcher onCopy={copy} />} />
            <Route path="/buttons" element={<ButtonCatalogue onCopy={copy} />} />
            <Route path="/layouts" element={<SectionLayouts onCopy={copy} />} />
            <Route path="/icons" element={<IconLibrary onCopy={copy} />} />
            <Route path="/imgconvert" element={<ImageConverter toast={toast} />} />
            <Route path="/prompts" element={<PromptLibrary onCopy={copy} toast={toast} />} />
            <Route path="/docs-design" element={<DocsDesign />} />
            <Route path="/docs-social" element={<DocsSocial />} />
            <Route path="/login" element={<Login toast={toast} />} />
            <Route path="/settings" element={<Settings toast={toast} />} />
            <Route path="/community" element={<Community />} />
            <Route path="/feedback" element={<Feedback toast={toast} />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <Toast message={message} visible={visible} />
    </div>
  )
}
