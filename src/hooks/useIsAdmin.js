import { useAuth } from '../contexts/AuthContext'
import { isAdminEmail } from '../utils/constants'

// Whether the signed-in account is on the owner allowlist, for the surfaces that
// show unfinished (`soon`) pages to admins only. `loading` is true until auth has
// answered, so a caller that redirects away from a page waits for it first and
// never bounces an admin on a cold load.
//
// Presentation only: the allowlist check in utils/constants.js is not a
// security boundary, and anything privileged is enforced server-side.
export function useIsAdmin() {
  const { user, loading } = useAuth() || {}
  return { isAdmin: isAdminEmail(user?.email), loading }
}

export default useIsAdmin
