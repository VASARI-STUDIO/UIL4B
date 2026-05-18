import { createContext, useContext, useState, useEffect } from 'react'

const AppearanceContext = createContext()
const STORAGE_KEY = 'vs-appearance'

const DEFAULTS = {
  rounding: 'default', // 'none' | 'subtle' | 'default' | 'pronounced'
  density: 'cozy',     // 'cozy' | 'compact'
  reduceMotion: false,
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
  root.setAttribute('data-motion', state.reduceMotion ? 'reduced' : 'full')
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
  const setReduceMotion = (reduceMotion) => setState(s => ({ ...s, reduceMotion }))
  const setAppearance = (partial) => setState(s => ({ ...s, ...partial }))

  return (
    <AppearanceContext.Provider value={{
      ...state,
      setRounding,
      setDensity,
      setReduceMotion,
      setAppearance,
    }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export const useAppearance = () => useContext(AppearanceContext)
