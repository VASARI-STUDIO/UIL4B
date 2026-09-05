import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { writeSessionHint } from '../utils/sessionHint'

/**
 * Keep the first-paint session hint in step with what auth actually resolved to.
 *
 * WHY THIS IS A HOOK AND NOT A LINE IN AuthContext. src/contexts/AuthContext.jsx
 * is founder-gated (docs/reference/human-validation-zones.md) — a mistake in it
 * locks people out of their accounts. Nothing about writing a routing hint needs
 * to live inside the session machinery, so it lives outside it, as an ordinary
 * consumer of the context. The gated file is untouched by this change.
 *
 * THE ONE RULE: never write while `loading` is true. Auth starts as
 * (loading: true, user: null), and recording that as “signed out” would clear
 * the hint for every signed-in visitor on every single page load — which is
 * precisely the bug the hint exists to prevent, reintroduced by the thing meant
 * to maintain it.
 *
 * Mounted once, in AppInner, so it tracks the session for the whole app: sign in
 * anywhere and the next cold load lands on the User Home; sign out anywhere and
 * the next cold load lands on the sales page.
 */
export function useSessionHint() {
  const { user, loading } = useAuth()
  useEffect(() => {
    if (loading) return
    writeSessionHint(!!user)
  }, [user, loading])
}

export default useSessionHint
