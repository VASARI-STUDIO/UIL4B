import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { PaletteProvider } from './contexts/PaletteContext'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <PaletteProvider>
            <App />
          </PaletteProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  </StrictMode>
)
