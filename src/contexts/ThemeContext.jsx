import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  // Light is the default for everyone (the rebuilt "Foundry" system ships light
  // first; dark returns later). Dark is opt-in via the toggle / Settings picker.
  // A stored choice ('dark' or 'light') always wins; we never auto-follow the OS
  // preference. Keep this in agreement with the FOUC guard in index.html.
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem('vs-t')
      return stored === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
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
