import { createContext, useContext, useEffect } from 'react'

const ThemeContext = createContext()

// UIL4B is a dark-only product. The theme is fixed to dark; `toggleTheme` and
// `setTheme` are retained as no-ops so existing consumers keep working without
// changes while the appearance can never drift away from the brand surface.
export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    // Clear any legacy stored preference so the app can't be coaxed back to light.
    try {
      localStorage.removeItem('vs-t')
      localStorage.removeItem('vs-t-v')
      localStorage.removeItem('vs-t-explicit')
    } catch { /* storage unavailable */ }
  }, [])

  const noop = () => {}

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: noop, setTheme: noop }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
