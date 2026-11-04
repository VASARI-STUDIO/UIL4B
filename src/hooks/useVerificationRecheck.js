import { useEffect } from 'react'

// The verification link is opened in the inbox, usually in another tab or on
// another device, so a page that is showing "not verified" cannot know it has
// changed until the account is read again. Reading it when the tab regains
// focus (or becomes visible) clears the note without a reload.
//
// `onRefresh` is AuthContext's refreshEmailVerified; `active` is whether
// anything on screen is waiting on the answer, so a verified account makes no
// extra requests.
export default function useVerificationRecheck(onRefresh, active = true) {
  useEffect(() => {
    if (!active) return undefined
    const check = () => {
      if (document.visibilityState === 'visible') onRefresh().catch(() => {})
    }
    check()
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [onRefresh, active])
}
