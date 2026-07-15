import { createContext, useContext, useState, useCallback } from 'react'
import ProUpgradeModal from '../components/ProUpgradeModal'

// App-wide Pro-upgrade modal (Image 3). Any gated feature calls
//   const { openProModal } = useProModal()
//   openProModal({ title, subtitle, features })  // all optional
// to raise the canonical upgrade modal over the current page. One component,
// reused by every Pro gate site-wide — no per-page upgrade popups.
const ProModalContext = createContext(null)

export function ProModalProvider({ children }) {
  const [opts, setOpts] = useState(null)

  const openProModal = useCallback((next = {}) => setOpts(next), [])
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
