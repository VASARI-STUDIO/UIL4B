import { createContext, useContext, useState, useEffect } from 'react'

const AppearanceContext = createContext()
const STORAGE_KEY = 'vs-appearance'

// Rounding and density are LOCKED product-wide (medium / cozy) — the surface is
// curated, not user-customised. Only reduced-motion remains adjustable because
// it is an accessibility preference, not a cosmetic one.
//
// `reducedMotion: undefined` is a THIRD state and it is load-bearing: the
// visitor has never chosen, so the OS preference is the answer. It used to
// default to `false`, and because that value was written to
// html[data-reduced-motion] before anything read it, an explicit "false" —
// which by contract beats the OS query — was fabricated for every visitor who
// had never opened Settings.
//
// MEASURED: OS `prefers-reduced-motion: reduce` on, fresh profile, the attribute
// still read "false" at DOMContentLoaded. So the app ignored the OS setting
// app-wide, and every `@media (prefers-reduced-motion:reduce)
// html:not([data-reduced-motion="false"])` rule in global.css — the standard
// pattern used throughout the sheet — was dead code. Not a homepage bug; a
// whole-app one.
//
// `JSON.stringify` drops undefined keys, so "auto" is never persisted as a
// fabricated boolean. Only an explicit toggle writes one, and an explicit one
// still wins over the OS in BOTH directions, which is the documented contract.
//
// The same fabricated "false" also lived in the index.html boot script; both
// sites must stay fixed or the defect comes back. Guarded by
// tests/unit/reduced-motion-resolution.test.js.
const DEFAULTS = {
  rounding: 'default', // squarer, soft corners — locked for everyone
  density: 'cozy',     // single comfortable density — locked for everyone
  reducedMotion: undefined, // undefined = follow the OS
}

function osReducedMotion() {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const prev = raw ? JSON.parse(raw) : {}
    // Ignore any stored rounding/density; only honour the a11y motion choice,
    // and only when one was actually made.
    return {
      ...DEFAULTS,
      reducedMotion: typeof prev.reducedMotion === 'boolean' ? prev.reducedMotion : undefined,
    }
  } catch { return DEFAULTS }
}

// Callers pass the RESOLVED state (explicit choice ?? OS), never raw `state` —
// passing raw state is what wrote the fabricated "false".
function applyToDocument(state) {
  const root = document.documentElement
  root.setAttribute('data-rounding', state.rounding)
  root.setAttribute('data-density', state.density)
  root.setAttribute('data-reduced-motion', String(!!state.reducedMotion))
}

export function AppearanceProvider({ children }) {
  const [state, setState] = useState(load)
  const [osReduce, setOsReduce] = useState(osReducedMotion)

  // Follow the OS live while in auto. Someone turning reduce on in their system
  // settings should not have to reload the tab to be believed.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return undefined
    const onChange = () => setOsReduce(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Consumers get a plain boolean; the third state stays inside this file.
  const reducedMotion = state.reducedMotion ?? osReduce
  const resolved = { ...state, reducedMotion }

  useEffect(() => {
    applyToDocument(resolved)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new CustomEvent('vs-appearance-changed', { detail: resolved }))
    // `resolved` is rebuilt every render; the two values it is made of are the
    // real dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reducedMotion])

  const setRounding = (rounding) => setState(s => ({ ...s, rounding }))
  const setDensity = (density) => setState(s => ({ ...s, density }))
  const setReducedMotion = (reducedMotion) => setState(s => ({ ...s, reducedMotion }))
  const setAppearance = (partial) => setState(s => ({ ...s, ...partial }))

  return (
    <AppearanceContext.Provider value={{
      ...resolved,
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
