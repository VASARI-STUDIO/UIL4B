import { useEffect } from 'react'
import EdgeScreen, { EdgePill, EdgeOutline } from '../components/edge/EdgeScreen'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'

// Where a password-reset link lands when it can no longer be used. The reset
// itself is hosted by the sign-in provider; this page is the app's own answer
// for a link that was used already or has run out. Signed out, the way on is the
// popup's reset form; signed in, the password is changed in Settings.
export default function LinkExpired() {
  const { openLogin } = useLoginPrompt()
  const { user, loading } = useAuth()

  useEffect(() => {
    document.title = 'UI L4B | Link expired'
  }, [])

  // Held back until the session is known, so the wrong choice is never shown.
  const primary = loading ? null : user
    ? <EdgePill to="/settings">Change your password in Settings</EdgePill>
    : <EdgePill onClick={() => openLogin({ reset: true })}>Reset your password</EdgePill>

  return (
    <EdgeScreen
      art="calm"
      soft
      title="That reset link doesn’t work now"
      body="Reset links work once and expire after a short time."
      actions={(
        <>
          {primary}
          <EdgeOutline to="/">Back to the homepage</EdgeOutline>
        </>
      )}
      trail={[{ to: '/learn/help', label: 'Help centre' }]}
    />
  )
}
