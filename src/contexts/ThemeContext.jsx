import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()
const STORAGE_KEY = 'vs-t'

// THE THEME IS THREE-STATE, and the third state is the default.
//
//   'light' / 'dark' → an explicit choice. It beats the OS in BOTH directions:
//                      dark on a light system, light on a dark system.
//   'system'         → no opinion; `prefers-color-scheme` decides, and it is
//                      followed LIVE, not only at load.
//
// Anything else in storage (absent, or junk from a hand-edited profile) reads as
// 'system', so a visitor who has never chosen gets their OS preference. That is
// deliberately the same contract AppearanceContext already uses for reduced
// motion — only a recognised explicit value counts as a choice, and an explicit
// value wins over the media query. Two different resolution models for two
// preferences sitting in the same popover would be a trap.
//
// html[data-theme] is NEVER "system". It always carries a resolved 'light' or
// 'dark', because every token in global.css hangs off [data-theme="light"] /
// [data-theme="dark"] and neither set is declared on a bare :root — an
// unresolved attribute would paint an unthemed page.
//
// Keep this in agreement with the pre-paint boot script in index.html. The two
// resolve the same three states the same way; if they disagree, the first-time
// visitor gets a theme flip on hydration, which is the exact defect the boot
// script exists to prevent. Guarded by tests/unit/theme-resolution.test.js.
//
// vs-t-lightreset is GONE. See index.html for why the one-time migration is
// spent; nothing here reads or writes it.

function loadPref() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'dark' || stored === 'light' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function osPrefersDark() {
  return !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }) {
  const [pref, setPrefState] = useState(loadPref)
  const [osDark, setOsDark] = useState(osPrefersDark)

  // Follow the OS live while in system mode. Someone switching their system to
  // dark at dusk should not have to reload the tab to be believed — the same
  // courtesy the reduced-motion layer already extends.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return undefined
    const onChange = () => setOsDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Consumers get a resolved theme; the third state stays inside this file,
  // reachable as `themePref` only by the controls that have to render it.
  const theme = pref === 'system' ? (osDark ? 'dark' : 'light') : pref

  useEffect(() => {
    // The attribute goes on FIRST and unguarded — a visitor whose storage throws
    // still gets a correctly themed page, they just start from system each load.
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, pref) } catch { /* storage unavailable */ }
  }, [pref])

  const setTheme = (next) => {
    if (next !== 'dark' && next !== 'light' && next !== 'system') return
    setPrefState(next)
  }

  // The old two-state flip, kept for callers that offer a single button. It
  // always lands on an EXPLICIT value — flipping out of system into "the
  // opposite of what you can currently see" is the only reading of it that is
  // not a surprise.
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, themePref: pref, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
