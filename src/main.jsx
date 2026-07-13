import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppearanceProvider } from './contexts/AppearanceContext'
import { ProjectProvider } from './contexts/ProjectContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { ExportProvider } from './contexts/ExportContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import { I18nProvider } from './contexts/I18nContext'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AppearanceProvider>
          <I18nProvider>
            <AuthProvider>
            <SubscriptionProvider>
            <ProjectProvider>
              <WorkspaceProvider>
                <ExportProvider>
                  <App />
                  <Analytics />
                </ExportProvider>
              </WorkspaceProvider>
            </ProjectProvider>
            </SubscriptionProvider>
            </AuthProvider>
          </I18nProvider>
        </AppearanceProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)
