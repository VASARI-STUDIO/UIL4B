import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const CURRENT_DEFAULT = 'light'
const VERSION_KEY = 'vs-t-v'
const THEME_VERSION = '2'

// Match the visitor's OS / browser appearance setting on first load. Falls back
// to the light theme where matchMedia is unavailable.
function getSystemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return CURRENT_DEFAULT
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem('vs-t')
    // First visit (or version migration): seed from the system preference so the
    // app opens in light/dark to match the OS. A returning visitor's explicit
    // choice is preserved.
    if (localStorage.getItem(VERSION_KEY) !== THEME_VERSION) {
      localStorage.setItem(VERSION_KEY, THEME_VERSION)
      const initial = stored || getSystemTheme()
      localStorage.setItem('vs-t', initial)
      return initial
    }
    return stored || getSystemTheme()
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('vs-t', theme)
  }, [theme])

  // Follow live OS theme changes only until the visitor makes an explicit choice
  // (tracked via the vs-t-explicit flag set on toggle / manual selection).
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    if (localStorage.getItem('vs-t-explicit') === '1') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => {
      if (localStorage.getItem('vs-t-explicit') === '1') return
      setThemeState(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Any deliberate change (toggle or Settings picker) marks the choice explicit
  // so we stop mirroring the OS preference.
  const setTheme = (next) => {
    try { localStorage.setItem('vs-t-explicit', '1') } catch { /* ignore */ }
    setThemeState(next)
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
