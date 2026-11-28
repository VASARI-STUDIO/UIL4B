import { createContext, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import useProUpgradeLayer from '../hooks/useProUpgradeLayer'
import { useSubscription } from './SubscriptionContext'

// The one owner of the full-screen Pro sign-up layer. Every trial button calls
//   const { openLayer } = useProLayer()
//   openLayer({ billing: 'yearly' })
// so there is a single layer node in the document, whichever page asked. A Pro
// account has nothing to start, so it goes to its projects instead.
const ProLayerContext = createContext(null)

export function ProLayerProvider({ children }) {
  const layer = useProUpgradeLayer()
  const { isPro } = useSubscription()
  const navigate = useNavigate()
  const value = {
    open: layer.open,
    openLayer: (opts) => { if (isPro) navigate('/projects'); else layer.openLayer(opts) },
  }
  return (
    <ProLayerContext.Provider value={value}>
      {children}
      {layer.node}
    </ProLayerContext.Provider>
  )
}

export function useProLayer() {
  const ctx = useContext(ProLayerContext)
  if (!ctx) throw new Error('useProLayer must be used within a ProLayerProvider')
  return ctx
}
