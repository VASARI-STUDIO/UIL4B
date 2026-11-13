import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import ProjectMissing from '../edge/ProjectMissing'

// Where a project link goes when it cannot open. Signed out, to sign-in with the
// link as the resume target, which LoginPage hands on to once they are in.
// Signed in, the page stays at the same address and says the project is not in
// the account, with the way back to the workspace. The page is the same whether
// the project was deleted or belongs to someone else, so it does not reveal which.

// `quiet` is for a page that is leaving on its own account (a sign-out, a delete):
// it goes to the workspace with nothing said.
export default function ProjectLinkGone({ quiet = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const signedOut = !user && !loading

  if (signedOut && !quiet) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (quiet || signedOut) return <Navigate to="/projects" replace />
  return <ProjectMissing />
}
