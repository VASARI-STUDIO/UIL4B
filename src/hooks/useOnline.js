import { useEffect, useState } from 'react'

// The one connection signal in the app.
//
// Five surfaces had grown their own copy of this — the font catalogue, the
// icon/emoji tabs, the emoji search index, the Discover cards and the file
// converter — each with its own pair of listeners and its own idea of what to
// say. Nothing told a user that their CONNECTION was the problem; each surface
// only reported that its own fetch had not worked, so the same outage read as
// five unrelated faults.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT `navigator.onLine` ACTUALLY MEANS, AND WHY ONLY ONE DIRECTION IS USED
// ─────────────────────────────────────────────────────────────────────────────
// `true` means a network interface is up. It does NOT mean the internet is
// reachable — a captive portal, a dead router or a DNS outage all report
// `true`. So this hook never claims a connection is working; the surfaces that
// need to know that find out by trying, which they already do.
//
// `false` is the reliable direction: browsers report it only when there is
// definitively no connectivity. That is the one claim worth making to a user,
// and it is the only one made here.
//
// SSR/prerender: `scripts/prerender.mjs` renders these components with no
// `navigator`, so the initial state has to survive its absence — and it has to
// default to ONLINE. Defaulting the other way would bake an "You are offline"
// banner into every prerendered route shell.
export default function useOnline() {
  const [online, setOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine !== false,
  )

  // A component that mounts AFTER the `offline` event fired still starts in the
  // right state: the lazy initialiser above runs at mount and reads the live
  // `navigator.onLine`, so it never needs to have heard the event. That case is
  // not hypothetical — a lazy chunk arriving late is what made an earlier
  // offline test flaky on slow CI runners (#189).
  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
