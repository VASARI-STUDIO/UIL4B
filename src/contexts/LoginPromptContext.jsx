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

export function LoginPromptProvider({ children }) {
  const { user } = useAuth()
  const [prompt, setPrompt] = useState(null)
  // Hold the pending promise's resolver plus a live view of the current user so
  // the success/dismiss handlers never close over a stale value. The user ref is
  // synced in an effect (not during render) so it stays current for the
  // event-driven callbacks below.
  const resolverRef = useRef(null)
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  const finish = useCallback((result) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setPrompt(null)
    if (resolve) resolve(result)
  }, [])

  const requireLogin = useCallback((reason, opts = {}) => {
    // Already signed in — nothing to prompt for.
    if (userRef.current) return Promise.resolve(userRef.current)
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setPrompt({ reason, free: opts.free !== false })
    })
  }, [])

  return (
    <LoginPromptContext.Provider value={{ requireLogin }}>
      {children}
      {prompt && (
        <LoginPopup
          reason={prompt.reason}
          free={prompt.free}
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
