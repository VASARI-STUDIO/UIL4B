import { useEffect, useRef } from 'react'

// THE BACK GESTURE CLOSES THE MENU.
//
// On a phone the full-screen menu looks like a page, so the system back
// gesture is how people try to leave it; without this, back left the site.
// Same shape as src/hooks/useCloseOnBack.js (open flag + close callback).
//
// HOW. Opening pushes one history entry carrying the router's own state plus a
// marker, so React Router still reads the same location and index. Back pops
// it: popstate → close. Closing any OTHER way (Escape, the Close pill, the
// burger) takes the entry back off with history.back(), so the back button is
// never left holding a dead step — unless something has already moved past
// it: a route link in the menu REPLACES the entry (SpectrumNav passes
// `replace`), and a same-page hash link pushes over it, in which case one back
// press later lands on the same page without the menu, which is harmless.
export function useCloseOnBack(open, onBack) {
  const onBackRef = useRef(onBack)
  useEffect(() => { onBackRef.current = onBack }, [onBack])

  useEffect(() => {
    if (!open || typeof window === 'undefined') return undefined
    let ours = true
    window.history.pushState({ ...(window.history.state || {}), spnavMenu: true }, '')
    const onPop = () => {
      ours = false
      onBackRef.current?.()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (ours && window.history.state?.spnavMenu) window.history.back()
    }
  }, [open])
}
