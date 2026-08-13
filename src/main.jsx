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

// After a redeploy, a cached index.html can request lazy chunks whose hashed
// filenames no longer exist; Vite fires vite:preloadError when that import
// fails. One hard reload fetches the fresh index.html and the new chunk set.
// sessionStorage guards against a reload loop if the error persists.
window.addEventListener('vite:preloadError', (event) => {
  // OFFLINE IS NOT A STALE DEPLOY, and reloading cannot fix it.
  //
  // This handler exists for one failure: after a redeploy, a cached index.html
  // asks for chunk filenames that no longer exist, and one reload fetches the
  // new index and the new chunk set. Losing connectivity produces the SAME
  // event for a completely different reason — and there, a reload is the worst
  // available response. It throws away a working, already-rendered app and
  // tries to re-fetch everything over a connection that just failed, turning a
  // recoverable "this panel needs the network" into a blank page.
  //
  // Found by the acceptance suite: cutting the network mid-session reloaded the
  // page out from under the test ("Execution context was destroyed"), which is
  // exactly what it would do to a user on a train.
  if (navigator.onLine === false) return

  const key = 'vs-chunk-reload'
  const last = Number(sessionStorage.getItem(key) || 0)
  if (Date.now() - last < 30000) return
  sessionStorage.setItem(key, String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

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
