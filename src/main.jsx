import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProjectProvider } from './contexts/ProjectContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { ExportProvider } from './contexts/ExportContext'
import { I18nProvider } from './contexts/I18nContext'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <ProjectProvider>
              <WorkspaceProvider>
                <ExportProvider>
                  <App />
                </ExportProvider>
              </WorkspaceProvider>
            </ProjectProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </HashRouter>
  </StrictMode>
)
