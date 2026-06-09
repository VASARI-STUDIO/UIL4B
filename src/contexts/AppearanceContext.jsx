import { createContext, useContext, useState, useEffect } from 'react'

const AppearanceContext = createContext()
const STORAGE_KEY = 'vs-appearance'
// Bump when we want to force a new appearance default onto everyone (including
// returning users who already have a saved preference).
const VERSION_KEY = 'vs-appearance-v'
const APPEARANCE_VERSION = '2'

const DEFAULTS = {
  rounding: 'default', // "Medium" rounding — the friendly default for everyone
  density: 'cozy',
  reducedMotion: false,
}

function load() {
  try {
    // One-time migration: snap everyone to the new medium-rounding default.
    if (localStorage.getItem(VERSION_KEY) !== APPEARANCE_VERSION) {
      localStorage.setItem(VERSION_KEY, APPEARANCE_VERSION)
      const raw = localStorage.getItem(STORAGE_KEY)
      const prev = raw ? JSON.parse(raw) : {}
      return { ...DEFAULTS, ...prev, rounding: DEFAULTS.rounding }
    }
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
