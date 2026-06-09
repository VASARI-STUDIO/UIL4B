import { createContext, useContext, useState, useEffect } from 'react'

const AppearanceContext = createContext()
const STORAGE_KEY = 'vs-appearance'

const DEFAULTS = {
  rounding: 'none',
  density: 'cozy',
  reducedMotion: false,
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
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
