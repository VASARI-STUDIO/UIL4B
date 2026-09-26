import { createContext, useContext, useState, useEffect } from 'react'
import { onAccountApplied } from '../utils/accountEvents'

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

    // Then the browser chrome tint, which index.html cannot finish on its own.
    //
    // The two theme-color tags there are scoped with prefers-color-scheme, and
    // a media query cannot read localStorage — so it cannot see the third state
    // this file exists to resolve. On a light phone, a visitor who explicitly
    // chose dark got a light status bar sitting over a dark page, and the
    // reverse on a dark phone. That is the same class of bug as the pre-paint
    // flip the boot script prevents, one layer out.
    //
    // The colour is READ BACK from --bg-0 rather than restated, so a token move
    // takes it along and there is no fourth copy of the two grounds to keep in
    // step. Before the stylesheet arrives it resolves to '' — in that window the
    // media-scoped tags are still correct for everyone except an explicit
    // chooser, so returning is the right thing to do.
    // Guarded the same way matchMedia and every storage read in this file are.
    // getComputedStyle is absent outside a browser, and the theme attribute
    // above is the part that must never be skipped — so a missing chrome tint
    // degrades to the media-scoped tags rather than throwing on the way past.
    const styles = typeof getComputedStyle === 'function'
      ? getComputedStyle(document.documentElement)
      : null
    const ground = styles?.getPropertyValue('--bg-0')?.trim()
    if (!ground) return
    let meta = document.querySelector('meta[name="theme-color"]:not([media])')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      // FIRST in head, and that placement is the whole mechanism: the spec says
      // a browser takes the first theme-color element whose media matches, and
      // a tag carrying no media always matches. Appending it would leave the
      // light-scoped tag ahead of it and change nothing.
      document.head.prepend(meta)
    }
    meta.setAttribute('content', ground)
  }, [theme])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, pref) } catch { /* storage unavailable */ }
  }, [pref])

  // The theme follows the ACCOUNT. When the account's
  // choice is written into storage — at sign-in, from another device, or back
  // to the default at sign-out — show it now, not after a reload.
  useEffect(() => onAccountApplied([STORAGE_KEY], () => setPrefState(loadPref())), [])

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
