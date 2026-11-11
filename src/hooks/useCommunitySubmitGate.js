import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import {
  COMMUNITY_SUBMIT_REASONS, consumeSubmitIntent, hasSubmitIntent, resetSubmitIntent, setSubmitIntent,
} from '../utils/submitIntent'

// The sign-in step in front of a community submission form, shared by the tools
// that submit (Palette Builder, Gradient Generator).
//
// The tool stays free and usable signed out. Only the moment of submitting asks
// for an account, and says plainly why. `request` is what the "Submit to the
// community…" row calls: signed in, it opens the form; signed out, it opens the
// sign-in prompt first and opens the form once the person is in. The form is
// never opened for a signed-out visitor.
//
// If signing in remounts the tool (a new account can detour through onboarding)
// the awaited handler is discarded with the old tree, so the intent is also
// recorded in memory (utils/submitIntent.js) and the effect below picks it up on
// the new mount. A full page reload finds nothing and the tool opens normally.
//
//   surface  the submit-intent surface name (one of SUBMIT_SURFACES)
//   what     the noun in the sign-in reason: "submit this <what> to the community"
//   onOpen   open the form; called with no arguments, may be called twice
//            (handler and effect) so it must be safe to repeat
export default function useCommunitySubmitGate({ surface, what, onOpen }) {
  const { user, loading: authLoading } = useAuth()
  const { requireLogin } = useLoginPrompt()
  const uid = user?.uid || null
  const openRef = useRef(onOpen)
  useEffect(() => { openRef.current = onOpen })

  const request = useCallback(async () => {
    // Auth still resolving: neither answer is known, so show neither prompt.
    if (authLoading) return
    if (!uid) {
      setSubmitIntent(surface)
      const signedIn = await requireLogin(`submit this ${what} to the community`, {
        free: true,
        reasons: COMMUNITY_SUBMIT_REASONS,
      })
      if (!signedIn) { resetSubmitIntent(); return }
    }
    consumeSubmitIntent()
    openRef.current?.()
  }, [authLoading, uid, requireLogin, surface, what])

  useEffect(() => {
    if (authLoading || !uid) return
    if (!hasSubmitIntent(surface)) return
    consumeSubmitIntent()
    openRef.current?.()
  }, [authLoading, uid, surface])

  return { request, authLoading, user, uid }
}
