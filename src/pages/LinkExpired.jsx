import { useEffect } from 'react'
import EdgeScreen, { EdgePill, EdgeOutline } from '../components/edge/EdgeScreen'
import { useLoginPrompt } from '../contexts/LoginPromptContext'

// Where a password-reset link lands when it can no longer be used. The reset
// itself is hosted by the sign-in provider; this page is the app's own answer
// for a link that was used already or has run out.
export default function LinkExpired() {
  const { openLogin } = useLoginPrompt()

  useEffect(() => {
    document.title = 'UI L4B | Link expired'
  }, [])

  return (
    <EdgeScreen
      art="calm"
      soft
      title="That reset link doesn’t work now"
      body="Reset links work once and expire after a short time."
      actions={(
        <>
          <EdgePill onClick={() => openLogin()}>Send a new link</EdgePill>
          <EdgeOutline to="/">Back to the homepage</EdgeOutline>
        </>
      )}
      trail={[{ to: '/learn/help', label: 'Help centre' }]}
    />
  )
}
