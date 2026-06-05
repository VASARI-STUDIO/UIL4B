import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { GOOGLE_CLIENT_ID } from '../utils/firebase'

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

    loadGis().then(() => {
      if (cancelled || !window.google?.accounts?.id) return

      if (!initialised.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response?.credential) return
            try {
              await loginWithGoogleCredential(response.credential)
            } catch (err) {
              // Surface only unexpected failures; closed/declined prompts are silent.
              console.error('Google One Tap sign-in failed', err)
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin',
          use_fedcm_for_prompt: true,
        })
        initialised.current = true
      }

      window.google.accounts.id.prompt()
    }).catch(() => {
      /* GIS unavailable (offline/blocked) — Firebase popup remains available */
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
