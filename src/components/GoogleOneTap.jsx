import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { GOOGLE_CLIENT_ID } from '../utils/firebase'
import { whenAuthSdk } from '../utils/firebaseAccess'

const GIS_SRC = 'https://accounts.google.com/gsi/client'

// Loads the Google Identity Services script once and resolves when ready.
let gisPromise = null
function loadGis() {
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) { resolve(); return }
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      return
    }
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
  return gisPromise
}

// Google puts this value in the ID token's `nonce` claim, so a token minted for
// another page load carries a different one. It is generated once per page load
// and kept in memory only. Firebase's GoogleAuthProvider.credential() has no
// raw-nonce parameter, so Firebase does not check it for Google; the claim is
// there for anything that inspects the token.
let sessionNonce = null
function getSessionNonce() {
  if (!sessionNonce) {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    sessionNonce = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return sessionNonce
}

// Renders Google One Tap when the user is signed out. On credential, feeds the
// returned ID token into Firebase via signInWithCredential. Modern replacement
// for the deprecated gapi.auth2 Google Sign-In library.
export default function GoogleOneTap() {
  const { user, loading, loginWithGoogleCredential } = useAuth()
  const initialised = useRef(false)

  useEffect(() => {
    if (loading || user) return
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('your_')) return

    let cancelled = false

    // `loading` can clear before the auth SDK has answered (a visitor with no
    // session hint settles as signed out without fetching it), so the prompt
    // also waits for the SDK's first answer and is skipped if it finds a session.
    const signedOut = whenAuthSdk().then(async (A) => {
      await A.auth?.authStateReady?.()
      return !A.auth?.currentUser
    })

    Promise.all([loadGis(), signedOut]).then(([, isSignedOut]) => {
      if (cancelled || !isSignedOut || !window.google?.accounts?.id) return

      if (!initialised.current) {
        // No auto_select: a returning person always confirms which account to
        // use rather than being signed in silently.
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response?.credential) return
            try {
              await loginWithGoogleCredential(response.credential)
            } catch (err) {
              // One Tap is optional, so a failure never blocks the page; the code
              // alone is logged, with no account details.
              console.warn('Google One Tap sign-in failed', err?.code || 'unknown')
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin',
          nonce: getSessionNonce(),
          use_fedcm_for_prompt: true,
        })
        initialised.current = true
      }

      window.google.accounts.id.prompt()
    }).catch((err) => {
      // GIS unavailable (offline/blocked): the Firebase popup remains available.
      console.warn('Google One Tap unavailable', err?.code || err?.type || 'unknown')
    })

    return () => {
      cancelled = true
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel()
      }
    }
  }, [user, loading, loginWithGoogleCredential])

  return null
}
