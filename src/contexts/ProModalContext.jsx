import { createContext, useContext, useState, useCallback } from 'react'
import { trackUpgradeGate } from '../utils/analytics'
import ProUpgradeModal from '../components/ProUpgradeModal'

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
  const openProModal = useCallback((next = {}) => {
    try { trackUpgradeGate(next.gate || next.title || 'unnamed') } catch { /* analytics must never block a gate */ }
    setOpts(next)
  }, [])
  const closeProModal = useCallback(() => setOpts(null), [])

  return (
    <ProModalContext.Provider value={{ openProModal, closeProModal }}>
      {children}
      {opts && <ProUpgradeModal opts={opts} onClose={closeProModal} />}
    </ProModalContext.Provider>
  )
}

export function useProModal() {
  const ctx = useContext(ProModalContext)
  if (!ctx) throw new Error('useProModal must be used within a ProModalProvider')
  return ctx
}
