import { createContext, useContext, useState, useEffect } from 'react'

const AppearanceContext = createContext()
const STORAGE_KEY = 'vs-appearance'

// Rounding and density are LOCKED product-wide (medium / cozy) — the surface is
// curated, not user-customised. Only reduced-motion remains adjustable because
// it is an accessibility preference, not a cosmetic one.
const DEFAULTS = {
  rounding: 'default', // "Medium" rounding — locked for everyone
  density: 'cozy',     // single comfortable density — locked for everyone
  reducedMotion: false,
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const prev = raw ? JSON.parse(raw) : {}
    // Ignore any stored rounding/density; only honour the a11y motion choice.
    return { ...DEFAULTS, reducedMotion: !!prev.reducedMotion }
  } catch { return DEFAULTS }
}

function applyToDocument(state) {
  const root = document.documentElement
  root.setAttribute('data-rounding', state.rounding)
  root.setAttribute('data-density', state.density)
  root.setAttribute('data-reduced-motion', String(!!state.reducedMotion))
}

export function AppearanceProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    applyToDocument(state)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new CustomEvent('vs-appearance-changed', { detail: state }))
  }, [state])

  const setRounding = (rounding) => setState(s => ({ ...s, rounding }))
  const setDensity = (density) => setState(s => ({ ...s, density }))
  const setReducedMotion = (reducedMotion) => setState(s => ({ ...s, reducedMotion }))
  const setAppearance = (partial) => setState(s => ({ ...s, ...partial }))

  return (
    <AppearanceContext.Provider value={{
      ...state,
      setRounding,
      setDensity,
      setReducedMotion,
      setAppearance,
    }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export const useAppearance = () => useContext(AppearanceContext)
