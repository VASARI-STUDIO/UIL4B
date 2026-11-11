import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

// Where a project link goes when it cannot open. Signed out, to sign-in with the
// link as the resume target, which LoginPage hands on to once they are in.
// Signed in, to the workspace with a line saying why. The line is the same
// whether the project was deleted or belongs to someone else, so it does not
// reveal which.
const GONE_MESSAGE = "That project isn't in your account. It may have been deleted."

// `quiet` is for a page that is leaving on its own account (a sign-out, a delete):
// it goes to the workspace with nothing said.
export default function ProjectLinkGone({ quiet = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const signedOut = !user && !loading
  const toLogin = signedOut && !quiet
  const say = !signedOut && !quiet

  useEffect(() => {
    if (!say) return
    window.dispatchEvent(new CustomEvent('uil4b:toast', { detail: { message: GONE_MESSAGE, type: 'info' } }))
  }, [say])

  if (toLogin) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  return <Navigate to="/projects" replace />
}
