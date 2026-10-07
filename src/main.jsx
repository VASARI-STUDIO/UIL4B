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
import RouteErrorBoundary from './components/RouteErrorBoundary'
import { installGlobalErrorCapture } from './utils/errorReport'
import { handlePreloadError } from './utils/lazyRoute'
import './styles/global.css'
import { installDownloadObserver } from './utils/downloadObserver'

// Recent exports: every tool download is recorded where
// they all pass — an <a download> being clicked. See utils/downloadObserver.js.
installDownloadObserver()

// A lazy page file that fails to download (a tab open across a redeploy, or a
// dropped connection) gets one guarded hard reload. The rules, and why pages
// use lazyRoute() rather than lazy(), are in utils/lazyRoute.js.
window.addEventListener('vite:preloadError', (event) => {
  // Offline is not a stale deploy, and a reload cannot fetch anything: the
  // error goes through and the page's boundary says the connection is down.
  if (navigator.onLine === false) return
  let storage = null
  try { storage = window.sessionStorage } catch { storage = null }
  handlePreloadError(event, {
    online: true,
    storage,
    now: Date.now(),
    reload: () => window.location.reload(),
  })
})

// Errors nothing else caught — an event handler, a timer, a rejected promise —
// recorded to the admin feedback queue, rate-limited and without PII. See
// utils/errorReport.js.
installGlobalErrorCapture()

// The ROOT boundary catches what the per-route one in App.jsx cannot: a crash
// in a provider, the nav or the feedback button itself. Its "Report this" finds
// no dialog to open, so it goes to /feedback.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouteErrorBoundary>
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
    </RouteErrorBoundary>
  </StrictMode>
)
