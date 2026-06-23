import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  // Dark is the default for everyone; light is opt-in via the toggle / Settings
  // picker. A stored choice ('dark' or 'light') always wins; we never auto-follow
  // the OS preference.
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem('vs-t')
      return stored === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('vs-t', theme) } catch { /* storage unavailable */ }
  }, [theme])

  const setTheme = (next) => {
    if (next !== 'dark' && next !== 'light') return
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
