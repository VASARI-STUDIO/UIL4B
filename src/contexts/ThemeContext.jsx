import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

// Default to the visitor's OS/browser preference; a deliberate choice (toggle or
// Settings picker) is remembered and then takes precedence over the OS.
function getSystemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem('vs-t')
      return stored === 'dark' || stored === 'light' ? stored : getSystemTheme()
    } catch {
      return getSystemTheme()
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('vs-t', theme) } catch { /* storage unavailable */ }
  }, [theme])

  // Follow live OS theme changes until the visitor makes an explicit choice
  // (tracked via vs-t-explicit, set on toggle / Settings selection).
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    let explicit = false
    try { explicit = localStorage.getItem('vs-t-explicit') === '1' } catch { /* ignore */ }
    if (explicit) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => {
      try { if (localStorage.getItem('vs-t-explicit') === '1') return } catch { /* ignore */ }
      setThemeState(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setTheme = (next) => {
    if (next !== 'dark' && next !== 'light') return
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
