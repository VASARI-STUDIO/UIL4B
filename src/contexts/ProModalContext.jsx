import { createContext, useContext, useState, useCallback, useEffect, Suspense } from 'react'
import { lazyRoute } from '../utils/lazyRoute'
import { trackUpgradeGate } from '../utils/analytics'

// The modal and its stylesheet load on demand, not with the first paint, and
// are fetched once the page is idle so the first open does not wait.
const loadModal = () => import('../components/ProUpgradeModal')
const ProUpgradeModal = lazyRoute(loadModal)

// App-wide Pro-upgrade modal (Image 3). Any gated feature calls
//   const { openProModal } = useProModal()
//   openProModal({ title, subtitle, features })  // all optional
// to raise the canonical upgrade modal over the current page. One component,
// reused by every Pro gate site-wide — no per-page upgrade popups.
const ProModalContext = createContext(null)

export function ProModalProvider({ children }) {
  const [opts, setOpts] = useState(null)

  // P-001: the canonical upgrade-gate event. Fired HERE rather than at the 16
  // call sites, so a gate added later is measured by existing rather than by
  // someone remembering. `gate` names which wall the user hit; without it the
  // count says people upgrade but not what pushed them.
  //
  // EVERY call site now names one. The `next.title` fallback is kept because
  // analytics must never throw, but it is no longer load-bearing:
  // tests/unit/upgrade-gate-names.test.js fails the build if any openProModal
  // call omits `gate`. The fallback was actively harmful while it was in use —
  // several walls share a title, and three separate ones read "Go beyond N
  // colours", so the dashboard reported one wall where there were three.
  const openProModal = useCallback((next = {}) => {
    try { trackUpgradeGate(next.gate || next.title || 'unnamed') } catch { /* analytics must never block a gate */ }
    setOpts(next)
  }, [])
  const closeProModal = useCallback(() => setOpts(null), [])

  useEffect(() => {
    const warm = () => { loadModal().catch(() => {}) }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 4000 })
      return () => window.cancelIdleCallback?.(id)
    }
    const t = setTimeout(warm, 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <ProModalContext.Provider value={{ openProModal, closeProModal }}>
      {children}
      {opts && <Suspense fallback={null}><ProUpgradeModal opts={opts} onClose={closeProModal} /></Suspense>}
    </ProModalContext.Provider>
  )
}

// The same event for a wall that does not raise this modal but links to
// /plans (every Pro CTA goes to /plans).
// Kept in this file so there is still ONE place the upgrade-gate event fires
// from (tests/unit/upgrade-gate-names.test.js).
export function reportUpgradeGate(gate) {
  try { trackUpgradeGate(gate || 'unnamed') } catch { /* analytics must never block a gate */ }
}

export function useProModal() {
  const ctx = useContext(ProModalContext)
  if (!ctx) throw new Error('useProModal must be used within a ProModalProvider')
  return ctx
}
