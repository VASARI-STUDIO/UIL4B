import { createContext, Suspense, useCallback, useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { lazyRoute } from '../utils/lazyRoute'
import { useSubscription } from './SubscriptionContext'

// The one owner of the full-screen Pro sign-up layer. Every trial button calls
//   const { openLayer } = useProLayer()
//   openLayer({ billing: 'yearly' })
// so there is a single layer node in the document, whichever page asked. A Pro
// account has nothing to start, so it goes to its projects instead.
//
// The layer and the plan data it reads load on demand: the host mounts the
// first time the URL carries `?up=` or a button asks for it, then stays mounted
// so its fade-out and history handling keep working.
const loadHost = () => import('../components/auth/ProLayerHost')
const ProLayerHost = lazyRoute(loadHost)

const ProLayerContext = createContext(null)

export function ProLayerProvider({ children }) {
  const { isPro } = useSubscription()
  const navigate = useNavigate()
  const location = useLocation()
  const [mounted, setMounted] = useState(false)
  const [request, setRequest] = useState(null)
  const [open, setOpen] = useState(false)
  if (!mounted && new URLSearchParams(location.search).has('up')) setMounted(true)

  const openLayer = (opts) => {
    if (isPro) { navigate('/projects'); return }
    setRequest({ opts })
    setMounted(true)
  }
  const onRequestDone = useCallback(() => setRequest(null), [])

  // Fetched once the page is idle, so the first click does not wait on the network.
  useEffect(() => {
    const warm = () => { loadHost().catch(() => {}) }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 4000 })
      return () => window.cancelIdleCallback?.(id)
    }
    const t = setTimeout(warm, 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <ProLayerContext.Provider value={{ open, openLayer }}>
      {children}
      {mounted && (
        <Suspense fallback={null}>
          <ProLayerHost request={request} onRequestDone={onRequestDone} onOpenChange={setOpen} />
        </Suspense>
      )}
    </ProLayerContext.Provider>
  )
}

export function useProLayer() {
  const ctx = useContext(ProLayerContext)
  if (!ctx) throw new Error('useProLayer must be used within a ProLayerProvider')
  return ctx
}
