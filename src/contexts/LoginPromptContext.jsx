import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import LoginPopup from '../components/LoginPopup'

// Single-click sign-in, app-wide. Any feature can call
//   const { requireLogin } = useLoginPrompt()
//   const user = await requireLogin('save this palette')  // null if dismissed
// to open the login popup OVER the current page and get a promise that resolves
// with the signed-in user (or null if the user closed the popup). Nothing here
// navigates, so callers resume exactly where they were on success. Composes the
// HVZ auth functions via <LoginPopup>; it does not touch AuthContext itself.
const LoginPromptContext = createContext(null)

// A brand-new sign-up is intercepted into /onboarding by AppInner the moment
// auth resolves, which would otherwise discard wherever the user actually was.
// Onboarding reads this key on finish (see Onboarding.jsx takeResumeTarget), so
// the stash has to happen wherever the popup is OPENED — not on the /login
// route, which nav-initiated sign-in no longer visits at all.
const RESUME_KEY = 'vs-resume-after-onboarding'
// Paths that are not destinations: /home is already the post-onboarding default,
// /login is a launcher, /onboarding is the flow itself, / redirects.
const NON_RESUMABLE = new Set(['/', '/home', '/login', '/onboarding'])

function stashResumeTarget(explicitFrom) {
  let target = explicitFrom
  if (!target && typeof window !== 'undefined') {
    target = window.location.pathname + window.location.search
  }
  const path = String(target || '').split('?')[0].replace(/\/+$/, '') || '/'
  try {
    // Clearing on a non-resumable open matters as much as setting: a dismissed
    // prompt from an earlier page must not resurface as a later sign-up's
    // destination.
    if (!target || NON_RESUMABLE.has(path)) sessionStorage.removeItem(RESUME_KEY)
    else sessionStorage.setItem(RESUME_KEY, target)
  } catch { /* ignore */ }
}

export function LoginPromptProvider({ children }) {
  const { user } = useAuth()
  const [prompt, setPrompt] = useState(null)
  // Hold the pending promise's resolver plus a live view of the current user so
  // the success/dismiss handlers never close over a stale value. The user ref is
  // synced in an effect (not during render) so it stays current for the
  // event-driven callbacks below.
  const resolverRef = useRef(null)
  const pendingPromiseRef = useRef(null)
  const openerRef = useRef(null)
  const promptIdRef = useRef(0)
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  const finish = useCallback((result) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    pendingPromiseRef.current = null
    setPrompt(null)
    if (resolve) resolve(result)
    requestAnimationFrame(() => openerRef.current?.focus?.())
  }, [])

  const requireLogin = useCallback((reason, opts = {}) => {
    // Already signed in — nothing to prompt for.
    if (userRef.current && !opts.force) return Promise.resolve(userRef.current)
    if (pendingPromiseRef.current) return pendingPromiseRef.current
    // Account switching never creates an account, so it never reaches
    // onboarding — leave whatever is stashed alone.
    if (opts.mode !== 'switch') stashResumeTarget(opts.from)
    openerRef.current = document.activeElement
    const promise = new Promise((resolve) => {
      resolverRef.current = resolve
      setPrompt({
        id: ++promptIdRef.current,
        reason,
        // Optional plain-language "why an account is needed" list. Callers that
        // pass nothing get exactly the popup they got before.
        reasons: Array.isArray(opts.reasons) ? opts.reasons : undefined,
        free: opts.free !== false,
        initialEmail: typeof opts.email === 'string' ? opts.email : '',
        lockEmail: !!opts.lockEmail,
        passwordOnly: opts.mode === 'switch',
        // Which form the popup OPENS on. Every "Start for Free" / "Start
        // building free" control promised a new free account and delivered a
        // "Welcome Back" sign-in form, with signup demoted to a small text link
        // underneath — on the four highest-traffic paths into the product.
        // Callers that pass nothing still get sign-in, so nothing else moves.
        signup: !!opts.signup,
      })
    })
    pendingPromiseRef.current = promise
    return promise
  }, [])

  // Imperative, reason-less variant for plain "Log in" / "Sign in" affordances
  // (nav links, the /login route). Same promise contract as requireLogin.
  const openLogin = useCallback((opts = {}) => requireLogin(opts.reason || '', opts), [requireLogin])

  return (
    <LoginPromptContext.Provider value={{ requireLogin, openLogin }}>
      {children}
      {prompt && (
        <LoginPopup
          key={prompt.id}
          reason={prompt.reason}
          reasons={prompt.reasons}
          free={prompt.free}
          initialEmail={prompt.initialEmail}
          lockEmail={prompt.lockEmail}
          passwordOnly={prompt.passwordOnly}
          signup={prompt.signup}
          onSuccess={(u) => finish(u || userRef.current || null)}
          onDismiss={() => finish(null)}
        />
      )}
    </LoginPromptContext.Provider>
  )
}

export function useLoginPrompt() {
  const ctx = useContext(LoginPromptContext)
  if (!ctx) throw new Error('useLoginPrompt must be used within a LoginPromptProvider')
  return ctx
}
