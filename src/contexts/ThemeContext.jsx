import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const CURRENT_DEFAULT = 'light'
const VERSION_KEY = 'vs-t-v'
const THEME_VERSION = '2'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (localStorage.getItem(VERSION_KEY) !== THEME_VERSION) {
      localStorage.setItem(VERSION_KEY, THEME_VERSION)
      localStorage.setItem('vs-t', CURRENT_DEFAULT)
      return CURRENT_DEFAULT
    }
    return localStorage.getItem('vs-t') || CURRENT_DEFAULT
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('vs-t', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
